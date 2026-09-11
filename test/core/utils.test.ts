import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import {
  backupFile,
  findConfigFile,
  findFirstPositionalIndex,
  findUnknownFlags,
  hasDependency,
  listBackups,
  readPackageJson,
  restoreBackup,
  suggestSimilar,
  validateInvocation,
} from '@xtarterize/core';
import { describe, expect } from 'vite-plus/test';

const cliArgsDef = {
  cwd: { type: 'string' },
  dryRun: { type: 'boolean' },
  format: { alias: 'f', type: 'string' },
  json: { type: 'boolean' },
  name: { type: 'positional' },
} as const;

describe('findFirstPositionalIndex', () => {
  test('finds a positional at the start', () => {
    expect(findFirstPositionalIndex(['cmd'], cliArgsDef)).toBe(0);
  });

  test('finds a positional after boolean flags', () => {
    expect(
      findFirstPositionalIndex(['--json', '--dry-run', 'cmd'], cliArgsDef)
    ).toBe(2);
  });

  test('skips the separate value of a string flag', () => {
    expect(findFirstPositionalIndex(['--cwd', '/tmp', 'cmd'], cliArgsDef)).toBe(
      2
    );
  });

  test('skips the separate value of a short alias flag', () => {
    expect(findFirstPositionalIndex(['-f', 'json', 'cmd'], cliArgsDef)).toBe(2);
  });

  test('handles inline values', () => {
    expect(findFirstPositionalIndex(['--cwd=/tmp', 'cmd'], cliArgsDef)).toBe(1);
  });

  test('returns -1 after the -- terminator', () => {
    expect(findFirstPositionalIndex(['--', 'cmd'], cliArgsDef)).toBe(-1);
  });

  test('returns -1 when no positional exists', () => {
    expect(findFirstPositionalIndex(['--json'], cliArgsDef)).toBe(-1);
  });
});

describe('findUnknownFlags', () => {
  test('accepts declared long, kebab, camel, and alias flags', () => {
    expect(
      findUnknownFlags(
        ['--json', '--dry-run', '--dryRun', '-f', 'json'],
        cliArgsDef
      )
    ).toEqual([]);
  });

  test('flags unknown options with suggestions', () => {
    expect(findUnknownFlags(['--jsn'], cliArgsDef)).toEqual([
      { suggestion: 'json', token: '--jsn' },
    ]);
  });

  test('accepts --no- negation of declared booleans', () => {
    expect(findUnknownFlags(['--no-json', '--no-dry-run'], cliArgsDef)).toEqual(
      []
    );
  });

  test('rejects --no- negation of non-boolean flags', () => {
    expect(findUnknownFlags(['--no-cwd'], cliArgsDef)).toHaveLength(1);
  });

  test('skips the value consumed by a string flag', () => {
    expect(findUnknownFlags(['--cwd', '--json'], cliArgsDef)).toEqual([]);
  });

  test('handles inline values', () => {
    expect(
      findUnknownFlags(['--json=false', '--cwd=/tmp'], cliArgsDef)
    ).toEqual([]);
  });

  test('stops at the -- terminator', () => {
    expect(findUnknownFlags(['--', '--bogus'], cliArgsDef)).toEqual([]);
  });

  test('accepts built-in help and version flags', () => {
    expect(
      findUnknownFlags(['--help', '-h', '--version', '-v'], cliArgsDef)
    ).toEqual([]);
  });

  test('reports each unknown flag', () => {
    const unknown = findUnknownFlags(['--jsn', '--bogus'], cliArgsDef);
    expect(unknown.map((flag) => flag.token)).toEqual(['--jsn', '--bogus']);
  });

  test('ignores positionals', () => {
    expect(findUnknownFlags(['cmd', '--json'], cliArgsDef)).toEqual([]);
  });
});

