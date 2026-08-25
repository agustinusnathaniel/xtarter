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

- **(d) `negotiator` (1.1.0, 24.4 kB unpacked) / `accepts` (1.3.8) for `wantsMarkdown` (22 lines custom).** Both implement full RFC 7231 negotiation including wildcard matching. `negotiator.preferredMediaTypes` / `accepts.types('text/markdown')` would treat `*/*` and `text/*` as matching `text/markdown`, which would incorrectly serve Markdown to browsers that send `Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8` on navigation. Our `wantsMarkdown` intentionally matches only `text/markdown` (case-insensitive, respects `q=0` to disable, ignores other params) so wildcard browsing stays HTML. `negotiator` also depends on `content-type` (^2.1.0) and uses CommonJS `require`, requiring a bundling step for the Workers runtime which is currently zero-import by design for direct `dist/_worker.js` copy and minimal review surface. Verdict: KEEP CUSTOM -- strictly narrower correct behavior, zero deps, Workers-compatible, smaller.

- **(e) `vary` (1.1.2) for `mergeVary` (30 lines custom).** `vary` exposes `append(header, field)` for Node `ServerResponse` (`res.setHeader` style) and preserves insertion order without sorting or forcing `Accept, Accept-Encoding` canonical order. Our `mergeVary(existing)` guarantees deterministic `Vary: Accept, Accept-Encoding[, ...extras sorted case-insensitively]` with case-insensitive dedupe, which the audit requires for CDN cache variation correctness and stable tests. `vary` would need a Headers-API adapter for Workers (`Headers.get('vary')` / `Headers.set`) and still not produce sorted output; its `*` handling is unused here. Adding a dependency for 30 lines that is already tested as a pure unit is higher maintenance with no correctness gain. Verdict: KEEP CUSTOM.

- **(f) `starlight-dot-md` (0.2.1, deps `yaml` + `picomatch`) / `starlight-md-txt` (0.1.0, deps `unified` + `remark-*` + `unist-util-visit`) for `.md` twins and probing.** Both generate per-page Markdown artifacts at build time, similar to `starlight-page-actions` (0.7.1) which already writes `.md` twins via `tidymd` and is installed here. None of them implement same-URL `Accept: text/markdown` probing, `Vary` merging, or Markdown 404 recovery -- that request-time behavior still needs a worker that calls `env.ASSETS.fetch` on candidates `${path}.md` and `${path}/index.md`. Replacing `starlight-page-actions` with either alternative would keep the twin-generation role but lose page-action buttons and not remove the worker; it would add or swap dependencies without reducing custom code. `starlight-llms-txt` (0.11.0) already covers `llms.txt` / `llms-full.txt` / `llms-small.txt` via ecosystem. Verdict: KEEP `starlight-page-actions` + `starlight-llms-txt` (ecosystem), KEEP CUSTOM probe loop -- complementary, not replaceable.

- **(g) `vite-plugin-static-copy` (4.1.1, deps `chokidar` + `p-map` + `tinyglobby`) / `astro:build:done` integration for `cp worker/index.js dist/_worker.js`.** `vite-plugin-static-copy` is already a transitive dependency via `starlight-page-actions` but using it as a Vite plugin or writing a small Astro integration (`hooks: { 'astro:build:done': ({ dir }) => copyFile(...) }`) for a single-file verbatim copy adds config and ~10-20 lines of integration code versus the one-line shell `cp` in `apps/docs/package.json:build` (`astro build && cp worker/index.js dist/_worker.js`). The shell copy is idempotent, byte-identical on repeated builds, and runs on Linux CI and Cloudflare Pages. An integration would be more portable to Windows but the docs build is not run there in CI. Adding an explicit plugin dependency for one file increases install size and maintenance for no behavior change. Verdict: KEEP `cp` (minimal, already idempotent).

Ecosystem review performed 2026-08-25 on branch `feat/agentic-worker-1` against the installed catalog (`starlight-page-actions@0.7.1`, `starlight-llms-txt@0.11.0`, `astro@7.2.4`) and registry versions above; no replacement was strictly better under the criteria of zero-deps Workers compat, narrow `text/markdown`-only behavior, `q=0` and case-insensitive correctness, deterministic `Vary: Accept, Accept-Encoding` sorting, and bundle size. Re-check if Workers gain first-class npm bundling or if a Starlight plugin later ships same-URL negotiation.

## Consequences

- Approximately 160 lines of request-time runtime to maintain in `apps/docs/worker/index.js`. The file is dependency-free and copied verbatim to `dist/_worker.js`, so the deployed artifact is exactly what was reviewed in source control.
- The docs build gains a copy step for the worker (similar to the `c93f91a` implementation). Running the build twice produces byte-identical `dist` output, so the idempotency contract holds.
- Tests cover negotiation as pure-unit helpers (Accept parsing, candidate generation, Vary merge, 404 recovery selection) and artifact checks when a local `dist` exists, keeping CI green when the docs build is skipped.
- `address`/`email`/`telephone` remain absent from Organization JSON-LD by policy; guard tests will fail if they are reintroduced, keeping verified-channels-only guarantees stable.
- Switching back to the Cloudflare zone feature later requires only deleting `apps/docs/worker/index.js`, removing the copy step, and updating this ADR -- no content or twin-generation changes are needed.
