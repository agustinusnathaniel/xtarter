/**
 * Pure helpers for interpreting CLI argument tokens the same way citty's
 * parser does (aliases, kebab/camel variants, value flags, `--` terminator).
 * They exist so CLIs can validate invocations before dispatching them.
 */

import { levenshtein } from '@/inquiry/fuzzy.js';

export interface CliArgDefinition {
  alias?: string | Array<string>;
  type?: 'boolean' | 'enum' | 'positional' | 'string';
}

export type CliArgsDefinition = Record<string, CliArgDefinition>;

export interface UnknownFlag {
  suggestion?: string;
  token: string;
}

export interface InvocationValidationOptions {
  /** Argument definition of the command being invoked */
  argsDef: CliArgsDefinition;
  /** Display name used in error lines, e.g. `xtarterize check` */
  commandLabel: string;
  rawArgs: Array<string>;
  requireKnownSubcommand?: boolean;
  /** Lazy loaders returning the argument definitions of each subcommand */
  subcommands?: Record<string, () => Promise<CliArgsDefinition>>;
}

const BUILTIN_HELP_FLAGS = new Set(['--help', '-h', '--version', '-v']);
const SUGGESTION_MAX_DISTANCE = 2;
const SUGGESTION_MIN_PREFIX_LENGTH = 3;

function toCamelCase(value: string): string {
  return value.replace(/-+([a-zA-Z0-9])/g, (_, char: string) =>
    char.toUpperCase()
  );
}

