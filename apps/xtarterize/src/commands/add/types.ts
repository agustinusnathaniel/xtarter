import type { ProjectProfile, Task, TaskStatus } from '@xtarterize/core'
import type { DisplayFormat } from '@/ui/diff-display.js'

export interface TaskWithStatus {
	task: Task
	status: TaskStatus
}

export interface RunSingleTaskOptions {
	taskId: string
	allTasks: Task[]
	profile: ProjectProfile
	cwd: string
	quiet: boolean
	format: DisplayFormat
	detectionMs: number
	recordTiming: boolean
	includeConflicts: boolean
}

export interface RunInteractiveOptions {
	allTasks: Task[]
	profile: ProjectProfile
	cwd: string
	quiet: boolean
	format: DisplayFormat
	detectionMs: number
	recordTiming: boolean
	all?: boolean
	includeConflicts: boolean
}
