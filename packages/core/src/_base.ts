import type { ProjectProfile } from '@/detect.js'

export type TaskStatus = 'new' | 'patch' | 'skip' | 'conflict'

export interface DiffHunk {
	header: string
	lines: string[]
	added: number
	removed: number
}

export interface ChangeStats {
	added: number
	removed: number
}

export interface SemanticEntry {
	added?: Record<string, string>
	removed?: Record<string, string>
	modified?: Record<string, { before: string; after: string }>
}

export interface FileDiff {
	filepath: string
	before: string | null
	after: string
	hunks?: DiffHunk[]
	stats?: ChangeStats
	semantic?: SemanticEntry
}

export interface Task {
	id: string
	label: string
	group: string
	applicable: (profile: ProjectProfile) => boolean
	check: (cwd: string, profile: ProjectProfile) => Promise<TaskStatus>
	dryRun: (cwd: string, profile: ProjectProfile) => Promise<FileDiff[]>
	apply: (cwd: string, profile: ProjectProfile) => Promise<void>
}
