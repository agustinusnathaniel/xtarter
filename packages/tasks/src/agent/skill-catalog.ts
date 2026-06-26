import type { ProjectProfile } from '@xtarterize/core'

export interface SkillEntry {
	source: string
	skill: string
}

export interface SkillDefinition {
	source: string
	skill: string
	condition: (profile: ProjectProfile, deps: Record<string, string>) => boolean
}

function hasDep(deps: Record<string, string>, dep: string): boolean {
	return dep in deps
}

function hasAnyDep(deps: Record<string, string>, depNames: string[]): boolean {
	return depNames.some((dep) => hasDep(deps, dep))
}

/**
 * Declarative catalog of all installable skills, grouped by category.
 *
 * To add a new skill, append an entry with its source, skill name, and a
 * `condition` that returns `true` when the project stack matches.
 */
export const SKILL_CATALOG: SkillDefinition[] = [
	// ═════════════════════════════════════════════════════════════════
	//  General (always applicable)
	// ═════════════════════════════════════════════════════════════════
	{
		source: 'vercel-labs/opensrc',
		skill: 'opensrc',
		condition: () => true,
	},
	{
		source: 'mattpocock/skills',
		skill: 'grill-me',
		condition: () => true,
	},
	{
		source: 'mattpocock/skills',
		skill: 'handoff',
		condition: () => true,
	},
	{
		source: 'mattpocock/skills',
		skill: 'improve-codebase-architecture',
		condition: () => true,
	},
	{
		source: 'mattpocock/skills',
		skill: 'writing-great-skills',
		condition: () => true,
	},

	// ═════════════════════════════════════════════════════════════════
	//  Frontend / UI
	// ═════════════════════════════════════════════════════════════════
	{
		source: 'anthropics/skills',
		skill: 'frontend-design',
		condition: (p) => p.runtime === 'browser' || p.runtime === 'edge',
	},
	{
		source: 'vercel-labs/agent-skills',
		skill: 'web-design-guidelines',
		condition: (p) => p.runtime === 'browser' || p.runtime === 'edge',
	},
	{
		source: 'ibelick/ui-skills',
		skill: 'baseline-ui',
		condition: (p) => p.runtime === 'browser' || p.runtime === 'edge',
	},
	{
		source: 'ibelick/ui-skills',
		skill: 'fixing-accessibility',
		condition: (p) => p.runtime === 'browser' || p.runtime === 'edge',
	},
	{
		source: 'ibelick/ui-skills',
		skill: 'fixing-metadata',
		condition: (p) => p.runtime === 'browser' || p.runtime === 'edge',
	},
	{
		source: 'ibelick/ui-skills',
		skill: 'fixing-motion-performance',
		condition: (p) => p.runtime === 'browser' || p.runtime === 'edge',
	},

	// ═════════════════════════════════════════════════════════════════
	//  React
	// ═════════════════════════════════════════════════════════════════
	{
		source: 'vercel-labs/agent-skills',
		skill: 'vercel-react-best-practices',
		condition: (p) => p.framework === 'react',
	},
	{
		source: 'vercel-labs/agent-skills',
		skill: 'vercel-composition-patterns',
		condition: (p) => p.framework === 'react',
	},
	{
		source: 'softaworks/agent-toolkit',
		skill: 'react-dev',
		condition: (p) => p.framework === 'react',
	},
	{
		source: 'softaworks/agent-toolkit',
		skill: 'react-useeffect',
		condition: (p) => p.framework === 'react',
	},

	// ═════════════════════════════════════════════════════════════════
	//  Next.js
	// ═════════════════════════════════════════════════════════════════
	{
		source: 'vercel/next.js',
		skill: 'next-dev-loop',
		condition: (p) => p.bundler === 'nextjs',
	},
	{
		source: 'vercel/next.js',
		skill: 'next-cache-components-optimizer',
		condition: (p) => p.bundler === 'nextjs',
	},
	{
		source: 'vercel/next.js',
		skill: 'next-cache-components-adoption',
		condition: (p) => p.bundler === 'nextjs',
	},

	// ═════════════════════════════════════════════════════════════════
	//  Vue / Nuxt
	// ═════════════════════════════════════════════════════════════════
	{
		source: 'antfu/skills',
		skill: 'vue',
		condition: (p) => p.framework === 'vue',
	},
	{
		source: 'antfu/skills',
		skill: 'vue-best-practices',
		condition: (p) => p.framework === 'vue',
	},
	{
		source: 'antfu/skills',
		skill: 'nuxt',
		condition: (_p, d) => hasDep(d, 'nuxt'),
	},

	// ═════════════════════════════════════════════════════════════════
	//  Shadcn
	// ═════════════════════════════════════════════════════════════════
	{
		source: 'shadcn/ui',
		skill: 'shadcn',
		condition: (_p, d) =>
			hasAnyDep(d, ['shadcn', 'shadcn-ui', '@shadcn/ui', '@shadcn-ui/cli']),
	},

	// ═════════════════════════════════════════════════════════════════
	//  Ultracite
	// ═════════════════════════════════════════════════════════════════
	{
		source: 'haydenbleasel/ultracite',
		skill: 'ultracite',
		condition: (_p, d) => hasDep(d, 'ultracite'),
	},

	// ═════════════════════════════════════════════════════════════════
	//  Component Libraries
	// ═════════════════════════════════════════════════════════════════
	{
		source: 'ant-design/ant-design-cli',
		skill: 'antd',
		condition: (_p, d) => hasDep(d, 'antd'),
	},
	{
		source: 'heroui-inc/heroui',
		skill: 'heroui-react',
		condition: (_p, d) => hasDep(d, '@heroui/react'),
	},
	{
		source: 'chakra-ui/chakra-ui',
		skill: 'chakra-ui-builder',
		condition: (_p, d) => hasDep(d, '@chakra-ui/react'),
	},
	{
		source: 'chakra-ui/chakra-ui',
		skill: 'chakra-ui-refactor',
		condition: (_p, d) => hasDep(d, '@chakra-ui/react'),
	},

	// ═════════════════════════════════════════════════════════════════
	//  Expo / React Native
	// ═════════════════════════════════════════════════════════════════
	{
		source: 'expo/skills',
		skill: 'expo-tailwind-setup',
		condition: (p) => p.bundler === 'expo' || p.framework === 'react-native',
	},
	{
		source: 'expo/skills',
		skill: 'expo-cicd-workflows',
		condition: (p) => p.bundler === 'expo' || p.framework === 'react-native',
	},
	{
		source: 'expo/skills',
		skill: 'expo-deployment',
		condition: (p) => p.bundler === 'expo' || p.framework === 'react-native',
	},
	{
		source: 'expo/skills',
		skill: 'expo-dev-client',
		condition: (p) => p.bundler === 'expo' || p.framework === 'react-native',
	},
	{
		source: 'expo/skills',
		skill: 'building-native-ui',
		condition: (p) => p.bundler === 'expo' || p.framework === 'react-native',
	},
	{
		source: 'expo/skills',
		skill: 'native-data-fetching',
		condition: (p) => p.bundler === 'expo' || p.framework === 'react-native',
	},
	{
		source: 'expo/skills',
		skill: 'expo-module',
		condition: (p) => p.bundler === 'expo' || p.framework === 'react-native',
	},
	{
		source: 'expo/skills',
		skill: 'upgrading-expo',
		condition: (p) => p.bundler === 'expo' || p.framework === 'react-native',
	},
	{
		source: 'vercel-labs/agent-skills',
		skill: 'vercel-react-native-skills',
		condition: (p) => p.bundler === 'expo' || p.framework === 'react-native',
	},
	{
		source: 'heroui-inc/heroui',
		skill: 'heroui-native',
		condition: (_p, d) =>
			hasDep(d, 'heroui-native') && hasDep(d, 'react-native'),
	},

	// ═════════════════════════════════════════════════════════════════
	//  Build / Dev tools
	// ═════════════════════════════════════════════════════════════════
	{
		source: 'antfu/skills',
		skill: 'vite',
		condition: (p, d) => p.bundler === 'vite' || hasDep(d, 'vite'),
	},
	{
		source: 'antfu/skills',
		skill: 'vitest',
		condition: (_p, d) => hasDep(d, 'vitest'),
	},
	{
		source: 'antfu/skills',
		skill: 'tsdown',
		condition: (_p, d) => hasDep(d, 'tsdown'),
	},
	{
		source: 'vercel/turborepo',
		skill: 'turborepo',
		condition: (p) => p.monorepoTool === 'turbo' || p.existing.turbo,
	},

	// ═════════════════════════════════════════════════════════════════
	//  Database / Auth
	// ═════════════════════════════════════════════════════════════════
	{
		source: 'supabase/agent-skills',
		skill: 'supabase-postgres-best-practices',
		condition: (_p, d) =>
			hasAnyDep(d, ['@supabase/supabase-js', 'supabase', 'pg', 'postgres']),
	},
	{
		source: 'ccheney/robust-skills',
		skill: 'postgres-drizzle',
		condition: (_p, d) => hasDep(d, 'drizzle-orm'),
	},
	{
		source: 'mindrally/skills',
		skill: 'redis-best-practices',
		condition: (_p, d) => hasAnyDep(d, ['redis', 'ioredis']),
	},
	{
		source: 'better-auth/skills',
		skill: 'better-auth-best-practices',
		condition: (_p, d) => hasDep(d, 'better-auth'),
	},
	{
		source: 'better-auth/skills',
		skill: 'create-auth-skill',
		condition: (_p, d) => hasDep(d, 'better-auth'),
	},

	// ═════════════════════════════════════════════════════════════════
	//  AI / SDKs
	// ═════════════════════════════════════════════════════════════════
	{
		source: 'vercel/ai',
		skill: 'ai-sdk',
		condition: (_p, d) => hasDep(d, 'ai'),
	},

	// ═════════════════════════════════════════════════════════════════
	//  Media / Specialized
	// ═════════════════════════════════════════════════════════════════
	{
		source: 'remotion-dev/skills',
		skill: 'remotion-best-practices',
		condition: (_p, d) => hasAnyDep(d, ['remotion', '@remotion/cli']),
	},
]

export function getSkillsToInstall(
	profile: ProjectProfile,
	deps: Record<string, string>,
): SkillEntry[] {
	return SKILL_CATALOG.filter((s) => s.condition(profile, deps)).map((s) => ({
		source: s.source,
		skill: s.skill,
	}))
}
