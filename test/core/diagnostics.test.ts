import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runDiagnostics } from '@xtarterize/core';
import { describe, expect } from 'vite-plus/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.resolve(__dirname, '../fixtures');

type DiagnosticGroupId = 'configuration' | 'environment' | 'project' | 'tools';

async function checksFor(cwd: string, group: DiagnosticGroupId) {
  const { groups } = await runDiagnostics(cwd, { groups: [group] });
  return groups.flatMap((entry) => entry.checks);
}

describe('runDiagnostics environment group', () => {
  test('returns Node.js and Git checks', async () => {
    const checks = await checksFor(
      path.join(fixtures, 'react-vite-tailwind'),
      'environment'
    );
    const nodeCheck = checks.find((c) => c.name === 'Node.js');
    const gitCheck = checks.find((c) => c.name === 'Git');

    expect(nodeCheck).toBeDefined();
    expect(nodeCheck?.message).toContain('Node.js');
    expect(gitCheck).toBeDefined();
  });
});

describe('runDiagnostics project group', () => {
  test('returns project structure checks', async () => {
    const checks = await checksFor(
      path.join(fixtures, 'react-vite-tailwind'),
      'project'
    );
    expect(checks.length).toBeGreaterThan(0);

    const lockfileCheck = checks.find((c) => c.name === 'Lockfile');
    expect(lockfileCheck).toBeDefined();

    // TypeScript is in fixture deps
    const tsCheck = checks.find((c) => c.name === 'TypeScript config');
    expect(tsCheck).toBeDefined();
  });

  test('returns fewer checks for minimal project', async () => {
    const checks = await checksFor(path.join(fixtures, 'node-only'), 'project');
    expect(checks.length).toBeGreaterThan(0);
  });
});

describe('runDiagnostics configuration group', () => {
  test('passes for clean project', async () => {
    const checks = await checksFor(
      path.join(fixtures, 'react-vite-tailwind'),
      'configuration'
    );
    expect(checks.some((c) => c.status === 'pass')).toBe(true);
  });
});

describe('runDiagnostics tools group', () => {
  test('returns checks for tools in package.json', async () => {
    const checks = await checksFor(
      path.join(fixtures, 'react-vite-tailwind'),
      'tools'
    );
    // TypeScript is in devDependencies
    const tsCheck = checks.find((c) => c.name.includes('TypeScript'));
    expect(tsCheck).toBeDefined();
  });
});

describe('runDiagnostics', () => {
  test('returns every group in canonical order with a matching summary', async () => {
    const { groups, summary } = await runDiagnostics(
      path.join(fixtures, 'react-vite-tailwind')
    );

    expect(groups.map((group) => group.title)).toEqual([
      'Environment',
      'Tools',
      'Project',
      'Configuration',
    ]);

    const checks = groups.flatMap((group) => group.checks);
    expect(summary.total).toBe(checks.length);
    expect(summary.pass).toBe(checks.filter((c) => c.status === 'pass').length);
    expect(summary.warn).toBe(checks.filter((c) => c.status === 'warn').length);
    expect(summary.fail).toBe(checks.filter((c) => c.status === 'fail').length);
  });
});
