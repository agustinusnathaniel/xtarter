import type {
  CommandResult,
  ProcessError,
  ProcessRunOptions,
} from '@xtarterize/core';
import { DepsInstaller, ProcessRunner } from '@xtarterize/core';
import { Effect, Layer } from 'effect';

/** Real services wired the way the app runtime provides them. */
export const TestLayer = Layer.mergeAll(
  DepsInstaller.layer,
  ProcessRunner.layer
);

/** Run a program with the shared test layer. */
export function run<A, E>(
  effect: Effect.Effect<A, E, DepsInstaller | ProcessRunner>
): Promise<A> {
  return Effect.runPromise(Effect.provide(effect, TestLayer));
}

/** Run a program with a per-test layer, e.g. a stub `DepsInstaller`. */
export function runWith<A, E, R>(
  layer: Layer.Layer<R>,
  effect: Effect.Effect<A, E, R>
): Promise<A> {
  return Effect.runPromise(Effect.provide(effect, layer));
}

/** A stub `ProcessRunner.run` implementation for verification seams. */
export type ProcessRunnerStub = (
  command: string,
  args: ReadonlyArray<string>,
  options?: ProcessRunOptions
) => Effect.Effect<CommandResult, ProcessError>;

/** Layer that replaces `ProcessRunner` with a stub. */
export function processRunnerLayer(
  stub: ProcessRunnerStub
): Layer.Layer<ProcessRunner> {
  return Layer.succeed(ProcessRunner, { run: stub });
}

/** Run a program and capture its exit for failure assertions. */
export function runExit<A, E>(
  effect: Effect.Effect<A, E, DepsInstaller | ProcessRunner>
) {
  return Effect.runPromiseExit(Effect.provide(effect, TestLayer));
}
