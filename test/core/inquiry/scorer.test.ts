import type { Task } from '@xtarterize/core'
import { scoreTasks } from '@xtarterize/core'
import { describe, expect, it } from 'vite-plus/test'

const mockTasks: Task[] = [
	{
		id: 'lint/biome',
		label: 'Biome (lint + format)',
		group: 'Linting & Formatting',
		searchMeta: {
			tags: ['linting', 'formatting', 'all-in-one', 'quality'],
			configTargets: ['biome.json'],
			keywords: [
				'biome',
				'linter',
				'formatter',
				'lint',
				'format',
				'all-in-one',
			],
		},
		applicable: () => true,
		check: async () => 'new' as const,
		dryRun: async () => [],
		apply: async () => {},
	},
	{
		id: 'ts/strict',
		label: 'tsconfig - strict: true',
		group: 'TypeScript',
		searchMeta: {
			tags: ['typescript', 'strict', 'type-checking', 'quality'],
			configTargets: ['tsconfig.json'],
			keywords: [
				'strict',
				'typescript strict',
				'type checking',
				'strict mode',
				'type safety',
			],
		},
		applicable: () => true,
		check: async () => 'new' as const,
		dryRun: async () => [],
		apply: async () => {},
	},
	{
		id: 'ci/ci',
		label: 'GitHub CI workflow',
		group: 'CI/CD',
		searchMeta: {
			tags: ['ci', 'testing', 'github-actions', 'quality'],
			configTargets: ['.github/workflows/ci.yml'],
			keywords: [
				'ci',
				'continuous integration',
				'github actions',
				'pipeline',
				'test',
				'build',
			],
		},
		applicable: () => true,
		check: async () => 'new' as const,
		dryRun: async () => [],
		apply: async () => {},
	},
	{
		id: 'editor/vscode',
		label: 'VSCode settings + extensions',
		group: 'Editor',
		searchMeta: {
			tags: ['editor', 'ide', 'settings', 'extensions'],
			configTargets: ['.vscode/settings.json', '.vscode/extensions.json'],
			keywords: [
				'vscode',
				'visual studio code',
				'editor config',
				'ide settings',
				'extensions',
			],
		},
		applicable: () => true,
		check: async () => 'new' as const,
		dryRun: async () => [],
		apply: async () => {},
	},
	{
		id: 'deps/renovate',
		label: 'Renovate config',
		group: 'Dependencies',
		searchMeta: {
			tags: ['dependencies', 'updates', 'maintenance', 'automation'],
			configTargets: ['renovate.json'],
			keywords: [
				'renovate',
				'dependencies',
				'dependency updates',
				'dependabot',
				'auto',
			],
		},
		applicable: () => true,
		check: async () => 'new' as const,
		dryRun: async () => [],
		apply: async () => {},
	},
]

describe('scoreTasks', () => {
	it('returns "strict typescript" with ts/strict as top result', () => {
		const results = scoreTasks(mockTasks, 'strict typescript')
		expect(results.length).toBeGreaterThan(0)
		expect(results[0].taskId).toBe('ts/strict')
	})

	it('returns "lint" with lint/biome on top', () => {
		const results = scoreTasks(mockTasks, 'lint')
		expect(results.length).toBeGreaterThan(0)
		expect(results[0].taskId).toBe('lint/biome')
	})

	it('returns "vscode editor" with editor/vscode as top result', () => {
		const results = scoreTasks(mockTasks, 'vscode editor')
		expect(results.length).toBeGreaterThan(0)
		expect(results[0].taskId).toBe('editor/vscode')
	})

	it('returns "ci pipeline" with ci/ci as top result', () => {
		const results = scoreTasks(mockTasks, 'ci pipeline')
		expect(results.length).toBeGreaterThan(0)
		expect(results[0].taskId).toBe('ci/ci')
	})

	it('returns "dependency updates" with deps/renovate as top result via synonym expansion', () => {
		const results = scoreTasks(mockTasks, 'dependency updates')
		expect(results.length).toBeGreaterThan(0)
		expect(results[0].taskId).toBe('deps/renovate')
	})

	it('performs multi-word aggregation for "typescript with strict checking"', () => {
		const results = scoreTasks(mockTasks, 'typescript with strict checking')
		expect(results.length).toBeGreaterThan(0)
		expect(results[0].taskId).toBe('ts/strict')
		// ts/strict should score meaningfully higher than unrelated tasks
		const topScore = results[0].relevance
		const minRelevant = results.find((r) => r.taskId === 'lint/biome')
		if (minRelevant) {
			expect(topScore).toBeGreaterThan(minRelevant.relevance)
		}
	})

	it('returns empty results for empty query', () => {
		const results = scoreTasks(mockTasks, '')
		expect(results).toEqual([])
	})

	it('returns empty results for whitespace-only query', () => {
		const results = scoreTasks(mockTasks, '   ')
		expect(results).toEqual([])
	})

	it('returns results sorted by relevance descending', () => {
		const results = scoreTasks(mockTasks, 'strict typescript')
		for (let i = 1; i < results.length; i++) {
			expect(results[i - 1].relevance).toBeGreaterThanOrEqual(
				results[i].relevance,
			)
		}
	})

	it('includes relevance signals in each result', () => {
		const results = scoreTasks(mockTasks, 'strict')
		expect(results.length).toBeGreaterThan(0)
		for (const r of results) {
			expect(r.signals).toBeDefined()
			expect(r.signals.length).toBeGreaterThan(0)
			expect(r.signals[0]).toHaveProperty('name')
			expect(r.signals[0]).toHaveProperty('score')
			expect(r.relevance).toBeGreaterThanOrEqual(0)
			expect(r.relevance).toBeLessThanOrEqual(1)
		}
	})

	it('maxResults option limits the number of results', () => {
		const results = scoreTasks(mockTasks, 'strict', { maxResults: 2 })
		expect(results.length).toBeLessThanOrEqual(2)
	})

	it('minScore option filters low-scoring results', () => {
		const results = scoreTasks(mockTasks, 'strict', { minScore: 0.5 })
		for (const r of results) {
			expect(r.relevance).toBeGreaterThanOrEqual(0.5)
		}
	})

	it('all tasks receive a relevance score between 0 and 1', () => {
		const results = scoreTasks(mockTasks, 'typescript')
		for (const r of results) {
			expect(r.relevance).toBeGreaterThanOrEqual(0)
			expect(r.relevance).toBeLessThanOrEqual(1)
		}
	})

	it('handles queries that match no tasks gracefully', () => {
		const results = scoreTasks(mockTasks, 'zzzznotfound')
		// Should still return results (with 0 or very low scores) or empty array
		expect(results).toBeDefined()
	})

	it('allows custom weight configuration', () => {
		const defaultResults = scoreTasks(mockTasks, 'lint')
		const weightedResults = scoreTasks(mockTasks, 'lint', {
			weights: {
				keywords: 0.5,
				label: 0.1,
				id: 0.1,
				group: 0.15,
				config: 0.15,
			},
		})
		expect(weightedResults.length).toBeGreaterThan(0)
		// With higher keyword weight, lint/biome should still be on top
		expect(weightedResults[0].taskId).toBe('lint/biome')
	})
})
