import os from 'node:os';
import { Cause, Effect, Exit } from 'effect';
import { basename } from 'pathe';

import { ProcessRunner } from '@/services/process-runner.js';
import { fileExists, findConfigFile, resolvePath } from '@/utils/fs.js';
import {
  collectDependencyVersions,
  readPackageJsonOrNull,
} from '@/utils/pkg.js';

import { lockfileInputs } from './detect/registry/index.js';

export interface DiagnosticCheck {
  message: string;
  name: string;
  status: 'pass' | 'warn' | 'fail';
}

export interface DiagnosticGroup {
  checks: Array<DiagnosticCheck>;
  title: string;
}

export interface DiagnosticsSummary {
  fail: number;
  pass: number;
  total: number;
  warn: number;
}

export type DiagnosticGroupId =
  | 'configuration'
  | 'environment'
  | 'project'
  | 'tools';

export interface DiagnosticsOptions {
  /** Subset of diagnostic groups to run. Defaults to every group. */
  groups?: Array<DiagnosticGroupId>;
  /** Include host platform info as an extra leading group. */
  verbose?: boolean;
}

function makeCheck(
  name: string,
  status: 'pass' | 'warn' | 'fail',
  message: string
): DiagnosticCheck {
  return { message, name, status };
}

/** Lift the never-failing package.json read into an Effect. */
const readPackage = (cwd: string) =>
  Effect.promise(() => readPackageJsonOrNull(cwd));

function runTool(
  tool: string,
  cwd: string
): Effect.Effect<string | null, never, ProcessRunner> {
  return Effect.gen(function* () {
    const runner = yield* ProcessRunner;
    const exit = yield* Effect.exit(runner.run(tool, ['--version'], { cwd }));
    if (Exit.isFailure(exit)) {
      if (Cause.hasInterruptsOnly(exit.cause)) {
        return yield* Effect.interrupt;
      }
      return null;
    }
    if (exit.value.exitCode !== 0) {
      return null;
    }
    return exit.value.stdout.trim().split('\n')[0] || null;
  });
}

function runEnvironmentChecks(
  cwd: string
): Effect.Effect<Array<DiagnosticCheck>, never, ProcessRunner> {
  return Effect.gen(function* () {
    const pkg = yield* readPackage(cwd);

    const nodeVersion = process.version;
    const engineNode = pkg?.engines?.node;
    let nodeSatisfies = true;

    if (engineNode) {
      const nodeMajor = Number.parseInt(nodeVersion.slice(1).split('.')[0], 10);
      const majorMatch = engineNode.match(/(\d+)/);
      const engineMajor = majorMatch
        ? Number.parseInt(majorMatch[1], 10)
        : Number.NaN;
      if (!Number.isNaN(engineMajor)) {
        nodeSatisfies = nodeMajor >= engineMajor;
      }
    }

    const gitVersion = yield* runTool('git', cwd);

    return [
      makeCheck(
        'Node.js',
        nodeSatisfies ? 'pass' : 'warn',
        engineNode
          ? `Node.js ${nodeVersion} (required: ${engineNode})`
          : `Node.js ${nodeVersion}`
      ),
      makeCheck(
        'Git',
        gitVersion ? 'pass' : 'fail',
        gitVersion
          ? `Git ${gitVersion}`
          : 'Git is not installed (required by xtarterize)'
      ),
    ];
  });
}

function checkLockfile(cwd: string): Effect.Effect<DiagnosticCheck> {
  return Effect.gen(function* () {
    const results = yield* Effect.forEach(
      lockfileInputs(),
      (input) => Effect.promise(() => fileExists(resolvePath(cwd, input.name))),
      { concurrency: 'unbounded' }
    );
    const detected = results.some(Boolean);
    return makeCheck(
      'Lockfile',
      detected ? 'pass' : 'warn',
      detected
        ? 'Lockfile found - dependencies are locked'
        : 'No lockfile found - dependencies may not be reproducible'
    );
  });
}

