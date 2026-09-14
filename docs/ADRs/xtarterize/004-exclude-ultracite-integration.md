# ADR-004: Exclude Ultracite Integration

**Status:** Superseded by [ADR-020](020-ultracite-integration.md)
**Date:** 2026-04-29

xtarterize did not manage Ultracite because Ultracite has its own CLI and initialization flow, and wrapping it would duplicate those responsibilities. ADR-020 replaced this boundary once Ultracite shipped first-class presets that xtarterize could install and extend.
