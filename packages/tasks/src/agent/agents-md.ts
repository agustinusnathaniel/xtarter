import { defineSingleTargetTask } from '@/factory/define-task.js';
import { renderAgentsMd } from '@/templates/agents-md.js';

export const agentsMdTask = defineSingleTargetTask({
  applicable: () => true,
  group: 'Agent',
  id: 'agent/agents-md',
  label: 'AGENTS.md',
  searchMeta: {
    keywords: ['agents', 'ai', 'claude', 'opencode', 'agent config', 'llm'],
    tags: ['ai', 'agent', 'documentation', 'setup'],
  },
  target: {
    filepath: 'AGENTS.md',
    kind: 'text',
    render: (profile, existing) => existing ?? renderAgentsMd(profile),
  },
});
