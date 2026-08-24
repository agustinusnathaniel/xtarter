import { describe, expect, it } from 'vite-plus/test'
import worker, {
	markdownCandidates,
	mergeVary,
	RECOVERY_LINKS,
	wantsMarkdown,
} from '../../apps/docs/public/_worker.js'

describe('wantsMarkdown', () => {
	it('matches an explicit text/markdown intent', () => {
		expect(wantsMarkdown('text/markdown')).toBe(true)
	})

	it('accepts positive q-parameters on the media range', () => {
		expect(wantsMarkdown('text/html;q=0.9,text/markdown,*/*;q=0.8')).toBe(true)
		expect(wantsMarkdown('text/markdown; charset=utf-8')).toBe(true)
		expect(wantsMarkdown('text/html,text/markdown;q=0.9')).toBe(false)
	})

	it('does not negotiate when the media range has q=0', () => {
		expect(wantsMarkdown('text/markdown;q=0')).toBe(false)
		expect(wantsMarkdown('text/markdown;q=0, text/html;q=1')).toBe(false)
		expect(wantsMarkdown('text/markdown;q=not-a-number')).toBe(false)
	})

	it('does not match other explicit types', () => {
		expect(wantsMarkdown('text/html')).toBe(false)
		expect(wantsMarkdown('application/json')).toBe(false)
	})

	it('does not match wildcard ranges', () => {
		expect(wantsMarkdown('*/*')).toBe(false)
		expect(wantsMarkdown('text/*')).toBe(false)
		expect(wantsMarkdown('*/*;q=0.1, text/*')).toBe(false)
	})

	it('is safe for missing or malformed headers', () => {
		expect(wantsMarkdown(null)).toBe(false)
		expect(wantsMarkdown(undefined)).toBe(false)
		expect(wantsMarkdown('')).toBe(false)
	})
})

describe('markdownCandidates', () => {
	it('maps the root path to the index mirror', () => {
		expect(markdownCandidates('/')).toEqual(['/index.md'])
	})

	it('tries the source mirror before a custom directory-index mirror', () => {
		expect(markdownCandidates('/xtarterize/')).toEqual([
			'/xtarterize.md',
			'/xtarterize/index.md',
		])
		expect(markdownCandidates('/guide/cli/')).toEqual([
			'/guide/cli.md',
			'/guide/cli/index.md',
		])
	})

	it('tries the sibling .md first, then the directory-index form', () => {
		expect(markdownCandidates('/xtarterize')).toEqual([
			'/xtarterize.md',
			'/xtarterize/index.md',
		])
	})

	it('keeps existing extensions and appends the mirror suffix', () => {
		expect(markdownCandidates('/x/y.html')).toEqual([
			'/x/y.html.md',
			'/x/y.html/index.md',
		])
	})

	it('passes percent-encoded segments through without double decoding', () => {
		expect(markdownCandidates('/my%20page')).toEqual([
			'/my%20page.md',
			'/my%20page/index.md',
		])
	})
})

describe('mergeVary', () => {
	it('always leads with Accept and Accept-Encoding', () => {
		expect(mergeVary(null)).toBe('Accept, Accept-Encoding')
		expect(mergeVary(undefined)).toBe('Accept, Accept-Encoding')
		expect(mergeVary('')).toBe('Accept, Accept-Encoding')
	})

	it('dedupes required tokens case-insensitively', () => {
		expect(mergeVary('accept-encoding')).toBe('Accept, Accept-Encoding')
		expect(mergeVary('ACCEPT, Accept-Encoding')).toBe('Accept, Accept-Encoding')
	})

	it('appends foreign tokens alphabetically after the required ones', () => {
		expect(mergeVary('Zeta, alpha')).toBe(
			'Accept, Accept-Encoding, alpha, Zeta',
		)
		expect(mergeVary('garbage-header, foo')).toBe(
			'Accept, Accept-Encoding, foo, garbage-header',
		)
	})

	it('dedupes repeated foreign tokens and drops empty segments', () => {
		expect(mergeVary('Foo, bar,, Foo')).toBe(
			'Accept, Accept-Encoding, bar, Foo',
		)
	})
})

