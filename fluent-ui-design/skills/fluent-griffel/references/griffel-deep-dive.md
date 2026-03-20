# Griffel Deep Dive — Complete API Reference, AOT Internals, and Advanced Patterns

## Table of Contents

1. [makeStyles Complete API](#1-makestyles-complete-api)
2. [makeResetStyles Complete API](#2-makeresetstyles-complete-api)
3. [shorthands.* Complete Reference](#3-shorthands-complete-reference)
4. [mergeClasses Internals](#4-mergeclasses-internals)
5. [Advanced Selector Patterns](#5-advanced-selector-patterns)
6. [CSS Variable Patterns for Dynamic Theming](#6-css-variable-patterns-for-dynamic-theming)
7. [AOT Compilation Internals](#7-aot-compilation-internals)
8. [Performance Benchmarks](#8-performance-benchmarks)
9. [Debugging Guide](#9-debugging-guide)
10. [Migration from styled-components / Emotion](#10-migration-from-styled-components--emotion)
11. [Complete Code Examples](#11-complete-code-examples)

---

## 1. makeStyles Complete API

### Signature

```ts
function makeStyles<Slots extends string>(
  stylesBySlots: Record<Slots, GriffelStyle>
): () => Record<Slots, string>;
```

`makeStyles` accepts a record of named slots to `GriffelStyle` objects and returns a React hook.
The hook returns a record of the same slot names mapped to space-separated atomic class name strings.

### GriffelStyle Type

The `GriffelStyle` type represents a CSS-in-JS style object. It supports:

- **All standard CSS properties** in camelCase
- **Pseudo-selectors** as nested objects
- **Media queries** as nested objects
- **@supports queries** as nested objects
- **Keyframe objects** for `animationName`

### Complete CSS Property Categories

#### Layout Properties

```tsx
const useStyles = makeStyles({
  layout: {
    display: 'flex',                    // 'block' | 'inline' | 'inline-block' | 'flex' | 'inline-flex' | 'grid' | 'inline-grid' | 'none' | 'contents'
    position: 'relative',              // 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky'
    top: '0',
    right: '0',
    bottom: '0',
    left: '0',
    zIndex: 1,                         // number
    float: 'left',                     // 'left' | 'right' | 'none'
    clear: 'both',                     // 'left' | 'right' | 'both' | 'none'
    visibility: 'visible',             // 'visible' | 'hidden' | 'collapse'
    opacity: 1,                        // number (0–1)
    boxSizing: 'border-box',           // 'border-box' | 'content-box'
    contain: 'layout',                 // 'none' | 'strict' | 'content' | 'size' | 'layout' | 'style' | 'paint'
    isolation: 'isolate',              // 'auto' | 'isolate'
    objectFit: 'cover',               // 'fill' | 'contain' | 'cover' | 'none' | 'scale-down'
    objectPosition: 'center',
  },
});
```

#### Flexbox Properties

```tsx
const useStyles = makeStyles({
  flexContainer: {
    display: 'flex',
    flexDirection: 'row',              // 'row' | 'row-reverse' | 'column' | 'column-reverse'
    flexWrap: 'wrap',                  // 'nowrap' | 'wrap' | 'wrap-reverse'
    justifyContent: 'center',          // 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly'
    alignItems: 'center',             // 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline'
    alignContent: 'flex-start',       // Same as justifyContent + 'stretch'
    ...shorthands.gap('8px', '16px'),  // rowGap, columnGap
  },
  flexItem: {
    flexGrow: 1,                       // number
    flexShrink: 0,                     // number
    flexBasis: '200px',                // length | 'auto' | 'content'
    alignSelf: 'flex-start',          // Same values as alignItems + 'auto'
    order: 2,                          // number
  },
});
```

#### Grid Properties

```tsx
const useStyles = makeStyles({
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gridTemplateRows: 'auto 1fr auto',
    gridTemplateAreas: '"header header header" "nav main aside" "footer footer footer"',
    gridAutoFlow: 'row',               // 'row' | 'column' | 'dense' | 'row dense' | 'column dense'
    gridAutoColumns: 'minmax(100px, auto)',
    gridAutoRows: 'minmax(50px, auto)',
    rowGap: '16px',
    columnGap: '24px',
    justifyItems: 'stretch',
    alignItems: 'start',
    placeItems: 'center',
  },
  gridItem: {
    gridColumn: '1 / 3',
    gridRow: '2 / 4',
    gridColumnStart: 1,
    gridColumnEnd: 3,
    gridRowStart: 1,
    gridRowEnd: 'span 2',
    justifySelf: 'center',
    alignSelf: 'end',
    placeSelf: 'center end',
  },
});
```

#### Dimension Properties

```tsx
const useStyles = makeStyles({
  sizing: {
    width: '200px',
    height: '100px',
    minWidth: '100px',
    maxWidth: '500px',
    minHeight: '50px',
    maxHeight: '300px',
    aspectRatio: '16 / 9',
  },
});
```

#### Typography Properties

```tsx
import { tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  text: {
    fontFamily: tokens.fontFamilyBase,
    fontSize: tokens.fontSizeBase300,       // '14px'
    fontWeight: tokens.fontWeightSemibold,  // 600
    lineHeight: tokens.lineHeightBase300,   // '20px'
    letterSpacing: 'normal',
    textAlign: 'left',                      // 'left' | 'right' | 'center' | 'justify'
    textTransform: 'uppercase',             // 'none' | 'capitalize' | 'uppercase' | 'lowercase'
    textDecoration: 'none',                 // Use shorthands.textDecoration() in makeStyles
    textOverflow: 'ellipsis',
    textIndent: '2em',
    whiteSpace: 'nowrap',                   // 'normal' | 'nowrap' | 'pre' | 'pre-wrap' | 'pre-line' | 'break-spaces'
    wordBreak: 'break-word',               // 'normal' | 'break-all' | 'keep-all' | 'break-word'
    overflowWrap: 'break-word',            // 'normal' | 'break-word' | 'anywhere'
    hyphens: 'auto',
    fontStyle: 'italic',
    fontVariantNumeric: 'tabular-nums',
    textShadow: '0 1px 2px rgba(0,0,0,0.1)',
  },
});
```

#### Color and Background Properties

```tsx
const useStyles = makeStyles({
  visual: {
    color: tokens.colorNeutralForeground1,
    backgroundColor: tokens.colorNeutralBackground1,
    backgroundImage: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.1))',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundAttachment: 'fixed',
    backgroundClip: 'border-box',        // 'border-box' | 'padding-box' | 'content-box' | 'text'
    caretColor: tokens.colorBrandForeground1,
    accentColor: tokens.colorBrandBackground,
    colorScheme: 'light dark',
  },
});
```

#### Border Properties (Use shorthands.*)

```tsx
const useStyles = makeStyles({
  bordered: {
    // Individual longhand properties (always safe in makeStyles)
    borderTopWidth: tokens.strokeWidthThin,
    borderTopStyle: 'solid',
    borderTopColor: tokens.colorNeutralStroke1,
    borderRightWidth: tokens.strokeWidthThin,
    borderRightStyle: 'solid',
    borderRightColor: tokens.colorNeutralStroke1,
    borderBottomWidth: tokens.strokeWidthThin,
    borderBottomStyle: 'solid',
    borderBottomColor: tokens.colorNeutralStroke1,
    borderLeftWidth: tokens.strokeWidthThin,
    borderLeftStyle: 'solid',
    borderLeftColor: tokens.colorNeutralStroke1,

    // OR use shorthands (preferred)
    ...shorthands.border(tokens.strokeWidthThin, 'solid', tokens.colorNeutralStroke1),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
  },
});
```

#### Shadow and Effect Properties

```tsx
const useStyles = makeStyles({
  effects: {
    boxShadow: tokens.shadow4,           // Fluent shadow tokens
    // Available shadow tokens: shadow2, shadow4, shadow8, shadow16, shadow28, shadow64
    // Brand variants: shadow2Brand, shadow4Brand, etc.
    filter: 'blur(4px)',
    backdropFilter: 'blur(10px)',
    mixBlendMode: 'multiply',
    clipPath: 'circle(50%)',
    maskImage: 'linear-gradient(to bottom, black, transparent)',
  },
});
```

#### Transform and Transition Properties

```tsx
const useStyles = makeStyles({
  animated: {
    transform: 'translateY(-2px) scale(1.02)',
    transformOrigin: 'center center',
    transitionProperty: 'transform, box-shadow, background-color',
    transitionDuration: tokens.durationNormal,     // '200ms'
    transitionTimingFunction: tokens.curveDecelerateMax,
    transitionDelay: '0ms',
    willChange: 'transform',
    perspective: '1000px',
    backfaceVisibility: 'hidden',
  },
});
```

#### Overflow and Scroll Properties

```tsx
const useStyles = makeStyles({
  scrollable: {
    overflowX: 'hidden',
    overflowY: 'auto',
    // OR use shorthands.overflow('hidden', 'auto')
    scrollBehavior: 'smooth',
    scrollbarWidth: 'thin',              // 'auto' | 'thin' | 'none' (Firefox)
    scrollbarColor: `${tokens.colorNeutralForeground3} transparent`,  // (Firefox)
    scrollSnapType: 'y mandatory',
    scrollSnapAlign: 'start',
    overscrollBehavior: 'contain',
    WebkitOverflowScrolling: 'touch',    // Vendor prefix with capital W
  },
});
```

#### Outline and Focus Properties

```tsx
const useStyles = makeStyles({
  focusable: {
    outlineWidth: '0',
    outlineStyle: 'none',
    ':focus-visible': {
      outlineWidth: '2px',
      outlineStyle: 'solid',
      outlineColor: tokens.colorStrokeFocus2,
      outlineOffset: '2px',
      borderRadius: tokens.borderRadiusMedium,
    },
  },
});
```

#### Interaction Properties

```tsx
const useStyles = makeStyles({
  interactive: {
    cursor: 'pointer',                    // 'default' | 'pointer' | 'grab' | 'grabbing' | 'not-allowed' | 'text' | 'move' | 'crosshair' | 'wait' | 'help' | 'none'
    userSelect: 'none',                   // 'none' | 'auto' | 'text' | 'all'
    pointerEvents: 'auto',               // 'auto' | 'none'
    touchAction: 'manipulation',          // 'auto' | 'none' | 'pan-x' | 'pan-y' | 'manipulation' | 'pinch-zoom'
    resize: 'vertical',                   // 'none' | 'both' | 'horizontal' | 'vertical'
  },
});
```

#### List Properties

```tsx
const useStyles = makeStyles({
  list: {
    listStyleType: 'none',               // 'disc' | 'circle' | 'square' | 'decimal' | 'none'
    listStylePosition: 'inside',
    listStyleImage: 'none',
  },
});
```

#### Table Properties

```tsx
const useStyles = makeStyles({
  table: {
    borderCollapse: 'collapse',           // 'collapse' | 'separate'
    borderSpacing: '0',
    tableLayout: 'fixed',                 // 'auto' | 'fixed'
    captionSide: 'bottom',
    emptyCells: 'show',
    verticalAlign: 'middle',
  },
});
```

#### Miscellaneous Properties

```tsx
const useStyles = makeStyles({
  misc: {
    content: '""',                         // For ::before / ::after
    counterIncrement: 'section',
    counterReset: 'section',
    quotes: '"\\201C" "\\201D"',
    appearance: 'none',                    // 'none' | 'auto'
    WebkitAppearance: 'none',
    columnCount: 2,
    columnGap: '24px',
    columnRule: '1px solid #ccc',
    breakInside: 'avoid',
    pageBreakInside: 'avoid',
  },
});
```

---

## 2. makeResetStyles Complete API

### Signature

```ts
function makeResetStyles(styles: GriffelResetStyle): () => string;
```

Returns a hook that produces a single class name string (non-atomic).

### Key Differences from makeStyles

| Feature | makeStyles | makeResetStyles |
|---|---|---|
| Output | Multiple atomic classes per slot | Single non-atomic class |
| Slots | Multiple named slots | Single unnamed block |
| CSS shorthands | Must use `shorthands.*` | Native shorthands OK |
| Overridability | Each property independently overridable | Entire block has lower specificity |
| AOT behavior | Each property extracted individually | Entire block extracted as one rule |
| Use case | Variants, conditional styles | Base resets, foundational styles |

### Complete Example

```tsx
import { makeResetStyles, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';

// Base styles: single class, CSS shorthands allowed
const useBaseClass = makeResetStyles({
  // CSS shorthands work here (unlike makeStyles)
  margin: 0,
  padding: '8px 16px',
  border: `1px solid ${tokens.colorNeutralStroke1}`,
  borderRadius: tokens.borderRadiusMedium,
  font: `${tokens.fontWeightRegular} ${tokens.fontSizeBase300}/${tokens.lineHeightBase300} ${tokens.fontFamilyBase}`,
  background: tokens.colorNeutralBackground1,
  color: tokens.colorNeutralForeground1,
  outline: 'none',
  textDecoration: 'none',
  cursor: 'pointer',
  transition: `background-color ${tokens.durationNormal} ${tokens.curveDecelerateMax}`,

  // Pseudo-selectors work the same way
  ':hover': {
    background: tokens.colorNeutralBackground1Hover,
    borderColor: tokens.colorNeutralStroke1Hover,
  },
  ':active': {
    background: tokens.colorNeutralBackground1Pressed,
  },
  ':focus-visible': {
    outline: `2px solid ${tokens.colorStrokeFocus2}`,
    outlineOffset: '2px',
  },
  ':disabled': {
    opacity: 0.5,
    cursor: 'not-allowed',
    pointerEvents: 'none',
  },

  // Media queries work the same way
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
  },
});

// Variant styles: atomic, override the base
const useStyles = makeStyles({
  primary: {
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    borderColor: 'transparent',
    ':hover': {
      backgroundColor: tokens.colorBrandBackgroundHover,
    },
  },
  large: {
    fontSize: tokens.fontSizeBase400,
    ...shorthands.padding('12px', '24px'),
    minHeight: '44px',
  },
});

function CustomButton({ primary, large, className, ...rest }: Props) {
  const baseClass = useBaseClass();
  const styles = useStyles();

  return (
    <button
      className={mergeClasses(
        baseClass,              // Non-atomic base (lower specificity)
        primary && styles.primary,  // Atomic overrides win
        large && styles.large,
        className
      )}
      {...rest}
    />
  );
}
```

---

## 3. shorthands.* Complete Reference

### shorthands.padding

```ts
function padding(
  top: string,
  right?: string,
  bottom?: string,
  left?: string
): {
  paddingTop: string;
  paddingRight: string;
  paddingBottom: string;
  paddingLeft: string;
};
```

**Argument patterns:**

```tsx
shorthands.padding('8px')
// → paddingTop: '8px', paddingRight: '8px', paddingBottom: '8px', paddingLeft: '8px'

shorthands.padding('8px', '16px')
// → paddingTop: '8px', paddingRight: '16px', paddingBottom: '8px', paddingLeft: '16px'

shorthands.padding('4px', '8px', '12px')
// → paddingTop: '4px', paddingRight: '8px', paddingBottom: '12px', paddingLeft: '8px'

shorthands.padding('4px', '8px', '12px', '16px')
// → paddingTop: '4px', paddingRight: '8px', paddingBottom: '12px', paddingLeft: '16px'

// With tokens
shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalL)
```

### shorthands.margin

```ts
function margin(
  top: string,
  right?: string,
  bottom?: string,
  left?: string
): {
  marginTop: string;
  marginRight: string;
  marginBottom: string;
  marginLeft: string;
};
```

Same argument pattern as `padding`.

### shorthands.border

```ts
function border(
  width?: string,
  style?: string,
  color?: string
): {
  borderTopWidth: string;
  borderTopStyle: string;
  borderTopColor: string;
  borderRightWidth: string;
  borderRightStyle: string;
  borderRightColor: string;
  borderBottomWidth: string;
  borderBottomStyle: string;
  borderBottomColor: string;
  borderLeftWidth: string;
  borderLeftStyle: string;
  borderLeftColor: string;
};
```

**Examples:**

```tsx
shorthands.border('1px', 'solid', tokens.colorNeutralStroke1)
// All 12 border longhand properties set

shorthands.border(tokens.strokeWidthThin)
// Only width set on all sides (style and color omitted)

shorthands.border(tokens.strokeWidthThin, 'solid')
// Width and style set, color omitted
```

### shorthands.borderLeft / borderRight / borderTop / borderBottom

```ts
function borderLeft(
  width?: string,
  style?: string,
  color?: string
): {
  borderLeftWidth: string;
  borderLeftStyle: string;
  borderLeftColor: string;
};
```

Same signature for `borderRight`, `borderTop`, `borderBottom`.

### shorthands.borderWidth

```ts
function borderWidth(
  top: string,
  right?: string,
  bottom?: string,
  left?: string
): {
  borderTopWidth: string;
  borderRightWidth: string;
  borderBottomWidth: string;
  borderLeftWidth: string;
};
```

### shorthands.borderStyle

```ts
function borderStyle(
  top: string,
  right?: string,
  bottom?: string,
  left?: string
): {
  borderTopStyle: string;
  borderRightStyle: string;
  borderBottomStyle: string;
  borderLeftStyle: string;
};
```

### shorthands.borderColor

```ts
function borderColor(
  top: string,
  right?: string,
  bottom?: string,
  left?: string
): {
  borderTopColor: string;
  borderRightColor: string;
  borderBottomColor: string;
  borderLeftColor: string;
};
```

### shorthands.borderRadius

```ts
function borderRadius(
  topLeft: string,
  topRight?: string,
  bottomRight?: string,
  bottomLeft?: string
): {
  borderTopLeftRadius: string;
  borderTopRightRadius: string;
  borderBottomRightRadius: string;
  borderBottomLeftRadius: string;
};
```

**Examples:**

```tsx
shorthands.borderRadius(tokens.borderRadiusMedium)
// All four corners: 4px

shorthands.borderRadius(tokens.borderRadiusLarge, '0')
// topLeft and bottomLeft: 8px, topRight and bottomRight: 0

shorthands.borderRadius('8px', '0', '8px', '0')
// Alternating corners
```

### shorthands.gap

```ts
function gap(
  row: string,
  column?: string
): {
  rowGap: string;
  columnGap: string;
};
```

```tsx
shorthands.gap('8px')
// rowGap: '8px', columnGap: '8px'

shorthands.gap(tokens.spacingVerticalS, tokens.spacingHorizontalM)
// rowGap: '8px', columnGap: '12px'
```

### shorthands.overflow

```ts
function overflow(
  x: string,
  y?: string
): {
  overflowX: string;
  overflowY: string;
};
```

```tsx
shorthands.overflow('hidden')
// overflowX: 'hidden', overflowY: 'hidden'

shorthands.overflow('hidden', 'auto')
// overflowX: 'hidden', overflowY: 'auto'
```

### shorthands.flex

```ts
function flex(
  grow: number | string,
  shrink?: number | string,
  basis?: string
): {
  flexGrow: number | string;
  flexShrink: number | string;
  flexBasis: string;
};
```

```tsx
shorthands.flex(1)
// flexGrow: 1, flexShrink: 1, flexBasis: '0%' (CSS default for flex: 1)

shorthands.flex(0, 0, 'auto')
// flexGrow: 0, flexShrink: 0, flexBasis: 'auto'

shorthands.flex(1, 1, '200px')
// flexGrow: 1, flexShrink: 1, flexBasis: '200px'
```

### shorthands.inset

```ts
function inset(
  top: string,
  right?: string,
  bottom?: string,
  left?: string
): {
  top: string;
  right: string;
  bottom: string;
  left: string;
};
```

```tsx
shorthands.inset('0')
// top: '0', right: '0', bottom: '0', left: '0'  (full positioning)

shorthands.inset('0', 'auto', '0', '0')
// top: '0', right: 'auto', bottom: '0', left: '0'  (left/top/bottom anchored)
```

### shorthands.outline

```ts
function outline(
  width?: string,
  style?: string,
  color?: string
): {
  outlineWidth: string;
  outlineStyle: string;
  outlineColor: string;
};
```

### shorthands.textDecoration

```ts
function textDecoration(
  line: string,
  style?: string,
  color?: string,
  thickness?: string
): {
  textDecorationLine: string;
  textDecorationStyle?: string;
  textDecorationColor?: string;
  textDecorationThickness?: string;
};
```

### shorthands.transition

```ts
function transition(
  property: string,
  duration?: string,
  timingFunction?: string,
  delay?: string
): {
  transitionProperty: string;
  transitionDuration?: string;
  transitionTimingFunction?: string;
  transitionDelay?: string;
};
```

### shorthands.gridArea

```ts
function gridArea(
  rowStart: string | number,
  columnStart?: string | number,
  rowEnd?: string | number,
  columnEnd?: string | number
): {
  gridRowStart: string | number;
  gridColumnStart: string | number;
  gridRowEnd: string | number;
  gridColumnEnd: string | number;
};
```

---

## 4. mergeClasses Internals

### Signature

```ts
function mergeClasses(
  ...classNames: (string | false | undefined | null)[]
): string;
```

### Deduplication Algorithm

`mergeClasses` maintains an internal registry that maps each atomic class name to the CSS property
it represents. When multiple classes target the same property, only the last one is kept.

**Step-by-step:**

1. Receive all arguments: `mergeClasses('f1abc f2def', false, 'f3ghi f2xyz', undefined, 'f4jkl')`
2. Filter falsy values: `['f1abc f2def', 'f3ghi f2xyz', 'f4jkl']`
3. Split each string into individual class names: `['f1abc', 'f2def', 'f3ghi', 'f2xyz', 'f4jkl']`
4. For each class, look up its CSS property target in the registry
5. If `f2def` targets `color` and `f2xyz` also targets `color`, `f2xyz` wins (later position)
6. Output: `'f1abc f3ghi f2xyz f4jkl'` (f2def removed, its property is handled by f2xyz)

### Interaction with makeResetStyles

`makeResetStyles` produces a single class with all properties bundled. When `mergeClasses` processes
a reset class alongside atomic classes, the atomic classes always override the reset class for any
property they target. This is because atomic classes have higher specificity (one property per rule)
than the reset class (many properties in one rule).

```tsx
const baseClass = useBaseClass();     // Single class: 'r1abc123'
const styles = useStyles();           // Atomic: 'f1color f2bg f3pad ...'

mergeClasses(baseClass, styles.primary)
// Output: 'r1abc123 f1brandcolor f2brandbg'
// The atomic color and background classes override the reset class's color and background
```

### Why String Concatenation Fails

```tsx
// String concatenation preserves ALL classes, even conflicting ones
`${styles.base} ${styles.override}`
// → 'f1red f2large f3blue f4large'
// Both f1red (color:red) and f3blue (color:blue) are present
// Browser uses stylesheet order (non-deterministic) to resolve the conflict

// mergeClasses deduplicates
mergeClasses(styles.base, styles.override)
// → 'f2large f3blue f4large'
// f1red removed because f3blue targets the same property and appears later
```

---

## 5. Advanced Selector Patterns

### Pseudo-class Selectors

```tsx
const useStyles = makeStyles({
  interactive: {
    // Mouse/pointer states
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      transform: 'translateY(-1px)',
    },
    ':active': {
      backgroundColor: tokens.colorNeutralBackground1Pressed,
      transform: 'translateY(0)',
    },

    // Focus states
    ':focus': {
      // Avoid — includes programmatic focus
    },
    ':focus-visible': {
      // Preferred — only keyboard/assistive technology focus
      outlineWidth: '2px',
      outlineStyle: 'solid',
      outlineColor: tokens.colorStrokeFocus2,
      outlineOffset: '2px',
    },
    ':focus-within': {
      // When any child element is focused
      boxShadow: `0 0 0 2px ${tokens.colorStrokeFocus2}`,
    },

    // Structural selectors
    ':first-child': {
      marginTop: '0',
      borderTopLeftRadius: tokens.borderRadiusMedium,
      borderTopRightRadius: tokens.borderRadiusMedium,
    },
    ':last-child': {
      marginBottom: '0',
      borderBottomLeftRadius: tokens.borderRadiusMedium,
      borderBottomRightRadius: tokens.borderRadiusMedium,
    },
    ':nth-child(even)': {
      backgroundColor: tokens.colorNeutralBackground2,
    },
    ':nth-child(odd)': {
      backgroundColor: tokens.colorNeutralBackground1,
    },
    ':only-child': {
      ...shorthands.borderRadius(tokens.borderRadiusMedium),
    },
    ':empty': {
      display: 'none',
    },

    // State selectors
    ':disabled': {
      opacity: 0.5,
      cursor: 'not-allowed',
      pointerEvents: 'none',
    },
    ':checked': {
      backgroundColor: tokens.colorBrandBackground,
    },
    ':indeterminate': {
      backgroundColor: tokens.colorNeutralBackground3,
    },
    ':placeholder-shown': {
      color: tokens.colorNeutralForeground4,
    },
    ':valid': {
      borderBottomColor: tokens.colorPaletteGreenBorder2,
    },
    ':invalid': {
      borderBottomColor: tokens.colorPaletteRedBorder2,
    },
    ':required': {
      // Style required fields
    },
    ':read-only': {
      backgroundColor: tokens.colorNeutralBackground3,
      cursor: 'default',
    },

    // Negation
    ':not(:disabled)': {
      cursor: 'pointer',
    },
    ':not(:last-child)': {
      marginBottom: tokens.spacingVerticalS,
    },
  },
});
```

### Pseudo-element Selectors

```tsx
const useStyles = makeStyles({
  withPseudos: {
    position: 'relative',

    '::before': {
      content: '""',
      display: 'block',
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '2px',
      backgroundColor: tokens.colorBrandBackground,
      transform: 'scaleX(0)',
      transformOrigin: 'left',
      transitionProperty: 'transform',
      transitionDuration: tokens.durationNormal,
    },
    ':hover::before': {
      transform: 'scaleX(1)',
    },

    '::after': {
      content: '""',
      display: 'block',
      clear: 'both',
    },

    '::placeholder': {
      color: tokens.colorNeutralForeground4,
      fontStyle: 'italic',
    },

    '::selection': {
      backgroundColor: tokens.colorBrandBackground,
      color: tokens.colorNeutralForegroundOnBrand,
    },

    '::first-line': {
      fontWeight: tokens.fontWeightBold,
    },
  },
});
```

### Compound Selectors

```tsx
const useStyles = makeStyles({
  compound: {
    // Compound pseudo-classes
    ':hover:not(:disabled)': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
    ':active:not(:disabled)': {
      backgroundColor: tokens.colorNeutralBackground1Pressed,
    },
    ':focus-visible:not(:active)': {
      outlineWidth: '2px',
      outlineStyle: 'solid',
      outlineColor: tokens.colorStrokeFocus2,
    },

    // Chained pseudo-classes with pseudo-elements
    ':hover::after': {
      opacity: 1,
    },
    ':focus-visible::before': {
      transform: 'scaleX(1)',
    },
  },
});
```

### Nested Selectors (Child, Descendant, Sibling)

```tsx
const useStyles = makeStyles({
  container: {
    // Direct child selector (use sparingly — prefer className on child)
    '> *': {
      marginBottom: tokens.spacingVerticalS,
    },
    '> *:last-child': {
      marginBottom: '0',
    },

    // Adjacent sibling
    '& + &': {
      marginTop: tokens.spacingVerticalM,
    },

    // General sibling
    '& ~ &': {
      borderTopWidth: tokens.strokeWidthThin,
      borderTopStyle: 'solid',
      borderTopColor: tokens.colorNeutralStroke2,
    },
  },
});
```

### Media Queries

```tsx
const useStyles = makeStyles({
  responsive: {
    // Width breakpoints
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.padding(tokens.spacingVerticalM),

    '@media (min-width: 480px)': {
      // Mobile landscape and up
      ...shorthands.padding(tokens.spacingVerticalL),
    },
    '@media (min-width: 640px)': {
      // Tablet and up
      flexDirection: 'row',
      ...shorthands.gap(tokens.spacingHorizontalL),
    },
    '@media (min-width: 1024px)': {
      // Desktop and up
      maxWidth: '960px',
      marginLeft: 'auto',
      marginRight: 'auto',
    },
    '@media (min-width: 1366px)': {
      // Large desktop
      maxWidth: '1200px',
    },

    // User preference queries
    '@media (prefers-reduced-motion: reduce)': {
      transitionDuration: '0.01ms',
      animationDuration: '0.01ms',
      animationIterationCount: '1',
    },
    '@media (prefers-contrast: more)': {
      borderWidth: '2px',
    },
    '@media (forced-colors: active)': {
      // Windows High Contrast Mode
      borderColor: 'ButtonText',
      color: 'ButtonText',
      forcedColorAdjust: 'none',
    },
    '@media (prefers-color-scheme: dark)': {
      // Prefer FluentProvider theming. Only use for non-themed scenarios.
      colorScheme: 'dark',
    },

    // Print
    '@media print': {
      backgroundColor: 'white',
      color: 'black',
      boxShadow: 'none',
    },

    // Aspect ratio
    '@media (orientation: portrait)': {
      flexDirection: 'column',
    },
    '@media (orientation: landscape)': {
      flexDirection: 'row',
    },
  },
});
```

### @supports Queries

```tsx
const useStyles = makeStyles({
  progressive: {
    display: 'flex',

    '@supports (display: grid)': {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    },

    '@supports (backdrop-filter: blur(10px))': {
      backdropFilter: 'blur(10px)',
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
    },

    '@supports (container-type: inline-size)': {
      containerType: 'inline-size',
    },

    '@supports (aspect-ratio: 1)': {
      aspectRatio: '16 / 9',
    },
  },
});
```

### Combining Media Queries with Pseudo-selectors

```tsx
const useStyles = makeStyles({
  combined: {
    color: tokens.colorNeutralForeground1,

    ':hover': {
      color: tokens.colorBrandForeground1,
    },

    '@media (min-width: 640px)': {
      fontSize: tokens.fontSizeBase400,

      ':hover': {
        transform: 'scale(1.05)',
      },
    },

    '@media (prefers-reduced-motion: reduce)': {
      ':hover': {
        transform: 'none',
      },
    },
  },
});
```

---

## 6. CSS Variable Patterns for Dynamic Theming

### Pattern 1: Component-Level Dynamic Values

```tsx
import { makeStyles, tokens } from '@fluentui/react-components';
import * as React from 'react';

const useStyles = makeStyles({
  avatar: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 'var(--avatar-size, 32px)',
    height: 'var(--avatar-size, 32px)',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: 'var(--avatar-bg, transparent)',
    color: 'var(--avatar-fg, inherit)',
    fontSize: 'var(--avatar-font-size, 14px)',
    fontWeight: tokens.fontWeightSemibold,
  },
});

const sizeMap = {
  small: { '--avatar-size': '24px', '--avatar-font-size': '10px' },
  medium: { '--avatar-size': '32px', '--avatar-font-size': '14px' },
  large: { '--avatar-size': '48px', '--avatar-font-size': '20px' },
  xlarge: { '--avatar-size': '64px', '--avatar-font-size': '28px' },
} as const;

interface AvatarProps {
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  color?: string;
  initials: string;
}

function CustomAvatar({ size = 'medium', color, initials }: AvatarProps) {
  const styles = useStyles();

  const cssVars = {
    ...sizeMap[size],
    ...(color && {
      '--avatar-bg': color,
      '--avatar-fg': '#fff',
    }),
  } as React.CSSProperties;

  return (
    <span className={styles.avatar} style={cssVars}>
      {initials}
    </span>
  );
}
```

### Pattern 2: Theme Extension via CSS Variables

```tsx
// Extend the Fluent theme with custom application tokens
const useStyles = makeStyles({
  appShell: {
    // Custom app tokens set on a container
    '--app-sidebar-width': '280px',
    '--app-header-height': '48px',
    '--app-content-max-width': '1200px',
  } as Record<string, string>,
  sidebar: {
    width: 'var(--app-sidebar-width)',
    height: `calc(100vh - var(--app-header-height))`,
  },
  header: {
    height: 'var(--app-header-height)',
  },
  content: {
    maxWidth: 'var(--app-content-max-width)',
    marginLeft: 'auto',
    marginRight: 'auto',
  },
});
```

### Pattern 3: Data-Driven Visualization

```tsx
const useStyles = makeStyles({
  bar: {
    height: 'var(--bar-height, 0%)',
    width: '24px',
    backgroundColor: 'var(--bar-color, currentColor)',
    borderTopLeftRadius: tokens.borderRadiusSmall,
    borderTopRightRadius: tokens.borderRadiusSmall,
    transitionProperty: 'height',
    transitionDuration: tokens.durationSlow,
    transitionTimingFunction: tokens.curveDecelerateMax,
  },
});

function BarChart({ data }: { data: Array<{ value: number; color: string }> }) {
  const styles = useStyles();
  const max = Math.max(...data.map(d => d.value));

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '200px' }}>
      {data.map((d, i) => (
        <div
          key={i}
          className={styles.bar}
          style={{
            '--bar-height': `${(d.value / max) * 100}%`,
            '--bar-color': d.color,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
```

### Pattern 4: Animated CSS Variables

```tsx
const useStyles = makeStyles({
  card: {
    ...shorthands.padding(tokens.spacingVerticalL, tokens.spacingHorizontalL),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow4,
    // CSS variable for highlight position
    backgroundImage: `radial-gradient(
      circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
      ${tokens.colorBrandBackground2},
      transparent 80%
    )`,
    backgroundBlendMode: 'overlay',
  },
});

function HighlightCard({ children }: { children: React.ReactNode }) {
  const styles = useStyles();
  const ref = React.useRef<HTMLDivElement>(null);

  const handleMouseMove = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    ref.current?.style.setProperty('--mouse-x', `${x}%`);
    ref.current?.style.setProperty('--mouse-y', `${y}%`);
  }, []);

  return (
    <div ref={ref} className={styles.card} onMouseMove={handleMouseMove}>
      {children}
    </div>
  );
}
```

---

## 7. AOT Compilation Internals

### The Compilation Pipeline

Griffel AOT compilation occurs in four distinct phases:

#### Phase 1: AST Parsing

The Babel preset (`@griffel/babel-preset`) traverses the AST to find all `makeStyles()` and
`makeResetStyles()` call expressions. It identifies them by:

1. **Import analysis** — Tracking imports from `@griffel/react` or `@fluentui/react-components`.
2. **Call expression matching** — Finding calls to the imported `makeStyles` / `makeResetStyles`
   identifiers.
3. **Argument extraction** — Extracting the style object argument for static evaluation.

#### Phase 2: Static Evaluation

The style object argument is statically evaluated:

1. **Literal values** are used directly: `fontSize: '14px'` evaluates to `{fontSize: '14px'}`.
2. **Token references** are preserved as CSS variable references:
   `tokens.colorNeutralForeground1` evaluates to `var(--colorNeutralForeground1)`.
3. **Spread expressions** with `shorthands.*` are evaluated and expanded.
4. **Non-evaluable expressions** (dynamic function calls, conditional expressions) cause the
   compilation to fall back to runtime for that specific `makeStyles` call.

#### Phase 3: Atomic Class Generation

For each evaluated CSS property/value pair:

1. **Hash generation** — A deterministic hash is computed from the CSS property name and value.
   The same property/value pair always produces the same hash regardless of where it appears.
2. **Class name creation** — The hash becomes a class name: `f{hash}` (e.g., `fe3e8s9`).
3. **CSS rule creation** — A CSS rule is created: `.fe3e8s9 { display: flex; }`.
4. **RTL variant** — If the property is directional, an RTL variant is also generated.
5. **Bucket assignment** — Rules are assigned to insertion buckets based on their selector type
   (base, hover, focus, media, etc.) to ensure correct cascade ordering.

#### Phase 4: Extraction and Code Transformation

1. **CSS extraction** — All generated CSS rules are collected and emitted as CSS assets.
   - In webpack: via `GriffelCSSExtractionPlugin` into `.css` files processed by `css-loader`.
   - In Vite: via the Vite plugin's CSS handling.
2. **JS transformation** — The original `makeStyles()` call is replaced with `__styles()`,
   which receives the pre-computed class name map instead of style objects.

**Source code (before AOT):**

```tsx
import { makeStyles, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    color: tokens.colorNeutralForeground1,
    backgroundColor: tokens.colorNeutralBackground1,
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  icon: {
    fontSize: '20px',
    color: tokens.colorBrandForeground1,
  },
});
```

**Transformed output (after AOT):**

```tsx
import { __styles } from '@griffel/react';

const useStyles = __styles({
  root: {
    mc9l5x: 'f22iagw',       // display: flex
    sj55zd: 'f1a7mspl',      // color: var(--colorNeutralForeground1)
    De3pzq: 'fk6fouc',       // background-color: var(--colorNeutralBackground1)
    Bceov9: 'f1ern45e',      // :hover { background-color: var(--colorNeutralBackground1Hover) }
  },
  icon: {
    Bahqtrf: 'fk73vx1',      // font-size: 20px
    sj55zd: 'f1k1mbkb',      // color: var(--colorBrandForeground1)
  },
}, {
  d: ['.f22iagw{display:flex}', '.f1a7mspl{color:var(--colorNeutralForeground1)}', '.fk6fouc{background-color:var(--colorNeutralBackground1)}', '.fk73vx1{font-size:20px}', '.f1k1mbkb{color:var(--colorBrandForeground1)}'],
  h: ['.f1ern45e:hover{background-color:var(--colorNeutralBackground1Hover)}'],
});
```

**Extracted CSS (separate .css file):**

```css
/* Base bucket */
.f22iagw { display: flex; }
.f1a7mspl { color: var(--colorNeutralForeground1); }
.fk6fouc { background-color: var(--colorNeutralBackground1); }
.fk73vx1 { font-size: 20px; }
.f1k1mbkb { color: var(--colorBrandForeground1); }

/* Hover bucket */
.f1ern45e:hover { background-color: var(--colorNeutralBackground1Hover); }
```

### CSS Rule Buckets

Griffel organizes CSS rules into ordered buckets to maintain the correct cascade:

| Bucket | Order | Contents |
|---|---|---|
| `r` (reset) | 0 | `makeResetStyles` output |
| `d` (default) | 1 | Base property rules |
| `l` (link) | 2 | `:link` rules |
| `v` (visited) | 3 | `:visited` rules |
| `w` (focus-within) | 4 | `:focus-within` rules |
| `f` (focus) | 5 | `:focus` rules |
| `i` (focus-visible) | 6 | `:focus-visible` rules |
| `h` (hover) | 7 | `:hover` rules |
| `a` (active) | 8 | `:active` rules |
| `k` (keyframes) | 9 | `@keyframes` definitions |
| `t` (at-rules) | 10 | `@media`, `@supports` rules |

This ordering ensures that `:active` styles override `:hover` styles, which override `:focus`
styles, matching the expected CSS cascade behavior.

### Limitations of AOT

1. **Dynamic style values** — Expressions that cannot be statically evaluated fall back to runtime.
   This includes computed values, function calls (except `shorthands.*` and `tokens.*`), and
   ternary expressions.
2. **Re-exported makeStyles** — If `makeStyles` is re-exported with a different name, the Babel
   preset may not detect it. Use the `modules` option to register custom module sources.
3. **Style objects from variables** — Extracting a style object into a separate variable prevents
   static evaluation unless the variable is defined in the same file scope.

---

## 8. Performance Benchmarks

### Runtime vs AOT: Style Insertion

| Metric | Runtime Griffel | AOT Griffel | Emotion | styled-components |
|---|---|---|---|---|
| Initial render (1000 components) | ~18ms | ~3ms | ~45ms | ~52ms |
| Re-render (no style change) | ~2ms | ~1ms | ~8ms | ~12ms |
| Style sheet size (1000 unique rules) | 12KB | 12KB | 38KB | 42KB |
| JS bundle overhead | ~8KB (runtime) | ~2KB (thin runtime) | ~12KB | ~16KB |
| Memory (style cache) | ~200KB | ~50KB | ~350KB | ~400KB |
| Hydration time | ~15ms | ~2ms | ~25ms | ~35ms |

*Approximate values based on Fluent UI team benchmarks. Actual results vary by application.*

### Why Atomic CSS Is Smaller

In a traditional CSS-in-JS library, each component generates its own CSS block:

```css
/* Emotion / styled-components: each component = new block */
.css-1abc { display: flex; color: red; padding: 8px; }
.css-2def { display: flex; color: blue; padding: 8px; }
.css-3ghi { display: flex; color: red; padding: 16px; }
/* 3 blocks, 9 declarations, many duplicates */
```

In Griffel's atomic model:

```css
/* Griffel: each unique property/value = one rule, shared across all components */
.f22iagw { display: flex; }
.f1red { color: red; }
.f1blue { color: blue; }
.f1pad8 { padding: 8px; }    /* Note: actually expanded via shorthands */
.f1pad16 { padding: 16px; }
/* 5 rules, 5 declarations, zero duplication */
```

As the application grows, Griffel's stylesheet grows logarithmically (new combinations reuse existing
atomic classes) while traditional approaches grow linearly.

### AOT-Specific Performance Gains

1. **No CSSOM API calls** — Runtime Griffel calls `CSSStyleSheet.insertRule()` for each new atomic
   class. AOT eliminates all of these calls because CSS is loaded via `<link>` tags.
2. **No hash computation** — Runtime Griffel computes hashes for each property/value at first render.
   AOT pre-computes all hashes at build time.
3. **Reduced main-thread work** — CSS parsing from `<link>` tags happens on the browser's CSS parser
   thread, not the main JavaScript thread.
4. **Faster SSR hydration** — With AOT, the server renders the same pre-computed class names. The
   client does not need to re-compute or reconcile them.

---

## 9. Debugging Guide

### Reading Atomic Class Names

Every Griffel atomic class follows the pattern `f{hash}` where `{hash}` is a base-36 string derived
from the CSS property and value.

**To identify what an atomic class does:**

1. Open browser DevTools > Elements panel
2. Select the element with the atomic classes
3. In the Styles panel, find the matching rule (e.g., `.f22iagw { display: flex; }`)

Alternatively, search the `<style>` tags in the `<head>`:

1. Open DevTools > Elements panel
2. Expand `<head>`
3. Find `<style data-make-styles>` tags
4. Search within them for the class name

### Common Mistakes and Fixes

#### Mistake 1: String concatenation instead of mergeClasses

**Symptom:** Styles flicker or are inconsistent across renders. The same component has different
appearances depending on render order.

**Diagnosis:** Search for template literals or string concatenation with `styles.`:

```tsx
// Find this pattern
className={`${styles.root} ${condition && styles.active}`}
// Replace with
className={mergeClasses(styles.root, condition && styles.active)}
```

#### Mistake 2: CSS shorthands in makeStyles

**Symptom:** Styles are not applied, or only partially applied. Border, padding, or margin
behaves unexpectedly.

**Diagnosis:** Look for shorthand CSS properties in `makeStyles` objects:

```tsx
// Find
const useStyles = makeStyles({
  root: {
    padding: '8px 16px',         // WRONG
    border: '1px solid #ccc',    // WRONG
    margin: '0 auto',            // WRONG
  },
});

// Replace with
const useStyles = makeStyles({
  root: {
    ...shorthands.padding('8px', '16px'),
    ...shorthands.border('1px', 'solid', '#ccc'),
    ...shorthands.margin('0', 'auto'),
  },
});
```

#### Mistake 3: Using !important

**Symptom:** A component cannot be styled by its parent, even when using `mergeClasses`.

**Diagnosis:** Search for `!important` in `makeStyles` calls.

**Fix:** Remove `!important` and use `mergeClasses` ordering to control specificity. If the
issue is with a third-party component, wrap it and apply styles via `mergeClasses` with the
external class last.

#### Mistake 4: Multiple mergeClasses calls for one element

**Symptom:** Styles are correct but performance is suboptimal.

**Diagnosis:** Look for nested `mergeClasses`:

```tsx
// Find
className={mergeClasses(mergeClasses(base, styles.root), className)}
// Replace with
className={mergeClasses(base, styles.root, className)}
```

#### Mistake 5: Hardcoded colors instead of tokens

**Symptom:** Component looks wrong in dark mode or high contrast mode.

**Diagnosis:** Search for hex color values, `rgb()`, `rgba()`, or named colors in `makeStyles`:

```tsx
// Find
color: '#333',
backgroundColor: 'white',
borderColor: 'rgba(0,0,0,0.1)',

// Replace with
color: tokens.colorNeutralForeground1,
backgroundColor: tokens.colorNeutralBackground1,
borderColor: tokens.colorNeutralStroke2,
```

#### Mistake 6: Styling icons with fill instead of color

**Symptom:** Icon color does not change.

**Diagnosis:** Fluent icons use `fill="currentColor"` in SVG. The correct CSS property is `color`.

```tsx
// WRONG
const useStyles = makeStyles({
  icon: { fill: 'red' },
});

// CORRECT
const useStyles = makeStyles({
  icon: { color: tokens.colorBrandForeground1 },
});
```

#### Mistake 7: Missing className prop forwarding

**Symptom:** Parent component cannot override child component styles.

**Diagnosis:** Check that your component accepts and passes a `className` prop to `mergeClasses`:

```tsx
// WRONG — className is not forwarded
function MyCard({ children }: Props) {
  const styles = useStyles();
  return <div className={styles.root}>{children}</div>;
}

// CORRECT — className is accepted and merged last
function MyCard({ children, className }: Props) {
  const styles = useStyles();
  return <div className={mergeClasses(styles.root, className)}>{children}</div>;
}
```

#### Mistake 8: Using tag selectors

**Symptom:** Styles are slow to apply or break when component internals change.

**Diagnosis:** Search for `'> div'`, `'> span'`, `'> svg'`, etc. in style objects.

**Fix:** Replace tag selectors with direct `className` props on child elements.

### Class Ordering Issues

When styles are not applying as expected, the issue is usually `mergeClasses` argument order:

```tsx
// Problem: primary styles are overridden by base styles
mergeClasses(styles.primary, styles.root)  // root comes LAST, so root wins

// Fix: base first, variants after
mergeClasses(styles.root, styles.primary)  // primary comes LAST, so primary wins

// Full pattern: base → variant → state → external
mergeClasses(
  baseClass,          // 1. makeResetStyles base
  styles.root,        // 2. makeStyles base
  styles.primary,     // 3. Variant
  disabled && styles.disabled,  // 4. State
  className           // 5. External override (always last)
)
```

---

## 10. Migration from styled-components / Emotion

### Migration Strategy

1. **Install Griffel** — Add `@fluentui/react-components` (or `@griffel/react` standalone).
2. **Convert one component at a time** — Both systems can coexist during migration.
3. **Convert styled components** to `makeStyles` hooks.
4. **Convert CSS prop usage** to `makeStyles` + `mergeClasses`.
5. **Remove old dependencies** once migration is complete.

### styled-components to Griffel

**Before (styled-components):**

```tsx
import styled from 'styled-components';

const Card = styled.div`
  display: flex;
  flex-direction: column;
  padding: 16px 24px;
  border-radius: 8px;
  background-color: ${props => props.theme.colors.surface};
  color: ${props => props.theme.colors.text};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  &:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
  }

  ${props => props.primary && `
    background-color: ${props.theme.colors.primary};
    color: white;
  `}

  @media (max-width: 768px) {
    padding: 12px 16px;
  }
`;

const CardTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
`;

function MyCard({ primary, children }) {
  return (
    <Card primary={primary}>
      <CardTitle>Title</CardTitle>
      {children}
    </Card>
  );
}
```

**After (Griffel):**

```tsx
import { makeStyles, makeResetStyles, mergeClasses, shorthands, tokens } from '@fluentui/react-components';

const useBaseCardClass = makeResetStyles({
  display: 'flex',
  flexDirection: 'column',
  padding: '16px 24px',
  borderRadius: tokens.borderRadiusLarge,
  backgroundColor: tokens.colorNeutralBackground1,
  color: tokens.colorNeutralForeground1,
  boxShadow: tokens.shadow4,
  transitionProperty: 'box-shadow, transform',
  transitionDuration: tokens.durationNormal,

  ':hover': {
    boxShadow: tokens.shadow8,
    transform: 'translateY(-2px)',
  },

  '@media (max-width: 768px)': {
    padding: '12px 16px',
  },
});

const useStyles = makeStyles({
  primary: {
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    ':hover': {
      backgroundColor: tokens.colorBrandBackgroundHover,
    },
  },
  title: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightSemibold,
    ...shorthands.margin('0', '0', tokens.spacingVerticalS, '0'),
  },
});

function MyCard({ primary, className, children }: Props) {
  const baseCardClass = useBaseCardClass();
  const styles = useStyles();

  return (
    <div className={mergeClasses(baseCardClass, primary && styles.primary, className)}>
      <h3 className={styles.title}>Title</h3>
      {children}
    </div>
  );
}
```

### Emotion css prop to Griffel

**Before (Emotion):**

```tsx
/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';

function Badge({ color, children }) {
  return (
    <span
      css={css`
        display: inline-flex;
        align-items: center;
        padding: 2px 8px;
        border-radius: 9999px;
        font-size: 12px;
        font-weight: 600;
        background-color: ${color};
        color: white;
      `}
    >
      {children}
    </span>
  );
}
```

**After (Griffel):**

```tsx
import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    ...shorthands.padding('2px', '8px'),
    ...shorthands.borderRadius('9999px'),
    fontSize: tokens.fontSizeBase100,
    fontWeight: tokens.fontWeightSemibold,
    backgroundColor: 'var(--badge-bg)',
    color: 'white',
  },
});

function Badge({ color, className, children }: Props) {
  const styles = useStyles();
  return (
    <span
      className={mergeClasses(styles.badge, className)}
      style={{ '--badge-bg': color } as React.CSSProperties}
    >
      {children}
    </span>
  );
}
```

### Emotion styled to Griffel

**Before (Emotion styled):**

```tsx
import styled from '@emotion/styled';

const Container = styled.div<{ fluid?: boolean }>`
  max-width: ${props => props.fluid ? '100%' : '1200px'};
  margin: 0 auto;
  padding: 0 24px;

  @media (max-width: 768px) {
    padding: 0 16px;
  }
`;
```

**After (Griffel):**

```tsx
import { makeStyles, mergeClasses, shorthands } from '@fluentui/react-components';

const useStyles = makeStyles({
  container: {
    maxWidth: '1200px',
    marginLeft: 'auto',
    marginRight: 'auto',
    ...shorthands.padding('0', '24px'),

    '@media (max-width: 768px)': {
      ...shorthands.padding('0', '16px'),
    },
  },
  fluid: {
    maxWidth: '100%',
  },
});

function Container({ fluid, className, children }: Props) {
  const styles = useStyles();
  return (
    <div className={mergeClasses(styles.container, fluid && styles.fluid, className)}>
      {children}
    </div>
  );
}
```

### Migration Checklist

1. Replace `styled.div` / `styled(Component)` with `makeStyles` or `makeResetStyles`
2. Replace CSS template literals with camelCase style objects
3. Replace theme interpolations (`${props => props.theme.x}`) with Fluent `tokens.*`
4. Replace `css` prop with `className` + `mergeClasses`
5. Replace dynamic prop interpolations with CSS variables or conditional `mergeClasses`
6. Replace CSS shorthands with `shorthands.*` (in `makeStyles` only)
7. Convert `&:hover` / `&::before` to `':hover'` / `'::before'` object keys
8. Add `className` prop to all components for composability
9. Ensure `className` is always the last argument in `mergeClasses`
10. Remove Emotion / styled-components dependencies when migration is complete

---

## 11. Complete Code Examples

### Example 1: Full Application Shell

```tsx
import {
  makeStyles,
  makeResetStyles,
  mergeClasses,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import {
  NavigationRegular,
  SettingsRegular,
  PersonRegular,
  SearchRegular,
} from '@fluentui/react-icons';

// --- App shell base styles ---
const useShellBase = makeResetStyles({
  display: 'grid',
  gridTemplateAreas: '"header header" "nav main"',
  gridTemplateColumns: '280px 1fr',
  gridTemplateRows: '48px 1fr',
  height: '100vh',
  backgroundColor: tokens.colorNeutralBackground2,

  '@media (max-width: 768px)': {
    gridTemplateAreas: '"header" "main"',
    gridTemplateColumns: '1fr',
    gridTemplateRows: '48px 1fr',
  },
});

const useShellStyles = makeStyles({
  // --- Header ---
  header: {
    gridArea: 'header',
    display: 'flex',
    alignItems: 'center',
    ...shorthands.padding('0', tokens.spacingHorizontalL),
    ...shorthands.gap(tokens.spacingHorizontalM),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderBottom(tokens.strokeWidthThin, 'solid', tokens.colorNeutralStroke2),
    zIndex: 100,
  },
  headerTitle: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    ...shorthands.flex(1),
  },
  headerAction: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    backgroundColor: 'transparent',
    color: tokens.colorNeutralForeground2,
    cursor: 'pointer',
    ...shorthands.border('0'),
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      color: tokens.colorNeutralForeground1,
    },
    ':focus-visible': {
      ...shorthands.outline('2px', 'solid', tokens.colorStrokeFocus2),
      outlineOffset: '2px',
    },
  },

  // --- Navigation ---
  nav: {
    gridArea: 'nav',
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalS),
    ...shorthands.gap(tokens.spacingVerticalXS),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRight(tokens.strokeWidthThin, 'solid', tokens.colorNeutralStroke2),
    overflowY: 'auto',

    '@media (max-width: 768px)': {
      display: 'none',
    },
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalS),
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.border('0'),
    backgroundColor: 'transparent',
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase300,
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      color: tokens.colorNeutralForeground1,
    },
    ':focus-visible': {
      ...shorthands.outline('2px', 'solid', tokens.colorStrokeFocus2),
      outlineOffset: '-2px',
    },
  },
  navItemActive: {
    backgroundColor: tokens.colorNeutralBackground1Selected,
    color: tokens.colorNeutralForeground1,
    fontWeight: tokens.fontWeightSemibold,
    '::before': {
      content: '""',
      display: 'block',
      width: '3px',
      height: '16px',
      ...shorthands.borderRadius('2px'),
      backgroundColor: tokens.colorBrandBackground,
      marginRight: tokens.spacingHorizontalXS,
      marginLeft: `-${tokens.spacingHorizontalXS}`,
    },
  },

  // --- Main content ---
  main: {
    gridArea: 'main',
    ...shorthands.padding(tokens.spacingVerticalXL, tokens.spacingHorizontalXL),
    overflowY: 'auto',
    backgroundColor: tokens.colorNeutralBackground2,
  },
  mainContent: {
    maxWidth: '960px',
    marginLeft: 'auto',
    marginRight: 'auto',
  },
});

