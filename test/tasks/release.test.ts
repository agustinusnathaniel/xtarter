import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect } from 'vite-plus/test';

import { releaseWorkflowTask } from '../../packages/tasks/src/ci/release.js';
import { catVersionTask } from '../../packages/tasks/src/release/cat-version.js';
import { commitlintTask } from '../../packages/tasks/src/release/commitlint.js';
import { czgTask } from '../../packages/tasks/src/release/czg.js';
import { renderReleaseWorkflow } from '../../packages/tasks/src/templates/workflows/release-yml.js';
import { fixtureDir, fixtureProfile, withProject } from '../helpers/project.js';
import { run } from '../helpers/run.js';

describe('commitlintTask', () => {
  test('is applicable to all projects', async () => {
    const profile = await fixtureProfile('react-vite-tailwind');
    expect(commitlintTask.applicable(profile)).toBe(true);
  });

  test('returns new on clean fixture', async () => {
    const profile = await fixtureProfile('react-vite-tailwind');
    const status = await run(
      commitlintTask.check(fixtureDir('react-vite-tailwind'), profile)
    );
    expect(status).toBe('new');
  });

  test('dryRun returns diffs', async () => {
    const profile = await fixtureProfile('react-vite-tailwind');
    const diffs = await run(
      commitlintTask.dryRun(fixtureDir('react-vite-tailwind'), profile)
    );
    expect(diffs.length).toBeGreaterThan(0);
    expect(diffs[0].before).toBeNull();
  });
});

describe('czgTask', () => {
  test('is applicable to all projects', async () => {
    const profile = await fixtureProfile('react-vite-tailwind');
    expect(czgTask.applicable(profile)).toBe(true);
  });

  test('returns new when script is missing', async () => {
    const profile = await fixtureProfile('react-vite-tailwind');
    const status = await run(
      czgTask.check(fixtureDir('react-vite-tailwind'), profile)
    );
    expect(status).toBe('new');
  });

  test('dryRun includes package.json diff', async () => {
    const profile = await fixtureProfile('react-vite-tailwind');
    const diffs = await run(
      czgTask.dryRun(fixtureDir('react-vite-tailwind'), profile)
    );
    const pkgDiff = diffs.find((d) => d.filepath === 'package.json');
    expect(pkgDiff).toBeDefined();
    expect(pkgDiff?.after).toContain('czg');
  });
});

describe('catVersionTask', () => {
  test('is applicable to all projects', async () => {
    const profile = await fixtureProfile('react-vite-tailwind');
    expect(catVersionTask.applicable(profile)).toBe(true);
  });

  test('returns new when dep and scripts are missing', async () => {
    const profile = await fixtureProfile('react-vite-tailwind');
    const status = await run(
      catVersionTask.check(fixtureDir('react-vite-tailwind'), profile)
    );
    expect(status).toBe('new');
  });

  test('dryRun includes .versionrc diff', async () => {
    const profile = await fixtureProfile('react-vite-tailwind');
    const diffs = await run(
      catVersionTask.dryRun(fixtureDir('react-vite-tailwind'), profile)
    );
    const versionrcDiff = diffs.find((d) => d.filepath === '.versionrc');
    expect(versionrcDiff).toBeDefined();
  });

  test('skips release script when it already exists with a different value', async () => {
    await withProject(
      {
        'package.json': JSON.stringify(
          {
            devDependencies: {
              typescript: '^5.3.0',
            },
            name: 'release-conflict',
            scripts: {
              release: 'custom-release',
            },
            type: 'module',
          },
          null,
          2
        ),
      },
      async ({ cwd, profile }) => {
        const status = await run(catVersionTask.check(cwd, profile));
        const diffs = await run(catVersionTask.dryRun(cwd, profile));
        const pkgDiff = diffs.find((d) => d.filepath === 'package.json');

        expect(status).toBe('patch');
        expect(pkgDiff).toBeUndefined();
      }
    );
  });
});

describe('releaseWorkflowTask', () => {
  test('renders tag-push workflow for non-changeset projects', async () => {
    const profile = await fixtureProfile('react-vite-tailwind');
    const result = renderReleaseWorkflow(profile, null);
    expect(result).toContain('tags:');
    expect(result).toContain("- 'v*'");
    expect(result).not.toContain('changesets/action');
  });

  test('renders changeset workflow for projects with .changeset config', async () => {
    await withProject(
      {
        '.changeset/config.json': JSON.stringify({ baseBranch: 'main' }),
        'package.json': JSON.stringify({ name: 'test-pkg', private: true }),
      },
      async ({ profile }) => {
        expect(profile.existing.changeset).toBe(true);

        const result = renderReleaseWorkflow(profile, null);
        expect(result).toContain('changesets/action@v2');
        expect(result).not.toContain('changesets/action@v1');
        expect(result).toContain('version-script: pnpm run version-packages');
        expect(result).toContain('publish-script: pnpm run release');
        expect(result).toContain('id-token: write');
        expect(result).toContain('workflow_dispatch');
      }
    );
  });

  test('detects changeset via @changesets/cli dependency', async () => {
    await withProject(
      {
        'package.json': JSON.stringify({
          devDependencies: {
            '@changesets/cli': '^2.31.0',
          },
          name: 'test-pkg',
        }),
      },
      async ({ profile }) => {
        expect(profile.existing.changeset).toBe(true);
      }
    );
  });

  test('returns new when no release workflow exists (non-changeset)', async () => {
    const profile = await fixtureProfile('react-vite-tailwind');
    const status = await run(
      releaseWorkflowTask.check(fixtureDir('react-vite-tailwind'), profile)
    );
    expect(status).toBe('new');
  });

  test('returns skip when existing workflow matches rendered template', async () => {
    await withProject(
      { 'package.json': JSON.stringify({ name: 'test-pkg', private: true }) },
      async ({ cwd, profile }) => {
        const rendered = renderReleaseWorkflow(profile, null);

        await fs.mkdir(path.join(cwd, '.github', 'workflows'), {
          recursive: true,
        });
        await fs.writeFile(
          path.join(cwd, '.github', 'workflows', 'release.yml'),
          rendered
        );

        const status = await run(releaseWorkflowTask.check(cwd, profile));
        expect(status).toBe('skip');
      }
    );
  });

  test('returns patch when changeset workflow exists with changesets/action but differs', async () => {
    const existing = `name: Release

on:
  push:
    branches:
      - main

jobs:
  release:
    name: Release
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: changesets/action@v1
        with:
          publish: pnpm release
`;

    await withProject(
      {
        '.changeset/config.json': JSON.stringify({ baseBranch: 'main' }),
        '.github/workflows/release.yml': existing,
        'package.json': JSON.stringify({ name: 'test-pkg', private: true }),
      },
      async ({ cwd, profile }) => {
        const status = await run(releaseWorkflowTask.check(cwd, profile));
        expect(status).toBe('patch');
      }
    );
  });

  test('returns conflict when changeset project has non-changeset release job', async () => {
    const existing = `name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - run: echo "custom release"
`;

    await withProject(
      {
        '.changeset/config.json': JSON.stringify({ baseBranch: 'main' }),
        '.github/workflows/release.yml': existing,
        'package.json': JSON.stringify({ name: 'test-pkg', private: true }),
      },
      async ({ cwd, profile }) => {
        const status = await run(releaseWorkflowTask.check(cwd, profile));
        expect(status).toBe('conflict');
      }
    );
  });
});
