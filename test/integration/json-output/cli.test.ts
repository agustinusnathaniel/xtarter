import fs from 'node:fs/promises';
import path from 'node:path';
import {
  captureConsole,
  captureJson,
  captureStreams,
} from '@test/helpers/console.js';
import { type ProjectFileMap, withProject } from '@test/helpers/project.js';
import { runCli } from '@test/helpers/run.js';
import { withTempDir } from '@test/helpers/temp.js';
import { checkCommand } from '@xtarterize/app/commands/check.js';
import { diffCommand } from '@xtarterize/app/commands/diff.js';
import { initProgram } from '@xtarterize/app/commands/init.js';
import { listCommand } from '@xtarterize/app/commands/list.js';
import { queryCommand } from '@xtarterize/app/commands/query.js';
import type { PrompterShape } from '@xtarterize/app/ui/prompter.js';
import { Effect } from 'effect';
import { describe, expect, it, vi } from 'vite-plus/test';

const CONFORMANCE_SUMMARY_REGEX = /conformant|Conformance audit/;

const PROJECT_FILES: ProjectFileMap = {
  'package.json': {
    dependencies: { react: '^18.2.0' },
    devDependencies: { typescript: '^5.0.0', vite: '^5.0.0' },
    name: 'json-output-fixture',
    type: 'module',
    version: '1.0.0',
  },
  'tsconfig.json': '{"compilerOptions":{}}\n',
  'vite.config.ts': 'export default {}\n',
};

interface QueryJson {
  count: number;
  query: string;
  results: Array<{ relevance: number; taskId: string }>;
  type: string;
}

/** `query` takes `--json` (not `--format json`), which is what sets `ctx.json`. */
async function runQueryJson(args: {
  cwd: string;
  limit?: string;
  query: string;
  threshold?: string;
}): Promise<QueryJson> {
  return (await captureJson(async () => {
    await queryCommand.run?.({ args: { ...args, json: true } } as never);
  })) as QueryJson;
}

describe('cli json output', () => {
  test('list command emits machine-readable payload', async () => {
    await withProject(PROJECT_FILES, async ({ cwd }) => {
      const output = (await captureJson(async () => {
        await listCommand.run?.({ args: { cwd, json: true } } as never);
      })) as {
        ok: boolean;
        profile: Record<string, unknown>;
        tasks: Array<{ id: string; status: string }>;
      };

      expect(output.ok).toBe(true);
      expect(output.profile).toBeTruthy();
      expect(output.tasks.length).toBeGreaterThan(0);
      expect(typeof output.tasks[0]?.id).toBe('string');
      expect(typeof output.tasks[0]?.status).toBe('string');
    });
  });

  test('check command emits machine-readable payload', async () => {
    await withProject(PROJECT_FILES, async ({ cwd }) => {
      const output = (await captureJson(async () => {
        await checkCommand.run?.({ args: { cwd, json: true } } as never);
      })) as {
        ok: boolean;
        summary: { conformant: number; total: number };
        tasks: Array<{ id: string; status: string }>;
        diagnostics: Array<{ name: string; status: string; message: string }>;
      };

      expect(output.ok).toBe(false);
      // conformant counts only skips, so a predicate flip to `!== 'skip'`
      // would report every applicable task as conformant instead of 0.
      expect(output.summary.conformant).toBe(0);
      // The exact applicable count is not pinned: the registry grows, and a
      // new task applicable to this fixture would break a `toBe(N)` without
      // any behavior change. A non-zero total is all this test needs.
      expect(output.summary.total).toBeGreaterThan(0);
      expect(Array.isArray(output.tasks)).toBe(true);
      expect(Array.isArray(output.diagnostics)).toBe(true);

      expect(process.exitCode).toBe(1);
      process.exitCode = 0;
    });
  });
});

