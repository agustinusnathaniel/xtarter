export const ACTION_VERSIONS = {
  CHECKOUT: 'actions/checkout@v7',
  CREATE_PR: 'peter-evans/create-pull-request@v8',
  PNPM_SETUP: 'pnpm/setup@v1',
  SETUP_NODE: 'actions/setup-node@v6',
} as const;

export const NODE_VERSION = 22;
