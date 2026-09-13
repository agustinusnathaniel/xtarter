import { doctorCommand } from '@xtarterize/app/commands/doctor.js';
import { describe, expect } from 'vite-plus/test';

import { captureConsole } from '../helpers/console.js';
import { type ProjectFileMap, withProject } from '../helpers/project.js';

const DOCTOR_FILES: ProjectFileMap = {
  'package.json': {
    devDependencies: {
      '@biomejs/biome': '^2.0.0',
      typescript: '^5.3.0',
    },
    name: 'doctor-fixture',
    version: '1.0.0',
  },
};

describe('doctor command', () => {
  test('emits machine-readable diagnostics in JSON mode', async () => {
    await withProject(DOCTOR_FILES, async ({ cwd }) => {
      const { logs } = await captureConsole(() =>
        doctorCommand.run?.({ args: { cwd, json: true } } as never)
      );

      expect(logs.length).toBeGreaterThan(0);
      const payload = JSON.parse(logs.at(-1)) as {
        ok: boolean;
        summary: { total: number; pass: number; warn: number; fail: number };
        diagnostics: Array<{ name: string; status: string; message: string }>;
      };

      expect(payload.ok).toBe(true);
      expect(payload.summary.total).toBeGreaterThan(0);
      expect(payload.diagnostics.length).toBe(payload.summary.total);
      expect(Array.isArray(payload.diagnostics)).toBe(true);
    });
  });

  test('outputs summary line in quiet mode', async () => {
    await withProject(DOCTOR_FILES, async ({ cwd }) => {
      const { logs } = await captureConsole(() =>
        doctorCommand.run?.({ args: { cwd, quiet: true } } as never)
      );

      expect(logs.length).toBeGreaterThan(0);
      const lastLine = logs.at(-1);
      expect(lastLine).toMatch(/\d+ passed/);
    });
  });

  test('includes system info in verbose mode', async () => {
    await withProject(DOCTOR_FILES, async ({ cwd }) => {
      const { logs } = await captureConsole(() =>
        doctorCommand.run?.({ args: { cwd, verbose: true } } as never)
      );

      const fullOutput = logs.join(' ');
      expect(fullOutput).toContain('System');
      expect(fullOutput).toMatch(/(CPUs|GB RAM)/);
    });
  });

  test('includes project health diagnostics', async () => {
    // Add a tsconfig.json to make the TypeScript check pass
    await withProject(
      { ...DOCTOR_FILES, 'tsconfig.json': '{}' },
      async ({ cwd }) => {
        const { logs } = await captureConsole(() =>
          doctorCommand.run?.({ args: { cwd, json: true } } as never)
        );

        const payload = JSON.parse(logs.at(-1)) as {
          diagnostics: Array<{ name: string; message: string }>;
        };

        const tsCheck = payload.diagnostics.find(
          (d) => d.name === 'TypeScript config'
        );
        expect(tsCheck).toBeDefined();
        expect(tsCheck?.message).toContain('tsconfig.json');
      }
    );
  });

  test('exits 0 when all diagnostics pass', async () => {
    await withProject(DOCTOR_FILES, async ({ cwd }) => {
      process.exitCode = 0;
      try {
        await doctorCommand.run?.({ args: { cwd, json: true } } as never);
        expect(process.exitCode).toBe(0);
      } finally {
        process.exitCode = 0;
      }
    });
  });
});
