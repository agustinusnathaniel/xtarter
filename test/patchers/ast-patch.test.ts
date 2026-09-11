import { injectVitePluginIntoCode } from '@xtarterize/patchers';
import { describe, expect } from 'vite-plus/test';

const options = {
  configPath: '/project/vite.config.ts',
  importName: 'checker',
  importPath: 'vite-plugin-checker',
  pluginExpression: 'checker({ typescript: true })',
};

describe('injectVitePluginIntoCode', () => {
  test('injects plugin into array-style config', () => {
    const code = `import { defineConfig } from 'vite'\n\nexport default defineConfig({\n  plugins: [],\n})\n`;

    const result = injectVitePluginIntoCode(code, options);

    expect(result.success).toBe(true);
    expect(result.generatedCode).toContain('vite-plugin-checker');
    expect(result.generatedCode).toContain('checker');
  });

  test('skips if plugin already present', () => {
    const code = `import { defineConfig } from 'vite'\nimport checker from 'vite-plugin-checker'\n\nexport default defineConfig({\n  plugins: [checker()],\n})\n`;

    const result = injectVitePluginIntoCode(code, options);

    expect(result.success).toBe(true);
    expect(result.generatedCode).toBe(code);
  });

  test('handles function-style config gracefully', () => {
    const code = `import { defineConfig } from 'vite'\n\nexport default defineConfig(() => ({\n  plugins: [],\n})\n`;

    const result = injectVitePluginIntoCode(code, options);

    expect(result.success).toBe(false);
    expect(result.fallback).toBeDefined();
  });
});
