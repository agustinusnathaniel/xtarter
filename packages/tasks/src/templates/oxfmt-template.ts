import { oxfmtLayer, sharedOxfmtEntry } from '@xtarter/config';

/** The full config: Ultracite's options plus the xtarter layer written inline. */
export function renderOxfmtTsConfig(): string {
  const overrides = Object.entries(oxfmtLayer())
    .map(
      ([key, value]) =>
        `\n  ${key}: ${JSON.stringify(value, null, 2).replaceAll('\n', '\n  ')},`
    )
    .join('');
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
