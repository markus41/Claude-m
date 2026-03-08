---
name: fluent-ui-design:tokens
description: Look up Fluent 2 design token values and usage — color, spacing, typography, shadow, motion, and border-radius tokens.
argument-hint: "<token-category> [--theme=<light|dark|teams>]"
allowed-tools:
  - Read
  - Glob
  - Grep
---

# Look Up Fluent Design Tokens

Query the Fluent 2 design token catalog for specific values and usage guidance.

## Arguments

- `<token-category>` — One of: `color`, `spacing`, `typography`, `shadow`, `motion`, `radius`, `stroke`, `all`
- `--theme=<theme>` — Show values for specific theme (light, dark, teams)

## Workflow

1. **Read token reference**: Load `${CLAUDE_PLUGIN_ROOT}/skills/fluent-design-system/references/design-tokens-reference.md`

2. **Filter by category**: Show only the requested token category

3. **Include usage guidance**: For each token, show:
   - Token name (as used in code: `tokens.tokenName`)
   - Value in requested theme
   - When to use it
   - Common mistakes to avoid

4. **Show code example**: Demonstrate token usage in makeStyles

## Quick Reference

### Token Import

```tsx
import { tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  root: {
    color: tokens.colorNeutralForeground1,
    padding: tokens.spacingHorizontalM,
    fontSize: tokens.fontSizeBase300,
    borderRadius: tokens.borderRadiusMedium,
    boxShadow: tokens.shadow4,
  },
});
```
