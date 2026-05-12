import pc from 'picocolors'

export type TagColor =
	| 'green'
	| 'yellow'
	| 'red'
	| 'blue'
	| 'cyan'
	| 'magenta'
	| 'white'
	| 'dim'

export function tag(text: string, color: TagColor): string {
	const padded = ` ${text} `
	switch (color) {
		case 'green':
			return pc.bgGreen(pc.black(padded))
		case 'yellow':
			return pc.bgYellow(pc.black(padded))
		case 'red':
			return pc.bgRed(pc.white(padded))
		case 'blue':
			return pc.bgBlue(pc.white(padded))
		case 'cyan':
			return pc.bgCyan(pc.black(padded))
		case 'magenta':
			return pc.bgMagenta(pc.white(padded))
		case 'white':
			return pc.bgWhite(pc.black(padded))
		case 'dim':
			return pc.dim(padded)
	}
}

export function statusTag(status: string): string {
	switch (status) {
		case 'new':
			return tag('new', 'green')
		case 'patch':
			return tag('patch', 'yellow')
		case 'skip':
			return tag('skip', 'dim')
		case 'conflict':
			return tag('conflict', 'red')
		default:
			return ` ${status} `
	}
}

export function actionTag(action: string): string {
	switch (action) {
		case 'create':
			return tag('create', 'green')
		case 'modify':
			return tag('modify', 'yellow')
		default:
			return ` ${action} `
	}
}