describe('cli json output', () => {
  test('diff command emits machine-readable payload', async () => {
    await withProject(PROJECT_FILES, async ({ cwd }) => {
      const output = (await captureJson(async () => {
        await diffCommand.run?.({ args: { cwd, json: true } } as never);
      })) as {
        ok: boolean;
        summary: { total: number; stats?: { added: number; removed: number } };
        files: Array<{
          filepath: string;
          action: string;
          before?: string;
          after: string;
          stats?: { added: number; removed: number };
          hunks?: Array<{ header: string; added: number; removed: number }>;
        }>;
      };

      expect(output.ok).toBe(false);
      expect(Array.isArray(output.files)).toBe(true);
      if (output.files.length > 0) {
        expect(typeof output.files[0]?.filepath).toBe('string');
        expect(typeof output.files[0]?.after).toBe('string');
      }
    });
  });

  test('diff command exits 1 when pending changes exist', async () => {
    await withProject(PROJECT_FILES, async ({ cwd }) => {
      try {
        await diffCommand.run?.({ args: { cwd, json: true } } as never);
        expect(process.exitCode).toBe(1);
      } finally {
        process.exitCode = 0;
      }
    });
  });

  test('diff command JSON ok field agrees with exit code', async () => {
    await withProject(PROJECT_FILES, async ({ cwd }) => {
      const output = (await captureJson(async () => {
        await diffCommand.run?.({ args: { cwd, json: true } } as never);
      })) as { ok: boolean };
      expect(output.ok).toBe(false);
      expect(process.exitCode).toBe(1);
      process.exitCode = 0;
    });
  });
});

describe('cli json output', () => {
  test('diff --quiet omits the timing section', async () => {
    await withProject(PROJECT_FILES, async ({ cwd }) => {
      try {
        const { logs } = await captureConsole(async () => {
          await diffCommand.run?.({ args: { cwd, quiet: true } } as never);
        });
        expect(logs.join('\n')).not.toContain('Timing');
      } finally {
        process.exitCode = 0;
      }
    });
  });

  test('list --quiet omits the timing section', async () => {
    await withProject(PROJECT_FILES, async ({ cwd }) => {
      try {
        const { logs } = await captureConsole(async () => {
          await listCommand.run?.({ args: { cwd, quiet: true } } as never);
        });
        expect(logs.join('\n')).not.toContain('Timing');
      } finally {
        process.exitCode = 0;
      }
    });
  });
});

describe('cli json output', () => {
  test('init --dry-run --format json implies quiet and keeps stdout machine-readable', async () => {
    await withProject(PROJECT_FILES, async ({ cwd }) => {
      const previousCi = process.env.CI;
      process.env.CI = 'false';
      const prompt = vi.fn();
      const prompter: PrompterShape = {
        confirm: () => {
          prompt();
          return Effect.succeed(null);
        },
        groupMultiselect: () => {
          prompt();
          return Effect.succeed(null);
        },
        multiselect: () => {
          prompt();
          return Effect.succeed(null);
        },
        select: () => {
          prompt();
          return Effect.succeed(null);
        },
      };

      try {
        const output = (await captureJson(async () => {
          await runCli(
            initProgram({ cwd, dryRun: true, format: 'json' }),
            prompter
          );
        })) as {
          files: Array<unknown>;
          ok: boolean;
          summary: { total: number };
        };

        // --format json implies quiet: no profile, plan, or timing text may
        // precede the payload, and the dry run must never prompt.
        expect(prompt).not.toHaveBeenCalled();
        expect(typeof output.ok).toBe('boolean');
        expect(Array.isArray(output.files)).toBe(true);
        expect(typeof output.summary.total).toBe('number');
      } finally {
        if (previousCi === undefined) {
          delete process.env.CI;
        } else {
          process.env.CI = previousCi;
        }
        process.exitCode = 0;
      }
    });
  }, 60_000);
});

it('emits a JSON preflight failure payload on invalid projects', async () => {
  // No .git and no package.json: session.open fails before any command work.
  await withTempDir('xtarterize-json-', async (cwd) => {
    try {
      const output = (await captureJson(async () => {
        await listCommand.run?.({ args: { cwd, json: true } } as never);
      })) as { errors: Array<{ code: string }>; ok: boolean };

      expect(output.ok).toBe(false);
      expect(output.errors.length).toBeGreaterThan(0);
      expect(output.errors[0]?.code).toBe('MISSING_PACKAGE_JSON');
      expect(process.exitCode).toBe(1);
    } finally {
      process.exitCode = 0;
    }
  });
});

it('check --json keeps stdout machine-readable when annotations are enabled', async () => {
  await withProject(PROJECT_FILES, async ({ cwd }) => {
    try {
      const { stderr, stdout } = await captureStreams(async () => {
        await captureJson(async () => {
          await checkCommand.run?.({
            args: { annotations: true, cwd, json: true },
          } as never);
        });
      });

      // Annotations must not pollute the machine-readable stdout stream
      expect(stdout.join('')).not.toContain('::');
      // Annotations are emitted on stderr (parsed by the Actions runner)
      expect(stderr.join('')).toContain('::error');
    } finally {
      process.exitCode = 0;
    }
  });
});

