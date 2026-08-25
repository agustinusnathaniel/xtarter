/**
 * Cloudflare Pages advanced-mode worker for xtarter docs.
 * Copied verbatim to dist/_worker.js by build.
 * No dependencies, workers-runtime compatible.
 */
export function wantsMarkdown(acceptHeader) {
	if (typeof acceptHeader !== 'string' || acceptHeader.length === 0)
		return false
	for (const part of acceptHeader.split(',')) {
		const segments = part.split(';')
		const mediaRange = segments[0].trim().toLowerCase()
		let q = 1
		for (let i = 1; i < segments.length; i++) {
			const param = segments[i].trim()
			const eq = param.indexOf('=')
			if (eq === -1) continue
			const key = param.slice(0, eq).trim().toLowerCase()
			const val = param.slice(eq + 1).trim()
			if (key === 'q') {
				const n = Number.parseFloat(val)
				q = Number.isNaN(n) ? 1 : n
				break
			}
		}
		if (q === 0) continue
		if (mediaRange === 'text/markdown') return true
	}
	return false
}

export function markdownCandidates(pathname) {
	let p = typeof pathname === 'string' && pathname.length > 0 ? pathname : '/'
	if (!p.startsWith('/')) p = `/${p}`
	if (p.endsWith('/')) return [`${p}index.md`]
	return [`${p}.md`, `${p}/index.md`]
}

export function mergeVary(existingHeaderValue) {
	const tokens = []
	const seen = new Set(['accept', 'accept-encoding'])
	if (
		typeof existingHeaderValue === 'string' &&
		existingHeaderValue.length > 0
	) {
		for (const raw of existingHeaderValue.split(',')) {
			const token = raw.trim()
			if (!token) continue
			const key = token.toLowerCase()
			if (seen.has(key)) continue
			seen.add(key)
			tokens.push(token)
		}
	}
	tokens.sort((a, b) => {
		const la = a.toLowerCase()
		const lb = b.toLowerCase()
		if (la < lb) return -1
		if (la > lb) return 1
		return 0
	})
	return ['Accept', 'Accept-Encoding', ...tokens].join(', ')
}

const MARKDOWN_404_BODY = `# 404 - Not Found

The requested page was not found.

## Try instead

- [Home](/)
- [llms.txt](/llms.txt)
- [llms-full.txt](/llms-full.txt)
- [agents.md](/agents.md)
- [Sitemap](/sitemap-index.xml)
- [xtarterize](/xtarterize/)
- [create-xtarter-app](/create-xtarter-app/)
`

async function fetchMarkdownAsset(candidatePath, requestUrl, env) {
	try {
		const res = await env.ASSETS.fetch(
			new Request(new URL(candidatePath, requestUrl)),
		)
		if (res && res.status === 200) return res
	} catch {}
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
	if (method !== 'GET' && method !== 'HEAD') {
		return env.ASSETS.fetch(request)
	}
	let pathname = new URL(request.url).pathname
	try {
		pathname = decodeURIComponent(pathname)
	} catch {}
	const negotiate = wantsMarkdown(request.headers.get('accept'))
	if (negotiate) {
		for (const candidate of markdownCandidates(pathname)) {
			const asset = await fetchMarkdownAsset(candidate, request.url, env)
			if (asset) return markdownResponse(asset)
		}
	}
	const response = await env.ASSETS.fetch(request)
	if (response.status === 404) {
		if (negotiate) {
			return new Response(MARKDOWN_404_BODY, {
				status: 404,
				headers: {
					'Content-Type': 'text/markdown; charset=utf-8',
					Vary: mergeVary(response.headers.get('vary')),
				},
			})
		}
		const ct = response.headers.get('content-type') ?? ''
		if (!ct.startsWith('text/html')) {
			try {
				const explicit = await env.ASSETS.fetch(
					new Request(new URL('/404.html', request.url)),
				)
				if (explicit && explicit.status === 200) {
					const h = new Headers(explicit.headers)
					h.set('Vary', mergeVary(explicit.headers.get('vary')))
					return new Response(explicit.body, {
						status: 404,
						statusText: explicit.statusText,
						headers: h,
					})
				}
			} catch {}
		}
	}
	const ct = response.headers.get('content-type') ?? ''
	if (ct.startsWith('text/html') || ct.startsWith('text/markdown')) {
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
	async fetch(request, env, _ctx) {
		try {
			return await handleRequest(request, env)
		} catch {
			return env.ASSETS.fetch(request)
		}
	},
}
