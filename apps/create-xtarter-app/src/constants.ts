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

export const VERSION: string = version
