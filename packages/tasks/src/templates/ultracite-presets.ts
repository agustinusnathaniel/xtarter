import type { ProjectProfile } from '@xtarterize/core';

const FRAMEWORK_PRESET_SUFFIX: Record<string, string> = {
  react: 'react',
  solid: 'solid',
  svelte: 'svelte',
  vue: 'vue',
};

export function getUltraciteFrameworkPresetSuffix(
  profile: ProjectProfile
): string | null {
  return FRAMEWORK_PRESET_SUFFIX[profile.framework ?? ''] ?? null;
}

export function getUltraciteRouterPresetSuffix(
  profile: ProjectProfile
): string | null {
  if (profile.bundler === 'nextjs') {
    return 'next';
  }

  if (
    profile.router === 'tanstack-router' ||
    profile.router === 'react-router'
  ) {
    return 'remix';
  }

  return null;
}

export function collectUltracitePresets(
  profile: ProjectProfile,
  prefix = ''
): Array<string> {
  const presets = [`${prefix}core`];
  const suffixes = [
    getUltraciteFrameworkPresetSuffix(profile),
    getUltraciteRouterPresetSuffix(profile),
  ];

  for (const suffix of suffixes) {
    if (suffix) {
      presets.push(`${prefix}${suffix}`);
    }
  }

  return presets;
}
