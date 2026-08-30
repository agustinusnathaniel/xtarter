export type TemplateProvider = 'github';

export interface TemplateConfig {
  branch: string;
  description: string;
  features: Array<string>;
  id: string;
  name: string;
  path?: string; // Optional subdirectory in repo
  provider: TemplateProvider;
  repo: string;
}

// IMPORTANT: When adding or removing templates here, also update the
// matching entry in apps/xtarter-create/package.json (createConfig.templates).
export const TEMPLATES: Array<TemplateConfig> = [
  {
    branch: 'main',
    description: 'Next.js with Chakra UI',
    features: [
      'Next.js 16',
      'Chakra UI v3',
      'Biome',
      'Turborepo',
      'TypeScript',
      'Playwright',
    ],
    id: 'next-chakra',
    name: 'Next.js + Chakra UI',
    provider: 'github',
    repo: 'agustinusnathaniel/nextarter-chakra',
  },
  {
    branch: 'main',
    description: 'Next.js with Tailwind CSS',
    features: [
      'Next.js 16',
      'Tailwind CSS v4',
      'Biome',
      'TypeScript',
      'Playwright',
    ],
    id: 'next-tailwind',
    name: 'Next.js + Tailwind',
    provider: 'github',
    repo: 'agustinusnathaniel/nextarter-tailwind',
  },
  {
    branch: 'main',
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
    id: 'vite-chakra',
    name: 'Vite + React + Chakra',
    provider: 'github',
    repo: 'agustinusnathaniel/vite-react-chakra-starter',
  },
  {
    branch: 'main',
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
    id: 'vite-tailwind',
    name: 'Vite + React + Tailwind',
    provider: 'github',
    repo: 'agustinusnathaniel/vite-react-tailwind-starter',
  },
  {
    branch: 'main',
    description: 'Vite+, TanStack Router, Hero UI',
    features: [
      'Vite+ (Vite 8)',
      'React 19',
      'Hero UI',
      'TanStack Router',
      'Biome',
      'Vitest',
    ],
    id: 'vite-hero',
    name: 'Vite + React + Hero UI',
    provider: 'github',
    repo: 'agustinusnathaniel/vite-react-hero-starter',
  },
];

export function getTemplateById(id: string): TemplateConfig | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export function getTemplateChoices(): Array<{ value: string; label: string }> {
  return TEMPLATES.map((t) => ({
    label: `${t.name} - ${t.description}`,
    value: t.id,
  }));
}
