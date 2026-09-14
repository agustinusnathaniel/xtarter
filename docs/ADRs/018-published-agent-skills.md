# ADR-018: Published Agent Skills for xtarterize and create-xtarter-app

**Status:** Accepted  
**Date:** 2026-05-19

## Context

AI coding agents increasingly rely on skills, markdown files that teach agents how to use specific tools. The [skills.sh](https://skills.sh) ecosystem provides discoverable skill packages that load on demand. xtarterize already installs third-party skills into user projects, but the project published no skills for its own tools, so agents had to guess how to run conformance commands or which templates exist, and agent-assisted workflows depended on the user explaining the tooling.

## Decision

Publish two agent skills in the repository root, one per tool, registered through a plugin manifest so agent systems can discover and auto-load them. Each skill follows the Tool pattern with progressive disclosure: a concise entry point covering commands, JSON output parsing, workflows, and error handling, plus reference files loaded on demand for full command flags, the task catalog, and template details.

## Rationale

- Co-location keeps skills next to the source code they document and reduces drift.
- The format follows conventions already used by comparable projects.
- Progressive disclosure keeps the entry point lean and avoids loading irrelevant context.
- The skills complement the existing task that installs third-party skills.

## Alternatives Considered

- **One combined skill:** would force agents to load content for both tools every time.
- **A separate skills repository:** adds maintenance overhead and makes drift more likely.
- **No published skills:** leaves agents without structured knowledge of the tools.

## Consequences

- Skills must be updated whenever CLI commands, flags, or the task catalog change.
- Future skills can follow the same pattern.
- Agent systems with plugin discovery pick the skills up automatically.
