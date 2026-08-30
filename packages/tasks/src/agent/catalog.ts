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

/**
 * Declarative catalog of all installable skills, grouped by category.
 *
 * To add a new skill, append an entry with its source, skill name, and a
 * `condition` that returns `true` when the project stack matches.
 */
export const SKILL_CATALOG: Array<SkillDefinition> = [
  // ═════════════════════════════════════════════════════════════════
  //  General (always applicable)
  // ═════════════════════════════════════════════════════════════════
  {
    condition: () => true,
    skill: 'opensrc',
    source: 'vercel-labs/opensrc',
  },
  {
    condition: () => true,
    skill: 'grill-me',
    source: 'mattpocock/skills',
  },
  {
    condition: () => true,
    skill: 'grill-with-docs',
    source: 'mattpocock/skills',
  },
  {
    condition: () => true,
    skill: 'handoff',
    source: 'mattpocock/skills',
  },
  {
    condition: () => true,
    skill: 'improve-codebase-architecture',
    source: 'mattpocock/skills',
  },
  {
    condition: () => true,
    skill: 'improve',
    source: 'shadcn/improve',
  },
  {
    condition: () => true,
    skill: 'writing-great-skills',
    source: 'mattpocock/skills',
  },

  // ═════════════════════════════════════════════════════════════════
  //  Frontend / UI
  // ═════════════════════════════════════════════════════════════════
  {
    condition: (p) => p.runtime === 'browser' || p.runtime === 'edge',
    skill: 'frontend-design',
    source: 'anthropics/skills',
  },
  {
    condition: (p) => p.runtime === 'browser' || p.runtime === 'edge',
    skill: 'web-design-guidelines',
    source: 'vercel-labs/agent-skills',
  },
  {
    condition: (p) => p.runtime === 'browser' || p.runtime === 'edge',
    skill: 'baseline-ui',
    source: 'ibelick/ui-skills',
  },
  {
    condition: (p) => p.runtime === 'browser' || p.runtime === 'edge',
    skill: 'fixing-accessibility',
    source: 'ibelick/ui-skills',
  },
  {
    condition: (p) => p.runtime === 'browser' || p.runtime === 'edge',
    skill: 'fixing-metadata',
    source: 'ibelick/ui-skills',
  },
  {
    condition: (p) => p.runtime === 'browser' || p.runtime === 'edge',
    skill: 'fixing-motion-performance',
    source: 'ibelick/ui-skills',
  },

  // ═════════════════════════════════════════════════════════════════
  //  React
  // ═════════════════════════════════════════════════════════════════
  {
    condition: (p) => p.framework === 'react',
    skill: 'vercel-react-best-practices',
    source: 'vercel-labs/agent-skills',
  },
  {
    condition: (p) => p.framework === 'react',
    skill: 'vercel-composition-patterns',
    source: 'vercel-labs/agent-skills',
  },
  {
    condition: (p) => p.framework === 'react',
    skill: 'react-dev',
    source: 'softaworks/agent-toolkit',
  },
  {
    condition: (p) => p.framework === 'react',
    skill: 'react-useeffect',
    source: 'softaworks/agent-toolkit',
  },

  // ═════════════════════════════════════════════════════════════════
  //  Next.js
  // ═════════════════════════════════════════════════════════════════
  {
    condition: (p) => p.bundler === 'nextjs',
    skill: 'next-dev-loop',
    source: 'vercel/next.js',
  },
  {
    condition: (p) => p.bundler === 'nextjs',
    skill: 'next-cache-components-optimizer',
    source: 'vercel/next.js',
  },
  {
    condition: (p) => p.bundler === 'nextjs',
    skill: 'next-cache-components-adoption',
    source: 'vercel/next.js',
  },

  // ═════════════════════════════════════════════════════════════════
  //  Vue / Nuxt
  // ═════════════════════════════════════════════════════════════════
  {
    condition: (p) => p.framework === 'vue',
    skill: 'vue',
    source: 'antfu/skills',
  },
  {
    condition: (p) => p.framework === 'vue',
    skill: 'vue-best-practices',
    source: 'antfu/skills',
  },
  {
    condition: (_p, d) => hasDep(d, 'nuxt'),
    skill: 'nuxt',
    source: 'antfu/skills',
  },

  // ═════════════════════════════════════════════════════════════════
  //  Shadcn
  // ═════════════════════════════════════════════════════════════════
  {
    condition: (_p, d) =>
      hasAnyDep(d, ['shadcn', 'shadcn-ui', '@shadcn/ui', '@shadcn-ui/cli']),
    skill: 'shadcn',
    source: 'shadcn/ui',
  },

  // ═════════════════════════════════════════════════════════════════
  //  Ultracite
  // ═════════════════════════════════════════════════════════════════
  {
    condition: (_p, d) => hasDep(d, 'ultracite'),
    skill: 'ultracite',
    source: 'haydenbleasel/ultracite',
  },

  // ═════════════════════════════════════════════════════════════════
  //  Component Libraries
  // ═════════════════════════════════════════════════════════════════
  {
    condition: (_p, d) => hasDep(d, 'antd'),
    skill: 'antd',
    source: 'ant-design/ant-design-cli',
  },
  {
    condition: (_p, d) => hasDep(d, '@heroui/react'),
    skill: 'heroui-react',
    source: 'heroui-inc/heroui',
  },
  {
    condition: (_p, d) => hasDep(d, '@chakra-ui/react'),
    skill: 'chakra-ui-builder',
    source: 'chakra-ui/chakra-ui',
  },
  {
    condition: (_p, d) => hasDep(d, '@chakra-ui/react'),
    skill: 'chakra-ui-refactor',
    source: 'chakra-ui/chakra-ui',
  },

  // ═════════════════════════════════════════════════════════════════
  //  Expo / React Native
  // ═════════════════════════════════════════════════════════════════
  {
    condition: (p) => p.bundler === 'expo' || p.framework === 'react-native',
    skill: 'expo-tailwind-setup',
    source: 'expo/skills',
  },
  {
    condition: (p) => p.bundler === 'expo' || p.framework === 'react-native',
    skill: 'expo-cicd-workflows',
    source: 'expo/skills',
  },
  {
    condition: (p) => p.bundler === 'expo' || p.framework === 'react-native',
    skill: 'expo-deployment',
    source: 'expo/skills',
  },
  {
    condition: (p) => p.bundler === 'expo' || p.framework === 'react-native',
    skill: 'expo-dev-client',
    source: 'expo/skills',
  },
  {
    condition: (p) => p.bundler === 'expo' || p.framework === 'react-native',
    skill: 'building-native-ui',
    source: 'expo/skills',
  },
  {
    condition: (p) => p.bundler === 'expo' || p.framework === 'react-native',
    skill: 'native-data-fetching',
    source: 'expo/skills',
  },
  {
    condition: (p) => p.bundler === 'expo' || p.framework === 'react-native',
    skill: 'expo-module',
    source: 'expo/skills',
  },
  {
    condition: (p) => p.bundler === 'expo' || p.framework === 'react-native',
    skill: 'upgrading-expo',
    source: 'expo/skills',
  },
  {
    condition: (p) => p.bundler === 'expo' || p.framework === 'react-native',
    skill: 'vercel-react-native-skills',
    source: 'vercel-labs/agent-skills',
  },
  {
    condition: (_p, d) =>
      hasDep(d, 'heroui-native') && hasDep(d, 'react-native'),
    skill: 'heroui-native',
    source: 'heroui-inc/heroui',
  },

  // ═════════════════════════════════════════════════════════════════
  //  Build / Dev tools
  // ═════════════════════════════════════════════════════════════════
  {
    condition: (p, d) => p.bundler === 'vite' || hasDep(d, 'vite'),
    skill: 'vite',
    source: 'antfu/skills',
  },
  {
    condition: (_p, d) => hasDep(d, 'vitest'),
    skill: 'vitest',
    source: 'antfu/skills',
  },
  {
    condition: (_p, d) => hasDep(d, 'tsdown'),
    skill: 'tsdown',
    source: 'antfu/skills',
  },
  {
    condition: (p) => p.monorepoTool === 'turbo' || p.existing.turbo,
    skill: 'turborepo',
    source: 'vercel/turborepo',
  },

  // ═════════════════════════════════════════════════════════════════
  //  Database / Auth
  // ═════════════════════════════════════════════════════════════════
  {
    condition: (_p, d) =>
      hasAnyDep(d, ['@supabase/supabase-js', 'supabase', 'pg', 'postgres']),
    skill: 'supabase-postgres-best-practices',
    source: 'supabase/agent-skills',
  },
  {
    condition: (_p, d) => hasDep(d, 'drizzle-orm'),
    skill: 'postgres-drizzle',
    source: 'ccheney/robust-skills',
  },
  {
    condition: (_p, d) => hasAnyDep(d, ['redis', 'ioredis']),
    skill: 'redis-best-practices',
    source: 'mindrally/skills',
  },
  {
    condition: (_p, d) => hasDep(d, 'better-auth'),
    skill: 'better-auth-best-practices',
    source: 'better-auth/skills',
  },
  {
    condition: (_p, d) => hasDep(d, 'better-auth'),
    skill: 'create-auth-skill',
    source: 'better-auth/skills',
  },

  // ═════════════════════════════════════════════════════════════════
  //  AI / SDKs
  // ═════════════════════════════════════════════════════════════════
  {
    condition: (_p, d) => hasDep(d, 'ai'),
    skill: 'ai-sdk',
    source: 'vercel/ai',
  },

  // ═════════════════════════════════════════════════════════════════
  //  Media / Specialized
  // ═════════════════════════════════════════════════════════════════
  {
    condition: (_p, d) => hasAnyDep(d, ['remotion', '@remotion/cli']),
    skill: 'remotion-best-practices',
    source: 'remotion-dev/skills',
  },
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
