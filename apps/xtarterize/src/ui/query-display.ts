import type { InquiryResult, PackageManager } from '@xtarterize/core'
import { pc } from '@xtarterize/core'

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

export function displayQueryResults(
	results: InquiryResult[],
	query: string,
	packageManager: PackageManager = 'npm',
): void {
	// Group by task.group
	const groupMap = new Map<string, InquiryResult[]>()
	for (const r of results) {
		const g = r.task.group
		if (!groupMap.has(g)) groupMap.set(g, [])
		groupMap.get(g)?.push(r)
	}

	// Sort groups by their best task's relevance, then sort tasks within groups
	const groups: GroupedResults[] = Array.from(groupMap.entries())
		.map(([group, tasks]) => ({
			group,
			tasks: tasks.sort((a, b) => b.relevance - a.relevance),
		}))
		.sort((a, b) => b.tasks[0].relevance - a.tasks[0].relevance)

	const totalTasks = results.length

	// Header
	console.log('')
	console.log(
		`✻ ${pc.bold(`xtarterize query "${query}"`)} ${pc.dim(`— ${groups.length} group${groups.length !== 1 ? 's' : ''} · ${totalTasks} task${totalTasks !== 1 ? 's' : ''}`)}`,
	)

	// Determine column widths
	const maxIdLen = Math.max(...results.map((r) => r.taskId.length))
	const termWidth = process.stdout.columns ?? 80

	// Each group
	for (const group of groups) {
		console.log('')
		console.log(`  ${pc.bold(group.group)}`)

		for (const r of group.tasks) {
			const id = r.taskId.padEnd(maxIdLen)
			const label = r.task.label
			const target = getConfigTarget(r)
			const relevance = relevanceColor(r.relevance)

			// Build the full line with ANSI-styled segments
			const line = `  ${pc.dim(id)}  ${relevance}  ${label}  ${pc.dim(target)}`

			// Check if line exceeds terminal width (approx — ANSI codes inflate .length slightly)
			if (line.length > termWidth) {
				const overhead = 2 + maxIdLen + 2 + 4 + 2 + 2 + target.length + 2
				const maxLabelLen = Math.max(10, termWidth - overhead - 4)
				const truncated =
					label.length > maxLabelLen
						? `${label.slice(0, Math.max(1, maxLabelLen - 1))}…`
						: label
				console.log(
					`  ${pc.dim(id)}  ${relevance}  ${truncated}  ${pc.dim(target)}`,
				)
			} else {
				console.log(line)
			}
		}
	}

	// Footer hint — bundled command per group
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
