# ADR-027: Agent-Negotiated Markdown via Cloudflare Markdown for Agents

**Status:** Accepted  
**Date:** 2026-08-24

## Context

Coding agents increasingly fetch documentation with `Accept: text/markdown` and expect a Markdown representation instead of HTML. The docs site should expose clean Markdown without owning an HTML-to-Markdown converter or a request router.

The site is a fully static Astro build hosted on Cloudflare Pages (`apps/docs/wrangler.toml`, `pages_build_output_dir = "./dist"`). Cloudflare provides a zone-level Markdown for Agents content converter that handles `Accept: text/markdown` at the network edge.

Any solution must respect two existing contracts:

- **Idempotency:** repeated builds must produce byte-identical artifacts.
- **Composition:** the docs package owns its negotiation story without coupling other packages to the hosting provider.

## Decision

1. **Use Starlight’s existing Markdown output.** `starlight-page-actions` owns clean source Markdown twins for Starlight content pages, and `starlight-llms-txt` owns `llms.txt`, `llms-full.txt`, and `llms-small.txt`.
2. **Use Cloudflare’s native conversion.** Enable Markdown for Agents for the `xtarter.sznm.dev` zone. Cloudflare handles `Accept: text/markdown`, strips navigation/scripts/styles, preserves supported metadata and JSON-LD, and manages the negotiated response headers.
3. **Publish static agent instructions.** `public/agents.md` remains a host-independent entrypoint for tool selection, invocation, Markdown twins, and machine-readable resources.

The repository does not own a request-time worker or a build-time HTML-to-Markdown converter. Non-Cloudflare hosts use the direct Markdown twins and aggregate LLM files.

## Rationale

- Starlight’s existing source mirrors keep documentation Markdown aligned with the source and avoid converting navigation chrome.
- Cloudflare’s maintained converter avoids custom request routing, cache variation, HTML parsing, and Markdown 404 behavior.
- `agents.md` provides a stable fallback for hosts that do not enable Cloudflare’s zone feature.

## Alternatives

- **Own a Cloudflare Pages worker.** Rejected because Cloudflare’s native Markdown for Agents feature provides the same negotiation and conversion behavior without repository-owned runtime code.
- **Switch to an SSR adapter or host-specific edge functions.** Rejected because they add runtime/deployment complexity that the native Cloudflare feature avoids.
- **Ship only direct Markdown twins and skip negotiation.** This remains the fallback for non-Cloudflare hosts, but Cloudflare’s native converter provides better same-URL behavior where enabled.

## Consequences

- Cloudflare Markdown for Agents requires a supported Cloudflare plan and an external zone setting; it is not enabled by this repository commit.
- Non-Cloudflare hosts receive direct `.md` twins and aggregate LLM files but do not negotiate the canonical HTML URL.
- `agents.md` is hand-maintained alongside the docs content, so supported commands and recovery routes must stay synchronized manually.
- Tests validate the generated Starlight artifacts and static agent instructions; no host-specific worker code is tested.
