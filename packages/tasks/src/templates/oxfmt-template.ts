import type { ProjectProfile } from '@xtarterize/core'

export function renderOxfmtTsConfig(_profile: ProjectProfile): string {
	return `import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  ...ultracite,
  singleQuote: true,
});
`
}

export function renderOxfmtJsonConfig(_profile: ProjectProfile): string {
	const config = {
		$schema: './node_modules/oxfmt/configuration_schema.json',
		indentStyle: 'space',
		indentWidth: 2,
		lineWidth: 80,
		quotes: 'single',
	}

	return JSON.stringify(config, null, 2)
}
