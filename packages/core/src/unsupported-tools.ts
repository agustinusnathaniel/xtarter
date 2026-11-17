import type { ExistingConfig } from '@/detect/types.js';

/**
 * The one message xtarterize gives about ESLint and Prettier (ADR-044): which
 * of them it found and which task kinds it therefore skips. Null when neither
 * is present.
 */
export function unsupportedToolsNotice(
  existing: Pick<ExistingConfig, 'eslint' | 'prettier'>
): string | null {
  const found: Array<string> = [];
  const skipped: Array<string> = [];
  if (existing.eslint) {
    found.push('ESLint');
    skipped.push('linting');
  }
  if (existing.prettier) {
    found.push('Prettier');
    skipped.push('formatting');
  }
  if (found.length === 0) {
    return null;
  }
  return `${found.join(' and ')} found. xtarterize configures only Biome and the Oxc tools (Oxlint, Oxfmt), so it skips the ${skipped.join(' and ')} tasks.`;
}
