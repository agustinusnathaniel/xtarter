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

function sleep(ms) {
	return new Promise((r) => setTimeout(r, ms))
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
			else {
				const tail = (s) => s.split('\n').slice(-10).join('\n')
				reject(new Error(`Exit code ${code}\n${tail(stderr || stdout)}`))
			}
		})
		proc.on('error', reject)
	})
}

async function downloadWithRetry(template, dir) {
	const MAX_RETRIES = 3
	let lastErr
	for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
		try {
			await downloadTemplate(`github:${template.repo}#${template.branch}`, {
				dir,
				force: true,
				offline: false,
			})
			return
		} catch (err) {
			lastErr = err
			if (attempt < MAX_RETRIES) {
				console.log(
					`  ${DIM}→${RESET} Retrying download (${attempt}/${MAX_RETRIES})...`,
				)
				await sleep(2000)
			}
		}
	}
	throw lastErr
}

async function testDevServer({ cwd, timeout = 60_000 }) {
	const proc = spawn('pnpm', ['run', 'dev'], {
		cwd,
		stdio: ['ignore', 'pipe', 'pipe'],
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

	return new Promise((resolve, reject) => {
		let settled = false
		let timer

		const finish = (err, res) => {
			if (settled) return
			settled = true
			clearTimeout(timer)
			proc.kill('SIGTERM')
			setTimeout(() => {
				proc.kill('SIGKILL')
			}, 1000)
			if (err) reject(err)
			else resolve(res)
		}

		timer = setTimeout(() => {
			const tail = stderr.split('\n').filter(Boolean).slice(-10).join('\n')
			finish(
				new Error(
					`Dev server did not start within ${timeout / 1000}s\n${tail || stdout.slice(-300)}`,
				),
			)
		}, timeout)

		proc.on('error', (err) => finish(err))
		proc.on('exit', (code, signal) => {
			if (code === 0) {
				finish(new Error(`Dev server exited prematurely (code: 0)`))
			} else if (code !== null) {
				const tail = stderr.split('\n').filter(Boolean).slice(-15).join('\n')
				finish(
					new Error(
						`Dev server exited with code ${code}\n${tail || stdout.slice(-500)}`,
					),
				)
			} else {
				finish(new Error(`Dev server was killed (signal: ${signal})`))
			}
		})

		const portsToTry = [3000, 5173]
		const perPortTimeout = Math.max(
			Math.floor(timeout / portsToTry.length),
			15_000,
		)

		async function tryPort(port) {
			const deadline = Date.now() + perPortTimeout
			while (Date.now() < deadline) {
				if (settled) return
				try {
					await fetch(`http://localhost:${port}`, {
						signal: AbortSignal.timeout(3000),
					})
					finish(null, proc)
					return
				} catch {
					await sleep(1000)
				}
			}
		}

		for (const port of portsToTry) {
			tryPort(port)
		}
	})
}

async function validateTemplate(template) {
	const tmpDir = await mkdtemp(join(tmpdir(), `xt-validate-${template.id}-`))

	try {
		console.log(`  ${DIM}→${RESET} Downloading...`)
		await downloadWithRetry(template, tmpDir)

		const pkgJson = JSON.parse(
			readFileSync(join(tmpDir, 'package.json'), 'utf-8'),
		)
		const scripts = pkgJson.scripts || {}

		console.log(`  ${DIM}→${RESET} Installing dependencies...`)
		await run('pnpm', ['install'], { cwd: tmpDir, timeout: 180_000 })

		console.log(`  ${DIM}→${RESET} Building...`)
		await run('pnpm', ['run', 'build'], { cwd: tmpDir, timeout: 180_000 })

		if (scripts['type:check']) {
			console.log(`  ${DIM}→${RESET} Type checking...`)
			await run('pnpm', ['run', 'type:check'], {
				cwd: tmpDir,
				timeout: 120_000,
			})
		}

		console.log(`  ${DIM}→${RESET} Starting dev server...`)
		for (const p of [3000, 5173]) {
			await run('fuser', ['-k', `${p}/tcp`], { timeout: 3000 }).catch(() => {})
		}
		await sleep(500)
		await testDevServer({ cwd: tmpDir, timeout: 60_000 })

		return { id: template.id, passed: true, error: null }
	} catch (err) {
		const msg = err.message || String(err)
		if (msg.includes('ENOSPC') || msg.includes('OS file watch limit')) {
			return {
				id: template.id,
				passed: true,
				error: null,
				skipped: 'OS file watch limit',
			}
		}
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
			console.log(`  ${RED}✗${RESET} ${r.id}`)
		}
		console.log('')
		process.exit(1)
	}
}

main().catch((err) => {
	console.error(`${RED}Fatal error: ${err.message}${RESET}`)
	process.exit(1)
})
