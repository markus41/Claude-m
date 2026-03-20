---
name: Fluent UI Griffel Styling
description: >
  Deep knowledge of Griffel CSS-in-JS for Fluent UI React v9 — makeStyles, makeResetStyles,
  shorthands, mergeClasses, conditional styles, AOT compilation (webpack + Vite), selector
  performance, RTL support, icon styling, slot-based styling, CSS variables, and DevTools.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - griffel
  - makeStyles
  - makeResetStyles
  - griffel aot
  - griffel webpack
  - griffel vite
  - css-in-js fluent
  - atomic css fluent
  - fluent styling
  - mergeClasses
  - fluent makeStyles
  - fluent griffel
  - griffel shorthands
  - griffel performance
---

# Griffel CSS-in-JS — Fluent UI React v9 Styling Engine

## 1. Overview

Griffel is the atomic CSS-in-JS engine that powers every Fluent UI React v9 component. It was
purpose-built by the Fluent team to solve the performance and determinism problems of traditional
CSS-in-JS libraries (styled-components, Emotion) at the scale of Microsoft 365.

**Key characteristics:**

- **Atomic CSS output** — Each CSS property/value pair becomes a single, reusable class name.
  `color: 'red'` always produces the same atomic class everywhere it appears. This means the CSS
  stylesheet grows logarithmically, not linearly, as an app scales.
- **Zero-runtime with AOT** — When ahead-of-time compilation is configured (webpack or Vite plugin),
  Griffel extracts all styles at build time. The runtime cost drops to near zero: no style injection,
  no `<style>` tag management, no CSSOM mutations.
- **Deterministic specificity** — Because every rule is a single property in a single atomic class,
  specificity conflicts are impossible. The last class in the HTML `class` attribute wins, and
  `mergeClasses()` handles the deduplication.
- **RTL automatic flipping** — Griffel integrates `rtl-css-js` so logical properties like
  `paddingLeft` automatically become `paddingRight` when the document direction is RTL. No manual
  work required.
- **Full TypeScript support** — All style objects are fully typed. The compiler catches invalid CSS
  properties and values at development time.

**Core packages:**

| Package | Purpose |
|---|---|
| `@griffel/react` | Main runtime — `makeStyles`, `makeResetStyles`, `mergeClasses`, `shorthands` |
| `@griffel/webpack-extraction-plugin` | AOT extraction for webpack |
| `@griffel/vite-plugin` | AOT extraction for Vite |
| `@griffel/babel-preset` | Babel preset for AOT (used internally by webpack/Vite plugins) |
| `@griffel/core` | Framework-agnostic core (for non-React usage) |
| `@griffel/devtools` | Browser extension for inspecting atomic classes |

**Why not Emotion / styled-components / Tailwind?**

Fluent UI chose Griffel because:
1. Atomic CSS keeps stylesheet size constant regardless of component count.
2. Build-time extraction eliminates runtime overhead entirely.
3. Deterministic ordering removes the cascade-dependent bugs that plague Emotion.
4. Full TypeScript integration catches styling errors before they ship.
5. The same engine works in SSR, SSG, and CSR without hydration mismatches.

**Reference:**
- GitHub: https://github.com/microsoft/griffel
- Video: https://learn.microsoft.com/en-us/shows/fluent-ui-insights/fluent-ui-insights-griffel

---

## 2. Core APIs

### 2.1 makeStyles

`makeStyles` is the primary styling API. It accepts an object where each key is a named style slot,
and each value is a CSS-in-JS style object. It returns a React hook that produces class name strings.

```tsx
import { makeStyles, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    // Each property becomes its own atomic CSS class:
    // .fe3e8s9 { display: flex; }
    // .f22iagw { align-items: center; }
    // .fk6fouc { background-color: var(--colorNeutralBackground1); }
    // .f1a7mspl { color: var(--colorNeutralForeground1); }
  },
  icon: {
    fontSize: '20px',
    marginRight: tokens.spacingHorizontalS,
  },
  label: {
    fontWeight: tokens.fontWeightSemibold,
    lineHeight: tokens.lineHeightBase300,
  },
});

function MyComponent() {
  const styles = useStyles();
  return (
    <div className={styles.root}>
      <span className={styles.icon}>*</span>
      <span className={styles.label}>Hello</span>
    </div>
  );
}
```

**How it works internally:**

1. At call time (or build time with AOT), Griffel converts each CSS property/value pair into a
   deterministic hash-based class name.
2. The hook returns an object where each key maps to a space-separated string of atomic class names.
3. Applying `styles.root` to `className` inserts all the atomic classes for that slot.

**Supported style properties:**

All standard CSS properties are supported in camelCase form:
- Layout: `display`, `position`, `top`, `right`, `bottom`, `left`, `zIndex`, `float`, `clear`
- Flexbox: `flexDirection`, `flexWrap`, `justifyContent`, `alignItems`, `alignSelf`, `flexGrow`,
  `flexShrink`, `flexBasis`, `order`
