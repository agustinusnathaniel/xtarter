import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  detectPackageManager,
  detectProject,
  type ProjectProfile,
} from '@xtarterize/core';
import { describe, expect } from 'vite-plus/test';

import type {
  ProfileCacheEntry,
  ProjectFingerprint,
} from '../../packages/core/src/detect/cache.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.resolve(__dirname, '../fixtures');

async function writePkg(dir: string, pkg: Record<string, unknown>) {
  await fs.writeFile(
    path.join(dir, 'package.json'),
    `${JSON.stringify(pkg, null, 2)}\n`
  );
}

async function createMinimalProject(dir: string): Promise<string> {
  await writePkg(dir, {
    dependencies: { react: '^18.2.0' },
    devDependencies: { typescript: '^5.0.0', vite: '^5.0.0' },
    name: 'test-project',
    version: '1.0.0',
  });
  await fs.writeFile(path.join(dir, 'tsconfig.json'), JSON.stringify({}));
  await fs.writeFile(path.join(dir, 'vite.config.ts'), 'export default {}\n');
  return dir;
}

async function createProjectWithoutConfigFiles(dir: string): Promise<string> {
  await writePkg(dir, {
    dependencies: { react: '^18.2.0' },
    devDependencies: { vite: '^5.0.0' },
    name: 'test-project',
    version: '1.0.0',
  });
  return dir;
}

function writeFileIn(project: string, name: string, content: string) {
  return fs.writeFile(path.join(project, name), content);
}

async function writeVscodeSettings(
  project: string,
  settings: Record<string, unknown>
) {
  const target = path.join(project, '.vscode', 'settings.json');
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, JSON.stringify(settings));
}

async function tsconfigRoot(root: string): Promise<string> {
  await createProjectWithoutConfigFiles(root);
  await writeFileIn(root, 'tsconfig.json', '{}');
  return root;
}

async function nestedProject(root: string): Promise<string> {
  const nested = path.join(root, 'apps', 'demo');
  await fs.mkdir(nested, { recursive: true });
  await createProjectWithoutConfigFiles(nested);
  return nested;
}

async function cachePath(dir: string) {
  return path.join(dir, '.xtarterize', 'cache', 'profile-fingerprint.json');
}

async function readCache(dir: string): Promise<ProfileCacheEntry> {
  const content = await fs.readFile(await cachePath(dir), 'utf-8');
  return JSON.parse(content) as ProfileCacheEntry;
}

type FingerprintAssert = (
  fingerprint: ProjectFingerprint,
  before: ProjectFingerprint
) => void;
type Mutation = (root: string, project: string) => Promise<void>;

interface InvalidationCase {
  assertFingerprint?: FingerprintAssert;
  assertProfile?: (
    profile: ProjectProfile,
    project: string
  ) => Promise<void> | void;
  create: (root: string) => Promise<string>;
  /** Ancestor marker content is presence-only, so edits keep the cache. */
  keepCache?: boolean;
  kind:
    | 'rootFile'
    | 'configDir'
    | 'lockfile'
    | 'ancestorMarker'
    | 'cwdMarker'
    | 'packageJson';
  mutate: Mutation;
  name: string;
  setup?: Mutation;
}

