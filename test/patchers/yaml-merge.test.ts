import { mergeYaml, parseYaml } from '@xtarterize/patchers';
import { describe, expect } from 'vite-plus/test';

describe('parseYaml', () => {
  test('parses a simple YAML string', () => {
    const result = parseYaml('name: CI\non: push\n');
    expect(result).toEqual({ name: 'CI', on: 'push' });
  });

  test('returns empty object for empty string', () => {
    expect(parseYaml('')).toEqual({});
  });

  test('returns empty object for whitespace-only string', () => {
    expect(parseYaml('   \n\n')).toEqual({});
  });
});

describe('mergeYaml', () => {
  test('fills missing keys from incoming', () => {
    const source = 'name: CI';
    const result = mergeYaml(source, { on: { push: { branches: ['main'] } } });
    const parsed = parseYaml(result);
    expect(parsed).toHaveProperty('name', 'CI');
    expect(parsed).toHaveProperty('on.push.branches', ['main']);
  });

  test('preserves existing keys over incoming', () => {
    const source = 'name: CI\non: push';
    const result = mergeYaml(source, { name: 'Deploy' });
    const parsed = parseYaml(result);
    expect(parsed.name).toBe('CI'); // existing wins
  });

  test('handles deep nested objects', () => {
    const source = 'a:\n  b:\n    c: 1\n    d: 2';
    const result = mergeYaml(source, { a: { b: { e: 3 } } });
    const parsed = parseYaml(result) as Record<string, any>;
    expect(parsed.a.b.c).toBe(1);
    expect(parsed.a.b.d).toBe(2);
    expect(parsed.a.b.e).toBe(3);
  });

  test('replaces arrays instead of concatenating', () => {
    const source = 'items:\n  - a\n  - b';
    const result = mergeYaml(source, { items: ['c', 'd'] });
    const parsed = parseYaml(result) as Record<string, any>;
    // Existing array wins (consistent with mergeJson and ADR-007),
    // but it replaces rather than concatenates with incoming.
    expect(parsed.items).toEqual(['a', 'b']);
    expect(parsed.items).not.toEqual(['a', 'b', 'c', 'd']);
  });

  test('handles empty source string', () => {
    const result = mergeYaml('', { key: 'value' });
    const parsed = parseYaml(result);
    expect(parsed).toEqual({ key: 'value' });
  });

  test('round-trips: parse -> merge -> re-parse preserves structure', () => {
    const yamlSource = 'name: CI\non:\n  push:\n    branches:\n      - main\n';
    const result = mergeYaml(yamlSource, {
      on: { pull_request: { branches: ['main'] } },
    });
    const parsed = parseYaml(result) as Record<string, any>;
    expect(parsed.name).toBe('CI');
    expect(parsed.on.push.branches).toEqual(['main']);
    expect(parsed.on.pull_request.branches).toEqual(['main']);
  });
});
