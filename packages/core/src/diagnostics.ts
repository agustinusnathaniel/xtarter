import { Effect } from 'effect';
import { x } from 'tinyexec';

import { FileSystemError } from '@/errors.js';
import { fileExists, resolvePath } from '@/utils/fs.js';
import { readPackageJson } from '@/utils/pkg.js';

export interface DiagnosticCheck {
  message: string;
  name: string;
  status: 'pass' | 'warn' | 'fail';
}

function makeCheck(
  name: string,
  status: 'pass' | 'warn' | 'fail',
  message: string
): DiagnosticCheck {
  return { message, name, status };
}

export function tryEffect<A>(
  f: () => Promise<A>
): Effect.Effect<A, FileSystemError> {
  return Effect.tryPromise({
    catch: (cause) => new FileSystemError({ cause, path: 'unknown' }),
    try: (_signal) => f(),
  });
}

export function tryReadPackageJson(
  cwd: string
): Effect.Effect<Awaited<ReturnType<typeof readPackageJson>>, FileSystemError> {
  return Effect.orElseSucceed(
    tryEffect(() => readPackageJson(cwd)),
    () => null as Awaited<ReturnType<typeof readPackageJson>>
  );
}

function runTool(
  tool: string,
  cwd: string
): Effect.Effect<string | null, FileSystemError> {
  return Effect.orElseSucceed(
    Effect.tryPromise({
      catch: (cause) => new FileSystemError({ cause, path: tool }),
      try: async (_signal) => {
        const result = await x(tool, ['--version'], { nodeOptions: { cwd } });
        if (result.exitCode === 0) {
          return result.stdout.trim().split('\n')[0] || null;
        }
        return null;
      },
    }),
    () => null
  );
}

export function getToolVersion(
  tool: string,
  cwd: string
): Promise<string | null> {
  return Effect.runPromise(runTool(tool, cwd));
}

export function checkToolInstalled(
  tool: string,
  cwd: string
): Promise<boolean> {
  return Effect.runPromise(
    runTool(tool, cwd).pipe(Effect.map((v) => v !== null))
  );
}

export function runEnvironmentChecks(
  cwd: string
): Promise<Array<DiagnosticCheck>> {
  return Effect.runPromise(
    Effect.gen(function* () {
      const pkg = yield* tryReadPackageJson(cwd);

      const nodeVersion = process.version;
      const engineNode = pkg?.engines?.node;
      let nodeSatisfies = true;

      if (engineNode) {
        const nodeMajor = Number.parseInt(
          nodeVersion.slice(1).split('.')[0],
          10
        );
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
    })
  );
}

function lockfileEntries(): Array<readonly [string, string]> {
  return [
    ['pnpm-lock.yaml', 'pnpm'],
    ['package-lock.json', 'npm'],
    ['yarn.lock', 'yarn'],
    ['bun.lock', 'bun'],
    ['bun.lockb', 'bun'],
  ];
}

function checkLockfile(
  cwd: string
): Effect.Effect<DiagnosticCheck, FileSystemError> {
  return Effect.gen(function* () {
    const results = yield* Effect.all(
      lockfileEntries().map(([file]) =>
        tryEffect(() => fileExists(resolvePath(cwd, file)))
      )
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

function checkTsconfig(
  cwd: string
): Effect.Effect<DiagnosticCheck, FileSystemError> {
  return Effect.gen(function* () {
    const hasTsconfig = yield* tryEffect(() =>
      fileExists(resolvePath(cwd, 'tsconfig.json'))
    );
    return makeCheck(
      'TypeScript config',
      hasTsconfig ? 'pass' : 'warn',
      hasTsconfig
        ? 'TypeScript config found (tsconfig.json)'
        : 'TypeScript is a dependency but tsconfig.json is missing'
    );
  });
}

function checkReadme(
  cwd: string
): Effect.Effect<DiagnosticCheck, FileSystemError> {
  return Effect.gen(function* () {
    const hasReadme = yield* tryEffect(() =>
      fileExists(resolvePath(cwd, 'README.md'))
    );
    return makeCheck(
      'README',
      hasReadme ? 'pass' : 'warn',
      hasReadme ? 'README.md found' : 'No README.md - consider adding one'
    );
  });
}

function checkGitignore(
  cwd: string
): Effect.Effect<DiagnosticCheck, FileSystemError> {
  return Effect.gen(function* () {
    const hasGitignore = yield* tryEffect(() =>
      fileExists(resolvePath(cwd, '.gitignore'))
    );
    return makeCheck(
      '.gitignore',
      hasGitignore ? 'pass' : 'warn',
      hasGitignore
        ? '.gitignore found'
        : 'No .gitignore - generated files may be tracked'
    );
  });
}

export function runProjectHealthChecks(
  cwd: string
): Promise<Array<DiagnosticCheck>> {
  return Effect.runPromise(
    Effect.gen(function* () {
      const pkg = yield* tryReadPackageJson(cwd);
      if (!pkg) {
        return [] as Array<DiagnosticCheck>;
      }
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      const checks: Array<DiagnosticCheck> = [];
      checks.push(yield* checkLockfile(cwd));
      if (deps.typescript) {
        checks.push(yield* checkTsconfig(cwd));
      }
      checks.push(yield* checkReadme(cwd));
      checks.push(yield* checkGitignore(cwd));
      return checks;
    })
  );
}

function collectConflictingToolChecks(
  deps: Record<string, unknown>
): Array<DiagnosticCheck> {
  const hasBiome = !!deps['@biomejs/biome'];
  const hasEslint = !!deps.eslint;
  const hasPrettier = !!deps.prettier;
  const checks: Array<DiagnosticCheck> = [];
  if (hasBiome && hasEslint) {
    checks.push(
      makeCheck(
        'Conflicting tools',
        'warn',
        'Both Biome and ESLint are configured. Consider using one as primary.'
      )
    );
  }
  if (hasBiome && hasPrettier) {
    checks.push(
      makeCheck(
        'Conflicting tools',
        'warn',
        'Both Biome and Prettier are configured. Biome includes formatting - Prettier may be redundant.'
      )
    );
  }
  return checks;
}

function checkLegacyEslintConfig(
  cwd: string
): Effect.Effect<DiagnosticCheck | null, FileSystemError> {
  return Effect.gen(function* () {
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
      if (yield* tryEffect(() => fileExists(resolvePath(cwd, config)))) {
        return makeCheck(
          'Legacy config',
          'warn',
          `Legacy ESLint config found (${config}). Consider migrating to flat config (eslint.config.js).`
        );
      }
    }
    return null;
  });
}

export function runConflictChecks(
  cwd: string
): Promise<Array<DiagnosticCheck>> {
  return Effect.runPromise(
    Effect.gen(function* () {
      const pkg = yield* tryReadPackageJson(cwd);
      if (!pkg) {
        return [] as Array<DiagnosticCheck>;
      }
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
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
    })
  );
}

export function runToolInstallationChecks(
  cwd: string
): Promise<Array<DiagnosticCheck>> {
  return Effect.runPromise(
    Effect.gen(function* () {
      const pkg = yield* tryReadPackageJson(cwd);
      if (!pkg) {
        return [] as Array<DiagnosticCheck>;
      }

      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
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
    })
  );
}
