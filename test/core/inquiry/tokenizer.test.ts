import { tokenize } from '@xtarterize/core'
import { describe, expect, it } from 'vite-plus/test'

describe('tokenize', () => {
	it('tokenizes a simple query', () => {
		const result = tokenize('strict typescript')
		expect(result.tokens).toEqual(['strict', 'typescript'])
		expect(result.original).toBe('strict typescript')
	})

	it('removes stopwords', () => {
		const result = tokenize('i want a strict typescript setup')
		expect(result.tokens).toEqual(['strict', 'typescript'])
	})

	it('filters out short words (shorter than 2 chars)', () => {
		const result = tokenize('a b strict')
		expect(result.tokens).toEqual(['strict'])
	})

	it('returns empty tokens for empty query', () => {
		const result = tokenize('')
		expect(result.tokens).toEqual([])
		expect(result.original).toBe('')
	})

	it('returns empty tokens for query with only whitespace', () => {
		const result = tokenize('   ')
		expect(result.tokens).toEqual([])
	})

	it('returns empty tokens for query with only stopwords', () => {
		const result = tokenize('a an the')
		expect(result.tokens).toEqual([])
	})

	it('handles special characters', () => {
		const result = tokenize('strict typescript!!!')
		expect(result.tokens).toContain('strict')
		expect(result.tokens).toContain('typescript')
	})

	it('preserves hyphenated terms', () => {
		const result = tokenize('static-analysis tool')
		expect(result.tokens).toContain('static-analysis')
		expect(result.tokens).toContain('tool')
	})

	it('removes common setup-related stopwords', () => {
		const result = tokenize('configure project setup')
		// 'configure', 'project', 'setup' are all stopwords
		expect(result.tokens).toEqual([])
	})
})