const invalidationCases: Array<InvalidationCase> = [
  // ── root files ──
  {
    assertFingerprint: (fingerprint) =>
      expect(
        fingerprint.rootInputs.some((entry) =>
          entry.path.endsWith('tsconfig.json')
        )
      ).toBe(true),
    assertProfile: (profile) => {
      expect(profile.existing.tsconfig).toBe(true);
      expect(profile.typescript).toBe(true);
    },
    create: createProjectWithoutConfigFiles,
    kind: 'rootFile',
    mutate: (_root, project) => writeFileIn(project, 'tsconfig.json', '{}'),
    name: 'adds tsconfig.json',
  },
  {
    assertProfile: (profile) => expect(profile.nodeVersion).toBe('18'),
    create: createProjectWithoutConfigFiles,
    kind: 'rootFile',
    mutate: (_root, project) => writeFileIn(project, '.nvmrc', 'v18\n'),
    name: 'modifies .nvmrc',
    setup: (_root, project) => writeFileIn(project, '.nvmrc', '20\n'),
  },
  {
    assertProfile: (profile) => {
      expect(profile.existing.tsconfig).toBe(false);
      expect(profile.typescript).toBe(false);
    },
    create: tsconfigRoot,
    kind: 'rootFile',
    mutate: (_root, project) => fs.unlink(path.join(project, 'tsconfig.json')),
    name: 'removes tsconfig.json',
  },
  // ── config directories ──
  {
    assertFingerprint: (fingerprint) => {
      const paths = fingerprint.configDirs.map((entry) => entry.path);
      expect(paths.some((p) => p.endsWith('.vscode/settings.json'))).toBe(true);
      expect(paths.some((p) => p.endsWith('.github'))).toBe(true);
    },
    assertProfile: (profile) =>
      expect(profile.existing.vscodeSettings).toBe(true),
    create: createMinimalProject,
    kind: 'configDir',
    mutate: async (_root, project) => {
      await writeVscodeSettings(project, {});
      await fs.mkdir(path.join(project, '.github'), { recursive: true });
    },
    name: 'adds .vscode/settings.json and .github/',
  },
  {
    assertProfile: (profile) =>
      expect(profile.existing.vscodeSettings).toBe(true),
    create: createMinimalProject,
    kind: 'configDir',
    mutate: (_root, project) =>
      writeVscodeSettings(project, { editor: { fontSize: 14 } }),
    name: 'modifies .vscode/settings.json',
    setup: (_root, project) => writeVscodeSettings(project, {}),
  },
  {
    assertProfile: (profile) =>
      expect(profile.existing.vscodeSettings).toBe(false),
    create: createMinimalProject,
    kind: 'configDir',
    mutate: (_root, project) =>
      fs.rm(path.join(project, '.vscode'), { force: true, recursive: true }),
    name: 'removes .vscode/',
    setup: (_root, project) => writeVscodeSettings(project, {}),
  },
  // ── lockfiles ──
  {
    assertProfile: (profile) => expect(profile.packageManager).toBe('pnpm'),
    create: createMinimalProject,
    kind: 'lockfile',
    mutate: (_root, project) =>
      writeFileIn(project, 'pnpm-lock.yaml', "lockfileVersion: '9.0'\n"),
    name: 'adds pnpm-lock.yaml',
  },
  {
    assertFingerprint: (fingerprint, before) => {
      const afterEntry = fingerprint.lockfiles[0];
      const beforeEntry = before.lockfiles[0];
      expect(afterEntry?.path).toBe(beforeEntry?.path);
      expect(afterEntry?.size).not.toBe(beforeEntry?.size);
    },
    assertProfile: (profile) => expect(profile.packageManager).toBe('pnpm'),
    create: createMinimalProject,
    kind: 'lockfile',
    mutate: (_root, project) =>
      writeFileIn(
        project,
        'pnpm-lock.yaml',
        "lockfileVersion: '9.0'\nsettings:\n  autoInstallPeers: true\n"
      ),
    name: 'modifies pnpm-lock.yaml',
    setup: (_root, project) =>
      writeFileIn(project, 'pnpm-lock.yaml', "lockfileVersion: '9.0'\n"),
  },
  {
    assertFingerprint: (fingerprint) =>
      expect(fingerprint.lockfiles).toEqual([]),
    create: createMinimalProject,
    kind: 'lockfile',
    mutate: (_root, project) => fs.unlink(path.join(project, 'yarn.lock')),
    name: 'removes yarn.lock',
    setup: (_root, project) =>
      writeFileIn(project, 'yarn.lock', '# yarn lockfile\n'),
  },
  {
    assertFingerprint: (fingerprint) =>
      expect(
        fingerprint.lockfiles.some((entry) => entry.path.endsWith('bun.lock'))
      ).toBe(true),
    assertProfile: (profile) => expect(profile.packageManager).toBe('bun'),
    create: createMinimalProject,
    kind: 'lockfile',
    mutate: (_root, project) => writeFileIn(project, 'bun.lock', '{}\n'),
    name: 'adds bun.lock',
  },
  {
    assertProfile: (profile) => expect(profile.packageManager).toBe('bun'),
    create: createMinimalProject,
    kind: 'lockfile',
    mutate: (_root, project) => writeFileIn(project, 'bun.lock', '{}\n'),
    name: 'adds bun.lock alongside yarn.lock',
    setup: (_root, project) =>
      writeFileIn(project, 'yarn.lock', '# yarn lockfile\n'),
  },
  {
    assertProfile: async (profile, project) => {
      // nypm precedence decides the winner, so compare against fresh detection
      expect(profile.packageManager).toBe(await detectPackageManager(project));
    },
    create: createMinimalProject,
    kind: 'lockfile',
    mutate: (_root, project) =>
      writeFileIn(project, 'package-lock.json', '{}\n'),
    name: 'adds package-lock.json alongside pnpm-lock.yaml',
    setup: (_root, project) =>
      writeFileIn(project, 'pnpm-lock.yaml', "lockfileVersion: '9.0'\n"),
  },
  // ── package.json ──
  {
    assertProfile: (profile) => expect(profile.framework).toBe('react'),
    create: async (root) => root,
    kind: 'packageJson',
    mutate: (_root, project) =>
      writePkg(project, {
        dependencies: { react: '^18.2.0' },
        name: 'added-project',
        version: '1.0.0',
      }),
    name: 'adds package.json',
  },
  {
    assertProfile: (profile) => expect(profile.framework).toBe('vue'),
    create: createMinimalProject,
    kind: 'packageJson',
    mutate: (_root, project) =>
      writePkg(project, {
        dependencies: { vue: '^3.4.0' },
        devDependencies: { typescript: '^5.0.0', vite: '^5.0.0' },
        name: 'test-project',
        version: '1.0.0',
      }),
    name: 'modifies package.json dependencies',
  },
  {
    assertFingerprint: (fingerprint) => {
      expect(fingerprint.packageJson.mtimeMs).toBe(0);
      expect(fingerprint.packageJson.size).toBe(0);
    },
    assertProfile: (profile) => {
      expect(profile.framework).toBeNull();
      expect(profile.runtime).toBe('node');
    },
    create: createMinimalProject,
    kind: 'packageJson',
    mutate: (_root, project) => fs.unlink(path.join(project, 'package.json')),
    name: 'removes package.json',
  },
  // ── ancestor markers ──
  {
    assertFingerprint: (fingerprint) =>
      expect(
        fingerprint.ancestorInputs.some((entry) =>
          entry.path.endsWith('pnpm-workspace.yaml')
        )
      ).toBe(true),
    assertProfile: (profile) => {
      expect(profile.monorepo).toBe(true);
      expect(profile.workspaceRoot).toBe(false);
    },
    create: nestedProject,
    kind: 'ancestorMarker',
    mutate: (root) =>
      writeFileIn(root, 'pnpm-workspace.yaml', "packages:\n  - 'apps/*'\n"),
    name: 'adds pnpm-workspace.yaml at the parent',
  },
  {
    assertProfile: (profile) => expect(profile.monorepo).toBe(true),
    create: nestedProject,
    keepCache: true,
    kind: 'ancestorMarker',
    mutate: (root) =>
      writeFileIn(
        root,
        'pnpm-workspace.yaml',
        "packages:\n  - 'apps/*'\n  - 'services/*'\n"
      ),
    name: 'modifies pnpm-workspace.yaml at the parent',
    setup: (root) =>
      writeFileIn(root, 'pnpm-workspace.yaml', "packages:\n  - 'apps/*'\n"),
  },
  {
    assertProfile: (profile) => expect(profile.monorepo).toBe(false),
    create: nestedProject,
    kind: 'ancestorMarker',
    mutate: (root) => fs.unlink(path.join(root, 'pnpm-workspace.yaml')),
    name: 'removes pnpm-workspace.yaml at the parent',
    setup: (root) =>
      writeFileIn(root, 'pnpm-workspace.yaml', "packages:\n  - 'apps/*'\n"),
  },
  {
    assertFingerprint: (fingerprint) =>
      expect(
        fingerprint.ancestorInputs.some((entry) =>
          entry.path.endsWith('services')
        )
      ).toBe(true),
    assertProfile: (profile) => expect(profile.monorepo).toBe(true),
    create: nestedProject,
    kind: 'ancestorMarker',
    mutate: (root) =>
      fs.mkdir(path.join(root, 'services'), { recursive: true }),
    name: 'adds services/ next to apps/ at the parent',
  },
  // ── cwd markers ──
  {
    assertFingerprint: (fingerprint) =>
      expect(
        fingerprint.cwdInputs.some((entry) => entry.path.endsWith('.git'))
      ).toBe(true),
    assertProfile: (profile) => expect(profile.hasGit).toBe(true),
    create: createMinimalProject,
    kind: 'cwdMarker',
    mutate: (_root, project) =>
      fs.mkdir(path.join(project, '.git'), { recursive: true }),
    name: 'adds .git',
  },
  {
    assertFingerprint: (fingerprint, before) =>
      expect(fingerprint.cwdInputs[0]?.mtimeMs).not.toBe(
        before.cwdInputs[0]?.mtimeMs
      ),
    assertProfile: (profile) => expect(profile.hasGit).toBe(true),
    create: createMinimalProject,
    kind: 'cwdMarker',
    mutate: async (_root, project) => {
      const markerTime = new Date('2000-01-01T00:00:00.000Z');
      await fs.utimes(path.join(project, '.git'), markerTime, markerTime);
    },
    name: 'modifies .git',
    setup: (_root, project) =>
      fs.mkdir(path.join(project, '.git'), { recursive: true }),
  },
  {
    assertProfile: (profile) => expect(profile.hasGit).toBe(false),
    create: createMinimalProject,
    kind: 'cwdMarker',
    mutate: (_root, project) =>
      fs.rm(path.join(project, '.git'), { force: true, recursive: true }),
    name: 'removes .git',
    setup: (_root, project) =>
      fs.mkdir(path.join(project, '.git'), { recursive: true }),
  },
  {
    assertFingerprint: (fingerprint) =>
      expect(
        fingerprint.cwdInputs.some((entry) => entry.path.endsWith('services'))
      ).toBe(true),
    assertProfile: (profile) => expect(profile.monorepo).toBe(true),
    create: createMinimalProject,
    kind: 'cwdMarker',
    mutate: (_root, project) =>
      fs.mkdir(path.join(project, 'services'), { recursive: true }),
    name: 'adds services/ at the project root',
    setup: (_root, project) =>
      fs.mkdir(path.join(project, 'apps'), { recursive: true }),
  },
];