const fileCheck =
  (
    filename: string,
    name: string,
    [pass, warn]: readonly [pass: string, warn: string]
  ) =>
  (cwd: string): Effect.Effect<DiagnosticCheck> =>
    Effect.map(
      Effect.promise(() => fileExists(resolvePath(cwd, filename))),
      (exists) =>
        makeCheck(name, exists ? 'pass' : 'warn', exists ? pass : warn)
    );

const checkTsconfig = fileCheck('tsconfig.json', 'TypeScript config', [
  'TypeScript config found (tsconfig.json)',
  'TypeScript is a dependency but tsconfig.json is missing',
]);

const checkReadme = fileCheck('README.md', 'README', [
  'README.md found',
  'No README.md - consider adding one',
]);

const checkGitignore = fileCheck('.gitignore', '.gitignore', [
  '.gitignore found',
  'No .gitignore - generated files may be tracked',
]);

function runProjectHealthChecks(
  cwd: string
): Effect.Effect<Array<DiagnosticCheck>> {
  return Effect.gen(function* () {
    const pkg = yield* readPackage(cwd);
    if (!pkg) {
      return [] as Array<DiagnosticCheck>;
    }
    const deps = collectDependencyVersions(pkg);
    const checks: Array<DiagnosticCheck> = [];
    checks.push(yield* checkLockfile(cwd));
    if (deps.typescript) {
      checks.push(yield* checkTsconfig(cwd));
    }
    checks.push(yield* checkReadme(cwd));
    checks.push(yield* checkGitignore(cwd));
    return checks;
  });
}

const TOOL_CONFLICTS = [
  [
    '@biomejs/biome',
    'eslint',
    'Both Biome and ESLint are configured. Consider using one as primary.',
  ],
  [
    '@biomejs/biome',
    'prettier',
    'Both Biome and Prettier are configured. Biome includes formatting - Prettier may be redundant.',
  ],
] as const;

function collectConflictingToolChecks(
  deps: Record<string, unknown>
): Array<DiagnosticCheck> {
  return TOOL_CONFLICTS.filter(
    ([first, second]) => deps[first] && deps[second]
  ).map(([, , message]) => makeCheck('Conflicting tools', 'warn', message));
}

function checkLegacyEslintConfig(
  cwd: string
): Effect.Effect<DiagnosticCheck | null> {
  return Effect.gen(function* () {
    const found = yield* Effect.promise(() =>
      findConfigFile(cwd, '.eslintrc', [
        '',
        '.js',
        '.cjs',
        '.mjs',
        '.json',
        '.yaml',
        '.yml',
      ])
    );
    if (!found) {
      return null;
    }
    return makeCheck(
      'Legacy config',
      'warn',
      `Legacy ESLint config found (${basename(found)}). Consider migrating to flat config (eslint.config.js).`
    );
  });
}

function runConflictChecks(cwd: string): Effect.Effect<Array<DiagnosticCheck>> {
  return Effect.gen(function* () {
    const pkg = yield* readPackage(cwd);
    if (!pkg) {
      return [] as Array<DiagnosticCheck>;
    }
    const deps = collectDependencyVersions(pkg);
    const checks: Array<DiagnosticCheck> = [
      ...collectConflictingToolChecks(deps),
    ];
    const legacyCheck = yield* checkLegacyEslintConfig(cwd);
    if (legacyCheck) {
      checks.push(legacyCheck);
    }
    if (checks.length === 0) {
      checks.push(
        makeCheck(
          'Conflicting tools',
          'pass',
          'No conflicting formatting/linting tools detected.'
        )
      );
    }
    return checks;
  });
}

