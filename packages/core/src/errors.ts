import { Data } from 'effect'

export class FileSystemError extends Data.TaggedError('FileSystemError')<{
	readonly path: string
	readonly cause: unknown
}> {}

export class BackupError extends Data.TaggedError('BackupError')<{
	readonly path: string
	readonly cause: unknown
}> {}

export class TaskError extends Data.TaggedError('TaskError')<{
	readonly taskId: string
	readonly message: string
	readonly cause?: unknown
}> {}
