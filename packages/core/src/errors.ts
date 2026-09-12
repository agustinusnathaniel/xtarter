import { Data } from 'effect';

export class FileSystemError extends Data.TaggedError('FileSystemError')<{
  readonly path: string;
  readonly cause: unknown;
}> {}

export class BackupError extends Data.TaggedError('BackupError')<{
  readonly path: string;
  readonly cause: unknown;
  /** Rendered text for the failure; omitted callers keep the tag-only default. */
  readonly message?: string;
}> {}

export class TaskError extends Data.TaggedError('TaskError')<{
  readonly taskId: string;
  readonly message: string;
  readonly cause?: unknown;
}> {}

export class DepsInstallError extends Data.TaggedError('DepsInstallError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export class ProcessError extends Data.TaggedError('ProcessError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}
