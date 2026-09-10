import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { detectProject, planTasks } from '@xtarterize/core';
import { getAllTasks } from '@xtarterize/tasks';
import { describe, expect } from 'vite-plus/test';

import {
  defineTask,
  type TargetPolicyInput,
} from '../../packages/tasks/src/factory/define-task.js';

const withTempDir = async (
  run: (cwd: string) => Promise<void>
): Promise<void> => {
  const tmpDir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'xtarterize-define-task-')
  );
  try {
    await run(tmpDir);
  } finally {
    await fs.rm(tmpDir, { force: true, recursive: true });
  }
};

const writeFile = (cwd: string, filepath: string, content: string) =>
  fs.writeFile(path.join(cwd, filepath), content);

const readFile = (cwd: string, filepath: string) =>
  fs.readFile(path.join(cwd, filepath), 'utf-8');

const metadata = {
  applicable: () => true,
  group: 'Test',
  id: 'test/define-task',
  label: 'Define task test',
};

describe('defineTask status projection', () => {
  test('text: absent is new, changed is conflict, unchanged is skip', async () => {
    await withTempDir(async (cwd) => {
      const task = defineTask({
        ...metadata,
        targets: [
          {
            filepath: 'AGENTS.md',
            kind: 'text',
            render: () => '# Agents\n',
          },
        ],
      });
      const profile = await detectProject(cwd);

      expect(await task.check(cwd, profile)).toBe('new');
      const created = await task.dryRun(cwd, profile);
      expect(created).toHaveLength(1);
      expect(created[0]).toEqual({
        after: '# Agents\n',
        before: null,
        filepath: 'AGENTS.md',
      });

      await writeFile(cwd, 'AGENTS.md', '# Different\n');
      expect(await task.check(cwd, profile)).toBe('conflict');
      const changed = await task.dryRun(cwd, profile);
      expect(changed).toHaveLength(1);
      expect(changed[0].before).toBe('# Different\n');
      expect(changed[0].after).toBe('# Agents\n');

      await writeFile(cwd, 'AGENTS.md', '# Agents\n');
      expect(await task.check(cwd, profile)).toBe('skip');
      expect(await task.dryRun(cwd, profile)).toEqual([]);
    });
  });

  test('jsonMerge: absent is new, changed is patch, unchanged is skip', async () => {
    await withTempDir(async (cwd) => {
      const task = defineTask({
        ...metadata,
        targets: [
          {
            filepath: 'tsconfig.json',
            incoming: () => ({ compilerOptions: { strict: true } }),
            kind: 'jsonMerge',
          },
        ],
      });
      const profile = await detectProject(cwd);

      expect(await task.check(cwd, profile)).toBe('new');
      const created = await task.dryRun(cwd, profile);
      expect(created).toHaveLength(1);
      expect(created[0].filepath).toBe('tsconfig.json');
      expect(created[0].before).toBeNull();

      await writeFile(cwd, 'tsconfig.json', '{\n  "compilerOptions": {}\n}\n');
      expect(await task.check(cwd, profile)).toBe('patch');
      const changed = await task.dryRun(cwd, profile);
      expect(changed).toHaveLength(1);
      expect(changed[0].after).toContain('"strict": true');

      await writeFile(
        cwd,
        'tsconfig.json',
        '{\n  "compilerOptions": { "strict": true }\n}\n'
      );
      expect(await task.check(cwd, profile)).toBe('skip');
      expect(await task.dryRun(cwd, profile)).toEqual([]);
    });
  });

  test('packageJson: absent is new, changed is patch, unchanged is skip', async () => {
    await withTempDir(async (cwd) => {
      const task = defineTask({
        ...metadata,
        targets: [
          {
            change: () => ({ scripts: { test: 'vitest run' } }),
            kind: 'packageJson',
          },
        ],
      });
      const profile = await detectProject(cwd);

      expect(await task.check(cwd, profile)).toBe('new');
      const created = await task.dryRun(cwd, profile);
      expect(created).toHaveLength(1);
      expect(created[0].before).toBeNull();

      await writeFile(cwd, 'package.json', '{\n  "name": "example"\n}\n');
      expect(await task.check(cwd, profile)).toBe('patch');
      const changed = await task.dryRun(cwd, profile);
      expect(changed).toHaveLength(1);
      expect(changed[0].after).toContain('"test": "vitest run"');

      await writeFile(
        cwd,
        'package.json',
        '{\n  "scripts": {\n    "test": "vitest run"\n  }\n}\n'
      );
      expect(await task.check(cwd, profile)).toBe('skip');
      expect(await task.dryRun(cwd, profile)).toEqual([]);
    });
  });

  test('transform: absent is new, changed is patch, unchanged is skip', async () => {
    await withTempDir(async (cwd) => {
      const task = defineTask({
        ...metadata,
        targets: [
          {
            extensions: ['.ts', '.js'],
            filepath: 'vite.config',
            kind: 'transform',
            transform: (content) => content.replace('[]', "['plugin']"),
          },
        ],
      });
      const profile = await detectProject(cwd);

      expect(await task.check(cwd, profile)).toBe('new');
      expect(await task.dryRun(cwd, profile)).toEqual([]);

      await writeFile(
        cwd,
        'vite.config.ts',
        'export default { plugins: [] }\n'
      );
      expect(await task.check(cwd, profile)).toBe('patch');
      const changed = await task.dryRun(cwd, profile);
      expect(changed).toHaveLength(1);
      expect(changed[0].filepath).toBe('vite.config.ts');

      await writeFile(
        cwd,
        'vite.config.ts',
        "export default { plugins: ['plugin'] }\n"
      );
      expect(await task.check(cwd, profile)).toBe('skip');
      expect(await task.dryRun(cwd, profile)).toEqual([]);
    });
  });

  test('action: status comes from the probe with no file diff', async () => {
    await withTempDir(async (cwd) => {
      const task = defineTask({
        ...metadata,
        actions: [
          {
            check: async () => 'patch',
            kind: 'action',
            run: async () => undefined,
          },
        ],
      });
      const profile = await detectProject(cwd);

      expect(await task.check(cwd, profile)).toBe('patch');
      expect(await task.dryRun(cwd, profile)).toEqual([]);
    });
  });
});

