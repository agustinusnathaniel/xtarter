import { describe, expect, it } from 'vite-plus/test'
import { generateBadgeSvg } from '../../apps/xtarterize/src/ui/badge.js'

describe('generateBadgeSvg', () => {
	it('generates valid SVG with 100% conformance', () => {
		const svg = generateBadgeSvg({ conformant: 10, total: 10 })
		expect(svg).toContain('<svg')
		expect(svg).toContain('</svg>')
		expect(svg).toContain('10/10')
		expect(svg).toContain('100%')
		expect(svg).toContain('#22c55e') // green
		expect(svg).toContain('all conformant')
	})

	it('generates valid SVG with 0% conformance', () => {
		const svg = generateBadgeSvg({ conformant: 0, total: 10 })
		expect(svg).toContain('0/10')
		expect(svg).toContain('0%')
		expect(svg).toContain('#ef4444') // red
		expect(svg).toContain('10 remaining')
	})

	it('generates valid SVG with partial conformance', () => {
		const svg = generateBadgeSvg({ conformant: 7, total: 10 })
		expect(svg).toContain('7/10')
		expect(svg).toContain('70%')
		expect(svg).toContain('#84cc16') // lime
		expect(svg).toContain('3 remaining')
	})

	it('uses yellow for 50-69% range', () => {
		const svg = generateBadgeSvg({ conformant: 5, total: 10 })
		expect(svg).toContain('50%')
		expect(svg).toContain('#eab308') // yellow
	})

	it('handles zero total gracefully', () => {
		const svg = generateBadgeSvg({ conformant: 0, total: 0 })
		expect(svg).toContain('100%')
		expect(svg).toContain('all conformant')
	})

	it('includes aria-label for accessibility', () => {
		const svg = generateBadgeSvg({ conformant: 5, total: 10 })
		expect(svg).toContain('aria-label')
		expect(svg).toContain('conformance: 5/10 (50%)')
	})

	it('rounds percentage to nearest integer', () => {
		const svg = generateBadgeSvg({ conformant: 1, total: 3 })
		expect(svg).toContain('33%')
	})

	it('shows status text based on score', () => {
		expect(generateBadgeSvg({ conformant: 10, total: 10 })).toContain(
			'excellent',
		)
		expect(generateBadgeSvg({ conformant: 7, total: 10 })).toContain('good')
		expect(generateBadgeSvg({ conformant: 5, total: 10 })).toContain('fair')
		expect(generateBadgeSvg({ conformant: 0, total: 10 })).toContain(
			'needs work',
		)
	})

	it('includes progress bar', () => {
		const svg = generateBadgeSvg({ conformant: 5, total: 10 })
		expect(svg).toContain('Progress bar')
		expect(svg).toContain('width="40"') // 50% of 80px bar
	})
})
