---
name: fluent-ui-design:theme
description: Generate a custom Fluent 2 theme with brand ramp from a primary color, including light, dark, and high-contrast variants.
argument-hint: "<primary-hex-color> [--name=<ThemeName>] [--teams]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
---

# Generate Custom Fluent Theme

Create a complete custom Fluent 2 theme from a brand color.

## Arguments

- `<primary-hex-color>` — Primary brand color (e.g., `#5B5FC7`)
- `--name=<ThemeName>` — Theme name prefix (e.g., `contoso` → `contosoLightTheme`)
- `--teams` — Include Teams theme variants

## Workflow

1. **Parse the primary color**: Extract HSL values from the hex code

2. **Generate 16-shade brand ramp**: Create BrandVariants from shade 10 (darkest) to 160 (lightest)

3. **Read theme reference**: Load `${CLAUDE_PLUGIN_ROOT}/skills/fluent-design-system/examples/theme-examples.md`

4. **Create theme file** (`src/theme.ts` or specified location):
   - `BrandVariants` constant
   - Light theme via `createLightTheme(brand)`
   - Dark theme via `createDarkTheme(brand)` with foreground overrides
   - If `--teams`: Teams-compatible theme variants

5. **Validate contrast**: Check that:
   - White text on brand[80] meets 4.5:1 (WCAG AA)
   - Brand foreground on white meets 4.5:1
   - Dark theme brand foreground (shade 110) on dark background meets 4.5:1

6. **Output summary**: Report the brand ramp, contrast ratios, and usage instructions

## Output

```typescript
// Generated theme file
export const customBrand: BrandVariants = { ... };
export const customLightTheme: Theme = createLightTheme(customBrand);
export const customDarkTheme: Theme = { ...createDarkTheme(customBrand), ... };
```