describe('worker.fetch', () => {
	it('serves the existing source mirror with negotiated headers', async () => {
		const requests: Request[] = []
		const response = await worker.fetch(
			new Request('https://example.test/xtarterize/', {
				headers: { Accept: 'text/markdown' },
			}),
			{
				ASSETS: {
					fetch: async (request: Request) => {
						requests.push(request)
						if (new URL(request.url).pathname === '/xtarterize.md') {
							return new Response('source markdown', {
								status: 200,
								headers: { Vary: 'X-Route' },
							})
						}
						return new Response('not found', { status: 404 })
					},
				},
			},
		)

		expect(await response.text()).toBe('source markdown')
		expect(response.headers.get('content-type')).toBe(
			'text/markdown; charset=utf-8',
		)
		expect(response.headers.get('vary')).toBe(
			'Accept, Accept-Encoding, X-Route',
		)
		expect(requests).toHaveLength(1)
		expect(new URL(requests[0].url).pathname).toBe('/xtarterize.md')
	})

	it('keeps HEAD responses bodyless and falls back to HTML when no mirror exists', async () => {
		const headResponse = await worker.fetch(
			new Request('https://example.test/about/', {
				method: 'HEAD',
				headers: { Accept: 'text/markdown' },
			}),
			{
				ASSETS: {
					fetch: async () =>
						new Response('markdown body', {
							status: 200,
							headers: { 'content-type': 'text/markdown' },
						}),
				},
			},
		)
		expect(headResponse.body).toBeNull()
		expect(headResponse.headers.get('content-type')).toBe(
			'text/markdown; charset=utf-8',
		)

		const fallbackResponse = await worker.fetch(
			new Request('https://example.test/missing/', {
				headers: { Accept: 'text/markdown' },
			}),
			{
				ASSETS: {
					fetch: async (request: Request) => {
						if (new URL(request.url).pathname.endsWith('.md')) {
							return new Response('not found', { status: 404 })
						}
						return new Response('<html>fallback</html>', {
							headers: { 'content-type': 'text/html' },
						})
					},
				},
			},
		)
		expect(await fallbackResponse.text()).toBe('<html>fallback</html>')
		expect(fallbackResponse.headers.get('vary')).toBe('Accept, Accept-Encoding')
	})

	it('does not negotiate a request that already targets a Markdown artifact', async () => {
		const requests: Request[] = []
		const response = await worker.fetch(
			new Request('https://example.test/agents.md', {
				headers: { Accept: 'text/markdown' },
			}),
			{
				ASSETS: {
					fetch: async (request: Request) => {
						requests.push(request)
						return new Response('agent instructions', {
							headers: { 'content-type': 'text/markdown' },
						})
					},
				},
			},
		)

		expect(await response.text()).toBe('agent instructions')
		expect(response.headers.get('vary')).toBeNull()
		expect(requests).toHaveLength(1)
		expect(new URL(requests[0].url).pathname).toBe('/agents.md')
	})

	it('does not add negotiated cache variance to ordinary HTML navigation', async () => {
		const response = await worker.fetch(
			new Request('https://example.test/xtarterize/', {
				headers: { Accept: 'text/html' },
			}),
			{
				ASSETS: {
					fetch: async () =>
						new Response('<html>docs</html>', {
							headers: { 'content-type': 'text/html' },
						}),
				},
			},
		)

		expect(await response.text()).toBe('<html>docs</html>')
		expect(response.headers.get('vary')).toBeNull()
	})

	it('returns a Markdown recovery response for a missing negotiated route', async () => {
		const response = await worker.fetch(
			new Request('https://example.test/missing/', {
				headers: { Accept: 'text/markdown' },
			}),
			{
				ASSETS: {
					fetch: async () =>
						new Response('not found', {
							status: 404,
							headers: { 'content-type': 'text/html' },
						}),
				},
			},
		)

		const body = await response.text()
		expect(response.status).toBe(404)
		expect(response.headers.get('content-type')).toBe(
			'text/markdown; charset=utf-8',
		)
		expect(response.headers.get('vary')).toBe('Accept, Accept-Encoding')
		expect(body).toContain('# 404')
		expect(body).toContain('agents.md')
		expect(body).toContain(RECOVERY_LINKS[0][1])
	})
})
