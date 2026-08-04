/**
 * Static template catalog for the docs landing pages.
 *
 * Ownership: this list is manually maintained and mirrors the canonical
 * template registry in apps/create-xtarter-app/src/templates/registry.ts.
 * When templates are added, renamed, or removed there, update this file to
 * match. The docs app must not import across package boundaries, so the
 * records are duplicated here on purpose.
 */
export interface TemplateRecord {
	/** Stable CLI template id, e.g. `vite-tailwind` */
	id: string
	name: string
	description: string
	/** GitHub owner/repo, e.g. `agustinusnathaniel/nextarter-chakra` */
	repo: string
	/** Human-readable URL for the template repo */
	url: string
	/** Short stack chips shown on the card (first entries only) */
	stack: string[]
	/** Full feature list, mirrors the registry `features` field */
	features: string[]
}

export const TEMPLATE_CATALOG: TemplateRecord[] = [
	{
		id: 'next-chakra',
		name: 'Next.js + Chakra UI',
		description: 'Next.js with Chakra UI',
		repo: 'agustinusnathaniel/nextarter-chakra',
		url: 'https://github.com/agustinusnathaniel/nextarter-chakra',
		stack: ['Next.js 16', 'Chakra UI v3', 'Biome', 'Turborepo'],
		features: [
			'Next.js 16',
			'Chakra UI v3',
			'Biome',
			'Turborepo',
			'TypeScript',
			'Playwright',
		],
	},
	{
		id: 'next-tailwind',
		name: 'Next.js + Tailwind',
		description: 'Next.js with Tailwind CSS',
		repo: 'agustinusnathaniel/nextarter-tailwind',
		url: 'https://github.com/agustinusnathaniel/nextarter-tailwind',
		stack: ['Next.js 16', 'Tailwind CSS v4', 'Biome'],
		features: [
			'Next.js 16',
			'Tailwind CSS v4',
			'Biome',
			'TypeScript',
			'Playwright',
		],
	},
	{
		id: 'vite-chakra',
		name: 'Vite + React + Chakra',
		description: 'Vite+, TanStack Router, Chakra UI',
		repo: 'agustinusnathaniel/vite-react-chakra-starter',
		url: 'https://github.com/agustinusnathaniel/vite-react-chakra-starter',
		stack: ['Vite+ (Vite 8)', 'React 19', 'Chakra UI v3', 'TanStack Router'],
		features: [
			'Vite+ (Vite 8)',
			'React 19',
			'Chakra UI v3',
			'TanStack Router',
			'TanStack Query',
			'Biome',
			'Vitest',
		],
	},
	{
		id: 'vite-tailwind',
		name: 'Vite + React + Tailwind',
		description: 'Vite+, TanStack Router, Tailwind CSS',
		repo: 'agustinusnathaniel/vite-react-tailwind-starter',
		url: 'https://github.com/agustinusnathaniel/vite-react-tailwind-starter',
		stack: ['Vite+ (Vite 8)', 'React 19', 'Tailwind CSS v4', 'TanStack Router'],
		features: [
			'Vite+ (Vite 8)',
			'React 19',
			'Tailwind CSS v4',
			'TanStack Router',
			'TanStack Query',
			'Biome',
			'Vitest',
		],
	},
	{
		id: 'vite-hero',
		name: 'Vite + React + Hero UI',
		description: 'Vite+, TanStack Router, Hero UI',
		repo: 'agustinusnathaniel/vite-react-hero-starter',
		url: 'https://github.com/agustinusnathaniel/vite-react-hero-starter',
		stack: ['Vite+ (Vite 8)', 'React 19', 'Hero UI', 'TanStack Router'],
		features: [
			'Vite+ (Vite 8)',
			'React 19',
			'Hero UI',
			'TanStack Router',
			'Biome',
			'Vitest',
		],
	},
]
