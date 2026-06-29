#!/usr/bin/env node
import { resolve } from 'node:path'
import { cancel, intro, note, outro } from '@clack/prompts'
import { consola, logWarn, pc } from '@xtarterize/core'
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
import { isGitInstalled } from '@/utils/git'

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
		const args = ctx.args

		if (args.noColor) {
			process.env.NO_COLOR = '1'
		}

		const quiet = args.quiet || args.json
		const json = args.json

		if (quiet) {
			consola.level = 0
		}
		if (!quiet) {
			console.log(BANNER)
		}

		const useDefaults = args.yes === true
		const defaultPackageManager: PackageManager = 'pnpm'

		try {
			if (!quiet) {
				intro(`${APP_NAME} - Let's create your project!`)
			}

			let projectName = args.name
			let projectPath: string

			if (!projectName) {
				projectName = await promptProjectName()
				projectPath = resolve(process.cwd(), projectName)
			} else if (projectName === '.') {
				const resolved = resolveProjectPath('.')
				projectName = resolved.projectName
				projectPath = resolved.projectPath
			} else {
				const resolved = resolveProjectPath(projectName)
				projectName = resolved.projectName
				projectPath = resolved.projectPath
			}

			await prepareProjectDir(projectName, projectPath, args.force)

			const template = await promptTemplate(
				args.yes && !args.template
					? DEFAULT_TEMPLATE
					: (args.template as string | undefined),
			)

			const packageManager =
				args.pm !== undefined
					? await promptPackageManager(args.pm as PackageManager | undefined)
					: useDefaults
						? defaultPackageManager
						: await promptPackageManager()

			const shouldCleanCI =
				args.clean !== undefined
					? await promptCleanCI(args.clean)
					: useDefaults
						? false
						: await promptCleanCI()

			const shouldInitGit =
				args.noGit !== undefined
					? false
					: useDefaults
						? true
						: await promptGitInit()

			if (shouldInitGit) {
				const gitInstalled = await isGitInstalled()
				if (!gitInstalled) {
					logWarn('Git is not installed. Skipping git initialization.')
				}
			}

			if (!quiet) {
				note(
					[
						`Project: ${pc.cyan(projectName)}`,
						`Template: ${pc.cyan(template.name)}`,
						`Package Manager: ${pc.cyan(packageManager)}`,
						`Git Init: ${pc.cyan(shouldInitGit ? 'Yes' : 'No')}`,
						`Clean CI/CD: ${pc.cyan(shouldCleanCI ? 'Yes' : 'No')}`,
					].join('\n'),
					'Scaffolding with these settings',
				)
			}

			await scaffoldProject({
				projectName,
				projectPath,
				template,
				packageManager,
				cleanCI: shouldCleanCI,
				initGit: shouldInitGit,
				ref: args.ref,
			})

			if (!quiet) {
				outro(pc.green(`Successfully created ${pc.cyan(projectName)}!`))
			}

			if (json) {
				const cdCommand = args.name === '.' ? '' : `cd ${projectName}`
				const result = {
					success: true as const,
					projectPath,
					template: template.id,
					packageManager,
					gitInitialized: shouldInitGit,
					dependenciesInstalled: true, // scaffoldProject throws on failure, so always true on success
					ciConfigsCleaned: shouldCleanCI,
					nextSteps: [
						...(cdCommand ? [cdCommand] : []),
						`${packageManager} dev`,
					],
				}
				process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
			} else if (!quiet) {
				const cdCommand =
					args.name === '.'
						? ''
						: `  ${pc.dim('1.')} ${pc.cyan(`cd ${projectName}`)}\n`
				console.log(`\n${pc.bold('Next steps:')}
${cdCommand}  ${pc.dim('2.')} ${pc.cyan(`${packageManager} dev`)}
  ${pc.dim('3.')} Open ${pc.cyan('http://localhost:3000')} (or the port shown)

${pc.bold('Template:')} ${template.name}
${pc.bold('Docs:')} ${pc.underline(`https://github.com/${template.repo}`)}
`)
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error'
			if (json) {
				const errorResult = {
					success: false as const,
					error: message,
				}
				process.stderr.write(`${JSON.stringify(errorResult, null, 2)}\n`)
			} else {
				cancel(`${pc.red('Error:')} ${message}`)
			}
			process.exit(1)
		}
	},
})

runMain(mainCommand)
