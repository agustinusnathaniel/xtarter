import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { applyTaskSelection, loadSelectionConfig } from '@xtarterize/core'
import { describe, expect, it } from 'vite-plus/test'

describe('loadSelectionConfig', () => {
	it('returns empty selection when no config file exists', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarter-selection-empty-'),
		)
		try {
			const selection = await loadSelectionConfig(tmpDir)
			expect(selection).toEqual({ skip: [], only: [] })
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})

	it('reads skip/only from .xtarterizerc', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarter-selection-dot-'),
		)
		try {
			await fs.writeFile(
				path.join(tmpDir, '.xtarterizerc'),
				JSON.stringify({ skip: ['agent/skills-install'], only: ['ts/strict'] }),
			)
			const selection = await loadSelectionConfig(tmpDir)
			expect(selection).toEqual({
				skip: ['agent/skills-install'],
				only: ['ts/strict'],
			})
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})

	it('reads skip/only from .xtarterizerc.json', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarter-selection-json-'),
		)
		try {
			await fs.writeFile(
				path.join(tmpDir, '.xtarterizerc.json'),
				JSON.stringify({ skip: ['lint/biome'] }),
			)
			const selection = await loadSelectionConfig(tmpDir)
			expect(selection).toEqual({ skip: ['lint/biome'], only: [] })
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})

	it('falls back to package.json xtarterize key', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarter-selection-pkg-'),
		)
		try {
			await fs.writeFile(
				path.join(tmpDir, 'package.json'),
				JSON.stringify({ xtarterize: { skip: ['ts/incremental'] } }),
			)
			const selection = await loadSelectionConfig(tmpDir)
			expect(selection).toEqual({ skip: ['ts/incremental'], only: [] })
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})

	it('standalone file takes precedence over package.json key', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarter-selection-prio-'),
		)
		try {
			await fs.writeFile(
				path.join(tmpDir, '.xtarterizerc'),
				JSON.stringify({ skip: ['from-file'] }),
			)
			await fs.writeFile(
				path.join(tmpDir, 'package.json'),
				JSON.stringify({ xtarterize: { skip: ['from-pkg'] } }),
			)
			const selection = await loadSelectionConfig(tmpDir)
			expect(selection).toEqual({ skip: ['from-file'], only: [] })
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})

	it('trims entries and drops empty strings and non-string entries', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarter-selection-sane-'),
		)
		try {
			await fs.writeFile(
				path.join(tmpDir, '.xtarterizerc'),
				JSON.stringify({
					skip: ['  ts/strict  ', '', 42, null, 'lint/biome'],
					only: [true, ' ts/incremental ', ''],
				}),
			)
			const selection = await loadSelectionConfig(tmpDir)
			expect(selection).toEqual({
				skip: ['ts/strict', 'lint/biome'],
				only: ['ts/incremental'],
			})
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})

	it('returns defaults on malformed JSON without throwing', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarter-selection-bad-'),
		)
		try {
			await fs.writeFile(path.join(tmpDir, '.xtarterizerc'), 'not-json{')
			const selection = await loadSelectionConfig(tmpDir)
			expect(selection).toEqual({ skip: [], only: [] })
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})

	it('treats an empty only array as no restriction (defaults)', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarter-selection-emptyonly-'),
		)
		try {
			await fs.writeFile(
				path.join(tmpDir, '.xtarterizerc'),
				JSON.stringify({ only: [] }),
			)
			const selection = await loadSelectionConfig(tmpDir)
			expect(selection).toEqual({ skip: [], only: [] })
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})
})

describe('applyTaskSelection', () => {
	const tasks = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

	it('passes all tasks through when no selection is provided', () => {
		expect(applyTaskSelection(tasks, {})).toEqual(tasks)
	})

	it('CLI --only overrides configOnly', () => {
		const result = applyTaskSelection(tasks, {
			cliOnly: 'a',
			configOnly: ['b', 'c'],
		})
		expect(result.map((t) => t.id)).toEqual(['a'])
	})

	it('CLI --only empty string falls back to configOnly', () => {
		const result = applyTaskSelection(tasks, {
			cliOnly: '',
			configOnly: ['b'],
		})
		expect(result.map((t) => t.id)).toEqual(['b'])
	})

	it('CLI --skip unions with configSkip', () => {
		const result = applyTaskSelection(tasks, {
			cliSkip: 'c',
			configSkip: ['a'],
		})
		expect(result.map((t) => t.id)).toEqual(['b'])
	})

	it('task in config.skip AND config.only is excluded (skip wins)', () => {
		const result = applyTaskSelection(tasks, {
			configSkip: ['a'],
			configOnly: ['a', 'b'],
		})
		expect(result.map((t) => t.id)).toEqual(['b'])
	})
})
