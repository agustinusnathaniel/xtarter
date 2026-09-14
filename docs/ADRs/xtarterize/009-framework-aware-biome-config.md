# ADR-009: Framework-Aware Biome Configuration

**Status:** Accepted
**Date:** 2026-04-29

## Decision

Generated Biome configuration enables framework-specific parser options when the target project uses syntax Biome would otherwise reject. Tailwind CSS directive support is the current implementation, enabled when Tailwind is detected in the project's dependencies.

## Rationale

Tailwind-specific at-rules are not valid standard CSS, so Biome fails to parse affected files without the parser option. Because xtarterize already detects Tailwind, it can generate a config that handles the syntax instead of making users discover and enable the option themselves.

## Alternatives Considered

- Require users to enable the parser option manually: leaves every Tailwind project with parse errors until they do.

## Consequences

- Tailwind projects parse their CSS correctly out of the box.
- Non-Tailwind projects are unaffected by extra parser config.
- Only Tailwind is covered today; other framework syntax still needs manual handling until this detection pattern expands.
