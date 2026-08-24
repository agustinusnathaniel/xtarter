import { describe, expect, it } from 'vite-plus/test'
import {
	markdownCandidates,
	mergeVary,
	wantsMarkdown,
} from '../../apps/docs/worker/index.js'

describe('wantsMarkdown', () => {
	it('matches an explicit text/markdown intent', () => {
		expect(wantsMarkdown('text/markdown')).toBe(true)
	})

	it('ignores q-parameters on the media range', () => {
		expect(
			wantsMarkdown(
				'text/html,application/xhtml+xml,text/markdown;q=0.9,*/*;q=0.8',
			),
		).toBe(true)
		expect(wantsMarkdown('text/markdown; charset=utf-8')).toBe(true)
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

	it('maps a trailing-slash directory to its index mirror', () => {
		expect(markdownCandidates('/xtarterize/')).toEqual(['/xtarterize/index.md'])
		expect(markdownCandidates('/guide/cli/')).toEqual(['/guide/cli/index.md'])
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
