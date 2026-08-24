import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sitemap from '@astrojs/sitemap'
import starlight from '@astrojs/starlight'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'
import astroMermaid from 'astro-mermaid'
import starlightAutoSidebar from 'starlight-auto-sidebar'
import starlightBlog from 'starlight-blog'
import starlightLinksValidator from 'starlight-links-validator'
import starlightLlmsTxt from 'starlight-llms-txt'
import starlightPageActions from 'starlight-page-actions'
import starlightSidebarSwipe from 'starlight-sidebar-swipe'
import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'
import { buildLlmsExtras } from './src/lib/llms-extras.ts'

const SITE_URL = 'https://xtarter.sznm.dev'
const AGENT_EXTRAS_BEGIN = '<!-- BEGIN agent-extras -->'
const AGENT_EXTRAS_END = '<!-- END agent-extras -->'
const WORKER_SOURCE_URL = new URL('./worker/index.js', import.meta.url)

/** Deterministic depth-first walk collecting every .html file under rootDir. */
async function collectHtmlFiles(rootDir) {
	const files = []
	async function walk(currentDir) {
		const entries = await readdir(currentDir, { withFileTypes: true })
		const sorted = [...entries].sort((a, b) =>
			a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
		)
		for (const entry of sorted) {
			const entryPath = path.join(currentDir, entry.name)
			if (entry.isDirectory()) {
				await walk(entryPath)
			} else if (entry.name.endsWith('.html')) {
				files.push(entryPath)
			}
		}
	}
	await walk(rootDir)
	return files
}

/**
 * Convert one built HTML document to markdown. Head metadata and executable
 * elements carry no prose value, so they are stripped before conversion;
 * collapsing blank runs plus a single trailing newline keeps mirrors stable
 * byte-for-byte across builds.
 */
function convertHtmlToMarkdown(turndownService, html) {
	const cleaned = html
		.replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, '')
		.replace(
			/<(script|style|noscript|template|svg)\b[^>]*>[\s\S]*?<\/\1>/gi,
			'',
		)
		.replace(/<(script|style|noscript|template)\b[^>]*\/>/gi, '')
	const markdown = turndownService.turndown(cleaned)
	return `${markdown.replace(/\n{3,}/g, '\n\n').trimEnd()}\n`
}

/**
 * Build-time post-processing for agent-facing artifacts:
 * 1. writes a .md mirror next to every built .html page so servers can honor
 *    `Accept: text/markdown` from static hosting without runtime HTML scraping,
 * 2. injects hand-written agent guidance into llms.txt between owned markers
 *    (previous blocks are removed first, keeping repeated builds byte-identical),
 * 3. copies the Cloudflare Pages advanced-mode worker verbatim to _worker.js.
 *
 * Runs in `astro:build:done`, ordered after starlight-llms-txt (llms.txt exists)
 * and alongside @astrojs/sitemap.
 */
const agentExtras = {
	name: 'agent-extras',
	hooks: {
		'astro:build:done': async ({ dir, logger }) => {
			// `dir` arrives as a URL that may or may not end with a slash.
			const outDir = fileURLToPath(dir).replace(/[\\/]+$/, '')

			const turndownService = new TurndownService({
				headingStyle: 'atx',
				codeBlockStyle: 'fenced',
				bulletListMarker: '-',
			})
			turndownService.use(gfm)

			let mirrorCount = 0
			for (const htmlPath of await collectHtmlFiles(outDir)) {
				const html = await readFile(htmlPath, 'utf8')
				if (!html.trim()) continue // an empty document has no mirror value
				const relativePath = path.relative(outDir, htmlPath)
				const markdownPath =
					path.basename(relativePath) === 'index.html'
						? path.join(path.dirname(relativePath), 'index.md')
						: relativePath.replace(/\.html$/, '.md')
				await writeFile(
					path.join(outDir, markdownPath),
					convertHtmlToMarkdown(turndownService, html),
				)
				mirrorCount += 1
			}
			logger.info(`agent-extras: ${mirrorCount} markdown mirrors written`)

			const llmsPath = path.join(outDir, 'llms.txt')
			try {
				let llmsContent = await readFile(llmsPath, 'utf8')
				// Drop any previously injected block (including its leading newline)
				// so appending below yields byte-identical output on every build.
				llmsContent = llmsContent.replace(
					/\n<!-- BEGIN agent-extras -->[\s\S]*?<!-- END agent-extras -->\n/g,
					'',
				)
				llmsContent += `\n${AGENT_EXTRAS_BEGIN}\n${buildLlmsExtras(SITE_URL)}${AGENT_EXTRAS_END}\n`
				await writeFile(llmsPath, llmsContent)
			} catch (error) {
				logger.warn(`agent-extras: could not update llms.txt (${error})`)
			}

			const workerTargetPath = path.join(outDir, '_worker.js')
			await writeFile(
				workerTargetPath,
				await readFile(fileURLToPath(WORKER_SOURCE_URL), 'utf8'),
			)
		},
	},
}

