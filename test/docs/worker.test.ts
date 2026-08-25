import { describe, expect, it, vi } from 'vitest'
import worker, {
	markdownCandidates,
	mergeVary,
	wantsMarkdown,
} from '../../apps/docs/worker/index.js'

function createEnv(entries: Array<[string, Response]>, fallback?: Response) {
	const map = new Map(entries)
	const fetchMock = vi.fn(async (input: Request | string) => {
		const req = input instanceof Request ? input : new Request(input)
		const pathname = new URL(req.url).pathname
		if (map.has(pathname)) {
			const res = map.get(pathname)
			if (res) return res.clone()
		}
		if (fallback) return fallback.clone()
		return new Response('Not Found', {
			status: 404,
			headers: { 'content-type': 'text/html; charset=utf-8' },
		})
	})
	return {
		env: { ASSETS: { fetch: fetchMock } } as unknown as {
			ASSETS: { fetch: typeof fetch }
		},
		fetchMock,
		map,
	}
}

describe('wantsMarkdown', () => {
	it('true for text/markdown', () => {
		expect(wantsMarkdown('text/markdown')).toBe(true)
	})

	it('true for text/html, text/markdown;q=0.9', () => {
		expect(wantsMarkdown('text/html, text/markdown;q=0.9')).toBe(true)
	})

	it('true case-insensitive and with charset param', () => {
		expect(wantsMarkdown('TEXT/MARKDOWN')).toBe(true)
		expect(wantsMarkdown('text/markdown; charset=utf-8')).toBe(true)
	})

	it('false for text/html only', () => {
		expect(wantsMarkdown('text/html')).toBe(false)
		expect(wantsMarkdown('text/html,application/xhtml+xml')).toBe(false)
	})

	it('false for text/markdown;q=0 and q=0 with other types', () => {
		expect(wantsMarkdown('text/markdown;q=0')).toBe(false)
		expect(wantsMarkdown('text/html, text/markdown;q=0')).toBe(false)
		expect(wantsMarkdown('text/markdown;q=0.0')).toBe(false)
	})

	it('false for missing / empty / wrong types', () => {
		expect(wantsMarkdown('')).toBe(false)
		expect(wantsMarkdown(null as unknown as string)).toBe(false)
		expect(wantsMarkdown(undefined as unknown as string)).toBe(false)
		expect(wantsMarkdown('*/*')).toBe(false)
		expect(wantsMarkdown('text/*')).toBe(false)
		expect(wantsMarkdown('application/json')).toBe(false)
	})

	it('false for q=0 even when other entries want markdown but are disabled', () => {
		expect(wantsMarkdown('text/markdown ; q=0 , text/html')).toBe(false)
	})

	it('handles whitespace and ordering', () => {
		expect(wantsMarkdown(' text/html ; q=0.8 , text/markdown ; q=0.9 ')).toBe(
			true,
		)
		expect(wantsMarkdown('text/markdown;q=0.9, text/html')).toBe(true)
	})
})

describe('mergeVary', () => {
	it('merges missing existing to Accept, Accept-Encoding', () => {
		expect(mergeVary(undefined as unknown as string)).toBe(
			'Accept, Accept-Encoding',
		)
		expect(mergeVary('')).toBe('Accept, Accept-Encoding')
		expect(mergeVary(null as unknown as string)).toBe('Accept, Accept-Encoding')
	})

	it('dedupes case-insensitively and keeps stable base order', () => {
		expect(mergeVary('accept-encoding')).toBe('Accept, Accept-Encoding')
		expect(mergeVary('Accept')).toBe('Accept, Accept-Encoding')
		expect(mergeVary('Accept-Encoding')).toBe('Accept, Accept-Encoding')
		expect(mergeVary('accept')).toBe('Accept, Accept-Encoding')
	})

	it('appends extra tokens sorted case-insensitively', () => {
		expect(mergeVary('Origin')).toBe('Accept, Accept-Encoding, Origin')
		expect(mergeVary('X-Custom, accept-encoding, Accept-Language')).toBe(
			'Accept, Accept-Encoding, Accept-Language, X-Custom',
		)
	})

	it('trims whitespace and ignores empty tokens', () => {
		expect(mergeVary('  Origin  , , Accept-Encoding  ')).toBe(
			'Accept, Accept-Encoding, Origin',
		)
	})

	it('dedupes duplicate custom tokens case-insensitively', () => {
		expect(mergeVary('X-Foo, x-foo, X-FOO')).toBe(
			'Accept, Accept-Encoding, X-Foo',
		)
	})
})

