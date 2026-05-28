import { describe, expect, it } from 'vite-plus/test'
import { generateBadgeSvg } from '../../apps/xtarterize/src/ui/badge.js'

describe('generateBadgeSvg', () => {
	it('generates valid SVG with 100% conformance', () => {
		const svg = generateBadgeSvg({ conformant: 10, total: 10 })
		expect(svg).toContain('<svg')
		expect(svg).toContain('</svg>')
		expect(svg).toContain('100%')
		expect(svg).toContain('#4c1') // green
	})

	it('generates valid SVG with 0% conformance', () => {
		const svg = generateBadgeSvg({ conformant: 0, total: 10 })
		expect(svg).toContain('0%')
		expect(svg).toContain('#e05d44') // red
	})

	it('generates valid SVG with partial conformance', () => {
		const svg = generateBadgeSvg({ conformant: 7, total: 10 })
		expect(svg).toContain('70%')
		expect(svg).toContain('#97CA00') // yellow-green
	})

	it('uses yellow for 50-69% range', () => {
		const svg = generateBadgeSvg({ conformant: 5, total: 10 })
		expect(svg).toContain('50%')
		expect(svg).toContain('#dfb317') // yellow
	})

	it('handles zero total gracefully', () => {
		const svg = generateBadgeSvg({ conformant: 0, total: 0 })
		expect(svg).toContain('100%')
	})

	it('includes aria-label for accessibility', () => {
		const svg = generateBadgeSvg({ conformant: 5, total: 10 })
		expect(svg).toContain('aria-label')
		expect(svg).toContain('conformance: 50%')
	})

	it('rounds percentage to nearest integer', () => {
		const svg = generateBadgeSvg({ conformant: 1, total: 3 })
		expect(svg).toContain('33%')
	})
})
