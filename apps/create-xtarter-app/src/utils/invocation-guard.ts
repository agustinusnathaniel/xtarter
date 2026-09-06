import { type CliArgsDefinition, validateInvocation } from '@xtarterize/core';
import { type CittyPlugin, defineCittyPlugin, type Resolvable } from 'citty';

/**
 * Loaders returning each subcommand's definition. Typed structurally — the
 * guard only reads `args` — because citty erases subcommand maps to
 * `CommandDef<any>`, which the linter forbids spelling out.
 */
export type SubcommandLoaders = Record<
  string,
  () => Promise<{ args?: unknown }>
>;

interface PluginContext {
  cmd: { args?: unknown };
  rawArgs: Array<string>;
}

interface InvocationGuardOptions {
  /** Display name used in error lines, e.g. `create-xtarter-app preview` */
  commandLabel: string;
  /**
   * When true, the first positional must be a known subcommand (the entry
   * command has no `run` of its own). When false, unrecognized positionals
   * belong to the entry command itself.
   */
  requireKnownSubcommand: boolean;
  subcommands: SubcommandLoaders;
}

async function toArgsDefinition(argsDef: unknown): Promise<CliArgsDefinition> {
  const resolved =
    typeof argsDef === 'function'
      ? await (argsDef as () => unknown)()
      : argsDef;
  return (resolved ?? {}) as CliArgsDefinition;
}

function toArgsDefinitionLoaders(
  subcommands: SubcommandLoaders
): Record<string, () => Promise<CliArgsDefinition>> {
  return Object.fromEntries(
    Object.entries(subcommands).map(([name, load]) => [
      name,
      async () => toArgsDefinition((await load()).args),
    ])
  );
}

/**
 * Fail fast on invalid invocations (unknown options, with suggestions)
 * before citty dispatches them. Citty ignores undeclared options and would
 * run anyway, so the guard exits with stderr lines that both humans and
 * agents can act on.
 */
export function createInvocationGuard(
  options: InvocationGuardOptions
): Resolvable<CittyPlugin> {
  return defineCittyPlugin({
    name: 'invocation-guard',
    async setup(context: PluginContext) {
      const issues = await validateInvocation({
        argsDef: await toArgsDefinition(context.cmd.args),
        commandLabel: options.commandLabel,
        rawArgs: context.rawArgs,
        requireKnownSubcommand: options.requireKnownSubcommand,
        subcommands: toArgsDefinitionLoaders(options.subcommands),
      });
      if (issues.length === 0) {
        return;
      }
      for (const line of issues) {
        console.error(line);
      }
      process.exit(1);
    },
  });
}