- Grid: `gridTemplateColumns`, `gridTemplateRows`, `gridColumn`, `gridRow`, `gridGap`,
  `gridAutoFlow`, `gridAutoColumns`, `gridAutoRows`
- Box model: `width`, `height`, `minWidth`, `maxWidth`, `minHeight`, `maxHeight`, `boxSizing`
- Typography: `fontSize`, `fontWeight`, `fontFamily`, `lineHeight`, `letterSpacing`,
  `textAlign`, `textTransform`, `textDecoration`, `whiteSpace`, `wordBreak`, `overflowWrap`
- Visual: `color`, `backgroundColor`, `opacity`, `visibility`, `cursor`, `pointerEvents`
- Borders: `borderTopWidth`, `borderTopStyle`, `borderTopColor` (and all sides)
- Spacing: `paddingTop`, `paddingRight`, `paddingBottom`, `paddingLeft`, `marginTop`, etc.
- Shadows: `boxShadow`, `textShadow`
- Transforms: `transform`, `transformOrigin`, `transition`, `transitionDuration`,
  `transitionProperty`, `transitionTimingFunction`
- Animations: `animationName`, `animationDuration`, `animationTimingFunction`,
  `animationIterationCount`, `animationDirection`, `animationFillMode`
- Overflow: `overflowX`, `overflowY`
- Miscellaneous: `outline`, `outlineWidth`, `outlineStyle`, `outlineColor`, `outlineOffset`,
  `listStyleType`, `content`, `userSelect`, `scrollBehavior`, `resize`

### 2.2 makeResetStyles

`makeResetStyles` creates a **single non-atomic class** that applies a bundle of styles together.
Use it for base/reset styles where atomicity is unnecessary overhead.

```tsx
import { makeResetStyles, tokens } from '@fluentui/react-components';

const useBaseClass = makeResetStyles({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '44px',
  padding: '0 16px',      // CSS shorthand is OK in makeResetStyles
  borderRadius: tokens.borderRadiusMedium,
  fontFamily: tokens.fontFamilyBase,
  fontSize: tokens.fontSizeBase300,
  lineHeight: tokens.lineHeightBase300,
  backgroundColor: tokens.colorNeutralBackground1,
  color: tokens.colorNeutralForeground1,
  border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke1}`,
  cursor: 'pointer',
  transitionDuration: tokens.durationNormal,
  transitionProperty: 'background-color, border-color, color',
  ':hover': {
    backgroundColor: tokens.colorNeutralBackground1Hover,
  },
  ':active': {
    backgroundColor: tokens.colorNeutralBackground1Pressed,
  },
});
```

**When to use `makeResetStyles` vs `makeStyles`:**

| Scenario | Use |
|---|---|
| Component variant styles applied conditionally | `makeStyles` |
| Base reset/normalization styles always applied | `makeResetStyles` |
| Styles that other components will override via `mergeClasses` | `makeStyles` (atomic wins) |
| Complex selectors with many properties in a single rule | `makeResetStyles` |

**Critical difference:** `makeResetStyles` outputs a **single class** with all properties. This means
it has **lower specificity** than atomic `makeStyles` classes (which each target one property). When
you `mergeClasses(baseClass, atomicStyles.variant)`, the atomic class will override the reset class
for any conflicting properties. This is by design and is the recommended composition pattern.

### 2.3 shorthands

CSS shorthands like `padding: '8px 16px'` cannot be decomposed into atomic classes because they set
multiple properties at once. Griffel provides `shorthands.*` functions that expand them into their
longhand equivalents so each can become its own atomic class.

```tsx
import { makeStyles, shorthands } from '@fluentui/react-components';

