import { tokenize } from '@xtarterize/core';
import { describe, expect } from 'vite-plus/test';

describe('tokenize', () => {
  test('tokenizes a simple query', () => {
    const result = tokenize('strict typescript');
    expect(result.tokens).toEqual(['strict', 'typescript']);
    expect(result.original).toBe('strict typescript');
  });

  test('removes stopwords', () => {
    const result = tokenize('i want a strict typescript setup');
    expect(result.tokens).toEqual(['strict', 'typescript']);
  });

  test('filters out short words (shorter than 2 chars)', () => {
    const result = tokenize('a b strict');
    expect(result.tokens).toEqual(['strict']);
  });

  test('returns empty tokens for empty query', () => {
    const result = tokenize('');
    expect(result.tokens).toEqual([]);
    expect(result.original).toBe('');
  });

  test('returns empty tokens for query with only whitespace', () => {
    const result = tokenize('   ');
    expect(result.tokens).toEqual([]);
  });

  test('returns empty tokens for query with only stopwords', () => {
    const result = tokenize('a an the');
    expect(result.tokens).toEqual([]);
  });

  test('handles special characters', () => {
    const result = tokenize('strict typescript!!!');
    expect(result.tokens).toContain('strict');
    expect(result.tokens).toContain('typescript');
  });

  test('normalizes hyphens to spaces', () => {
    const result = tokenize('static-analysis tool');
    expect(result.tokens).toContain('static');
    expect(result.tokens).toContain('analysis');
    expect(result.tokens).toContain('tool');
    expect(result.tokens).not.toContain('static-analysis');
  });

  test('strips non-ASCII characters', () => {
    const result = tokenize('über strict');
    // 'ü' is stripped (not \w); remaining 'ber' passes through
    expect(result.tokens).toEqual(['ber', 'strict']);
  });

  test('normalizes hyphens to spaces so hyphenated queries match spaced terms', () => {
    const result = tokenize('agent-skills setup');
    expect(result.tokens).toContain('agent');
    expect(result.tokens).toContain('skills');
    expect(result.tokens).not.toContain('agent-skills');
  });

  test('removes common setup-related stopwords', () => {
    const result = tokenize('configure project setup');
    // 'configure', 'project', 'setup' are all stopwords
    expect(result.tokens).toEqual([]);
  });
});
