import type { ProjectProfile, TaskStatus } from '@xtarterize/core';
import { expect, test } from 'vite-plus/test';

import { packageScriptsTask } from '../../packages/tasks/src/factory/package-scripts.js';
import {
  type FixtureName,
  fixtureDir,
  fixtureProfile,
  type ProjectFileMap,
  withProject,
} from '../helpers/project.js';
import { run } from '../helpers/run.js';

/** Dev dependency sets shared by the package-scripts case tables. */
export const DEPS = {
  biome: { '@biomejs/biome': '^1.0.0' },
  biomeTs: { '@biomejs/biome': '^1.0.0', typescript: '^5.3.0' },
  biomeTurbo: { '@biomejs/biome': '^1.0.0', turbo: '^2.0.0' },
  empty: {},
  eslint: { eslint: '^8.0.0' },
  eslintTs: { eslint: '^8.56.0', typescript: '^5.3.0' },
  full: {
    '@biomejs/biome': '^1.0.0',
    turbo: '^2.0.0',
    typescript: '^5.3.0',
    vitest: '^1.0.0',
  },
  ts: { typescript: '^5.3.0' },
  turboTs: { turbo: '^2.0.0', typescript: '^5.3.0' },
  turboTsVitest: { turbo: '^2.0.0', typescript: '^5.3.0', vitest: '^1.0.0' },
};

/** One packageScriptsTask case; each expectation entry emits one expect. */
export interface ScriptCase {
  afterContains?: ReadonlyArray<string>;
  afterDefined?: true;
  afterFilepath?: string;
  afterNotContains?: ReadonlyArray<string>;
  applicable?: true;
  extraFiles?: ProjectFileMap;
  fixture?: FixtureName;
  name: string;
  pkg?: Record<string, unknown>;
  status?: TaskStatus;
}

/** Import-time guard: dropping a row must fail the suite. */
export function defineScriptCases(
  expected: number,
  cases: ReadonlyArray<ScriptCase>
): ReadonlyArray<ScriptCase> {
  if (cases.length !== expected) {
    throw new Error(
      `packageScriptsTask table drift: expected ${expected}, found ${cases.length}`
    );
  }
  return cases;
}

/** Build a package.json value; defaults to the canonical full dependency set. */
export function scriptPkg(
  name: string,
  scripts?: Record<string, unknown>,
  devDependencies: Record<string, string> = DEPS.full
): Record<string, unknown> {
  return { devDependencies, name, scripts, type: 'module' };
}

/** turbo + typescript project without biome or vitest. */
export function turboPkg(
  name: string,
  scripts?: Record<string, unknown>
): Record<string, unknown> {
  return scriptPkg(name, scripts, DEPS.turboTs);
}

async function runProjectCase(
  testCase: ScriptCase,
  cwd: string,
  profile: ProjectProfile
): Promise<void> {
  if (testCase.applicable === true) {
    expect(packageScriptsTask.applicable(profile)).toBe(true);
  }
  if (testCase.status !== undefined) {
    expect(await run(packageScriptsTask.check(cwd, profile))).toBe(
      testCase.status
    );
  }
  const expectsAfter =
    testCase.afterDefined === true ||
    (testCase.afterContains?.length ?? 0) > 0 ||
    (testCase.afterNotContains?.length ?? 0) > 0;
  if (!expectsAfter) {
    return;
  }

  const diffs = await run(packageScriptsTask.dryRun(cwd, profile));
  const diff = diffs.find(
    (candidate) =>
      candidate.filepath === (testCase.afterFilepath ?? 'package.json')
  );
  if (testCase.afterDefined === true) {
    expect(diff).toBeDefined();
  }
  for (const expected of testCase.afterContains ?? []) {
    expect(diff?.after).toContain(expected);
  }
  for (const expected of testCase.afterNotContains ?? []) {
    expect(diff?.after).not.toContain(expected);
  }
}

async function runScriptCase(testCase: ScriptCase): Promise<void> {
  if (testCase.fixture !== undefined) {
    const { fixture } = testCase;
    await runProjectCase(
      testCase,
      fixtureDir(fixture),
      await fixtureProfile(fixture)
    );
    return;
  }

  await withProject(
    { 'package.json': testCase.pkg ?? {}, ...testCase.extraFiles },
    ({ cwd, profile }) => runProjectCase(testCase, cwd, profile)
  );
}

/** Register each row as one `test` with its original full name. */
export function runScriptCases(cases: ReadonlyArray<ScriptCase>): void {
  for (const testCase of cases) {
    test(testCase.name, () => runScriptCase(testCase));
  }
}