const useStyles = makeStyles({
  root: {
    // WRONG: CSS shorthands in makeStyles
    // padding: '8px 16px',           // Will NOT work correctly
    // border: '1px solid red',       // Will NOT work correctly
    // borderRadius: '4px',           // Will NOT work correctly

    // CORRECT: Use shorthands.* functions
    ...shorthands.padding('8px', '16px'),
    // Expands to: paddingTop: '8px', paddingRight: '16px',
    //             paddingBottom: '8px', paddingLeft: '16px'

    ...shorthands.border('1px', 'solid', 'red'),
    // Expands to: borderTopWidth: '1px', borderTopStyle: 'solid',
    //             borderTopColor: 'red', ... (all four sides)

    ...shorthands.borderRadius('4px'),
    // Expands to: borderTopLeftRadius: '4px', borderTopRightRadius: '4px',
    //             borderBottomRightRadius: '4px', borderBottomLeftRadius: '4px'
  },
});
```

**Complete `shorthands.*` function list:**

| Function | Expands to | Signature |
|---|---|---|
| `shorthands.border(width, style, color)` | All border longhand props | `(width?, style?, color?)` |
| `shorthands.borderLeft(width, style, color)` | `borderLeftWidth`, `borderLeftStyle`, `borderLeftColor` | `(width?, style?, color?)` |
| `shorthands.borderRight(width, style, color)` | Same for right side | `(width?, style?, color?)` |
| `shorthands.borderTop(width, style, color)` | Same for top side | `(width?, style?, color?)` |
| `shorthands.borderBottom(width, style, color)` | Same for bottom side | `(width?, style?, color?)` |
| `shorthands.borderColor(top, right, bottom, left)` | All four `border*Color` props | `(top, right?, bottom?, left?)` |
| `shorthands.borderStyle(top, right, bottom, left)` | All four `border*Style` props | `(top, right?, bottom?, left?)` |
| `shorthands.borderWidth(top, right, bottom, left)` | All four `border*Width` props | `(top, right?, bottom?, left?)` |
| `shorthands.borderRadius(topLeft, topRight, bottomRight, bottomLeft)` | All four `border*Radius` props | `(topLeft, topRight?, bottomRight?, bottomLeft?)` |
| `shorthands.padding(top, right, bottom, left)` | All four `padding*` props | `(top, right?, bottom?, left?)` |
| `shorthands.margin(top, right, bottom, left)` | All four `margin*` props | `(top, right?, bottom?, left?)` |
| `shorthands.gap(row, column)` | `rowGap`, `columnGap` | `(row, column?)` |
| `shorthands.overflow(x, y)` | `overflowX`, `overflowY` | `(x, y?)` |
| `shorthands.flex(grow, shrink, basis)` | `flexGrow`, `flexShrink`, `flexBasis` | `(grow, shrink?, basis?)` |
| `shorthands.gridArea(rowStart, colStart, rowEnd, colEnd)` | Grid placement props | `(rowStart, colStart?, rowEnd?, colEnd?)` |
| `shorthands.inset(top, right, bottom, left)` | `top`, `right`, `bottom`, `left` | `(top, right?, bottom?, left?)` |
| `shorthands.outline(width, style, color)` | `outlineWidth`, `outlineStyle`, `outlineColor` | `(width?, style?, color?)` |
| `shorthands.textDecoration(line, style, color, thickness)` | Text decoration longhands | `(line, style?, color?, thickness?)` |
| `shorthands.transition(property, duration, timingFunction, delay)` | Transition longhands | `(property, duration?, timingFunction?, delay?)` |

**Argument pattern:** All `shorthands.*` functions follow CSS shorthand argument conventions:
- 1 arg: applies to all sides
- 2 args: vertical/horizontal
- 3 args: top / horizontal / bottom
- 4 args: top / right / bottom / left

### 2.4 mergeClasses

`mergeClasses` deduplicates and composes atomic class names. It is the **only correct way** to combine
Griffel class names.

```tsx
import { mergeClasses } from '@fluentui/react-components';

function MyButton({ primary, disabled, className }: Props) {
  const styles = useStyles();
  const baseClass = useBaseClass();

  return (
    <button
      className={mergeClasses(
        baseClass,
        styles.root,
        primary && styles.primary,
        disabled && styles.disabled,
        className  // Allow parent to override styles
      )}
    />
  );
}
```

**How `mergeClasses` works:**

1. It receives any number of arguments (strings, undefined, false, null — falsy values are skipped).
2. For each atomic class, it tracks which CSS property it targets.
3. When two classes target the same property, the **later one wins** (last-write-wins semantics).
4. It returns a single, deduplicated space-separated class string.

**Critical rules:**
- **Never concatenate strings:** `` `${styles.root} ${styles.icon}` `` breaks deduplication.
  Always use `mergeClasses(styles.root, styles.icon)`.
- **Use `mergeClasses` only once per element:** Do not nest `mergeClasses(mergeClasses(...), ...)`.
  Pass all classes to a single call.
- **Always include the external `className` prop last** so parent components can override child styles.

---

## 3. Nine Critical Rules for Griffel

These are the non-negotiable rules for correct Griffel usage. Violating any of them produces bugs
that are difficult to diagnose.

### Rule 1: Never Concatenate Classes — Always mergeClasses()

```tsx
// WRONG — breaks atomic deduplication
<div className={`${styles.root} ${styles.active}`} />
<div className={styles.root + ' ' + styles.active} />
<div className={[styles.root, styles.active].join(' ')} />

// CORRECT
<div className={mergeClasses(styles.root, styles.active)} />
```

When you concatenate strings, two atomic classes targeting the same CSS property (e.g., `color`)
both remain in the class list. Which one wins depends on their insertion order in the stylesheet,
which is non-deterministic. `mergeClasses` resolves this by keeping only the last class for each
property.

### Rule 2: Avoid !important

`!important` defeats the entire atomic CSS model. It cannot be overridden by `mergeClasses`,
it breaks component composition, and it prevents parent components from customizing child styles.

```tsx
// WRONG
const useStyles = makeStyles({
  root: {
    color: 'red !important',  // Breaks the atomic model
  },
});

