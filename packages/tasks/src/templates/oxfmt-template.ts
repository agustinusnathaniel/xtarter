import { oxfmtLayer, sharedOxfmtEntry } from '@xtarter/config';
import type { ConfigPropertyValue } from '@xtarterize/patchers';

import type { LintConfigForm } from '@/lint/config-form.js';

function renderLayerEntries(): string {
  return Object.entries(oxfmtLayer())
    .map(
      ([key, value]) =>
        `\n  ${key}: ${JSON.stringify(value, null, 2).replaceAll('\n', '\n  ')},`
    )
    .join('');
}

/** The full config: Ultracite's options plus the xtarter layer written inline. */
export function renderOxfmtTsConfig(): string {
  const overrides = renderLayerEntries();
  return `import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  ...ultracite,${overrides}
});
`;
}

/** A short config spreading `@xtarter/config`'s Oxfmt options. */
export function renderManagedOxfmtTsConfig(): string {
  return `import { defineConfig } from "oxfmt";
import xtarter from "${sharedOxfmtEntry}";

export default defineConfig({
  ...xtarter,
});
`;
}

/** A `vite.config` block value plus the default imports it references. */
export type VitePlusBlock = ConfigPropertyValue;

/**
 * The `fmt` block of a Vite+ `vite.config`, which is where `vp fmt` and
 * `vp check` read Oxfmt options. Bindings carry a prefix so they cannot clash
 * with the config's own imports.
 */
export function vitePlusFmtBlock(form: LintConfigForm): VitePlusBlock {
  if (form === 'managed') {
    return {
      expression: '{ ...xtarterFmt }',
      imports: [{ from: sharedOxfmtEntry, local: 'xtarterFmt' }],
    };
  }
  return {
    expression: `{\n  ...ultraciteFmt,${renderLayerEntries()}\n}`,
    imports: [{ from: 'ultracite/oxfmt', local: 'ultraciteFmt' }],
  };
}
