import type {
	InquiryResult,
	PackageManager,
	TaskStatus,
} from '@xtarterize/core'
import { pc, statusTag } from '@xtarterize/core'

interface GroupedResults {
	group: string
	tasks: InquiryResult[]
}

function relevanceColor(score: number): string {
	const pct = `${(score * 100).toFixed(0)}%`.padStart(4)
	if (score >= 0.7) return pc.green(pc.bold(pct))
	if (score >= 0.4) return pc.yellow(pc.bold(pct))
	return pc.dim(pct)
}

function getConfigTarget(result: InquiryResult): string {
	return result.task.searchMeta?.configTargets?.[0] ?? ''
}

function getDlxPrefix(pm: PackageManager): string {
	const runners: Record<PackageManager, string> = {
		pnpm: 'pnpx xtarterize@latest',
		npm: 'npx xtarterize@latest',
		yarn: 'yarn dlx xtarterize@latest',
		bun: 'bunx xtarterize@latest',
	}
	return runners[pm] ?? 'npx xtarterize@latest'
}

interface DisplayQueryOptions {
	results: InquiryResult[]
	query: string
	packageManager?: PackageManager
	statuses?: Map<string, TaskStatus>
}

function groupResults(results: InquiryResult[]): GroupedResults[] {
	const groupMap = new Map<string, InquiryResult[]>()
	for (const r of results) {
		const g = r.task.group
		if (!groupMap.has(g)) groupMap.set(g, [])
		groupMap.get(g)?.push(r)
	}
	return Array.from(groupMap.entries())
		.map(([group, tasks]) => ({
			group,
			tasks: tasks.sort((a, b) => b.relevance - a.relevance),
		}))
		.sort((a, b) => b.tasks[0].relevance - a.tasks[0].relevance)
}

function formatQueryRow(
	r: InquiryResult,
	context: {
		maxIdLen: number
		termWidth: number
		statuses?: Map<string, TaskStatus>
	},
): string {
	const { maxIdLen, termWidth, statuses } = context
	const id = r.taskId.padEnd(maxIdLen)
	const label = r.task.label
	const target = getConfigTarget(r)
	const relevance = relevanceColor(r.relevance)
	const status = statuses?.get(r.taskId) ?? 'new'
	const statusBadge = statusTag(status)
	const line = `  ${pc.dim(id)}  ${relevance}  ${statusBadge}  ${label}  ${pc.dim(target)}`
	if (line.length <= termWidth) return line
	const overhead = 2 + maxIdLen + 2 + 4 + 2 + 6 + 2 + 2 + target.length + 2
	const maxLabelLen = Math.max(10, termWidth - overhead - 4)
	const truncated =
		label.length > maxLabelLen
			? `${label.slice(0, Math.max(1, maxLabelLen - 1))}…`
			: label
	return `  ${pc.dim(id)}  ${relevance}  ${statusBadge}  ${truncated}  ${pc.dim(target)}`
}

export function displayQueryResults(options: DisplayQueryOptions): void {
	const { results, query, packageManager = 'npm', statuses } = options
	const groups = groupResults(results)
	const totalTasks = results.length
	console.log('')
	console.log(
		`✻ ${pc.bold(`xtarterize query "${query}"`)} ${pc.dim(`- ${groups.length} group${groups.length !== 1 ? 's' : ''} · ${totalTasks} task${totalTasks !== 1 ? 's' : ''}`)}`,
	)
	const maxIdLen = Math.max(...results.map((r) => r.taskId.length))
	const termWidth = process.stdout.columns ?? 80
	for (const group of groups) {
		console.log('')
		console.log(`  ${pc.bold(group.group)}`)
		for (const r of group.tasks)
			console.log(formatQueryRow(r, { maxIdLen, termWidth, statuses }))
	}
	if (results.length > 0) {
		const prefix = getDlxPrefix(packageManager)
		console.log('')
		for (const group of groups) {
			const ids = group.tasks.map((t) => t.taskId)
			console.log(`  ${pc.dim(`${prefix} add ${ids.join(' ')}`)}`)
		}
	}
	console.log('')
}