// CORRECT — use mergeClasses ordering to control precedence
<div className={mergeClasses(styles.base, styles.override)} />
```

### Rule 3: Use Tokens Over Direct Colors

Hardcoded colors break theming, dark mode, and high-contrast mode. Always use Fluent design tokens.

```tsx
// WRONG
const useStyles = makeStyles({
  root: {
    color: '#333333',
    backgroundColor: 'white',
  },
});

// CORRECT
const useStyles = makeStyles({
  root: {
    color: tokens.colorNeutralForeground1,
    backgroundColor: tokens.colorNeutralBackground1,
  },
});
```

### Rule 4: Avoid Rule Duplication Across Style Objects

Griffel generates one atomic class per unique property/value pair. Duplicating the same property/value
across multiple named slots wastes no CSS bytes (it is the same atomic class), but it clutters your
code and makes maintenance harder.

```tsx
// REDUNDANT — fontSize: '14px' appears in both slots
const useStyles = makeStyles({
  title: { fontSize: '14px', fontWeight: 'bold' },
  subtitle: { fontSize: '14px', fontWeight: 'normal' },
});

// BETTER — shared base, variant-specific overrides
const useStyles = makeStyles({
  text: { fontSize: '14px' },
  bold: { fontWeight: 'bold' },
  normal: { fontWeight: 'normal' },
});

// Usage:
<span className={mergeClasses(styles.text, styles.bold)}>Title</span>
<span className={mergeClasses(styles.text, styles.normal)}>Subtitle</span>
```

### Rule 5: Use mergeClasses Only Once Per Element

Nesting `mergeClasses` calls produces correct output but is wasteful. Flatten all classes into
a single call.

```tsx
// WASTEFUL — double deduplication pass
<div className={mergeClasses(mergeClasses(base, styles.root), styles.active)} />

// CORRECT — single call with all classes
<div className={mergeClasses(base, styles.root, styles.active)} />
```

### Rule 6: No CSS Shorthands in makeStyles — Use shorthands.*

CSS shorthands in `makeStyles` cannot be decomposed into atomic classes. They will either fail
silently or produce incorrect output.

```tsx
// WRONG
const useStyles = makeStyles({
  root: {
    padding: '8px 16px',           // Cannot atomize
    border: '1px solid #ccc',      // Cannot atomize
    borderRadius: '4px',           // Cannot atomize
  },
});

// CORRECT
const useStyles = makeStyles({
  root: {
    ...shorthands.padding('8px', '16px'),
    ...shorthands.border('1px', 'solid', '#ccc'),
    ...shorthands.borderRadius('4px'),
  },
});
```

**Exception:** `makeResetStyles` does accept CSS shorthands because it produces a non-atomic
single class.

### Rule 7: Tag Selectors Are Slow — Prefer className Props

Never style elements by tag name in Griffel selectors. Tag selectors (`> div`, `> span`) are slow
and fragile. Instead, pass `className` directly to child components or use slot objects.

```tsx
// WRONG — tag selector, slow and fragile
const useStyles = makeStyles({
  root: {
    '> div': { color: 'red' },
    '> svg': { fill: 'blue' },
  },
});

// CORRECT — direct className on child
const useStyles = makeStyles({
  root: { /* ... */ },
  childDiv: { color: 'red' },
  childIcon: { color: 'blue' },  // icons use currentColor, so set 'color'
});

<div className={styles.root}>
  <div className={styles.childDiv}>...</div>
  <MyIcon className={styles.childIcon} />
</div>
```

### Rule 8: RTL Auto-Flips Automatically

Griffel uses `rtl-css-js` to automatically flip directional properties when the document direction
is RTL. You do not need (and should not add) manual RTL overrides.

```tsx
const useStyles = makeStyles({
  root: {
    paddingLeft: '16px',   // Automatically becomes paddingRight in RTL
    marginRight: '8px',    // Automatically becomes marginLeft in RTL
    textAlign: 'left',     // Automatically becomes 'right' in RTL
    float: 'left',         // Automatically becomes 'right' in RTL
    borderLeftWidth: '2px', // Automatically becomes borderRightWidth in RTL
  },
});
```

**Properties that auto-flip:**
- `paddingLeft` / `paddingRight`
- `marginLeft` / `marginRight`
- `borderLeftWidth` / `borderRightWidth` (and style, color)
- `left` / `right`
- `textAlign: 'left'` / `'right'`
- `float: 'left'` / `'right'`
- `borderTopLeftRadius` / `borderTopRightRadius` (and bottom)
- `transform: translateX(...)` (value is negated)

**To enable RTL**, set `dir="rtl"` on `FluentProvider`:

```tsx
<FluentProvider theme={teamsLightTheme} dir="rtl">
  <App />
</FluentProvider>
```

### Rule 9: AOT Compilation Eliminates Runtime Overhead

When configured, Griffel's ahead-of-time plugins extract all `makeStyles` and `makeResetStyles` calls
at build time. The resulting CSS is injected via standard `<link>` or `<style>` tags, and the runtime
JavaScript for style computation is tree-shaken away.

See Section 6 below for full configuration details.

---

## 4. Conditional Styles

The recommended pattern for variant/state/size-based styling is to define each variant as a separate
slot in `makeStyles` and compose them with `mergeClasses`.

### Variant-based pattern

```tsx
import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import type { ButtonProps } from './types';

