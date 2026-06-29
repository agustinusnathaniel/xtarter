import type { Task } from '@/_base.js'

export interface RelevanceSignal {
	name: string
	score: number
}

export interface InquiryResult {
	taskId: string
	task: Task
	relevance: number
	signals: RelevanceSignal[]
}

export interface WeightConfig {
	label: number
	id: number
	group: number
	keywords: number
	config: number
}

export interface InquiryOptions {
	minScore?: number
	maxResults?: number
	weights?: Partial<WeightConfig>
}
