/**
 * Cloudflare Pages advanced-mode worker for the xtarter docs site.
 *
 * This file is copied VERBATIM to dist/_worker.js by the `agent-extras`
 * Astro integration, so it must stay dependency-free and self-contained.
 *
 * WHY: coding agents request docs with `Accept: text/markdown`. The site is
 * statically hosted, so build-time .md mirrors plus this worker give those
 * agents a real text/markdown representation instead of HTML.
 *
 * Cache correctness: negotiated responses MUST vary on both Accept and
 * Accept-Encoding, otherwise a CDN edge could cache the markdown variant and
 * serve it to browsers (or vice versa).
 */

/**
 * True when the Accept header explicitly lists 'text/markdown'.
 * Wildcard ranges (the universal catch-all and 'text/*') deliberately do
 * NOT match: browsers send a wildcard range on every navigation and
 * negotiation must trigger only on explicit agent intent. q-parameters are
 * ignored per RFC 9110 media-range matching.
 */
export function wantsMarkdown(acceptHeader) {
	if (typeof acceptHeader !== 'string' || acceptHeader.length === 0) {
		return false
	}
	for (const part of acceptHeader.split(',')) {
		const mediaRange = part.split(';')[0].trim().toLowerCase()
		if (mediaRange === 'text/markdown') {
			return true
		}
	}
	return false
}

/**
 * Ordered static-asset candidates that can represent `pathname` as markdown.
 * `pathname` must already be decoded and free of query/hash. A directory
 * route (/a/b/) maps to its index mirror; a file-ish route tries both the
 * sibling .md and the directory-index form.
 */
export function markdownCandidates(pathname) {
	let normalizedPath =
		typeof pathname === 'string' && pathname.length > 0 ? pathname : '/'
	if (!normalizedPath.startsWith('/')) {
		normalizedPath = `/${normalizedPath}`
	}
	if (normalizedPath.endsWith('/')) {
		return [`${normalizedPath}index.md`]
	}
	return [`${normalizedPath}.md`, `${normalizedPath}/index.md`]
}

/**
 * Merge required Vary tokens with whatever the asset already declared.
 * Output order is stable: Accept, Accept-Encoding, then remaining tokens
 * alphabetically; dedupe is case-insensitive so repeated builds/edges
 * produce identical headers.
 */
export function mergeVary(existingHeaderValue) {
	const tokens = []
	const seen = new Set(['accept', 'accept-encoding'])
	if (
		typeof existingHeaderValue === 'string' &&
		existingHeaderValue.length > 0
	) {
		for (const rawToken of existingHeaderValue.split(',')) {
			const token = rawToken.trim()
			if (token.length === 0) continue
			const key = token.toLowerCase()
			if (seen.has(key)) continue
			seen.add(key)
			tokens.push(token)
		}
	}
	tokens.sort((a, b) => {
		const lowerA = a.toLowerCase()
		const lowerB = b.toLowerCase()
		if (lowerA < lowerB) return -1
		if (lowerA > lowerB) return 1
		return 0
	})
	return ['Accept', 'Accept-Encoding', ...tokens].join(', ')
}

/** Probe one candidate asset path; returns the response only on a real hit. */
async function fetchMarkdownAsset(candidatePath, requestUrl, env) {
	try {
		const asset = await env.ASSETS.fetch(
			new Request(new URL(candidatePath, requestUrl)),
		)
		if (asset && asset.status === 200) {
			return asset
		}
	} catch {
		// A missing or unreadable candidate just falls through to the next one.
	}
	return null
}

function markdownResponse(asset) {
	const headers = new Headers(asset.headers)
	headers.set('Content-Type', 'text/markdown; charset=utf-8')
	headers.set('Vary', mergeVary(asset.headers.get('vary')))
	return new Response(asset.body, { status: asset.status, headers })
}

async function handleRequest(request, env) {
	const method = request.method.toUpperCase()

	if (method === 'GET' || method === 'HEAD') {
		// Query strings never participate in markdown negotiation; candidates
		// are plain asset paths derived from the decoded pathname.
		let pathname = new URL(request.url).pathname
		try {
			pathname = decodeURIComponent(pathname)
		} catch {
			// Malformed escapes keep their raw form; asset lookup will miss safely.
		}

		if (wantsMarkdown(request.headers.get('accept'))) {
			for (const candidate of markdownCandidates(pathname)) {
				const asset = await fetchMarkdownAsset(candidate, request.url, env)
				if (asset) {
					return markdownResponse(asset)
				}
			}
			// No mirror exists: fall through to the normal asset pipeline.
		}
	}

	const response = await env.ASSETS.fetch(request)
	const contentType = response.headers.get('content-type') ?? ''
	if (
		contentType.startsWith('text/html') ||
		contentType.startsWith('text/markdown')
	) {
		// Rebuild so every negotiable response carries the full Vary header;
		// non-negotiable types pass through completely untouched.
		const headers = new Headers(response.headers)
		headers.set('Vary', mergeVary(response.headers.get('vary')))
		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers,
		})
	}
	return response
}

export default {
	async fetch(request, env) {
		try {
			return await handleRequest(request, env)
		} catch {
			// Never fail a request because of negotiation logic; degrade to the
			// plain static asset serving behavior.
			return env.ASSETS.fetch(request)
		}
	},
}
