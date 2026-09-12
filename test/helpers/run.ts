import { runCliProgram } from '@xtarterize/app/runtime.js';
import { Prompter, type PrompterShape } from '@xtarterize/app/ui/prompter.js';
import type {
  CommandResult,
  ProcessError,
  ProcessRunOptions,
} from '@xtarterize/core';
import { DepsInstaller, ProcessRunner } from '@xtarterize/core';
import { Effect, Layer } from 'effect';

/** Services every app program may require at the CLI edge. */
export type TestServices = DepsInstaller | ProcessRunner | Prompter;

/** Real services wired the way the app runtime provides them. */
export const TestLayer = Layer.mergeAll(
  DepsInstaller.layer,
  ProcessRunner.layer,
  Prompter.layer
);

/** Run a program with the shared test layer. */
export function run<A, E>(
  effect: Effect.Effect<A, E, TestServices>
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

/**
 * Run an app command program through the real CLI edge (failure rendering and
 * `process.exitCode` semantics included) with an optional scripted prompter.
 */
export function runCli<A, E>(
  program: Effect.Effect<A, E, TestServices>,
  prompter?: PrompterShape
): Promise<A | undefined> {
  const withPrompter =
    prompter === undefined
      ? program
      : Effect.provideService(program, Prompter, prompter);
  return runCliProgram(withPrompter);
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

/** One recorded `ProcessRunner.run` invocation. */
export type ProcessRunnerCall = [
  command: string,
  args: ReadonlyArray<string>,
  options: ProcessRunOptions | undefined,
];

/** A recording `ProcessRunner` stub whose result is scriptable per test. */
export interface RecordingProcessRunner {
  /** Recorded invocations, in call order. */
  readonly calls: ReadonlyArray<ProcessRunnerCall>;
  /** Layer that replaces `ProcessRunner` with this stub. */
  readonly layer: Layer.Layer<ProcessRunner>;
  /** Clear recorded invocations and restore the success result. */
  reset: () => void;
  /** Set the result returned by subsequent runs. */
  setResult: (result: CommandResult) => void;
}

/** Create a recording `ProcessRunner` stub that succeeds until scripted. */
export function recordingProcessRunner(): RecordingProcessRunner {
  const calls: Array<ProcessRunnerCall> = [];
  let result: CommandResult = { exitCode: 0, stderr: '', stdout: '' };

  return {
    calls,
    layer: processRunnerLayer((command, args, options) =>
      Effect.sync(() => {
        calls.push([command, args, options]);
        return result;
      })
    ),
    reset() {
      calls.length = 0;
      result = { exitCode: 0, stderr: '', stdout: '' };
    },
    setResult(next) {
      result = next;
    },
  };
}
