import type { DiagnosticCheck, TaskStatus } from '@xtarterize/core';
import { pc } from '@xtarterize/core';

export function diagnosticIcon(status: DiagnosticCheck['status']): string {
  switch (status) {
    case 'pass':
      return pc.green('✔');
    case 'warn':
      return pc.yellow('~');
    case 'fail':
      return pc.red('✗');
  }
}

export function taskStatusIcon(status: TaskStatus, colored = false): string {
  if (status === 'skip') {
    return colored ? pc.green('✔') : '✔';
  }
  if (status === 'patch') {
    return colored ? pc.yellow('~') : '~';
  }
  if (status === 'conflict') {
    return colored ? pc.red('⚠') : '⚠';
  }
  return colored ? pc.red('✗') : '✗';
}

export function statusHint(status?: TaskStatus): string {
  switch (status) {
    case 'new':
      return 'new file';
    case 'patch':
      return 'needs update';
    case 'skip':
      return 'up to date';
    case 'conflict':
      return 'conflict';
    default:
      return '';
  }
}
