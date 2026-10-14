import type { TemplateConfig } from './templates/registry';

export const PACKAGE_MANAGERS = ['pnpm', 'npm', 'bun', 'yarn'] as const;

export type PackageManager = (typeof PACKAGE_MANAGERS)[number];

export type TemplateInfo = Omit<TemplateConfig, 'path'>;
