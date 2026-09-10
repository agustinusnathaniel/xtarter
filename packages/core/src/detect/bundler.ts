import { findConfigFile } from '@/utils/fs.js';

import { rootFileInputByBasename } from './registry/index.js';
import type { Bundler } from './types.js';

function defaultConfigExtensions(baseName: string): Array<string> {
  const input = rootFileInputByBasename(baseName);
  if (!input) {
    throw new Error(
      `No detection registry root file input declares "${baseName}"`
    );
  }
  return [...input.extensions];
}

/**
 * Checks if a bundler config file exists
 * @param cwd - Current working directory
 * @param baseName - Base name of config file (e.g., 'vite.config')
 * @param extensions - File extensions to check; defaults to the extensions
 * declared by the matching registry root file input
 * @returns Promise resolving to true if config file exists
 */
export async function hasBundlerConfig(
  cwd: string,
  baseName: string,
  extensions?: Array<string>
): Promise<boolean> {
  const resolved = extensions ?? defaultConfigExtensions(baseName);
  return Boolean(await findConfigFile(cwd, baseName, resolved));
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

  // Check once and cache - avoids redundant hasBundlerConfig calls
  const hasRspackConfig = await hasBundlerConfig(cwd, 'rspack.config');
  if (hasRspackConfig) {
    return 'rspack';
  }
  if (await hasBundlerConfig(cwd, 'webpack.config')) {
    return 'webpack';
  }
  return 'none';
}
