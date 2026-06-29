import { describe, expect, it } from 'vite-plus/test'
import { stem } from '../../../packages/core/src/inquiry/stemmer.js'

describe('stem', () => {
	it('returns simple words unchanged', () => {
		expect(stem('task')).toBe('task')
		expect(stem('strict')).toBe('strict')
		expect(stem('code')).toBe('code')
		expect(stem('vscode')).toBe('vscode')
	})

	it('removes -ing suffix', () => {
		expect(stem('running')).toBe('runn')
		expect(stem('configuring')).toBe('configur')
		expect(stem('testing')).toBe('test')
		expect(stem('building')).toBe('build')
	})

	it('removes -ed suffix', () => {
		expect(stem('configured')).toBe('configur')
		expect(stem('tested')).toBe('test')
		expect(stem('checked')).toBe('check')
		expect(stem('installed')).toBe('install')
	})

	it('handles -ies suffix via irregular map', () => {
		expect(stem('libraries')).toBe('library')
		expect(stem('dependencies')).toBe('dependency')
		expect(stem('strategies')).toBe('strategy')
		expect(stem('properties')).toBe('property')
		expect(stem('utilities')).toBe('utility')
	})

	it('removes -s suffix when length allows', () => {
		expect(stem('tasks')).toBe('task')
		expect(stem('files')).toBe('file')
		expect(stem('configs')).toBe('config')
		expect(stem('plugins')).toBe('plugin')
	})

	it('handles irregular words', () => {
		expect(stem('analyses')).toBe('analysis')
		expect(stem('varieties')).toBe('variety')
	})

	it('is case-insensitive', () => {
		expect(stem('Running')).toBe('runn')
		expect(stem('Configured')).toBe('configur')
		expect(stem('Libraries')).toBe('library')
	})

	it('strips -tion suffix', () => {
		expect(stem('configuration')).toBe('configura')
		expect(stem('detection')).toBe('detec')
	})

	it('strips -ied suffix', () => {
		expect(stem('studied')).toBe('stud')
		expect(stem('applied')).toBe('appl')
	})

	it('does not modify words shorter than 3 chars after suffix removal', () => {
		// 'ing' itself should not be stemmed to empty string
		expect(stem('ing')).toBe('ing')
	})
})
