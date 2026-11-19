import {
  packageScriptsCases,
  packageScriptsPlopCases,
} from '@test/tasks/package-scripts-cases.js';
import {
  packageScriptsEdgeCases,
  packageScriptsPragmaticCases,
} from '@test/tasks/package-scripts-edge-cases.js';
import { runScriptCases } from '@test/tasks/package-scripts-runner.js';
import { describe } from 'vite-plus/test';

describe('packageScriptsTask', () => {
  runScriptCases(packageScriptsCases);

  describe('edge cases', () => {
    runScriptCases(packageScriptsEdgeCases);

    describe('all managed scripts use pragmatic approach', () => {
      runScriptCases(packageScriptsPragmaticCases);
    });
  });
});

describe('plopTask', () => {
  runScriptCases(packageScriptsPlopCases);
});