export default defineConfig({
	site: 'https://xtarter.sznm.dev',
	vite: {
		plugins: [tailwindcss()],
	},
	integrations: [
		astroMermaid(),
		starlight({
			title: 'xtarter',
			description:
				'Production-grade starter templates and conformance tooling for JavaScript/TypeScript projects.',
			logo: {
				light: './src/assets/logo-light.svg',
				dark: './src/assets/logo-dark.svg',
				replacesTitle: true,
			},
			// favicon: '/favicon.svg',
			customCss: ['./src/styles/global.css'],
			plugins: [
				starlightLinksValidator(),
				starlightLlmsTxt({
					projectName: 'xtarter',
					description:
						'Production-grade starter templates and conformance tooling for JavaScript/TypeScript projects. Includes xtarterize (conformance CLI) and create-xtarter-app (scaffolding CLI).',
				}),
				starlightPageActions({
					share: true,
					prompt:
						'You are an expert on xtarterize and create-xtarter-app. Read {url} and help me understand how to use this tool effectively.',
				}),
				starlightBlog(),
				starlightAutoSidebar(),
				starlightSidebarSwipe(),
			],
			components: {
				Head: './src/components/StarlightHead.astro',
				Hero: './src/components/LandingHero.astro',
			},
			head: [
				{
					tag: 'meta',
					attrs: {
						property: 'og:title',
						content:
							'xtarter - Production-grade JS/TS starters & conformance tooling',
					},
				},
				{
					tag: 'meta',
					attrs: {
						property: 'og:description',
						content:
							'Scaffold new projects or bring conformance to existing ones. Biome, TypeScript strict, CI, editor configs - ready in seconds.',
					},
				},
				{
					tag: 'meta',
					attrs: {
						property: 'og:image',
						content:
							'https://og.sznm.dev/api/generate?heading=xtarter&text=Production-grade%20JS/TS%20starters%20%26%20conformance%20tooling&template=color',
					},
				},
				{
					tag: 'meta',
					attrs: { property: 'og:url', content: 'https://xtarter.sznm.dev' },
				},
				{
					tag: 'meta',
					attrs: { name: 'twitter:card', content: 'summary_large_image' },
				},
				{
					tag: 'link',
					attrs: {
						rel: 'icon',
						href: '/favicon.svg',
						type: 'image/svg+xml',
					},
				},
			],
			social: [
				{
					icon: 'github',
					href: 'https://github.com/agustinusnathaniel/xtarterize',
					label: 'GitHub',
				},
			],
			sidebar: [
				{
					label: 'Home',
					link: '/',
				},
				{
					label: 'xtarterize',
					collapsed: false,
					items: [
						{
							label: 'Overview',
							link: '/xtarterize/',
						},
						{
							label: 'Getting Started',
							items: [
								{ autogenerate: { directory: 'xtarterize/getting-started' } },
							],
						},
						{
							label: 'CLI Reference',
							collapsed: false,
							items: [
								{ label: 'Overview', link: '/xtarterize/guide/cli/overview/' },
								{ label: 'Query', link: '/xtarterize/guide/cli/query/' },
							],
						},
						{
							label: 'Conformance Tasks',
							collapsed: false,
							items: [
								{
									autogenerate: {
										directory: 'xtarterize/guide/tasks',
									},
								},
							],
						},
						{
							label: 'Configuration',
							link: '/xtarterize/guide/config/overview/',
						},
						{
							label: 'AI Agent Skills',
							link: '/xtarterize/guide/agent-skills/',
						},
						{
							label: 'Changelog',
							link: '/xtarterize/changelog/',
						},
						{
							label: 'Contributing',
							collapsed: true,
							items: [
								{
									label: 'Contributors',
									link: '/xtarterize/contributing/contributors/',
								},
								{
									label: 'Architecture',
									link: '/xtarterize/contributing/architecture/overview/',
								},
								{
									label: 'Project Detection',
									link: '/xtarterize/contributing/core/detect/',
								},
								{
									label: 'Preflight & Diagnostics',
									link: '/xtarterize/contributing/core/preflight/',
								},
								{
									label: 'Task Resolution',
									link: '/xtarterize/contributing/core/resolve/',
								},
								{
									label: 'Apply Engine',
									link: '/xtarterize/contributing/core/apply/',
								},
								{
									label: 'Tasks',
									items: [
										{
											autogenerate: {
												directory: 'xtarterize/contributing/tasks',
											},
										},
									],
								},
								{
									label: 'Patchers',
									items: [
										{
											autogenerate: {
												directory: 'xtarterize/contributing/patchers',
											},
										},
									],
								},
							],
						},
					],
				},
				{
					label: 'create-xtarter-app',
					collapsed: true,
					items: [
						{
							label: 'Overview',
							link: '/create-xtarter-app/',
						},
						{
							label: 'Getting Started',
							items: [
								{
									autogenerate: {
										directory: 'create-xtarter-app/getting-started',
									},
								},
							],
						},
						{
							label: 'CLI Reference',
							link: '/create-xtarter-app/guide/cli/',
						},
						{
							label: 'Templates',
							link: '/create-xtarter-app/guide/templates/',
						},
						{
							label: 'Vite+ Org Templates',
							link: '/create-xtarter-app/guide/org-templates/',
						},
						{
							label: 'AI Agent Skills',
							link: '/create-xtarter-app/guide/agent-skills/',
						},
					],
				},
			],
		}),
		// Sitemap and agent post-processing run after starlight so their
		// `astro:build:done` hooks see the final llms.txt output.
		sitemap(),
		agentExtras,
	],
})
