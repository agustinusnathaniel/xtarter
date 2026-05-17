import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { compileFromFile } from 'json-schema-to-typescript'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const schemaPath = path.resolve(
	__dirname,
	'../node_modules/@biomejs/biome/configuration_schema.json',
)
const outputPath = path.resolve(
	__dirname,
	'../src/templates/_biome-config.generated.d.ts',
)

const ts = await compileFromFile(schemaPath, {
	additionalProperties: false,
	style: {
		semi: false,
		singleQuote: true,
	},
	bannerComment:
		'// Auto-generated from @biomejs/biome configuration_schema.json.\n// DO NOT EDIT BY HAND.',
})

await writeFile(outputPath, ts)
console.log(`Generated ${path.relative(process.cwd(), outputPath)}`)
