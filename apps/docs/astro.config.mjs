import starlight from '@astrojs/starlight';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import astroMermaid from 'astro-mermaid';
import starlightAutoSidebar from 'starlight-auto-sidebar';
import starlightBlog from 'starlight-blog';
import starlightLinksValidator from 'starlight-links-validator';
import starlightLlmsTxt from 'starlight-llms-txt';
import starlightPageActions from 'starlight-page-actions';
import starlightSidebarSwipe from 'starlight-sidebar-swipe';

import {
  buildFounderPersonJsonLd,
  buildOrganizationJsonLd,
  buildSoftwareApplicationJsonLd,
  buildWebSiteJsonLd,
  SITE_URL,
  serializeJsonLd,
} from '@/lib/jsonld.ts';

const JSON_LD = serializeJsonLd({
  '@context': 'https://schema.org',
  '@graph': [
    buildWebSiteJsonLd(),
    buildOrganizationJsonLd(),
    buildFounderPersonJsonLd(),
    buildSoftwareApplicationJsonLd(
      'xtarterize',
      'Conformance CLI that brings existing JavaScript/TypeScript projects up to a production-grade baseline (linting, strict TypeScript, CI, editor configs) with dry-run previews and approval before writing.',
      `${SITE_URL}/xtarterize/`,
      'https://github.com/agustinusnathaniel/xtarterize'
    ),
    buildSoftwareApplicationJsonLd(
      'create-xtarter-app',
      'Scaffolding CLI that creates new JavaScript/TypeScript projects from five production-grade starter templates with Biome, strict TypeScript, CI, editor configs, and agent skills preconfigured.',
      `${SITE_URL}/create-xtarter-app/`,
      'https://github.com/agustinusnathaniel/xtarterize'
    ),
  ],
});

const LLMS_DETAILS = `**When to use xtarter:**
- Scaffold new JS/TS projects with \`pnpm create xtarter-app\` (or \`npx create-xtarter-app@latest\`) — create-xtarter-app templates include Biome, strict TypeScript, CI, and editor configs.
- Bring existing repos to standard with \`pnpx xtarterize@latest\` — tasks for linting/typecheck/CI/editor, idempotent with dry-run preview before writing.
- Use \`check\` / \`dryRun\` to preview without writing; tasks are idempotent so running twice is safe.
- When NOT to use: not a runtime library/framework; JavaScript/TypeScript projects only.
- Full instructions in [xtarter agent instructions](${SITE_URL}/agents.md); discover routes via [sitemap](${SITE_URL}/sitemap-index.xml) and per-page \`.md\` twins (e.g. \`/xtarterize/guide/cli/overview.md\`).

For dedicated usage guidance, installation instructions, and machine-readable resource links, read [xtarter agent instructions](${SITE_URL}/agents.md).`;

const LLMS_OPTIONAL_LINKS = [
  {
    description: 'The machine-readable list of published routes.',
    label: 'XML sitemap',
    url: `${SITE_URL}/sitemap-index.xml`,
  },
  {
    label: 'About this project',
    url: `${SITE_URL}/about/`,
  },
  {
    label: 'Contact channels',
    url: `${SITE_URL}/contact/`,
  },
  {
    label: 'Privacy practices',
    url: `${SITE_URL}/privacy/`,
  },
  {
    description:
      'Usage guidance and machine-readable resource links for agents.',
    label: 'Agent instructions',
    url: `${SITE_URL}/agents.md`,
  },
  {
    label: 'GitHub repository',
    url: 'https://github.com/agustinusnathaniel/xtarterize',
  },
  {
    label: 'xtarterize on npm',
    url: 'https://www.npmjs.com/package/xtarterize',
  },
  {
    label: 'create-xtarter-app on npm',
    url: 'https://www.npmjs.com/package/create-xtarter-app',
  },
];

