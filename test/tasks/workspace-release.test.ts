import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectProject } from '@xtarterize/core';
import {
  getAllTasks,
  pnpmWorkspaceTask,
  versionrcTask,
} from '@xtarterize/tasks';
import { describe, expect } from 'vite-plus/test';

import { run } from '../helpers/run.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.resolve(__dirname, '../fixtures');

const withPnpmProject = async (
  run: (cwd: string) => Promise<void>,
  workspace?: string
): Promise<void> => {
  const tmpDir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'xtarterize-pnpm-workspace-')
  );
  try {
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'pnpm-workspace-test' })
    );
    await fs.writeFile(path.join(tmpDir, 'pnpm-lock.yaml'), '');
    if (workspace !== undefined) {
      await fs.writeFile(path.join(tmpDir, 'pnpm-workspace.yaml'), workspace);
    }
    await run(tmpDir);
  } finally {
    await fs.rm(tmpDir, { force: true, recursive: true });
  }
};

const workspacePath = (cwd: string): string =>
  path.join(cwd, 'pnpm-workspace.yaml');

const readWorkspace = (cwd: string): Promise<string> =>
  fs.readFile(workspacePath(cwd), 'utf-8');

describe('pnpmWorkspaceTask', () => {
  test('is applicable to pnpm projects', async () => {
    const profile = await detectProject(path.join(fixtures, 'monorepo-turbo'));
    expect(pnpmWorkspaceTask.applicable(profile)).toBe(true);
  });

  test('is not applicable to npm projects', async () => {
    const profile = await detectProject(
      path.join(fixtures, 'react-vite-no-styling')
    );
    expect(pnpmWorkspaceTask.applicable(profile)).toBe(false);
  });

  test('skips when pnpm-workspace.yaml already exists', async () => {
    const profile = await detectProject(path.join(fixtures, 'monorepo-turbo'));
    const status = await run(
      pnpmWorkspaceTask.check(path.join(fixtures, 'monorepo-turbo'), profile)
    );
    expect(status).toBe('skip');
  });

  test('returns new when pnpm-workspace.yaml is missing in a pnpm project', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-pnpm-new-')
    );
    try {
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({ name: 'pnpm-new-test' })
      );
      // Write a pnpm lockfile so detection returns pnpm
      await fs.writeFile(path.join(tmpDir, 'pnpm-lock.yaml'), '');
      const profile = await detectProject(tmpDir);
      const status = await run(pnpmWorkspaceTask.check(tmpDir, profile));
      expect(status).toBe('new');
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('generates packages definition for monorepo pnpm project', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-pnpm-monorepo-')
    );
    try {
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({ name: 'monorepo-test' })
      );
      await fs.writeFile(path.join(tmpDir, 'pnpm-lock.yaml'), '');
      // Create monorepo markers (packages/ + apps/ dirs) so detectProject returns monorepo: true
      await fs.mkdir(path.join(tmpDir, 'packages'), { recursive: true });
      await fs.mkdir(path.join(tmpDir, 'apps'), { recursive: true });
      const profile = await detectProject(tmpDir);
      expect(await run(pnpmWorkspaceTask.check(tmpDir, profile))).toBe('new');
      const diffs = await run(pnpmWorkspaceTask.dryRun(tmpDir, profile));
      expect(diffs.length).toBe(1);
      expect(diffs[0].filepath).toBe('pnpm-workspace.yaml');
      expect(diffs[0].before).toBeNull();
      expect(diffs[0].after).toBe(
        ['packages:', "  - 'apps/*'", "  - 'packages/*'", ''].join('\n')
      );
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('generates no packages definition for single-package pnpm project', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-pnpm-single-')
    );
    try {
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({ name: 'single-test' })
      );
      await fs.writeFile(path.join(tmpDir, 'pnpm-lock.yaml'), '');
      const profile = await detectProject(tmpDir);
      const diffs = await run(pnpmWorkspaceTask.dryRun(tmpDir, profile));
      expect(diffs.length).toBe(1);
      expect(diffs[0].filepath).toBe('pnpm-workspace.yaml');
      expect(diffs[0].before).toBeNull();
      expect(diffs[0].after).not.toContain("'apps/*'");
      expect(diffs[0].after).not.toContain("'packages/*'");
      expect(diffs[0].after.trim()).toBe('# pnpm workspace config');
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('apply writes packages definition for monorepo', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-pnpm-apply-monorepo-')
    );
    try {
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({ name: 'apply-monorepo' })
      );
      await fs.writeFile(path.join(tmpDir, 'pnpm-lock.yaml'), '');
      await fs.mkdir(path.join(tmpDir, 'packages'), { recursive: true });
      await fs.mkdir(path.join(tmpDir, 'apps'), { recursive: true });
      const profile = await detectProject(tmpDir);
      await run(pnpmWorkspaceTask.apply(tmpDir, profile));
      const content = await fs.readFile(
        path.join(tmpDir, 'pnpm-workspace.yaml'),
        'utf-8'
      );
      expect(content).toContain("'apps/*'");
      expect(content).toContain("'packages/*'");
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('apply writes minimal content for single-package pnpm project', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-pnpm-apply-single-')
    );
    try {
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({ name: 'apply-single' })
      );
      await fs.writeFile(path.join(tmpDir, 'pnpm-lock.yaml'), '');
      const profile = await detectProject(tmpDir);
      await run(pnpmWorkspaceTask.apply(tmpDir, profile));
      const content = await fs.readFile(
        path.join(tmpDir, 'pnpm-workspace.yaml'),
        'utf-8'
      );
      expect(content).not.toContain("'apps/*'");
      expect(content).not.toContain("'packages/*'");
      expect(content.trim()).toBe('# pnpm workspace config');
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('skips existing content that already declares both globs', async () => {
    const content = [
      '# workspace configuration',
      'catalog:',
      '  react: ^19.0.0',
      'packages:',
      "  - 'apps/*'",
      "  - './packages/*'",
      'overrides:',
      '  esbuild: ^0.25.0',
      'onlyBuiltDependencies:',
      '  - esbuild',
      '',
    ].join('\n');
    await withPnpmProject(async (cwd) => {
      const profile = await detectProject(cwd);
      expect(await run(pnpmWorkspaceTask.check(cwd, profile))).toBe('skip');
      expect(await run(pnpmWorkspaceTask.dryRun(cwd, profile))).toEqual([]);
      await expect(readWorkspace(cwd)).resolves.toBe(content);
    }, content);
  });

  test('inserts missing globs and preserves the rest of the file', async () => {
    const content = [
      '# workspace configuration',
      'catalog:',
      '  react: ^19.0.0',
      'packages:',
      "  - 'apps/*'",
      '',
      'onlyBuiltDependencies:',
      '  - esbuild',
      '',
    ].join('\n');
    const expected = [
      '# workspace configuration',
      'catalog:',
      '  react: ^19.0.0',
      'packages:',
      "  - 'apps/*'",
      "  - 'packages/*'",
      '',
      'onlyBuiltDependencies:',
      '  - esbuild',
      '',
    ].join('\n');
    await withPnpmProject(async (cwd) => {
      const profile = await detectProject(cwd);
      expect(await run(pnpmWorkspaceTask.check(cwd, profile))).toBe('patch');
      const diffs = await run(pnpmWorkspaceTask.dryRun(cwd, profile));
      expect(diffs[0].after).toBe(expected);
      await run(pnpmWorkspaceTask.apply(cwd, profile));
      await expect(readWorkspace(cwd)).resolves.toBe(expected);
      // Idempotency: the patched file is satisfied on the next check.
      expect(await run(pnpmWorkspaceTask.check(cwd, profile))).toBe('skip');
      expect(await run(pnpmWorkspaceTask.dryRun(cwd, profile))).toEqual([]);
    }, content);
  });

  test('skips a settings-only file without a packages key', async () => {
    const content = ['onlyBuiltDependencies:', '  - esbuild', ''].join('\n');
    await withPnpmProject(async (cwd) => {
      // The workspace file makes detection report a monorepo, yet a keyless
      // settings file must stay byte-identical.
      const profile = await detectProject(cwd);
      expect(await run(pnpmWorkspaceTask.check(cwd, profile))).toBe('skip');
      expect(await run(pnpmWorkspaceTask.dryRun(cwd, profile))).toEqual([]);
      await expect(readWorkspace(cwd)).resolves.toBe(content);
    }, content);
  });

  test('skips an existing empty file', async () => {
    await withPnpmProject(async (cwd) => {
      const profile = await detectProject(cwd);
      expect(await run(pnpmWorkspaceTask.check(cwd, profile))).toBe('skip');
      expect(await run(pnpmWorkspaceTask.dryRun(cwd, profile))).toEqual([]);
      await expect(readWorkspace(cwd)).resolves.toBe('');
    }, '');
  });

  test('inserts both globs into an empty packages list', async () => {
    const content = [
      'packages:',
      '  # TODO add workspace globs',
      '',
      'catalog:',
      '  react: ^19.0.0',
      '',
    ].join('\n');
    const expected = [
      'packages:',
      "  - 'apps/*'",
      "  - 'packages/*'",
      '  # TODO add workspace globs',
      '',
      'catalog:',
      '  react: ^19.0.0',
      '',
    ].join('\n');
    await withPnpmProject(async (cwd) => {
      const profile = await detectProject(cwd);
      expect(await run(pnpmWorkspaceTask.check(cwd, profile))).toBe('patch');
      await run(pnpmWorkspaceTask.apply(cwd, profile));
      await expect(readWorkspace(cwd)).resolves.toBe(expected);
    }, content);
  });

  test('matches the existing quote style when inserting', async () => {
    const content = ['packages:', '  - "apps/*"', ''].join('\n');
    const expected = ['packages:', '  - "apps/*"', '  - "packages/*"', ''].join(
      '\n'
    );
    await withPnpmProject(async (cwd) => {
      const profile = await detectProject(cwd);
      await run(pnpmWorkspaceTask.apply(cwd, profile));
      await expect(readWorkspace(cwd)).resolves.toBe(expected);
    }, content);

    const unquoted = ['packages:', '  - apps/*', ''].join('\n');
    const unquotedExpected = [
      'packages:',
      '  - apps/*',
      '  - packages/*',
      '',
    ].join('\n');
    await withPnpmProject(async (cwd) => {
      const profile = await detectProject(cwd);
      await run(pnpmWorkspaceTask.apply(cwd, profile));
      await expect(readWorkspace(cwd)).resolves.toBe(unquotedExpected);
    }, unquoted);
  });

  test('skips a flow-style packages list with both globs', async () => {
    const content = 'packages: [apps/*, "./packages/*"]\n';
    await withPnpmProject(async (cwd) => {
      const profile = await detectProject(cwd);
      expect(await run(pnpmWorkspaceTask.check(cwd, profile))).toBe('skip');
      expect(await run(pnpmWorkspaceTask.dryRun(cwd, profile))).toEqual([]);
    }, content);
  });

  test('reports conflict for a flow-style list missing a glob', async () => {
    const content = 'packages: [apps/*]\n';
    await withPnpmProject(async (cwd) => {
      const profile = await detectProject(cwd);
      expect(await run(pnpmWorkspaceTask.check(cwd, profile))).toBe('conflict');
      await expect(readWorkspace(cwd)).resolves.toBe(content);
    }, content);
  });

  test('reports conflict for an unparseable packages value', async () => {
    const content = 'packages: { apps: true }\n';
    await withPnpmProject(async (cwd) => {
      const profile = await detectProject(cwd);
      expect(await run(pnpmWorkspaceTask.check(cwd, profile))).toBe('conflict');
      await expect(readWorkspace(cwd)).resolves.toBe(content);
    }, content);
  });

  test('preserves CRLF line endings when inserting', async () => {
    const content = 'packages:\r\ncatalog:\r\n  react: ^19.0.0\r\n';
    const expected =
      "packages:\r\n  - 'apps/*'\r\n  - 'packages/*'\r\ncatalog:\r\n  react: ^19.0.0\r\n";
    await withPnpmProject(async (cwd) => {
      const profile = await detectProject(cwd);
      const diffs = await run(pnpmWorkspaceTask.dryRun(cwd, profile));
      expect(diffs[0].after).toBe(expected);
      await run(pnpmWorkspaceTask.apply(cwd, profile));
      await expect(readWorkspace(cwd)).resolves.toBe(expected);
      expect(await run(pnpmWorkspaceTask.check(cwd, profile))).toBe('skip');
    }, content);
  });

  test('inserts a missing glob when the file has no trailing newline', async () => {
    const content = 'packages:\n  - apps/*';
    const expected = ['packages:', '  - apps/*', '  - packages/*', ''].join(
      '\n'
    );
    await withPnpmProject(async (cwd) => {
      const profile = await detectProject(cwd);
      expect(await run(pnpmWorkspaceTask.check(cwd, profile))).toBe('patch');
      await run(pnpmWorkspaceTask.apply(cwd, profile));
      const applied = await readWorkspace(cwd);
      expect(applied).toBe(expected);
      // `check` only returns `skip` when the file parses and both globs are
      // separate sequence items.
      expect(await run(pnpmWorkspaceTask.check(cwd, profile))).toBe('skip');
      expect(await run(pnpmWorkspaceTask.dryRun(cwd, profile))).toEqual([]);
    }, content);
  });

  test('inserts both globs when the packages key ends the file', async () => {
    const content = 'packages:';
    const expected = ['packages:', "  - 'apps/*'", "  - 'packages/*'", ''].join(
      '\n'
    );
    await withPnpmProject(async (cwd) => {
      const profile = await detectProject(cwd);
      expect(await run(pnpmWorkspaceTask.check(cwd, profile))).toBe('patch');
      await run(pnpmWorkspaceTask.apply(cwd, profile));
      const applied = await readWorkspace(cwd);
      expect(applied).toBe(expected);
      expect(await run(pnpmWorkspaceTask.check(cwd, profile))).toBe('skip');
      expect(await run(pnpmWorkspaceTask.dryRun(cwd, profile))).toEqual([]);
    }, content);
  });

  test('reports conflict when the last packages item spans multiple lines', async () => {
    const content = [
      'packages:',
      "  - 'apps/*'",
      '  - |-',
      '    internal/*',
      '',
    ].join('\n');
    await withPnpmProject(async (cwd) => {
      const profile = await detectProject(cwd);
      expect(await run(pnpmWorkspaceTask.check(cwd, profile))).toBe('conflict');
      await expect(readWorkspace(cwd)).resolves.toBe(content);
    }, content);
  });

  test('inserts a missing glob before a document end marker', async () => {
    const content = ['packages:', "  - 'apps/*'", '...', ''].join('\n');
    const expected = [
      'packages:',
      "  - 'apps/*'",
      "  - 'packages/*'",
      '...',
      '',
    ].join('\n');
    await withPnpmProject(async (cwd) => {
      const profile = await detectProject(cwd);
      expect(await run(pnpmWorkspaceTask.check(cwd, profile))).toBe('patch');
      await run(pnpmWorkspaceTask.apply(cwd, profile));
      await expect(readWorkspace(cwd)).resolves.toBe(expected);
      expect(await run(pnpmWorkspaceTask.check(cwd, profile))).toBe('skip');
    }, content);
  });

  test('leaves single-package workspace content untouched', async () => {
    await withPnpmProject(async (cwd) => {
      // Detection treats any directory holding pnpm-workspace.yaml as a
      // monorepo root, so resolve the single-package profile before the file
      // exists. Existing content such as onlyBuiltDependencies must survive.
      const profile = await detectProject(cwd);
      const content = ['onlyBuiltDependencies:', '  - esbuild', ''].join('\n');
      await fs.writeFile(workspacePath(cwd), content);
      expect(await run(pnpmWorkspaceTask.check(cwd, profile))).toBe('skip');
      expect(await run(pnpmWorkspaceTask.dryRun(cwd, profile))).toEqual([]);
      await expect(readWorkspace(cwd)).resolves.toBe(content);
    });
  });
});

