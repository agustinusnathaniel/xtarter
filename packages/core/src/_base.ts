import type { ProjectProfile } from '@/detect.js'

export type TaskStatus = 'new' | 'patch' | 'skip' | 'conflict'

export type TaskScope = 'root' | 'package' | 'both'

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

export interface TaskSearchMeta {
	/** Descriptive tags/categories for search, e.g. ["type-safe", "compiler-options"] */
	tags: string[]
	/** Config files this task modifies, e.g. ["tsconfig.json", "biome.json"] */
	configTargets: string[]
	/** Extra keywords for search not obvious from label/id, e.g. ["types", "type-safe", "strict"] */
	keywords: string[]
}

export interface Task {
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
