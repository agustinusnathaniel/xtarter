import { diffLines, diffWords } from 'diff';
import pc from 'picocolors';

import type {
  ChangeStats,
  DiffHunk,
  FileDiff,
  SemanticEntry,
} from '@/_base.js';

export type { ChangeStats, DiffHunk, FileDiff, SemanticEntry };

export function generateDiff(before: string | null, after: string): string {
  const useWords = isWordLevelDiff(before, after);
  const changes = useWords
    ? diffWords(before ?? '', after)
    : diffLines(before ?? '', after);
  const lines: Array<string> = [];

  for (const change of changes) {
    const prefix = change.added ? '+ ' : change.removed ? '- ' : '  ';
    const color = change.added ? pc.green : change.removed ? pc.red : String;
    const _reset = change.added || change.removed ? pc.reset : String;

    for (const line of change.value.split('\n')) {
      if (line === '' && change.value.endsWith('\n')) {
        continue;
      }
      lines.push(color(`${prefix}${line}`));
    }
  }

  return lines.join('\n');
}

export function computeChangeStats(
  before: string | null,
  after: string
): ChangeStats {
  const changes = diffLines(before ?? '', after);
  let added = 0;
  let removed = 0;
  for (const change of changes) {
    if (change.added) {
      added += change.count ?? 0;
    }
    if (change.removed) {
      removed += change.count ?? 0;
    }
  }
  return { added, removed };
}

export function computeUnifiedHunks(
  before: string | null,
  after: string
): Array<DiffHunk> {
  const changes = diffLines(before ?? '', after);
  const lines: Array<string> = [];
  let added = 0;
  let removed = 0;

  for (const change of changes) {
    const rawLines = change.value.split('\n');
    if (rawLines.at(-1) === '') {
      rawLines.pop();
    }
    if (rawLines.length === 0) {
      continue;
    }

    if (change.added) {
      for (const line of rawLines) {
        lines.push(`+ ${line}`);
      }
      added += rawLines.length;
    } else if (change.removed) {
      for (const line of rawLines) {
        lines.push(`- ${line}`);
      }
      removed += rawLines.length;
    } else {
      for (const line of rawLines) {
        lines.push(`  ${line}`);
      }
    }
  }

  const beforeLineCount = before ? before.split('\n').length : 0;
  const afterLineCount = after.split('\n').length;
  const header = `@@ -${beforeLineCount},${removed} +${afterLineCount},${added} @@`;

  return [{ added, header, lines, removed }];
}

export function computeSemanticJsonDiff(
  before: string | null,
  after: string
): SemanticEntry | undefined {
  if (before === null) {
    return { added: { '(full file)': after } };
  }
  try {
    const beforeObj = JSON.parse(before);
    const afterObj = JSON.parse(after);
    const result = deepDiff(beforeObj, afterObj);
    if (
      Object.keys(result.added).length === 0 &&
      Object.keys(result.removed).length === 0 &&
      Object.keys(result.modified).length === 0
    ) {
      return undefined;
    }
    return {
      ...(Object.keys(result.added).length > 0 && { added: result.added }),
      ...(Object.keys(result.removed).length > 0 && {
        removed: result.removed,
      }),
      ...(Object.keys(result.modified).length > 0 && {
        modified: result.modified,
      }),
    };
  } catch {
    return undefined;
  }
}

export function enhanceDiff(diff: FileDiff): FileDiff {
  const stats = computeChangeStats(diff.before, diff.after);
  const hunks = computeUnifiedHunks(diff.before, diff.after);
  const isJson =
    diff.filepath.endsWith('.json') ||
    diff.filepath.endsWith('.jsonc') ||
    diff.filepath.endsWith('.json5');
  const semantic = isJson
    ? computeSemanticJsonDiff(diff.before, diff.after)
    : undefined;

  return { ...diff, hunks, semantic, stats };
}

function isWordLevelDiff(before: string | null, after: string): boolean {
  if (before === null) {
    return false;
  }
  const bLines = before.split('\n');
  const aLines = after.split('\n');
  if (bLines.length !== aLines.length) {
    return false;
  }
  if (bLines.length > 50) {
    return false;
  }
  return true;
}

function deepDiff(
  before: unknown,
  after: unknown,
  path = ''
): {
  added: Record<string, string>;
  removed: Record<string, string>;
  modified: Record<string, { before: string; after: string }>;
} {
  const added: Record<string, string> = {};
  const removed: Record<string, string> = {};
  const modified: Record<string, { before: string; after: string }> = {};

  if (typeof before !== typeof after) {
    modified[path || '(root)'] = {
      after: JSON.stringify(after),
      before: JSON.stringify(before),
    };
    return { added, modified, removed };
  }

  if (
    before === null ||
    after === null ||
    typeof before !== 'object' ||
    typeof after !== 'object'
  ) {
    if (before !== after) {
      modified[path || '(root)'] = {
        after: JSON.stringify(after),
        before: JSON.stringify(before),
      };
    }
    return { added, modified, removed };
  }

  const beforeObj = before as Record<string, unknown>;
  const afterObj = after as Record<string, unknown>;
  const allKeys = new Set([
    ...Object.keys(beforeObj),
    ...Object.keys(afterObj),
  ]);

  for (const key of allKeys) {
    const keyPath = path ? `${path}.${key}` : key;
    if (!(key in beforeObj)) {
      const val = afterObj[key];
      added[keyPath] =
        typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val);
    } else if (!(key in afterObj)) {
      const val = beforeObj[key];
      removed[keyPath] =
        typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val);
    } else if (
      typeof beforeObj[key] === 'object' &&
      typeof afterObj[key] === 'object' &&
      beforeObj[key] !== null &&
      afterObj[key] !== null &&
      !Array.isArray(beforeObj[key]) &&
      !Array.isArray(afterObj[key])
    ) {
      const nested = deepDiff(beforeObj[key], afterObj[key], keyPath);
      Object.assign(added, nested.added);
      Object.assign(removed, nested.removed);
      Object.assign(modified, nested.modified);
    } else if (
      JSON.stringify(beforeObj[key]) !== JSON.stringify(afterObj[key])
    ) {
      modified[keyPath] = {
        after: JSON.stringify(afterObj[key]),
        before: JSON.stringify(beforeObj[key]),
      };
    }
  }

  return { added, modified, removed };
}

export function formatDiffHeader(filepath: string, isNew: boolean): string {
  const beforeLabel = isNew ? '/dev/null' : `a/${filepath}`;
  const afterLabel = `b/${filepath}`;

  return `--- ${beforeLabel}\n+++ ${afterLabel}`;
}
