import { describe, expect, it } from 'vite-plus/test'
import {
	getTemplateById,
	getTemplateChoices,
	TEMPLATES,
} from '@/templates/registry'

describe('Template Registry', () => {
	describe('TEMPLATES', () => {
		it('should have at least one template', () => {
			expect(TEMPLATES.length).toBeGreaterThan(0)
		})

		it('should have valid template structure', () => {
			for (const template of TEMPLATES) {
				expect(template.id).toBeDefined()
				expect(template.name).toBeDefined()
				expect(template.description).toBeDefined()
				expect(template.features).toBeDefined()
				expect(template.features.length).toBeGreaterThan(0)
				expect(template.repo).toBeDefined()
				expect(template.branch).toBe('main')
				expect(template.provider).toBe('github')
			}
		})
	})

	describe('getTemplateById', () => {
		it('should find template by id', () => {
			const template = getTemplateById('vite-tailwind')
			expect(template).toBeDefined()
			expect(template?.id).toBe('vite-tailwind')
			expect(template?.name).toBe('Vite + React + Tailwind')
		})

		it('should return undefined for unknown template', () => {
			const template = getTemplateById('unknown-template')
			expect(template).toBeUndefined()
		})

		it('should be case-sensitive', () => {
			const template = getTemplateById('VITE-TAILWIND')
			expect(template).toBeUndefined()
		})
	})

	describe('getTemplateChoices', () => {
		it('should return choices for all templates', () => {
			const choices = getTemplateChoices()
			expect(choices.length).toBe(TEMPLATES.length)
		})

		it('should have value and label for each choice', () => {
			const choices = getTemplateChoices()
			for (const choice of choices) {
				expect(choice).toHaveProperty('value')
				expect(choice).toHaveProperty('label')
				expect(typeof choice.value).toBe('string')
				expect(typeof choice.label).toBe('string')
			}
		})

		it('should include template name in label', () => {
			const choices = getTemplateChoices()
			const viteTailwind = choices.find((c) => c.value === 'vite-tailwind')
			expect(viteTailwind?.label).toContain('Vite + React + Tailwind')
		})
	})
})