describe('suggestSimilar', () => {
  test('suggests near matches', () => {
    expect(suggestSimilar('inti', ['add', 'init'])).toBe('init');
    expect(suggestSimilar('jsn', ['cwd', 'json'])).toBe('json');
  });

  test('suggests candidates by prefix', () => {
    expect(suggestSimilar('verb', ['json', 'verbose'])).toBe('verbose');
  });

  test('matches case-insensitively', () => {
    expect(suggestSimilar('INIT', ['init'])).toBe('init');
  });

  test('returns undefined for distant inputs', () => {
    expect(suggestSimilar('zzzzzz', ['json'])).toBeUndefined();
  });

  test('breaks ties deterministically', () => {
    expect(suggestSimilar('cat', ['can', 'bat'])).toBe('bat');
  });
});

describe('validateInvocation', () => {
  const mainDef = { cwd: { type: 'string' }, json: { type: 'boolean' } };
  const subcommands = {
    list: async () => ({
      json: { type: 'boolean' },
      quiet: { type: 'boolean' },
    }),
  };

  test('passes a valid subcommand invocation', async () => {
    const issues = await validateInvocation({
      argsDef: mainDef,
      commandLabel: 'cli',
      rawArgs: ['list', '--json', '--quiet'],
      requireKnownSubcommand: true,
      subcommands,
    });
    expect(issues).toEqual([]);
  });

  test('passes main flags placed before the subcommand', async () => {
    const issues = await validateInvocation({
      argsDef: mainDef,
      commandLabel: 'cli',
      rawArgs: ['--cwd', '.'],
      requireKnownSubcommand: true,
      subcommands,
    });
    expect(issues).toEqual([]);
  });

  test('rejects unknown options on a subcommand with a suggestion', async () => {
    const issues = await validateInvocation({
      argsDef: mainDef,
      commandLabel: 'cli',
      rawArgs: ['list', '--jsn'],
      requireKnownSubcommand: true,
      subcommands,
    });
    expect(issues).toEqual([
      'Unknown option --jsn for "cli list". Did you mean --json?',
      'Run "cli list --help" to see valid options.',
    ]);
  });

  test('rejects unknown options at the entry level', async () => {
    const issues = await validateInvocation({
      argsDef: mainDef,
      commandLabel: 'cli',
      rawArgs: ['--jsn', 'list'],
      requireKnownSubcommand: true,
      subcommands,
    });
    expect(issues[0]).toBe(
      'Unknown option --jsn for "cli". Did you mean --json?'
    );
  });

  test('rejects unknown commands and suggests names', async () => {
    const issues = await validateInvocation({
      argsDef: mainDef,
      commandLabel: 'cli',
      rawArgs: ['lst'],
      requireKnownSubcommand: true,
      subcommands,
    });
    expect(issues).toEqual([
      'Unknown command "lst" for "cli". Did you mean "list"?',
      'Run "cli --help" to see available commands.',
    ]);
  });

  test('rejects unmatched positionals when the entry has no run', async () => {
    const issues = await validateInvocation({
      argsDef: mainDef,
      commandLabel: 'cli',
      rawArgs: ['bogus'],
      requireKnownSubcommand: true,
      subcommands,
    });
    expect(issues[0]).toBe('Unknown command "bogus" for "cli".');
  });

  test('validates entry flags after positional args of the entry command', async () => {
    const issues = await validateInvocation({
      argsDef: mainDef,
      commandLabel: 'cli',
      rawArgs: ['proj-name', '--bogus'],
      requireKnownSubcommand: false,
      subcommands,
    });
    expect(issues).toEqual([
      'Unknown option --bogus for "cli".',
      'Run "cli --help" to see valid options.',
    ]);
  });

  test('skips validation for help and version flags', async () => {
    const issues = await validateInvocation({
      argsDef: mainDef,
      commandLabel: 'cli',
      rawArgs: ['--help'],
      requireKnownSubcommand: true,
      subcommands,
    });
    expect(issues).toEqual([]);
  });
});

