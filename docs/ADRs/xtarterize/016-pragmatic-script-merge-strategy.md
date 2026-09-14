# ADR 016: Pragmatic Script Merge Strategy

## Status

Accepted

## Date

2026-05-08

## Context

When xtarterize adds package scripts, it must avoid duplicating scripts the project already has, respect existing naming conventions, and build composite scripts that reference existing scripts where possible. Earlier approaches relied on hardcoded aliases, matched on tool alone, or ignored project conventions entirely.

## Decision

Adopt a project-first merge policy. Scan existing scripts before generating, then:

- Treat a script as already present when its command matches exactly, when it runs the same tool, or when it references the same script.
- Add only scripts that have no equivalent.
- Build composite scripts from the project's existing script names.
- Keep the project's naming conventions; xtarterize does not rename scripts to its preferred keys.

## Rationale

Hardcoded aliases are brittle and project-specific, tool-only matching is too aggressive and misses semantic meaning, and ignoring project conventions forces xtarterize's names onto projects that already chose better ones. Delegating to existing scripts keeps merged output predictable.

## Alternatives Considered

- Normalize to xtarterize's preferred keys: deferred, because project conventions win under the current policy.
- Match on tool name alone: too aggressive and loses semantic distinctions.

## Consequences

- No duplicate scripts are added, composites reference existing scripts, and project naming survives.
- Merge logic is more complex and must read the existing package file during generation.
- Composite task order follows the project's script definitions, which may differ from the recommended order.
