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
  description: string;
  /** Full feature list, mirrors the registry `features` field */
  features: Array<string>;
  /** Stable CLI template id, e.g. `vite-tailwind` */
  id: string;
  name: string;
  /** GitHub owner/repo, e.g. `agustinusnathaniel/nextarter-chakra` */
  repo: string;
  /** Short stack chips shown on the card (first entries only) */
  stack: Array<string>;
  /** Human-readable URL for the template repo */
  url: string;
}

export const TEMPLATE_CATALOG: Array<TemplateRecord> = [
  {
    description:
      'Next.js 16 prewired with Chakra UI v3, Biome, Playwright, and Turborepo.',
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
    repo: 'agustinusnathaniel/nextarter-chakra',
    stack: ['Next.js 16', 'Chakra UI v3', 'Biome', 'Turborepo'],
    url: 'https://github.com/agustinusnathaniel/nextarter-chakra',
  },
  {
    description:
      'Next.js 16 with Tailwind CSS v4 and Biome, tuned for fast iteration.',
    features: [
      'Next.js 16',
      'Tailwind CSS v4',
      'Biome',
      'TypeScript',
      'Playwright',
    ],
    id: 'next-tailwind',
    name: 'Next.js + Tailwind',
    repo: 'agustinusnathaniel/nextarter-tailwind',
    stack: ['Next.js 16', 'Tailwind CSS v4', 'Biome'],
    url: 'https://github.com/agustinusnathaniel/nextarter-tailwind',
  },
  {
    description:
      'Vite+ and React 19 on TanStack Router, styled with Chakra UI v3, tested with Vitest.',
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
    repo: 'agustinusnathaniel/vite-react-chakra-starter',
    stack: ['Vite+ (Vite 8)', 'React 19', 'Chakra UI v3', 'TanStack Router'],
    url: 'https://github.com/agustinusnathaniel/vite-react-chakra-starter',
  },
  {
    description:
      'Vite+ and React 19 with Tailwind CSS v4 and TanStack Query caching built in.',
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
    repo: 'agustinusnathaniel/vite-react-tailwind-starter',
    stack: ['Vite+ (Vite 8)', 'React 19', 'Tailwind CSS v4', 'TanStack Router'],
    url: 'https://github.com/agustinusnathaniel/vite-react-tailwind-starter',
  },
  {
    description:
      'Vite+ and React 19 with HeroUI components wired through TanStack Router.',
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
    repo: 'agustinusnathaniel/vite-react-hero-starter',
    stack: ['Vite+ (Vite 8)', 'React 19', 'Hero UI', 'TanStack Router'],
    url: 'https://github.com/agustinusnathaniel/vite-react-hero-starter',
  },
];
