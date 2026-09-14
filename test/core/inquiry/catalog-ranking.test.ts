import { scoreTasks } from '@xtarterize/core';
import { getAllTasks } from '@xtarterize/tasks';
import { describe, expect } from 'vite-plus/test';

const tasks = getAllTasks();

const topCases: Array<[query: string, top: string, minScore?: number]> = [
  ['code', 'editor/vscode'],
  ['strict typescript', 'ts/strict'],
  ['ci pipeline', 'ci/ci'],
  ['skills', 'agent/skills-install'],
  ['auto update', 'ci/auto-update'],
  ['semver', 'release/cat-version'],
  ['bump', 'release/cat-version'],
  ['updates', 'deps/renovate', 0.6],
];

describe('catalog ranking regressions', () => {
  for (const [query, top, minScore = 0] of topCases) {
    test(`"${query}" ranks ${top} first`, () => {
      const result = scoreTasks(tasks, query)[0];
      expect(result?.taskId).toBe(top);
      expect(result?.relevance).toBeGreaterThanOrEqual(minScore);
    });
  }

  test('"typing" ranks ts/strict in the top three', () => {
    const ids = scoreTasks(tasks, 'typing').map((r) => r.taskId);
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.slice(0, 3)).toContain('ts/strict');
  });
});
