export type TemplateProvider = 'github'

export interface TemplateConfig {
	branch: string
	description: string
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
		repo: 'agustinusnathaniel/nextarter-chakra',
		branch: 'main',
		provider: 'github',
	},
	{
		id: 'next-tailwind',
		name: 'Next.js + Tailwind',
		description: 'Next.js with Tailwind CSS',
		repo: 'agustinusnathaniel/nextarter-tailwind',
		branch: 'main',
		provider: 'github',
	},
	{
		id: 'vite-chakra',
		name: 'Vite + React + Chakra',
		description: 'Vite+, TanStack Router, Chakra UI',
		repo: 'agustinusnathaniel/vite-react-chakra-starter',
		branch: 'main',
		provider: 'github',
	},
	{
		id: 'vite-tailwind',
		name: 'Vite + React + Tailwind',
		description: 'Vite+, TanStack Router, Tailwind CSS',
		repo: 'agustinusnathaniel/vite-react-tailwind-starter',
		branch: 'main',
		provider: 'github',
	},
	{
		id: 'vite-hero',
		name: 'Vite + React + Hero UI',
		description: 'Vite+, TanStack Router, Hero UI',
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
