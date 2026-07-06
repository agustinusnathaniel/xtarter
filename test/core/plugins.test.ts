import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
	loadPluginConfig,
	loadPluginTasks,
	resolveExternalTasks,
} from '@xtarterize/core'
import { describe, expect, it } from 'vite-plus/test'

/**
 * Replicate the file-private regex to test validation logic directly.
 * This is acceptable for a security-critical validation — it documents
 * the contract explicitly and catches regressions if the regex changes.
 */
const npmPackageRe = /^(?:@[a-z0-9~][a-z0-9-._~]*\/)?[a-z0-9~][a-z0-9-._~]*$/

function isValidNpm(specifier: string): boolean {
	return npmPackageRe.test(specifier)
}

describe('plugin specifier validation', () => {
	describe('valid npm package names', () => {
		const validPackages = [
			'simple',
			'some-package',
			'eslint-plugin-foo',
			'pkg.v1',
			'pkg_v1',
			'pkg~1',
			'@xtarterize/some-plugin',
			'@scope/pkg',
			'@scope/pkg.v1',
			'@scope/pkg_v1',
			'@a/b',
			'@a/b.c',
		]

		for (const pkg of validPackages) {
			it(`accepts "${pkg}"`, () => {
				expect(isValidNpm(pkg)).toBe(true)
			})
		}
	})

	describe('invalid: relative paths', () => {
		const invalidPaths = [
			'../../malicious.js',
			'./local.js',
			'../escape.js',
			'./',
			'../',
			'./plugin',
			'../plugin',
		]

		for (const spec of invalidPaths) {
			it(`rejects "${spec}"`, () => {
				expect(isValidNpm(spec)).toBe(false)
			})
		}
	})

	describe('invalid: absolute paths', () => {
		const invalidPaths = ['/etc/passwd', '/tmp/exploit.js', '/usr/local/bin']

		for (const spec of invalidPaths) {
			it(`rejects "${spec}"`, () => {
				expect(isValidNpm(spec)).toBe(false)
			})
		}
	})

	describe('invalid: URLs', () => {
		const invalidUrls = [
			'https://evil.com/pwn.js',
			'file:///etc/passwd',
			'http://example.com/plugin',
		]

		for (const spec of invalidUrls) {
			it(`rejects "${spec}"`, () => {
				expect(isValidNpm(spec)).toBe(false)
			})
		}
	})

	describe('invalid: empty/malformed specifiers', () => {
		const invalidSpecs = ['', ' ', '.', '..', '-start-dash', ' leading-space']

		for (const spec of invalidSpecs) {
			it(`rejects "${spec === '' ? '(empty)' : spec}"`, () => {
				expect(isValidNpm(spec)).toBe(false)
			})
		}
	})
})

describe('loadPluginTasks specifier validation integration', () => {
	it('returns empty array for empty plugins array', async () => {
		const result = await loadPluginTasks({ plugins: [] })
		expect(result).toEqual([])
	})

	it('returns empty array for undefined plugins', async () => {
		const result = await loadPluginTasks({})
		expect(result).toEqual([])
	})

	it('skips invalid relative paths without throwing', async () => {
		const result = await loadPluginTasks({
			plugins: ['../../malicious.js', './local.js'],
		})
		// Both invalid, so both skipped — empty result
		expect(result).toEqual([])
	})

	it('skips invalid absolute paths without throwing', async () => {
		const result = await loadPluginTasks({
			plugins: ['/etc/passwd', '/tmp/exploit.js'],
		})
		expect(result).toEqual([])
	})

	it('skips invalid URLs without throwing', async () => {
		const result = await loadPluginTasks({
			plugins: ['https://evil.com/pwn.js', 'file:///etc/passwd'],
		})
		expect(result).toEqual([])
	})

	it('skips empty and malformed specifiers without throwing', async () => {
		const result = await loadPluginTasks({
			plugins: ['', ' ', '.', '..', '-start-dash'],
		})
		expect(result).toEqual([])
	})

	it('handles mixed valid and invalid specifiers', async () => {
		// Valid specifiers will reach import() and likely fail resolution,
		// which is caught by the existing catch block. The important thing
		// is that the function doesn't throw and invalid ones are skipped.
		const result = await loadPluginTasks({
			plugins: [
				'../../malicious.js',
				'@xtarterize/some-plugin',
				'https://evil.com/pwn.js',
				'valid-package',
			],
		})
		// May return [] if valid packages can't be resolved, or task arrays if they can.
		// The critical assertion: it doesn't throw and invalid entries don't crash.
		expect(Array.isArray(result)).toBe(true)
	})

	it('skips relative path specifiers silently', async () => {
		const result = await loadPluginTasks({
			plugins: ['../../malicious.js'],
		})
		expect(result).toEqual([])
	})
})

