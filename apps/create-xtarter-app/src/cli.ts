import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { cancel, intro, note, outro } from '@clack/prompts'
import { logWarn, pc } from '@xtarterize/core'
import { defineCommand, runMain } from 'citty'
import { APP_NAME, BANNER, HELP_TEXT, VERSION } from '@/constants'
import { promptCleanCI, promptGitInit } from '@/prompts/options'
import { promptPackageManager } from '@/prompts/package-manager'
import { previewTemplate } from '@/prompts/preview'
import { promptProjectName } from '@/prompts/project-name'
import { promptTemplate } from '@/prompts/template'
import type { PackageManager } from '@/types'
import { downloadTemplateFiles } from '@/utils/download'
import { initializeGit, isGitInstalled } from '@/utils/git'
import { installDependencies } from '@/utils/install'
import { cleanCIConfigs, modifyPackageJson } from '@/utils/modify-package'

const scaffoldArgs = {
	name: {
		type: 'positional',
		description: 'Project name',
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
	yes: {
		type: 'boolean',
		alias: 'y',
		description: 'Use defaults (pnpm, git init, no clean)',
		required: false,
	},
	help: {
		type: 'boolean',
		alias: 'h',
		description: 'Show help message',
		required: false,
	},
	version: {
		type: 'boolean',
		alias: 'v',
		description: 'Show version',
		required: false,
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

		if (args.help) {
			console.log(HELP_TEXT)
			return
		}

		if (args.version) {
			console.log(VERSION)
			return
		}

		console.log(BANNER)

		const useDefaults = args.yes === true
		const defaultPackageManager: PackageManager = 'pnpm'
		const defaultGitInit = !args.noGit
		const defaultCleanCI = false

		try {
			intro(`${APP_NAME} - Let's create your project!`)

			let projectName = args.name
			if (!projectName) {
				projectName = await promptProjectName()
			}

			const projectPath = resolve(process.cwd(), projectName)

			if (existsSync(projectPath)) {
				const files = await import('node:fs').then((m) =>
					m.readdirSync(projectPath),
				)
				if (files.length > 0) {
					cancel(
						`Directory "${projectName}" already exists and is not empty. Please choose a different name.`,
					)
					process.exit(1)
				}
			}

			const template = await promptTemplate(args.template as string | undefined)

			const packageManager = useDefaults
				? defaultPackageManager
				: await promptPackageManager(args.pm as PackageManager | undefined)

			const shouldInitGit = useDefaults
				? defaultGitInit
				: await promptGitInit(args.noGit)

			if (shouldInitGit) {
				const gitInstalled = await isGitInstalled()
				if (!gitInstalled) {
					logWarn('Git is not installed. Skipping git initialization.')
				}
			}

			const shouldCleanCI = useDefaults
				? defaultCleanCI
				: await promptCleanCI(args.clean)

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

			await downloadTemplateFiles({
				template,
				targetPath: projectPath,
			})

			await modifyPackageJson({
				projectPath,
				projectName,
			})

			if (shouldCleanCI) {
				await cleanCIConfigs({ projectPath })
			}

			await installDependencies({
				packageManager,
				projectPath,
			})

			if (shouldInitGit) {
				const gitInstalled = await isGitInstalled()
				if (gitInstalled) {
					await initializeGit({ projectPath })
				}
			}

			outro(pc.green(`Successfully created ${pc.cyan(projectName)}!`))

			console.log(`\n${pc.bold('Next steps:')}
  ${pc.dim('1.')} ${pc.cyan(`cd ${projectName}`)}
  ${pc.dim('2.')} ${pc.cyan(`${packageManager} dev`)}
  ${pc.dim('3.')} Open ${pc.cyan('http://localhost:3000')} (or the port shown)

${pc.bold('Template:')} ${template.name}
${pc.bold('Docs:')} ${pc.underline(`https://github.com/${template.repo}`)}
`)
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error'
			cancel(`${pc.red('Error:')} ${message}`)
			process.exit(1)
		}
	},
})

runMain(mainCommand)
