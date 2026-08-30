#!/usr/bin/env node
import { resolve } from 'node:path'
import { cancel, intro, note, outro } from '@clack/prompts'
import { consola, pc } from '@xtarterize/core'
import { defineCommand, runMain } from 'citty'
import { APP_NAME, BANNER, DEFAULT_TEMPLATE, VERSION } from '@/constants'
import { promptCleanCI, promptGitInit } from '@/prompts/options'
import { promptPackageManager } from '@/prompts/package-manager'
import { previewTemplate } from '@/prompts/preview'
import { promptProjectName } from '@/prompts/project-name'
import { promptTemplate } from '@/prompts/template'
import {
	prepareProjectDir,
	resolveProjectPath,
	scaffoldProject,
} from '@/scaffold'
import type { PackageManager } from '@/types'

// ── Helpers ──

/**
 * Resolve a CLI argument: use explicit arg value when provided,
 * fall back to `defaultValue` in --yes mode, otherwise prompt the user.
 */
async function resolveArg<T>(
	argValue: T | undefined,
	prompt: () => Promise<T>,
	defaultValue?: T,
): Promise<T> {
	if (argValue !== undefined) {
		return argValue
	}
	if (defaultValue !== undefined) {
		return defaultValue
	}
	return prompt()
}

function formatJsonResult(options: {
	success: true
	projectPath: string
	template: string
	packageManager: string
	gitInitialized: boolean
	dependenciesInstalled: boolean
	ciConfigsCleaned: boolean
	nextSteps: string[]
}): string {
	return JSON.stringify(options, null, 2)
}

function formatJsonError(message: string): string {
	return JSON.stringify({ success: false as const, error: message }, null, 2)
}

// ── Argument definitions ──

const scaffoldArgs = {
	name: {
		type: 'positional',
		description: 'Project name (use "." for current directory)',
		required: false,
	},
	template: {
		type: 'string',
		alias: 't',
		description: 'Template to use',
		required: false,
	},
	pm: {
		type: 'string',
		alias: 'p',
		description: 'Package manager (pnpm|npm|bun|yarn)',
		required: false,
	},
	noGit: {
		type: 'boolean',
		description: 'Skip git initialization',
		required: false,
	},
	clean: {
		type: 'boolean',
		description: 'Remove CI/CD configs',
		required: false,
	},
	force: {
		type: 'boolean',
		alias: 'f',
		description: 'Overwrite existing directory',
		required: false,
	},
	ref: {
		type: 'string',
		description: 'Git ref (branch/tag/commit) to download',
		required: false,
	},
	yes: {
		type: 'boolean',
		alias: 'y',
		description: 'Use defaults (pnpm, git init, no clean)',
		required: false,
	},
	quiet: {
		type: 'boolean',
		description: 'Suppress banners, progress output, and decorative text',
		required: false,
		default: false,
	},
	json: {
		type: 'boolean',
		description: 'Output scaffold result as JSON',
		required: false,
		default: false,
	},
	noColor: {
		type: 'boolean',
		description: 'Disable colorized output',
		required: false,
		default: false,
	},
} as const

// ── Sub-commands ──

const previewCommand = defineCommand({
	meta: {
		name: 'preview',
		description: 'Preview template details',
	},
	args: {
		template: {
			type: 'positional',
			description: 'Template ID to preview',
			required: false,
		},
	},
	async run({ args }) {
		await previewTemplate(args.template as string | undefined)
	},
})

function parseArgs(args: Record<string, unknown>) {
	const quiet = Boolean(args.quiet || args.json)
	const json = Boolean(args.json)
	if (args.noColor) {
		process.env.NO_COLOR = '1'
	}
	if (quiet) {
		consola.level = 0
	} else {
		console.log(BANNER)
	}
	return {
		quiet,
		json,
		useDefaults: args.yes === true,
		defaultPackageManager: 'pnpm' as PackageManager,
	}
}