describe('isDeepStrictEqual (node:util)', () => {
  test('returns true for identical primitives', () => {
    expect(isDeepStrictEqual(1, 1)).toBe(true);
    expect(isDeepStrictEqual('a', 'a')).toBe(true);
    expect(isDeepStrictEqual(true, true)).toBe(true);
    expect(isDeepStrictEqual(null, null)).toBe(true);
    expect(isDeepStrictEqual(undefined, undefined)).toBe(true);
  });

  test('returns false for different primitives', () => {
    expect(isDeepStrictEqual(1, 2)).toBe(false);
    expect(isDeepStrictEqual('a', 'b')).toBe(false);
    expect(isDeepStrictEqual(true, false)).toBe(false);
  });

  test('returns false for different types', () => {
    expect(isDeepStrictEqual(1, '1')).toBe(false);
    expect(isDeepStrictEqual({}, [])).toBe(false);
  });

  test('compares flat objects', () => {
    expect(isDeepStrictEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
    expect(isDeepStrictEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
    expect(isDeepStrictEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  test('compares nested objects', () => {
    expect(isDeepStrictEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true);
    expect(isDeepStrictEqual({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false);
  });

  test('compares arrays', () => {
    expect(isDeepStrictEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(isDeepStrictEqual([1, 2, 3], [3, 2, 1])).toBe(false);
    expect(isDeepStrictEqual([1, 2], [1, 2, 3])).toBe(false);
  });
});

describe('findConfigFile', () => {
  test('finds existing file by extension', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'));
    try {
      await fs.writeFile(path.join(tmpDir, 'vite.config.ts'), '');
      const result = await findConfigFile(tmpDir, 'vite.config', [
        '.ts',
        '.js',
      ]);
      expect(result).toBe(path.join(tmpDir, 'vite.config.ts'));
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('returns null when no file matches', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'));
    try {
      const result = await findConfigFile(tmpDir, 'missing', ['.ts', '.js']);
      expect(result).toBeNull();
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('tries extensions in order', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'));
    try {
      await fs.writeFile(path.join(tmpDir, 'config.js'), '');
      const result = await findConfigFile(tmpDir, 'config', [
        '.ts',
        '.js',
        '.mjs',
      ]);
      expect(result).toBe(path.join(tmpDir, 'config.js'));
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });
});

describe('readPackageJson', () => {
  test('returns null when no package.json', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'));
    try {
      const result = await readPackageJson(tmpDir);
      expect(result).toBeNull();
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('reads existing package.json', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'));
    try {
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({ name: 'test-pkg', version: '1.0.0' })
      );
      const result = await readPackageJson(tmpDir);
      expect(result?.name).toBe('test-pkg');
      expect(result?.version).toBe('1.0.0');
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });
});

describe('hasDependency', () => {
  test('checks dependencies', () => {
    const pkg = {
      dependencies: { react: '^18.0.0' },
      devDependencies: { vite: '^5.0.0' },
    };
    expect(hasDependency(pkg, 'react')).toBe(true);
    expect(hasDependency(pkg, 'vite')).toBe(true);
    expect(hasDependency(pkg, 'typescript')).toBe(false);
  });

  test('handles empty deps', () => {
    expect(hasDependency({}, 'anything')).toBe(false);
  });
});

describe('restoreBackup', () => {
  test('restores a backed up file', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'));
    try {
      await fs.writeFile(path.join(tmpDir, 'test.txt'), 'original');
      await backupFile(tmpDir, 'test.txt');

      await fs.writeFile(path.join(tmpDir, 'test.txt'), 'modified');
      const backups = await listBackups(tmpDir, 'test.txt');
      expect(backups.length).toBe(1);

      await restoreBackup(tmpDir, backups[0]);
      const content = await fs.readFile(path.join(tmpDir, 'test.txt'), 'utf-8');
      expect(content).toBe('original');
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('restores the most recent backup', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'));
    try {
      await fs.writeFile(path.join(tmpDir, 'test.txt'), 'v1');
      await backupFile(tmpDir, 'test.txt');

      await fs.writeFile(path.join(tmpDir, 'test.txt'), 'v2');
      await backupFile(tmpDir, 'test.txt');

      await fs.writeFile(path.join(tmpDir, 'test.txt'), 'v3');
      const backups = await listBackups(tmpDir, 'test.txt');
      expect(backups.length).toBe(2);

      await restoreBackup(tmpDir, backups[0]);
      const content = await fs.readFile(path.join(tmpDir, 'test.txt'), 'utf-8');
      expect(content).toBe('v2');
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });
});
