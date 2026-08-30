#!/usr/bin/env node
import { defineCommand, runMain } from 'citty';

import { version } from '^/package.json';

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

const main = defineCommand({
  args: {
    cwd: {
      description: 'Target directory (default: current working directory)',
      type: 'string',
    },
    json: {
      description: 'Output machine-readable JSON',
      type: 'boolean',
    },
    timing: {
      description: 'Show detailed per-task timing breakdown',
      type: 'boolean',
    },
  },
  meta: {
    description: 'Apply conformance configuration to JS/TS projects',
    name: 'xtarterize',
    version,
  },
  subCommands: {
    add: () => import('@/commands/add/index.js').then((m) => m.addCommand),
    check: () => import('@/commands/check.js').then((m) => m.checkCommand),
    diff: () => import('@/commands/diff.js').then((m) => m.diffCommand),
    doctor: () => import('@/commands/doctor.js').then((m) => m.doctorCommand),
    init: () => import('@/commands/init.js').then((m) => m.initCommand),
    list: () => import('@/commands/list.js').then((m) => m.listCommand),
    query: () => import('@/commands/query.js').then((m) => m.queryCommand),
    restore: () =>
      import('@/commands/restore.js').then((m) => m.restoreCommand),
    sync: () => import('@/commands/sync.js').then((m) => m.syncCommand),
    undo: () => import('@/commands/undo.js').then((m) => m.undoCommand),
  },
});

runMain(main);