it('check --badge - --json keeps stdout a valid JSON payload', async () => {
  await withProject(PROJECT_FILES, async ({ cwd }) => {
    try {
      const {
        result: output,
        stderr,
        stdout,
      } = await captureStreams(() =>
        captureJson(async () => {
          await checkCommand.run?.({
            args: { badge: '-', cwd, json: true },
          } as never);
        })
      );

      // The badge SVG must not pollute the machine-readable stdout stream
      expect(stdout.join('')).not.toContain('<svg');
      // The badge SVG is emitted on stderr alongside annotations
      expect(stderr.join('')).toContain('<svg');
      expect(typeof output).toBe('object');
    } finally {
      process.exitCode = 0;
    }
  });
});

it('check --badge <file> --json writes the badge and keeps stdout a valid JSON payload', async () => {
  await withProject(PROJECT_FILES, async ({ cwd }) => {
    const badgePath = path.join(cwd, 'conformance.svg');

    try {
      const { result: output, stdout } = await captureStreams(() =>
        captureJson(async () => {
          await checkCommand.run?.({
            args: { badge: badgePath, cwd, json: true },
          } as never);
        })
      );

      // The "Badge written" success message must not break the JSON payload
      expect(stdout.join('')).not.toContain('Badge written');
      expect(typeof output).toBe('object');

      const svg = await fs.readFile(badgePath, 'utf-8');
      expect(svg).toContain('<svg');

      // The badge must carry the numbers the run actually reported. The
      // percentage math and the counts it renders as `N/M` plus the aria-label
      // are covered against fixed expectations in test/ui/badge.test.ts, so this
      // journey only pins the reported counts and the 0% they render to for a
      // fixture with no skipped tasks.
      const summary = (
        output as { summary: { conformant: number; total: number } }
      ).summary;
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg.endsWith('</svg>')).toBe(true);
      expect(svg).toContain(`${summary.conformant}/${summary.total}`);
      expect(svg).toContain(
        `aria-label="conformance: ${summary.conformant}/${summary.total} (0%)"`
      );
    } finally {
      process.exitCode = 0;
    }
  });
});

it('check --badge - keeps stdout a clean SVG and routes the audit to stderr', async () => {
  await withProject(PROJECT_FILES, async ({ cwd }) => {
    try {
      const { stderr, stdout } = await captureStreams(async () => {
        await checkCommand.run?.({
          args: { badge: '-', cwd },
        } as never);
      });

      const stdoutText = stdout.join('');
      const stderrText = stderr.join('');
      expect(stdoutText.startsWith('<svg')).toBe(true);
      // Nothing may follow the SVG on stdout - the audit goes to stderr.
      expect(stdoutText.endsWith('</svg>')).toBe(true);
      expect(stdoutText).not.toContain('Conformance audit');
      // In CI, quiet mode is auto-enabled so the audit section is skipped and
      // only the summary line is printed - but it must land on stderr, never
      // after the SVG on stdout.
      expect(stderrText).toMatch(CONFORMANCE_SUMMARY_REGEX);
    } finally {
      process.exitCode = 0;
    }
  });
});

describe('query command json output', () => {
  test('query --limit returns at most N results', async () => {
    await withProject(PROJECT_FILES, async ({ cwd }) => {
      try {
        const unfiltered = await runQueryJson({
          cwd,
          query: 'ci with linting',
        });
        const limited = await runQueryJson({
          cwd,
          limit: '3',
          query: 'ci with linting',
        });

        expect(limited.type).toBe('query');
        expect(limited.query).toBe('ci with linting');
        // The query scores more tasks than the limit, so capping is binding
        // and --limit keeps the highest-relevance ones.
        expect(unfiltered.count).toBeGreaterThan(3);
        expect(limited.count).toBe(3);
        expect(limited.results.map((result) => result.taskId)).toEqual(
          unfiltered.results.slice(0, 3).map((result) => result.taskId)
        );
      } finally {
        process.exitCode = 0;
      }
    });
  }, 60_000);

  test('query --threshold drops low-relevance results', async () => {
    await withProject(PROJECT_FILES, async ({ cwd }) => {
      try {
        const unfiltered = await runQueryJson({
          cwd,
          query: 'ci with linting',
        });
        const filtered = await runQueryJson({
          cwd,
          query: 'ci with linting',
          threshold: '0.5',
        });

        expect(unfiltered.count).toBeGreaterThan(filtered.count);
        expect(filtered.count).toBeGreaterThan(0);
        for (const result of filtered.results) {
          expect(result.relevance).toBeGreaterThan(0.5);
        }
      } finally {
        process.exitCode = 0;
      }
    });
  }, 60_000);
});
