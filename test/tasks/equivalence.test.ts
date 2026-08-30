import {
  areEquivalent,
  extractTool,
  findEquivalentScriptKey,
  hasScriptWithEquivalentValue,
  normalizeCommand,
} from '@xtarterize/tasks';
import { describe, expect } from 'vite-plus/test';

describe('normalizeCommand', () => {
  test('trims and collapses whitespace', () => {
    expect(normalizeCommand('  tsc   --noEmit  ')).toBe('tsc --noEmit');
  });

  test('is identity for already-normal commands', () => {
    expect(normalizeCommand('tsc --noEmit')).toBe('tsc --noEmit');
  });
});

describe('extractTool', () => {
  test('extracts known tool from command', () => {
    expect(extractTool('tsc --noEmit')).toBe('tsc');
  });

  test('extracts tool after npx runner', () => {
    expect(extractTool('npx tsc')).toBe('tsc');
  });

  test('extracts script ref from pm run pattern', () => {
    expect(extractTool('pnpm run build')).toBe('build');
  });

  test('returns null for empty string', () => {
    expect(extractTool('')).toBeNull();
  });

  test('returns null for unknown command', () => {
    expect(extractTool('some-random-tool')).toBeNull();
  });
});

describe('findEquivalentScriptKey', () => {
  test('returns key when exact value match exists', () => {
    const scripts = { build: 'tsc --noEmit' };
    expect(findEquivalentScriptKey(scripts, 'typecheck', 'tsc --noEmit')).toBe(
      'build'
    );
  });

  test('returns null when scripts object is empty', () => {
    expect(findEquivalentScriptKey({}, 'build', 'tsc')).toBeNull();
  });

  test('returns null when no equivalent value exists', () => {
    const scripts = { build: 'tsc' };
    expect(findEquivalentScriptKey(scripts, 'lint', 'eslint .')).toBeNull();
  });

  test('finds equivalent via release tool aliases', () => {
    const scripts = { rel: 'standard-version' };
    expect(
      findEquivalentScriptKey(scripts, 'release', 'commit-and-tag-version')
    ).toBe('rel');
  });

  test('finds equivalent via script ref match', () => {
    const scripts = { build: 'npm run build' };
    expect(findEquivalentScriptKey(scripts, 'build', 'pnpm run build')).toBe(
      'build'
    );
  });
});

describe('hasScriptWithEquivalentValue', () => {
  test('returns true when exact value exists', () => {
    expect(
      hasScriptWithEquivalentValue({ build: 'tsc --noEmit' }, 'tsc --noEmit')
    ).toBe(true);
  });

  test('returns false when no equivalent value exists', () => {
    expect(hasScriptWithEquivalentValue({ build: 'tsc' }, 'eslint .')).toBe(
      false
    );
  });

  test('returns true when equivalent via tool aliases', () => {
    expect(
      hasScriptWithEquivalentValue(
        { release: 'standard-version' },
        'commit-and-tag-version'
      )
    ).toBe(true);
  });
});

describe('areEquivalent', () => {
  describe('EXACT_MATCH rule', () => {
    test('returns true for identical commands', () => {
      expect(areEquivalent('tsc --noEmit', 'tsc --noEmit')).toBe(true);
    });

    test('returns true for identical simple commands', () => {
      expect(areEquivalent('tsc', 'tsc')).toBe(true);
    });
  });

  describe('COMPOSITE rules', () => {
    test('returns true when both are composite with same tasks', () => {
      expect(
        areEquivalent('turbo run build lint', 'turbo run build lint')
      ).toBe(true);
    });

    test('returns false when composite mixed with non-composite', () => {
      expect(areEquivalent('turbo run build', 'tsc --noEmit')).toBe(false);
    });
  });

  describe('SHELL_OPERATOR_MISMATCH rule', () => {
    test('returns false when one has shell operator and other does not', () => {
      expect(areEquivalent('lint && format', 'lint')).toBe(false);
    });

    test('returns false in reverse order', () => {
      expect(areEquivalent('lint', 'lint && format')).toBe(false);
    });
  });

  describe('TOOL_MISMATCH rule', () => {
    test('returns false for completely different tools', () => {
      expect(areEquivalent('tsc --noEmit', 'eslint .')).toBe(false);
    });

    test('returns false even when tools normalize to same category but args differ', () => {
      expect(areEquivalent('eslint .', 'biome check .')).toBe(false);
    });
  });

  describe('SAME_TOOL_SAME_ARGS rule', () => {
    test('returns true for functionally equivalent release tools', () => {
      expect(areEquivalent('commit-and-tag-version', 'standard-version')).toBe(
        true
      );
    });

    test('returns true for release-it vs standard-version', () => {
      expect(areEquivalent('release-it', 'standard-version')).toBe(true);
    });
  });

  describe('EQUIVALENT_SUBCOMMANDS rule', () => {
    test('detects equivalent biome subcommands', () => {
      expect(areEquivalent('biome check .', 'biome lint .')).toBe(true);
    });

    test('detects equivalent biome subcommands with --write', () => {
      expect(
        areEquivalent('biome check --write .', 'biome format --write .')
      ).toBe(true);
    });

    test('detects equivalent ultracite subcommands', () => {
      expect(areEquivalent('ultracite check', 'ultracite fix')).toBe(true);
    });

    test('detects equivalent vp subcommands', () => {
      expect(areEquivalent('vp lint', 'vp check')).toBe(true);
    });
  });

  describe('SCRIPT_REF_MATCH rule', () => {
    test('returns true when both reference the same script name', () => {
      expect(areEquivalent('pnpm run build', 'npm run build')).toBe(true);
    });

    test('returns false when script refs differ', () => {
      expect(areEquivalent('pnpm run build', 'pnpm run test')).toBe(false);
    });
  });

  describe('non-equivalent cases', () => {
    test('returns false for different commands with same tool but different args', () => {
      expect(areEquivalent('tsc --noEmit', 'tsc --build')).toBe(false);
    });

    test('returns false for completely unrelated commands', () => {
      expect(areEquivalent('echo hello', 'ls -la')).toBe(false);
    });
  });
});
