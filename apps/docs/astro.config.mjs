import starlight from '@astrojs/starlight'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'
import astroMermaid from 'astro-mermaid'
import lucode from 'lucode-starlight'

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
			// logo: {
			// 	light: './src/assets/logo-light.svg',
			// 	dark: './src/assets/logo-dark.svg',
			// 	replacesTitle: true,
			// },
			// favicon: '/favicon.svg',
			customCss: ['./src/styles/global.css'],
			components: {
				Head: './src/components/StarlightHead.astro',
				PageFrame: './src/components/override/PageFrame.astro',
			},
			plugins: [
				lucode({
					navLinks: [
						{ label: 'xtarterize', link: '/xtarterize/' },
						{ label: 'create-xtarter-app', link: '/create-xtarter-app/' },
						{
							label: 'GitHub',
							link: 'https://github.com/agustinusnathaniel/xtarterize',
						},
					],
				}),
			],
			head: [
				{
					tag: 'meta',
					attrs: {
						property: 'og:title',
						content:
							'xtarter — Production-grade JS/TS starters & conformance tooling',
					},
				},
				{
					tag: 'meta',
					attrs: {
						property: 'og:description',
						content:
							'Scaffold new projects or bring conformance to existing ones. Biome, TypeScript strict, CI, editor configs — ready in seconds.',
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
							link: '/xtarterize/guide/cli/overview/',
						},
						{
							label: 'Conformance Tasks',
							link: '/xtarterize/guide/tasks/overview/',
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
					],
				},
			],
		}),
	],
})
