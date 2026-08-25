# ADR-028: Agent-Negotiated Markdown via Repo-Owned Worker

**Status:** Accepted (Supersedes ADR-027)  
**Date:** 2026-08-25

## Context

The docs site is a fully static Astro build hosted on Cloudflare Pages (`apps/docs/wrangler.toml`, `pages_build_output_dir = "./dist"`). Per-page `.md` twins already exist via `starlight-page-actions` for every Starlight content page, alongside aggregate `llms.txt` / `llms-full.txt` / `llms-small.txt` via `starlight-llms-txt`. Direct twins are reachable at predictable sibling URLs, but agents that issue `Accept: text/markdown` against the canonical HTML URL still need same-URL negotiation.

ADR-027 (2026-08-24) delegated negotiation to Cloudflare's zone feature "Markdown for Agents", which handles `Accept: text/markdown` at the network edge without repository code. That feature requires a Pro, Business, or Enterprise plan.

An Ora audit of the live deployment found negotiation is not active on the current Free plan: requests with `Accept: text/markdown` still return `text/html`, the response `Vary` header does not include `Accept`, and 404 responses lack a Markdown recovery body. The user decision on 2026-08-25 is to stay on a Free-plan compatible path and re-introduce a repository-owned Cloudflare Pages worker rather than require a plan upgrade.

Prior art for this worker exists at `c93f91a` (`feat(docs): agent-readiness upgrades (#160)`), which introduced a 161-line advanced-mode worker that served build-time Markdown mirrors and handled `Vary` correctly. Commit `9dc3725` (`refactor(docs): prefer Astro and Starlight primitives (#162)`) removed that worker when ADR-027 switched to the zone feature.

```
git log --oneline -3 -- docs/ADRs/027-agent-negotiated-markdown-cloudflare-pages.md
9dc3725 refactor(docs): prefer Astro and Starlight primitives (#162)
c93f91a feat(docs): agent-readiness upgrades (#160)
```

## Decision

Re-introduce a minimal Cloudflare Pages advanced-mode worker owned by `@xtarter/docs`:

1. **Worker location and deployment.** The worker lives at `apps/docs/worker/index.js` and is copied verbatim to `dist/_worker.js` at build time (during `astro:build:done` or equivalent build hook). Cloudflare Pages treats `dist/_worker.js` as an advanced-mode worker that can intercept and respond to requests while still serving static assets via `env.ASSETS`.

2. **Header correctness on all responses.** Every response is returned with a merged `Vary: Accept, Accept-Encoding` header. The merge preserves any upstream `Vary` values and appends `Accept` and `Accept-Encoding` without duplication, so CDN cache variation is correct for negotiated variants.

3. **Same-URL Markdown negotiation (explicit intent only).** When the request `Accept` header includes `text/markdown` (including `text/markdown; q=` variants and combined values like `text/html, text/markdown`), the worker probes the static asset store for an existing Markdown twin via `env.ASSETS.fetch` using candidates in order:
   - `${path}.md`
   - `${path}/index.md`
   - `/index.md` (fallback for the site root where the path is `/`)

   Where `${path}` is the URL pathname stripped of its trailing slash except for `/`. If a twin exists, it is served as `text/markdown; charset=utf-8` with `Vary` merged as above. Wildcard-only accepts (`*/*`, `text/*`) do not trigger negotiation, so browsers that send `*/*` on navigation continue to receive HTML. No HTML-to-Markdown conversion is performed at request time -- the worker only resolves the `starlight-page-actions` twins that already exist in `dist`.

4. **Markdown-aware 404 recovery.** On a 404 from the asset store, the worker returns a short Markdown recovery body for Markdown clients (`Accept` includes `text/markdown`), listing the canonical recovery routes and pointing to `llms.txt` and the Markdown twin convention. Non-markdown clients receive the standard HTML 404. The 404 body is deterministic and satisfies the Ora audit's "markdown recovery" check.

5. **Trust signal reaffirmation.** The site's `Organization` JSON-LD (emitted on every Starlight page via the shared `StarlightHead` / `jsonld.ts` path) keeps `address`, `email`, and `telephone` absent by design. Verified channels only are published -- the `contactPoint` is GitHub Issues as the sole contact point, alongside the founder `Person` and `SoftwareApplication` entries for `xtarterize` and `create-xtarter-app`. Guard tests enforce that `address`/`email`/`telephone` never appear, preventing unverified contact signals from being indexed.

## Rationale

- **Free-plan compatible.** The worker runs on Cloudflare Pages without requiring a Pro/Business/Enterprise zone toggle, so the repository controls deployment end-to-end on the current plan.
- **Reuses existing twins, no new dependencies.** `starlight-page-actions` already writes clean source Markdown next to each page. The worker only needs to resolve those files, so no `turndown` or HTML parser is introduced at build or request time.
- **Small, maintainable surface.** Approximately 160 lines of dependency-free JavaScript, easy to review, test as pure units, and copy verbatim to `dist`. The `Vary` merge, candidate probing, and 404 recovery are deterministic.
- **Closes the Ora audit findings directly:** correct `Content-Type` for Markdown clients, `Vary: Accept` on all `text/html` and `text/markdown` responses, and a Markdown body on 404 for `Accept: text/markdown` requests, without an external dashboard dependency.
- **Future simplification path preserved.** If the zone is later upgraded to Pro or higher and the dashboard feature is enabled, the worker can be deleted and ADR-027's zero-code approach re-adopted with a single ADR update.

## Alternatives

- **(a) Cloudflare zone feature "Markdown for Agents" (ADR-027).** Zero repository code, Cloudflare handles conversion, stripping navigation, and negotiated headers. Rejected for now because it requires a Pro plan or higher (currently $20+/mo) and an external toggle outside version control. It remains the preferred simplification if the plan is upgraded.

- **(b) Static `_headers` with `Vary` only.** Publishing a `_headers` file that adds `Vary: Accept, Accept-Encoding` to HTML/Markdown responses would fix the header half of the audit without a worker. Rejected because it does not negotiate `Accept: text/markdown` on the same URL or provide a Markdown 404 recovery body.

- **(c) Turndown-based worker that converts HTML to Markdown at request time.** A worker could fetch the HTML variant and convert it with `turndown` + `turndown-plugin-gfm` to synthesize Markdown for any path, including non-Starlight routes. Rejected because per-page twins already exist via `starlight-page-actions` and cover the content corpus; runtime conversion adds complexity, latency, and fidelity risk for navigation chrome without measurable benefit.

## Consequences

- Approximately 160 lines of request-time runtime to maintain in `apps/docs/worker/index.js`. The file is dependency-free and copied verbatim to `dist/_worker.js`, so the deployed artifact is exactly what was reviewed in source control.
- The docs build gains a copy step for the worker (similar to the `c93f91a` implementation). Running the build twice produces byte-identical `dist` output, so the idempotency contract holds.
- Tests cover negotiation as pure-unit helpers (Accept parsing, candidate generation, Vary merge, 404 recovery selection) and artifact checks when a local `dist` exists, keeping CI green when the docs build is skipped.
- `address`/`email`/`telephone` remain absent from Organization JSON-LD by policy; guard tests will fail if they are reintroduced, keeping verified-channels-only guarantees stable.
- Switching back to the Cloudflare zone feature later requires only deleting `apps/docs/worker/index.js`, removing the copy step, and updating this ADR -- no content or twin-generation changes are needed.