describe('detect cache', () => {
  test('computes and caches on first run', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cache-first-'));
    await createMinimalProject(dir);

    const profile = await detectProject(dir);
    expect(profile.framework).toBe('react');
    expect(profile.bundler).toBe('vite');
    expect(profile.typescript).toBe(true);

    const written = await readCache(dir);
    expect(written.version).toBe(3);
    expect(written.fingerprint.packageJson.path).toContain('package.json');
    expect(written.profile.framework).toBe('react');
    expect(typeof written.durationMs).toBe('number');
    expect(typeof written.computedAt).toBe('string');

    await fs.rm(dir, { force: true, recursive: true });
  });

  test('returns cached profile on subsequent runs', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cache-hit-'));
    await createMinimalProject(dir);

    const first = await detectProject(dir);
    const second = await detectProject(dir);
    expect(second).toEqual(first);

    await fs.rm(dir, { force: true, recursive: true });
  });

  test('handles corrupt cache gracefully', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cache-corrupt-'));
    await createMinimalProject(dir);

    const first = await detectProject(dir);
    await fs.writeFile(await cachePath(dir), '{invalid json!!!');

    const second = await detectProject(dir);
    expect(second).toEqual(first);

    await fs.rm(dir, { force: true, recursive: true });
  });

  test('detects react-vite-tailwind fixture from cache', async () => {
    const profile = await detectProject(
      path.join(fixtures, 'react-vite-tailwind')
    );
    expect(profile.framework).toBe('react');
  });

  test('stores cache in .xtarterize/cache/ directory', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cache-loc-'));
    await createMinimalProject(dir);

    await expect(fs.access(await cachePath(dir))).rejects.toThrow();
    await detectProject(dir);
    await expect(fs.access(await cachePath(dir))).resolves.toBeUndefined();

    await fs.rm(dir, { force: true, recursive: true });
  });
});

