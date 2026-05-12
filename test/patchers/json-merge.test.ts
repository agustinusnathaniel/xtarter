import { mergeJson, patchJson } from '@xtarterize/patchers'
import { describe, expect, it } from 'vite-plus/test'

describe('mergeJson', () => {
	it('fills missing keys from incoming', () => {
		const existing = { compilerOptions: { strict: true } }
		const incoming = { compilerOptions: { incremental: true } }
		const result = mergeJson(existing, incoming) as {
			compilerOptions: { strict: boolean; incremental: boolean }
		}
		expect(result.compilerOptions.strict).toBe(true)
		expect(result.compilerOptions.incremental).toBe(true)
	})

	it('preserves existing keys over incoming', () => {
		const existing = { target: 'ES2020' }
		const incoming = { target: 'ES2022' }
		const result = mergeJson(existing, incoming) as { target: string }
		expect(result.target).toBe('ES2020')
	})

	it('handles nested objects', () => {
		const existing = { a: { b: { c: 1, d: 2 } } }
		const incoming = { a: { b: { e: 3 } } }
		const result = mergeJson(existing, incoming) as {
			a: { b: { c: number; d: number; e: number } }
		}
		expect(result.a.b.c).toBe(1)
		expect(result.a.b.d).toBe(2)
		expect(result.a.b.e).toBe(3)
	})
})

describe('patchJson', () => {
	it('adds a new key', () => {
		const result = patchJson('{\n  "a": 1\n}', { b: 2 })
		const parsed = JSON.parse(result)
		expect(parsed.a).toBe(1)
		expect(parsed.b).toBe(2)
	})

	it('returns original text when no changes needed', () => {
		const text = '{\n  "a": 1\n}'
		const result = patchJson(text, { a: 1 })
		expect(result).toBe(text)
	})

	it('modifies an existing key', () => {
		const result = patchJson('{\n  "a": 1\n}', { a: 2 })
		const parsed = JSON.parse(result)
		expect(parsed.a).toBe(2)
	})

	it('handles nested keys', () => {
		const result = patchJson('{\n  "scripts": {\n    "test": "jest"\n  }\n}', {
			scripts: { build: 'tsc' },
		})
		const parsed = JSON.parse(result)
		expect(parsed.scripts.test).toBe('jest')
		expect(parsed.scripts.build).toBe('tsc')
	})
})
