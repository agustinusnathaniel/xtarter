import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectProject, type ProjectProfile } from '@xtarterize/core';

import { withTempDir } from './temp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Root directory of the on-disk project fixtures. */
export const fixturesRoot = path.resolve(__dirname, '../fixtures');

/** Fixture directories the suite may detect. */
export const FIXTURE_NAMES = [
  'eslint-project',
  'monorepo-turbo',
  'nextjs',
  'node-only',
  'oxlint-standalone',
  'react-native-expo',
  'react-native-hero',
  'react-ui-libraries',
  'react-vite-no-styling',
  'react-vite-tailwind',
  'vite-plus-biome',
  'vite-plus-no-lint',
  'vite-plus-oxlint',
  'vue-vite',
] as const;

export type FixtureName = (typeof FIXTURE_NAMES)[number];

/** Absolute path of a fixture directory. */
export function fixtureDir(name: FixtureName): string {
  return path.join(fixturesRoot, name);
}

const profiles = new Map<FixtureName, Promise<ProjectProfile>>();

/**
 * Detected profile for a fixture, shared across tests in a process. No suite
 * writes under `test/fixtures/**`, so detecting each fixture once is
 * equivalent to detecting it per call.
 */
export function fixtureProfile(name: FixtureName): Promise<ProjectProfile> {
  const cached = profiles.get(name);
  if (cached) {
    return cached;
  }
  const profile = detectProject(fixtureDir(name));
  profiles.set(name, profile);
  return profile;
}

/** Files written into a synthesized project: raw text or a JSON value. */
export interface ProjectFileMap {
  [relativePath: string]: string | object;
}

/** Temp project handed to `withProject` callbacks. */
export interface ProjectContext {
  cwd: string;
  profile: ProjectProfile;
  readJson: <Value = unknown>(relativePath: string) => Promise<Value>;
  readText: (relativePath: string) => Promise<string>;
}

function readProjectFile(cwd: string, relativePath: string): Promise<string> {
  return fs.readFile(path.join(cwd, relativePath), 'utf-8');
}

/**
 * Run `fn` against a fresh temp project: an empty `.git` directory plus
 * `files` (objects serialized as compact JSON), profiled via `detectProject`.
 * Directory lifetime is owned by `withTempDir`, so failing assertions cannot
 * leak it.
 */
export async function withProject<Result>(
  files: ProjectFileMap,
  fn: (context: ProjectContext) => Promise<Result>
): Promise<Result> {
  return withTempDir('xtarterize-project-', async (cwd) => {
    await fs.mkdir(path.join(cwd, '.git'), { recursive: true });
    for (const [relativePath, content] of Object.entries(files)) {
      const target = path.join(cwd, relativePath);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(
        target,
        typeof content === 'string' ? content : JSON.stringify(content)
      );
    }

    return fn({
      cwd,
      profile: await detectProject(cwd),
      readJson: async <Value = unknown>(relativePath: string) =>
        JSON.parse(await readProjectFile(cwd, relativePath)) as Value,
      readText: (relativePath) => readProjectFile(cwd, relativePath),
    });
  });
}
