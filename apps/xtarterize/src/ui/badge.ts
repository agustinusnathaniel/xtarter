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

	const labelWidth = measureTextWidth(label) + 10
	const valueWidth = measureTextWidth(value) + 10
	const totalWidth = labelWidth + valueWidth
	const height = 20

	const labelX = labelWidth / 2
	const valueX = labelWidth + valueWidth / 2
	const textY = 14

	return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalWidth}" height="${height}" role="img" aria-label="${label}: ${value}">
<title>${label}: ${value}</title>
<linearGradient id="s" x2="0" y2="100%">
<stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
<stop offset="1" stop-opacity=".1"/>
</linearGradient>
<clipPath id="r">
<rect width="${totalWidth}" height="${height}" rx="3" fill="#fff"/>
</clipPath>
<g clip-path="url(#r)">
<rect width="${labelWidth}" height="${height}" fill="#555"/>
<rect x="${labelWidth}" width="${valueWidth}" height="${height}" fill="${color}"/>
<rect width="${totalWidth}" height="${height}" fill="url(#s)"/>
</g>
<g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
<text x="${labelX}" y="${textY}" fill="#000" fill-opacity=".3" dy=".35em">${label}</text>
<text x="${labelX}" y="${textY}" fill="#fff" dy=".35em">${label}</text>
<text x="${valueX}" y="${textY}" fill="#000" fill-opacity=".3" dy=".35em">${value}</text>
<text x="${valueX}" y="${textY}" fill="#fff" dy=".35em">${value}</text>
</g>
</svg>`
}

function measureTextWidth(text: string): number {
	// Approximate character width for Verdana 11px (~6.5px average)
	return Math.ceil(text.length * 6.5 + 4)
}
