import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packagesDir = join(root, 'packages');

/**
 * Runtime entry points that only the CLI edge may use. Packages construct
 * Effects and return them; they never run them. Matching is a plain
 * substring scan, so it errs toward flagging rather than missing a call.
 *
 * The bare `runPromise(` and `runSync(` patterns also catch destructured or
 * aliased calls such as `const { runPromise } = Effect; runPromise(...)`.
 * `runPromise(` does not match `runPromiseExit(`.
 */
const FORBIDDEN_PATTERNS = [
  'Effect.runPromise(',
  'runPromise(',
  '.runPromiseExit(',
  'runPromiseExit(',
  'runSync(',
  'ManagedRuntime',
];

/**
 * Minimal comment stripper: removes `//` line comments and `/* ... *\/`
 * block comments while preserving line count. It is not string-aware, so a
 * pattern inside a string literal is still flagged.
 */
function stripComments(source) {
  let code = '';
  let index = 0;
  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];
    if (char === '/' && next === '*') {
      const end = source.indexOf('*/', index + 2);
      const comment = source.slice(index, end === -1 ? source.length : end + 2);
      code += '\n'.repeat((comment.match(/\n/g) ?? []).length);
      index += comment.length;
      continue;
    }
    if (char === '/' && next === '/') {
      const end = source.indexOf('\n', index);
      index = end === -1 ? source.length : end;
      continue;
    }
    code += char;
    index += 1;
  }
  return code;
}

function* listSourceFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* listSourceFiles(path);
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      yield path;
    }
  }
}

function collectViolations(files) {
  const violations = [];
  for (const file of files) {
    const lines = stripComments(readFileSync(file, 'utf8')).split('\n');
    for (const [index, line] of lines.entries()) {
      const pattern = FORBIDDEN_PATTERNS.find((candidate) =>
        line.includes(candidate)
      );
      if (pattern) {
        violations.push({
          file,
          line: index + 1,
          pattern,
          text: line.trim(),
        });
      }
    }
  }
  return violations;
}

if (!existsSync(packagesDir)) {
  console.error(`FAIL: packages directory not found at ${packagesDir}`);
  process.exit(1);
}

const sourceFiles = [];
for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) {
    continue;
  }
  const srcDir = join(packagesDir, entry.name, 'src');
  if (existsSync(srcDir)) {
    sourceFiles.push(...listSourceFiles(srcDir));
  }
}

const violations = collectViolations(sourceFiles);
if (violations.length > 0) {
  console.error('FAIL: Effect runtime calls found in packages/*/src.');
  console.error(
    'Packages must return Effect values; only apps/xtarterize/src/runtime.ts may run them.'
  );
  for (const violation of violations) {
    console.error(
      `  ${relative(root, violation.file)}:${violation.line}: ${violation.text} [${violation.pattern}]`
    );
  }
  process.exit(1);
}

console.log(
  `PASS: Effect boundaries respected (${sourceFiles.length} files checked).`
);
