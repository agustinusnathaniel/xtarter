# ADR 005: Organization Templates Package (`@xtarter/create`)

## Status
Accepted

## Context
We maintain `create-xtarter-app` — a full-featured scaffolding CLI with interactive prompts, dependency installation, and git initialization. It uses `npx create-xtarter-app` as the entry point.

Vite+ provides `vp create`, which supports organization templates via `@org/create` packages. When a user runs `vp create @org`, Vite+ resolves `@org/create`, reads its `createConfig.templates` manifest, and opens an interactive template picker.

We want Vite+ users to discover and use the same templates without leaving the `vp create` workflow, while keeping `create-xtarter-app` for users who want the full interactive experience.

## Options Considered

### 1. Single manifest-only package (`@xtarter/create`)
Publish a minimal `@xtarter/create` package with only a `createConfig.templates` manifest pointing to existing GitHub template repos. Zero build, near-zero maintenance.

### 2. Bundle templates into the package
Copy template files directly into `@xtarter/create/templates/`. Would decouple template publishing from upstream GitHub repos but requires keeping templates in sync and bloats the package. `vp create` has no template engine, so post-processing (package.json rename, CI/CD cleanup) would be lost.

### 3. Only maintain `create-xtarter-app`
Don't create a Vite+ org package. Loses discovery by Vite+ users who expect `vp create @org` to work.

## Decision
**Adopt Option 1.** Publish `@xtarter/create` as a thin manifest-only package.

## Rationale
- **Minimal maintenance** — one `package.json` with a `createConfig.templates` array, one `README.md`. No code, no build.
- **Same source of truth** — templates remain in their GitHub repos; the manifest just points to them.
- **No breaking changes** — `create-xtarter-app` continues unmodified.
- **Zero risk for Vite+** — if `@xtarter/create` lacked the manifest, Vite+ would fall back to running its `bin` script. No silent failure path.
- **Independent versioning** — `@xtarter/create` versions independently from the `@xtarterize/*` fixed group.

## Implementation
Created `apps/xtarter-create/` with:
- `package.json` — `name: "@xtarter/create"`, `version: "0.1.0"`, with `createConfig.templates` mapping 5 template names to `github:user/repo` URLs
- `README.md` — usage examples and template reference

Templates are the same 5 from `create-xtarter-app`:
  - `next-chakra` → `github:agustinusnathaniel/nextarter-chakra`
  - `next-tailwind` → `github:agustinusnathaniel/nextarter-tailwind`
  - `vite-chakra` → `github:agustinusnathaniel/vite-react-chakra-starter`
  - `vite-tailwind` → `github:agustinusnathaniel/vite-react-tailwind-starter`
  - `vite-hero` → `github:agustinusnathaniel/vite-react-hero-starter`

## Consequences
- Must register the `@xtarter` npm org to publish.
- Template additions/removals must be kept in sync between `create-xtarter-app` and `@xtarter/create`.
- Vite+ users get a lightweight scaffold-only experience (no deps install, no git init, no CI/CD cleanup). Direct them to `create-xtarter-app` if they need the full workflow.
