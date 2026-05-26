import { describe, expect, it } from 'vite-plus/test'
import { getDevCommand, getInstallCommand } from '@/utils/install'

describe('install utilities', () => {
	describe('getInstallCommand', () => {
		it('should return correct install commands', () => {
			expect(getInstallCommand('pnpm')).toBe('pnpm install')
			expect(getInstallCommand('npm')).toBe('npm install')
			expect(getInstallCommand('bun')).toBe('bun install')
			expect(getInstallCommand('yarn')).toBe('yarn install')
		})
	})

	describe('getDevCommand', () => {
		it('should return correct dev commands', () => {
			expect(getDevCommand('pnpm')).toBe('pnpm dev')
			expect(getDevCommand('npm')).toBe('npm dev')
			expect(getDevCommand('bun')).toBe('bun dev')
			expect(getDevCommand('yarn')).toBe('yarn dev')
		})
	})
})
