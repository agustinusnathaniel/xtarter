import type { ProjectProfile } from '@xtarterize/core';

export function renderOxfmtTsConfig(_profile: ProjectProfile): string {
  return `import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  ...ultracite,
  singleQuote: true,
});
`;
}
