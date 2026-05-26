import type { ApplyTiming, ResolveTiming } from '@xtarterize/core'
import { pc } from '@xtarterize/core'

function formatMs(ms: number): string {
	if (ms < 1000) return `${Math.round(ms)}ms`
	return `${(ms / 1000).toFixed(1)}s`
}

function formatMsPrecise(ms: number): string {
	if (ms < 1000) return `${Math.round(ms)}ms`
	return `${(ms / 1000).toFixed(2)}s`
}

export function formatTimingJson(
	resolve: ResolveTiming,
	apply?: ApplyTiming,
): Record<string, unknown> {
	const obj: Record<string, unknown> = {
		detectionMs: resolve.detectionMs,
		resolutionMs: resolve.resolutionMs,
		resolutionSumMs: resolve.resolutionSumMs,
	}
	if (apply) {
		obj.applyMs = apply.applyMs
		if (apply.tasks.length > 0) {
			obj.tasks = apply.tasks
		}
	}
	return obj
}

export function printTiming(
	resolve: ResolveTiming,
	apply?: ApplyTiming,
	recordTiming?: boolean,
): void {
	const lines: string[] = []
	lines.push('')
	lines.push(pc.bold('Timing'))

	lines.push(`  Detection    ${pc.dim(formatMs(resolve.detectionMs))}`)

	const sumLabel = `∑ ${formatMsPrecise(resolve.resolutionSumMs)}`
	lines.push(
		`  Resolution   ${pc.dim(formatMs(resolve.resolutionMs))} ${pc.dim(`(${sumLabel} across checks)`)}`,
	)

	if (apply) {
		lines.push(`  Apply        ${pc.dim(formatMs(apply.applyMs))}`)
	}

	if (recordTiming && apply && apply.tasks.length > 0) {
		const headerLabel = `${'Task'.padEnd(42)} ${'Check'.padEnd(10)} ${'Dry-run'.padEnd(10)} ${'Apply'.padEnd(10)}`
		lines.push(`  ${pc.dim(headerLabel)}`)
		for (const t of apply.tasks) {
			const check = t.checkMs != null ? formatMs(t.checkMs) : '-'
			const dry = t.dryRunMs != null ? formatMs(t.dryRunMs) : '-'
			const app = t.applyMs != null ? formatMs(t.applyMs) : '-'
			lines.push(
				`  ${t.label.padEnd(42)} ${check.padEnd(10)} ${dry.padEnd(10)} ${app.padEnd(10)}`,
			)
		}
	}

	console.log(lines.join('\n'))
	console.log('')
}
