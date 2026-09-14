# ADR-027: Agent-Negotiated Markdown via Cloudflare Markdown for Agents

**Status:** Superseded by [ADR-028](028-agent-negotiated-markdown-via-worker.md)
**Date:** 2026-08-24

ADR-027 delegated `Accept: text/markdown` negotiation to Cloudflare's zone-level Markdown for Agents feature, avoiding repository-owned conversion or routing code. The feature requires a paid plan and was inactive on the current Free plan, so ADR-028 replaced it with a repository-owned worker.
