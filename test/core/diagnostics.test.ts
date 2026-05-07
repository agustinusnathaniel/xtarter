import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runConflictChecks, runToolInstallationChecks } from '@xtarterize/core'
import { describe, expect, it } from 'vite-plus/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixtures = path.resolve(__dirname, '../fixtures')

describe('runConflictChecks', () => {
	it('passes for clean project', async () => {
		const checks = await runConflictChecks(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		expect(checks.some((c) => c.status === 'pass')).toBe(true)
	})

	it('warns about legacy ESLint configs if present', async () => {
		// None of the fixtures have legacy ESLint configs
		const checks = await runConflictChecks(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const legacyWarnings = checks.filter((c) =>
			c.message.includes('Legacy ESLint config'),
		)
		expect(legacyWarnings).toHaveLength(0)
	})
})

describe('runToolInstallationChecks', () => {
	it('returns checks for tools in package.json', async () => {
		const checks = await runToolInstallationChecks(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		// TypeScript is in devDependencies
		const tsCheck = checks.find((c) => c.name.includes('TypeScript'))
		expect(tsCheck).toBeDefined()
	})
})
