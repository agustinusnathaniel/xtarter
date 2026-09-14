# ADR-028: Agent-Negotiated Markdown via Repo-Owned Worker

**Status:** Accepted (Supersedes ADR-027)  
**Date:** 2026-08-25

## Context

The docs site is a static Astro build on Cloudflare Pages with per-page `.md` twins and aggregate `llms.txt` files. Agents requesting `Accept: text/markdown` against the canonical HTML URL need same-URL negotiation, which ADR-027 delegated to Cloudflare's zone-level Markdown for Agents feature. That feature requires a paid plan and was inactive on the current Free plan, with markdown requests returning HTML and no `Vary: Accept` or markdown 404 recovery.

## Decision

Own a minimal Cloudflare Pages advanced-mode worker in the docs app, copied into the build output so Cloudflare can intercept requests while still serving static assets.

- Every response carries a merged `Vary: Accept, Accept-Encoding` header, so CDN cache variation is correct for negotiated variants.
- When `Accept` explicitly includes `text/markdown`, the worker serves an existing `.md` twin; wildcard-only accepts (`*/*`, `text/*`) still receive HTML, and no conversion happens at request time.
- A 404 returns a short markdown recovery body to markdown clients; other clients get the HTML 404.
- Organization JSON-LD keeps `address`, `email`, and `telephone` absent by policy, with GitHub Issues as the only contact point; guard tests enforce this.

## Rationale

- Free-plan compatible: the repository controls deployment without a plan upgrade or an external dashboard toggle.
- The worker only resolves existing twins, so no parser or converter is introduced and the surface stays small and deterministic.
- It closes the audit findings directly and can be deleted if the zone feature becomes available later.

## Alternatives Considered

- **Cloudflare zone feature (ADR-027):** zero repository code, but requires a paid plan and an external toggle; preferred again if the plan is upgraded.
- **Static headers with `Vary` only:** fixes caching but cannot negotiate markdown or serve a markdown 404.
- **Runtime HTML-to-Markdown conversion:** existing twins cover the content, so conversion adds latency and fidelity risk.
- **Negotiation or header-merging libraries:** custom helpers stay dependency-free and keep wildcard accepts on HTML.

## Consequences

- The docs app maintains a small request-time worker; the deployed artifact matches what is reviewed in source control.
- The build gains a copy step; running it twice still produces byte-identical output, preserving the idempotency contract.
- Worker helpers are unit-tested, with artifact checks when a local build exists.
- Reverting to the zone feature requires deleting the worker and updating this ADR; no content or twin-generation changes.
