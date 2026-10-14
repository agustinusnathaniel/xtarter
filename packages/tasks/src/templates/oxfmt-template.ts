export function renderOxfmtTsConfig(): string {
  return `import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  ...ultracite,
  singleQuote: true,
});
`;
}
