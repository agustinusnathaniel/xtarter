import { lintToolScripts, resolveLintTool } from '@xtarterize/tasks'
import { describe, expect, it } from 'vite-plus/test'

describe('resolveLintTool', () => {
	it('returns null when eslint is present', () => {
		expect(
			resolveLintTool({
				existingEslint: true,
				useUltracite: false,
				hasBiomeDep: false,
				existingOxlint: false,
				existingOxfmt: false,
				vitePlus: false,
			}),
		).toBeNull()
	})

	it('returns ultracite when present', () => {
		expect(
			resolveLintTool({
				existingEslint: false,
				useUltracite: true,
				hasBiomeDep: false,
				existingOxlint: false,
				existingOxfmt: false,
				vitePlus: false,
			}),
		).toBe('ultracite')
	})

	it('returns biome when dep is present', () => {
		expect(
			resolveLintTool({
				existingEslint: false,
				useUltracite: false,
				hasBiomeDep: true,
				existingOxlint: false,
				existingOxfmt: false,
				vitePlus: false,
			}),
		).toBe('biome')
	})

	it('returns oxlint when oxlint config exists', () => {
		expect(
			resolveLintTool({
				existingEslint: false,
				useUltracite: false,
				hasBiomeDep: false,
				existingOxlint: true,
				existingOxfmt: false,
				vitePlus: false,
			}),
		).toBe('oxlint')
	})

	it('returns oxlint when oxfmt config exists', () => {
		expect(
			resolveLintTool({
				existingEslint: false,
				useUltracite: false,
				hasBiomeDep: false,
				existingOxlint: false,
				existingOxfmt: true,
				vitePlus: false,
			}),
		).toBe('oxlint')
	})

	it('returns vp when only vitePlus is true', () => {
		expect(
			resolveLintTool({
				existingEslint: false,
				useUltracite: false,
				hasBiomeDep: false,
				existingOxlint: false,
				existingOxfmt: false,
				vitePlus: true,
			}),
		).toBe('vp')
	})

	it('defaults to biome when nothing is configured', () => {
		expect(
			resolveLintTool({
				existingEslint: false,
				useUltracite: false,
				hasBiomeDep: false,
				existingOxlint: false,
				existingOxfmt: false,
				vitePlus: false,
			}),
		).toBe('biome')
	})

	it('ultracite takes priority over biome dep', () => {
		expect(
			resolveLintTool({
				existingEslint: false,
				useUltracite: true,
				hasBiomeDep: true,
				existingOxlint: false,
				existingOxfmt: false,
				vitePlus: false,
			}),
		).toBe('ultracite')
	})
})

describe('lintToolScripts', () => {
	it('returns empty array for null tool', () => {
		expect(lintToolScripts(null, '')).toEqual([])
	})

	it('returns ultracite scripts', () => {
		const scripts = lintToolScripts('ultracite', '')
		expect(scripts).toContainEqual({
			script: 'ultracite:check',
			value: 'ultracite check',
		})
		expect(scripts).toContainEqual({
			script: 'ultracite:fix',
			value: 'ultracite fix',
		})
	})

	it('returns biome scripts', () => {
		const scripts = lintToolScripts('biome', '')
		expect(scripts).toContainEqual({ script: 'biome', value: 'biome check .' })
		expect(scripts).toContainEqual({
			script: 'biome:fix',
			value: 'biome check --write .',
		})
	})

	it('returns oxlint scripts with plugins', () => {
		const scripts = lintToolScripts('oxlint', '--import-plugin --react-plugin')
		expect(scripts).toContainEqual({
			script: 'lint',
			value: 'oxlint --import-plugin --react-plugin',
		})
		expect(scripts).toContainEqual({
			script: 'check',
			value: 'oxlint --import-plugin --react-plugin && oxfmt --check',
		})
		expect(scripts).toContainEqual({
			script: 'fix',
			value: 'oxlint --fix --import-plugin --react-plugin && oxfmt',
		})
	})

	it('returns vp scripts', () => {
		const scripts = lintToolScripts('vp', '')
		expect(scripts).toContainEqual({ script: 'lint', value: 'vp lint' })
		expect(scripts).toContainEqual({ script: 'check', value: 'vp check' })
		expect(scripts).toContainEqual({ script: 'fix', value: 'vp check --fix' })
	})
})
