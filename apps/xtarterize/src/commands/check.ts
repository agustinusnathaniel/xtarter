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
		// When the badge is written to stdout, stdout must carry only the SVG.
		// Suppress the scan spinner so it does not pollute the stream.
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

		const isGitHubActions = process.env.GITHUB_ACTIONS === 'true'
		if (args.annotations || isGitHubActions) {
			const annotationOutput = formatCheckAnnotations(
				tasks,
				statuses,
				diagnostics,
			)
			if (annotationOutput) {
				process.stderr.write(`${annotationOutput}\n`)
			}
		}

		const conformant = tasks.filter((t) => statuses.get(t.id) === 'skip').length
		const total = tasks.length

		if (args.badge) {
			const svg = generateBadgeSvg({ conformant, total })
			let badgePath = String(args.badge)
			if (badgePath === '-') {
				if (ctx.json) {
					process.stderr.write(`${svg}\n`)
				} else {
					process.stdout.write(svg)
				}
			} else {
				const stat = await fs.stat(badgePath).catch(() => null)
				if (stat?.isDirectory()) {
					badgePath = path.join(badgePath, 'conformance.svg')
				}
				await fs.writeFile(badgePath, svg, 'utf-8')
				if (!ctx.json) {
					logSuccess(`Badge written to ${badgePath}`)
				}
			}
		}

		if (ctx.json) {
			console.log(formatCheckResult({ tasks, statuses, diagnostics, timing }))
			return
		}

		// In human mode with the badge on stdout, the audit text must not
		// follow the SVG on the same stream, so route it to stderr.
		const auditStream = badgeToStdout ? process.stderr : process.stdout

		if (!ctx.quiet) {
			auditStream.write('\n')
			auditStream.write(`${pc.bold('Conformance audit')}\n`)
			auditStream.write('\n')

			for (const task of tasks) {
				const status = statuses.get(task.id) ?? 'new'
				const icon = taskStatusIcon(status, true)

				auditStream.write(
					`  ${icon} ${task.label.padEnd(40)} ${pc.dim(task.id)} ${statusTag(status)}\n`,
				)
			}

			auditStream.write('\n')
			auditStream.write(`${pc.bold(`${conformant}/${total} conformant`)}\n`)

			if (diagnostics.length > 0) {
				auditStream.write('\n')
				auditStream.write(`${pc.bold('Diagnostics')}\n`)
				auditStream.write('\n')

				for (const check of diagnostics) {
					auditStream.write(
						`  ${diagnosticIcon(check.status)} ${check.message}\n`,
					)
				}
			}

			auditStream.write('\n')
			printTiming(timing, undefined, {
				write: (line) => auditStream.write(`${line}\n`),
			})
		} else {
			auditStream.write(`${conformant}/${total} conformant\n`)
		}
	},
})
