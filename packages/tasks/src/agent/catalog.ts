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
    agentsMd: boolean;
    githubWorkflows: Array<string>;
    turbo: boolean;
  };
  framework: string | null;
  hasGit: boolean;
  hasGitHub: boolean;
  monorepoTool: string | null;
  runtime: string;
  typescript: boolean;
}

/**
 * A resolved skill entry - source + name, no condition.
 */
export interface SkillEntry {
  group: string;
  skill: string;
  source: string;
}

/**
 * A catalog entry with a condition that decides whether the skill applies.
 */
export interface SkillDefinition {
  condition: (profile: SkillProfile, deps: Record<string, string>) => boolean;
  group: string;
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
const webUi: SkillCondition = (p) =>
  ['react', 'vue', 'svelte', 'solid'].includes(p.framework ?? '') &&
  (p.runtime === 'browser' || p.runtime === 'edge');
const testRunner: SkillCondition = (_p, d) =>
  hasAnyDep(d, [
    'vitest',
    'jest',
    '@jest/globals',
    'mocha',
    'uvu',
    'ava',
    'tap',
    '@playwright/test',
    'playwright',
    'cypress',
  ]);
const apiServer: SkillCondition = (_p, d) =>
  hasAnyDep(d, [
    'express',
    'fastify',
    'hono',
    'koa',
    '@nestjs/core',
    '@trpc/server',
    'graphql',
    '@apollo/server',
  ]);
const securitySurface: SkillCondition = (p, d) =>
  apiServer(p, d) ||
  hasAnyDep(d, [
    'better-auth',
    'next-auth',
    '@auth/core',
    '@clerk/nextjs',
    '@clerk/clerk-react',
    '@supabase/supabase-js',
    'supabase',
    'firebase',
    'firebase-admin',
    'pg',
    'postgres',
    'drizzle-orm',
    '@prisma/client',
    'mongoose',
    'mongodb',
    'mysql2',
    '@neondatabase/serverless',
    '@libsql/client',
  ]);

/** Expand one condition + source + skill names into catalog entries. */
function skillsFor(
  condition: SkillCondition,
  source: string,
  skills: Array<string>
): Array<Omit<SkillDefinition, 'group'>> {
  return skills.map((skill) => ({ condition, skill, source }));
}

function alwaysSkills(
  source: string,
  skills: Array<string>
): Array<Omit<SkillDefinition, 'group'>> {
  return skillsFor(() => true, source, skills);
}

/** Attach a display group to catalog entries without reordering them. */
function inGroup(
  group: string,
  entries: Array<Array<Omit<SkillDefinition, 'group'>>>
): Array<SkillDefinition> {
  return entries.flat().map((entry) => ({ ...entry, group }));
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
  ...inGroup('General', [
    alwaysSkills('vercel-labs/opensrc', ['opensrc']),
    alwaysSkills('mattpocock/skills', [
      'grill-me',
      'grill-with-docs',
      'handoff',
      'improve-codebase-architecture',
      'grilling',
      'codebase-design',
    ]),
    alwaysSkills('shadcn/improve', ['improve']),
    alwaysSkills('mattpocock/skills', ['writing-for-agents']),
  ]),

  ...inGroup('Frontend / UI', [
    skillsFor(browser, 'anthropics/skills', ['frontend-design']),
    skillsFor(browser, 'vercel-labs/agent-skills', ['web-design-guidelines']),
    skillsFor(browser, 'ibelick/ui-skills', [
      'baseline-ui',
      'fixing-accessibility',
      'fixing-metadata',
      'fixing-motion-performance',
    ]),
  ]),

  ...inGroup('React', [
    skillsFor(react, 'vercel-labs/agent-skills', [
      'vercel-react-best-practices',
      'vercel-composition-patterns',
    ]),
    skillsFor(react, 'softaworks/agent-toolkit', [
      'react-dev',
      'react-useeffect',
    ]),
  ]),

  ...inGroup('Next.js', [
    skillsFor((p) => p.bundler === 'nextjs', 'vercel/next.js', [
      'next-dev-loop',
      'next-cache-components-optimizer',
      'next-cache-components-adoption',
    ]),
  ]),

  ...inGroup('Vue / Nuxt', [
    skillsFor((p) => p.framework === 'vue', 'antfu/skills', [
      'vue',
      'vue-best-practices',
    ]),
    skillsFor((_p, d) => hasDep(d, 'nuxt'), 'antfu/skills', ['nuxt']),
  ]),

  ...inGroup('shadcn/ui', [
    skillsFor(
      (_p, d) =>
        hasAnyDep(d, ['shadcn', 'shadcn-ui', '@shadcn/ui', '@shadcn-ui/cli']),
      'shadcn-ui/ui',
      ['shadcn']
    ),
  ]),

  ...inGroup('Ultracite', [
    skillsFor((_p, d) => hasDep(d, 'ultracite'), 'haydenbleasel/ultracite', [
      'ultracite',
    ]),
  ]),

  ...inGroup('Component libraries', [
    skillsFor((_p, d) => hasDep(d, 'antd'), 'ant-design/ant-design-cli', [
      'antd',
    ]),
    skillsFor((_p, d) => hasDep(d, '@heroui/react'), 'heroui-inc/heroui', [
      'heroui-react',
    ]),
    skillsFor((_p, d) => hasDep(d, '@chakra-ui/react'), 'chakra-ui/chakra-ui', [
      'chakra-ui-builder',
      'chakra-ui-refactor',
    ]),
  ]),

  ...inGroup('Expo / React Native', [
    skillsFor(
      (p, d) => p.bundler === 'expo' || hasDep(d, 'expo'),
      'expo/skills',
      ['expo-overview']
    ),
    skillsFor(expoNative, 'expo/skills', [
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
    skillsFor(expoNative, 'vercel-labs/agent-skills', [
      'vercel-react-native-skills',
    ]),
    skillsFor(
      (_p, d) => hasDep(d, 'heroui-native') && hasDep(d, 'react-native'),
      'heroui-inc/heroui',
      ['heroui-native']
    ),
  ]),

  ...inGroup('Build & dev tools', [
    skillsFor(
      (p, d) => p.bundler === 'vite' || hasDep(d, 'vite'),
      'antfu/skills',
      ['vite']
    ),
    skillsFor((_p, d) => hasDep(d, 'vitest'), 'antfu/skills', ['vitest']),
    skillsFor((_p, d) => hasDep(d, 'tsdown'), 'antfu/skills', ['tsdown']),
    skillsFor(
      (p) => p.monorepoTool === 'turbo' || p.existing.turbo,
      'vercel/turborepo',
      ['turborepo']
    ),
  ]),

  ...inGroup('Database & auth', [
    skillsFor(
      (_p, d) =>
        hasAnyDep(d, ['@supabase/supabase-js', 'supabase', 'pg', 'postgres']),
      'supabase/agent-skills',
      ['supabase-postgres-best-practices']
    ),
    skillsFor((_p, d) => hasDep(d, 'drizzle-orm'), 'ccheney/robust-skills', [
      'postgres-drizzle',
    ]),
    skillsFor(
      (_p, d) => hasAnyDep(d, ['redis', 'ioredis']),
      'mindrally/skills',
      ['redis-best-practices']
    ),
    skillsFor((_p, d) => hasDep(d, 'better-auth'), 'better-auth/skills', [
      'better-auth-best-practices',
      'create-auth',
    ]),
  ]),

  ...inGroup('AI SDKs', [
    skillsFor((_p, d) => hasDep(d, 'ai'), 'vercel/ai', ['ai-sdk']),
  ]),

  ...inGroup('Media', [
    skillsFor(
      (_p, d) => hasAnyDep(d, ['remotion', '@remotion/cli']),
      'remotion-dev/skills',
      ['remotion-best-practices']
    ),
  ]),

  // Test strategy follows projects with an existing test runner.
  ...inGroup('Testing', [
    skillsFor(testRunner, 'agustinusnathaniel/skills', ['test-strategy']),
  ]),

  ...inGroup('Design & motion', [
    skillsFor(webUi, 'emilkowalski/skills', [
      'emil-design-eng',
      'animate',
      'apple-design',
      'find-animation-opportunities',
      'improve-animations',
      'animation-vocabulary',
      'break-ui',
    ]),
    skillsFor(expoNative, 'emilkowalski/skills', ['animate-expo']),
    skillsFor((_p, d) => hasDep(d, 'sonner'), 'emilkowalski/skills', [
      'ask-sonner',
    ]),
    skillsFor(webUi, 'jakubkrehel/skills', [
      'better-accessibility',
      'better-colors',
      'better-interface',
      'better-layout',
      'better-typography',
      'better-ui',
      'better-writing',
    ]),
  ]),

  // Security guidance is selected for projects with API, auth, or data access.
  ...inGroup('Security', [
    skillsFor(securitySurface, 'cloudflare/security-audit-skill', [
      'security-audit',
    ]),
    skillsFor(securitySurface, 'addyosmani/agent-skills', [
      'security-and-hardening',
    ]),
    skillsFor(apiServer, 'addyosmani/agent-skills', [
      'api-and-interface-design',
    ]),
  ]),

  // Existing tooling signals for development workflows
  ...inGroup('Workflow', [
    skillsFor(webUi, 'addyosmani/agent-skills', ['frontend-ui-engineering']),
    skillsFor(testRunner, 'addyosmani/agent-skills', [
      'test-driven-development',
    ]),
    skillsFor((p) => p.hasGit, 'addyosmani/agent-skills', [
      'git-workflow-and-versioning',
    ]),
    skillsFor((p) => p.hasGitHub, 'addyosmani/agent-skills', [
      'code-review-and-quality',
    ]),
    skillsFor(
      (p) => p.existing.githubWorkflows.length > 0,
      'addyosmani/agent-skills',
      ['ci-cd-and-automation']
    ),
    skillsFor((p) => p.existing.agentsMd, 'addyosmani/agent-skills', [
      'context-engineering',
    ]),
  ]),

  // Mobile web polish is framework-agnostic, so it follows the browser runtime
  // rather than a specific UI framework.
  ...inGroup('Mobile web', [
    skillsFor(browser, 'emilkowalski/skills', ['mobile-native']),
  ]),
];

/**
 * Filter the full catalog to only skills that apply to the given project.
 */
export function getSkillsToInstall(
  profile: SkillProfile,
  deps: Record<string, string>
): Array<SkillEntry> {
  return SKILL_CATALOG.filter((s) => s.condition(profile, deps)).map((s) => ({
    group: s.group,
    skill: s.skill,
    source: s.source,
  }));
}