const useStyles = makeStyles({
  root: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '32px',
  },

  // Appearance variants
  primary: {
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    ':hover': {
      backgroundColor: tokens.colorBrandBackgroundHover,
    },
    ':active': {
      backgroundColor: tokens.colorBrandBackgroundPressed,
    },
  },
  secondary: {
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  subtle: {
    backgroundColor: 'transparent',
    color: tokens.colorNeutralForeground2,
    ':hover': {
      backgroundColor: tokens.colorSubtleBackgroundHover,
    },
  },

  // Size variants
  small: {
    minHeight: '24px',
    fontSize: tokens.fontSizeBase200,
    ...shorthands.padding('0', tokens.spacingHorizontalS),
  },
  medium: {
    minHeight: '32px',
    fontSize: tokens.fontSizeBase300,
    ...shorthands.padding('0', tokens.spacingHorizontalM),
  },
  large: {
    minHeight: '40px',
    fontSize: tokens.fontSizeBase400,
    ...shorthands.padding('0', tokens.spacingHorizontalL),
  },

  // State variants
  disabled: {
    backgroundColor: tokens.colorNeutralBackgroundDisabled,
    color: tokens.colorNeutralForegroundDisabled,
    cursor: 'not-allowed',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackgroundDisabled,
    },
  },
});

function MyButton({
  appearance = 'secondary',
  size = 'medium',
  disabled = false,
  className,
  children,
}: ButtonProps) {
  const styles = useStyles();

  const appearanceStyles: Record<string, string> = {
    primary: styles.primary,
    secondary: styles.secondary,
    subtle: styles.subtle,
  };

  const sizeStyles: Record<string, string> = {
    small: styles.small,
    medium: styles.medium,
    large: styles.large,
  };

  return (
    <button
      className={mergeClasses(
        styles.root,
        appearanceStyles[appearance],
        sizeStyles[size],
        disabled && styles.disabled,
        className
      )}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
```

### Boolean state pattern

```tsx
const useStyles = makeStyles({
  root: { /* base */ },
  selected: {
    backgroundColor: tokens.colorNeutralBackground1Selected,
    fontWeight: tokens.fontWeightSemibold,
  },
  focused: {
    outlineWidth: '2px',
    outlineStyle: 'solid',
    outlineColor: tokens.colorStrokeFocus2,
  },
});

function ListItem({ selected, focused, className }: Props) {
  const styles = useStyles();
  return (
    <div
      className={mergeClasses(
        styles.root,
        selected && styles.selected,
        focused && styles.focused,
        className
      )}
    />
  );
}
```

---

## 5. Media Queries and Keyframes

### Media queries

Media queries are supported as nested objects within `makeStyles`:

```tsx
const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',

    '@media (min-width: 640px)': {
      flexDirection: 'row',
    },
    '@media (min-width: 1024px)': {
      maxWidth: '960px',
      marginLeft: 'auto',
      marginRight: 'auto',
    },
    '@media (prefers-reduced-motion: reduce)': {
      transitionDuration: '0.01ms',
      animationDuration: '0.01ms',
    },
    '@media (prefers-color-scheme: dark)': {
      // Prefer using FluentProvider theming over this.
      // Only use for non-themed environments.
      colorScheme: 'dark',
    },
    '@media print': {
      backgroundColor: 'white',
      color: 'black',
    },
  },
});
```

### @supports queries

```tsx
const useStyles = makeStyles({
  root: {
    display: 'flex',
    '@supports (display: grid)': {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    },
  },
});
```

### Keyframe animations

`animationName` accepts a keyframe object (or array of keyframe objects) instead of a string:

```tsx
const useStyles = makeStyles({
  fadeIn: {
    animationName: {
      from: { opacity: 0, transform: 'translateY(-8px)' },
      to: { opacity: 1, transform: 'translateY(0)' },
    },
    animationDuration: tokens.durationNormal,
    animationTimingFunction: tokens.curveDecelerateMax,
    animationFillMode: 'forwards',
  },

  spin: {
    animationName: {
      from: { transform: 'rotate(0deg)' },
      to: { transform: 'rotate(360deg)' },
    },
    animationDuration: '1s',
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite',
  },

  // Multiple keyframes
  pulseAndFade: {
    animationName: [
      {
        '0%': { opacity: 0, transform: 'scale(0.95)' },
        '50%': { opacity: 1, transform: 'scale(1.02)' },
        '100%': { opacity: 1, transform: 'scale(1)' },
      },
    ],
    animationDuration: tokens.durationUltraSlow,
    animationTimingFunction: tokens.curveDecelerateMax,
    animationFillMode: 'forwards',
  },
});
```

---

## 6. AOT Compilation

Ahead-of-time (AOT) compilation is the most impactful optimization for Griffel. It moves all style
computation from runtime to build time, producing static CSS that is injected via `<style>` tags
rather than CSSOM APIs.

**Reference:** https://griffel.js.org/react/ahead-of-time-compilation/introduction/

### Benefits of AOT

1. **Zero runtime style insertion** — No `CSSStyleSheet.insertRule()` calls, no CSSOM mutations.
2. **Smaller JS bundles** — Style objects are replaced with pre-computed class name maps. The Griffel
   runtime is tree-shaken to a minimal size.
3. **Faster hydration** — SSR pages hydrate faster because there is no style re-computation.
4. **Consistent performance** — Style computation cost is paid once at build time, not on every render.
5. **Reduced memory** — No in-memory style cache needed at runtime.

### Webpack Configuration

**Reference:** https://griffel.js.org/react/ahead-of-time-compilation/with-webpack/

```bash
npm install --save-dev @griffel/webpack-extraction-plugin
```

```js
// webpack.config.js
const { GriffelCSSExtractionPlugin } = require('@griffel/webpack-extraction-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  module: {
    rules: [
      // Step 1: Transform makeStyles calls to pre-computed output
      {
        test: /\.(ts|tsx|js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: '@griffel/webpack-extraction-plugin/loader',
          options: {
            // Optional: specify modules that export makeStyles/makeResetStyles
            // Default handles @griffel/react and @fluentui/react-components
          },
        },
      },
      // Step 2: Extract the generated CSS into .css files
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
    ],
  },
  plugins: [
    new GriffelCSSExtractionPlugin(),
    new MiniCssExtractPlugin(),
  ],
};
```

**For Next.js with webpack**, see the `fluent-nextjs` skill which covers the Next.js-specific
configuration including `withGriffelCSSExtraction`.

### Vite Configuration

**Reference:** https://griffel.js.org/react/ahead-of-time-compilation/with-vite/

```bash
npm install --save-dev @griffel/vite-plugin
```

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import griffel from '@griffel/vite-plugin';

export default defineConfig({
  plugins: [
    griffel(),   // Must come before the React plugin
    react(),
  ],
});
```

