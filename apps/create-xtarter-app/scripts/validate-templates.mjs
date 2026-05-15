#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { downloadTemplate } from 'giget'
import { TEMPLATES } from '../dist/index.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(
	readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'),
)
const CACHE_FILE = join(__dirname, '..', '.templates-validate-cache.json')

const RED = '\x1b[31m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const DIM = '\x1b[2m'
const BOLD = '\x1b[1m'
const RESET = '\x1b[0m'

function run(cmd, args, { cwd, timeout = 120_000 } = {}) {
	return new Promise((resolve, reject) => {
		const proc = spawn(cmd, args, {
			cwd,
			stdio: 'pipe',
			shell: process.platform === 'win32',
		})
		let stdout = ''
		let stderr = ''
		proc.stdout.on('data', (d) => {
			stdout += d.toString()
		})
		proc.stderr.on('data', (d) => {
			stderr += d.toString()
		})
		const timer = setTimeout(() => {
			proc.kill('SIGTERM')
			reject(new Error(`Timed out after ${timeout / 1000}s`))
		}, timeout)
		proc.on('close', (code) => {
			clearTimeout(timer)
			if (code === 0) resolve(stdout)
			else
				reject(
					new Error(
						`Exit code ${code}\n${stderr.slice(-500) || stdout.slice(-500)}`,
					),
				)
		})
		proc.on('error', reject)
	})
}

function readCache() {
	try {
		return JSON.parse(readFileSync(CACHE_FILE, 'utf-8'))
	} catch {
		return {}
	}
}

function writeCache(cache) {
	writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2) + '\n')
}

async function getLatestCommit(repo, branch) {
	const headers = {
		'User-Agent': 'xtarterize-validation',
		Accept: 'application/vnd.github.v3+json',
	}
	if (process.env.GITHUB_TOKEN) {
		headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
	}
	try {
		const res = await fetch(
			`https://api.github.com/repos/${repo}/commits/${encodeURIComponent(branch)}`,
			{ headers, signal: AbortSignal.timeout(10_000) },
		)
		if (!res.ok) return null
		const data = await res.json()
		return data.sha
	} catch {
		return null
	}
}

async function validateTemplate(template) {
	const tmpDir = await mkdtemp(join(tmpdir(), `xt-validate-${template.id}-`))

	try {
		console.log(`  ${DIM}→${RESET} Scaffolding...`)
		await downloadTemplate(`github:${template.repo}#${template.branch}`, {
			dir: tmpDir,
			force: true,
			offline: false,
		})

		const pkgJson = JSON.parse(
			readFileSync(join(tmpDir, 'package.json'), 'utf-8'),
		)
		const required = ['name', 'scripts']
		for (const field of required) {
			if (!pkgJson[field]) throw new Error(`Missing required field: ${field}`)
		}
		const devScript = pkgJson.scripts?.dev
		if (!devScript) throw new Error('Missing required script: dev')
		const buildScript = pkgJson.scripts?.build
		if (!buildScript) throw new Error('Missing required script: build')

		console.log(`  ${DIM}→${RESET} Installing dependencies...`)
		await run('pnpm', ['install'], { cwd: tmpDir, timeout: 180_000 })

		return { id: template.id, passed: true, error: null }
	} catch (err) {
		const msg = err.message || String(err)
		return { id: template.id, passed: false, error: msg }
	} finally {
		await rm(tmpDir, { recursive: true, force: true }).catch(() => {})
	}
}

async function main() {
	console.log(
		`\n${BOLD}${YELLOW}create-xtarter-app${RESET} ${DIM}v${pkg.version}${RESET}`,
	)
	console.log(`${BOLD}Template Validation${RESET}`)
	console.log(
		`${DIM}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n`,
	)

	const cache = readCache()
	const results = []

	for (const t of TEMPLATES) {
		console.log(`${BOLD}[${t.name}]${RESET}`)

		const latestSha = await getLatestCommit(t.repo, t.branch)
		if (latestSha && cache[t.id] === latestSha) {
			console.log(
				`  ${DIM}→${RESET} Already validated at ${latestSha.slice(0, 12)}, ${GREEN}skipping${RESET}`,
			)
			results.push({ id: t.id, passed: true, skipped: true })
			console.log('')
			continue
		}

		const r = await validateTemplate(t)
		results.push(r)

		if (r.passed) {
			console.log(`  ${GREEN}✓${RESET} ${GREEN}PASSED${RESET}`)
			if (latestSha) {
				cache[t.id] = latestSha
				writeCache(cache)
			}
		} else {
			console.log(`  ${RED}✗${RESET} ${RED}FAILED${RESET}`)
			console.log(`    ${RED}${r.error}${RESET}`)
		}
		console.log('')
	}

	const passed = results.filter((r) => r.passed).length
	const failed = results.filter((r) => !r.passed).length
	const skipped = results.filter((r) => r.skipped).length

	console.log(
		`${DIM}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`,
	)

	if (failed === 0) {
		const detail = skipped ? ` (${skipped} from cache)` : ''
		console.log(
			`${GREEN}${BOLD}All ${passed} templates passed validation${detail}${RESET}\n`,
		)
		process.exit(0)
	} else {
		console.log(`${RED}${BOLD}${failed} template(s) failed validation${RESET}`)
		for (const r of results.filter((r) => !r.passed)) {
			console.log(`  ${RED}✗${RESET} ${r.id} — ${r.error}`)
		}
		console.log('')
		process.exit(1)
	}
}

main().catch((err) => {
	console.error(`${RED}Fatal error: ${err.message}${RESET}`)
	process.exit(1)
})
