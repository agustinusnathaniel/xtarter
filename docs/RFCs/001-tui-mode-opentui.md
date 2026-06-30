# RFC-001: TUI Mode with OpenTUI

**Status:** Draft  
**Date:** 2026-05-14

## Summary

Introduce an optional `--tui` flag to xtarterize that launches a full-screen terminal interface built with [OpenTUI](https://opentui.com) - a native Zig-core TUI library with TypeScript bindings from the same org that builds OpenCode. The default CLI experience remains unchanged.

## Motivation

xtarterize currently uses `@clack/prompts` for all user interaction - linear prompts that work well for simple yes/no and single-select flows. As xtarterize grows, several interactions would benefit from a richer interface:

| Interaction                      | Current (text prompts)      | Desired                                    |
| -------------------------------- | --------------------------- | ------------------------------------------ |
| Browsing diffs before applying   | Plain text dump in terminal | Scrollable, syntax-highlighted diff viewer |
| Selecting tasks during `init`    | Flat checkbox list          | Searchable multi-select with preview pane  |
| Viewing `doctor`/`check` results | Wall of text                | Dashboard with visual status indicators    |
| Guided setup wizards             | Sequential prompts          | Multi-panel layout with navigation         |

Rather than incrementally bolting interactive elements onto the current prompt system, a TUI mode provides a clean separation - the default CLI stays fast and minimal, while `--tui` unlocks the rich interface.

## What is OpenTUI

[OpenTUI](https://opentui.com) | [GitHub](https://github.com/anomalyco/opentui)

| Property             | Details                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------ |
| **Core**             | Native Zig, exposes C ABI                                                                  |
| **Bindings**         | TypeScript (imperative), React (reconciler), Solid.js (reconciler)                         |
| **Components**       | Text, Box, Input, Select, TabSelect, ScrollBox, Code (tree-sitter), Diff, Markdown, Slider |
| **Layout**           | Yoga flexbox, CSS-like properties                                                          |
| **Distribution**     | `@opentui/core` on npm - ships prebuilt native binaries per platform                       |
| **Dev toolchain**    | Bun + Zig                                                                                  |
| **Runtime**          | Bun-exclusive currently; Node/Deno support in-progress                                     |
| **Version**          | v0.2.9 (pre-1.0)                                                                           |
| **Production users** | OpenCode, terminal.shop                                                                    |

Key capabilities it brings that `@clack/prompts` cannot:

- **Persistent full-screen layout** - composable component tree, not linear prompts
- **ScrollBox** - scrollable content regions
- **Code/Diff** - tree-sitter syntax highlighting for config file previews
- **Flexbox layout** - multi-panel dashboards
- **Focus management** - keyboard-driven navigation
- **Rich components** - TabSelect, Slider, Markdown rendering

## Important Clarification: Native Addon vs Bun Runtime

OpenTUI's npm package (`@opentui/core`) ships **prebuilt native binaries** per platform. End-users install it like any other npm package - they don't need Bun or Zig. The "Bun-only" restriction applies to the **development toolchain** (building from source, running examples), not to the published package.

The open question is whether the native addon works reliably when loaded from a **Node.js process** (as opposed to Bun). The project lists Node/Deno support as "in-progress." If Node.js compatibility is solid, there's zero runtime friction. If not, TUI mode would require Bun as a runtime - a significant adoption barrier.

## Design

### Entry Point

```
xtarterize --tui                    # Auto-detect and show TUI
xtarterize init --tui               # TUI for init flow
xtarterize doctor --tui             # TUI dashboard for project health
```

The `--tui` flag works with any subcommand. Non-TUI args (like `--cwd`) compose naturally:

```
xtarterize init --tui --cwd ../other-project
```

The flag is position-independent and parsed before command dispatch.

### Package Boundary

OpenTUI should **not** be a dependency of the main `xtarterize` package. The TUI lives in its own package to keep the core CLI free of native dependencies. Two options:

**Option A: Separate app (`apps/xtarterize-tui`)**

```
apps/
  xtarterize/          # Existing CLI - no changes
  xtarterize-tui/      # New TUI binary
```

- `xtarterize --tui` shell-execs the separate binary
- Clean isolation - native deps stay out of the main package
- Can be installed independently or auto-installed on first `--tui` use
- More distribution complexity

**Option B: Internal package dependency**

```
packages/
  @xtarterize/tui/     # TUI components + entry points
apps/
  xtarterize/          # Depends on @xtarterize/tui as optional dep
```

- Single binary entrypoint
- OpenTUI is an optional peer dependency - installs only if user opts in
- Tighter coupling but simpler distribution

### Component Tree (Conceptual)

```typescript
// apps/xtarterize-tui/src/app.tsx (React bindings)
function App({ project }) {
  const [tab, setTab] = useState<'tasks' | 'doctor' | 'diff'>('tasks')

  return (
    <Box flexDirection="column" height="100%">
      <Header project={project} />
      <TabSelect value={tab} onChange={setTab}
        tabs={['Tasks', 'Doctor', 'Diff']}
      />
      {tab === 'tasks' && <TaskView project={project} />}
      {tab === 'doctor' && <DoctorView project={project} />}
      {tab === 'diff' && <DiffView project={project} />}
      <StatusBar />
    </Box>
  )
}
```

### Error Handling

- If `--tui` is passed but OpenTUI isn't installed, print a clear message with install instructions
- If the native addon fails to load (wrong platform, missing libs), fall back to the standard CLI
- Graceful exit on `Ctrl+C` and `Escape`

## Key Trade-offs

### Pros

- **Differentiated UX** - xtarterize stands out among config scaffolding tools
- **Reuse of Anomaly ecosystem** - same org, shared patterns with OpenCode
- **Clean separation** - default CLI unchanged, TUI is opt-in
- **React bindings** - familiar mental model for most web developers
- **Rich interaction** - diff previews, searchable selects, dashboards

### Cons

- **Native addon** - larger install, platform build matrix, potential platform bugs
- **Pre-1.0 dependency** - OpenTUI is still evolving; breaking changes expected
- **Contributor friction** - TUI work requires Bun + Zig (main toolchain is pnpm)
- **Node.js compatibility uncertain** - if it requires Bun runtime, adoption plummets
- **Maintenance surface** - two interaction modes to test and support

## Open Questions

1. **React vs Solid vs imperative?** OpenTUI has all three bindings. React has the widest contributor familiarity. Solid is more performant for high-frequency updates. The imperative API is simplest but verbose.
2. **Node.js compatibility?** Someone needs to verify `@opentui/core` works when loaded from Node before committing to this approach.
3. **Testing strategy?** How do we write automated tests for TUI interactions? Snapshot rendering? Terminal emulation (node-pty)?
4. **What's the cut line?** Which interactions justify the TUI complexity? All of them, or just a few key flows (init, doctor)?
5. **Mouse support?** OpenTUI supports mouse events. xtarterize currently doesn't use any mouse interaction.
6. **Minimum OpenTUI version?** What's the earliest version that has all the features we need?
7. **Bundle size budget?** What's the acceptable install size increase for the TUI package?
8. **Separate npm package?** Should `@xtarterize/tui` be published separately so other CLI tools could reuse it?

## Alternatives Considered

### Keep using @clack/prompts only

Simplest path. But the interaction patterns will always be constrained - no multi-panel layouts, no scrollable diffs, no real-time updates.

### Use Ink (React for CLI)

Ink uses React reconciliation for terminal output but has no native core, no tree-sitter, and no flexbox layout engine. It's also less actively maintained than OpenTUI.

### Build on Blessed/Blessed-contrib

Mature but unmaintained. No React bindings, no tree-sitter, no flexbox. Feels like building on a deprecated foundation.

### Use a web-based approach (local server + browser)

Overkill for a CLI tool. User would need to open a browser. Breaks the terminal-native experience.

## Decision

No decision yet. This RFC is open for discussion. Key milestones before a decision:

1. [ ] Verify `@opentui/core` works from Node.js on all target platforms (linux-x64, darwin-arm64, darwin-x64)
2. [ ] Build a minimal prototype - `xtarterize doctor --tui` with a dashboard view
3. [ ] Measure install size impact of `@opentui/core`
4. [ ] Resolve open questions above

## References

- [OpenTUI documentation](https://opentui.com/docs/getting-started)
- [OpenTUI GitHub](https://github.com/anomalyco/opentui)
- [OpenCode](https://opencode.ai) - production user of OpenTUI
- [@clack/prompts](https://github.com/natemoo-re/clack) - current xtarterize prompt library
