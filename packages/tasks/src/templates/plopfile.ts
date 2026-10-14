import type { ProjectProfile } from '@xtarterize/core';

export const plopTemplates = {
  'component.tsx.hbs': `export interface {{pascalCase name}}Props {
  title: string
}

export function {{pascalCase name}}({ title }: {{pascalCase name}}Props) {
  return (
    <section className="{{kebabCase name}}">
      <h2>{title}</h2>
    </section>
  )
}
`,
  'component.vue.hbs': `<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<template>
  <section class="{{kebabCase name}}">
    <h2>{{ title }}</h2>
  </section>
</template>
`,
  'hook.ts.hbs': `import { useMemo } from 'react'

export function use{{pascalCase name}}() {
  return useMemo(() => ({ ready: true }), [])
}
`,
  'module.ts.hbs': `export async function {{camelCase name}}() {
  return { ok: true }
}
`,
  'page.tsx.hbs': `export default function {{pascalCase name}}Page() {
  return <main>{{titleCase name}}</main>
}
`,
  'screen.tsx.hbs': `import { Text, View } from 'react-native'

export default function {{pascalCase name}}Screen() {
  return (
    <View>
      <Text>{{titleCase name}}</Text>
    </View>
  )
}
`,
  'util.test.ts.hbs': `import { describe, expect, it } from 'vitest'
import { {{camelCase name}} } from './{{kebabCase name}}'

describe('{{camelCase name}}', () => {
  it('returns null by default', () => {
    expect({{camelCase name}}()).toBeNull()
  })
})
`,
  'util.ts.hbs': `export function {{camelCase name}}() {
  return null
}
`,
};

export type PlopTemplateKey = keyof typeof plopTemplates;

interface PlopAction {
  path: string;
  templateFile: string;
}

interface PlopGenerator {
  actions: Array<PlopAction>;
  description: string;
  name: string;
}

function action(path: string, templateFile: string): PlopAction {
  return { path, templateFile };
}

const HOOK_GENERATOR: PlopGenerator = {
  actions: [action('src/hooks/use{{pascalCase name}}.ts', 'plop/hook.ts.hbs')],
  description: 'Create a React hook',
  name: 'hook',
};

function componentGenerator(profile: ProjectProfile): PlopGenerator {
  const isVue = profile.framework === 'vue';
  const path = isVue
    ? 'src/components/{{pascalCase name}}.vue'
    : profile.framework === 'react-native'
      ? 'src/components/{{pascalCase name}}.tsx'
      : 'src/components/{{pascalCase name}}/{{pascalCase name}}.tsx';
  return {
    actions: [
      action(path, isVue ? 'plop/component.vue.hbs' : 'plop/component.tsx.hbs'),
    ],
    description: 'Create a reusable component',
    name: 'component',
  };
}

function buildGenerators(profile: ProjectProfile): Array<PlopGenerator> {
  const extension = profile.typescript ? 'ts' : 'js';
  const generators: Array<PlopGenerator> = [
    componentGenerator(profile),
    {
      actions: [
        action(`src/utils/{{kebabCase name}}.${extension}`, 'plop/util.ts.hbs'),
        action('src/utils/{{kebabCase name}}.test.ts', 'plop/util.test.ts.hbs'),
      ],
      description: 'Create a utility module',
      name: 'util',
    },
  ];

  if (profile.framework === 'node') {
    generators.push({
      actions: [
        action(
          `src/{{kebabCase name}}/index.${extension}`,
          'plop/module.ts.hbs'
        ),
      ],
      description: 'Create a Node module',
      name: 'module',
    });
  }

  if (profile.framework === 'react-native') {
    generators.push(
      {
        actions: [
          action(
            profile.router === 'expo-router'
              ? 'app/{{kebabCase name}}.tsx'
              : 'src/screens/{{pascalCase name}}Screen.tsx',
            'plop/screen.tsx.hbs'
          ),
        ],
        description: 'Create a React Native screen',
        name: 'screen',
      },
      HOOK_GENERATOR
    );
  }

  if (profile.framework === 'react') {
    generators.push(
      {
        actions: [
          action(
            profile.bundler === 'nextjs'
              ? 'app/{{kebabCase name}}/page.tsx'
              : 'src/pages/{{pascalCase name}}.tsx',
            'plop/page.tsx.hbs'
          ),
        ],
        description: 'Create an app page',
        name: 'page',
      },
      HOOK_GENERATOR
    );
  }

  return generators;
}

function renderGenerator(generator: PlopGenerator): string {
  const actions = generator.actions
    .map(
      ({ path, templateFile }) => `      {
        type: 'add',
        path: '${path}',
        templateFile: '${templateFile}',
      },`
    )
    .join('\n');

  return `  plop.setGenerator('${generator.name}', {
    description: '${generator.description}',
    prompts: [namePrompt],
    actions: [
${actions}
    ],
  })`;
}

export function getPlopTemplateFiles(
  profile: ProjectProfile
): Array<PlopTemplateKey> {
  const seen = new Set<string>();
  const files: Array<PlopTemplateKey> = [];
  for (const generator of buildGenerators(profile)) {
    for (const item of generator.actions) {
      const key = item.templateFile.replace(/^plop\//, '');
      if (!seen.has(key)) {
        seen.add(key);
        files.push(key as PlopTemplateKey);
      }
    }
  }
  return files;
}

export function renderPlopfile(profile: ProjectProfile): string {
  const generators = buildGenerators(profile).map(renderGenerator).join('\n\n');

  return `// Auto-generated by xtarterize

export default function (plop: any) {
  const namePrompt = {
    type: 'input',
    name: 'name',
    message: 'Name',
    validate: (value: string) => value.trim().length > 0 || 'A name is required',
  }

${generators}
}
`;
}
