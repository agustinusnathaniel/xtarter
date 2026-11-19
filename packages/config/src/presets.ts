/**
 * Ultracite preset names each tool's entries mirror. Every name becomes a
 * shared entry, such as `@xtarter/config/biome/react`, that extends the Ultracite
 * preset of the same name. `core` carries the xtarter rule layer; the others
 * add only what their Ultracite preset adds.
 */
export const biomePresets = [
  'core',
  'angular',
  'astro',
  'cypress',
  'drizzle',
  'jest',
  'nestjs',
  'next',
  'playwright',
  'qwik',
  'react',
  'react-native',
  'remix',
  'solid',
  'storybook',
  'svelte',
  'tanstack',
  'type-aware',
  'vitest',
  'vue',
] as const;

export const oxlintPresets = [
  'core',
  'angular',
  'anti-slop',
  'astro',
  'cypress',
  'drizzle',
  'gdp',
  'jest',
  'js-plugins',
  'landmines',
  'nestjs',
  'next',
  'playwright',
  'qwik',
  'react',
  'react-native',
  'remix',
  'shadcn',
  'solid',
  'storybook',
  'svelte',
  'tanstack',
  'vitest',
  'vue',
] as const;

export type BiomePreset = (typeof biomePresets)[number];
export type OxlintPreset = (typeof oxlintPresets)[number];

/** The package name consumers extend; also the marker for a managed config. */
export const sharedConfigPackage = '@xtarter/config';

/** The specifier a consumer config uses for one tool's preset entry. */
export function sharedConfigEntry(
  tool: 'biome' | 'oxlint',
  preset: string
): string {
  return `${sharedConfigPackage}/${tool}/${preset}`;
}

/** The specifier for the Oxfmt entry, which has no presets. */
export const sharedOxfmtEntry = `${sharedConfigPackage}/oxfmt`;