**Vite plugin options:**

```ts
griffel({
  // Babel configuration for transforming makeStyles calls
  babelOptions: {
    plugins: [],
    presets: [],
  },
  // Module source(s) that export makeStyles/makeResetStyles
  modules: [
    { moduleSource: '@fluentui/react-components', importName: 'makeStyles' },
    { moduleSource: '@griffel/react', importName: 'makeStyles' },
  ],
});
```

### How AOT Works Internally

1. **Parse phase** — The Babel preset finds all `makeStyles()` and `makeResetStyles()` calls.
2. **Evaluate phase** — Style objects are statically evaluated. Token references (CSS variables)
   are preserved as-is; they resolve at runtime through the `FluentProvider`.
3. **Transform phase** — Each style object is converted to its atomic class names. The original
   `makeStyles()` call is replaced with a pre-computed class name lookup.
4. **Extract phase** — The generated CSS rules are extracted into `.css` assets that the bundler
   processes normally (via `css-loader` + `MiniCssExtractPlugin` in webpack, or native CSS handling
   in Vite).

**Before AOT (source):**
```tsx
const useStyles = makeStyles({
  root: {
    color: tokens.colorNeutralForeground1,
    display: 'flex',
  },
});
```

**After AOT (transformed output):**
```tsx
// The makeStyles call is replaced with a pre-computed lookup
const useStyles = __styles({
  root: {
    sj55zd: 'f1a7mspl',   // color → var(--colorNeutralForeground1)
    mc9l5x: 'f22iagw',    // display → flex
  },
}, /* CSS inserted via extracted .css file */);
```

---

## 7. Selector Performance

The following guidance is based on the Fluent UI team's performance work, including insights from
Tiger Oakes' analysis of CSS performance patterns in Fluent UI (https://tigeroakes.com/posts/fluent-ui-css-tricks/).

### Slot-based styling (prefer over child selectors)

Fluent UI components expose styling through **slot objects**, not child selectors. Each slot accepts
a `className` property that lets you style it directly.

```tsx
// WRONG — using child selectors to reach into component internals
const useStyles = makeStyles({
  input: {
    '> .fui-Input__contentBefore': {
      color: 'red',  // Fragile, depends on internal class names
    },
  },
});

// CORRECT — use the slot's className prop
<Input
  contentBefore={{
    className: styles.inputIcon,
    children: <SearchIcon />,
  }}
/>
```

**Key Fluent v9 components with important slots:**

| Component | Notable slots |
|---|---|
| `Input` | `root`, `input`, `contentBefore`, `contentAfter` |
| `Button` | `root`, `icon` |
| `Menu` | `root`, through `MenuList`, `MenuItem` |
| `Dialog` | `root`, through `DialogSurface`, `DialogTitle`, `DialogBody`, `DialogActions` |
| `Card` | `root`, through `CardHeader`, `CardPreview`, `CardFooter` |
| `DataGrid` | `root`, through column-level and cell-level components |
| `Combobox` | `root`, `input`, `listbox`, `expandIcon` |
| `TabList` | `root`, through individual `Tab` components |

