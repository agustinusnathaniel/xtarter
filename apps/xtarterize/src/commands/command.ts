import type { ArgsDef, ParsedArgs } from 'citty';
import { defineCommand } from 'citty';
import { Effect } from 'effect';

import { runCliProgram } from '@/runtime.js';

type CliProgram<A> = (
  args: A
) => Parameters<typeof runCliProgram>[0] | Promise<void>;

interface CliCommandOptions<T extends ArgsDef> {
  args: T;
  description: string;
  name: string;
  program: CliProgram<ParsedArgs<T>>;
}

/**
 * Thin citty wrapper for command programs: `defineCommand` owns parsing and
 * help, `runCliProgram` owns the Effect runtime edge, and an async handler
 * keeps its own control flow. Command-specific policy stays in the program
 * (ADR 030).
 */
export function cliCommand<const T extends ArgsDef>(
  options: CliCommandOptions<T>
) {
  const { args, description, name, program } = options;
  return defineCommand({
    args,
    meta: { description, name },
    run: async ({ args: parsed }) => {
      const result = program(parsed);
      await (Effect.isEffect(result) ? runCliProgram(result) : result);
    },
  });
}
