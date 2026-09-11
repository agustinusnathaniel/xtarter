import { diffLines } from 'diff';

import type {
  ChangeStats,
  DiffHunk,
  FileDiff,
  SemanticEntry,
} from '@/_base.js';

export function isJsonFile(filepath: string): boolean {
  return (
    filepath.endsWith('.json') ||
    filepath.endsWith('.jsonc') ||
    filepath.endsWith('.json5')
  );
}

interface DiffParts {
  hunks: Array<DiffHunk>;
  stats: ChangeStats;
}

// One diffLines pass feeds both stats and hunks; do not split it back into two.
function computeDiffParts(before: string | null, after: string): DiffParts {
  const changes = diffLines(before ?? '', after);
  const lines: Array<string> = [];
  let statsAdded = 0;
  let statsRemoved = 0;
  let hunkAdded = 0;
  let hunkRemoved = 0;

  for (const change of changes) {
    if (change.added) {
      statsAdded += change.count ?? 0;
    }
    if (change.removed) {
      statsRemoved += change.count ?? 0;
    }

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
      hunkAdded += rawLines.length;
    } else if (change.removed) {
      for (const line of rawLines) {
        lines.push(`- ${line}`);
      }
      hunkRemoved += rawLines.length;
    } else {
      for (const line of rawLines) {
        lines.push(`  ${line}`);
      }
    }
  }

  const beforeLineCount = before ? before.split('\n').length : 0;
  const afterLineCount = after.split('\n').length;
  const header = `@@ -${beforeLineCount},${hunkRemoved} +${afterLineCount},${hunkAdded} @@`;

  return {
    hunks: [{ added: hunkAdded, header, lines, removed: hunkRemoved }],
    stats: { added: statsAdded, removed: statsRemoved },
  };
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
  const { hunks, stats } = computeDiffParts(diff.before, diff.after);
  const semantic = isJsonFile(diff.filepath)
    ? computeSemanticJsonDiff(diff.before, diff.after)
    : undefined;

  return { ...diff, hunks, semantic, stats };
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
