import { consola } from '@xtarterize/core';

type Logger = ReturnType<typeof consola.withTag>;
/** `[startMessage, failPrefix, level]`; `warn` marks the step non-fatal. */
type StepMessages = readonly [
  startMessage: string,
  failPrefix: string,
  level?: 'fail' | 'warn',
];

/** Run a step with start/failure logging; `fail` rethrows, `warn` returns. */
export async function runStep<T>(
  tag: string,
  [startMessage, failPrefix, level = 'fail']: StepMessages,
  task: (logger: Logger) => Promise<T>
): Promise<T | undefined> {
  const logger = consola.withTag(tag);
  logger.start(startMessage);
  try {
    return await task(logger);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger[level](`${failPrefix}: ${message}`);
    if (level === 'fail') {
      throw error;
    }
    return undefined;
  }
}
