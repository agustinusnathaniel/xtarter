import { mergeJson } from '@xtarterize/patchers'
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
