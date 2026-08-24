import { describe, expect, it } from 'vite-plus/test'
import { buildLlmsExtras } from '../../apps/docs/src/lib/llms-extras'

const SITE_URL = 'https://xtarter.sznm.dev'

/** Extract every markdown link target from the generated block. */
function extractLinks(markdown: string): string[] {
	return [...markdown.matchAll(/\]\(([^)]+)\)/g)].map((match) => match[1])
}

describe('buildLlmsExtras', () => {
	it('starts with the When to use section and covers both tools', () => {
		const extras = buildLlmsExtras(SITE_URL)
		expect(extras.startsWith('## When to use')).toBe(true)
		expect(extras).toContain('## How to invoke')
		expect(extras).toContain('xtarterize')
		expect(extras).toContain('create-xtarter-app')
		expect(extras.endsWith('\n')).toBe(true)
	})

	it('only emits links that are absolute https or on the given site', () => {
		const extras = buildLlmsExtras(SITE_URL)
		const links = extractLinks(extras)
		expect(links.length).toBeGreaterThan(0)

		for (const link of links) {
			const onSite =
				link === SITE_URL ||
				link.startsWith(`${SITE_URL}/`) ||
				link.startsWith('https://xtarter.sznm.dev/')
			const absoluteHttps = /^https:\/\/[^\s]+$/.test(link)
			expect(onSite || absoluteHttps, `unexpected link: ${link}`).toBe(true)
		}
	})

	it('points at the confirmed published npm packages and repo resources', () => {
		const extras = buildLlmsExtras(SITE_URL)
		expect(extras).toContain(`${SITE_URL}/llms.txt`)
		expect(extras).toContain(`${SITE_URL}/llms-small.txt`)
		expect(extras).toContain(`${SITE_URL}/llms-full.txt`)
		expect(extras).toContain(`${SITE_URL}/sitemap-index.xml`)
		expect(extras).toContain('https://www.npmjs.com/package/xtarterize')
		expect(extras).toContain('https://www.npmjs.com/package/create-xtarter-app')
	})

	it('is deterministic across calls and tolerant of a trailing slash', () => {
		const first = buildLlmsExtras(SITE_URL)
		const second = buildLlmsExtras(SITE_URL)
		expect(second).toBe(first)
		expect(buildLlmsExtras(`${SITE_URL}/`)).toBe(first)
	})
})
