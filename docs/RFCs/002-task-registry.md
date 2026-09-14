# RFC-002: Using shadcn CLI as a Task Template Delivery Mechanism

**Status:** Rejected
**Date:** 2026-06-27

## Proposal

Evaluate whether `shadcn add` could deliver xtarterize task templates, replacing templates built into the npm package with files fetched from a registry and wrapped in the existing check, dry-run, and backup pipeline.

## Rejection

Rejected. Only a small number of templates are fully static; most interpolate the detected package manager or render conditionally from the project profile, and shadcn registry items cannot express either. The integration would also mean shelling out to a second CLI, parsing terminal output for check and dry-run results, handling missing installations and version drift, and re-adding templating after download. That cost exceeds shipping a few static files inline.

Dynamic rendering driven by project detection is xtarterize's value, not an obstacle to route around. If templates ever need to live outside the npm package, distributing them as code with logic is the better direction; the shadcn CLI itself is not a fit. ADR 037 later removed external task packages as a supported extension point, so the rejection stands.

## References

- [shadcn registry documentation](https://ui.shadcn.com/docs/registry)
- [GitHub registry mode](https://ui.shadcn.com/docs/registry/github)
