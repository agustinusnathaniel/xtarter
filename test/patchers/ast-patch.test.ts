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

  test('preserves tab indentation and indents inserted plugins with tabs', () => {
    const code =
      "import { defineConfig } from 'vite'\n\nexport default defineConfig({\n\tplugins: [react()],\n\tresolve: {\n\t\talias: {\n\t\t\t'@': '/src',\n\t\t},\n\t},\n})\n";

    const result = injectVitePluginIntoCode(code, options);

    expect(result.generatedCode).toBe(
      "import checker from 'vite-plugin-checker';\nimport { defineConfig } from 'vite'\n\nexport default defineConfig({\n\tplugins: [\n\t\treact(),\n\t\tchecker({ typescript: true }),\n\t],\n\tresolve: {\n\t\talias: {\n\t\t\t'@': '/src',\n\t\t},\n\t},\n})\n"
    );
    expect(
      injectVitePluginIntoCode(result.generatedCode ?? '', options)
        .generatedCode
    ).toBe(result.generatedCode);
  });

  test('preserves 4-space indentation width for inserted plugins', () => {
    const code = `import { defineConfig } from 'vite'\n\nexport default defineConfig({\n    plugins: [\n        react(),\n    ],\n})\n`;

    const result = injectVitePluginIntoCode(code, options);

    expect(result.generatedCode).toContain(
      '\n        react(),\n        checker({ typescript: true }),\n    ],\n'
    );
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
