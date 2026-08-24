import { access, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
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
import {
	buildFounderPersonJsonLd,
	buildOrganizationJsonLd,
	buildSoftwareApplicationJsonLd,
	buildWebSiteJsonLd,
	SITE_URL,
	serializeJsonLd,
} from './src/lib/jsonld.ts'

const JSON_LD = serializeJsonLd({
	'@context': 'https://schema.org',
	'@graph': [
		buildWebSiteJsonLd(),
		buildOrganizationJsonLd(),
		buildFounderPersonJsonLd(),
		buildSoftwareApplicationJsonLd(
			'xtarterize',
			'Conformance CLI that brings existing JavaScript/TypeScript projects up to a production-grade baseline (linting, strict TypeScript, CI, editor configs) with dry-run previews and approval before writing.',
			`${SITE_URL}/xtarterize/`,
			'https://github.com/agustinusnathaniel/xtarterize',
		),
		buildSoftwareApplicationJsonLd(
			'create-xtarter-app',
			'Scaffolding CLI that creates new JavaScript/TypeScript projects from five production-grade starter templates with Biome, strict TypeScript, CI, editor configs, and agent skills preconfigured.',
			`${SITE_URL}/create-xtarter-app/`,
			'https://github.com/agustinusnathaniel/xtarterize',
		),
	],
})

const LLMS_DETAILS = `For dedicated usage guidance, installation instructions, and machine-readable resource links, read [xtarter agent instructions](${SITE_URL}/agents.md).`

const LLMS_OPTIONAL_LINKS = [
	{
		label: 'XML sitemap',
		url: `${SITE_URL}/sitemap-index.xml`,
		description: 'The machine-readable list of published routes.',
	},
	{
		label: 'About this project',
		url: `${SITE_URL}/about/`,
	},
	{
		label: 'Contact channels',
		url: `${SITE_URL}/contact/`,
	},
	{
		label: 'Privacy practices',
		url: `${SITE_URL}/privacy/`,
	},
	{
		label: 'Agent instructions',
		url: `${SITE_URL}/agents.md`,
		description:
			'Usage guidance and machine-readable resource links for agents.',
	},
	{
		label: 'GitHub repository',
		url: 'https://github.com/agustinusnathaniel/xtarterize',
	},
	{
		label: 'xtarterize on npm',
		url: 'https://www.npmjs.com/package/xtarterize',
	},
	{
		label: 'create-xtarter-app on npm',
		url: 'https://www.npmjs.com/package/create-xtarter-app',
	},
]

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
 * Return the sibling Markdown path emitted by starlight-page-actions for a
 * Starlight route. A trailing-slash route such as `/guide/` maps to
 * `guide.md`, while the root route maps to `index.md`.
 */
function getSourceMarkdownPath(relativeHtmlPath) {
	if (path.basename(relativeHtmlPath) !== 'index.html') {
		return relativeHtmlPath.replace(/\.html$/, '.md')
	}
	const routeDir = path.dirname(relativeHtmlPath)
	return routeDir === '.' ? 'index.md' : `${routeDir}.md`
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
 * Build-time post-processing for agent-facing artifacts: write a .md mirror
 * next to every built .html page so servers can honor `Accept: text/markdown`
 * from static hosting without runtime HTML scraping.
 *
 * The Cloudflare Pages worker lives in `public/_worker.js`, so Astro copies it
 * to the output without a second build-time copy step.
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
				const relativePath = path.relative(outDir, htmlPath)
				const sourceMarkdownPath = getSourceMarkdownPath(relativePath)
				try {
					await access(path.join(outDir, sourceMarkdownPath))
					continue // starlight-page-actions already emitted the clean source mirror
				} catch {
					// This is a custom Astro route; create its Markdown mirror below.
				}

				const html = await readFile(htmlPath, 'utf8')
				if (!html.trim()) continue // an empty document has no mirror value
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
			logger.info(
				`agent-extras: ${mirrorCount} custom markdown mirrors written`,
			)
		},
	},
}

export default defineConfig({
	site: SITE_URL,
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
				starlightLinksValidator({
					exclude: [
						'/about/**',
						'/contact/**',
						'/privacy/**',
						'/sitemap-index.xml',
					],
				}),
				starlightLlmsTxt({
					projectName: 'xtarter',
					description:
						'Production-grade starter templates and conformance tooling for JavaScript/TypeScript projects. Includes xtarterize (conformance CLI) and create-xtarter-app (scaffolding CLI).',
					details: LLMS_DETAILS,
					optionalLinks: LLMS_OPTIONAL_LINKS,
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
				{
					tag: 'script',
					attrs: { type: 'application/ld+json' },
					content: JSON_LD,
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
		agentExtras,
	],
})
