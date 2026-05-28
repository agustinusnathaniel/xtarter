export interface BadgeOptions {
	conformant: number
	total: number
}

function getBadgeColor(percentage: number): string {
	if (percentage >= 90) return '#4c1' // green
	if (percentage >= 70) return '#97CA00' // yellow-green
	if (percentage >= 50) return '#dfb317' // yellow
	return '#e05d44' // red
}

export function generateBadgeSvg(options: BadgeOptions): string {
	const { conformant, total } = options
	const percentage = total === 0 ? 100 : Math.round((conformant / total) * 100)
	const label = 'conformance'
	const value = `${percentage}%`
	const color = getBadgeColor(percentage)

	const labelWidth = measureTextWidth(label) + 16
	const valueWidth = measureTextWidth(value) + 16
	const totalWidth = labelWidth + valueWidth

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${label}: ${value}">
<title>${label}: ${value}</title>
<linearGradient id="s" x2="0" y2="100%">
<stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
<stop offset="1" stop-opacity=".1"/>
</linearGradient>
<clipPath id="r">
<rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
</clipPath>
<g clip-path="url(#r)">
<rect width="${labelWidth}" height="20" fill="#555"/>
<rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>
<rect width="${totalWidth}" height="20" fill="url(#s)"/>
</g>
<g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110">
<text aria-hidden="true" x="${(labelWidth / 2) * 10}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${(labelWidth - 16) * 10}">${label}</text>
<text x="${(labelWidth / 2) * 10}" y="140" transform="scale(.1)" fill="#fff" textLength="${(labelWidth - 16) * 10}">${label}</text>
<text aria-hidden="true" x="${(labelWidth + valueWidth / 2) * 10}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${(valueWidth - 16) * 10}">${value}</text>
<text x="${(labelWidth + valueWidth / 2) * 10}" y="140" transform="scale(.1)" fill="#fff" textLength="${(valueWidth - 16) * 10}">${value}</text>
</g>
</svg>`
}

function measureTextWidth(text: string): number {
	// Approximate character width for Verdana 11px (0.65em average)
	return Math.ceil(text.length * 7.2 + 4)
}
