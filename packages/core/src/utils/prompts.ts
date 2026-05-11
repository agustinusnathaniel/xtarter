import { cancel, isCancel, spinner } from '@clack/prompts'

export { isCI } from '@clack/prompts'

export function abortIfCancelled<T>(
	result: T | symbol,
	message = 'Operation cancelled',
): asserts result is T {
	if (isCancel(result)) {
		cancel(message)
		process.exit(0)
	}
}

interface SpinnerHandle {
	start: (message: string) => void
	stop: (message?: string) => void
}

export function createSpinner(quiet: boolean): SpinnerHandle {
	const s = spinner()
	return {
		start(message: string) {
			if (!quiet) s.start(message)
		},
		stop(message?: string) {
			if (!quiet) s.stop(message || '')
		},
	}
}
