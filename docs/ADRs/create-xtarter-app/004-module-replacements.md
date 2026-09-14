# ADR 004: Module Replacements (e18e Recommendations)

## Status
Accepted

## Context

The [e18e project](https://e18e.dev) maintains a dataset and CLI of packages that can be replaced by more performant, modern, or native alternatives. Applying its [recommendations](https://e18e.dev/docs/replacements/) keeps the CLI's dependency surface small.

## Decision

Replace dependencies that native Node.js APIs cover:

- Use `node:util.styleText()` instead of chalk or picocolors for ANSI styling. It covers colors, bold, dim, italic, underline, inverse, and gray with no bundle weight.
- Use `node:fs/promises` instead of fs-extra for file operations.
- Keep `tinyglobby` and `tinyexec`; e18e recommends both, and they already replaced heavier alternatives (see ADR 002).

Remaining replacements are evaluated with the e18e analyze CLI when dependencies change.

## Rationale

- Native APIs remove external packages and their transitive dependencies without losing functionality.
- Keeping recommended packages avoids re-adding equivalent but heavier libraries.

## Consequences

- Native replacement APIs must be checked against the monorepo's engine range when it changes.
- Fewer dependencies mean a smaller install and bundle.
