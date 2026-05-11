# ADR 004: Module Replacements (e18e Recommendations)

## Status
Implemented

## Context

The [e18e project](https://e18e.dev) maintains a module replacements dataset and CLI tool that identifies packages that can be replaced with more performant, modern, or native alternatives.

**References:**
- [e18e Replacements Docs](https://e18e.dev/docs/replacements/)
- [e18e Analyze CLI](https://e18e.dev/docs/cli/analyze.html)
- [31 npm packages you can replace with Node.js APIs](https://dev.to/lingodotdev/31-npm-packages-you-can-replace-with-nodejs-apis-17o8)

## Final Dependencies

| Package | Before | After | e18e Recommends | Status |
|---------|--------|-------|-----------------|--------|
| `chalk` | 5.6.2 | `node:util.styleText()` | Native API | ✅ **Replaced** |
| `fs-extra` | 11.3.4 | `node:fs/promises` | Native API | ✅ **Replaced** |
| `picocolors` | - | Removed | N/A | ✅ **Removed** |
| `tinyglobby` | 0.2.15 | ✅ Same | ✅ Recommended | ✅ Keep |
| `tinyexec` | 1.0.4 | ✅ Same | ✅ Recommended | ✅ Keep |

## Decisions

### Use `node:util.styleText()` (Native API)

**Why:**
- Zero dependencies - built into Node.js 20+
- Same functionality as chalk/picocolors
- e18e explicitly recommends native APIs
- No bundle size impact

**API:**
```typescript
import { styleText } from 'node:util';

styleText('red', 'error');
styleText('cyanBright', 'title');
styleText('bold', 'important');
```

**Supported styles:** All ANSI colors, bold, dim, italic, underline, inverse, gray, italic.

### Use `node:fs/promises` (Native API)

**Why:**
- Native Node.js APIs since v14+
- Removes 6 dependencies (fs-extra + subdeps)
- Modern async/await support

**Migration:**
```typescript
// Before
import { readJSON, writeJSON, pathExists, remove } from 'fs-extra/esm';

// After
import { access, readFile, writeFile, rm } from 'node:fs/promises';

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
```

### Already Using Best Practices

✅ **`tinyglobby`** - e18e explicitly recommends this over `fast-glob`
✅ **`tinyexec`** - Already replaced `execa` (lighter, simpler)

## Implementation

### What We Changed
1. ✅ `chalk` → `node:util.styleText()`
2. ✅ `picocolors` → removed (intermediate step)
3. ✅ `fs-extra` → `node:fs/promises`
4. ✅ Added `pathExists()` helper using `access()`

### Impact

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| **Dependencies** | 8 | 3 | **-63%** |
| **Bundle size (dist/)** | ~69KB | ~62KB | **-10%** |
| **Package size** | 18.3KB | 18.6KB | Similar |
| **Native APIs used** | 2 | 6 | **+200%** |
| **External color libs** | 1 | 0 | **-100%** |

### Dependency Tree

```
Before (8 deps):
├─ @clack/prompts
├─ chalk
├─ citty
├─ consola
├─ fs-extra (4 subdeps)
├─ giget
├─ tinyexec
└─ tinyglobby

After (3 deps):
├─ @clack/prompts
├─ citty
├─ consola
├─ giget
├─ tinyexec
└─ tinyglobby
```

## How to Run Analysis

```bash
# Install e18e CLI
npm install -g @e18e/cli

# Analyze the project
e18e-cli analyze

# Analyze with custom manifest
e18e-cli analyze --manifest ./module-replacements.json
```

## Related

- ADR 002: Dependency Selection
- docs/backlog.md - Analytics & CI/CD (future: add e18e analyze to CI)

---

*Last updated: March 2026*  
*Implementation: Commits ed8e09d, 5fff1cb*
