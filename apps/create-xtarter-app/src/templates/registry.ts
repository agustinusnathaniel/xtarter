export type TemplateProvider = 'github'

export interface TemplateConfig {
	branch: string
	description: string
	features: string[]
	id: string
	name: string
	path?: string // Optional subdirectory in repo
	provider: TemplateProvider
	repo: string
}

export const TEMPLATES: TemplateConfig[] = [
	{
		id: 'next-chakra',
		name: 'Next.js + Chakra UI',
		description: 'Next.js with Chakra UI',
		features: [
			'Next.js 16',
			'Chakra UI v3',
			'Biome',
			'Turborepo',
			'TypeScript',
			'Playwright',
		],
		repo: 'agustinusnathaniel/nextarter-chakra',
		branch: 'main',
		provider: 'github',
	},
	{
		id: 'next-tailwind',
		name: 'Next.js + Tailwind',
		description: 'Next.js with Tailwind CSS',
		features: [
			'Next.js 16',
			'Tailwind CSS v4',
			'Biome',
			'TypeScript',
			'Playwright',
		],
		repo: 'agustinusnathaniel/nextarter-tailwind',
		branch: 'main',
		provider: 'github',
	},
	{
		id: 'vite-chakra',
		name: 'Vite + React + Chakra',
		description: 'Vite+, TanStack Router, Chakra UI',
		features: [
			'Vite+ (Vite 8)',
			'React 19',
			'Chakra UI v3',
			'TanStack Router',
			'TanStack Query',
			'Biome',
			'Vitest',
		],
		repo: 'agustinusnathaniel/vite-react-chakra-starter',
		branch: 'main',
		provider: 'github',
	},
	{
		id: 'vite-tailwind',
		name: 'Vite + React + Tailwind',
		description: 'Vite+, TanStack Router, Tailwind CSS',
		features: [
			'Vite+ (Vite 8)',
			'React 19',
			'Tailwind CSS v4',
			'TanStack Router',
			'TanStack Query',
			'Biome',
			'Vitest',
		],
		repo: 'agustinusnathaniel/vite-react-tailwind-starter',
		branch: 'main',
		provider: 'github',
	},
	{
		id: 'vite-hero',
		name: 'Vite + React + Hero UI',
		description: 'Vite+, TanStack Router, Hero UI',
		features: [
			'Vite+ (Vite 8)',
			'React 19',
			'Hero UI',
			'TanStack Router',
			'Biome',
			'Vitest',
		],
		repo: 'agustinusnathaniel/vite-react-hero-starter',
		branch: 'main',
		provider: 'github',
	},
]

export function getTemplateById(id: string): TemplateConfig | undefined {
	return TEMPLATES.find((t) => t.id === id)
}

export function getTemplateChoices(): { value: string; label: string }[] {
	return TEMPLATES.map((t) => ({
		value: t.id,
		label: `${t.name} - ${t.description}`,
	}))
}
