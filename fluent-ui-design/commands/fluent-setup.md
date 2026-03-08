---
name: fluent-ui-design:setup
description: Set up a new or existing project with Fluent UI React v9, including FluentProvider, theme configuration, and Teams SDK integration.
argument-hint: "[--teams] [--next] [--vite] [--theme=<brand-color>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
---

# Set Up Fluent UI React v9

Initialize or configure a project with Fluent UI React v9.

## Arguments

- `--teams` — Include Teams SDK and theme switching
- `--next` — Configure for Next.js (SSR support)
- `--vite` — Configure for Vite
- `--theme=<hex>` — Generate custom brand theme from hex color (e.g., `--theme=#E74C3C`)

## Workflow

1. **Check existing project**: Look for `package.json`, determine framework (React, Next.js, Vite, CRA)

2. **Install dependencies**:
   ```bash
   npm install @fluentui/react-components @fluentui/react-icons
   ```
   If `--teams`: also install `@microsoft/teams-js`

3. **Create theme file** (`src/theme.ts`):
   - If `--theme` provided, generate custom BrandVariants + light/dark themes
   - Otherwise, use `webLightTheme` / `webDarkTheme`
   - If `--teams`, include `teamsLightTheme` / `teamsDarkTheme` / `teamsHighContrastTheme`

4. **Wrap app in FluentProvider**:
   - Edit the root component (App.tsx, layout.tsx, main.tsx)
   - Add `<FluentProvider theme={theme}>` wrapper
   - If `--teams`, add theme change handler

5. **Configure SSR** (if `--next`):
   - Add `createDOMRenderer`, `RendererProvider`, `SSRProvider`

6. **Verify setup**:
   - Render a simple Fluent `<Button appearance="primary">It works!</Button>`
   - Confirm tokens are accessible

## Output

Report:
- Packages installed
- Files created/modified
- Theme configuration
- Next steps for the developer
