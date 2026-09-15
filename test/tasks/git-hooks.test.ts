import { describe, expect } from 'vite-plus/test';

import { gitHooksTask } from '../../packages/tasks/src/release/git-hooks.js';
import { fixtureDir, fixtureProfile, withProject } from '../helpers/project.js';
import { run } from '../helpers/run.js';

const huskyFiles = {
  '.husky/commit-msg': 'content',
  '.husky/pre-commit': 'content',
  '.husky/pre-push': 'content',
  '.husky/prepare-commit-msg': 'content',
};

const prepareCommitMsgCases: Array<
  [name: string, dep: string, version: string]
> = [
  ['prepare-commit-msg runs cz when czg is installed', 'czg', '^1.0.0'],
  [
    'prepare-commit-msg runs cz when commitizen is installed',
    'commitizen',
    '^4.0.0',
  ],
];

describe('gitHooksTask', () => {
  test('applies to any project', () => {
    expect(gitHooksTask.applicable({} as never)).toBe(true);
  });

  test('returns new on clean fixture', async () => {
    const profile = await fixtureProfile('react-vite-tailwind');
    const status = await run(
      gitHooksTask.check(fixtureDir('react-vite-tailwind'), profile)
    );
    expect(status).toBe('new');
  });

  test('creates .husky files in dryRun for non-vite+ projects', async () => {
    await withProject(
      { 'package.json': { name: 'hooks-test', scripts: {} } },
      async ({ cwd, profile }) => {
        const diffs = await run(gitHooksTask.dryRun(cwd, profile));
        const filepaths = diffs.map((d) => d.filepath);
        expect(filepaths).toContain('.husky/commit-msg');
        expect(filepaths).toContain('.husky/prepare-commit-msg');
        expect(filepaths).toContain('.husky/pre-commit');
        expect(filepaths).toContain('.husky/pre-push');
      }
    );
  });

  test('uses turbo pre-push for turbo monorepos', async () => {
    const profile = await fixtureProfile('monorepo-turbo');
    const diffs = await run(
      gitHooksTask.dryRun(fixtureDir('monorepo-turbo'), profile)
    );
    const prePush = diffs.find((d) => d.filepath.includes('pre-push'));
    expect(prePush?.after).toContain('pnpm run check:turbo');
  });
});

describe('gitHooksTask', () => {
  test('returns patch when hooks exist but prepare script is missing', async () => {
    await withProject(
      {
        ...huskyFiles,
        'package.json': {
          devDependencies: { husky: '^9.0.0' },
          name: 'hooks-test',
          scripts: {},
        },
      },
      async ({ cwd, profile }) => {
        const status = await run(gitHooksTask.check(cwd, profile));
        expect(status).toBe('patch');
      }
    );
  });

  test('returns patch when hooks exist but dep is missing', async () => {
    await withProject(
      {
        ...huskyFiles,
        'package.json': { name: 'hooks-test', scripts: {} },
      },
      async ({ cwd, profile }) => {
        const status = await run(gitHooksTask.check(cwd, profile));
        expect(status).toBe('patch');
      }
    );
  });

  test('prepare-commit-msg is no-op when czg is absent', async () => {
    await withProject(
      { 'package.json': { name: 'hooks-test', scripts: {} } },
      async ({ cwd, profile }) => {
        const diffs = await run(gitHooksTask.dryRun(cwd, profile));
        const prepareCommitMsg = diffs.find((d) =>
          d.filepath.includes('prepare-commit-msg')
        );
        expect(prepareCommitMsg?.after).toContain('exit 0');
        expect(prepareCommitMsg?.after).not.toContain('cz');
      }
    );
  });
});

describe('gitHooksTask', () => {
  for (const [name, dep, version] of prepareCommitMsgCases) {
    test(name, async () => {
      await withProject(
        {
          'package.json': {
            devDependencies: { [dep]: version },
            name: 'hooks-test',
            scripts: {},
          },
        },
        async ({ cwd, profile }) => {
          const diffs = await run(gitHooksTask.dryRun(cwd, profile));
          const prepareCommitMsg = diffs.find((d) =>
            d.filepath.includes('prepare-commit-msg')
          );
          expect(prepareCommitMsg?.after).toContain('cz');
          expect(prepareCommitMsg?.after).toContain('--hook');
          expect(prepareCommitMsg?.after).toContain('exec < /dev/tty');
        }
      );
    });
  }
});
