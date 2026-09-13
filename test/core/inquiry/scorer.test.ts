import { scoreTasks } from '@xtarterize/core';
import { describe, expect } from 'vite-plus/test';

import { makeTask } from '../../helpers/factories.js';

const searchTasks: Array<{
  configTargets: Array<string>;
  group: string;
  id: string;
  keywords: Array<string>;
  label: string;
  tags: Array<string>;
}> = [
  {
    configTargets: ['biome.json'],
    group: 'Linting & Formatting',
    id: 'lint/biome',
    keywords: ['biome', 'linter', 'formatter', 'lint', 'format', 'all-in-one'],
    label: 'Biome (lint + format)',
    tags: ['linting', 'formatting', 'all-in-one', 'quality'],
  },
  {
    configTargets: ['tsconfig.json'],
    group: 'TypeScript',
    id: 'ts/strict',
    keywords: [
      'strict',
      'typescript strict',
      'type checking',
      'strict mode',
      'type safety',
    ],
    label: 'tsconfig - strict: true',
    tags: ['typescript', 'strict', 'type-checking', 'quality'],
  },
  {
    configTargets: ['.github/workflows/ci.yml'],
    group: 'CI/CD',
    id: 'ci/ci',
    keywords: [
      'ci',
      'continuous integration',
      'github actions',
      'pipeline',
      'test',
      'build',
    ],
    label: 'GitHub CI workflow',
    tags: ['ci', 'testing', 'github-actions', 'quality'],
  },
  {
    configTargets: ['.vscode/settings.json', '.vscode/extensions.json'],
    group: 'Editor',
    id: 'editor/vscode',
    keywords: [
      'vscode',
      'visual studio code',
      'editor config',
      'ide settings',
      'extensions',
    ],
    label: 'VSCode settings + extensions',
    tags: ['editor', 'ide', 'settings', 'extensions'],
  },
  {
    configTargets: ['renovate.json'],
    group: 'Dependencies',
    id: 'deps/renovate',
    keywords: [
      'renovate',
      'dependencies',
      'dependency updates',
      'dependabot',
      'auto',
    ],
    label: 'Renovate config',
    tags: ['dependencies', 'updates', 'maintenance', 'automation'],
  },
];

const mockTasks = searchTasks.map((task) =>
  makeTask({
    check: 'new',
    group: task.group,
    id: task.id,
    label: task.label,
    searchMeta: {
      configTargets: task.configTargets,
      keywords: task.keywords,
      tags: task.tags,
    },
  })
);

const taskNoMeta = makeTask({
  check: 'new',
  group: 'Example',
  id: 'example/no-meta',
  label: 'Example task without metadata',
});

const topResultCases: Array<[name: string, query: string, top: string]> = [
  [
    'returns "strict typescript" with ts/strict as top result',
    'strict typescript',
    'ts/strict',
  ],
  ['returns "lint" with lint/biome on top', 'lint', 'lint/biome'],
  [
    'returns "vscode editor" with editor/vscode as top result',
    'vscode editor',
    'editor/vscode',
  ],
  ['returns "ci pipeline" with ci/ci as top result', 'ci pipeline', 'ci/ci'],
  [
    'returns "dependency updates" with deps/renovate as top result',
    'dependency updates',
    'deps/renovate',
  ],
];

