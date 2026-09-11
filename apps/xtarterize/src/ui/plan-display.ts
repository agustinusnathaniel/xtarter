import type { Task, TaskStatus } from '@xtarterize/core';
import { pc, statusTag } from '@xtarterize/core';
import Table from 'cli-table3';

import { CLI_TABLE_CHARS } from './table-chars.js';

export function displayPlan(
  tasks: Array<Task>,
  statuses: Map<string, TaskStatus>,
  title = 'Conformance plan'
): void {
  console.log('');
  console.log(pc.bold(title));
  console.log('');

  const table = new Table({
    chars: CLI_TABLE_CHARS,
    head: [pc.bold('Status'), pc.bold('Task'), pc.bold('ID'), pc.bold('Group')],
    style: { border: [], head: [] },
  });

  for (const task of tasks) {
    const status = statuses.get(task.id) ?? 'new';
    table.push([
      statusTag(status),
      task.label,
      pc.dim(task.id),
      pc.dim(task.group),
    ]);
  }

  console.log(table.toString());
  console.log('');
}
