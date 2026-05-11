import { styleText } from 'node:util'

export const APP_NAME: string = styleText('cyanBright', 'create-xtarter-app')

export const BANNER: string = `
${styleText('cyanBright', '╔════════════════════════════════════════════╗')}
${styleText('cyanBright', '║')}                                        ${styleText('cyanBright', '║')}
${styleText('cyanBright', '║')}   ${styleText('bold', 'create-xtarter-app')}                    ${styleText('cyanBright', '║')}
${styleText('cyanBright', '║')}                                        ${styleText('cyanBright', '║')}
${styleText('cyanBright', '║')}   ${styleText('gray', 'Fast project scaffolding')}               ${styleText('cyanBright', '║')}
${styleText('cyanBright', '║')}   ${styleText('gray', 'for modern web apps')}                    ${styleText('cyanBright', '║')}
${styleText('cyanBright', '║')}                                        ${styleText('cyanBright', '║')}
${styleText('cyanBright', '╚════════════════════════════════════════════╝')}
`

export const DEFAULT_TEMPLATE = 'next-chakra'

export const SUPPORTED_PACKAGE_MANAGERS = {
	pnpm: {
		name: 'pnpm',
		installCommand: 'install',
		execCommand: 'pnpm',
	},
	npm: {
		name: 'npm',
		installCommand: 'install',
		execCommand: 'npm',
	},
	bun: {
		name: 'bun',
		installCommand: 'install',
		execCommand: 'bun',
	},
	yarn: {
		name: 'yarn',
		installCommand: 'install',
		execCommand: 'yarn',
	},
} as const

export const HELP_TEXT: string = `
${styleText('bold', 'Usage:')}
  ${styleText('cyan', 'npx create-xtarter-app@latest')} [project-name] [options]

${styleText('bold', 'Options:')}
  ${styleText('cyan', '--template, -t')} <name>     Template to use (skips prompt)
  ${styleText('cyan', '--preview, -P')}             Preview template details
  ${styleText('cyan', '--pm, -p')} <manager>        Package manager (pnpm|npm|bun|yarn)
  ${styleText('cyan', '--no-git')}                  Skip git initialization
  ${styleText('cyan', '--clean')}                   Remove CI/CD configs after scaffold
  ${styleText('cyan', '--yes, -y')}                 Use defaults (pnpm, git init, no clean)
  ${styleText('cyan', '--help, -h')}                Show this help message
  ${styleText('cyan', '--version, -v')}             Show version number

${styleText('bold', 'Examples:')}
  ${styleText('gray', '# Preview a template')}
  ${styleText('cyan', 'npx create-xtarter-app@latest --preview vite-tailwind')}

  ${styleText('gray', '# Interactive mode')}
  ${styleText('cyan', 'npx create-xtarter-app@latest')}

  ${styleText('gray', '# Quick scaffold with defaults')}
  ${styleText('cyan', 'npx create-xtarter-app@latest my-app -y')}

  ${styleText('gray', '# Full control')}
  ${styleText('cyan', 'npx create-xtarter-app@latest my-app -t vite-chakra -p pnpm --no-git')}
`

export const VERSION = '0.1.0'