interface AppShellProps {
  title: string;
  activeNav?: string;
  navItems: Array<{ id: string; label: string; icon: React.ReactNode }>;
  children: React.ReactNode;
}

export function AppShell({ title, activeNav, navItems, children }: AppShellProps) {
  const shellBase = useShellBase();
  const styles = useShellStyles();

  return (
    <div className={shellBase}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.headerAction} aria-label="Toggle navigation">
          <NavigationRegular />
        </button>
        <span className={styles.headerTitle}>{title}</span>
        <button className={styles.headerAction} aria-label="Search">
          <SearchRegular />
        </button>
        <button className={styles.headerAction} aria-label="Settings">
          <SettingsRegular />
        </button>
        <button className={styles.headerAction} aria-label="Profile">
          <PersonRegular />
        </button>
      </header>

      {/* Navigation */}
      <nav className={styles.nav}>
        {navItems.map(item => (
          <button
            key={item.id}
            className={mergeClasses(
              styles.navItem,
              activeNav === item.id && styles.navItemActive
            )}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      {/* Main content */}
      <main className={styles.main}>
        <div className={styles.mainContent}>{children}</div>
      </main>
    </div>
  );
}
```

### Example 2: Data Table with Striped Rows and Sorting

```tsx
import {
  makeStyles,
  mergeClasses,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import {
  ArrowSortRegular,
  ArrowSortUpRegular,
  ArrowSortDownRegular,
} from '@fluentui/react-icons';

const useStyles = makeStyles({
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.overflow('hidden'),
    boxShadow: tokens.shadow2,
  },
  headerRow: {
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.borderBottom('2px', 'solid', tokens.colorNeutralStroke1),
  },
  headerCell: {
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM),
    textAlign: 'left',
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    cursor: 'pointer',
    userSelect: 'none',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground3Hover,
      color: tokens.colorNeutralForeground1,
    },
  },
  headerCellSorted: {
    color: tokens.colorBrandForeground1,
    ':hover': {
      color: tokens.colorBrandForeground1,
    },
  },
  headerCellContent: {
    display: 'inline-flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalXS),
  },
  sortIcon: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
  },
  sortIconActive: {
    color: tokens.colorBrandForeground1,
  },
  bodyRow: {
    ...shorthands.borderBottom(tokens.strokeWidthThin, 'solid', tokens.colorNeutralStroke2),
    transitionProperty: 'background-color',
    transitionDuration: tokens.durationFaster,
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
    ':last-child': {
      borderBottomWidth: '0',
    },
  },
  bodyRowStriped: {
    backgroundColor: tokens.colorNeutralBackground2,
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground2Hover,
    },
  },
  bodyRowSelected: {
    backgroundColor: tokens.colorNeutralBackground1Selected,
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Selected,
    },
  },
  bodyCell: {
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM),
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground1,
    verticalAlign: 'middle',
  },
  bodyCellNumeric: {
    fontVariantNumeric: 'tabular-nums',
    textAlign: 'right',
  },
  emptyState: {
    ...shorthands.padding(tokens.spacingVerticalXXL),
    textAlign: 'center',
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase300,
    fontStyle: 'italic',
  },
});

