import type { TemplateProvider } from './templates/registry';

export type PackageManager = 'pnpm' | 'npm' | 'bun' | 'yarn';

export interface TemplateInfo {
  branch: string;
  description: string;
  features: Array<string>;
  id: string;
  name: string;
  provider: TemplateProvider;
  repo: string;
}
