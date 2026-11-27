# ADR 002: Dependency Selection

## Status

Accepted

## Context

The scaffolding CLI needs template download, process execution, prompts, argument parsing, and a build, and little else. Dependencies that native Node.js APIs cover are replaced following the [e18e recommendations](https://e18e.dev/docs/replacements/), and remaining candidates are re-checked with the e18e analyze CLI when dependencies change. This record absorbs ADR 001 (template download).

## Decision

- **Template download: giget, not degit.** giget downloads tarballs over HTTP with an offline cache, needs no local git or tar, and supports subdirectories and several git hosts.
- **Process execution: tinyexec, not execa.** Lighter, with a simpler API that covers the CLI's needs, and recommended by e18e.
- **Prompts: `@clack/prompts`.**
- **Logging and colour: consola and picocolors, taken from core's plain entry.** The app shares core's Effect-free helpers instead of declaring its own logging or ANSI dependency, and output honors `NO_COLOR`.
- **Arguments: citty,** for type-safe parsing.
- **File operations: native `node:fs/promises`,** not fs-extra.
- **Build: the monorepo's Vite Plus toolchain,** not a separate bundler.

## Alternatives Considered

- **degit.** Its download path shells out to local git and tar.
- **A git clone.** Slower, requires git, and leaves a `.git` folder to clean up.
- **The GitHub API.** Rate limits and token setup.
- **execa, fs-extra, or a colour library.** Native APIs or the chosen libraries already cover them.

## Consequences

- The dependency set stays small and the bundle light.
- Template repositories must be public unless a token is provided.
- giget is younger than degit, so its breaking changes need watching.
- Native replacements must be re-checked against the engine range when it changes.
