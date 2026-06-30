import type {
	FileDiff,
	ProjectProfile,
	Task,
	TaskScope,
	TaskSearchMeta,
	TaskStatus,
} from '@xtarterize/core'
import { wrapTask } from './ops.js'

export interface ExecTaskOptions {
	id: string
	label: string
	group: string
	scope?: TaskScope
	searchMeta?: TaskSearchMeta
	applicable: (profile: ProjectProfile) => boolean
	check: (cwd: string, profile: ProjectProfile) => Promise<TaskStatus>
	dryRun: (cwd: string, profile: ProjectProfile) => Promise<FileDiff[]>
	apply: (cwd: string, profile: ProjectProfile) => Promise<void>
}

export function createExecTask(options: ExecTaskOptions): Task {
	const {
		id,
		label,
		group,
		scope,
		searchMeta,
		applicable,
		check,
		dryRun,
		apply,
	} = options
	return {
		id,
		label,
		group,
		scope,
		searchMeta,
		applicable,
		async check(cwd, profile) {
			return wrapTask(this.id, 'check', () => check(cwd, profile))
		},
		async dryRun(cwd, profile) {
			return wrapTask(this.id, 'dryRun', () => dryRun(cwd, profile))
		},
		async apply(cwd, profile) {
			return wrapTask(this.id, 'apply', () => apply(cwd, profile))
		},
	}
}
