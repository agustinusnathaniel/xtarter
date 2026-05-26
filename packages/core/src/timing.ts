export interface TaskTiming {
	id: string
	label: string
	checkMs?: number
	dryRunMs?: number
	applyMs?: number
}

export interface ResolveTiming {
	detectionMs: number
	resolutionMs: number
	resolutionSumMs: number
}

export interface ApplyTiming {
	applyMs: number
	tasks: TaskTiming[]
}