### Icon styling

Fluent icons use `fill="currentColor"` in their SVG markup. This means you style icon color with
the CSS `color` property, not `fill`.

```tsx
// WRONG — targeting fill directly
const useStyles = makeStyles({
  icon: {
    fill: 'red',  // Doesn't work; SVG uses currentColor
  },
});

// CORRECT — set color, which flows to currentColor
const useStyles = makeStyles({
  icon: {
    color: tokens.colorBrandForeground1,
    fontSize: '24px',  // Controls icon size
  },
});
```

### Avoid tag selectors

Tag selectors (`> div`, `> span`, `> svg`) match by element type, which is slower than class
selectors and brittle when component internals change.

```tsx
// SLOW and FRAGILE
const useStyles = makeStyles({
  root: {
    '> div': {
      padding: '4px',  // What if the child becomes a <span>?
    },
  },
});

// FAST and STABLE
const useStyles = makeStyles({
  root: { /* ... */ },
  child: { ...shorthands.padding('4px') },
});
```

### Pseudo-selector performance

Griffel supports all CSS pseudo-selectors:

```tsx
const useStyles = makeStyles({
  root: {
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
    ':active': {
      backgroundColor: tokens.colorNeutralBackground1Pressed,
    },
    ':focus-visible': {
      outlineWidth: '2px',
      outlineStyle: 'solid',
      outlineColor: tokens.colorStrokeFocus2,
      outlineOffset: '2px',
    },
    ':first-child': {
      marginTop: '0',
    },
    ':last-child': {
      marginBottom: '0',
    },
    '::before': {
      content: '""',
      display: 'block',
    },
    '::after': {
      content: '""',
      position: 'absolute',
    },
    ':disabled': {
      opacity: 0.5,
      cursor: 'not-allowed',
      pointerEvents: 'none',
    },
  },
});
```

---

## 8. RTL Support

Griffel provides automatic RTL support through its integration with `rtl-css-js`. When the
`FluentProvider` has `dir="rtl"`, all directional CSS properties are automatically flipped.

### Setup

```tsx
import { FluentProvider, teamsLightTheme } from '@fluentui/react-components';

function App() {
  const [dir, setDir] = useState<'ltr' | 'rtl'>('ltr');

  return (
    <FluentProvider theme={teamsLightTheme} dir={dir}>
      <YourApp />
    </FluentProvider>
  );
}
```

### What flips automatically

| LTR property | RTL equivalent |
|---|---|
| `paddingLeft: '16px'` | `paddingRight: '16px'` |
| `marginLeft: '8px'` | `marginRight: '8px'` |
| `borderLeftWidth: '2px'` | `borderRightWidth: '2px'` |
| `left: '0'` | `right: '0'` |
| `textAlign: 'left'` | `textAlign: 'right'` |
| `float: 'left'` | `float: 'right'` |
| `transform: 'translateX(10px)'` | `transform: 'translateX(-10px)'` |
| `borderTopLeftRadius` | `borderTopRightRadius` |

### Properties that do NOT flip

Some properties are intentionally not flipped:
- `direction` — Already controls the text direction
- `unicode-bidi` — Already controls bidi behavior
- Physical properties like `borderBlockStart`, `inlineStart` (CSS logical properties)

### Mixed-direction content

For content that should NOT flip (e.g., LTR code blocks inside an RTL page):

```tsx
// Nested provider overrides direction
<FluentProvider dir="rtl" theme={teamsLightTheme}>
  <MainContent />
  <FluentProvider dir="ltr">
    <CodeBlock />  {/* This content stays LTR */}
  </FluentProvider>
</FluentProvider>
```

---

## 9. Dynamic Styles with CSS Variables

For styles that must change at runtime based on props or state (e.g., a progress bar width, a
user-selected color), use CSS custom properties rather than inline styles. This preserves Griffel's
atomic caching.

### Pattern: CSS variables for dynamic values

```tsx
import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  progressBar: {
    height: '4px',
    backgroundColor: tokens.colorNeutralBackground6,
    borderRadius: tokens.borderRadiusSmall,
    position: 'relative',
    overflow: 'hidden',
  },
  progressFill: {
    position: 'absolute',
    top: '0',
    left: '0',
    height: '100%',
    backgroundColor: tokens.colorBrandBackground,
    // Use a CSS variable for the dynamic value
    width: 'var(--progress-width, 0%)',
    transitionProperty: 'width',
    transitionDuration: tokens.durationNormal,
    transitionTimingFunction: tokens.curveDecelerateMax,
  },
});

function ProgressBar({ value }: { value: number }) {
  const styles = useStyles();
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={styles.progressBar}>
      <div
        className={styles.progressFill}
        style={{ '--progress-width': `${clampedValue}%` } as React.CSSProperties}
      />
    </div>
  );
}
```

