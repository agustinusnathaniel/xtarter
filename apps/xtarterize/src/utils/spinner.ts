import { spinner } from '@clack/prompts'

interface SpinnerHandle {
	start: (message: string) => void
	stop: (message: string) => void
}

export function createSpinner(quiet: boolean): SpinnerHandle {
	const s = spinner()
	return {
		start(message: string) {
			if (!quiet) s.start(message)
		},
		stop(message: string) {
			if (!quiet) s.stop(message)
		},
	}
}
