import { generateCode, parseExpression, parseModule } from 'magicast';
import { basename } from 'pathe';

const CONFIG_FILE_NAMES: Record<string, string> = {
  'vite.config.cjs': 'vite.config',
  'vite.config.js': 'vite.config',
  'vite.config.mts': 'vite.config',
  'vite.config.ts': 'vite.config',
};

function getConfigLabel(configPath: string): string {
  const basenameName = basename(configPath);
  return CONFIG_FILE_NAMES[basenameName] || basenameName;
}

function parseImportSpecifier(specifier: string): {
  imported: string;
  local: string;
} {
  const trimmed = specifier.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    const name = trimmed.slice(1, -1).trim();
    return { imported: name, local: name };
  }
  return { imported: 'default', local: trimmed };
}

export interface InjectVitePluginOptions {
  configPath: string;
  importName: string;
  importPath: string;
  pluginExpression: string;
}

export interface InjectVitePluginResult {
  beforeCode?: string;
  fallback?: string;
  generatedCode?: string;
  success: boolean;
}

/**
 * Transform Vite config source text in memory and return the generated code.
 * Callers decide whether and where to write the result.
 */
export function injectVitePluginIntoCode(
  code: string,
  options: InjectVitePluginOptions
): InjectVitePluginResult {
  const { configPath, importPath, importName, pluginExpression } = options;
  const configLabel = getConfigLabel(configPath);

  try {
    const mod = parseModule(code);

    if (code.includes(importPath) || code.includes(importName)) {
      return { beforeCode: code, generatedCode: code, success: true };
    }

    const defaultExport = mod.exports.default;
    if (!defaultExport) {
      return {
        fallback: `No default export found in ${configLabel}`,
        success: false,
      };
    }

    let plugins: Array<unknown>;

    if (Array.isArray(defaultExport.plugins)) {
      plugins = defaultExport.plugins as Array<unknown>;
    } else if (typeof defaultExport === 'function') {
      return {
        fallback: 'Function-style vite config not supported by AST patching',
        success: false,
      };
    } else if (typeof defaultExport === 'object' && defaultExport !== null) {
      const configObj = defaultExport.$args?.[0] ?? defaultExport;
      if (Array.isArray(configObj.plugins)) {
        plugins = configObj.plugins;
      } else {
        configObj.plugins = [];
        plugins = configObj.plugins;
      }
    } else {
      return {
        fallback: `Unsupported ${configLabel} structure. Manually add the plugin.`,
        success: false,
      };
    }

    const { imported, local } = parseImportSpecifier(importName);
    mod.imports.$prepend({
      from: importPath,
      imported,
      local,
    });

    plugins.push(parseExpression(pluginExpression));

    const { code: generatedCode } = generateCode(mod);

    return {
      beforeCode: code,
      fallback: undefined,
      generatedCode,
      success: true,
    };
  } catch (error) {
    return {
      fallback: `AST patching failed: ${error instanceof Error ? error.message : 'Unknown error'}. Add plugin manually to ${configLabel}.`,
      success: false,
    };
  }
}
