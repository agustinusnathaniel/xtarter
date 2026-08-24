/**
 * Cloudflare Pages advanced-mode worker for the xtarter docs site.
 *
 * Astro copies this file from `public/` to `dist/_worker.js` verbatim, so it
 * must stay dependency-free and self-contained.
 *
 * WHY: coding agents request docs with `Accept: text/markdown`. The site is
 * statically hosted, so build-time .md mirrors plus this worker give those
 * agents a real text/markdown representation instead of HTML.
 *
 * Cache correctness: negotiated responses MUST vary on both Accept and
 * Accept-Encoding, otherwise a CDN edge could cache the markdown variant and
 * serve it to browsers (or vice versa).
 */

const SITE_URL = 'https://xtarter.sznm.dev'
const MARKDOWN_MIME = 'text/markdown; charset=utf-8'
const VARY_VALUE = 'Accept, Accept-Encoding'

/** Recovery links returned to agents that request an unknown Markdown route. */
export const RECOVERY_LINKS = [
	['Home', `${SITE_URL}/`],
	['xtarterize docs', `${SITE_URL}/xtarterize/`],
	['create-xtarter-app docs', `${SITE_URL}/create-xtarter-app/`],
	['llms.txt', `${SITE_URL}/llms.txt`],
	['llms-full.txt', `${SITE_URL}/llms-full.txt`],
	['agents.md', `${SITE_URL}/agents.md`],
	['Sitemap', `${SITE_URL}/sitemap-index.xml`],
	['About', `${SITE_URL}/about/`],
	['Contact', `${SITE_URL}/contact/`],
	['Privacy', `${SITE_URL}/privacy/`],
	['GitHub repository', 'https://github.com/agustinusnathaniel/xtarter'],
]

function parseQuality(parameters) {
	let quality = 1
	for (const parameter of parameters) {
		const [name, ...rawValue] = parameter.split('=')
		if (name?.trim().toLowerCase() !== 'q') continue
		const parsed = Number(rawValue.join('=').trim())
		quality = Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : 0
	}
	return quality
}

/**
 * True when Markdown is explicitly accepted at least as strongly as HTML.
 * Wildcard ranges deliberately do not trigger negotiation: browsers send a
 * wildcard range on normal navigation, while agents can request Markdown
 * explicitly. Quality values follow the HTTP `Accept` header contract.
 */
export function wantsMarkdown(acceptHeader) {
	if (typeof acceptHeader !== 'string' || acceptHeader.length === 0) {
		return false
	}
	let markdownQuality = 0
	let htmlQuality = 0
	for (const part of acceptHeader.split(',')) {
		const parameters = part.split(';')
		const mediaRange = parameters.shift().trim().toLowerCase()
		if (mediaRange !== 'text/markdown' && mediaRange !== 'text/html') continue
		const quality = parseQuality(parameters)
		if (mediaRange === 'text/markdown') {
			markdownQuality = Math.max(markdownQuality, quality)
		} else {
			htmlQuality = Math.max(htmlQuality, quality)
		}
	}
	return markdownQuality > 0 && markdownQuality >= htmlQuality
}

/**
 * Ordered static-asset candidates that can represent `pathname` as markdown.
 * `pathname` must already be decoded and free of query/hash. A directory
 * route (/a/b/) tries its sibling source mirror before a directory-index
 * fallback; a file-ish route uses the same two candidates.
 */
export function markdownCandidates(pathname) {
	let normalizedPath =
		typeof pathname === 'string' && pathname.length > 0 ? pathname : '/'
	if (!normalizedPath.startsWith('/')) {
		normalizedPath = `/${normalizedPath}`
	}
	if (normalizedPath.endsWith('/')) {
		const routePath = normalizedPath.slice(0, -1)
		return routePath.length === 0
			? ['/index.md']
			: [`${routePath}.md`, `${normalizedPath}index.md`]
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
async function fetchMarkdownAsset(candidatePath, request, env) {
	try {
		const asset = await env.ASSETS.fetch(
			new Request(new URL(candidatePath, request.url), request),
		)
		if (asset && asset.status === 200) {
			return asset
		}
	} catch {
		// A missing or unreadable candidate just falls through to the next one.
	}
	return null
}

function markdownResponse(asset, method) {
	const headers = new Headers(asset.headers)
	headers.set('Content-Type', MARKDOWN_MIME)
	headers.set('Vary', mergeVary(asset.headers.get('vary')))
	return new Response(method === 'HEAD' ? null : asset.body, {
		status: asset.status,
		statusText: asset.statusText,
		headers,
	})
}

function withMarkdownVary(response, method) {
	const headers = new Headers(response.headers)
	headers.set('Vary', mergeVary(response.headers.get('vary')))
	return new Response(method === 'HEAD' ? null : response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	})
}

function markdownNotFoundResponse(method) {
	const body = [
		'# 404',
		'',
		'The requested Markdown page does not exist. Try one of these recovery paths:',
		'',
		...RECOVERY_LINKS.map(([label, href]) => `- [${label}](${href})`),
		'',
	].join('\n')
	return new Response(method === 'HEAD' ? null : body, {
		status: 404,
		statusText: 'Not Found',
		headers: {
			'Content-Type': MARKDOWN_MIME,
			Vary: VARY_VALUE,
		},
	})
}

async function handleRequest(request, env) {
	const method = request.method.toUpperCase()
	const url = new URL(request.url)
	const pathname = url.pathname
	const targetsStaticArtifact = /\.(?:md|txt)$/i.test(pathname)
	const negotiatesMarkdown =
		!targetsStaticArtifact &&
		(method === 'GET' || method === 'HEAD') &&
		wantsMarkdown(request.headers.get('accept'))

	if (negotiatesMarkdown) {
		// Query strings never participate in markdown negotiation; candidates
		// are plain asset paths derived from the decoded pathname.
		let decodedPathname = pathname
		try {
			decodedPathname = decodeURIComponent(pathname)
		} catch {
			// Malformed escapes keep their raw form; asset lookup will miss safely.
		}

		for (const candidate of markdownCandidates(decodedPathname)) {
			const asset = await fetchMarkdownAsset(candidate, request, env)
			if (asset) {
				return markdownResponse(asset, method)
			}
		}
		// No mirror exists: fall through to the normal asset pipeline.
	}

	const response = await env.ASSETS.fetch(request)
	if (negotiatesMarkdown && response.status === 404) {
		return markdownNotFoundResponse(method)
	}
	const contentType = response.headers.get('content-type') ?? ''
	if (
		negotiatesMarkdown &&
		(contentType.startsWith('text/html') ||
			contentType.startsWith('text/markdown'))
	) {
		return withMarkdownVary(response, method)
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
