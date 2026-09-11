import type { ProjectProfile } from '@xtarterize/core';

import {
  defineSingleTargetTask,
  type TargetPolicy,
} from '@/factory/define-task.js';

const REQUIRED_PACKAGES = ['apps/*', 'packages/*'] as const;

/** Top-level `packages:` key. Anchored so commented-out keys are ignored. */
const PACKAGES_KEY = /^packages\s*:/;

/** YAML list item, capturing its indentation and raw value. */
const LIST_ITEM = /^(\s*)-\s+(.+)$/;

type WorkspaceStatus = 'conflict' | 'patch' | 'satisfied';

interface WorkspacePlan {
  content: string;
  status: WorkspaceStatus;
}

interface PackagesBlock {
  entries: Set<string>;
  indent: string;
  insertAt: number;
  quote: string;
}

function detectLineEnding(content: string): string {
  return content.includes('\r\n') ? '\r\n' : '\n';
}

/** Drop a trailing `# ...` comment unless it sits inside quotes. */
function stripInlineComment(value: string): string {
  let quote: string | null = null;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (quote !== null) {
      if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '#' && (index === 0 || /\s/.test(value[index - 1]))) {
      return value.slice(0, index);
    }
  }
  return value;
}

/** Normalize a glob entry so `'./apps/*'` and `"apps/*"` compare equal. */
function normalizePackageGlob(value: string): string {
  let glob = stripInlineComment(value).trim();
  const quote = glob[0];
  if ((quote === '"' || quote === "'") && glob.endsWith(quote)) {
    glob = glob.slice(1, -1);
  }
  if (glob.startsWith('./')) {
    glob = glob.slice(2);
  }
  return glob.trim();
}

/** Quote character an entry uses, or `null` when it is unquoted. */
function quoteStyleOf(value: string): string | null {
  const quote = stripInlineComment(value).trim()[0];
  return quote === '"' || quote === "'" ? quote : null;
}

/** Parse a single-line flow list, or `null` when it is malformed. */
function parseFlowList(value: string): Set<string> | null {
  const end = value.indexOf(']');
  if (!value.startsWith('[') || end === -1) {
    return null;
  }
  const body = value.slice(1, end).trim();
  const entries = new Set<string>();
  if (body === '') {
    return entries;
  }
  for (const part of body.split(',')) {
    entries.add(normalizePackageGlob(part));
  }
  return entries;
}

function isSatisfied(entries: Set<string>): boolean {
  return REQUIRED_PACKAGES.every((glob) => entries.has(glob));
}

/**
 * Walk a block-style `packages:` list. Returns `null` for shapes the editor
 * cannot safely rewrite, such as a scalar value or nested mapping.
 */
function scanPackagesBlock(
  lines: Array<string>,
  startIndex: number
): PackagesBlock | null {
  const block: PackagesBlock = {
    entries: new Set(),
    indent: '  ',
    insertAt: startIndex,
    quote: "'",
  };
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) {
      continue;
    }
    if (trimmed === '---' || trimmed === '...') {
      break;
    }
    const item = LIST_ITEM.exec(line);
    if (item) {
      block.indent = item[1];
      block.quote = quoteStyleOf(item[2]) ?? '';
      block.entries.add(normalizePackageGlob(item[2]));
      block.insertAt = index;
      continue;
    }
    if (/^\s/.test(line)) {
      return null;
    }
    break;
  }
  return block;
}

/**
 * Classify existing pnpm-workspace.yaml content. `patch` means the renderer
 * inserts missing globs into an existing `packages:` list; `conflict` means
 * the shape is not safely editable. Content without a `packages:` key is
 * reported `satisfied` so the task leaves the user's settings-only file alone.
 */
function planWorkspace(existing: string): WorkspacePlan {
  const lineEnding = detectLineEnding(existing);
  const lines = existing.split(/\r?\n/);
  const keyIndex = lines.findIndex((line) => PACKAGES_KEY.test(line));
  if (keyIndex === -1) {
    return { content: existing, status: 'satisfied' };
  }
  const keyLine = lines[keyIndex];
  const inlineValue = stripInlineComment(
    keyLine.slice(keyLine.indexOf(':') + 1)
  ).trim();
  if (inlineValue !== '') {
    const entries = parseFlowList(inlineValue);
    if (entries !== null && isSatisfied(entries)) {
      return { content: existing, status: 'satisfied' };
    }
    return { content: existing, status: 'conflict' };
  }
  const block = scanPackagesBlock(lines, keyIndex);
  if (block === null) {
    return { content: existing, status: 'conflict' };
  }
  if (isSatisfied(block.entries)) {
    return { content: existing, status: 'satisfied' };
  }
  const missing = REQUIRED_PACKAGES.filter((glob) => !block.entries.has(glob));
  const quote = block.quote;
  const inserted = missing.map(
    (glob) => `${block.indent}- ${quote}${glob}${quote}`
  );
  const content = [
    ...lines.slice(0, block.insertAt + 1),
    ...inserted,
    ...lines.slice(block.insertAt + 1),
  ].join(lineEnding);
  return { content, status: 'patch' };
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
  label: 'pnpm-workspace.yaml - pnpm workspace config',
  scope: 'root',
  searchMeta: {
    keywords: [
      'pnpm',
      'workspace',
      'monorepo',
      'single-package',
      'pnpm-workspace',
      'package manager',
    ],
    tags: ['workspace', 'pnpm', 'package-manager'],
  },
  target: {
    filepath: 'pnpm-workspace.yaml',
    kind: 'text',
    policy: pnpmWorkspacePolicy,
    render: (profile, existing) => pnpmWorkspaceContent(profile, existing),
  },
});
