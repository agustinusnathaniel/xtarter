import { createAgentGuideTask } from '@/agent/module.js'
import { renderAgentsMd } from '@/templates/agents-md.js'

export const agentsMdTask = createAgentGuideTask({
	id: 'agent/agents-md',
	label: 'AGENTS.md',
	applicable: () => true,
	filepath: 'AGENTS.md',
	render: (profile) => renderAgentsMd(profile),
})