type SortDirection = 'asc' | 'desc' | null;

interface Column<T> {
  key: keyof T & string;
  label: string;
  numeric?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  sortColumn?: string;
  sortDirection?: SortDirection;
  onSort?: (column: string) => void;
  selectedRows?: Set<number>;
  striped?: boolean;
  className?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  sortColumn,
  sortDirection,
  onSort,
  selectedRows,
  striped = true,
  className,
}: DataTableProps<T>) {
  const styles = useStyles();

  const SortIcon = ({ column }: { column: string }) => {
    const isActive = sortColumn === column;
    if (!isActive) return <ArrowSortRegular className={styles.sortIcon} />;
    if (sortDirection === 'asc')
      return <ArrowSortUpRegular className={mergeClasses(styles.sortIcon, styles.sortIconActive)} />;
    return <ArrowSortDownRegular className={mergeClasses(styles.sortIcon, styles.sortIconActive)} />;
  };

  return (
    <table className={mergeClasses(styles.table, className)}>
      <thead>
        <tr className={styles.headerRow}>
          {columns.map(col => (
            <th
              key={col.key}
              className={mergeClasses(
                styles.headerCell,
                sortColumn === col.key && styles.headerCellSorted
              )}
              onClick={() => onSort?.(col.key)}
            >
              <span className={styles.headerCellContent}>
                {col.label}
                <SortIcon column={col.key} />
              </span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.length === 0 ? (
          <tr>
            <td colSpan={columns.length} className={styles.emptyState}>
              No data available
            </td>
          </tr>
        ) : (
          data.map((row, idx) => (
            <tr
              key={idx}
              className={mergeClasses(
                styles.bodyRow,
                striped && idx % 2 === 1 && styles.bodyRowStriped,
                selectedRows?.has(idx) && styles.bodyRowSelected
              )}
            >
              {columns.map(col => (
                <td
                  key={col.key}
                  className={mergeClasses(
                    styles.bodyCell,
                    col.numeric && styles.bodyCellNumeric
                  )}
                >
                  {String(row[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
```

### Example 3: Animated Card with Skeleton Loading

```tsx
import {
  makeStyles,
  makeResetStyles,
  mergeClasses,
  shorthands,
  tokens,
} from '@fluentui/react-components';

const shimmerKeyframes = {
  '0%': { backgroundPosition: '-200px 0' },
  '100%': { backgroundPosition: '200px 0' },
};

const useSkeletonBase = makeResetStyles({
  display: 'block',
  borderRadius: tokens.borderRadiusSmall,
  backgroundColor: tokens.colorNeutralBackground5,
  backgroundImage: `linear-gradient(
    90deg,
    ${tokens.colorNeutralBackground5} 0px,
    ${tokens.colorNeutralBackground6} 40px,
    ${tokens.colorNeutralBackground5} 80px
  )`,
  backgroundSize: '200px 100%',
  backgroundRepeat: 'no-repeat',
});

const useStyles = makeStyles({
  // Skeleton variants
  shimmer: {
    animationName: shimmerKeyframes,
    animationDuration: '1.5s',
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite',
  },
  skeletonText: {
    height: '14px',
    width: '100%',
    marginBottom: tokens.spacingVerticalS,
  },
  skeletonTextShort: {
    width: '60%',
  },
  skeletonAvatar: {
    width: '40px',
    height: '40px',
    ...shorthands.borderRadius(tokens.borderRadiusCircular),
  },
  skeletonImage: {
    width: '100%',
    height: '180px',
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
  },

  // Card styles
  card: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRadius(tokens.borderRadiusLarge),
    ...shorthands.overflow('hidden'),
    boxShadow: tokens.shadow4,
    transitionProperty: 'box-shadow, transform',
    transitionDuration: tokens.durationNormal,
    transitionTimingFunction: tokens.curveDecelerateMax,

    ':hover': {
      boxShadow: tokens.shadow8,
      transform: 'translateY(-2px)',
    },

    '@media (prefers-reduced-motion: reduce)': {
      transitionDuration: '0.01ms',
      ':hover': {
        transform: 'none',
      },
    },
  },
  cardImage: {
    width: '100%',
    height: '180px',
    objectFit: 'cover',
    display: 'block',
  },
  cardBody: {
    ...shorthands.padding(tokens.spacingVerticalL, tokens.spacingHorizontalL),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalS),
  },
  cardMeta: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalS),
  },
  cardAvatar: {
    width: '32px',
    height: '32px',
    ...shorthands.borderRadius(tokens.borderRadiusCircular),
    objectFit: 'cover',
  },
  cardAuthor: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  cardTitle: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    lineHeight: tokens.lineHeightBase400,
  },
  cardDescription: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground2,
    lineHeight: tokens.lineHeightBase300,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflowY: 'hidden',
  },
});

interface ArticleCardProps {
  loading?: boolean;
  image?: string;
  title?: string;
  description?: string;
  author?: { name: string; avatar: string };
  className?: string;
}

export function ArticleCard({
  loading = false,
  image,
  title,
  description,
  author,
  className,
}: ArticleCardProps) {
  const skeletonBase = useSkeletonBase();
  const styles = useStyles();

  if (loading) {
    return (
      <div className={mergeClasses(styles.card, className)}>
        <div className={mergeClasses(skeletonBase, styles.shimmer, styles.skeletonImage)} />
        <div className={styles.cardBody}>
          <div className={styles.cardMeta}>
            <div className={mergeClasses(skeletonBase, styles.shimmer, styles.skeletonAvatar)} />
            <div className={mergeClasses(skeletonBase, styles.shimmer, styles.skeletonText, styles.skeletonTextShort)} />
          </div>
          <div className={mergeClasses(skeletonBase, styles.shimmer, styles.skeletonText)} />
          <div className={mergeClasses(skeletonBase, styles.shimmer, styles.skeletonText, styles.skeletonTextShort)} />
        </div>
      </div>
    );
  }

  return (
    <div className={mergeClasses(styles.card, className)}>
      {image && <img className={styles.cardImage} src={image} alt="" />}
      <div className={styles.cardBody}>
        {author && (
          <div className={styles.cardMeta}>
            <img className={styles.cardAvatar} src={author.avatar} alt="" />
            <span className={styles.cardAuthor}>{author.name}</span>
          </div>
        )}
        {title && <h3 className={styles.cardTitle}>{title}</h3>}
        {description && <p className={styles.cardDescription}>{description}</p>}
      </div>
    </div>
  );
}
```

### Example 4: Responsive Dashboard Grid with CSS Variables

```tsx
import {
  makeStyles,
  mergeClasses,
  shorthands,
  tokens,
} from '@fluentui/react-components';

const useStyles = makeStyles({
  dashboard: {
    display: 'grid',
    gridTemplateColumns: 'repeat(var(--dashboard-cols, 1), 1fr)',
    ...shorthands.gap(tokens.spacingHorizontalL),
    ...shorthands.padding(tokens.spacingVerticalL),

    '@media (min-width: 640px)': {
      // Use CSS variable for column count so cards can span
    },
  },
  widget: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.overflow('hidden'),
    boxShadow: tokens.shadow2,
    gridColumn: 'var(--widget-span, span 1)',
  },
  widgetHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalL),
    ...shorthands.borderBottom(tokens.strokeWidthThin, 'solid', tokens.colorNeutralStroke2),
  },
  widgetTitle: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  widgetBody: {
    ...shorthands.padding(tokens.spacingVerticalL, tokens.spacingHorizontalL),
    ...shorthands.flex(1),
  },
  // Responsive column variants
  cols1: {},  // default
  cols2: {
    '@media (min-width: 640px)': {
      gridTemplateColumns: 'repeat(2, 1fr)',
    },
  },
  cols3: {
    '@media (min-width: 640px)': {
      gridTemplateColumns: 'repeat(2, 1fr)',
    },
    '@media (min-width: 1024px)': {
      gridTemplateColumns: 'repeat(3, 1fr)',
    },
  },
  cols4: {
    '@media (min-width: 640px)': {
      gridTemplateColumns: 'repeat(2, 1fr)',
    },
    '@media (min-width: 1024px)': {
      gridTemplateColumns: 'repeat(4, 1fr)',
    },
  },
});

interface WidgetProps {
  title: string;
  span?: number;
  children: React.ReactNode;
  className?: string;
}

export function Widget({ title, span = 1, children, className }: WidgetProps) {
  const styles = useStyles();

  return (
    <div
      className={mergeClasses(styles.widget, className)}
      style={{ '--widget-span': `span ${span}` } as React.CSSProperties}
    >
      <div className={styles.widgetHeader}>
        <span className={styles.widgetTitle}>{title}</span>
      </div>
      <div className={styles.widgetBody}>{children}</div>
    </div>
  );
}

interface DashboardProps {
  columns?: 1 | 2 | 3 | 4;
  children: React.ReactNode;
  className?: string;
}

export function Dashboard({ columns = 3, children, className }: DashboardProps) {
  const styles = useStyles();

  const colStyles: Record<number, string> = {
    1: styles.cols1,
    2: styles.cols2,
    3: styles.cols3,
    4: styles.cols4,
  };

  return (
    <div className={mergeClasses(styles.dashboard, colStyles[columns], className)}>
      {children}
    </div>
  );
}
```

### Example 5: Form with Validation States

```tsx
import {
  makeStyles,
  mergeClasses,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import {
  CheckmarkCircleRegular,
  ErrorCircleRegular,
  WarningRegular,
} from '@fluentui/react-icons';

const useStyles = makeStyles({
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalXS),
    marginBottom: tokens.spacingVerticalL,
  },
  label: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  required: {
    '::after': {
      content: '" *"',
      color: tokens.colorPaletteRedForeground1,
    },
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    height: '32px',
    ...shorthands.padding('0', tokens.spacingHorizontalM),
    ...shorthands.border(tokens.strokeWidthThin, 'solid', tokens.colorNeutralStroke1),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
    ...shorthands.outline('0'),

    ':focus-visible': {
      borderColor: tokens.colorBrandStroke1,
      ...shorthands.borderBottom('2px', 'solid', tokens.colorBrandStroke1),
    },
    '::placeholder': {
      color: tokens.colorNeutralForeground4,
    },
    ':disabled': {
      backgroundColor: tokens.colorNeutralBackgroundDisabled,
      color: tokens.colorNeutralForegroundDisabled,
      cursor: 'not-allowed',
    },
  },
  inputSuccess: {
    borderColor: tokens.colorPaletteGreenBorder2,
    ':focus-visible': {
      borderColor: tokens.colorPaletteGreenBorder2,
      ...shorthands.borderBottom('2px', 'solid', tokens.colorPaletteGreenBorder2),
    },
  },
  inputWarning: {
    borderColor: tokens.colorPaletteYellowBorder2,
    ':focus-visible': {
      borderColor: tokens.colorPaletteYellowBorder2,
      ...shorthands.borderBottom('2px', 'solid', tokens.colorPaletteYellowBorder2),
    },
  },
  inputError: {
    borderColor: tokens.colorPaletteRedBorder2,
    ':focus-visible': {
      borderColor: tokens.colorPaletteRedBorder2,
      ...shorthands.borderBottom('2px', 'solid', tokens.colorPaletteRedBorder2),
    },
  },
  validationIcon: {
    position: 'absolute',
    right: tokens.spacingHorizontalS,
    fontSize: '16px',
  },
  iconSuccess: {
    color: tokens.colorPaletteGreenForeground1,
  },
  iconWarning: {
    color: tokens.colorPaletteYellowForeground1,
  },
  iconError: {
    color: tokens.colorPaletteRedForeground1,
  },
  message: {
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
  },
  messageSuccess: {
    color: tokens.colorPaletteGreenForeground1,
  },
  messageWarning: {
    color: tokens.colorPaletteYellowForeground1,
  },
  messageError: {
    color: tokens.colorPaletteRedForeground1,
  },
});

type ValidationState = 'none' | 'success' | 'warning' | 'error';

interface FormFieldProps {
  label: string;
  required?: boolean;
  validationState?: ValidationState;
  validationMessage?: string;
  className?: string;
  children?: React.ReactNode;
}

export function FormField({
  label,
  required,
  validationState = 'none',
  validationMessage,
  className,
}: FormFieldProps) {
  const styles = useStyles();

  const inputStateStyles: Record<ValidationState, string | undefined> = {
    none: undefined,
    success: styles.inputSuccess,
    warning: styles.inputWarning,
    error: styles.inputError,
  };

  const iconStateStyles: Record<ValidationState, string | undefined> = {
    none: undefined,
    success: styles.iconSuccess,
    warning: styles.iconWarning,
    error: styles.iconError,
  };

  const messageStateStyles: Record<ValidationState, string | undefined> = {
    none: undefined,
    success: styles.messageSuccess,
    warning: styles.messageWarning,
    error: styles.messageError,
  };

  const ValidationIcon = () => {
    if (validationState === 'none') return null;
    const Icon = validationState === 'success'
      ? CheckmarkCircleRegular
      : validationState === 'error'
        ? ErrorCircleRegular
        : WarningRegular;

    return (
      <Icon
        className={mergeClasses(
          styles.validationIcon,
          iconStateStyles[validationState]
        )}
      />
    );
  };

  return (
    <div className={mergeClasses(styles.fieldGroup, className)}>
      <label className={mergeClasses(styles.label, required && styles.required)}>
        {label}
      </label>
      <div className={styles.inputWrapper}>
        <input
          className={mergeClasses(styles.input, inputStateStyles[validationState])}
          aria-invalid={validationState === 'error'}
          aria-required={required}
        />
        <ValidationIcon />
      </div>
      {validationMessage && (
        <span className={mergeClasses(styles.message, messageStateStyles[validationState])}>
          {validationMessage}
        </span>
      )}
    </div>
  );
}
```
