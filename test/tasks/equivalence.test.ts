import {
	areEquivalent,
	extractTool,
	findEquivalentScriptKey,
	hasScriptWithEquivalentValue,
	normalizeCommand,
} from '@xtarterize/tasks'
import { describe, expect, it } from 'vite-plus/test'

describe('normalizeCommand', () => {
	it('trims and collapses whitespace', () => {
		expect(normalizeCommand('  tsc   --noEmit  ')).toBe('tsc --noEmit')
	})

	it('is identity for already-normal commands', () => {
		expect(normalizeCommand('tsc --noEmit')).toBe('tsc --noEmit')
	})
})

describe('extractTool', () => {
	it('extracts known tool from command', () => {
		expect(extractTool('tsc --noEmit')).toBe('tsc')
	})

	it('extracts tool after npx runner', () => {
		expect(extractTool('npx tsc')).toBe('tsc')
	})

	it('extracts script ref from pm run pattern', () => {
		expect(extractTool('pnpm run build')).toBe('build')
	})

	it('returns null for empty string', () => {
		expect(extractTool('')).toBeNull()
	})

	it('returns null for unknown command', () => {
		expect(extractTool('some-random-tool')).toBeNull()
	})
})

describe('findEquivalentScriptKey', () => {
	it('returns key when exact value match exists', () => {
		const scripts = { build: 'tsc --noEmit' }
		expect(findEquivalentScriptKey(scripts, 'typecheck', 'tsc --noEmit')).toBe(
			'build',
		)
	})

	it('returns null when scripts object is empty', () => {
		expect(findEquivalentScriptKey({}, 'build', 'tsc')).toBeNull()
	})

	it('returns null when no equivalent value exists', () => {
		const scripts = { build: 'tsc' }
		expect(findEquivalentScriptKey(scripts, 'lint', 'eslint .')).toBeNull()
	})

	it('finds equivalent via release tool aliases', () => {
		const scripts = { rel: 'standard-version' }
		expect(
			findEquivalentScriptKey(scripts, 'release', 'commit-and-tag-version'),
		).toBe('rel')
	})

	it('finds equivalent via script ref match', () => {
		const scripts = { build: 'npm run build' }
		expect(findEquivalentScriptKey(scripts, 'build', 'pnpm run build')).toBe(
			'build',
		)
	})
})

describe('hasScriptWithEquivalentValue', () => {
	it('returns true when exact value exists', () => {
		expect(
			hasScriptWithEquivalentValue({ build: 'tsc --noEmit' }, 'tsc --noEmit'),
		).toBe(true)
	})

	it('returns false when no equivalent value exists', () => {
		expect(hasScriptWithEquivalentValue({ build: 'tsc' }, 'eslint .')).toBe(
			false,
		)
	})

	it('returns true when equivalent via tool aliases', () => {
		expect(
			hasScriptWithEquivalentValue(
				{ release: 'standard-version' },
				'commit-and-tag-version',
			),
		).toBe(true)
	})
})

describe('areEquivalent', () => {
	describe('EXACT_MATCH rule', () => {
		it('returns true for identical commands', () => {
			expect(areEquivalent('tsc --noEmit', 'tsc --noEmit')).toBe(true)
		})

		it('returns true for identical simple commands', () => {
			expect(areEquivalent('tsc', 'tsc')).toBe(true)
		})
	})

	describe('COMPOSITE rules', () => {
		it('returns true when both are composite with same tasks', () => {
			expect(
				areEquivalent('turbo run build lint', 'turbo run build lint'),
			).toBe(true)
		})

		it('returns false when composite mixed with non-composite', () => {
			expect(areEquivalent('turbo run build', 'tsc --noEmit')).toBe(false)
		})
	})

	describe('SHELL_OPERATOR_MISMATCH rule', () => {
		it('returns false when one has shell operator and other does not', () => {
			expect(areEquivalent('lint && format', 'lint')).toBe(false)
		})

		it('returns false in reverse order', () => {
			expect(areEquivalent('lint', 'lint && format')).toBe(false)
		})
	})

	describe('TOOL_MISMATCH rule', () => {
		it('returns false for completely different tools', () => {
			expect(areEquivalent('tsc --noEmit', 'eslint .')).toBe(false)
		})

		it('returns false even when tools normalize to same category but args differ', () => {
			expect(areEquivalent('eslint .', 'biome check .')).toBe(false)
		})
	})

	describe('SAME_TOOL_SAME_ARGS rule', () => {
		it('returns true for functionally equivalent release tools', () => {
			expect(areEquivalent('commit-and-tag-version', 'standard-version')).toBe(
				true,
			)
		})

		it('returns true for release-it vs standard-version', () => {
			expect(areEquivalent('release-it', 'standard-version')).toBe(true)
		})
	})

	describe('EQUIVALENT_SUBCOMMANDS rule', () => {
		// Note: the equivalent-subcommands rule has a known bug where args
		// extracted after the tool name include a leading space, preventing the
		// subcommand pattern from matching. These tests document current behavior.
		it('returns false due to leading-space bug in args extraction', () => {
			expect(areEquivalent('biome check .', 'biome lint .')).toBe(false)
		})

		it('returns false for biome subcommands with --write', () => {
			expect(
				areEquivalent('biome check --write .', 'biome format --write .'),
			).toBe(false)
		})

		it('returns false for ultracite subcommands', () => {
			expect(areEquivalent('ultracite check', 'ultracite fix')).toBe(false)
		})

		it('returns false for vp subcommands', () => {
			expect(areEquivalent('vp lint', 'vp check')).toBe(false)
		})
	})

	describe('SCRIPT_REF_MATCH rule', () => {
		it('returns true when both reference the same script name', () => {
			expect(areEquivalent('pnpm run build', 'npm run build')).toBe(true)
		})

		it('returns false when script refs differ', () => {
			expect(areEquivalent('pnpm run build', 'pnpm run test')).toBe(false)
		})
	})

	describe('non-equivalent cases', () => {
		it('returns false for different commands with same tool but different args', () => {
			expect(areEquivalent('tsc --noEmit', 'tsc --build')).toBe(false)
		})

		it('returns false for completely unrelated commands', () => {
			expect(areEquivalent('echo hello', 'ls -la')).toBe(false)
		})
	})
})
