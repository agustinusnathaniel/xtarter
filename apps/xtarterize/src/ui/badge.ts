export interface BadgeOptions {
	conformant: number
	total: number
}

function getBadgeColor(percentage: number): string {
	if (percentage >= 90) return '#22c55e' // green
	if (percentage >= 70) return '#84cc16' // lime
	if (percentage >= 50) return '#eab308' // yellow
	return '#ef4444' // red
}

function getStatusText(percentage: number): string {
	if (percentage >= 90) return 'excellent'
	if (percentage >= 70) return 'good'
	if (percentage >= 50) return 'fair'
	return 'needs work'
}

export function generateBadgeSvg(options: BadgeOptions): string {
	const { conformant, total } = options
	const percentage = total === 0 ? 100 : Math.round((conformant / total) * 100)
	const nonConformant = total - conformant
	const color = getBadgeColor(percentage)
	const status = getStatusText(percentage)

	const width = 204
	const height = 68

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" role="img" aria-label="conformance: ${conformant}/${total} (${percentage}%)">
<title>conformance: ${conformant}/${total} (${percentage}%)</title>
<defs>
<clipPath id="r"><rect width="${width}" height="${height}" rx="6"/></clipPath>
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#1e1e2e"/>
<stop offset="1" stop-color="#181825"/>
</linearGradient>
</defs>
<g clip-path="url(#r)">
<rect width="${width}" height="${height}" fill="url(#bg)"/>

<!-- Title -->
<text x="14" y="18" fill="#cdd6f4" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11" font-weight="bold">conformance</text>

<!-- Score -->
<text x="14" y="40" fill="#f5f5f5" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="20" font-weight="bold">${conformant}/${total}</text>
<text x="14" y="55" fill="${color}" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="10">${percentage}% - ${status}</text>

<!-- Progress bar background -->
<rect x="110" y="28" width="80" height="10" rx="5" fill="#313244"/>

<!-- Progress bar fill -->
<rect x="110" y="28" width="${Math.max(4, Math.round((percentage / 100) * 80))}" height="10" rx="5" fill="${color}"/>

<!-- Non-conformant count -->
${nonConformant > 0 ? `<text x="150" y="55" fill="#a6adc8" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="10" text-anchor="middle">${nonConformant} remaining</text>` : `<text x="150" y="55" fill="${color}" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="10" text-anchor="middle">all conformant</text>`}
</g>
</svg>`
}
