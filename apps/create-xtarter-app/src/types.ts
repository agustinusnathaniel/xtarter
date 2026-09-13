import type { TemplateConfig } from './templates/registry';

export type PackageManager = 'pnpm' | 'npm' | 'bun' | 'yarn';

export type TemplateInfo = Omit<TemplateConfig, 'path'>;
