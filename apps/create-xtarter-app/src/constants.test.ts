import { describe, expect, it } from 'vite-plus/test'
import { HELP_TEXT, SUPPORTED_PACKAGE_MANAGERS } from '@/constants'

describe('Constants', () => {
	describe('SUPPORTED_PACKAGE_MANAGERS', () => {
		it('should support pnpm, npm, bun, and yarn', () => {
			expect(SUPPORTED_PACKAGE_MANAGERS).toHaveProperty('pnpm')
			expect(SUPPORTED_PACKAGE_MANAGERS).toHaveProperty('npm')
			expect(SUPPORTED_PACKAGE_MANAGERS).toHaveProperty('bun')
			expect(SUPPORTED_PACKAGE_MANAGERS).toHaveProperty('yarn')
		})

		it('should have installCommand for each package manager', () => {
			for (const pm of Object.values(SUPPORTED_PACKAGE_MANAGERS)) {
				expect(pm.installCommand).toBe('install')
			}
		})

		it('should have correct execCommand for each package manager', () => {
			expect(SUPPORTED_PACKAGE_MANAGERS.pnpm.execCommand).toBe('pnpm')
			expect(SUPPORTED_PACKAGE_MANAGERS.npm.execCommand).toBe('npm')
			expect(SUPPORTED_PACKAGE_MANAGERS.bun.execCommand).toBe('bun')
			expect(SUPPORTED_PACKAGE_MANAGERS.yarn.execCommand).toBe('yarn')
		})
	})

	describe('HELP_TEXT', () => {
		it('should include usage examples', () => {
			expect(HELP_TEXT).toContain('Usage:')
			expect(HELP_TEXT).toContain('Examples:')
		})

		it('should document all options', () => {
			expect(HELP_TEXT).toContain('--template')
			expect(HELP_TEXT).toContain('--pm')
			expect(HELP_TEXT).toContain('--no-git')
			expect(HELP_TEXT).toContain('--clean')
			expect(HELP_TEXT).toContain('--yes')
		})
	})
})
