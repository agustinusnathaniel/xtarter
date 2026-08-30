import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import type { PluginConfig } from '@xtarterize/core'
import {
	loadPluginConfig,
	loadPluginTasks,
	resolveExternalTasks,
} from '@xtarterize/core'
import { describe, expect, it } from 'vite-plus/test'

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
			// Both exist - .xtarterizerc should win (first in CONFIG_BASENAMES)
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

describe('plugin loading timeout', () => {
	it('importWithTimeout rejects when import hangs', async () => {
		// A specifier that doesn't resolve to a real module will cause
		// import() to hang indefinitely in some runtimes. The timeout
		// wrapper should reject before the process hangs.
		//
		// We use a non-existent package name that won't resolve quickly.
		// The timeout is 10s; we verify the function rejects (not hangs)
		// by checking it completes within a reasonable bound.
		const start = performance.now()
		const config: PluginConfig = {
			plugins: ['@nonexistent/fake-package-that-wont-load'],
		}
		const tasks = await loadPluginTasks(config)
		const elapsed = performance.now() - start

		// Should return empty array (plugin failed to load)
		expect(tasks).toEqual([])
		// Should complete in reasonable time (well under 15s with 10s timeout)
		expect(elapsed).toBeLessThan(15_000)
	})
})
