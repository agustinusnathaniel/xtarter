export interface YamlStep {
	name?: string
	uses?: string
	run?: string
	with?: Record<string, string>
	env?: Record<string, string>
	continueOnError?: boolean
	if?: string
}

export function renderSteps(steps: YamlStep[], indent: number): string {
	if (steps.length === 0) return ''

	return steps
		.map((step) => {
			const pairs: [string, string | boolean | Record<string, string>][] = []
			if (step.name !== undefined) pairs.push(['name', step.name])
			if (step.if !== undefined) pairs.push(['if', step.if])
			if (step.uses !== undefined) pairs.push(['uses', step.uses])
			if (step.run !== undefined) pairs.push(['run', step.run])
			if (step.with !== undefined) pairs.push(['with', step.with])
			if (step.env !== undefined) pairs.push(['env', step.env])
			if (step.continueOnError) pairs.push(['continue-on-error', true])

			return pairs
				.map(([key, value], i) => {
					const prefix =
						i === 0 ? ' '.repeat(indent) + '- ' : ' '.repeat(indent + 2)

					if (typeof value === 'string' && value.includes('\n')) {
						const lines = [`${prefix}${key}: |`]
						for (const l of value.split('\n')) {
							lines.push(`${' '.repeat(indent + 4)}${l}`)
						}
						return lines.join('\n')
					}

					if (typeof value === 'object') {
						const lines = [`${prefix}${key}:`]
						for (const [k, v] of Object.entries(value)) {
							lines.push(`${' '.repeat(indent + 4)}${k}: ${v}`)
						}
						return lines.join('\n')
					}

					return `${prefix}${key}: ${value}`
				})
				.join('\n')
		})
		.join('\n')
}

export function conditionalScriptStep(
	label: string,
	command: string,
	script: string,
): YamlStep {
	return {
		name: label,
		run: `if node -e "process.exit(require('./package.json').scripts?.${script} ? 0 : 1)"; then\n  ${command}\nfi`,
	}
}
