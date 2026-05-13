import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
let failed = false

function checkBin(pkgDir) {
	const pkg = JSON.parse(
		readFileSync(resolve(root, '..', pkgDir, 'package.json'), 'utf8'),
	)
	if (!pkg.bin) return
	for (const [name, relPath] of Object.entries(pkg.bin)) {
		const fullPath = resolve(root, '..', pkgDir, relPath)
		if (!existsSync(fullPath)) {
			console.log(`SKIP ${name} -> ${relPath} (not built yet)`)
			continue
		}
		const content = readFileSync(fullPath, 'utf8')
		if (!content.startsWith('#!/usr/bin/env node')) {
			console.error(`FAIL ${name} -> ${relPath} is missing shebang!`)
			failed = true
		} else {
			console.log(`PASS ${name} -> ${relPath}`)
		}
	}
}

checkBin('apps/xtarterize')
checkBin('apps/create-xtarter-app')

process.exit(failed ? 1 : 0)