describe('markdownCandidates', () => {
	it('"/" => ["/index.md"]', () => {
		expect(markdownCandidates('/')).toEqual(['/index.md'])
	})

	it('handles trailing slash', () => {
		expect(markdownCandidates('/xtarterize/guide/')).toEqual([
			'/xtarterize/guide/index.md',
		])
		expect(markdownCandidates('/foo/')).toEqual(['/foo/index.md'])
	})

	it('without trailing slash returns file and index candidates', () => {
		expect(markdownCandidates('/xtarterize/guide/cli/overview')).toEqual([
			'/xtarterize/guide/cli/overview.md',
			'/xtarterize/guide/cli/overview/index.md',
		])
		expect(markdownCandidates('/foo')).toEqual(['/foo.md', '/foo/index.md'])
	})

	it('handles empty and missing leading slash', () => {
		expect(markdownCandidates('')).toEqual(['/index.md'])
		expect(markdownCandidates('xtarterize/guide')).toEqual([
			'/xtarterize/guide.md',
			'/xtarterize/guide/index.md',
		])
		expect(markdownCandidates(null as unknown as string)).toEqual(['/index.md'])
	})
})

describe('worker fetch handler', () => {
	it('Accept text/markdown + twin exists => 200 text/markdown with Vary', async () => {
		const mdBody = '# Hello markdown'
		const mdResponse = new Response(mdBody, {
			status: 200,
			headers: { 'content-type': 'text/plain' },
		})
		const { env, fetchMock } = createEnv([
			['/xtarterize/guide/cli/overview.md', mdResponse],
		])
		// original HTML would also exist but should not be fetched if twin found
		const req = new Request(
			'https://example.com/xtarterize/guide/cli/overview',
			{
				headers: { Accept: 'text/markdown' },
			},
		)
		const res = await worker.fetch(req, env as never, {} as never)
		expect(res.status).toBe(200)
		expect(res.headers.get('content-type')).toBe('text/markdown; charset=utf-8')
		expect(res.headers.get('vary')).toMatch(/Accept/)
		expect(res.headers.get('vary')).toMatch(/Accept-Encoding/)
		const text = await res.text()
		expect(text).toBe(mdBody)
		// should have tried candidate before original
		expect(fetchMock).toHaveBeenCalled()
		const firstUrl = new URL((fetchMock.mock.calls[0][0] as Request).url)
			.pathname
		expect(firstUrl).toBe('/xtarterize/guide/cli/overview.md')
	})

	it('also serves index.md twin for trailing-slash-like directory', async () => {
		const mdBody = '# Index twin'
		const { env } = createEnv([
			[
				'/xtarterize/guide/cli/overview/index.md',
				new Response(mdBody, { status: 200 }),
			],
		])
		const req = new Request(
			'https://example.com/xtarterize/guide/cli/overview',
			{ headers: { Accept: 'text/markdown' } },
		)
		const res = await worker.fetch(req, env as never, {} as never)
		expect(res.status).toBe(200)
		expect(await res.text()).toBe(mdBody)
		expect(res.headers.get('content-type')).toBe('text/markdown; charset=utf-8')
	})

	it('no twin -> fallback to HTML 200 with Vary', async () => {
		const htmlBody = '<html>hello</html>'
		const htmlResponse = new Response(htmlBody, {
			status: 200,
			headers: { 'content-type': 'text/html; charset=utf-8' },
		})
		const { env } = createEnv([
			['/xtarterize/guide/cli/overview', htmlResponse],
		])
		const req = new Request(
			'https://example.com/xtarterize/guide/cli/overview',
			{
				headers: { Accept: 'text/markdown' },
			},
		)
		const res = await worker.fetch(req, env as never, {} as never)
		expect(res.status).toBe(200)
		expect(res.headers.get('content-type')).toContain('text/html')
		expect(res.headers.get('vary')).toContain('Accept')
		expect(await res.text()).toBe(htmlBody)
	})

	it('HEAD with markdown also negotiates', async () => {
		const mdBody = '# HEAD twin'
		const { env } = createEnv([
			['/foo.md', new Response(mdBody, { status: 200 })],
		])
		const req = new Request('https://example.com/foo', {
			method: 'HEAD',
			headers: { Accept: 'text/markdown' },
		})
		const res = await worker.fetch(req, env as never, {} as never)
		expect(res.status).toBe(200)
		expect(res.headers.get('content-type')).toBe('text/markdown; charset=utf-8')
	})

	it('404 + Accept markdown => 404 text/markdown with llms link and Vary', async () => {
		const { env } = createEnv([])
		const req = new Request('https://example.com/definitely-not-a-real-page', {
			headers: { Accept: 'text/markdown' },
		})
		const res = await worker.fetch(req, env as never, {} as never)
		expect(res.status).toBe(404)
		expect(res.headers.get('content-type')).toBe('text/markdown; charset=utf-8')
		expect(res.headers.get('vary')).toMatch(/Accept/)
		const body = await res.text()
		expect(body).toContain('/llms.txt')
		expect(body).toContain('404')
	})

	it('404 + browser Accept => 404 HTML with Vary', async () => {
		const html404 = '<html>custom 404</html>'
		const fallback404 = new Response(html404, {
			status: 404,
			headers: { 'content-type': 'text/html; charset=utf-8' },
		})
		const { env } = createEnv([], fallback404)
		const req = new Request('https://example.com/missing-page', {
			headers: { Accept: 'text/html,application/xhtml+xml' },
		})
		const res = await worker.fetch(req, env as never, {} as never)
		expect(res.status).toBe(404)
		expect(res.headers.get('content-type')).toContain('text/html')
		expect(res.headers.get('vary')).toMatch(/Accept/)
		const body = await res.text()
		expect(body).toBe(html404)
	})

	it('404 non-html + no markdown negotiate tries /404.html', async () => {
		const json404 = new Response('{"error":"not found"}', {
			status: 404,
			headers: { 'content-type': 'application/json' },
		})
		const explicit404 = new Response('<html>404 page</html>', {
			status: 200,
			headers: { 'content-type': 'text/html; charset=utf-8' },
		})
		const { env, fetchMock } = createEnv([
			['/missing', json404],
			['/404.html', explicit404],
		])
		const req = new Request('https://example.com/missing', {
			headers: { Accept: 'text/html' },
		})
		const res = await worker.fetch(req, env as never, {} as never)
		expect(res.status).toBe(404)
		expect(res.headers.get('content-type')).toContain('text/html')
		expect(await res.text()).toBe('<html>404 page</html>')
		expect(fetchMock).toHaveBeenCalled()
	})

	it('non-GET (POST) passthrough without markdown lookup', async () => {
		const ok = new Response('posted', {
			status: 200,
			headers: { 'content-type': 'text/html' },
		})
		const { env, fetchMock } = createEnv([['/api/submit', ok]])
		const req = new Request('https://example.com/api/submit', {
			method: 'POST',
			headers: { Accept: 'text/markdown' },
			body: 'data',
		})
		const res = await worker.fetch(req, env as never, {} as never)
		expect(res.status).toBe(200)
		expect(await res.text()).toBe('posted')
		expect(fetchMock).toHaveBeenCalledTimes(1)
		const calledUrl = new URL((fetchMock.mock.calls[0][0] as Request).url)
			.pathname
		expect(calledUrl).toBe('/api/submit')
	})

	it('binary asset (.png) not rewritten even with Accept markdown', async () => {
		const pngBytes = new Uint8Array([137, 80, 78, 71])
		const pngResponse = new Response(pngBytes, {
			status: 200,
			headers: { 'content-type': 'image/png' },
		})
		const { env } = createEnv([['/assets/logo.png', pngResponse]])
		const req = new Request('https://example.com/assets/logo.png', {
			headers: { Accept: 'text/markdown' },
		})
		const res = await worker.fetch(req, env as never, {} as never)
		expect(res.status).toBe(200)
		expect(res.headers.get('content-type')).toBe('image/png')
		// binary should not have Vary injected
		expect(res.headers.get('vary')).toBeNull()
		const buf = new Uint8Array(await res.arrayBuffer())
		expect(buf[0]).toBe(137)
	})

	it('HTML 200 with Vary merging preserves existing tokens', async () => {
		const htmlResponse = new Response('<html>hi</html>', {
			status: 200,
			headers: {
				'content-type': 'text/html',
				vary: 'Origin',
			},
		})
		const { env } = createEnv([['/foo', htmlResponse]])
		const req = new Request('https://example.com/foo', {
			headers: { Accept: 'text/html' },
		})
		const res = await worker.fetch(req, env as never, {} as never)
		expect(res.headers.get('vary')).toBe('Accept, Accept-Encoding, Origin')
	})
})
