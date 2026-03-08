---
name: fluent-ui-design:layout
description: Generate a responsive layout pattern using Fluent 2 grid system, breakpoints, and spacing tokens.
argument-hint: "<pattern> [--breakpoints] [--teams-panel]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
---

# Generate Fluent Layout

Create a responsive layout using Fluent 2 design patterns.

## Arguments

- `<pattern>` — Layout pattern: `dashboard`, `master-detail`, `form`, `card-grid`, `sidebar-nav`, `split-view`
- `--breakpoints` — Include all 6 breakpoint adaptations
- `--teams-panel` — Constrain to Teams side panel (280-320px)

## Workflow

1. **Read layout references**:
   - `${CLAUDE_PLUGIN_ROOT}/skills/fluent-design-system/examples/layout-patterns.md`
   - `${CLAUDE_PLUGIN_ROOT}/skills/fluent-design-system/references/advanced-patterns.md`

2. **Generate layout structure**:
   - makeStyles with Fluent tokens
   - Grid/flexbox with proper spacing
   - Responsive media queries for breakpoints
   - Touch target compliance

3. **Apply Fluent spacing hierarchy**:
   - Component spacing: 4-8px
   - Pattern spacing: 8-16px
   - Layout spacing: 16-48px

4. **Include responsive behavior**:
   | Breakpoint | Adaptation |
   |---|---|
   | small (320px) | Single column, stacked |
   | medium (480px) | Compact, minimal chrome |
   | large (640px) | 2-column, sidebar collapses |
   | x-large (1024px) | Full layout, sidebar visible |
   | xx-large (1366px) | Wide spacing, larger gutters |
   | xxx-large (1920px) | Max-width container, extra space |

## Output

- Complete makeStyles with responsive tokens
- JSX structure skeleton
- Breakpoint behavior documentation