describe('scoreTasks', () => {
  for (const [name, query, top] of topResultCases) {
    test(name, () => {
      const results = scoreTasks(mockTasks, query);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].taskId).toBe(top);
    });
  }

  test('performs multi-word aggregation for "typescript with strict checking"', () => {
    const results = scoreTasks(mockTasks, 'typescript with strict checking');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].taskId).toBe('ts/strict');
    // ts/strict should score meaningfully higher than unrelated tasks
    const topScore = results[0].relevance;
    const minRelevant = results.find((r) => r.taskId === 'lint/biome');
    if (minRelevant) {
      expect(topScore).toBeGreaterThan(minRelevant.relevance);
    }
  });

  test('returns empty results for empty query', () => {
    const results = scoreTasks(mockTasks, '');
    expect(results).toEqual([]);
  });

  test('returns empty results for whitespace-only query', () => {
    const results = scoreTasks(mockTasks, '   ');
    expect(results).toEqual([]);
  });

  test('returns results sorted by relevance descending', () => {
    const results = scoreTasks(mockTasks, 'strict typescript');
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].relevance).toBeGreaterThanOrEqual(
        results[i].relevance
      );
    }
  });

  test('includes relevance signals in each result', () => {
    const results = scoreTasks(mockTasks, 'strict');
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.signals).toBeDefined();
      expect(r.signals.length).toBeGreaterThan(0);
      expect(r.signals[0]).toHaveProperty('name');
      expect(r.signals[0]).toHaveProperty('score');
      expect(r.relevance).toBeGreaterThanOrEqual(0);
      expect(r.relevance).toBeLessThanOrEqual(1);
    }
  });

  test('maxResults option limits the number of results', () => {
    const results = scoreTasks(mockTasks, 'strict', { maxResults: 2 });
    expect(results.length).toBeLessThanOrEqual(2);
  });

  test('minScore option filters low-scoring results', () => {
    const results = scoreTasks(mockTasks, 'strict', { minScore: 0.5 });
    for (const r of results) {
      expect(r.relevance).toBeGreaterThanOrEqual(0.5);
    }
  });

  test('all tasks receive a relevance score between 0 and 1', () => {
    const results = scoreTasks(mockTasks, 'typescript');
    for (const r of results) {
      expect(r.relevance).toBeGreaterThanOrEqual(0);
      expect(r.relevance).toBeLessThanOrEqual(1);
    }
  });

  test('handles queries that match no tasks gracefully', () => {
    const results = scoreTasks(mockTasks, 'zzzznotfoundblah');
    expect(Array.isArray(results)).toBe(true);
    expect(results).toHaveLength(0);
  });

  test('allows custom weight configuration', () => {
    const weightedResults = scoreTasks(mockTasks, 'lint', {
      weights: {
        config: 0.15,
        group: 0.15,
        id: 0.1,
        keywords: 0.5,
        label: 0.1,
      },
    });
    expect(weightedResults.length).toBeGreaterThan(0);
    // With higher keyword weight, lint/biome should still be on top
    expect(weightedResults[0].taskId).toBe('lint/biome');
  });

  test('scores tasks without searchMeta using label/id/group', () => {
    const results = scoreTasks([taskNoMeta, ...mockTasks], 'example', {
      minScore: 0,
    });
    const noMetaResult = results.find((r) => r.taskId === 'example/no-meta');
    expect(noMetaResult).toBeDefined();
    expect(noMetaResult?.relevance).toBeGreaterThan(0);
    // Should score from label match ("example") alone
    expect(
      noMetaResult?.signals.find((s) => s.name === 'label')?.score
    ).toBeGreaterThan(0);
    // Keywords and config should be 0 since searchMeta is undefined
    expect(
      noMetaResult?.signals.find((s) => s.name === 'keywords')?.score
    ).toBe(0);
    expect(noMetaResult?.signals.find((s) => s.name === 'config')?.score).toBe(
      0
    );
  });

  test('returns all results with minScore: 0', () => {
    const results = scoreTasks(mockTasks, 'strict', { minScore: 0 });
    // Should include ts/strict AND any other task with even marginal relevance
    expect(results.find((r) => r.taskId === 'ts/strict')).toBeDefined();
  });

  test('returns all results with maxResults: 0 (unlimited)', () => {
    const results = scoreTasks(mockTasks, 'lint', { maxResults: 0 });
    // All matching tasks should be included (not capped)
    expect(results.length).toBeGreaterThanOrEqual(1);
  });
});
