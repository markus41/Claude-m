---
name: fluent-ui-design:audit
description: Audit a React project for Fluent 2 design system compliance — token usage, accessibility, theming, and component best practices.
argument-hint: "[--fix] [--strict]"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Edit
  - Bash
---

# Audit Fluent UI Compliance

Scan a React project for Fluent 2 design system violations and best practices.

## Arguments

- `--fix` — Automatically fix simple violations (hardcoded values → tokens)
- `--strict` — Flag warnings as errors

## Audit Categories

### 1. Hardcoded Values (Critical)
Search for:
- Hex colors in styles (`#FFFFFF`, `#000`, `rgb(...)`)
- Pixel values for spacing/sizing not using tokens
- Font family strings not using `tokens.fontFamilyBase`
- Hardcoded border-radius values
- Hardcoded shadow/box-shadow values

### 2. Theme Compliance
Check for:
- FluentProvider wrapping the app root
- Theme prop properly set
- Dark mode support (are both themes defined?)
- High contrast theme support
- No inline styles for theme-dependent values

### 3. Accessibility
Check for:
- `aria-label` on icon-only buttons
- Proper `role` attributes on interactive elements
- `tabIndex` usage (avoid positive values)
- Focus management in dialogs/drawers
- Color contrast ratio compliance
- `prefers-reduced-motion` media queries

### 4. Component Usage
Check for:
- Fluent v8 imports (`@fluentui/react`) — should be v9
- Direct DOM elements where Fluent components exist (custom `<button>` vs Fluent `<Button>`)
- Missing component props (e.g., `appearance`, `size`)
- Deprecated component APIs

### 5. Styling Patterns
Check for:
- Using `style={}` instead of `makeStyles`
- CSS files with values that should be tokens
- Missing `mergeClasses` for conditional styles
- Unused makeStyles definitions
- Shorthands not used where applicable

### 6. Bundle Optimization
Check for:
- Barrel imports from `@fluentui/react-components` (OK — it's tree-shakeable)
- Duplicate icon imports (regular + filled without `bundleIcon`)
- Large component imports that could be lazy-loaded

## Workflow

1. **Scan files**: Glob for `**/*.{tsx,ts,jsx,js,css,scss}`

2. **Run audit checks**: For each file, run all category checks

3. **Report findings**:
   ```
   AUDIT RESULTS
   ═════════════
   ❌ Critical: 3 hardcoded colors found
   ⚠️ Warning: 2 missing aria-labels
   ✅ Pass: FluentProvider configured
   ✅ Pass: No Fluent v8 imports

   Details:
   src/components/Card.tsx:15 — Hardcoded #333333 → use tokens.colorNeutralForeground1
   src/components/Card.tsx:22 — Hardcoded 16px padding → use tokens.spacingHorizontalL
   ...
   ```

4. **If `--fix`**: Apply automatic fixes for straightforward violations

## Output

- Summary: pass/fail/warning counts per category
- Detailed findings with file:line references
- Suggested fixes with token replacements
- Overall compliance score
