#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

// --- helpers ---

function parseCatalog(yaml) {
	/** @type {Record<string, string>} */
	const catalog = {}
	let inCatalog = false
	for (const line of yaml.split('\n')) {
		if (line.startsWith('catalog:')) {
			inCatalog = true
			continue
		}
		if (inCatalog) {
			if (line.trim() === '' || !line.startsWith('  ')) break
			const match = line.match(/^ {2}['"]?([^'":]+)['"]?:\s*(.+)$/)
			if (match) {
				catalog[match[1]] = match[2].trim().replace(/^["']|["']$/g, '')
			}
		}
	}
	return catalog
}

/**
 * Compare two semver versions numerically (ignores pre-release tags).
 * Returns negative if a < b, positive if a > b, 0 if equal.
 */
function compareVersions(a, b) {
	const parse = (v) =>
		v
			.replace(/-.*$/, '')
			.split('.')
			.map((n) => Number.parseInt(n, 10))
	const [aM, am, ap] = parse(a)
	const [bM, bm, bp] = parse(b)
	if (aM !== bM) return aM - bM
	if (am !== bm) return am - bm
	return ap - bp
}

/**
 * Check if `inlined` (exact version) satisfies the `range` from the catalog.
 * Handles `^` caret ranges and exact matches.
 */
function satisfies(inlined, range) {
	if (range.startsWith('^')) {
		const minVer = range.slice(1)
		// Caret: must be >= min version with the same major
		const inMajor = inlined.split('.')[0]
		const minMajor = minVer.split('.')[0]
		if (inMajor !== minMajor) return false
		return compareVersions(inlined, minVer) >= 0
	}
	return inlined === range
}

// --- main ---

const apps = ['apps/xtarterize', 'apps/create-xtarter-app']

// Load the catalog from pnpm-workspace.yaml (canonical source of truth)
const workspaceYaml = readFileSync(
	resolve(root, 'pnpm-workspace.yaml'),
	'utf-8',
)
const catalog = parseCatalog(workspaceYaml)

let hasErrors = false

for (const appPath of apps) {
	const pkg = JSON.parse(
		readFileSync(resolve(root, appPath, 'package.json'), 'utf-8'),
	)
	const inlined = pkg.inlinedDependencies
	if (!inlined) continue

	const allDeps = { ...pkg.dependencies, ...pkg.devDependencies }

	for (const [name, version] of Object.entries(inlined)) {
		// Resolve catalog: references in the package's own deps
		let depVersion = allDeps[name]
		if (depVersion === 'catalog:') {
			depVersion = catalog[name] ?? depVersion
		}

		// Check against the pnpm catalog first (covers transitive deps)
		if (catalog[name]) {
			if (!satisfies(version, catalog[name])) {
				console.error(
					`MISMATCH: ${appPath} inlinedDependencies.${name} = ${version}, but catalog specifies ${catalog[name]}`,
				)
				hasErrors = true
			}
		}
		// Fall back to the app's own dependencies if not in catalog
		else if (depVersion) {
			// Strip range prefix from dep version for comparison
			const depExact = depVersion.replace(/^[~^]/, '')
			if (depExact !== version) {
				console.error(
					`MISMATCH: ${appPath} inlinedDependencies.${name} = ${version}, but dependencies.${name} = ${depVersion}`,
				)
				hasErrors = true
			}
		}
		// Not in catalog or direct deps — deep transitive, skip
	}
}

if (hasErrors) {
	process.exit(1)
}
console.log('All inlinedDependencies are up to date.')