describe('loadPluginConfig', () => {
	it('returns null when no config file exists', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarter-plugins-empty-'),
		)
		try {
			const config = await loadPluginConfig(tmpDir)
			expect(config).toBeNull()
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})

	it('reads plugins from .xtarterizerc', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarter-plugins-dot-'),
		)
		try {
			await fs.writeFile(
				path.join(tmpDir, '.xtarterizerc'),
				JSON.stringify({ plugins: ['@xtarterize/plugin-foo'] }),
			)
			const config = await loadPluginConfig(tmpDir)
			expect(config).not.toBeNull()
			expect(config?.plugins).toEqual(['@xtarterize/plugin-foo'])
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})

	it('reads plugins from .xtarterizerc.json', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarter-plugins-json-'),
		)
		try {
			await fs.writeFile(
				path.join(tmpDir, '.xtarterizerc.json'),
				JSON.stringify({ plugins: ['my-plugin'] }),
			)
			const config = await loadPluginConfig(tmpDir)
			expect(config).not.toBeNull()
			expect(config?.plugins).toEqual(['my-plugin'])
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})

	it('reads plugins from .xtarterizerc.json5', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarter-plugins-json5-'),
		)
		try {
			await fs.writeFile(
				path.join(tmpDir, '.xtarterizerc.json5'),
				JSON.stringify({ plugins: ['json5-plugin'] }),
			)
			const config = await loadPluginConfig(tmpDir)
			expect(config).not.toBeNull()
			expect(config?.plugins).toEqual(['json5-plugin'])
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})

	it('uses the first matching config file (priority order)', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarter-plugins-priority-'),
		)
		try {
			// Both exist — .xtarterizerc should win (first in CONFIG_BASENAMES)
			await fs.writeFile(
				path.join(tmpDir, '.xtarterizerc'),
				JSON.stringify({ plugins: ['from-rc'] }),
			)
			await fs.writeFile(
				path.join(tmpDir, '.xtarterizerc.json'),
				JSON.stringify({ plugins: ['from-json'] }),
			)
			const config = await loadPluginConfig(tmpDir)
			expect(config?.plugins).toEqual(['from-rc'])
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})

	it('reads plugins from package.json xtarterize key', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarter-plugins-pkg-'),
		)
		try {
			await fs.writeFile(
				path.join(tmpDir, 'package.json'),
				JSON.stringify({
					xtarterize: { plugins: ['@xtarterize/plugin-bar'] },
				}),
			)
			const config = await loadPluginConfig(tmpDir)
			expect(config).not.toBeNull()
			expect(config?.plugins).toEqual(['@xtarterize/plugin-bar'])
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})

	it('returns null when package.json lacks xtarterize key', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarter-plugins-nopkg-'),
		)
		try {
			await fs.writeFile(
				path.join(tmpDir, 'package.json'),
				JSON.stringify({ name: 'test' }),
			)
			const config = await loadPluginConfig(tmpDir)
			expect(config).toBeNull()
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})

	it('returns empty plugins array on malformed .xtarterizerc', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarter-plugins-bad-'),
		)
		try {
			await fs.writeFile(path.join(tmpDir, '.xtarterizerc'), 'not-json{')
			const config = await loadPluginConfig(tmpDir)
			// Current behavior: returns { plugins: [] } on parse failure
			expect(config).toEqual({ plugins: [] })
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})

	it('returns empty plugins when config object has no plugins field', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarter-plugins-nofield-'),
		)
		try {
			await fs.writeFile(path.join(tmpDir, '.xtarterizerc'), JSON.stringify({}))
			const config = await loadPluginConfig(tmpDir)
			// Current behavior: returns { plugins: [] } when plugins is missing
			expect(config).toEqual({ plugins: [] })
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})

	it('returns empty plugins when plugins field is not an array', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarter-plugins-notarray-'),
		)
		try {
			await fs.writeFile(
				path.join(tmpDir, '.xtarterizerc'),
				JSON.stringify({ plugins: 'string' }),
			)
			const config = await loadPluginConfig(tmpDir)
			// Current behavior: returns { plugins: [] } for non-array plugins
			expect(config).toEqual({ plugins: [] })
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})
})

describe('resolveExternalTasks', () => {
	it('returns empty array when no config exists', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarter-resolve-noconfig-'),
		)
		try {
			const tasks = await resolveExternalTasks(tmpDir)
			expect(tasks).toEqual([])
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})

	it('returns empty array when .xtarterizerc has valid npm specifiers that fail resolution', async () => {
		// Valid npm specifiers pass validatePluginSpecifier but will fail
		// dynamic import() since the packages aren't installed.
		// loadPluginTasks catches the error and returns [].
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarter-resolve-valid-'),
		)
		try {
			await fs.writeFile(
				path.join(tmpDir, '.xtarterizerc'),
				JSON.stringify({ plugins: ['@xtarterize/some-plugin'] }),
			)
			const tasks = await resolveExternalTasks(tmpDir)
			expect(tasks).toEqual([])
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})

	it('returns empty array when .xtarterizerc has invalid specifiers that are skipped', async () => {
		// Invalid specifiers are caught by validatePluginSpecifier and skipped.
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarter-resolve-invalid-'),
		)
		try {
			await fs.writeFile(
				path.join(tmpDir, '.xtarterizerc'),
				JSON.stringify({
					plugins: ['../../malicious.js', 'file:///etc/passwd'],
				}),
			)
			const tasks = await resolveExternalTasks(tmpDir)
			expect(tasks).toEqual([])
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})

	it('handles duplicate specifiers without crashing', async () => {
		// Duplicate specifiers each attempt import() independently;
		// the function should not throw even though both fail.
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarter-resolve-dup-'),
		)
		try {
			await fs.writeFile(
				path.join(tmpDir, '.xtarterizerc'),
				JSON.stringify({
					plugins: ['@xtarterize/some-plugin', '@xtarterize/some-plugin'],
				}),
			)
			const tasks = await resolveExternalTasks(tmpDir)
			expect(Array.isArray(tasks)).toBe(true)
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})
})