describe('versionrcTask', () => {
  test('is applicable to all projects', async () => {
    const profile = await detectProject(
      path.join(fixtures, 'react-vite-tailwind')
    );
    expect(versionrcTask.applicable(profile)).toBe(true);
  });

  test('returns new when .versionrc.json is missing', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-vrc-check-')
    );
    try {
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({ name: 'vrc-check-test' })
      );
      const profile = await detectProject(tmpDir);
      const status = await run(versionrcTask.check(tmpDir, profile));
      expect(status).toBe('new');
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('dryRun returns expected content', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-vrc-dryrun-')
    );
    try {
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({ name: 'vrc-dryrun-test' })
      );
      const profile = await detectProject(tmpDir);
      const diffs = await run(versionrcTask.dryRun(tmpDir, profile));
      expect(diffs.length).toBe(1);
      expect(diffs[0].filepath).toBe('.versionrc.json');
      expect(diffs[0].before).toBeNull();
      expect(diffs[0].after).toContain('"bumpFiles"');
      expect(diffs[0].after).toContain('"feat"');
      expect(diffs[0].after).toContain('"fix"');
      expect(diffs[0].after).toContain('"refactor"');
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('apply writes the expected file', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-versionrc-')
    );
    try {
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({ name: 'apply-test' })
      );
      const profile = await detectProject(tmpDir);
      await run(versionrcTask.apply(tmpDir, profile));
      const content = await fs.readFile(
        path.join(tmpDir, '.versionrc.json'),
        'utf-8'
      );
      const parsed = JSON.parse(content);
      expect(parsed.bumpFiles).toEqual(['package.json']);
      expect(parsed.types).toBeDefined();
      expect(parsed.types[0].type).toBe('feat');
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });
});

describe('task registration', () => {
  test('both tasks are registered in getAllTasks()', () => {
    const tasks = getAllTasks();
    const ids = tasks.map((t) => t.id);
    expect(ids).toContain('workspace/pnpm-workspace');
    expect(ids).toContain('release/versionrc');
  });

  test('pnpmWorkspaceTask is exported', () => {
    expect(pnpmWorkspaceTask).toBeDefined();
    expect(pnpmWorkspaceTask.id).toBe('workspace/pnpm-workspace');
  });

  test('versionrcTask is exported', () => {
    expect(versionrcTask).toBeDefined();
    expect(versionrcTask.id).toBe('release/versionrc');
  });
});
