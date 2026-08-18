---
"@xtarterize/core": minor
---

Add timeout to plugin dynamic imports to prevent CLI hanging on slow or broken plugins

Plugins that fail to load within 10 seconds now time out gracefully instead of
blocking the entire CLI. This prevents denial-of-service via malicious or
misconfigured plugins that execute infinite loops or block on I/O during module
evaluation.