function toKebabCase(value: string): string {
  return value.replace(/([a-zA-Z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function toArray(value: string | Array<string> | undefined): Array<string> {
  if (Array.isArray(value)) {
    return value;
  }
  return value === undefined ? [] : [value];
}

function spellings(name: string): Array<string> {
  const variants = new Set([name, toCamelCase(name), toKebabCase(name)]);
  return [...variants];
}

function isValueFlag(name: string, argsDef: CliArgsDefinition): boolean {
  const normalized = toCamelCase(name);
  for (const [key, def] of Object.entries(argsDef)) {
    if (def.type !== 'string' && def.type !== 'enum') {
      continue;
    }
    if (normalized === toCamelCase(key)) {
      return true;
    }
    if (toArray(def.alias).includes(name)) {
      return true;
    }
  }
  return false;
}

/**
 * Index of the first positional token, mirroring how citty finds a
 * subcommand name: flag values of string/enum args are skipped, `--`
 * ends the search. Returns -1 when no positional exists.
 */
export function findFirstPositionalIndex(
  rawArgs: Array<string>,
  argsDef: CliArgsDefinition
): number {
  for (let index = 0; index < rawArgs.length; index++) {
    const arg = rawArgs[index];
    if (arg === '--') {
      return -1;
    }
    if (!arg.startsWith('-')) {
      return index;
    }
    if (arg.includes('=')) {
      continue;
    }
    if (isValueFlag(arg.replace(/^-{1,2}/, ''), argsDef)) {
      index++;
    }
  }
  return -1;
}

interface KnownFlag {
  name: string;
  type: CliArgDefinition['type'];
}

function collectKnownFlags(argsDef: CliArgsDefinition): Map<string, KnownFlag> {
  const known = new Map<string, KnownFlag>();
  for (const [name, def] of Object.entries(argsDef)) {
    if (def.type === 'positional') {
      continue;
    }
    for (const spelling of spellings(name)) {
      known.set(spelling, { name, type: def.type });
    }
    for (const alias of toArray(def.alias)) {
      known.set(alias, { name, type: def.type });
    }
  }
  for (const builtin of ['help', 'h', 'version', 'v']) {
    if (!known.has(builtin)) {
      known.set(builtin, { name: builtin, type: 'boolean' });
    }
  }
  return known;
}

/**
 * Tokens that citty's parser would silently drop: every flag whose name is
 * not declared (including aliases, kebab/camel variants, `--no-` negation
 * of a boolean, and the built-in help/version flags). Values of string/enum
 * flags are skipped, unknown flags consume nothing, `--` ends the scan.
 */
export function findUnknownFlags(
  rawArgs: Array<string>,
  argsDef: CliArgsDefinition
): Array<UnknownFlag> {
  const known = collectKnownFlags(argsDef);
  const unknown: Array<UnknownFlag> = [];
  for (let index = 0; index < rawArgs.length; index++) {
    const token = rawArgs[index];
    if (token === '--') {
      break;
    }
    if (!token.startsWith('-') || token === '-') {
      continue;
    }
    const isLong = token.startsWith('--');
    const body = isLong ? token.slice(2) : token.slice(1);
    const inlineValue = body.includes('=');
    const name = inlineValue ? body.slice(0, body.indexOf('=')) : body;
    const negatedName =
      isLong && name.startsWith('no-') ? name.slice(3) : undefined;
    const flag = known.get(negatedName ?? name);
    const isValidNegation =
      negatedName !== undefined &&
      flag !== undefined &&
      flag.type === 'boolean';
    if (!flag || (negatedName !== undefined && !isValidNegation)) {
      unknown.push({ suggestion: suggestFlag(name, known), token });
      continue;
    }
    if (
      negatedName === undefined &&
      !inlineValue &&
      (flag.type === 'string' || flag.type === 'enum')
    ) {
      index++;
    }
  }
  return unknown;
}

/**
 * Closest candidate for a mistyped name: edit distance <= 2, or a
 * >= 3-character prefix of a candidate. Ties resolve alphabetically.
 * Returns undefined when nothing is close enough to be worth suggesting.
 */
export function suggestSimilar(
  input: string,
  candidates: Array<string>
): string | undefined {
  const normalized = input.toLowerCase();
  let best: string | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of [...candidates].sort()) {
    const target = candidate.toLowerCase();
    const isPrefix =
      target.startsWith(normalized) &&
      normalized.length >= SUGGESTION_MIN_PREFIX_LENGTH;
    const distance = levenshtein(normalized, target);
    const effective = isPrefix
      ? Math.min(distance, SUGGESTION_MAX_DISTANCE)
      : distance;
    if (effective > SUGGESTION_MAX_DISTANCE || effective >= bestDistance) {
      continue;
    }
    best = candidate;
    bestDistance = effective;
  }
  return best;
}

function suggestFlag(
  name: string,
  known: Map<string, KnownFlag>
): string | undefined {
  const candidates = new Set<string>();
  for (const flag of known.values()) {
    candidates.add(toKebabCase(flag.name));
  }
  return suggestSimilar(name, [...candidates]);
}

function unknownFlagIssues(
  rawArgs: Array<string>,
  argsDef: CliArgsDefinition,
  commandLabel: string
): Array<string> {
  const unknownFlags = findUnknownFlags(rawArgs, argsDef);
  if (unknownFlags.length === 0) {
    return [];
  }
  const lines = unknownFlags.map(({ suggestion, token }) =>
    suggestion === undefined
      ? `Unknown option ${token} for "${commandLabel}".`
      : `Unknown option ${token} for "${commandLabel}". Did you mean --${suggestion}?`
  );
  lines.push(`Run "${commandLabel} --help" to see valid options.`);
  return lines;
}

function unknownCommandIssues(
  name: string,
  candidates: Array<string>,
  commandLabel: string
): Array<string> {
  const suggestion = suggestSimilar(name, candidates);
  const line =
    suggestion === undefined
      ? `Unknown command "${name}" for "${commandLabel}".`
      : `Unknown command "${name}" for "${commandLabel}". Did you mean "${suggestion}"?`;
  return [line, `Run "${commandLabel} --help" to see available commands.`];
}

/**
 * Validate a raw CLI invocation against the command tree before dispatch:
 * unknown options at the entry level and (when the matching subcommand is
 * recognized) at the subcommand level. Returns human-readable error lines;
 * an empty array means the invocation is valid.
 *
 * `requireKnownSubcommand` marks entry commands whose first positional must
 * be a known subcommand (CLIs with no `run` of their own). When false, an
 * unrecognized positional is treated as an argument of the entry command.
 */
export async function validateInvocation(
  options: InvocationValidationOptions
): Promise<Array<string>> {
  const {
    argsDef,
    commandLabel,
    rawArgs,
    requireKnownSubcommand = false,
    subcommands = {},
  } = options;
  if (rawArgs.some((arg) => BUILTIN_HELP_FLAGS.has(arg))) {
    return [];
  }
  const commandIndex = findFirstPositionalIndex(rawArgs, argsDef);
  const prefixEnd = commandIndex === -1 ? rawArgs.length : commandIndex;
  const issues = unknownFlagIssues(
    rawArgs.slice(0, prefixEnd),
    argsDef,
    commandLabel
  );
  if (commandIndex === -1) {
    return issues;
  }
  const subcommandName = rawArgs[commandIndex];
  const loadSubcommandArgs = subcommands[subcommandName];
  if (loadSubcommandArgs === undefined) {
    if (!requireKnownSubcommand) {
      // The positional belongs to the entry command, so its flags continue
      // after it and are validated against the entry definition.
      return [
        ...issues,
        ...unknownFlagIssues(
          rawArgs.slice(commandIndex + 1),
          argsDef,
          commandLabel
        ),
      ];
    }
    return [
      ...issues,
      ...unknownCommandIssues(
        subcommandName,
        Object.keys(subcommands),
        commandLabel
      ),
    ];
  }
  const subArgsDef = await loadSubcommandArgs();
  return [
    ...issues,
    ...unknownFlagIssues(
      rawArgs.slice(commandIndex + 1),
      subArgsDef,
      `${commandLabel} ${subcommandName}`
    ),
  ];
}