export default defineConfig({
  integrations: [
    astroMermaid(),
    starlight({
      components: {
        Head: './src/components/StarlightHead.astro',
        Hero: './src/components/LandingHero.astro',
      },
      // favicon: '/favicon.svg',
      customCss: ['./src/styles/global.css'],
      description:
        'Production-grade starter templates and conformance tooling for JavaScript/TypeScript projects.',
      head: [
        {
          attrs: {
            content:
              'xtarter - Production-grade JS/TS starters & conformance tooling',
            property: 'og:title',
          },
          tag: 'meta',
        },
        {
          attrs: {
            content:
              'Scaffold new projects or bring conformance to existing ones. Biome, TypeScript strict, CI, editor configs - ready in seconds.',
            property: 'og:description',
          },
          tag: 'meta',
        },
        {
          attrs: {
            content:
              'https://og.sznm.dev/api/generate?heading=xtarter&text=Production-grade%20JS/TS%20starters%20%26%20conformance%20tooling&template=color',
            property: 'og:image',
          },
          tag: 'meta',
        },
        {
          attrs: { content: 'https://xtarter.sznm.dev', property: 'og:url' },
          tag: 'meta',
        },
        {
          attrs: { content: 'summary_large_image', name: 'twitter:card' },
          tag: 'meta',
        },
        {
          attrs: {
            href: '/favicon.svg',
            rel: 'icon',
            type: 'image/svg+xml',
          },
          tag: 'link',
        },
        {
          attrs: { type: 'application/ld+json' },
          content: JSON_LD,
          tag: 'script',
        },
      ],
      logo: {
        dark: './src/assets/logo-dark.svg',
        light: './src/assets/logo-light.svg',
        replacesTitle: true,
      },
      plugins: [
        starlightLinksValidator({
          exclude: [
            '/about/**',
            '/contact/**',
            '/privacy/**',
            '/sitemap-index.xml',
          ],
        }),
        starlightLlmsTxt({
          description:
            'Production-grade starter templates and conformance tooling for JavaScript/TypeScript projects. Includes xtarterize (conformance CLI) and create-xtarter-app (scaffolding CLI).',
          details: LLMS_DETAILS,
          optionalLinks: LLMS_OPTIONAL_LINKS,
          projectName: 'xtarter',
        }),
        starlightPageActions({
          prompt:
            'You are an expert on xtarterize and create-xtarter-app. Read {url} and help me understand how to use this tool effectively.',
          share: true,
        }),
        starlightBlog(),
        starlightAutoSidebar(),
        starlightSidebarSwipe(),
      ],
      sidebar: [
        {
          label: 'Home',
          link: '/',
        },
        {
          collapsed: false,
          items: [
            {
              label: 'Overview',
              link: '/xtarterize/',
            },
            {
              items: [
                { autogenerate: { directory: 'xtarterize/getting-started' } },
              ],
              label: 'Getting Started',
            },
            {
              collapsed: false,
              items: [
                { label: 'Overview', link: '/xtarterize/guide/cli/overview/' },
                { label: 'Query', link: '/xtarterize/guide/cli/query/' },
              ],
              label: 'CLI Reference',
            },
            {
              collapsed: false,
              items: [
                {
                  autogenerate: {
                    directory: 'xtarterize/guide/tasks',
                  },
                },
              ],
              label: 'Conformance Tasks',
            },
            {
              label: 'Configuration',
              link: '/xtarterize/guide/config/overview/',
            },
            {
              label: 'AI Agent Skills',
              link: '/xtarterize/guide/agent-skills/',
            },
            {
              label: 'Changelog',
              link: '/xtarterize/changelog/',
            },
            {
              collapsed: true,
              items: [
                {
                  label: 'Contributors',
                  link: '/xtarterize/contributing/contributors/',
                },
                {
                  label: 'Architecture',
                  link: '/xtarterize/contributing/architecture/overview/',
                },
                {
                  label: 'Project Detection',
                  link: '/xtarterize/contributing/core/detect/',
                },
                {
                  label: 'Preflight & Diagnostics',
                  link: '/xtarterize/contributing/core/preflight/',
                },
                {
                  label: 'Task Resolution',
                  link: '/xtarterize/contributing/core/resolve/',
                },
                {
                  label: 'Apply Engine',
                  link: '/xtarterize/contributing/core/apply/',
                },
                {
                  items: [
                    {
                      autogenerate: {
                        directory: 'xtarterize/contributing/tasks',
                      },
                    },
                  ],
                  label: 'Tasks',
                },
                {
                  items: [
                    {
                      autogenerate: {
                        directory: 'xtarterize/contributing/patchers',
                      },
                    },
                  ],
                  label: 'Patchers',
                },
              ],
              label: 'Contributing',
            },
          ],
          label: 'xtarterize',
        },
        {
          collapsed: true,
          items: [
            {
              label: 'Overview',
              link: '/create-xtarter-app/',
            },
            {
              items: [
                {
                  autogenerate: {
                    directory: 'create-xtarter-app/getting-started',
                  },
                },
              ],
              label: 'Getting Started',
            },
            {
              label: 'CLI Reference',
              link: '/create-xtarter-app/guide/cli/',
            },
            {
              label: 'Templates',
              link: '/create-xtarter-app/guide/templates/',
            },
            {
              label: 'Vite+ Org Templates',
              link: '/create-xtarter-app/guide/org-templates/',
            },
            {
              label: 'AI Agent Skills',
              link: '/create-xtarter-app/guide/agent-skills/',
            },
          ],
          label: 'create-xtarter-app',
        },
      ],
      social: [
        {
          href: 'https://github.com/agustinusnathaniel/xtarterize',
          icon: 'github',
          label: 'GitHub',
        },
      ],
      title: 'xtarter',
    }),
  ],
  site: SITE_URL,
  vite: {
    plugins: [tailwindcss()],
  },
});
