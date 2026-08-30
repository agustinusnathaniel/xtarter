import type { ProjectProfile } from '@xtarterize/core';

function getEntryFiles(profile: ProjectProfile): Array<string> {
  if (profile.bundler === 'vite') {
    return profile.typescript
      ? ['src/main.tsx', 'src/main.ts']
      : ['src/main.jsx', 'src/main.js'];
  }
  if (profile.bundler === 'nextjs') {
    return ['app/**/*.{ts,tsx}', 'pages/**/*.{ts,tsx}'];
  }
  return profile.typescript ? ['src/index.ts'] : ['src/index.js'];
}

function getProjectGlob(profile: ProjectProfile): Array<string> {
  return profile.typescript
    ? ['src/**/*.{ts,tsx,js,jsx,css,scss}']
    : ['src/**/*.{js,jsx,css,scss}'];
}

export function renderKnipConfig(
  profile: ProjectProfile,
  format: 'json' | 'ts' | 'js' = 'ts'
): string {
  const entry = getEntryFiles(profile);
  const project = getProjectGlob(profile);

  if (format === 'json') {
    return `${JSON.stringify({ entry, project }, null, 2)}\n`;
  }

  if (format === 'js') {
    return `// @ts-check
/** @type {import('knip').KnipConfig} */
const config = {
  entry: ${JSON.stringify(entry)},
  project: ${JSON.stringify(project)},
};

export default config;
`;
  }

  return `import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: ${JSON.stringify(entry)},
  project: ${JSON.stringify(project)},
};

export default config;
`;
}
