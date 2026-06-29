import { expandQuery } from '@xtarterize/core'
import { describe, expect, it } from 'vite-plus/test'

describe('expandQuery', () => {
	it('expands lint to include related terms', () => {
		const result = expandQuery(['lint'])
		expect(result).toContain('lint')
		expect(result).toContain('linter')
		expect(result).toContain('static-analysis')
		expect(result).toContain('check')
		expect(result).toContain('quality')
	})

	it('expands vscode to include code and ide variants', () => {
		const result = expandQuery(['vscode'])
		expect(result).toContain('vscode')
		expect(result).toContain('code')
		expect(result).toContain('visual-studio-code')
		expect(result).toContain('cursor')
		expect(result).toContain('vscodium')
	})

	it('performs bidirectional lookups', () => {
		// 'code' is a synonym value for 'vscode', so reverse lookup adds 'vscode'
		const result = expandQuery(['code'])
		expect(result).toContain('code')
		expect(result).toContain('vscode')
		expect(result).toContain('visual-studio-code')
	})

	it('does not include duplicates', () => {
		const result = expandQuery(['lint', 'linter'])
		const unique = new Set(result)
		expect(result.length).toBe(unique.size)
	})

	it('expands ci to include pipeline and automation terms', () => {
		const result = expandQuery(['ci'])
		expect(result).toContain('ci')
		expect(result).toContain('continuous-integration')
		expect(result).toContain('pipeline')
		expect(result).toContain('build')
		expect(result).toContain('automation')
	})

	it('expands typescript to include ts, type, strict', () => {
		const result = expandQuery(['typescript'])
		expect(result).toContain('typescript')
		expect(result).toContain('ts')
		expect(result).toContain('type')
		expect(result).toContain('strict')
		expect(result).toContain('typecheck')
	})

	it('handles uppercase query terms', () => {
		const result = expandQuery(['LINT'])
		expect(result).toContain('lint')
		expect(result).toContain('linter')
		expect(result).toContain('static-analysis')
	})

	it('transitively expands reverse-lookup matches', () => {
		const result = expandQuery(['code'])
		expect(result).toContain('vscode')
		expect(result).toContain('editor')
	})

	it('returns original tokens when no synonyms are found', () => {
		const result = expandQuery(['unknownword'])
		expect(result).toEqual(['unknownword'])
	})

	it('returns empty array for empty input', () => {
		const result = expandQuery([])
		expect(result).toEqual([])
	})

	it('expands multiple tokens simultaneously', () => {
		const result = expandQuery(['lint', 'ci'])
		expect(result).toContain('lint')
		expect(result).toContain('linter')
		expect(result).toContain('ci')
		expect(result).toContain('pipeline')
	})
})
