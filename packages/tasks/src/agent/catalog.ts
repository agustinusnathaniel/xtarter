// Skill catalog for xtarterize tasks. Edit this file directly.

/**
 * Minimal project profile - a subset of @xtarterize/core's ProjectProfile.
 *
 * Only the fields that skill conditions actually inspect are declared here
 * so the catalog package stays dependency-free while remaining structurally
 * compatible with the richer core profile.
 */
export interface SkillProfile {
  bundler: string | null;
  existing: {
    turbo: boolean;
  };
  framework: string | null;
  monorepoTool: string | null;
  runtime: string;
  typescript: boolean;
}

/**
 * A resolved skill entry - source + name, no condition.
 */
export interface SkillEntry {
  skill: string;
  source: string;
}

/**
 * A catalog entry with a condition that decides whether the skill applies.
 */
export interface SkillDefinition {
  condition: (profile: SkillProfile, deps: Record<string, string>) => boolean;
  skill: string;
  source: string;
}

export function hasDep(deps: Record<string, string>, dep: string): boolean {
  return dep in deps;
}

export function hasAnyDep(
  deps: Record<string, string>,
  depNames: Array<string>
): boolean {
  return depNames.some((dep) => hasDep(deps, dep));
}

type SkillCondition = SkillDefinition['condition'];

/** Shared conditions, so a group of entries does not retype its predicate. */
const browser: SkillCondition = (p) =>
  p.runtime === 'browser' || p.runtime === 'edge';
const react: SkillCondition = (p) => p.framework === 'react';
const expoNative: SkillCondition = (p) =>
  p.bundler === 'expo' || p.framework === 'react-native';

/** Expand one condition + source + skill names into catalog entries. */
function skillsFor(
  condition: SkillCondition,
  source: string,
  skills: Array<string>
): Array<SkillDefinition> {
  return skills.map((skill) => ({ condition, skill, source }));
}

function alwaysSkills(
  source: string,
  skills: Array<string>
): Array<SkillDefinition> {
  return skillsFor(() => true, source, skills);
}

/**
 * Declarative catalog of all installable skills, grouped by category.
 *
 * To add a new skill, append it to the `skillsFor`/`alwaysSkills` call for
 * its source, or add a call with a `condition` that matches the project stack.
 * Entry order is observable (it drives the install command order), so append
 * new groups at the end rather than regrouping existing calls.
 */
