import { biomeCoreLayer, sharedConfigEntry } from '@xtarter/config';
import type { ProjectProfile } from '@xtarterize/core';

import type { LintConfigForm } from '@/lint/config-form.js';

import { collectUltracitePresets } from './ultracite-presets.js';

function buildBiomeFilesConfig(): Record<string, unknown> {
  return {
    ignoreUnknown: false,
    includes: [
      'src/**/*',
      '*.config.ts',
      '!**/*.css',
      '!**/*.d.ts',
      '!.agents',
      '!.claude',
    ],
  };
}

function buildBiomeProjectSettings(): Record<string, unknown> {
  return {
    files: buildBiomeFilesConfig(),
    vcs: { clientKind: 'git', enabled: true, useIgnoreFile: true },
  };
}

const BIOME_SCHEMA = './node_modules/@biomejs/biome/configuration_schema.json';

/** The full config: Ultracite presets plus the xtarter layer written inline. */
function buildEjectedBiomeConfig(
  profile: ProjectProfile
): Record<string, unknown> {
  const layer = biomeCoreLayer();
  const { files, vcs } = buildBiomeProjectSettings();
  return {
    $schema: BIOME_SCHEMA,
    assist: layer.assist,
    extends: collectUltracitePresets(profile, 'ultracite/biome/'),
    files,
    formatter: layer.formatter,
    javascript: layer.javascript,
    linter: layer.linter,
    overrides: layer.overrides,
    vcs,
  };
}

/** The shared entries a managed Biome config extends, core first. */
export function managedBiomeExtends(profile: ProjectProfile): Array<string> {
  return collectUltracitePresets(profile).map((preset) =>
    sharedConfigEntry('biome', preset)
  );
}

/** A short config extending `@xtarter/config`, plus project-specific settings. */
function buildManagedBiomeConfig(
  profile: ProjectProfile
): Record<string, unknown> {
  return {
    $schema: BIOME_SCHEMA,
    extends: managedBiomeExtends(profile),
    ...buildBiomeProjectSettings(),
  };
}

function hasTailwindStyling(profile: ProjectProfile): boolean {
  return (
    profile.styling.includes('tailwind') ||
    profile.styling.includes('nativewind')
  );
}

function withProjectCss(
  profile: ProjectProfile,
  config: Record<string, unknown>
): Record<string, unknown> {
  if (hasTailwindStyling(profile)) {
    config.css = { parser: { tailwindDirectives: true } };
  }
  return config;
}

export function buildBiomeJson(
  profile: ProjectProfile,
  form: LintConfigForm
): Record<string, unknown> {
  return withProjectCss(
    profile,
    form === 'managed'
      ? buildManagedBiomeConfig(profile)
      : buildEjectedBiomeConfig(profile)
  );
}