describe('detect cache invalidation by registry input kind', () => {
  for (const invalidationCase of invalidationCases) {
    test(`${invalidationCase.kind}: ${invalidationCase.name}`, async () => {
      const root = await fs.mkdtemp(
        path.join(os.tmpdir(), `cache-${invalidationCase.kind}-`)
      );
      try {
        const project = await invalidationCase.create(root);
        await invalidationCase.setup?.(root, project);

        await detectProject(project);
        const before = await readCache(project);

        await invalidationCase.mutate(root, project);
        const profile = await detectProject(project);
        await invalidationCase.assertProfile?.(profile, project);

        const after = await readCache(project);
        if (invalidationCase.keepCache) {
          expect(after.computedAt).toBe(before.computedAt);
        } else {
          expect(after.fingerprint).not.toEqual(before.fingerprint);
        }
        invalidationCase.assertFingerprint?.(
          after.fingerprint,
          before.fingerprint
        );
      } finally {
        await fs.rm(root, { force: true, recursive: true });
      }
    });
  }
});

const malformedCases = [
  { description: 'is missing configDirs', field: 'configDirs' },
  { description: 'is missing lockfiles', field: 'lockfiles' },
  {
    description: 'has a non-array lockfiles field',
    field: 'lockfiles',
    value: 'not-an-array',
  },
] as const;

describe('detect cache malformed entries', () => {
  for (const malformed of malformedCases) {
    test(`recomputes when the cached fingerprint ${malformed.description}`, async () => {
      const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cache-bad-'));

      try {
        await createMinimalProject(dir);
        await detectProject(dir);

        const cached = await readCache(dir);
        const rest: Record<string, unknown> = { ...cached.fingerprint };
        delete rest[malformed.field];
        const fingerprint =
          'value' in malformed
            ? { ...rest, [malformed.field]: malformed.value }
            : rest;
        await fs.writeFile(
          await cachePath(dir),
          JSON.stringify({ ...cached, fingerprint })
        );

        await expect(detectProject(dir)).resolves.toBeDefined();
        const written = (await readCache(dir)).fingerprint;
        expect(Array.isArray(written.configDirs)).toBe(true);
        expect(Array.isArray(written.lockfiles)).toBe(true);
      } finally {
        await fs.rm(dir, { force: true, recursive: true });
      }
    });
  }
});