describe('defineTask policy hook', () => {
  test('policy sees the diff before/after and can report conflict', async () => {
    await withTempDir(async (cwd) => {
      await writeFile(
        cwd,
        'tsconfig.json',
        '{\n  "compilerOptions": { "strict": false }\n}\n'
      );
      const seen: Array<TargetPolicyInput> = [];
      const task = defineTask({
        ...metadata,
        targets: [
          {
            filepath: 'tsconfig.json',
            incoming: () => ({ compilerOptions: { strict: true } }),
            kind: 'jsonMerge',
            policy: (input) => {
              seen.push(input);
              return 'conflict';
            },
          },
        ],
      });
      const profile = await detectProject(cwd);

      expect(await task.check(cwd, profile)).toBe('conflict');
      const diffs = await task.dryRun(cwd, profile);
      expect(diffs).toHaveLength(1);
      expect(seen).toHaveLength(2);
      for (const input of seen) {
        expect(input).toEqual({
          after: diffs[0].after,
          before: diffs[0].before,
        });
      }
      // mergeJson keeps the existing strict value, so the policy saw no
      // content change and still reported the conflict.
      expect(diffs[0].after).toBe(diffs[0].before);
      expect(diffs[0].after).toContain('"strict": false');
    });
  });
});

describe('defineTask dependencies', () => {
  test('a static list is returned as declared', async () => {
    await withTempDir(async (cwd) => {
      const task = defineTask({
        ...metadata,
        deps: [{ depName: 'acme', dev: true }],
        targets: [
          { filepath: 'acme.json', kind: 'text', render: () => '{}\n' },
        ],
      });
      const profile = await detectProject(cwd);

      const deps = await task.getDeps?.(cwd, profile);
      expect(deps).toEqual([{ depName: 'acme', dev: true }]);
    });
  });

  test('a resolver gates a dependency on the resolution status', async () => {
    await withTempDir(async (cwd) => {
      const task = defineTask({
        ...metadata,
        deps: (resolution) =>
          resolution.status === 'skip'
            ? []
            : [{ depName: 'needed-only-when-changed', dev: true }],
        targets: [
          { filepath: 'acme.json', kind: 'text', render: () => '{}\n' },
        ],
      });
      const profile = await detectProject(cwd);

      const needed = await task.getDeps?.(cwd, profile);
      expect(needed).toEqual([
        { depName: 'needed-only-when-changed', dev: true },
      ]);

      await writeFile(cwd, 'acme.json', '{}\n');
      const satisfied = await task.getDeps?.(cwd, profile);
      expect(satisfied).toEqual([]);
    });
  });

  test('an existing matching file with a missing dependency is patch', async () => {
    await withTempDir(async (cwd) => {
      await writeFile(cwd, 'acme.json', '{}\n');
      const task = defineTask({
        ...metadata,
        deps: [{ depName: 'acme', dev: true }],
        targets: [
          { filepath: 'acme.json', kind: 'text', render: () => '{}\n' },
        ],
      });
      const profile = await detectProject(cwd);

      expect(await task.check(cwd, profile)).toBe('patch');
      expect(await task.dryRun(cwd, profile)).toEqual([]);
      const deps = await task.getDeps?.(cwd, profile);
      expect(deps).toEqual([{ depName: 'acme', dev: true }]);

      const plan = await planTasks({ cwd, profile, tasks: [task] });
      expect(plan.dependencies).toEqual([{ depName: 'acme', dev: true }]);
      expect(plan.files).toEqual([]);
    });
  });

  test('an existing matching file with the dependency installed is skip', async () => {
    await withTempDir(async (cwd) => {
      await writeFile(cwd, 'acme.json', '{}\n');
      await writeFile(
        cwd,
        'package.json',
        `${JSON.stringify(
          { devDependencies: { acme: '^1.0.0' }, name: 'acme-installed' },
          null,
          2
        )}\n`
      );
      const task = defineTask({
        ...metadata,
        deps: [{ depName: 'acme', dev: true }],
        targets: [
          { filepath: 'acme.json', kind: 'text', render: () => '{}\n' },
        ],
      });
      const profile = await detectProject(cwd);

      expect(await task.check(cwd, profile)).toBe('skip');
      expect(await task.dryRun(cwd, profile)).toEqual([]);
    });
  });

  test('an absent target stays new when a declared dependency is missing', async () => {
    await withTempDir(async (cwd) => {
      const task = defineTask({
        ...metadata,
        deps: [{ depName: 'acme', dev: true }],
        targets: [
          { filepath: 'acme.json', kind: 'text', render: () => '{}\n' },
        ],
      });
      const profile = await detectProject(cwd);

      expect(await task.check(cwd, profile)).toBe('new');
      const deps = await task.getDeps?.(cwd, profile);
      expect(deps).toEqual([{ depName: 'acme', dev: true }]);
    });
  });

  test('a resolver-provided dependency is checked against the project', async () => {
    await withTempDir(async (cwd) => {
      await writeFile(cwd, 'acme.json', '{}\n');
      const task = defineTask({
        ...metadata,
        deps: () => [{ depName: 'acme-tool', dev: false }],
        targets: [
          { filepath: 'acme.json', kind: 'text', render: () => '{}\n' },
        ],
      });
      const profile = await detectProject(cwd);

      expect(await task.check(cwd, profile)).toBe('patch');
      const deps = await task.getDeps?.(cwd, profile);
      expect(deps).toEqual([{ depName: 'acme-tool', dev: false }]);
    });
  });
});

