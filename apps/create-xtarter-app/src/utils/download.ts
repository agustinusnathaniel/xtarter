import { consola } from '@xtarterize/core';
import { downloadTemplate } from 'giget';

import type { TemplateConfig } from '@/templates/registry';

export interface DownloadOptions {
  offline?: boolean;
  /** Git ref (branch/tag/commit) to download. Overrides template.branch. */
  ref?: string;
  targetPath: string;
  template: TemplateConfig;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const NETWORK_ERROR_PATTERN = /ENOTFOUND|ECONNREFUSED|ETIMEDOUT|network|fetch/;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function downloadTemplateFiles({
  template,
  targetPath,
  offline = false,
  ref,
}: DownloadOptions): Promise<void> {
  const logger = consola.withTag('download');
  const source = `github:${template.repo}#${ref || template.branch}`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      logger.start(
        `Downloading template ${template.name}...${attempt > 1 ? ` (attempt ${attempt}/${MAX_RETRIES})` : ''}`
      );

      await downloadTemplate(source, {
        dir: targetPath,
        force: true,
        offline,
      });

      logger.success(`Template downloaded to ${targetPath}`);
      return;
    } catch (error) {
      const failure =
        error instanceof Error ? error : new Error('Unknown error');

      if (
        !NETWORK_ERROR_PATTERN.test(failure.message) ||
        attempt === MAX_RETRIES
      ) {
        logger.fail(`Failed to download template: ${failure.message}`);
        throw failure;
      }

      logger.warn(`Network error, retrying in ${RETRY_DELAY / 1000}s...`);
      await sleep(RETRY_DELAY);
    }
  }
}
