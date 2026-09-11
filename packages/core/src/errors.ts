export class FileSystemError extends Error {
  readonly path: string;
  readonly cause: unknown;

  constructor({ path, cause }: { path: string; cause: unknown }) {
    super();
    this.name = 'FileSystemError';
    this.path = path;
    this.cause = cause;
  }
}

export class BackupError extends Error {
  readonly path: string;
  readonly cause: unknown;

  constructor({ path, cause }: { path: string; cause: unknown }) {
    super();
    this.name = 'BackupError';
    this.path = path;
    this.cause = cause;
  }
}

export class TaskError extends Error {
  readonly taskId: string;
  readonly cause?: unknown;

  constructor({
    taskId,
    message,
    cause,
  }: {
    taskId: string;
    message: string;
    cause?: unknown;
  }) {
    super(message);
    this.name = 'TaskError';
    this.taskId = taskId;
    this.cause = cause;
  }
}