describe('defineTask transform target', () => {
  test('diffs carry the discovered path and apply writes the transformed content', async () => {
    await withTempDir(async (cwd) => {
      await writeFile(
        cwd,
        'vite.config.ts',
        'export default { plugins: [] }\n'
      );
      const task = defineTask({
        ...metadata,
        targets: [
          {
            extensions: ['.ts', '.js', '.mts', '.mjs', '.cjs', '.cts'],
            filepath: 'vite.config',
            kind: 'transform',
            transform: (content) => content.replace('[]', "['checked']"),
          },
        ],
      });
      const profile = await detectProject(cwd);

      const diffs = await task.dryRun(cwd, profile);
      expect(diffs).toHaveLength(1);
      expect(diffs[0].filepath).toBe('vite.config.ts');
      expect(diffs[0].before).toContain('[]');
      expect(diffs[0].after).toContain("['checked']");

      await task.apply(cwd, profile);
      await expect(readFile(cwd, 'vite.config.ts')).resolves.toContain(
        "['checked']"
      );
    });
  });
});

describe('defineTask action', () => {
  test('an action has no file diff and no backup entry', async () => {
    await withTempDir(async (cwd) => {
      await writeFile(
        cwd,
        'package.json',
        `${JSON.stringify({ name: 'action-test' }, null, 2)}\n`
      );
      let runs = 0;
      const task = defineTask({
        ...metadata,
        actions: [
          {
            check: async () => 'new',
            kind: 'action',
            run: async () => {
              runs += 1;
            },
          },
        ],
      });
      const profile = await detectProject(cwd);

      expect(await task.check(cwd, profile)).toBe('new');
      expect(await task.dryRun(cwd, profile)).toEqual([]);

      const plan = await planTasks({ cwd, profile, tasks: [task] });
      expect(plan.files).toEqual([]);
      expect(plan.entries[0].diffs).toEqual([]);

      await task.apply(cwd, profile);
      expect(runs).toBe(1);
    });
  });
});

