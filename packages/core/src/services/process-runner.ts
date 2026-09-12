import { Context, Duration, Effect, Layer } from 'effect';
import { x } from 'tinyexec';

import { ProcessError } from '@/errors.js';
import { describeCause } from '@/utils/errors.js';

export interface CommandResult {
  exitCode: number;
  stderr: string;
  stdout: string;
}

export interface ProcessRunOptions {
  cwd?: string;
  stdio?: 'pipe' | 'inherit';
  timeout?: Duration.Input;
}

function runCommand(
  command: string,
  args: ReadonlyArray<string>,
  options?: ProcessRunOptions
): Effect.Effect<CommandResult, ProcessError> {
  const execution = Effect.tryPromise({
    catch: (cause) =>
      new ProcessError({
        cause,
        message: describeCause(cause),
      }),
    try: (signal) =>
      x(command, [...args], {
        nodeOptions: { cwd: options?.cwd, stdio: options?.stdio },
        signal,
      }).then((result) => ({
        exitCode: result.exitCode ?? -1,
        stderr: result.stderr,
        stdout: result.stdout,
      })),
  });

  const timeout = options?.timeout;
  if (timeout === undefined) {
    return execution;
  }
  return Effect.timeoutOrElse(execution, {
    duration: timeout,
    orElse: () =>
      Effect.fail(
        new ProcessError({
          message: `Command "${command}" timed out after ${Duration.format(Duration.fromInputUnsafe(timeout))}`,
        })
      ),
  });
}

/** Runs external processes with interruption propagated to the child. */
export class ProcessRunner extends Context.Service<
  ProcessRunner,
  {
    run: (
      command: string,
      args: ReadonlyArray<string>,
      options?: ProcessRunOptions
    ) => Effect.Effect<CommandResult, ProcessError>;
  }
>()('xtarterize/ProcessRunner') {
  static readonly layer: Layer.Layer<ProcessRunner> = Layer.succeed(
    ProcessRunner,
    { run: runCommand }
  );
}