async function promptProjectDetails(
	args: Record<string, unknown>,
	useDefaults: boolean,
	defaultPackageManager: PackageManager,
) {
	let projectName = args.name as string | undefined
	let projectPath: string
	if (!projectName) {
		projectName = await promptProjectName()
		projectPath = resolve(process.cwd(), projectName)
	} else {
		const resolved = resolveProjectPath(projectName)
		projectName = resolved.projectName
		projectPath = resolved.projectPath
	}
	await prepareProjectDir(
		projectName,
		projectPath,
		args.force as boolean | undefined,
	)
	const template = await promptTemplate(
		args.yes && !args.template
			? DEFAULT_TEMPLATE
			: (args.template as string | undefined),
	)
	const packageManager = await resolveArg(
		args.pm as PackageManager | undefined,
		promptPackageManager,
		useDefaults ? defaultPackageManager : undefined,
	)
	const shouldCleanCI = await resolveArg(
		args.clean as boolean | undefined,
		promptCleanCI,
		useDefaults ? false : undefined,
	)
	const shouldInitGit =
		args.noGit === true
			? false
			: await resolveArg(
					undefined,
					promptGitInit,
					useDefaults ? true : undefined,
				)
	return {
		projectName,
		projectPath,
		template,
		packageManager,
		shouldCleanCI,
		shouldInitGit,
	}
}

function reportScaffoldSettings(
	details: Awaited<ReturnType<typeof promptProjectDetails>>,
	quiet: boolean,
) {
	if (quiet) {
		return
	}
	note(
		[
			`Project: ${pc.cyan(details.projectName)}`,
			`Template: ${pc.cyan(details.template.name)}`,
			`Package Manager: ${pc.cyan(details.packageManager)}`,
			`Git Init: ${pc.cyan(details.shouldInitGit ? 'Yes' : 'No')}`,
			`Clean CI/CD: ${pc.cyan(details.shouldCleanCI ? 'Yes' : 'No')}`,
		].join('\n'),
		'Scaffolding with these settings',
	)
}

async function scaffoldAndInstall(options: {
	details: Awaited<ReturnType<typeof promptProjectDetails>>
	args: Record<string, unknown>
	quiet: boolean
	json: boolean
}) {
	const { details, args, quiet, json } = options
	await scaffoldProject({
		projectName: details.projectName,
		projectPath: details.projectPath,
		template: details.template,
		packageManager: details.packageManager,
		cleanCI: details.shouldCleanCI,
		initGit: details.shouldInitGit,
		ref: args.ref as string | undefined,
	})
	if (!quiet) {
		outro(pc.green(`Successfully created ${pc.cyan(details.projectName)}!`))
	}
	if (json) {
		const cdCommand = args.name === '.' ? '' : `cd ${details.projectName}`
		process.stdout.write(
			`${formatJsonResult({
				success: true as const,
				projectPath: details.projectPath,
				template: details.template.id,
				packageManager: details.packageManager,
				gitInitialized: details.shouldInitGit,
				dependenciesInstalled: true,
				ciConfigsCleaned: details.shouldCleanCI,
				nextSteps: [
					...(cdCommand ? [cdCommand] : []),
					`${details.packageManager} dev`,
				],
			})}\n`,
		)
		return
	}
	if (quiet) {
		return
	}
	const cdCommand =
		args.name === '.'
			? ''
			: `  ${pc.dim('1.')} ${pc.cyan(`cd ${details.projectName}`)}\n`
	console.log(`\n${pc.bold('Next steps:')}
${cdCommand}  ${pc.dim('2.')} ${pc.cyan(`${details.packageManager} dev`)}
  ${pc.dim('3.')} Open ${pc.cyan('http://localhost:3000')} (or the port shown)

${pc.bold('Template:')} ${details.template.name}
${pc.bold('Docs:')} ${pc.underline(`https://github.com/${details.template.repo}`)}
`)
}

function handleScaffoldError(error: unknown, json: boolean) {
	const message = error instanceof Error ? error.message : 'Unknown error'
	if (json) {
		process.stderr.write(`${formatJsonError(message)}\n`)
	} else {
		cancel(`${pc.red('Error:')} ${message}`)
	}
	process.exit(1)
}

// ── Main command ──

const mainCommand = defineCommand({
	meta: {
		name: 'create-xtarter-app',
		version: VERSION,
		description: 'Fast project scaffolding for modern web apps',
	},
	args: scaffoldArgs,
	subCommands: {
		preview: previewCommand,
	},
	async run(ctx) {
		const args = ctx.args as Record<string, unknown>
		const { quiet, json, useDefaults, defaultPackageManager } = parseArgs(args)
		try {
			if (!quiet) {
				intro(`${APP_NAME} - Let's create your project!`)
			}
			const details = await promptProjectDetails(
				args,
				useDefaults,
				defaultPackageManager,
			)
			reportScaffoldSettings(details, quiet)
			await scaffoldAndInstall({ details, args, quiet, json })
		} catch (error) {
			handleScaffoldError(error, json)
		}
	},
})

runMain(mainCommand)
