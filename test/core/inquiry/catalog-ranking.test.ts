import { scoreTasks } from '@xtarterize/core';
import { getAllTasks } from '@xtarterize/tasks';
import { describe, expect } from 'vite-plus/test';

const tasks = getAllTasks();

function topResult(query: string) {
  return scoreTasks(tasks, query)[0];
}

describe('catalog ranking regressions', () => {
  test('"typing" ranks ts/strict in the top three', () => {
    const results = scoreTasks(tasks, 'typing');
    expect(results.length).toBeGreaterThan(0);
    expect(results.slice(0, 3).map((r) => r.taskId)).toContain('ts/strict');
  });

  test('"updates" ranks deps/renovate first with a strong score', () => {
    const top = topResult('updates');
    expect(top?.taskId).toBe('deps/renovate');
    expect(top?.relevance).toBeGreaterThanOrEqual(0.6);
  });

  test('"code" ranks editor/vscode first', () => {
    expect(topResult('code')?.taskId).toBe('editor/vscode');
  });

  test('"strict typescript" ranks ts/strict first', () => {
    expect(topResult('strict typescript')?.taskId).toBe('ts/strict');
  });

  test('"ci pipeline" ranks ci/ci first', () => {
    expect(topResult('ci pipeline')?.taskId).toBe('ci/ci');
  });
});
