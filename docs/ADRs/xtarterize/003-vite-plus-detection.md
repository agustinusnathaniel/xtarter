# ADR-003: Vite+ Detection Without Tooling Assumptions

**Status:** Superseded by [ADR-014](014-vite-plus-migration.md)
**Date:** 2026-04-17

Vite+ usage was detected from dependencies and exposed as a profile boolean, on the position that detection should not gate linting or force Vite+ commands into scripts and CI. ADR-014 reversed the linting and script parts: Vite+ projects get the Vite Plus linting stack and `vp` scripts by default, while a project that already uses Biome keeps it. Type checking is still not gated on Vite+.
