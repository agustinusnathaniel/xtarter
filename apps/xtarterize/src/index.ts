#!/usr/bin/env node
import { createInvocationGuard } from '@xtarterize/core';
import { defineCommand, runMain } from 'citty';

import { abortCliProgram } from '@/runtime.js';

import { version } from '^/package.json';

/**
 * Grace period after the first SIGINT before forcing exit 0. Clack prompts are
 * promise-based and never observe the abort signal, so without a deadline an
 * in-flight prompt would swallow Ctrl+C until a second signal. The unref'd
 * timer only fires while some handle (e.g. a pending prompt) keeps the event
 * loop alive, so Effect finalizers still run and healthy processes exit as
 * soon as they finish.
 */
const SIGNAL_EXIT_GRACE_MS = 250;

let interrupted = false;

function handleSignal(): void {
  if (interrupted) {
    process.exit(0);
  }
  interrupted = true;
  abortCliProgram();
  setTimeout(() => process.exit(0), SIGNAL_EXIT_GRACE_MS).unref();
}

process.on('SIGINT', handleSignal);
process.on('SIGTERM', handleSignal);

const subcommandLoaders = {
  add: () => import('@/commands/add/index.js').then((m) => m.addCommand),
  check: () => import('@/commands/check.js').then((m) => m.checkCommand),
  diff: () => import('@/commands/diff.js').then((m) => m.diffCommand),
  doctor: () => import('@/commands/doctor.js').then((m) => m.doctorCommand),
  init: () => import('@/commands/init.js').then((m) => m.initCommand),
  list: () => import('@/commands/list.js').then((m) => m.listCommand),
  query: () => import('@/commands/query.js').then((m) => m.queryCommand),
  restore: () => import('@/commands/restore.js').then((m) => m.restoreCommand),
  sync: () => import('@/commands/sync.js').then((m) => m.syncCommand),
  undo: () => import('@/commands/undo.js').then((m) => m.undoCommand),
};

const main = defineCommand({
  meta: {
    description: 'Apply conformance configuration to JS/TS projects',
    name: 'xtarterize',
    version,
  },
  plugins: [
    createInvocationGuard({
      commandLabel: 'xtarterize',
      requireKnownSubcommand: true,
      subcommands: subcommandLoaders,
    }),
  ],
  subCommands: subcommandLoaders,
});

runMain(main);
