import { generateCode, parseExpression, parseModule } from 'magicast';
import { basename } from 'pathe';

function getConfigLabel(configPath: string): string {
  const basenameName = basename(configPath);
  return basenameName.startsWith('vite.config.') ? 'vite.config' : basenameName;
}

const LEADING_WHITESPACE = /^[\t ]*/;
const LEADING_TABS = /^\t+/;
const LEADING_SPACES = /^ +/;
const DEFAULT_INDENT_WIDTH = 2;

interface IndentStyle {
  useTabs: boolean;
  width: number;
}

/**
 * Detect the file's indentation. magicast's own detection reports tab files
 * as width 1 and 4-space files as width 2, which recast then re-prints wrong.
 */
function detectIndent(code: string): IndentStyle {
  let tabLines = 0;
  let spaceLines = 0;
  let previousWidth = 0;
  const deltas = new Map<number, number>();

  for (const line of code.split('\n')) {
    if (line.trim() === '') {
      continue;
    }
    const indent = LEADING_WHITESPACE.exec(line)?.[0] ?? '';
    if (indent.startsWith('\t')) {
      tabLines++;
      continue;
    }
    if (indent.length > 0) {
      spaceLines++;
    }
    // A delta of 1 is almost always a JSDoc ` *` continuation, not indentation.
    const delta = indent.length - previousWidth;
    if (delta > 1) {
      deltas.set(delta, (deltas.get(delta) ?? 0) + 1);
    }
    previousWidth = indent.length;
  }

  if (tabLines > spaceLines) {
    return { useTabs: true, width: DEFAULT_INDENT_WIDTH };
  }
  let width = DEFAULT_INDENT_WIDTH;
  let widthCount = 0;
  for (const [delta, count] of deltas) {
    if (count > widthCount) {
      width = delta;
      widthCount = count;
    }
  }
  return { useTabs: false, width };
}

function expandLeadingTabs(line: string, width: number): string {
  return line.replace(LEADING_TABS, (tabs) => ' '.repeat(tabs.length * width));
}

/**
 * Convert recast's space-indented output back to tabs. Lines recast reused
 * verbatim are restored byte-for-byte from the original, so only newly
 * printed lines are re-indented.
 */
function restoreTabs(original: string, generated: string, width: number) {
  const originals = new Map<string, string | null>();
  for (const line of original.split('\n')) {
    const expanded = expandLeadingTabs(line, width);
    const known = originals.get(expanded);
    originals.set(
      expanded,
      known === undefined || known === line ? line : null
    );
  }

  return generated
    .split('\n')
    .map((line) => {
      const known = originals.get(line);
      if (known) {
        return known;
      }
      return line.replace(LEADING_SPACES, (spaces) => {
        const tabs = Math.floor(spaces.length / width);
        return '\t'.repeat(tabs) + ' '.repeat(spaces.length % width);
      });
    })
    .join('\n');
}

/**
 * recast mis-indents re-printed nodes in tab-indented files, so parse a
 * space-indented copy and let generateCodeWithIndent convert it back.
 */
function parseModuleWithIndent(code: string, indent: IndentStyle) {
  const source = indent.useTabs
    ? code
        .split('\n')
        .map((line) => expandLeadingTabs(line, indent.width))
        .join('\n')
    : code;
  return parseModule(source, { tabWidth: indent.width });
}

function generateCodeWithIndent(
  original: string,
  mod: ReturnType<typeof parseModule>,
  indent: IndentStyle
): string {
  const { code } = generateCode(mod, {
    format: { tabWidth: indent.width, useTabs: false },
  });
  const reindented = indent.useTabs
    ? restoreTabs(original, code, indent.width)
    : code;
  // recast drops the final newline; keep the file's own.
  return original.endsWith('\n') && !reindented.endsWith('\n')
    ? `${reindented}\n`
    : reindented;
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
    const indent = detectIndent(code);
    const mod = parseModuleWithIndent(code, indent);

    if (code.includes(importPath) || code.includes(importName)) {
      return { generatedCode: code, success: true };
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

    return {
      fallback: undefined,
      generatedCode: generateCodeWithIndent(code, mod, indent),
      success: true,
    };
  } catch (error) {
    return {
      fallback: `AST patching failed: ${error instanceof Error ? error.message : 'Unknown error'}. Add plugin manually to ${configLabel}.`,
      success: false,
    };
  }
}
