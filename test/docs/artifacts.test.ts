import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vite-plus/test'

const distPath = fileURLToPath(new URL('../../apps/docs/dist', import.meta.url))
const workerPath = path.join(distPath, '_worker.js')
const llmsTxtPath = path.join(distPath, 'llms.txt')
const sitemapIndexPath = path.join(distPath, 'sitemap-index.xml')

// CI excludes the docs build, so these assertions only run against a local
// build output produced by `pnpm --filter @xtarter/docs build`.
describe.skipIf(!fs.existsSync(distPath))('docs build artifacts', () => {
	it('ships the Cloudflare Pages advanced-mode worker', () => {
		expect(fs.existsSync(workerPath)).toBe(true)
		const worker = fs.readFileSync(workerPath, 'utf8')
		expect(worker).toContain('text/markdown')
		expect(worker).toContain('mergeVary')
	})

	it('injects the owned agent-extras block into llms.txt', () => {
		const llmsTxt = fs.readFileSync(llmsTxtPath, 'utf8')
		expect(llmsTxt).toContain('BEGIN agent-extras')
		expect(llmsTxt).toContain('## When to use')
		expect(llmsTxt).toContain('https://xtarter.sznm.dev/sitemap-index.xml')
		expect(llmsTxt).toContain('create-xtarter-app')
	})

	it('generates the sitemap index', () => {
		expect(fs.existsSync(sitemapIndexPath)).toBe(true)
	})

	it('writes markdown mirrors for built pages', () => {
		const xtarterizeMirror = path.join(distPath, 'xtarterize/index.md')
		expect(fs.existsSync(xtarterizeMirror)).toBe(true)
		expect(fs.statSync(xtarterizeMirror).size).toBeGreaterThan(0)

		expect(fs.existsSync(path.join(distPath, 'about/index.md'))).toBe(true)
		expect(fs.existsSync(path.join(distPath, 'index.md'))).toBe(true)
	})
})
