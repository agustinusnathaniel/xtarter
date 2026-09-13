import { pc } from '@xtarterize/core/plain';

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

export const VERSION: string = version;
