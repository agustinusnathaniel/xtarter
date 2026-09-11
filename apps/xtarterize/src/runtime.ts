import { DepsInstaller, logError, ProcessRunner } from '@xtarterize/core';
import { Cause, Effect, Exit, Layer, Option, Result } from 'effect';

/** Services every CLI command program may require. */
export const AppLayer = Layer.mergeAll(
  DepsInstaller.layer,
  ProcessRunner.layer
);

export interface RunCliProgramOptions {
  signal?: AbortSignal;
}

function formatFailureValue(value: unknown): string {
  if (value instanceof Error) {
    return value.message || value.name;
  }
  return String(value);
}

function renderFailure(cause: Cause.Cause<unknown>): void {
  const error = Cause.findErrorOption(cause);
  if (Option.isSome(error)) {
    logError(formatFailureValue(error.value));
    return;
  }
  const defect = Cause.findDefect(cause);
  if (Result.isSuccess(defect)) {
    logError(formatFailureValue(defect.success));
    return;
  }
  logError(Cause.pretty(cause));
}

/**
 * The single runtime edge: run one command program with the app layer and
 * render any non-interrupt failure exactly once.
 *
 * A failed program resolves to `undefined` after setting `process.exitCode`;
 * callers must treat that as a stop signal. Interrupt-only exits keep the
 * process exit code at 0 (Ctrl+C behavior).
 */
export async function runCliProgram<A, E>(
  program: Effect.Effect<A, E, DepsInstaller | ProcessRunner>,
  options: RunCliProgramOptions = {}
): Promise<A> {
  const exit = await Effect.runPromiseExit(Effect.provide(program, AppLayer), {
    signal: options.signal,
  });
  if (Exit.isSuccess(exit)) {
    return exit.value;
  }
  if (Cause.hasInterruptsOnly(exit.cause)) {
    process.exitCode = 0;
    return undefined as A;
  }
  renderFailure(exit.cause);
  process.exitCode = 1;
  return undefined as A;
}
