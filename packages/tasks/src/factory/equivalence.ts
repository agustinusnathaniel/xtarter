export type PackageScriptsMap = Record<string, string | undefined>;

const PM_SCRIPT_REF_PATTERN = /^(?:pnpm|npm|yarn|bun)(?:\s+run)?\s+(\S+)/;
const RUNNER_PATTERN = /^(npx|yarn|bun)(?:\s+)(.+)$/i;
const TOOL_PATTERN =
  /^(biome|eslint|oxlint|oxfmt|prettier|rome|tsc|vitest|jest|mocha|vite|webpack|rollup|astro|next|nuxt|plop|knip|commitizen|changeset|ultracite|vp|standard-version|release-it|hygen|depcheck|npm-check-updates|ncu|commit-and-tag-version)(?:\s|$)/i;

export function normalizeCommand(cmd: string): string {
  return cmd.replace(/\s+/g, ' ').trim();
}

export function extractTool(cmd: string): string | null {
  const norm = normalizeCommand(cmd);
  const toolMatch = norm.match(TOOL_PATTERN);
  if (toolMatch) {
    return toolMatch[1].toLowerCase();
  }
  const runnerMatch = norm.match(RUNNER_PATTERN);
  if (runnerMatch) {
    const toolInCmd = runnerMatch[2].match(TOOL_PATTERN);
    if (toolInCmd) {
      return toolInCmd[1].toLowerCase();
    }
  }
  const pmMatch = norm.match(PM_SCRIPT_REF_PATTERN);
  if (pmMatch) {
    return pmMatch[1];
  }
  return null;
}

function extractCompositeTasks(cmd: string): string | null {
  const norm = normalizeCommand(cmd).toLowerCase();
  const match = norm.match(/turbo\s+run\s+(.+)$/);
  return match ? match[1].trim() : null;
}

/**
 * Composite equivalence only applies when the task list can be extracted, so
 * `turbo run` and unknown variants such as `turborepo run` cannot be judged
 * equivalent through the composite rule.
 */
function isCompositeCommand(cmd: string): boolean {
  return extractCompositeTasks(cmd) !== null;
}

// Tool aliases - canonical tool name maps to known aliases
const TOOL_ALIASES: Record<string, Array<string>> = {
  cleanup: ['knip', 'depcheck', 'npm-check-updates', 'ncu'],
  format: ['oxfmt', 'prettier'],
  lint: ['eslint', 'biome', 'oxlint', 'prettier', 'rome'],
  release: ['commit-and-tag-version', 'standard-version', 'release-it'],
  scaffold: ['plop', 'hygen'],
  test: ['vitest', 'jest', 'mocha'],
  typecheck: ['tsc'],
};

// For tools like biome/ultracite, these subcommands are equivalent
const EQUIVALENT_SUBCOMMANDS: Record<string, Array<string>> = {
  biome: ['check', 'lint', 'format'],
  ultracite: ['check', 'fix'],
  vp: ['lint', 'check', 'fmt', 'staged'],
};

function normalizeTool(tool: string | null): string | null {
  if (!tool) {
    return null;
  }
  for (const [canonical, aliases] of Object.entries(TOOL_ALIASES)) {
    if (aliases.includes(tool.toLowerCase())) {
      return canonical;
    }
  }
  return tool.toLowerCase();
}

/**
 * Rules apply in a fixed order and short-circuit: exact match, composite
 * commands, shell operators, tool mismatch, same tool and args, equivalent
 * subcommands, then package-manager script refs. The order is semantic.
 */
export function areEquivalent(a: string, b: string): boolean {
  const normA = normalizeCommand(a);
  const normB = normalizeCommand(b);
  if (normA === normB) {
    return true;
  }

  const isCompositeA = isCompositeCommand(normA);
  const isCompositeB = isCompositeCommand(normB);
  if (isCompositeA && isCompositeB) {
    return extractCompositeTasks(normA) === extractCompositeTasks(normB);
  }
  if (isCompositeA || isCompositeB) {
    return false;
  }

  if (/[&|;]/.test(a) !== /[&|;]/.test(b)) {
    return false;
  }

  const toolA = extractTool(normA);
  const toolB = extractTool(normB);
  if (toolA === null || toolB === null) {
    return false;
  }
  if (normalizeTool(toolA) !== normalizeTool(toolB)) {
    return false;
  }

  const argsA = normA.slice(toolA.length).trimStart();
  const argsB = normB.slice(toolB.length).trimStart();
  const trimTrailingDot = (args: string) =>
    args.replace(/(\s+\.)?\s*$/, '').trim();
  if (trimTrailingDot(argsA) === trimTrailingDot(argsB)) {
    return true;
  }

  const subcommands = EQUIVALENT_SUBCOMMANDS[toolA.toLowerCase()];
  if (subcommands) {
    const subcommandPattern = new RegExp(`^(${subcommands.join('|')})\\s*`);
    const trimSubcommand = (args: string) =>
      args
        .replace(subcommandPattern, '')
        .replace(/^--write\s*/, '')
        .trim();
    return trimSubcommand(argsA) === trimSubcommand(argsB);
  }

  const refA = normA.match(PM_SCRIPT_REF_PATTERN)?.[1] ?? null;
  const refB = normB.match(PM_SCRIPT_REF_PATTERN)?.[1] ?? null;
  if (refA !== null && refB !== null) {
    return refA === refB;
  }
  return false;
}

export function findEquivalentScriptKey(
  scripts: PackageScriptsMap,
  targetValue: string
): string | null {
  for (const [key, value] of Object.entries(scripts)) {
    if (value && areEquivalent(value, targetValue)) {
      return key;
    }
  }
  return null;
}

export function hasScriptWithEquivalentValue(
  scripts: PackageScriptsMap,
  value: string
): boolean {
  return findEquivalentScriptKey(scripts, value) !== null;
}