function runToolInstallationChecks(
  cwd: string
): Effect.Effect<Array<DiagnosticCheck>, never, ProcessRunner> {
  return Effect.gen(function* () {
    const pkg = yield* readPackage(cwd);
    if (!pkg) {
      return [] as Array<DiagnosticCheck>;
    }

    const deps = collectDependencyVersions(pkg);
    const checks: Array<DiagnosticCheck> = [];

    const toolsToCheck: Array<{ name: string; dep: string; cmd: string }> = [
      { cmd: 'biome', dep: '@biomejs/biome', name: 'Biome' },
      { cmd: 'eslint', dep: 'eslint', name: 'ESLint' },
      { cmd: 'tsc', dep: 'typescript', name: 'TypeScript' },
      { cmd: 'commitlint', dep: '@commitlint/cli', name: 'Commitlint' },
      { cmd: 'knip', dep: 'knip', name: 'Knip' },
    ];

    for (const tool of toolsToCheck) {
      if (deps[tool.dep]) {
        const version = yield* runTool(tool.cmd, cwd);
        checks.push(
          makeCheck(
            `${tool.name} installation`,
            version ? 'pass' : 'warn',
            version
              ? `${tool.name} ${version} is installed`
              : `${tool.name} is in package.json but not installed (run \`pnpm install\`)`
          )
        );
      }
    }

    return checks;
  });
}

interface DiagnosticGroupDefinition {
  fallback: DiagnosticCheck;
  id: DiagnosticGroupId;
  run: (
    cwd: string
  ) => Effect.Effect<Array<DiagnosticCheck>, never, ProcessRunner>;
  title: string;
}

const DIAGNOSTIC_GROUPS: ReadonlyArray<DiagnosticGroupDefinition> = [
  {
    fallback: {
      message: 'Failed to run environment checks',
      name: 'Environment',
      status: 'fail',
    },
    id: 'environment',
    run: runEnvironmentChecks,
    title: 'Environment',
  },
  {
    fallback: {
      message: 'Failed to run tool checks',
      name: 'Tools',
      status: 'fail',
    },
    id: 'tools',
    run: runToolInstallationChecks,
    title: 'Tools',
  },
  {
    fallback: {
      message: 'Failed to run project health checks',
      name: 'Project',
      status: 'fail',
    },
    id: 'project',
    run: runProjectHealthChecks,
    title: 'Project',
  },
  {
    fallback: {
      message: 'Failed to run conflict checks',
      name: 'Configuration',
      status: 'fail',
    },
    id: 'configuration',
    run: runConflictChecks,
    title: 'Configuration',
  },
];

function systemGroup(): DiagnosticGroup {
  const mem = Math.round(os.totalmem() / 1024 ** 3);
  return {
    checks: [
      {
        message: `${os.type()} ${os.release()} | ${os.arch()} | ${os.cpus().length} CPUs | ${mem} GB RAM`,
        name: 'Platform',
        status: 'pass',
      },
    ],
    title: 'System',
  };
}

function summarize(groups: Array<DiagnosticGroup>): DiagnosticsSummary {
  const checks = groups.flatMap((group) => group.checks);
  return {
    fail: checks.filter((check) => check.status === 'fail').length,
    pass: checks.filter((check) => check.status === 'pass').length,
    total: checks.length,
    warn: checks.filter((check) => check.status === 'warn').length,
  };
}

/**
 * Run the requested diagnostic groups, replacing a group that fails with a
 * single failure check so one broken check never hides the others.
 */
export function runDiagnostics(
  cwd: string,
  options: DiagnosticsOptions = {}
): Effect.Effect<
  { groups: Array<DiagnosticGroup>; summary: DiagnosticsSummary },
  never,
  ProcessRunner
> {
  return Effect.gen(function* () {
    const definitions = options.groups
      ? DIAGNOSTIC_GROUPS.filter((group) => options.groups?.includes(group.id))
      : DIAGNOSTIC_GROUPS;
    const results = yield* Effect.forEach(
      definitions,
      (definition) => Effect.exit(definition.run(cwd)),
      { concurrency: 'unbounded' }
    );
    for (const result of results) {
      if (Exit.isFailure(result) && Cause.hasInterruptsOnly(result.cause)) {
        return yield* Effect.interrupt;
      }
    }
    const groups = definitions.map((definition, index) => {
      const result = results[index];
      return {
        checks:
          result && Exit.isSuccess(result)
            ? result.value
            : [definition.fallback],
        title: definition.title,
      };
    });
    if (options.verbose) {
      groups.unshift(systemGroup());
    }
    return { groups, summary: summarize(groups) };
  });
}
