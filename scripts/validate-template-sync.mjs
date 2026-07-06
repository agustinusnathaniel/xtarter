/**
 * Validates that template definitions in two locations are in sync:
 *   - apps/create-xtarter-app/src/templates/registry.ts  (TEMPLATES array)
 *   - apps/xtarter-create/package.json                   (createConfig.templates array)
 *
 * Both must contain the same set of template IDs. Mismatches indicate
 * a template was added or removed in one place but not the other.
 *
 * Exit code: 0 = synced, 1 = mismatch
 */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

// --- Read registry.ts ---
// We parse the source rather than importing it (TypeScript + path alias issues).
// This works because TEMPLATES is a const array literal with `id: '...'` strings.
const registryPath = resolve(
	root,
	'apps/create-xtarter-app/src/templates/registry.ts',
)
const registrySource = readFileSync(registryPath, 'utf-8')
const registryIds = [...registrySource.matchAll(/^\t\tid: '([\w-]+)',$/gm)].map(
	(m) => m[1],
)

if (registryIds.length === 0) {
	console.error('ERROR: Could not parse any template IDs from registry.ts')
	process.exit(1)
}

// --- Read xtarter-create/package.json ---
const pkgPath = resolve(root, 'apps/xtarter-create/package.json')
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
const pkgIds = (pkg.createConfig?.templates ?? []).map((t) => t.name)

if (pkgIds.length === 0) {
	console.error(
		'ERROR: Could not parse any template IDs from xtarter-create/package.json',
	)
	process.exit(1)
}

// --- Compare ---
const registrySet = new Set(registryIds)
const pkgSet = new Set(pkgIds)

const onlyInRegistry = registryIds.filter((id) => !pkgSet.has(id))
const onlyInPackage = pkgIds.filter((id) => !registrySet.has(id))

if (onlyInRegistry.length === 0 && onlyInPackage.length === 0) {
	console.log(`OK: ${registryIds.length} template IDs match in both locations`)
	process.exit(0)
}

if (onlyInRegistry.length > 0) {
	console.error(
		`MISSING from xtarter-create/package.json: ${onlyInRegistry.join(', ')}`,
	)
}
if (onlyInPackage.length > 0) {
	console.error(
		`MISSING from create-xtarter-app/registry.ts: ${onlyInPackage.join(', ')}`,
	)
}
console.error(
	`Registry has ${registryIds.length} templates, package.json has ${pkgIds.length}`,
)
process.exit(1)
