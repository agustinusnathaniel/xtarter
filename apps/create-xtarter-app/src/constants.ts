import { pc } from '@xtarterize/core';

import { version } from '^/package.json';

export const APP_NAME: string = pc.cyan('create-xtarter-app');

const BOX = 44;

export const BANNER: string = `
${pc.cyan(`╔${'═'.repeat(BOX)}╗`)}
${pc.cyan(`║${' '.repeat(BOX)}║`)}
${pc.cyan(`║${' '.repeat(13)}`)}${pc.bold('create-xtarter-app')}${pc.cyan(`${' '.repeat(13)}║`)}
${pc.cyan(`║${' '.repeat(BOX)}║`)}
${pc.cyan(`║${' '.repeat(10)}`)}${pc.dim('Fast project scaffolding')}${pc.cyan(`${' '.repeat(10)}║`)}
${pc.cyan(`║${' '.repeat(12)}`)}${pc.dim('for modern web apps')}${pc.cyan(`${' '.repeat(13)}║`)}
${pc.cyan(`║${' '.repeat(BOX)}║`)}
${pc.cyan(`╚${'═'.repeat(BOX)}╝`)}
`;

export const DEFAULT_TEMPLATE = 'next-chakra';

export const SUPPORTED_PACKAGE_MANAGERS = {
  bun: {
    execCommand: 'bun',
    installCommand: 'install',
    name: 'bun',
  },
  npm: {
    execCommand: 'npm',
    installCommand: 'install',
    name: 'npm',
  },
  pnpm: {
    execCommand: 'pnpm',
    installCommand: 'install',
    name: 'pnpm',
  },
  yarn: {
    execCommand: 'yarn',
    installCommand: 'install',
    name: 'yarn',
  },
} as const;

export const VERSION: string = version;
