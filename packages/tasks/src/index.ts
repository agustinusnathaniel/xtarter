import type { Task } from '@xtarterize/core'
import { agentsMdTask } from '@/agent/agents-md.js'
import { skillsTask } from '@/agent/skills.js'
import { skillsInstallTask } from '@/agent/skills-install.js'
import { autoUpdateWorkflowTask } from '@/ci/auto-update.js'
import { ciWorkflowTask } from '@/ci/ci.js'
import { releaseWorkflowTask } from '@/ci/release.js'
import { plopTask } from '@/codegen/plop.js'
import { renovateTask } from '@/deps/renovate.js'
import { editorconfigTask } from '@/editor/editorconfig.js'
import { vscodeTask } from '@/editor/vscode.js'
import { packageScriptsTask } from '@/factory/package-scripts.js'
import { biomeTask } from '@/lint/biome.js'
import { oxfmtTask, oxlintTask } from '@/lint/oxlint.js'
import { turboTask } from '@/monorepo/turbo.js'
import { npmrcTask } from '@/npmrc.js'
import { nvmrcTask } from '@/nvmrc.js'
import { knipTask } from '@/quality/knip.js'
import { lintStagedTask } from '@/quality/lint-staged.js'
import { catVersionTask } from '@/release/cat-version.js'
import { commitlintTask } from '@/release/commitlint.js'
import { czgTask } from '@/release/czg.js'
import { gitHooksTask } from '@/release/git-hooks.js'
import { renderReleaseWorkflow } from '@/templates/workflows/release-yml.js'
import { gitignoreTsbuildinfoTask } from '@/ts/gitignore-tsbuildinfo.js'
import { incrementalTask } from '@/ts/incremental.js'
import { pathsTask } from '@/ts/paths.js'
import { strictTask } from '@/ts/strict.js'
import { viteCheckerTask } from '@/vite/checker.js'
import { viteVisualizerTask } from '@/vite/visualizer.js'

export {
	checkJsonConfigTask,
	dryRunJsonConfigTask,
	ensureTaskDependency,
	ensureTaskParentDir,
	isExecutableFile,
	writeTaskDiffs,
} from '@/factory/index.js'

export {
	agentsMdTask,
	autoUpdateWorkflowTask,
	biomeTask,
	catVersionTask,
	ciWorkflowTask,
	commitlintTask,
	czgTask,
	editorconfigTask,
	gitHooksTask,
	gitignoreTsbuildinfoTask,
	incrementalTask,
	knipTask,
	lintStagedTask,
	npmrcTask,
	nvmrcTask,
	oxfmtTask,
	oxlintTask,
	packageScriptsTask,
	pathsTask,
	plopTask,
	releaseWorkflowTask,
	renderReleaseWorkflow,
	renovateTask,
	skillsInstallTask,
	skillsTask,
	strictTask,
	turboTask,
	viteCheckerTask,
	viteVisualizerTask,
	vscodeTask,
}

export function getAllTasks(): Task[] {
	return [
		biomeTask,
		oxlintTask,
		oxfmtTask,
		strictTask,
		pathsTask,
		incrementalTask,
		gitignoreTsbuildinfoTask,
		viteCheckerTask,
		viteVisualizerTask,
		releaseWorkflowTask,
		autoUpdateWorkflowTask,
		ciWorkflowTask,
		renovateTask,
		commitlintTask,
		czgTask,
		catVersionTask,
		gitHooksTask,
		knipTask,
		lintStagedTask,
		plopTask,
		turboTask,
		vscodeTask,
		editorconfigTask,
		agentsMdTask,
		skillsTask,
		skillsInstallTask,
		packageScriptsTask,
		npmrcTask,
		nvmrcTask,
	]
}
