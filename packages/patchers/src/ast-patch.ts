import { generateCode, parseExpression, parseModule } from 'magicast';
import { basename } from 'pathe';

function getConfigLabel(configPath: string): string {
  const basenameName = basename(configPath);
  return basenameName.startsWith('vite.config.') ? 'vite.config' : basenameName;
}

const LEADING_WHITESPACE = /^[\t ]*/u;
const LEADING_TABS = /^\t+/u;
const LEADING_SPACES = /^ +/u;
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

export interface ConfigArrayImport {
  /** Module specifier of the default import. */
  from: string;
  /** Local binding, appended to the array as an identifier. */
  local: string;
}

function resolveConfigObject(
  defaultExport: unknown
): Record<string, unknown> | null {
  if (typeof defaultExport !== 'object' || defaultExport === null) {
    return null;
  }
  const wrapped = defaultExport as {
    $args?: Array<unknown>;
    $type?: string;
  };
  const config =
    wrapped.$type === 'function-call' ? wrapped.$args?.[0] : defaultExport;
  return typeof config === 'object' && config !== null
    ? (config as Record<string, unknown>)
    : null;
}

/** Follow a dotted key path such as `lint.extends` through nested objects. */
function resolvePath(
  config: Record<string, unknown> | null,
  path: string
): unknown {
  let current: unknown = config;
  for (const segment of path.split('.')) {
    if (typeof current !== 'object' || current === null) {
      return;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

/**
 * Add default imports to a config module and append their bindings to one array
 * property of the default export (a plain object or `defineConfig({...})`).
 * The key may be a dotted path into nested objects, such as `lint.extends`.
 * Imports whose specifier the code already contains are skipped. Returns null
 * when the module has no array at that key to extend.
 */
export function appendConfigArrayImports(
  code: string,
  key: string,
  imports: Array<ConfigArrayImport>
): string | null {
  const missing = imports.filter(
    ({ from }) => !(code.includes(`"${from}"`) || code.includes(`'${from}'`))
  );
  if (missing.length === 0) {
    return code;
  }
  try {
    const indent = detectIndent(code);
    const mod = parseModuleWithIndent(code, indent);
    const config = resolveConfigObject(mod.exports.default);
    const target = resolvePath(config, key);
    if (!Array.isArray(target)) {
      return null;
    }
    for (const { from, local } of missing) {
      mod.imports.$append({ from, imported: 'default', local });
      target.push(parseExpression(local));
    }
    return generateCodeWithIndent(code, mod, indent);
  } catch {
    return null;
  }
}

/**
 * What a config module holds at one top-level key of its default export:
 * `unsupported` when there is no object to read (such as a function config),
 * `absent` when the key is missing, otherwise the module specifiers of the
 * imports whose bindings the value references.
 */
export type ConfigPropertyState =
  | { kind: 'unsupported' }
  | { kind: 'absent' }
  | { kind: 'present'; importSources: Array<string> };

interface AstNode {
  computed?: boolean;
  key?: AstNode;
  name?: string;
  type: string;
}

function isAstNode(value: unknown): value is AstNode {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { type?: unknown }).type === 'string'
  );
}

const AST_METADATA_KEYS = new Set([
  'comments',
  'extra',
  'leadingComments',
  'loc',
  'trailingComments',
]);

/** Identifier names a value expression references, skipping property keys. */
function collectIdentifiers(node: AstNode, names: Set<string>): void {
  if (node.type === 'Identifier' && node.name !== undefined) {
    names.add(node.name);
    return;
  }
  for (const [field, child] of Object.entries(node)) {
    if (AST_METADATA_KEYS.has(field)) {
      continue;
    }
    if (field === 'key' && node.computed !== true) {
      continue;
    }
    const children: Array<unknown> = Array.isArray(child) ? child : [child];
    for (const item of children) {
      if (isAstNode(item)) {
        collectIdentifiers(item, names);
      }
    }
  }
}

interface ObjectPropertyNode extends AstNode {
  value: AstNode;
}

function findProperty(
  config: Record<string, unknown>,
  key: string
): ObjectPropertyNode | undefined {
  const ast = (config as { $ast?: { properties?: Array<unknown> } }).$ast;
  return ast?.properties?.find(
    (property): property is ObjectPropertyNode =>
      isAstNode(property) &&
      property.type === 'ObjectProperty' &&
      property.computed !== true &&
      (property.key?.name === key ||
        (property.key as { value?: unknown } | undefined)?.value === key)
  );
}

/** True for a config object literal, not a function or other expression. */
function isObjectConfig(
  config: Record<string, unknown> | null
): config is Record<string, unknown> {
  return (config as { $type?: unknown } | null)?.$type === 'object';
}

function propertyName(property: unknown): string | undefined {
  if (!isAstNode(property) || property.type !== 'ObjectProperty') {
    return;
  }
  const key = property.key as { name?: string; value?: unknown } | undefined;
  return key?.name ?? (typeof key?.value === 'string' ? key.value : undefined);
}

/**
 * Move a just-added property to its sorted position when the object's other
 * keys are already sorted, so a sort-keys lint rule stays satisfied.
 */
function placeSorted(config: Record<string, unknown>, key: string): void {
  const properties = (config as { $ast?: { properties?: Array<unknown> } }).$ast
    ?.properties;
  if (properties === undefined) {
    return;
  }
  const index = properties.findIndex((p) => propertyName(p) === key);
  const [added] = properties.splice(index, 1);
  const names = properties.map(propertyName);
  const sorted = names.every(
    (name, i) => name !== undefined && (i === 0 || (names[i - 1] ?? '') <= name)
  );
  const target = sorted ? names.findIndex((name) => (name ?? '') > key) : -1;
  properties.splice(target === -1 ? properties.length : target, 0, added);
}

interface ImportItem {
  from: string;
  local: string;
}

function importItems(mod: ReturnType<typeof parseModule>): Array<ImportItem> {
  return (mod.imports as unknown as { $items: Array<ImportItem> }).$items;
}

/** Read one top-level key of a config module's default export. */
export function inspectConfigProperty(
  code: string,
  key: string
): ConfigPropertyState {
  try {
    const mod = parseModule(code);
    const config = resolveConfigObject(mod.exports.default);
    if (!isObjectConfig(config)) {
      return { kind: 'unsupported' };
    }
    const property = findProperty(config, key);
    if (property === undefined) {
      return { kind: 'absent' };
    }
    const names = new Set<string>();
    collectIdentifiers(property.value, names);
    const importSources = importItems(mod)
      .filter(({ local }) => names.has(local))
      .map(({ from }) => from);
    return { importSources, kind: 'present' };
  } catch {
    return { kind: 'unsupported' };
  }
}

/** An expression to set a config key to, plus the default imports it references. */
export interface ConfigPropertyValue {
  expression: string;
  imports: Array<ConfigArrayImport>;
}

/**
 * Set one top-level key of a config module's default export to an expression,
 * adding the default imports it needs. An import with the same specifier and
 * binding is not added twice. A new key goes to its sorted position when the
 * other keys are sorted. Returns null when the module has no object to patch.
 */
export function setConfigProperty(
  code: string,
  key: string,
  { expression, imports }: ConfigPropertyValue
): string | null {
  try {
    const indent = detectIndent(code);
    const mod = parseModuleWithIndent(code, indent);
    const config = resolveConfigObject(mod.exports.default);
    if (!isObjectConfig(config)) {
      return null;
    }
    const isNew = findProperty(config, key) === undefined;
    config[key] = parseExpression(expression);
    if (isNew) {
      placeSorted(config, key);
    }
    const existing = importItems(mod);
    for (const { from, local } of imports) {
      const present = existing.some(
        (item) => item.from === from && item.local === local
      );
      if (!present) {
        mod.imports.$append({ from, imported: 'default', local });
      }
    }
    return generateCodeWithIndent(code, mod, indent);
  } catch {
    return null;
  }
}
