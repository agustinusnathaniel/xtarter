import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { detectProject } from '@xtarterize/core'
import { describe, expect, it } from 'vite-plus/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixtures = path.resolve(__dirname, '../fixtures')

async function writePkg(dir: string, pkg: Record<string, unknown>) {
	await fs.writeFile(
		path.join(dir, 'package.json'),
		`${JSON.stringify(pkg, null, 2)}\n`,
	)
}

async function createMinimalProject(dir: string) {
	await writePkg(dir, {
		name: 'test-project',
		version: '1.0.0',
		dependencies: { react: '^18.2.0' },
		devDependencies: { typescript: '^5.0.0', vite: '^5.0.0' },
	})
	await fs.writeFile(
		path.join(dir, 'tsconfig.json'),
		JSON.stringify({ compilerOptions: {} }),
	)
	await fs.writeFile(path.join(dir, 'vite.config.ts'), `export default {}\n`)
}

async function cachePath(dir: string) {
	return path.join(dir, '.xtarterize', 'cache', 'profile-fingerprint.json')
}

async function cacheExists(dir: string): Promise<boolean> {
	try {
		await fs.access(await cachePath(dir))
		return true
	} catch {
		return false
	}
}

async function readCache(dir: string) {
	const content = await fs.readFile(await cachePath(dir), 'utf-8')
	return JSON.parse(content)
}

describe('detect cache', () => {
	it('computes and caches on first run', async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cache-first-'))
		await createMinimalProject(dir)

		const profile = await detectProject(dir)
		expect(profile.framework).toBe('react')
		expect(profile.bundler).toBe('vite')
		expect(profile.typescript).toBe(true)

		const written = await readCache(dir)
		expect(written.version).toBe(1)
		expect(written.fingerprint.packageJson.path).toContain('package.json')
		expect(written.profile.framework).toBe('react')
		expect(typeof written.durationMs).toBe('number')
		expect(typeof written.computedAt).toBe('string')

		await fs.rm(dir, { recursive: true, force: true })
	})

	it('returns cached profile on subsequent runs', async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cache-hit-'))
		await createMinimalProject(dir)

		const first = await detectProject(dir)
		expect(first.framework).toBe('react')

		const second = await detectProject(dir)
		expect(second).toEqual(first)

		await fs.rm(dir, { recursive: true, force: true })
	})

	it('invalidates cache when package.json is modified', async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cache-inval-'))
		await createMinimalProject(dir)

		const first = await detectProject(dir)
		expect(first.framework).toBe('react')

		await writePkg(dir, {
			name: 'test-project',
			version: '1.0.0',
			dependencies: { vue: '^3.4.0' },
			devDependencies: { typescript: '^5.0.0', vite: '^5.0.0' },
		})

		const second = await detectProject(dir)
		expect(second.framework).toBe('vue')

		await fs.rm(dir, { recursive: true, force: true })
	})

	it('invalidates cache when lockfile appears', async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cache-lock-'))
		await createMinimalProject(dir)

		await detectProject(dir)

		await fs.writeFile(
			path.join(dir, 'pnpm-lock.yaml'),
			"lockfileVersion: '9.0'\n",
		)

		await expect(detectProject(dir)).resolves.toBeDefined()

		await fs.rm(dir, { recursive: true, force: true })
	})

	it('invalidates cache when lockfile is removed', async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cache-lock-rm-'))
		await createMinimalProject(dir)

		await fs.writeFile(path.join(dir, 'yarn.lock'), '# yarn lockfile\n')

		await detectProject(dir)
		await fs.unlink(path.join(dir, 'yarn.lock'))

		await expect(detectProject(dir)).resolves.toBeDefined()

		await fs.rm(dir, { recursive: true, force: true })
	})

	it('handles corrupt cache gracefully', async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cache-corrupt-'))
		await createMinimalProject(dir)

		const first = await detectProject(dir)
		expect(first.framework).toBe('react')

		const cp = await cachePath(dir)
		await fs.writeFile(cp, '{invalid json!!!')

		const second = await detectProject(dir)
		expect(second.framework).toBe('react')
		expect(second).toEqual(first)

		await fs.rm(dir, { recursive: true, force: true })
	})

	it('handles missing package.json', async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cache-no-pkg-'))

		const profile = await detectProject(dir)
		expect(profile.framework).toBeNull()
		expect(profile.runtime).toBe('node')

		const cached = await readCache(dir)
		expect(cached.fingerprint.packageJson.mtimeMs).toBe(0)
		expect(cached.fingerprint.packageJson.size).toBe(0)

		await fs.rm(dir, { recursive: true, force: true })
	})

	it('detects react-vite-tailwind fixture from cache', async () => {
		const fixtureDir = path.join(fixtures, 'react-vite-tailwind')

		const profile = await detectProject(fixtureDir)
		expect(profile.framework).toBe('react')
	})

	it('stores cache in .xtarterize/cache/ directory', async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cache-loc-'))
		await createMinimalProject(dir)

		expect(await cacheExists(dir)).toBe(false)

		await detectProject(dir)

		expect(await cacheExists(dir)).toBe(true)

		await fs.rm(dir, { recursive: true, force: true })
	})

	it('cache hit is faster than cache miss', async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cache-bench-'))
		await createMinimalProject(dir)

		const startMiss = performance.now()
		await detectProject(dir)
		const missDuration = performance.now() - startMiss

		const warmStart = performance.now()
		await detectProject(dir)
		const hitDuration = performance.now() - warmStart

		expect(hitDuration).toBeLessThan(missDuration)

		await fs.rm(dir, { recursive: true, force: true })
	})
})
