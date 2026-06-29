import type { Task } from '@/_base.js'
import { similarity } from './fuzzy.js'
import { stem } from './stemmer.js'
import { expandQuery } from './synonyms.js'
import { tokenize } from './tokenizer.js'
import type {
	InquiryOptions,
	InquiryResult,
	RelevanceSignal,
	WeightConfig,
} from './types.js'

const DEFAULT_WEIGHTS: WeightConfig = {
	label: 0.35,
	id: 0.25,
	group: 0.1,
	keywords: 0.2,
	config: 0.1,
}

type MatchTier = 0.0 | 0.55 | 0.75 | 0.85 | 0.95 | 1.0

function bestMatchTier(token: string, field: string | undefined): MatchTier {
	if (!field) return 0.0
	const lowerToken = token.toLowerCase()
	const lowerField = field.toLowerCase()

	if (lowerToken === lowerField) return 1.0
	if (stem(lowerToken) === stem(lowerField)) return 0.95
	if (similarity(lowerToken, lowerField) >= 0.85) return 0.85
	if (
		lowerField.startsWith(lowerToken) ||
		lowerField.includes(`${lowerToken} `)
	)
		return 0.75
	if (lowerField.includes(lowerToken)) return 0.55
	return 0.0
}

function bestMatchInArray(token: string, arr: string[] | undefined): MatchTier {
	if (!arr || arr.length === 0) return 0.0
	let best: MatchTier = 0.0
	for (const item of arr) {
		const match = bestMatchTier(token, item)
		if (match > best) best = match
		if (best === 1.0) break
	}
	return best
}

function matchTaskToToken(token: string, task: Task) {
	return {
		label: bestMatchTier(token, task.label),
		id: bestMatchTier(token, task.id.replace(/\//g, ' ')),
		group: bestMatchTier(token, task.group),
		keywords: bestMatchInArray(token, task.searchMeta?.keywords),
		config: bestMatchInArray(
			token,
			task.searchMeta?.configTargets ?? task.searchMeta?.tags,
		),
	}
}

function scoreTaskForQuery(
	task: Task,
	queryTerms: { tokens: string[]; expanded: string[]; weights: WeightConfig },
): { signals: RelevanceSignal[]; score: number } {
	const { tokens, expanded, weights } = queryTerms
	const allTerms = [...new Set([...tokens, ...expanded])]
	const directTokens = new Set(tokens.map((t) => t.toLowerCase()))

	let labelSum = 0
	let idSum = 0
	let groupSum = 0
	let kwSum = 0
	let configSum = 0

	for (const term of allTerms) {
		const match = matchTaskToToken(term, task)
		const discount = directTokens.has(term.toLowerCase()) ? 1.0 : 0.85
		labelSum += match.label * discount
		idSum += match.id * discount
		groupSum += match.group * discount
		kwSum += match.keywords * discount
		configSum += match.config * discount
	}

	const n = allTerms.length || 1
	const labelScore = labelSum / n
	const idScore = idSum / n
	const groupScore = groupSum / n
	const kwScore = kwSum / n
	const configScore = configSum / n

	// Coverage bonus: proportion of original tokens that matched >= 0.55 on any signal
	const matchedTokenCount = tokens.filter((t) => {
		const m = matchTaskToToken(t, task)
		return Math.max(m.label, m.id, m.group, m.keywords, m.config) >= 0.55
	}).length
	const coverageBonus =
		tokens.length > 0 ? (matchedTokenCount / tokens.length) * 0.1 : 0

	const signals: RelevanceSignal[] = [
		{ name: 'label', score: labelScore },
		{ name: 'id', score: idScore },
		{ name: 'group', score: groupScore },
		{ name: 'keywords', score: kwScore },
		{ name: 'config', score: configScore },
	]

	const weightedScore =
		labelScore * weights.label +
		idScore * weights.id +
		groupScore * weights.group +
		kwScore * weights.keywords +
		configScore * weights.config +
		coverageBonus

	return { signals, score: Math.min(1.0, Math.max(0, weightedScore)) }
}

export function scoreTasks(
	tasks: Task[],
	query: string,
	options?: InquiryOptions,
): InquiryResult[] {
	if (!query?.trim()) return []

	const { minScore = 0, maxResults = 0, weights: customWeights } = options ?? {}
	const weights = { ...DEFAULT_WEIGHTS, ...customWeights }

	const { tokens } = tokenize(query)
	if (tokens.length === 0) return []

	const expanded = expandQuery(tokens)
	const results: InquiryResult[] = []

	for (const task of tasks) {
		const { signals, score } = scoreTaskForQuery(task, {
			tokens,
			expanded,
			weights,
		})
		if (score > minScore) {
			results.push({ taskId: task.id, task, relevance: score, signals })
		}
	}

	results.sort((a, b) => b.relevance - a.relevance)
	return maxResults > 0 ? results.slice(0, maxResults) : results
}
