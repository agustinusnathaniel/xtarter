import type { InquiryResult, TaskStatus } from '@xtarterize/core'
import { pc, statusTag } from '@xtarterize/core'

function relevanceBar(score: number, width = 10): string {
	const filled = Math.round(score * width)
	const empty = width - filled
	const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(empty)
	const pct = (score * 100).toFixed(0)
	return `${bar} ${pc.bold(pct.padStart(3))}%`
}

function signalBreakdown(signals: { name: string; score: number }[]): string {
	return signals
		.filter((s) => s.score > 0)
		.map((s) => `${s.name}: ${(s.score * 100).toFixed(0)}%`)
		.join(', ')
}

export function displayQueryResults(
	results: InquiryResult[],
	query: string,
	statuses?: Map<string, TaskStatus>,
): void {
	const statusMap = statuses ?? new Map()
	console.log('')
	console.log(pc.bold(`Query: "${query}"`))
	console.log(pc.dim('\u2500'.repeat(50)))
	console.log('')

	// Group by relevance tiers
	const exact = results.filter((r) => r.relevance >= 0.8)
	const strong = results.filter((r) => r.relevance >= 0.5 && r.relevance < 0.8)
	const related = results.filter((r) => r.relevance < 0.5)

	if (exact.length > 0) {
		console.log(pc.green(pc.bold('EXACT MATCHES')))
		console.log('')
		for (const result of exact) {
			const status = statusMap.get(result.taskId)
			const bar = relevanceBar(result.relevance)
			const signals = signalBreakdown(result.signals)
			console.log(
				`  ${bar}  ${pc.bold(result.task.label.padEnd(38))} ${pc.dim(result.taskId)} ${status ? statusTag(status) : ''}`,
			)
			if (signals) console.log(`  ${pc.dim(signals)}`)
			console.log('')
		}
	}

	if (strong.length > 0) {
		console.log(pc.cyan(pc.bold('STRONG MATCHES')))
		console.log('')
		for (const result of strong) {
			const status = statusMap.get(result.taskId)
			const bar = relevanceBar(result.relevance)
			const signals = signalBreakdown(result.signals)
			console.log(
				`  ${bar}  ${pc.bold(result.task.label.padEnd(38))} ${pc.dim(result.taskId)} ${status ? statusTag(status) : ''}`,
			)
			if (signals) console.log(`  ${pc.dim(signals)}`)
			console.log('')
		}
	}

	if (related.length > 0) {
		console.log(pc.dim(pc.bold('RELATED')))
		console.log('')
		for (const result of related) {
			const status = statusMap.get(result.taskId)
			const bar = relevanceBar(result.relevance)
			console.log(
				`  ${bar}  ${result.task.label.padEnd(38)} ${pc.dim(result.taskId)} ${status ? statusTag(status) : ''}`,
			)
			console.log('')
		}
	}
}
