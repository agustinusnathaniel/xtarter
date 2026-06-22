export const ACTION_VERSIONS = {
	CHECKOUT: 'actions/checkout@v7',
	SETUP_NODE: 'actions/setup-node@v6',
	PNPM_SETUP: 'pnpm/setup@v1',
	CREATE_PR: 'peter-evans/create-pull-request@v8',
} as const

export const NODE_VERSION = 20