export const SKILL_CATALOG: Array<SkillDefinition> = [
  // General (always applicable)
  ...alwaysSkills('vercel-labs/opensrc', ['opensrc']),
  ...alwaysSkills('mattpocock/skills', [
    'grill-me',
    'grill-with-docs',
    'handoff',
    'improve-codebase-architecture',
  ]),
  ...alwaysSkills('shadcn/improve', ['improve']),
  ...alwaysSkills('mattpocock/skills', ['writing-for-agents']),

  // Frontend / UI
  ...skillsFor(browser, 'anthropics/skills', ['frontend-design']),
  ...skillsFor(browser, 'vercel-labs/agent-skills', ['web-design-guidelines']),
  ...skillsFor(browser, 'ibelick/ui-skills', [
    'baseline-ui',
    'fixing-accessibility',
    'fixing-metadata',
    'fixing-motion-performance',
  ]),

  // React
  ...skillsFor(react, 'vercel-labs/agent-skills', [
    'vercel-react-best-practices',
    'vercel-composition-patterns',
  ]),
  ...skillsFor(react, 'softaworks/agent-toolkit', [
    'react-dev',
    'react-useeffect',
  ]),

  // Next.js
  ...skillsFor((p) => p.bundler === 'nextjs', 'vercel/next.js', [
    'next-dev-loop',
    'next-cache-components-optimizer',
    'next-cache-components-adoption',
  ]),

  // Vue / Nuxt
  ...skillsFor((p) => p.framework === 'vue', 'antfu/skills', [
    'vue',
    'vue-best-practices',
  ]),
  ...skillsFor((_p, d) => hasDep(d, 'nuxt'), 'antfu/skills', ['nuxt']),

  // Shadcn
  ...skillsFor(
    (_p, d) =>
      hasAnyDep(d, ['shadcn', 'shadcn-ui', '@shadcn/ui', '@shadcn-ui/cli']),
    'shadcn-ui/ui',
    ['shadcn']
  ),

  // Ultracite
  ...skillsFor((_p, d) => hasDep(d, 'ultracite'), 'haydenbleasel/ultracite', [
    'ultracite',
  ]),

  // Component libraries
  ...skillsFor((_p, d) => hasDep(d, 'antd'), 'ant-design/ant-design-cli', [
    'antd',
  ]),
  ...skillsFor((_p, d) => hasDep(d, '@heroui/react'), 'heroui-inc/heroui', [
    'heroui-react',
  ]),
  ...skillsFor(
    (_p, d) => hasDep(d, '@chakra-ui/react'),
    'chakra-ui/chakra-ui',
    ['chakra-ui-builder', 'chakra-ui-refactor']
  ),

  // Expo / React Native
  ...skillsFor(
    (p, d) => p.bundler === 'expo' || hasDep(d, 'expo'),
    'expo/skills',
    ['expo-overview']
  ),
  ...skillsFor(expoNative, 'expo/skills', [
    'expo-router',
    'eas-workflows',
    'eas-app-stores',
    'eas-update',
    'expo-dev-client',
    'expo-native-ui',
    'expo-data-fetching',
    'expo-module',
    'expo-upgrade',
  ]),
  ...skillsFor(expoNative, 'vercel-labs/agent-skills', [
    'vercel-react-native-skills',
  ]),
  ...skillsFor(
    (_p, d) => hasDep(d, 'heroui-native') && hasDep(d, 'react-native'),
    'heroui-inc/heroui',
    ['heroui-native']
  ),

  // Build / dev tools
  ...skillsFor(
    (p, d) => p.bundler === 'vite' || hasDep(d, 'vite'),
    'antfu/skills',
    ['vite']
  ),
  ...skillsFor((_p, d) => hasDep(d, 'vitest'), 'antfu/skills', ['vitest']),
  ...skillsFor((_p, d) => hasDep(d, 'tsdown'), 'antfu/skills', ['tsdown']),
  ...skillsFor(
    (p) => p.monorepoTool === 'turbo' || p.existing.turbo,
    'vercel/turborepo',
    ['turborepo']
  ),

  // Database / Auth
  ...skillsFor(
    (_p, d) =>
      hasAnyDep(d, ['@supabase/supabase-js', 'supabase', 'pg', 'postgres']),
    'supabase/agent-skills',
    ['supabase-postgres-best-practices']
  ),
  ...skillsFor((_p, d) => hasDep(d, 'drizzle-orm'), 'ccheney/robust-skills', [
    'postgres-drizzle',
  ]),
  ...skillsFor(
    (_p, d) => hasAnyDep(d, ['redis', 'ioredis']),
    'mindrally/skills',
    ['redis-best-practices']
  ),
  ...skillsFor((_p, d) => hasDep(d, 'better-auth'), 'better-auth/skills', [
    'better-auth-best-practices',
    'create-auth',
  ]),

  // AI / SDKs
  ...skillsFor((_p, d) => hasDep(d, 'ai'), 'vercel/ai', ['ai-sdk']),

  // Media / Specialized
  ...skillsFor(
    (_p, d) => hasAnyDep(d, ['remotion', '@remotion/cli']),
    'remotion-dev/skills',
    ['remotion-best-practices']
  ),
];

/**
 * Filter the full catalog to only skills that apply to the given project.
 */
export function getSkillsToInstall(
  profile: SkillProfile,
  deps: Record<string, string>
): Array<SkillEntry> {
  return SKILL_CATALOG.filter((s) => s.condition(profile, deps)).map((s) => ({
    skill: s.skill,
    source: s.source,
  }));
}
