import { describe } from 'vite-plus/test';

import { packageScriptsCases } from './package-scripts-cases.js';
import {
  packageScriptsEdgeCases,
  packageScriptsPragmaticCases,
} from './package-scripts-edge-cases.js';
import { runScriptCases } from './package-scripts-runner.js';

describe('packageScriptsTask', () => {
  runScriptCases(packageScriptsCases);

  describe('edge cases', () => {
    runScriptCases(packageScriptsEdgeCases);

    describe('all managed scripts use pragmatic approach', () => {
      runScriptCases(packageScriptsPragmaticCases);
    });
  });
});
