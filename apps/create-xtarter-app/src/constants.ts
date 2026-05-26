import { version } from '^/package.json'
import { pc } from '@xtarterize/core'

export const APP_NAME: string = pc.cyan('create-xtarter-app')

const BOX = 44

export const BANNER: string = `
${pc.cyan(`╔${'═'.repeat(BOX)}╗`)}
${pc.cyan(`║${' '.repeat(BOX)}║`)}
${pc.cyan(`║${' '.repeat(13)}`)}${pc.bold('create-xtarter-app')}${pc.cyan(`${' '.repeat(13)}║`)}
${pc.cyan(`║${' '.repeat(BOX)}║`)}
${pc.cyan(`║${' '.repeat(10)}`)}${pc.dim('Fast project scaffolding')}${pc.cyan(`${' '.repeat(10)}║`)}
${pc.cyan(`║${' '.repeat(12)}`)}${pc.dim('for modern web apps')}${pc.cyan(`${' '.repeat(13)}║`)}
${pc.cyan(`║${' '.repeat(BOX)}║`)}
${pc.cyan(`╚${'═'.repeat(BOX)}╝`)}
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
${pc.bold('Usage:')}
  ${pc.cyan('npx create-xtarter-app@latest')} [project-name] [options]

${pc.bold('Options:')}
  ${pc.cyan('--template, -t')} <name>     Template to use (skips prompt)
  ${pc.cyan('--pm, -p')} <manager>        Package manager (pnpm|npm|bun|yarn)
  ${pc.cyan('--no-git')}                  Skip git initialization
  ${pc.cyan('--clean')}                   Remove CI/CD configs after scaffold
  ${pc.cyan('--force, -f')}               Overwrite existing directory
  ${pc.cyan('--ref')} <ref>               Git ref (branch/tag/commit) to download
  ${pc.cyan('--yes, -y')}                 Use defaults (pnpm, git init, no clean)
  ${pc.cyan('--help, -h')}                Show this help message
  ${pc.cyan('--version, -v')}             Show version number

${pc.bold('Subcommands:')}
  ${pc.cyan('preview')} [template]        Preview template details

${pc.bold('Examples:')}
  ${pc.dim('# Preview a template')}
  ${pc.cyan('npx create-xtarter-app@latest preview vite-tailwind')}

  ${pc.dim('# Interactive mode')}
  ${pc.cyan('npx create-xtarter-app@latest')}

  ${pc.dim('# Quick scaffold with defaults')}
  ${pc.cyan('npx create-xtarter-app@latest my-app -y')}

  ${pc.dim('# Full control')}
  ${pc.cyan('npx create-xtarter-app@latest my-app -t vite-chakra -p pnpm --no-git')}
`

export const VERSION: string = version
