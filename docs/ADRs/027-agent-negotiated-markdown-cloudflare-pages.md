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

Three cooperating pieces, all owned by `@xtarter/docs`:

1. **Build-time markdown mirrors.** `starlight-page-actions` owns the clean source Markdown mirrors for Starlight content pages. The inline Astro integration (`agent-extras` in `astro.config.mjs`) only walks built `.html` files that do not already have one of those sibling mirrors—currently the standalone trust pages and 404—and converts them with turndown + turndown-plugin-gfm. The existing `starlight-llms-txt` plugin owns `llms.txt`, including its extra details and optional links.
2. **Static agent instructions.** `public/agents.md` is a hand-maintained, host-independent entrypoint for tool selection, invocation, Markdown twins, and machine-readable resources. Astro copies it directly to `dist/agents.md`.
3. **Advanced-mode `_worker.js`.** A dependency-free Cloudflare Pages worker in `public/_worker.js` is copied to `dist/_worker.js` by Astro and negotiates at request time when Markdown is accepted at least as strongly as HTML. It ignores wildcard-only requests and requests that already target `.md`/`.txt` artifacts, probes the source mirror first and then any custom directory-index mirror through `env.ASSETS.fetch`, serves hits as `text/markdown; charset=utf-8`, and returns a Markdown recovery response for missing negotiated routes. Only responses participating in negotiation carry `Vary: Accept, Accept-Encoding`.

Negotiation triggers only on explicit markdown intent because browsers send `*/*` on every navigation; matching wildcards would risk serving raw markdown to humans.

## Rationale

- Starlight’s existing source mirrors keep documentation Markdown aligned with the source and avoid converting navigation chrome. The small fallback converter handles only custom Astro pages; its output is still pure deterministic build output, so no runtime HTML-to-markdown conversion cost exists. Keeping both `agents.md` and the worker in Astro’s `public/` directory makes those deployed artifacts direct copies without second custom copy steps.
- The advanced-mode worker is the single supported way to intercept requests on Cloudflare Pages while still using static asset serving; it keeps the deployment pipeline unchanged (still a plain `dist` upload).
- `Vary: Accept, Accept-Encoding` on negotiated html and md responses is required for CDN cache correctness: edges must not serve the markdown variant of a URL to browsers or vice versa. Ordinary HTML navigation and direct `.md`/`.txt` artifact requests do not need a new negotiation variance.
- Keeping the worker self-contained (no imports) lets the build copy it verbatim, making the deployed artifact exactly what was reviewed in source control.

## Alternatives

- **Switch to an SSR adapter.** Full runtime control over negotiation, but adds a Node/workerd runtime to a purely static site, slows every request, changes the deploy model, and violates the "static output" shape the docs app is designed around.
- **Host-specific edge functions per platform.** Netlify Edge Functions plus Vercel Edge Middleware plus the Cloudflare worker would keep parity across all three vestigial host configs, at triple the maintenance cost for hosts the product does not actually serve from today.
- **Ship llms-full.txt only and skip negotiation.** Simplest option, but agents that honor HTTP content negotiation would still receive HTML for page URLs, and per-page markdown (what an agent wants when following one link) would not exist.

## Consequences

- Negotiation works only where `_worker.js` runs: Cloudflare Pages. The checked-in `netlify.toml` and `vercel.json` fallbacks remain HTML-only pending a product decision on whether those hosts matter.
- `agents.md` and the Markdown 404 recovery links are hand-maintained alongside the docs content, so changes to supported commands or recovery routes need to update those surfaces.
- Every html/md response now depends on correct `Vary` handling; CDNs and proxies that ignore `Vary` could cross-serve variants.
- The mirror set grows linearly with page count, roughly doubling the number of text files uploaded per deploy (acceptable for this documentation corpus).
- Tests guard the worker helpers as pure units and assert build artifacts only when a local `dist` exists, keeping CI (which skips the docs build) green.
