import { createAgentPresenceTask } from '@/agent/module.js'
import { renderProjectContext } from '@/templates/project-context.js'

export const skillsTask = createAgentPresenceTask({
	id: 'agent/skills',
	label: 'AI Skills directory',
	applicable: (profile) => profile.typescript,
	filepath: '.agents/skills/project-context.md',
	render: (profile) => renderProjectContext(profile),
	ensureParentDir: true,
})
