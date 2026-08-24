# ADR-027: Agent-Negotiated Markdown via Cloudflare Pages Advanced Mode

**Status:** Accepted  
**Date:** 2026-08-24

## Context

Coding agents increasingly fetch documentation with `Accept: text/markdown` and expect a markdown representation instead of HTML. Today the docs site serves static HTML only, so such agents receive `text/html` and must scrape it client-side.

The site is a fully static Astro build hosted on Cloudflare Pages (`apps/docs/wrangler.toml`, `pages_build_output_dir = "./dist"`). There is no server runtime, so content negotiation cannot happen at origin in the classic sense.

Any solution must respect two existing contracts:

- **Idempotency:** repeated builds must produce byte-identical artifacts.
- **Composition:** the docs package owns its negotiation story without coupling other packages to the hosting provider.

## Decision

Two cooperating pieces, both owned by `@xtarter/docs`:

1. **Build-time markdown mirrors.** An inline Astro integration (`agent-extras` in `astro.config.mjs`) walks every built `.html` file during `astro:build:done` and writes a `.md` mirror next to it (`dist/<path>/index.md`, or `dist/<path>.md`), converted with turndown + turndown-plugin-gfm. The same hook injects hand-written agent guidance into `llms.txt` between owned markers (removing any previous block first) and copies the worker verbatim to `dist/_worker.js`.
2. **Advanced-mode `_worker.js`.** A dependency-free Cloudflare Pages worker negotiates at request time: explicit `Accept: text/markdown` (never wildcards like `*/*` or `text/*`) probes the mirror candidates through `env.ASSETS.fetch` and serves them as `text/markdown; charset=utf-8`. Every response whose type is `text/html` or `text/markdown` carries `Vary: Accept, Accept-Encoding`.

Negotiation triggers only on explicit markdown intent because browsers send `*/*` on every navigation; matching wildcards would risk serving raw markdown to humans.

## Rationale

- Mirrors are pure build output: conversion is deterministic, so idempotency holds and no runtime HTML-to-markdown conversion cost exists.
- The advanced-mode worker is the single supported way to intercept requests on Cloudflare Pages while still using static asset serving; it keeps the deployment pipeline unchanged (still a plain `dist` upload).
- `Vary: Accept, Accept-Encoding` on both html and md responses is required for CDN cache correctness: edges must not serve the markdown variant of a URL to browsers or vice versa.
- Keeping the worker self-contained (no imports) lets the build copy it verbatim, making the deployed artifact exactly what was reviewed in source control.

## Alternatives

- **Switch to an SSR adapter.** Full runtime control over negotiation, but adds a Node/workerd runtime to a purely static site, slows every request, changes the deploy model, and violates the "static output" shape the docs app is designed around.
- **Host-specific edge functions per platform.** Netlify Edge Functions plus Vercel Edge Middleware plus the Cloudflare worker would keep parity across all three vestigial host configs, at triple the maintenance cost for hosts the product does not actually serve from today.
- **Ship llms-full.txt only and skip negotiation.** Simplest option, but agents that honor HTTP content negotiation would still receive HTML for page URLs, and per-page markdown (what an agent wants when following one link) would not exist.

## Consequences

- Negotiation works only where `_worker.js` runs: Cloudflare Pages. The checked-in `netlify.toml` and `vercel.json` fallbacks remain HTML-only pending a product decision on whether those hosts matter.
- Every html/md response now depends on correct `Vary` handling; CDNs and proxies that ignore `Vary` could cross-serve variants.
- The mirror set grows linearly with page count, roughly doubling the number of text files uploaded per deploy (acceptable for this documentation corpus).
- Tests guard the worker helpers as pure units and assert build artifacts only when a local `dist` exists, keeping CI (which skips the docs build) green.
