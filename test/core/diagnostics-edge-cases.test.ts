import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { runConflictChecks, runEnvironmentChecks } from '@xtarterize/core'
import { describe, expect, it } from 'vite-plus/test'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Mirrors the version-parsing logic from `runEnvironmentChecks` in
 * `packages/core/src/diagnostics.ts`.  Uses the first numeric segment of the
 * engine range (handles ranges like ">=16 <20", prerelease versions, spaces).
 */
function parseEngineMajor(engineNode: string | undefined): number {
	if (!engineNode) return NaN
	const majorMatch = engineNode.match(/(\d+)/)
	return majorMatch ? Number.parseInt(majorMatch[1], 10) : NaN
}

function createPkg(
	dir: string,
	content: Record<string, unknown>,
): Promise<void> {
	return fs.writeFile(path.join(dir, 'package.json'), JSON.stringify(content))
}

/**
 * Build a temporary project with the given dependencies/devDependencies for
 * conflict-detection tests.  Returns the temp directory path.
 */
async function tmpProject(
	deps: Record<string, string> = {},
	devDeps: Record<string, string> = {},
): Promise<string> {
	const tmpDir = await fs.mkdtemp(
		path.join(os.tmpdir(), 'xtarterize-conflict-'),
	)
	await createPkg(tmpDir, {
		name: 'test',
		version: '1.0.0',
		dependencies: deps,
		devDependencies: devDeps,
	})
	return tmpDir
}

// ---------------------------------------------------------------------------
// Group 1 – Engine version parsing edge cases
// ---------------------------------------------------------------------------

// NOTE: If the parsing logic in diagnostics.ts changes, update the helper
// above AND keep these tests verifying the first-number strategy.

describe('engine version parsing', () => {
	it('parses ">=24" to 24', () => {
		expect(parseEngineMajor('>=24')).toBe(24)
	})

	it('parses "^24.0.0" to 24', () => {
		expect(parseEngineMajor('^24.0.0')).toBe(24)
	})

	it('parses ">=20.18.0" to 20', () => {
		expect(parseEngineMajor('>=20.18.0')).toBe(20)
	})

	it('parses ">=16 <20" to 16 (first numeric segment)', () => {
		expect(parseEngineMajor('>=16 <20')).toBe(16)
	})

	it('parses "^20.0.0-rc" to 20 (prerelease)', () => {
		expect(parseEngineMajor('^20.0.0-rc')).toBe(20)
	})

	it('parses ">= 18" to 18 (space after operator)', () => {
		expect(parseEngineMajor('>= 18')).toBe(18)
	})

	it('returns NaN for undefined / missing engines.node', () => {
		expect(parseEngineMajor(undefined)).toBeNaN()
	})
})

describe('runEnvironmentChecks with engine edge cases', () => {
	const currentMajor = Number.parseInt(
		process.version.slice(1).split('.')[0],
		10,
	)

	it('handles missing engines.node without error', async () => {
		const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-diag-'))
		await createPkg(tmpDir, { name: 'test', version: '1.0.0' })
		try {
			const checks = await runEnvironmentChecks(tmpDir)
			const nodeCheck = checks.find((c) => c.name === 'Node.js')
			expect(nodeCheck).toBeDefined()
			// no engine constraint → always pass
			expect(nodeCheck?.status).toBe('pass')
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})

	it('correctly handles ">=16 <20" range', async () => {
		const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-diag-'))
		await createPkg(tmpDir, {
			name: 'test',
			version: '1.0.0',
			engines: { node: '>=16 <20' },
		})
		try {
			const checks = await runEnvironmentChecks(tmpDir)
			const nodeCheck = checks.find((c) => c.name === 'Node.js')
			expect(nodeCheck).toBeDefined()
			// engineMajor should be 16 (first numeric segment), not NaN
			expect(nodeCheck?.status).toBe(currentMajor >= 16 ? 'pass' : 'warn')
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})

	it('handles "^20.0.0-rc" prerelease range', async () => {
		const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-diag-'))
		await createPkg(tmpDir, {
			name: 'test',
			version: '1.0.0',
			engines: { node: '^20.0.0-rc' },
		})
		try {
			const checks = await runEnvironmentChecks(tmpDir)
			const nodeCheck = checks.find((c) => c.name === 'Node.js')
			expect(nodeCheck).toBeDefined()
			// engineMajor should be 20 (not NaN from "-rc")
			expect(nodeCheck?.status).toBe(currentMajor >= 20 ? 'pass' : 'warn')
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})
})

// ---------------------------------------------------------------------------
// Group 2 – Conflict detection edge cases
// ---------------------------------------------------------------------------

describe('runConflictChecks edge cases', () => {
	it('warns when both Biome and ESLint are present', async () => {
		const tmpDir = await tmpProject(
			{},
			{ '@biomejs/biome': '^1.0.0', eslint: '^8.0.0' },
		)
		try {
			const checks = await runConflictChecks(tmpDir)
			const biomeslint = checks.filter((c) =>
				c.message.includes('Biome and ESLint'),
			)
			expect(biomeslint).toHaveLength(1)
			expect(biomeslint[0].status).toBe('warn')
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})

	it('warns when both Biome and Prettier are present', async () => {
		const tmpDir = await tmpProject(
			{},
			{ '@biomejs/biome': '^1.0.0', prettier: '^3.0.0' },
		)
		try {
			const checks = await runConflictChecks(tmpDir)
			const biomePret = checks.filter((c) =>
				c.message.includes('Biome and Prettier'),
			)
			expect(biomePret).toHaveLength(1)
			expect(biomePret[0].status).toBe('warn')
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})

	it('passes when only Biome is present (no conflict)', async () => {
		const tmpDir = await tmpProject({}, { '@biomejs/biome': '^1.0.0' })
		try {
			const checks = await runConflictChecks(tmpDir)
			const passCheck = checks.find((c) => c.status === 'pass')
			expect(passCheck).toBeDefined()
			expect(checks.filter((c) => c.status === 'warn')).toHaveLength(0)
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})

	it('passes when none of Biome, ESLint, Prettier are present', async () => {
		const tmpDir = await tmpProject({}, { typescript: '^5.0.0' })
		try {
			const checks = await runConflictChecks(tmpDir)
			const passCheck = checks.find((c) => c.status === 'pass')
			expect(passCheck).toBeDefined()
			expect(checks.filter((c) => c.status === 'warn')).toHaveLength(0)
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})

	it('produces 2 warnings when Biome + ESLint + Prettier are all present', async () => {
		const tmpDir = await tmpProject(
			{},
			{
				'@biomejs/biome': '^1.0.0',
				eslint: '^8.0.0',
				prettier: '^3.0.0',
			},
		)
		try {
			const checks = await runConflictChecks(tmpDir)
			const warnings = checks.filter((c) => c.status === 'warn')
			expect(warnings).toHaveLength(2)
			expect(warnings.some((c) => c.message.includes('Biome and ESLint'))).toBe(
				true,
			)
			expect(
				warnings.some((c) => c.message.includes('Biome and Prettier')),
			).toBe(true)
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})
})

// ---------------------------------------------------------------------------
// Group 3 – runTool failure modes (skipped – runTool is not exported)
// ---------------------------------------------------------------------------

// runTool is an internal function in diagnostics.ts and is not re-exported
// from @xtarterize/core.  Testing its failure modes would require either
// refactoring (extracting it) or mocking the filesystem – both out of scope
// for this test file.
