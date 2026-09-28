import type { ProjectProfile } from '@xtarterize/core';
import { runScriptCommand } from 'nypm';

import {
  conditionalScriptStep,
  createSetupSteps,
  renderSteps,
} from './shared/workflow.js';

export function renderCiWorkflow(profile: ProjectProfile): string {
  const pm = profile.packageManager;
  const runCheck = runScriptCommand(pm, 'check');
  const runTest = runScriptCommand(pm, 'test');

  const steps = createSetupSteps(profile);

  if (profile.vitePlus) {
    steps.push({ run: runCheck });
  } else {
    const runLint = runScriptCommand(pm, 'lint');
    const runTypecheck = runScriptCommand(pm, 'typecheck');

    steps.push({ run: runLint }, { run: runCheck });

    if (profile.typescript) {
      steps.push({ run: runTypecheck });
    }
  }

  steps.push(conditionalScriptStep('Test', runTest, 'test'));

  return `name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
${renderSteps(steps, 6)}
`;
}
