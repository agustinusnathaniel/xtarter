import { tokenize } from '@xtarterize/core';
import { describe, expect } from 'vite-plus/test';

describe('tokenize', () => {
  test('tokenizes a simple query and keeps the original', () => {
    const result = tokenize('strict typescript');
    expect(result.tokens).toEqual(['strict', 'typescript']);
    expect(result.original).toBe('strict typescript');
  });

  test('removes stopwords and single-character words', () => {
    expect(tokenize('i want a strict typescript setup').tokens).toEqual([
      'strict',
      'typescript',
    ]);
    expect(tokenize('a b strict').tokens).toEqual(['strict']);
    expect(tokenize('a an the').tokens).toEqual([]);
  });

  test('returns empty tokens for an empty or whitespace-only query', () => {
    expect(tokenize('').tokens).toEqual([]);
    expect(tokenize('   ').tokens).toEqual([]);
  });

  test('drops punctuation and splits hyphenated words', () => {
    expect(tokenize('strict typescript!!!').tokens).toEqual([
      'strict',
      'typescript',
    ]);
    expect(tokenize('static-analysis tool').tokens).toEqual([
      'static',
      'analysis',
      'tool',
    ]);
  });
});
