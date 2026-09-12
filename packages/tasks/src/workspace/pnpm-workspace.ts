import type { ProjectProfile } from '@xtarterize/core';
import { isNode, isScalar, isSeq, type Node, parseDocument } from 'yaml';

import {
  defineSingleTargetTask,
  type TargetPolicy,
} from '@/factory/define-task.js';

const REQUIRED_PACKAGES = ['apps/*', 'packages/*'] as const;

type WorkspaceStatus = 'conflict' | 'patch' | 'satisfied';

interface WorkspacePlan {
  content: string;
  status: WorkspaceStatus;
}

function isSatisfied(entries: Set<string>): boolean {
  return REQUIRED_PACKAGES.every((glob) => entries.has(glob));
}

/** Normalize entries so `'./apps/*'`, `"apps/*"`, and `apps/*` compare equal. */
function packageEntries(items: Iterable<unknown>): Set<string> {
  const entries = new Set<string>();
  for (const item of items) {
    if (!isScalar(item) || typeof item.value !== 'string') {
      continue;
    }
    const glob = item.value.trim();
    entries.add(glob.startsWith('./') ? glob.slice(2).trim() : glob);
  }
  return entries;
}

function detectLineEnding(content: string): string {
  return content.includes('\r\n') ? '\r\n' : '\n';
}

/** Offset just past the line that contains `offset`. */
function lineEndAfter(content: string, offset: number): number {
  const newline = content.indexOf('\n', offset);
  return newline === -1 ? content.length : newline + 1;
}

/** Leading whitespace of the line that `offset` starts on. */
function indentAt(content: string, offset: number): string {
  const lineStart = content.lastIndexOf('\n', offset - 1) + 1;
  return /^[ \t]*/.exec(content.slice(lineStart, offset))?.[0] ?? '';
}

/** Quote character an existing entry uses, or `''` for a plain entry. */
function quoteStyleOf(node: unknown): string {
  if (isScalar(node) && node.type === 'QUOTE_SINGLE') {
    return "'";
  }
  if (isScalar(node) && node.type === 'QUOTE_DOUBLE') {
    return '"';
  }
  return '';
}

/** The missing globs, indent, insert offset, and quote style for a patch. */
interface InsertionPlan {
  entries: Set<string>;
  indent: string;
  insertAt: number;
  quote: string;
}

/** Splice the missing globs in after `insertAt`, keeping the document intact. */
function patchContent(existing: string, plan: InsertionPlan): WorkspacePlan {
  const lineEnding = detectLineEnding(existing);
  const inserted = REQUIRED_PACKAGES.filter((glob) => !plan.entries.has(glob))
    .map(
      (glob) => `${plan.indent}- ${plan.quote}${glob}${plan.quote}${lineEnding}`
    )
    .join('');
  // `insertAt` can land at EOF when the file has no trailing newline; start
  // the inserted block on a fresh line instead of gluing it to the last item.
  const separator =
    plan.insertAt > 0 && existing[plan.insertAt - 1] !== '\n' ? lineEnding : '';
  return {
    content:
      existing.slice(0, plan.insertAt) +
      separator +
      inserted +
      existing.slice(plan.insertAt),
    status: 'patch',
  };
}

function patchBlock(
  existing: string,
  items: Array<unknown>,
  entries: Set<string>
): WorkspacePlan {
  const last = items.at(-1);
  const range = isNode(last) ? last.range : null;
  // A multi-line last item (for example a block scalar) cannot be extended
  // without splitting it; the line-based editor reported this as `conflict`.
  if (!range || existing.slice(range[0], range[1]).includes('\n')) {
    return { content: existing, status: 'conflict' };
  }
  return patchContent(existing, {
    entries,
    indent: indentAt(existing, range[0]),
    insertAt: lineEndAfter(existing, range[0]),
    quote: quoteStyleOf(last),
  });
}

function patchEmpty(existing: string, node: Node): WorkspacePlan {
  const range = node.range;
  if (!range) {
    return { content: existing, status: 'conflict' };
  }
  return patchContent(existing, {
    entries: new Set(),
    indent: '  ',
    insertAt: lineEndAfter(existing, range[1]),
    quote: "'",
  });
}

/**
 * Classify existing pnpm-workspace.yaml content. `patch` means the renderer
 * inserts missing globs into an existing `packages:` list; `conflict` means
 * the shape is not safely editable. Content without a `packages:` key is
 * reported `satisfied` so the task leaves the user's settings-only file alone.
 */
function planWorkspace(existing: string): WorkspacePlan {
  const document = parseDocument(existing);
  const packages = document.get('packages', true);
  if (packages === undefined) {
    return { content: existing, status: 'satisfied' };
  }
  if (document.errors.length > 0) {
    return { content: existing, status: 'conflict' };
  }
  if (isSeq(packages)) {
    const entries = packageEntries(packages.items);
    if (isSatisfied(entries)) {
      return { content: existing, status: 'satisfied' };
    }
    return packages.flow
      ? { content: existing, status: 'conflict' }
      : patchBlock(existing, packages.items, entries);
  }
  if (isScalar(packages) && packages.value === null) {
    return patchEmpty(existing, packages);
  }
  return { content: existing, status: 'conflict' };
}

function pnpmWorkspaceContent(
  profile: ProjectProfile,
  existing: string | null
): string {
  if (!profile.monorepo) {
    return existing ?? '# pnpm workspace config\n';
  }
  if (existing === null) {
    return ['packages:', "  - 'apps/*'", "  - 'packages/*'", ''].join('\n');
  }
  return planWorkspace(existing).content;
}

/**
 * Existing content is user-owned: report `patch` only when the renderer
 * inserted entries, `skip` when the globs are present (or the project is not
 * a monorepo), and `conflict` when the shape cannot be edited safely.
 */
const pnpmWorkspacePolicy: TargetPolicy = ({ after, before }, { profile }) => {
  if (before === null) {
    return;
  }
  if (!profile.monorepo) {
    return 'skip';
  }
  if (after !== before) {
    return 'patch';
  }
  return planWorkspace(before).status === 'satisfied' ? 'skip' : 'conflict';
};

export const pnpmWorkspaceTask = defineSingleTargetTask({
  applicable: (profile) => profile.packageManager === 'pnpm',
  group: 'Workspace',
  id: 'workspace/pnpm-workspace',
  keywords: [
    'pnpm',
    'workspace',
    'monorepo',
    'single-package',
    'pnpm-workspace',
    'package manager',
  ],
  label: 'pnpm-workspace.yaml - pnpm workspace config',
  scope: 'root',
  tags: ['workspace', 'pnpm', 'package-manager'],
  target: {
    filepath: 'pnpm-workspace.yaml',
    kind: 'text',
    policy: pnpmWorkspacePolicy,
    render: (profile, existing) => pnpmWorkspaceContent(profile, existing),
  },
});
