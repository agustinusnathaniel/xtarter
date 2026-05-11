# ADR 002: Dependency Selection

## Status
Accepted

## Context
Selecting the right dependencies for a modern, performant CLI tool.

## Decisions

### Process Execution: tinyexec over execa
- **tinyexec** (1.0.4): 36M weekly downloads, lighter footprint, simpler API
- **execa** (9.6.1): More features but heavier
- **Decision**: tinyexec - sufficient for CLI needs, smaller bundle

### File Operations: fs-extra
- Native `fs.promises` lacks recursive copy/remove
- fs-extra (11.3.4) remains the standard
- **Decision**: fs-extra with ESM imports (`fs-extra/esm`)

### Prompts: @clack/prompts
- Industry standard for beautiful CLI UI
- Actively maintained (1.1.0, updated March 2026)
- **Decision**: @clack/prompts

### Template Download: giget
- See ADR 001 for full rationale
- **Decision**: giget over degit

### Build Tool: tsdown
- Rolldown-powered (Rust-based, faster)
- By Vite team
- Better TypeScript support than tsup
- **Decision**: tsdown

### CLI Args: citty
- By Nuxt team
- Modern, type-safe argument parsing
- **Decision**: citty

### Logging: consola
- Beautiful console output
- Pairs well with clack
- **Decision**: consola

## Version Policy
- Use latest stable versions
- Pin major versions with `^`
- Run `pnpm outdated` regularly
- Update lockfile on every change