describe('defineTask searchMeta configTargets', () => {
  test('derives declared filepaths and extension variants from targets', () => {
    const task = defineTask({
      ...metadata,
      searchMeta: {
        keywords: ['derived'],
        tags: ['derived'],
      },
      targets: [
        {
          extensions: ['.ts', '.js'],
          filepath: 'knip.config',
          kind: 'text',
          render: () => '{}\n',
        },
        {
          extensions: ['.json', '.jsonc'],
          filepath: 'biome.json',
          incoming: () => ({}),
          kind: 'jsonMerge',
        },
        { filepath: '.npmrc', kind: 'text', render: () => '' },
      ],
    });

    expect(task.searchMeta?.configTargets).toEqual([
      'knip.config.ts',
      'knip.config.js',
      'biome.json',
      'biome.jsonc',
      '.npmrc',
    ]);
  });

  test('derives package.json for packageJson targets', () => {
    const task = defineTask({
      ...metadata,
      searchMeta: {
        keywords: ['derived'],
        tags: ['derived'],
      },
      targets: [{ change: () => ({}), kind: 'packageJson' }],
    });

    expect(task.searchMeta?.configTargets).toEqual(['package.json']);
  });

  test('keeps an explicit configTargets override', () => {
    const task = defineTask({
      ...metadata,
      searchMeta: {
        configTargets: ['custom.json'],
        keywords: [],
        tags: [],
      },
      targets: [{ filepath: 'custom.config', kind: 'text', render: () => '' }],
    });

    expect(task.searchMeta?.configTargets).toEqual(['custom.json']);
  });
});

describe('task registry validation', () => {
  test('task ids are unique', () => {
    const ids = getAllTasks().map((task) => task.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  test('every task declares complete metadata', () => {
    for (const task of getAllTasks()) {
      expect(task.id, task.id).toBeTruthy();
      expect(task.label, task.id).toBeTruthy();
      expect(task.group, task.id).toBeTruthy();
      expect(task.searchMeta, task.id).toBeDefined();
    }
  });

  test('configTargets are non-empty except the action-only skills task', () => {
    // `agent/skills-install` only runs an action and writes no file, so its
    // explicit empty `configTargets` stays authored instead of derived.
    const actionOnlyIds = new Set(['agent/skills-install']);

    for (const task of getAllTasks()) {
      if (actionOnlyIds.has(task.id)) {
        expect(task.searchMeta?.configTargets, task.id).toEqual([]);
        continue;
      }
      expect(task.searchMeta?.configTargets.length, task.id).toBeGreaterThan(0);
    }
  });
});
