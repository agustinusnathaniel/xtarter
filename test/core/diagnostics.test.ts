import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
	runConflictChecks,
	runEnvironmentChecks,
	runProjectHealthChecks,
	runToolInstallationChecks,
} from '@xtarterize/core'
import { describe, expect, it } from 'vite-plus/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixtures = path.resolve(__dirname, '../fixtures')

describe('runEnvironmentChecks', () => {
	it('returns Node.js and Git checks', async () => {
		const checks = await runEnvironmentChecks(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const nodeCheck = checks.find((c) => c.name === 'Node.js')
		const gitCheck = checks.find((c) => c.name === 'Git')

		expect(nodeCheck).toBeDefined()
		expect(nodeCheck?.message).toContain('Node.js')
		expect(gitCheck).toBeDefined()
	})
})

describe('runProjectHealthChecks', () => {
	it('returns project structure checks', async () => {
		const checks = await runProjectHealthChecks(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		expect(checks.length).toBeGreaterThan(0)

		const lockfileCheck = checks.find((c) => c.name === 'Lockfile')
		expect(lockfileCheck).toBeDefined()

		// TypeScript is in fixture deps
		const tsCheck = checks.find((c) => c.name === 'TypeScript config')
		expect(tsCheck).toBeDefined()
	})

	it('returns fewer checks for minimal project', async () => {
		const checks = await runProjectHealthChecks(
			path.join(fixtures, 'node-only'),
		)
		expect(checks.length).toBeGreaterThan(0)
	})
})

describe('runConflictChecks', () => {
	it('passes for clean project', async () => {
		const checks = await runConflictChecks(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		expect(checks.some((c) => c.status === 'pass')).toBe(true)
	})

	it('warns about legacy ESLint configs if present', async () => {
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
