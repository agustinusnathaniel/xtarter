import fs from 'node:fs/promises';
import path from 'node:path';
import { checkCommand } from '@xtarterize/app/commands/check.js';
import { diffCommand } from '@xtarterize/app/commands/diff.js';
import { initProgram } from '@xtarterize/app/commands/init.js';
import { listCommand } from '@xtarterize/app/commands/list.js';
import type { PrompterShape } from '@xtarterize/app/ui/prompter.js';
import { Effect } from 'effect';
import { describe, expect, it, vi } from 'vite-plus/test';

import {
  captureConsole,
  captureJson,
  captureStreams,
} from '../../helpers/console.js';
import { type ProjectFileMap, withProject } from '../../helpers/project.js';
import { runCli } from '../../helpers/run.js';
import { withTempDir } from '../../helpers/temp.js';

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
      expect(Array.isArray(output.tasks)).toBe(true);
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
      // 22 tasks with no `skip` statuses: conformant counts only skips, so a
      // predicate flip to `!== 'skip'` would report 22 conformant instead of 0.
      expect(output.summary.conformant).toBe(0);
      expect(output.summary.total).toBe(22);
      expect(Array.isArray(output.tasks)).toBe(true);
      expect(Array.isArray(output.diagnostics)).toBe(true);

      expect(process.exitCode).toBe(1);
      process.exitCode = 0;
    });
  });

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
      expect(output.summary.total).toBeGreaterThanOrEqual(0);
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
