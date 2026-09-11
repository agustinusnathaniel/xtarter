import os from 'node:os';
import { x } from 'tinyexec';

import { fileExists, resolvePath } from '@/utils/fs.js';
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

async function runTool(tool: string, cwd: string): Promise<string | null> {
  try {
    const result = await x(tool, ['--version'], { nodeOptions: { cwd } });
    if (result.exitCode === 0) {
      return result.stdout.trim().split('\n')[0] || null;
    }
    return null;
  } catch {
    return null;
  }
}

async function runEnvironmentChecks(
  cwd: string
): Promise<Array<DiagnosticCheck>> {
  const pkg = await readPackageJsonOrNull(cwd);

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

  const gitVersion = await runTool('git', cwd);

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
}

async function checkLockfile(cwd: string): Promise<DiagnosticCheck> {
  const results = await Promise.all(
    lockfileInputs().map((input) => fileExists(resolvePath(cwd, input.name)))
  );
  const detected = results.some(Boolean);
  return makeCheck(
    'Lockfile',
    detected ? 'pass' : 'warn',
    detected
      ? 'Lockfile found - dependencies are locked'
      : 'No lockfile found - dependencies may not be reproducible'
  );
}

async function checkTsconfig(cwd: string): Promise<DiagnosticCheck> {
  const hasTsconfig = await fileExists(resolvePath(cwd, 'tsconfig.json'));
  return makeCheck(
    'TypeScript config',
    hasTsconfig ? 'pass' : 'warn',
    hasTsconfig
      ? 'TypeScript config found (tsconfig.json)'
      : 'TypeScript is a dependency but tsconfig.json is missing'
  );
}

async function checkReadme(cwd: string): Promise<DiagnosticCheck> {
  const hasReadme = await fileExists(resolvePath(cwd, 'README.md'));
  return makeCheck(
    'README',
    hasReadme ? 'pass' : 'warn',
    hasReadme ? 'README.md found' : 'No README.md - consider adding one'
  );
}

async function checkGitignore(cwd: string): Promise<DiagnosticCheck> {
  const hasGitignore = await fileExists(resolvePath(cwd, '.gitignore'));
  return makeCheck(
    '.gitignore',
    hasGitignore ? 'pass' : 'warn',
    hasGitignore
      ? '.gitignore found'
      : 'No .gitignore - generated files may be tracked'
  );
}

async function runProjectHealthChecks(
  cwd: string
): Promise<Array<DiagnosticCheck>> {
  const pkg = await readPackageJsonOrNull(cwd);
  if (!pkg) {
    return [] as Array<DiagnosticCheck>;
  }
  const deps = collectDependencyVersions(pkg);
  const checks: Array<DiagnosticCheck> = [];
  checks.push(await checkLockfile(cwd));
  if (deps.typescript) {
    checks.push(await checkTsconfig(cwd));
  }
  checks.push(await checkReadme(cwd));
  checks.push(await checkGitignore(cwd));
  return checks;
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

async function checkLegacyEslintConfig(
  cwd: string
): Promise<DiagnosticCheck | null> {
  const legacyConfigs = [
    '.eslintrc',
    '.eslintrc.js',
    '.eslintrc.cjs',
    '.eslintrc.mjs',
    '.eslintrc.json',
    '.eslintrc.yaml',
    '.eslintrc.yml',
  ];
  for (const config of legacyConfigs) {
    if (await fileExists(resolvePath(cwd, config))) {
      return makeCheck(
        'Legacy config',
        'warn',
        `Legacy ESLint config found (${config}). Consider migrating to flat config (eslint.config.js).`
      );
    }
  }
  return null;
}

async function runConflictChecks(cwd: string): Promise<Array<DiagnosticCheck>> {
  const pkg = await readPackageJsonOrNull(cwd);
  if (!pkg) {
    return [] as Array<DiagnosticCheck>;
  }
  const deps = collectDependencyVersions(pkg);
  const checks: Array<DiagnosticCheck> = [
    ...collectConflictingToolChecks(deps),
  ];
  const legacyCheck = await checkLegacyEslintConfig(cwd);
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
}

async function runToolInstallationChecks(
  cwd: string
): Promise<Array<DiagnosticCheck>> {
  const pkg = await readPackageJsonOrNull(cwd);
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
      const version = await runTool(tool.cmd, cwd);
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
}

interface DiagnosticGroupDefinition {
  fallback: DiagnosticCheck;
  id: DiagnosticGroupId;
  run: (cwd: string) => Promise<Array<DiagnosticCheck>>;
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
 * Run the requested diagnostic groups, replacing a group that rejects with a
 * single failure check so one broken check never hides the others.
 */
export async function runDiagnostics(
  cwd: string,
  options: DiagnosticsOptions = {}
): Promise<{ groups: Array<DiagnosticGroup>; summary: DiagnosticsSummary }> {
  const definitions = options.groups
    ? DIAGNOSTIC_GROUPS.filter((group) => options.groups?.includes(group.id))
    : DIAGNOSTIC_GROUPS;
  const results = await Promise.allSettled(
    definitions.map((definition) => definition.run(cwd))
  );
  const groups = definitions.map((definition, index) => ({
    checks:
      results[index]?.status === 'fulfilled'
        ? results[index].value
        : [definition.fallback],
    title: definition.title,
  }));
  if (options.verbose) {
    groups.unshift(systemGroup());
  }
  return { groups, summary: summarize(groups) };
}
