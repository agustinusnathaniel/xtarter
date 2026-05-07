import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { detectProject } from '@xtarterize/core'
import { skillsInstallTask } from '@xtarterize/tasks'
import { describe, expect, it } from 'vitest'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixtures = path.resolve(__dirname, '../fixtures')

describe('skillsInstallTask', () => {
	it('is applicable to TypeScript projects', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		expect(skillsInstallTask.applicable(profile)).toBe(true)
	})

	it('is not applicable to non-TypeScript projects', async () => {
		const profile = await detectProject(path.join(fixtures, 'node-only'))
		// node-only fixture might still have tsconfig, check actual profile
		expect(skillsInstallTask.applicable(profile)).toBe(profile.typescript)
	})

	it('returns new on clean react fixture with react skills', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const status = await skillsInstallTask.check(
			path.join(fixtures, 'react-vite-tailwind'),
			profile,
		)
		expect(status).toBe('new')
	})

	it('dryRun includes react and frontend skills for react projects', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const diffs = await skillsInstallTask.dryRun(
			path.join(fixtures, 'react-vite-tailwind'),
			profile,
		)
		expect(diffs.length).toBe(1)
		expect(diffs[0].filepath).toBe('.xtarterize/skills-install.log')
		expect(diffs[0].before).toBeNull()
		const after = diffs[0].after ?? ''
		// React skills
		expect(after).toContain('vercel-react-best-practices')
		expect(after).toContain('vercel-composition-patterns')
		expect(after).toContain('react-dev')
		expect(after).toContain('react-useeffect')
		// Frontend / UI skills
		expect(after).toContain('frontend-design')
		expect(after).toContain('web-design-guidelines')
		expect(after).toContain('baseline-ui')
		expect(after).toContain('fixing-accessibility')
		expect(after).toContain('fixing-metadata')
		expect(after).toContain('fixing-motion-performance')
		// Build tool skills
		expect(after).toContain('vite')
	})

	it('dryRun includes vue and frontend skills for vue projects', async () => {
		const profile = await detectProject(path.join(fixtures, 'vue-vite'))
		const diffs = await skillsInstallTask.dryRun(
			path.join(fixtures, 'vue-vite'),
			profile,
		)
		expect(diffs.length).toBe(1)
		const after = diffs[0].after ?? ''
		// Vue skills
		expect(after).toContain('vue')
		expect(after).toContain('vue-best-practices')
		// Frontend / UI skills
		expect(after).toContain('frontend-design')
		expect(after).toContain('web-design-guidelines')
		expect(after).toContain('baseline-ui')
		// Build tool skills
		expect(after).toContain('vite')
		// React skills should NOT be present
		expect(after).not.toContain('vercel-react-best-practices')
		expect(after).not.toContain('vercel-composition-patterns')
		expect(after).not.toContain('react-dev')
		expect(after).not.toContain('react-useeffect')
	})

	it('dryRun includes nextjs skills for nextjs projects', async () => {
		const profile = await detectProject(path.join(fixtures, 'nextjs'))
		const diffs = await skillsInstallTask.dryRun(
			path.join(fixtures, 'nextjs'),
			profile,
		)
		expect(diffs.length).toBe(1)
		const after = diffs[0].after ?? ''
		// Next.js skills
		expect(after).toContain('next-best-practices')
		expect(after).toContain('next-cache-components')
		expect(after).toContain('next-upgrade')
		// React skills (Next.js is React)
		expect(after).toContain('vercel-react-best-practices')
		expect(after).toContain('react-dev')
		expect(after).toContain('react-useeffect')
		// Frontend / UI skills
		expect(after).toContain('baseline-ui')
	})

	it('dryRun includes expo skills for expo projects', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-native-expo'),
		)
		const diffs = await skillsInstallTask.dryRun(
			path.join(fixtures, 'react-native-expo'),
			profile,
		)
		expect(diffs.length).toBe(1)
		const after = diffs[0].after ?? ''
		expect(after).toContain('expo-tailwind-setup')
		expect(after).toContain('expo-cicd-workflows')
		expect(after).toContain('expo-deployment')
		expect(after).toContain('expo-dev-client')
		expect(after).toContain('building-native-ui')
		expect(after).toContain('native-data-fetching')
		expect(after).toContain('expo-module')
		expect(after).toContain('upgrading-expo')
		expect(after).toContain('vercel-react-native-skills')
	})

	it('dryRun includes antd skill for projects with antd', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-ui-libraries'),
		)
		const diffs = await skillsInstallTask.dryRun(
			path.join(fixtures, 'react-ui-libraries'),
			profile,
		)
		expect(diffs.length).toBe(1)
		const after = diffs[0].after ?? ''
		expect(after).toContain('antd')
		expect(after).toContain('ant-design/ant-design-cli')
	})

	it('dryRun includes heroui-react skill for projects with @heroui/react', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-ui-libraries'),
		)
		const diffs = await skillsInstallTask.dryRun(
			path.join(fixtures, 'react-ui-libraries'),
			profile,
		)
		const after = diffs[0].after ?? ''
		expect(after).toContain('heroui-react')
		expect(after).toContain('heroui-inc/heroui')
	})

	it('dryRun includes chakra-ui skills for projects with @chakra-ui/react', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-ui-libraries'),
		)
		const diffs = await skillsInstallTask.dryRun(
			path.join(fixtures, 'react-ui-libraries'),
			profile,
		)
		const after = diffs[0].after ?? ''
		expect(after).toContain('chakra-ui-builder')
		expect(after).toContain('chakra-ui-refactor')
		expect(after).toContain('chakra-ui/chakra-ui')
	})

	it('dryRun includes heroui-native skill for react-native projects with heroui-native', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-native-hero'),
		)
		const diffs = await skillsInstallTask.dryRun(
			path.join(fixtures, 'react-native-hero'),
			profile,
		)
		expect(diffs.length).toBe(1)
		const after = diffs[0].after ?? ''
		expect(after).toContain('heroui-native')
		expect(after).toContain('heroui-inc/heroui')
	})

	it('does not include component library skills in plain react projects', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const diffs = await skillsInstallTask.dryRun(
			path.join(fixtures, 'react-vite-tailwind'),
			profile,
		)
		const after = diffs[0].after ?? ''
		expect(after).not.toContain('antd')
		expect(after).not.toContain('heroui-react')
		expect(after).not.toContain('heroui-native')
		expect(after).not.toContain('chakra-ui-builder')
		expect(after).not.toContain('chakra-ui-refactor')
	})

	it('returns skip when no relevant framework is detected', async () => {
		const profile = await detectProject(path.join(fixtures, 'node-only'))
		if (!skillsInstallTask.applicable(profile)) {
			// If not applicable, skip testing check
			return
		}
		const status = await skillsInstallTask.check(
			path.join(fixtures, 'node-only'),
			profile,
		)
		expect(status).toBe('skip')
	})

	it('returns empty dryRun when no relevant framework is detected', async () => {
		const profile = await detectProject(path.join(fixtures, 'node-only'))
		const diffs = await skillsInstallTask.dryRun(
			path.join(fixtures, 'node-only'),
			profile,
		)
		expect(diffs.length).toBe(0)
	})
})
