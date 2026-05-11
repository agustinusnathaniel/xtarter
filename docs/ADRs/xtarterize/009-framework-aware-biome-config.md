# ADR-009: Framework-Aware Biome Configuration

**Status:** Accepted  
**Date:** 2026-04-29

## Decision

xtarterize's generated `biome.json` shall include framework-specific parser options when the target project uses frameworks requiring non-standard syntax support.

Currently implemented: **Tailwind CSS v4 directive support** via `css.parser.tailwindDirectives: true`.

## Rationale

Tailwind CSS v4 introduces `@theme` and other at-rules that are not valid standard CSS. Without parser support, Biome fails to parse these files, causing errors:

```
× Tailwind-specific syntax is disabled.
> 10 │ @theme {
     │  ^^^^^^^
```

Since xtarterize detects Tailwind CSS usage (via `tailwindcss` or `@tailwindcss/vite` in dependencies), it should generate a Biome config that handles this syntax rather than forcing users to manually discover and enable this option.

## Implementation

In `renderBiomeJson`, check `profile.styling` for `'tailwind'` or `'nativewind'`:

```typescript
if (hasTailwind) {
  config.css = { parser: { tailwindDirectives: true } }
}
```

## Future Extensions

This pattern should extend to other framework-specific parser needs:
- Vue SFC syntax (`*.vue` files)
- SCSS/Less preprocessing directives
- CSS Modules `:local` / `:global` pseudo-selectors

## Consequences

- Projects using Tailwind CSS get a Biome config that parses their CSS correctly out of the box.
- Non-Tailwind projects are unaffected — no extra CSS parser config added.
- As Biome adds more framework-specific parser options, this detection pattern should expand.
