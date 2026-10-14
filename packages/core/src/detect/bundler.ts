import { findConfigFile } from '@/utils/fs.js';

import type { Bundler } from './types.js';

const CONFIG_EXTENSIONS = ['.ts', '.js', '.mts', '.mjs', '.cts', '.cjs'];

async function hasBundlerConfig(
  cwd: string,
  baseName: string
): Promise<boolean> {
  return Boolean(await findConfigFile(cwd, baseName, CONFIG_EXTENSIONS));
}

/**
 * Detects the bundler from dependencies and config files
 * @param deps - Record of package names to versions
 * @param cwd - Current working directory
 * @returns Detected bundler
 */
export async function detectBundler(
  deps: Record<string, string>,
  cwd: string
): Promise<Bundler> {
  if (deps['@tanstack/start']) {
    return 'tanstack-start';
  }
  if (deps.next) {
    return 'nextjs';
  }
  if (deps.expo) {
    return 'expo';
  }
  if (deps.vite) {
    return 'vite';
  }
  if (deps.webpack) {
    return 'webpack';
  }
  if (deps['@rspack/core']) {
    return 'rspack';
  }
  if (await hasBundlerConfig(cwd, 'next.config')) {
    return 'nextjs';
  }
  if (await hasBundlerConfig(cwd, 'vite.config')) {
    return 'vite';
  }
  if (await hasBundlerConfig(cwd, 'rspack.config')) {
    return 'rspack';
  }
  if (await hasBundlerConfig(cwd, 'webpack.config')) {
    return 'webpack';
  }
  return 'none';
}
