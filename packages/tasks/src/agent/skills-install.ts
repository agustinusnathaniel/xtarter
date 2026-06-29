import { getSkillsToInstall, type SkillEntry } from '@xtarterize/agent-catalog'
import type { FileDiff, Task, TaskStatus } from '@xtarterize/core'
import {
	fileExists,
	readFile,
	readPackageJson,
	resolvePath,
	TaskError,
} from '@xtarterize/core'
import { x } from 'tinyexec'
import { wrapTask } from '../factory/ops.js'

function getAllDeps(pkg: Record<string, unknown>): Record<string, string> {
	const deps: Record<string, string> = {}
	if (
		typeof pkg.dependencies === 'object' &&
		pkg.dependencies !== null &&
		!Array.isArray(pkg.dependencies)
	) {
		Object.assign(deps, pkg.dependencies as Record<string, string>)
	}
	if (
		typeof pkg.devDependencies === 'object' &&
		pkg.devDependencies !== null &&
		!Array.isArray(pkg.devDependencies)
	) {
		Object.assign(deps, pkg.devDependencies as Record<string, string>)
	}
	return deps
}

async function readSkillLockFile(lockPath: string): Promise<Set<string>> {
	const installed = new Set<string>()
	if (!(await fileExists(lockPath))) return installed

	try {
		const content = await readFile(lockPath)
		const lock = JSON.parse(content) as {
			skills?: Record<string, unknown>
		}
		if (lock.skills && typeof lock.skills === 'object') {
			for (const name of Object.keys(lock.skills)) {
				installed.add(name)
			}
		}
	} catch {
		// ignore parse errors
	}

	return installed
}

async function isDirNonEmpty(dirPath: string): Promise<boolean> {
	try {
		const { readdir } = await import('node:fs/promises')
		const entries = await readdir(dirPath)
		return entries.length > 0
	} catch {
		return false
	}
}

async function readSkillsFromDir(skillsDir: string): Promise<Set<string>> {
	const installed = new Set<string>()
	if (!(await fileExists(skillsDir))) return installed

	try {
		const { readdir } = await import('node:fs/promises')
		const entries = await readdir(skillsDir, { withFileTypes: true })
		for (const entry of entries) {
			if (entry.isDirectory()) {
				const skillPath = resolvePath(skillsDir, entry.name)
				const hasContent = await isDirNonEmpty(skillPath)
				if (hasContent) {
					installed.add(entry.name)
				}
			}
		}
	} catch {
		// ignore read errors
	}

	return installed
}

async function getInstalledSkills(cwd: string): Promise<Set<string>> {
	// Check project-local skill directories first
	const projectDirs = [
		resolvePath(cwd, '.agents', 'skills'),
		resolvePath(cwd, '.claude', 'skills'),
		resolvePath(cwd, '.cursor', 'skills'),
	]

	const skillDirsWithContent = new Set<string>()
	for (const dir of projectDirs) {
		const skills = await readSkillsFromDir(dir)
		for (const s of skills) skillDirsWithContent.add(s)
	}

	// Validate lock file entries against actual directories
	const lockPath = resolvePath(cwd, 'skills-lock.json')
	const lockSkills = await readSkillLockFile(lockPath)

	const installed = new Set<string>()
	// Only count lock file entries if they have actual content in the directory
	for (const s of lockSkills) {
		if (skillDirsWithContent.has(s)) {
			installed.add(s)
		}
	}
	// Also include any directory skills not in lock file (but only if they have content)
	for (const s of skillDirsWithContent) {
		installed.add(s)
	}

	return installed
}

function groupBySource(skills: SkillEntry[]): Map<string, string[]> {
	const grouped = new Map<string, Set<string>>()
	for (const { source, skill } of skills) {
		const existing = grouped.get(source) ?? new Set<string>()
		existing.add(skill)
		grouped.set(source, existing)
	}

	const normalized = new Map<string, string[]>()
	for (const [source, skillSet] of grouped) {
		normalized.set(source, [...skillSet])
	}
	return normalized
}

function formatCommands(skills: SkillEntry[]): string {
	const grouped = groupBySource(skills)
	const lines: string[] = []
	for (const [source, skillNames] of grouped) {
		const skillFlags = skillNames.map((s) => `--skill ${s}`).join(' ')
		lines.push(`npx skills@latest add ${source} ${skillFlags}`)
	}
	return lines.join('\n')
}

export const skillsInstallTask: Task = {
	id: 'agent/skills-install',
	label: 'Install agent skills',
	group: 'Agent',
	scope: 'both',

	searchMeta: {
		tags: ['ai', 'agent', 'skills', 'setup', 'tools'],
		configTargets: ['.xtarterize/skills-install.log'],
		keywords: [
			'skills',
			'agent skills',
			'ai tools',
			'opencode skills',
			'install',
		],
	},

	applicable: (profile) => profile.typescript,

	async check(cwd, profile): Promise<TaskStatus> {
		return wrapTask(this.id, 'check', async () => {
			const pkg = await readPackageJson(cwd)
			const deps = pkg ? getAllDeps(pkg as Record<string, unknown>) : {}
			const skills = getSkillsToInstall(profile, deps)

			if (skills.length === 0) return 'skip'

			const installed = await getInstalledSkills(cwd)
			const missing = skills.filter((s) => !installed.has(s.skill))

			if (missing.length === 0) return 'skip'
			if (missing.length === skills.length) return 'new'
			return 'patch'
		})
	},

	async dryRun(cwd, profile): Promise<FileDiff[]> {
		return wrapTask(this.id, 'dryRun', async () => {
			const pkg = await readPackageJson(cwd)
			const deps = pkg ? getAllDeps(pkg as Record<string, unknown>) : {}
			const skills = getSkillsToInstall(profile, deps)

			if (skills.length === 0) return []

			const installed = await getInstalledSkills(cwd)
			const missing = skills.filter((s) => !installed.has(s.skill))

			if (missing.length === 0) return []

			return [
				{
					filepath: '.xtarterize/skills-install.log',
					before: null,
					after: `# Skills to install (${missing.length} of ${skills.length}):\n${formatCommands(missing)}\n`,
				},
			]
		})
	},

	async apply(cwd, profile): Promise<void> {
		return wrapTask(this.id, 'apply', async () => {
			const pkg = await readPackageJson(cwd)
			const deps = pkg ? getAllDeps(pkg as Record<string, unknown>) : {}
			const skills = getSkillsToInstall(profile, deps)

			if (skills.length === 0) return

			const installed = await getInstalledSkills(cwd)
			const missing = skills.filter((s) => !installed.has(s.skill))

			const grouped = groupBySource(missing)
			for (const [source, skillNames] of grouped) {
				const args = [
					'--yes',
					'skills@latest',
					'add',
					source,
					...skillNames.flatMap((s) => ['--skill', s]),
					'-y',
				]
				const result = await x('npx', args, {
					timeout: 60_000,
					nodeOptions: { cwd, stdio: 'inherit' },
				})
				if (result.exitCode !== 0) {
					throw new TaskError({
						taskId: 'skillsInstallTask.apply',
						message: `Failed to install skills from ${source}: ${skillNames.join(', ')}`,
					})
				}
			}
		})
	},
}
