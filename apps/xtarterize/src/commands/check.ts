import fs from 'node:fs/promises'
import path from 'node:path'
import {
	ensureXtarterizeGitignore,
	logSuccess,
	pc,
	runConflictChecks,
	runToolInstallationChecks,
	statusTag,
} from '@xtarterize/core'
import { defineCommand } from 'citty'
import { formatCheckAnnotations } from '@/ui/annotations.js'
import { generateBadgeSvg } from '@/ui/badge.js'
import { computeCheckOk, formatCheckResult } from '@/ui/json-formatter.js'
import { diagnosticIcon, taskStatusIcon } from '@/utils/display.js'
import { resolveCliContext, scanProject } from '@/utils/project.js'
import { printTiming } from '@/utils/timing-display.js'

function emitAnnotations(options: {
	args: Record<string, unknown>
	tasks: unknown[]
	statuses: Map<string, string>
	diagnostics: unknown[]
}) {
	const { args, tasks, statuses, diagnostics } = options
	const isGitHubActions = process.env.GITHUB_ACTIONS === 'true'
	if (!(args.annotations || isGitHubActions)) {
		return
	}
	const annotationOutput = formatCheckAnnotations(
		tasks as Parameters<typeof formatCheckAnnotations>[0],
		statuses as Parameters<typeof formatCheckAnnotations>[1],
		diagnostics as Parameters<typeof formatCheckAnnotations>[2],
	)
	if (annotationOutput) {
		process.stderr.write(`${annotationOutput}\n`)
	}
}

async function handleBadgeOutput(options: {
	args: Record<string, unknown>
	ctx: { json?: boolean }
	conformant: number
	total: number
}) {
	const { args, ctx, conformant, total } = options
	if (!args.badge) {
		return
	}
	const svg = generateBadgeSvg({ conformant, total })
	let badgePath = String(args.badge)
	if (badgePath === '-') {
		if (ctx.json) {
			process.stderr.write(`${svg}\n`)
		} else {
			process.stdout.write(svg)
		}
		return
	}
	const stat = await fs.stat(badgePath).catch(() => null)
	if (stat?.isDirectory()) {
		badgePath = path.join(badgePath, 'conformance.svg')
	}
	await fs.writeFile(badgePath, svg, 'utf-8')
	if (!ctx.json) {
		logSuccess(`Badge written to ${badgePath}`)
	}
}

function renderCheckSummary(options: {
	ctx: { json?: boolean; quiet?: boolean }
	tasks: { id: string; label: string }[]
	statuses: Map<string, string>
	diagnostics: { status: string; message: string }[]
	timing: unknown
	conformant: number
	total: number
	badgeToStdout: boolean
}) {
	const {
		ctx,
		tasks,
		statuses,
		diagnostics,
		timing,
		conformant,
		total,
		badgeToStdout,
	} = options
	if (ctx.json) {
		console.log(
			formatCheckResult({
				tasks: tasks as Parameters<typeof formatCheckResult>[0]['tasks'],
				statuses: statuses as Parameters<
					typeof formatCheckResult
				>[0]['statuses'],
				diagnostics: diagnostics as Parameters<
					typeof formatCheckResult
				>[0]['diagnostics'],
				timing: timing as Parameters<typeof formatCheckResult>[0]['timing'],
			}),
		)
		return
	}
	const auditStream = badgeToStdout ? process.stderr : process.stdout
	if (!ctx.quiet) {
		auditStream.write('\n')
		auditStream.write(`${pc.bold('Conformance audit')}\n\n`)
		for (const task of tasks) {
			const status = (statuses.get(task.id) ?? 'new') as Parameters<
				typeof taskStatusIcon
			>[0]
			const icon = taskStatusIcon(status, true)
			auditStream.write(
				`  ${icon} ${task.label.padEnd(40)} ${pc.dim(task.id)} ${statusTag(status as Parameters<typeof statusTag>[0])}\n`,
			)
		}
		auditStream.write('\n')
		auditStream.write(`${pc.bold(`${conformant}/${total} conformant`)}\n`)
		if (diagnostics.length > 0) {
			auditStream.write(`\n${pc.bold('Diagnostics')}\n\n`)
			for (const check of diagnostics) {
				auditStream.write(
					`  ${diagnosticIcon(check.status as Parameters<typeof diagnosticIcon>[0])} ${check.message}\n`,
				)
			}
		}
		auditStream.write('\n')
		printTiming(timing as Parameters<typeof printTiming>[0], undefined, {
			write: (line) => auditStream.write(`${line}\n`),
		})
		return
	}
	auditStream.write(`${conformant}/${total} conformant\n`)
}

export const checkCommand = defineCommand({
	meta: {
		name: 'check',
		description: 'Audit current conformance status',
	},
	args: {
		cwd: {
			type: 'string',
			description: 'Target directory (default: current working directory)',
		},
		verbose: {
			type: 'boolean',
			description: 'Show tool installation and conflict checks',
		},
		quiet: {
			type: 'boolean',
			description: 'Suppress verbose output',
		},
		badge: {
			type: 'string',
			description:
				'Generate conformance badge SVG (provide output path, or - for stdout)',
		},
		annotations: {
			type: 'boolean',
			description:
				'Emit GitHub Actions workflow command annotations (auto-enabled in CI)',
		},
		json: {
			type: 'boolean',
			description: 'Output machine-readable JSON',
		},
	},
	async run({ args }) {
		const ctx = resolveCliContext(args)
		const badgeToStdout = args.badge === '-'
		const scanCtx = badgeToStdout ? { ...ctx, quiet: true } : ctx
		await ensureXtarterizeGitignore(ctx.cwd)
		const { tasks, statuses, timing } = await scanProject(scanCtx)
		const conflictChecks = await runConflictChecks(ctx.cwd)
		const installChecks = await runToolInstallationChecks(ctx.cwd)
		const diagnostics = [...installChecks, ...conflictChecks]
		if (!computeCheckOk(tasks, statuses, diagnostics)) {
			process.exitCode = 1
		}
		emitAnnotations({
			args: args as Record<string, unknown>,
			tasks,
			statuses: statuses as Map<string, string>,
			diagnostics,
		})
		const conformant = tasks.filter((t) => statuses.get(t.id) === 'skip').length
		const total = tasks.length
		await handleBadgeOutput({
			args: args as Record<string, unknown>,
			ctx,
			conformant,
			total,
		})
		renderCheckSummary({
			ctx,
			tasks,
			statuses: statuses as Map<string, string>,
			diagnostics,
			timing,
			conformant,
			total,
			badgeToStdout,
		})
	},
})
