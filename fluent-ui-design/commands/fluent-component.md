---
name: fluent-ui-design:component
description: Scaffold a new React component using Fluent UI v9 best practices — makeStyles, tokens, slots, accessibility, and TypeScript.
argument-hint: "<ComponentName> [--variant=<default|compact|hero>] [--with-story]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
---

# Scaffold a Fluent UI Component

Create a new React component following Fluent UI v9 conventions.

## Arguments

- `<ComponentName>` — PascalCase component name (e.g., `UserCard`, `MetricPanel`)
- `--variant=<name>` — Add named variant styles
- `--with-story` — Generate a Storybook story file

## Workflow

1. **Determine component location**: Find the project's component directory pattern

2. **Create component file** (`<ComponentName>.tsx`):
   - TypeScript props interface
   - `makeStyles` with design tokens
   - `mergeClasses` for conditional styles
   - Proper ARIA attributes
   - Forward ref support

3. **Create index export** (if barrel file pattern exists)

4. **If `--with-story`**: Create `<ComponentName>.stories.tsx`

5. **Read reference**: Load `${CLAUDE_PLUGIN_ROOT}/skills/fluent-design-system/references/component-catalog.md` for composition guidance

## Component Template Structure

```
ComponentName/
├── ComponentName.tsx        # Component implementation
├── ComponentName.styles.ts  # Styles (if separate file pattern)
├── ComponentName.types.ts   # Types (if separate file pattern)
├── ComponentName.stories.tsx # Storybook story (if --with-story)
└── index.ts                 # Barrel export
```

## Quality Checklist

- [ ] All visual values use Fluent tokens
- [ ] Props interface is exported
- [ ] Component supports light/dark/high-contrast themes
- [ ] Keyboard accessible
- [ ] ARIA attributes present
- [ ] Responsive styles included
- [ ] Loading/error states handled (if applicable)