### Pattern: Dynamic color from props

```tsx
const useStyles = makeStyles({
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '20px',
    height: '20px',
    borderRadius: tokens.borderRadiusCircular,
    fontSize: tokens.fontSizeBase100,
    fontWeight: tokens.fontWeightSemibold,
    // Dynamic values via CSS variables
    backgroundColor: 'var(--badge-bg)',
    color: 'var(--badge-fg)',
  },
});

function ColorBadge({ bg, fg, children }: { bg: string; fg: string; children: React.ReactNode }) {
  const styles = useStyles();
  return (
    <span
      className={styles.badge}
      style={{
        '--badge-bg': bg,
        '--badge-fg': fg,
      } as React.CSSProperties}
    >
      {children}
    </span>
  );
}
```

### When to use CSS variables vs. conditional styles

| Scenario | Approach |
|---|---|
| Finite set of variants (primary, secondary, subtle) | Conditional styles via `mergeClasses` |
| Value from a prop (width, height, color from data) | CSS variables |
| Theme-dependent values | Design tokens (already CSS variables) |
| Animated values | CSS variables + transitions |

---

## 10. Shared Style Libraries

For design systems built on top of Fluent, you can create shared style packages that multiple
apps consume.

### Creating a shared style library

```ts
// packages/shared-styles/src/index.ts
export { useCardStyles } from './card-styles';
export { useFormFieldStyles } from './form-field-styles';
export { usePageLayoutStyles } from './page-layout-styles';
```

```ts
// packages/shared-styles/src/card-styles.ts
import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

export const useCardStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.padding(tokens.spacingVerticalL, tokens.spacingHorizontalL),
    boxShadow: tokens.shadow4,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tokens.spacingVerticalM,
  },
  body: {
    flexGrow: 1,
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    ...shorthands.gap(tokens.spacingHorizontalS),
    marginTop: tokens.spacingVerticalM,
  },
});
```

### Consuming shared styles

```tsx
// apps/my-app/src/components/ProjectCard.tsx
import { mergeClasses } from '@fluentui/react-components';
import { useCardStyles } from '@my-org/shared-styles';

const useLocalStyles = makeStyles({
  projectCard: {
    minHeight: '200px',
  },
  highlighted: {
    boxShadow: tokens.shadow8Brand,
  },
});

function ProjectCard({ highlighted, className }: Props) {
  const cardStyles = useCardStyles();
  const localStyles = useLocalStyles();

  return (
    <div
      className={mergeClasses(
        cardStyles.root,
        localStyles.projectCard,
        highlighted && localStyles.highlighted,
        className
      )}
    >
      <div className={cardStyles.header}>...</div>
      <div className={cardStyles.body}>...</div>
      <div className={cardStyles.footer}>...</div>
    </div>
  );
}
```

### AOT with shared libraries

When using AOT compilation, shared style libraries must be processed by the Griffel plugin too.
In webpack, ensure the shared package is not excluded from the loader:

```js
{
  test: /\.(ts|tsx|js|jsx)$/,
  exclude: /node_modules\/(?!@my-org\/shared-styles)/,  // Don't exclude your shared package
  use: {
    loader: '@griffel/webpack-extraction-plugin/loader',
  },
},
```

---

## 11. DevTools Extension

The **Griffel DevTools** browser extension helps debug atomic CSS by mapping class names back to their
source `makeStyles` calls.

### Installation

Install from the Chrome Web Store or Firefox Add-ons: search for "Griffel DevTools".

### Features

1. **Class name inspector** — Hover over an element to see which atomic classes are applied and what
   CSS property/value each represents.
2. **Source mapping** — Click an atomic class to jump to the `makeStyles` call that generated it.
3. **Override detection** — See which classes were overridden by `mergeClasses` (shown as
   strikethrough).
4. **Performance metrics** — View runtime style insertion counts and timing.

### Debugging without DevTools

Without the extension, you can still debug Griffel by:

1. **Reading atomic class names** — Each class follows the pattern `f{hash}`. In browser DevTools,
   inspect the element's Computed Styles to see which rules apply.
2. **Searching source** — The CSS property targeted by an atomic class can be found by searching the
   `<style>` tags in the document head for the class name.
3. **Logging `mergeClasses` output** — Log the return value to see the final class string after
   deduplication.

---

## 12. Cross-References

| Topic | Skill |
|---|---|
| AOT compilation with Next.js (App Router + Pages Router) | `fluent-nextjs` |
| Slot-based styling and component composition | `fluent-extensibility` |
| Design tokens and theming | `fluent-design-system` |
| Form component styling patterns | `fluent-forms` |
| Charting component styling | `fluent-charting` |
| Web Component styling (non-React) | `fluent-web-components` |
| Cross-platform styling considerations | `fluent-cross-platform` |
| Integration with third-party libraries | `fluent-integration` |
