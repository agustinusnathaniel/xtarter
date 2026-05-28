import type { ProjectProfile } from '@xtarterize/core'
import { runScriptCommand } from 'nypm'

export function renderAgentsMd(profile: ProjectProfile): string {
	const pm = profile.packageManager
	const runCmd = (script: string) => runScriptCommand(pm, script)

	return `# AGENTS.md

${profile.framework ? `${profile.framework.charAt(0).toUpperCase() + profile.framework.slice(1)}` : 'Node.js'} project${profile.bundler ? ` with ${profile.bundler}` : ''}.

## Commands

- **Install**: \`${pm} install\`
- **Dev**: \`${runCmd('dev')}\`
- **Build**: \`${runCmd('build')}\`
- **Lint**: \`${runCmd('lint')}\`
- **Typecheck**: \`${runCmd('typecheck')}\`
- **Test**: \`${runCmd('test')}\`
`
}

export function renderAgentsMdFiles(): Array<{
	filepath: string
	content: string
}> {
	return []
}
