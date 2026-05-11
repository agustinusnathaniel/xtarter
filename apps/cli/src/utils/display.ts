import type { DiagnosticCheck } from '@xtarterize/core'
import { pc } from '@xtarterize/core'

export function diagnosticIcon(status: DiagnosticCheck['status']): string {
	switch (status) {
		case 'pass':
			return pc.green('✔')
		case 'warn':
			return pc.yellow('~')
		case 'fail':
			return pc.red('✗')
	}
}
