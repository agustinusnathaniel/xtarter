import { loadPluginTasks } from '@xtarterize/core';
import { describe, expect } from 'vite-plus/test';

describe('loadPluginTasks specifier validation integration', () => {
  test('returns empty array for empty plugins array', async () => {
    const result = await loadPluginTasks({ plugins: [] });
    expect(result).toEqual([]);
  });

  test('returns empty array for undefined plugins', async () => {
    const result = await loadPluginTasks({});
    expect(result).toEqual([]);
  });

  test('skips invalid relative paths without throwing', async () => {
    const result = await loadPluginTasks({
      plugins: ['../../malicious.js', './local.js'],
    });
    // Both invalid, so both skipped - empty result
    expect(result).toEqual([]);
  });

  test('skips invalid absolute paths without throwing', async () => {
    const result = await loadPluginTasks({
      plugins: ['/etc/passwd', '/tmp/exploit.js'],
    });
    expect(result).toEqual([]);
  });

  test('skips invalid URLs without throwing', async () => {
    const result = await loadPluginTasks({
      plugins: ['https://evil.com/pwn.js', 'file:///etc/passwd'],
    });
    expect(result).toEqual([]);
  });

  test('skips empty and malformed specifiers without throwing', async () => {
    const result = await loadPluginTasks({
      plugins: ['', ' ', '.', '..', '-start-dash'],
    });
    expect(result).toEqual([]);
  });
});
