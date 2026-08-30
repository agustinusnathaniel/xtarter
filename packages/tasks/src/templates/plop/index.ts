import componentTsx from './component.tsx.js';
import componentVue from './component.vue.js';
import hookTs from './hook.ts.js';
import moduleTs from './module.ts.js';
import pageTsx from './page.tsx.js';
import screenTsx from './screen.tsx.js';
import utilTestTs from './util.test.ts.js';
import utilTs from './util.ts.js';

export const plopTemplates = {
  'component.tsx.hbs': componentTsx,
  'component.vue.hbs': componentVue,
  'hook.ts.hbs': hookTs,
  'module.ts.hbs': moduleTs,
  'page.tsx.hbs': pageTsx,
  'screen.tsx.hbs': screenTsx,
  'util.test.ts.hbs': utilTestTs,
  'util.ts.hbs': utilTs,
};

export type PlopTemplateKey = keyof typeof plopTemplates;
