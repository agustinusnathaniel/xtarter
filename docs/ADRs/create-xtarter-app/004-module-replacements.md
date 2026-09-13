# ADR 004: Module Replacements (e18e Recommendations)

## Status
Implemented

## Context

The [e18e project](https://e18e.dev) maintains a module replacements dataset
and CLI that identify packages replaceable with more performant, modern, or
native alternatives.

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

Replaced chalk/picocolors: zero dependencies, built into Node.js 20+, same
functionality, and no bundle size impact. Supported styles cover all ANSI
colors, bold, dim, italic, underline, inverse, and gray.

### Use `node:fs/promises` (Native API)

Replaced fs-extra (removing 6 dependencies including subdeps) with native
async/await APIs available since Node 14. The migration added a local
`pathExists()` helper using `access()` in place of `fs-extra`'s.

### Already Using Best Practices

- **`tinyglobby`** - e18e explicitly recommends it over `fast-glob`.
- **`tinyexec`** - already replaced `execa` (lighter, simpler).

## Implementation

Changed: `chalk` → `node:util.styleText()`; `picocolors` → removed
(intermediate step); `fs-extra` → `node:fs/promises`; added the `pathExists()`
helper using `access()`.

Impact: dependencies 8 → 3 (-63%); dist ~69KB → ~62KB (-10%); package size
18.3KB → 18.6KB (similar); native APIs used 2 → 6; external color libraries
1 → 0.

## How to Run Analysis

```bash
npm install -g @e18e/cli
e18e-cli analyze
e18e-cli analyze --manifest ./module-replacements.json
```

## Related

- ADR 002: Dependency Selection
- `docs/backlog.md` (Analytics & CI/CD; future: add e18e analyze to CI)

Update (2026-09-14): `docs/backlog.md` does not exist in the repository and is
not tracked in git, so the backlog reference above describes an earlier local
plan with no tracked home.

---

*Last updated: March 2026*  
*Implementation: Commits ed8e09d, 5fff1cb*
