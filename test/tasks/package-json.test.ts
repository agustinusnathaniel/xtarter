import fs from 'node:fs/promises';
import path from 'node:path';
import { withProject } from '@test/helpers/project.js';
import { run } from '@test/helpers/run.js';
import { describe, expect } from 'vite-plus/test';

import { defineTask } from '../../packages/tasks/src/factory/define-task.js';

const readPackageJson = (cwd: string): Promise<string> =>
  fs.readFile(path.join(cwd, 'package.json'), 'utf-8');

const writePackageJson = (cwd: string, content: string): Promise<void> =>
  fs.writeFile(path.join(cwd, 'package.json'), content);

const scriptsTask = defineTask({
  applicable: () => true,
  group: 'Test',
  id: 'test/package-json',
  label: 'package.json owner test',
  targets: [
    {
      change: () => ({ scripts: { test: 'vitest run' } }),
      kind: 'packageJson',
    },
  ],
});

describe('package.json owner', () => {
  test('the previewed change equals the bytes written by apply', async () => {
    await withProject({}, async ({ cwd, profile }) => {
      await writePackageJson(cwd, '{\n  "name": "example"\n}\n');
      const [diff] = await run(scriptsTask.dryRun(cwd, profile));

      await run(scriptsTask.apply(cwd, profile));
      await expect(readPackageJson(cwd)).resolves.toBe(diff?.after);
    });
  });

  test('comments and indentation survive a change', async () => {
    await withProject({}, async ({ cwd, profile }) => {
      await writePackageJson(
        cwd,
        [
          '{',
          '    // keep this comment',
          '    "name": "example",',
          '    "devDependencies": {',
          '        "left-pad": "^1.0.0"',
          '    }',
          '}',
          '',
        ].join('\n')
      );
      await run(scriptsTask.apply(cwd, profile));

      const written = await readPackageJson(cwd);
      expect(written).toContain('// keep this comment');
      expect(written).toContain('\n    "name": "example"');
      expect(written).toContain('\n        "left-pad": "^1.0.0"');
      expect(written).toContain('\n        "test": "vitest run"');
    });
  });

  test('applying an already-present change writes nothing new', async () => {
    await withProject({}, async ({ cwd, profile }) => {
      await writePackageJson(cwd, '{\n  "name": "example"\n}\n');
      await run(scriptsTask.apply(cwd, profile));
      const afterFirst = await readPackageJson(cwd);

      expect(await run(scriptsTask.check(cwd, profile))).toBe('skip');
      await run(scriptsTask.apply(cwd, profile));
      await expect(readPackageJson(cwd)).resolves.toBe(afterFirst);
    });
  });

  test('an external write between preview and apply survives', async () => {
    await withProject({}, async ({ cwd, profile }) => {
      await writePackageJson(cwd, '{\n  "name": "example"\n}\n');
      await run(scriptsTask.dryRun(cwd, profile));
      await writePackageJson(
        cwd,
        '{\n  "name": "example",\n  "devDependencies": { "new-dep": "^1.0.0" }\n}\n'
      );

      await run(scriptsTask.apply(cwd, profile));
      const written = await readPackageJson(cwd);
      expect(written).toContain('"new-dep": "^1.0.0"');
      expect(written).toContain('"test": "vitest run"');
    });
  });
});
