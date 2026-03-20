---
name: Fluent UI Extensibility & Migration
description: >
  Extending and customizing Fluent UI React v9 — slots (4 levels of customization), custom variants,
  customStyleHooks, headless/unstyled patterns, custom component authoring, and comprehensive v8 to v9
  migration guide with component mapping and incremental coexistence strategy.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - fluent slots
  - customStyleHooks
  - headless fluent
  - fluent recomposition
  - fluent custom component
  - fluent variant
  - v8 to v9
  - fluent migration
  - fluent extend
  - fluent wrapper
  - slot render function
  - fluent composition
  - fluent custom variant
  - fluent unstyled
---

# Fluent UI Extensibility & Migration — Knowledge Base

## Overview

Fluent UI React v9 follows a **composition over configuration** philosophy. Rather than exposing
hundreds of props on monolithic components, v9 decomposes each component into **slots** — named
sub-parts that can be individually customized, replaced, or removed. This architecture delivers
several advantages:

1. **Predictable DOM output** — Each slot maps to a single DOM element, making the rendered
   output easy to reason about and style.
2. **Incremental customization** — You start with zero-config defaults and add customization
   only where needed, at exactly the level of control you require.
3. **Type-safe extension** — Slots carry full TypeScript types, so customization is validated
   at compile time.
4. **Tree-shakeable** — Only the slots and hooks you use ship to the browser.

The extensibility model spans four key areas:

| Area | Use Case |
|---|---|
| **Slots** | Customize any sub-part of a component |
| **Custom Variants** | Create reusable pre-configured component flavors |
| **customStyleHooks** | Inject styles into Fluent components from outside |
| **Custom Components** | Author new components using Fluent's composition primitives |

**Key resources:**
- Storybook (concepts): https://react.fluentui.dev/
- GitHub: https://github.com/microsoft/fluentui
- Slots concepts: https://storybooks.fluentui.dev/react/?path=/docs/concepts-developer-customizing-components-with-slots--docs
- Advanced styling: https://storybooks.fluentui.dev/react/?path=/docs/concepts-developer-advanced-styling-techniques--docs

---

## Slots Deep-Dive

Slots are the primary extensibility mechanism in Fluent UI v9. Every component is built from
named slots — sub-parts that you can customize at four progressively deeper levels. Paul Gildea's
definitive guide covers these patterns in detail:
https://dev.to/paulgildea/using-slots-with-fluent-ui-react-v9-jf1

### Slot Architecture

A typical Fluent v9 component exposes its slots as typed props. For example, `Button` has:

```typescript
type ButtonSlots = {
  root: Slot<'button', 'a'>;  // The outer element
  icon?: Slot<'span'>;         // Optional icon wrapper
};
```

Each slot can accept JSX content, a props object, a render function, or `null` to suppress it.
The component resolves slots through the `resolveShorthand` utility, which normalizes all these
forms into a consistent internal representation.

### Level 1: Content Customization

The simplest form — pass JSX children directly to a slot prop.

```tsx
import { Button } from '@fluentui/react-components';
import { CalendarMonthRegular } from '@fluentui/react-icons';

// Pass an icon component to the `icon` slot
<Button icon={<CalendarMonthRegular />}>
  Schedule
</Button>
```

**Rendered HTML:**
```html
<button class="fui-Button" type="button">
  <span class="fui-Button__icon">
    <svg><!-- CalendarMonthRegular SVG --></svg>
  </span>
  Schedule
</button>
```

This works because the slot system wraps your JSX content in the slot's default element
(`<span>` for the icon slot). You control what goes inside; Fluent controls the wrapper.

### Level 2: Props Customization

Pass a props object to control attributes on the slot's DOM element.

```tsx
<Button
  icon={{
    children: <CalendarMonthRegular />,
    className: 'my-custom-icon',
    'aria-hidden': true,
    style: { color: 'red' },
  }}
>
  Schedule
</Button>
```

**Rendered HTML:**
```html
<button class="fui-Button" type="button">
  <span class="fui-Button__icon my-custom-icon" aria-hidden="true" style="color: red;">
    <svg><!-- CalendarMonthRegular SVG --></svg>
  </span>
  Schedule
</button>
```

The props are spread onto the slot's wrapper element, giving you control over className, style,
ARIA attributes, event handlers, data attributes, and any valid HTML attribute.

### Level 3: Element Type Change

Change the underlying HTML element of a slot using the `as` prop within the slot object.

```tsx
<Button
  icon={{
    as: 'div',
    children: <CalendarMonthRegular />,
  }}
>
  Schedule
</Button>
```

**Rendered HTML:**
```html
<button class="fui-Button" type="button">
  <div class="fui-Button__icon">
    <svg><!-- CalendarMonthRegular SVG --></svg>
  </div>
  Schedule
</button>
```

The `root` slot of Button supports `as: 'a'` to render as an anchor:

```tsx
<Button as="a" href="https://example.com">
  Visit Site
</Button>
```

**Rendered HTML:**
```html
<a class="fui-Button" href="https://example.com">
  Visit Site
</a>
```

Not all slots support all element types — the `Slot<'button', 'a'>` generic constrains
which elements are valid. TypeScript will flag invalid element types at compile time.

### Level 4: Render Function Replacement

Complete control over how a slot renders. Pass a `children` render function that receives
the component type and props, then return whatever JSX you want.

```tsx
import { Tooltip, Button } from '@fluentui/react-components';
import { CalendarMonthRegular } from '@fluentui/react-icons';

<Button
  icon={{
    children: (Component, props) => (
      <Tooltip content="Pick a date" relationship="label">
        <Component {...props}>
          <CalendarMonthRegular />
        </Component>
      </Tooltip>
    ),
  }}
>
  Schedule
</Button>
```

**Rendered HTML (when tooltip is shown):**
```html
<button class="fui-Button" type="button">
  <span class="fui-Button__icon" aria-describedby="tooltip-1">
    <svg><!-- CalendarMonthRegular SVG --></svg>
  </span>
  Schedule
</button>
<!-- Tooltip portal -->
<div role="tooltip" id="tooltip-1" class="fui-Tooltip">Pick a date</div>
```

The render function pattern is essential for wrapping slots in other Fluent components
(Tooltip, Popover) or injecting context providers around individual slots.

### Removing Slots

Set any optional slot to `null` to suppress it entirely:

```tsx
// Button with no icon slot rendered
<Button icon={null}>Just Text</Button>
```

### Slot Resolution Priority

When multiple customization forms overlap, the resolution priority is:

1. Render function (`children` as function) — highest priority
2. Props object — merged with defaults
3. JSX shorthand — wrapped in default element
4. Default value from component internals — lowest priority

---

## Custom Variants

Variants are pre-configured flavors of a component. Rather than repeating the same set of props
everywhere, you wrap them in a component. Paul Gildea outlines three approaches:
https://dev.to/paulgildea/creating-custom-variants-with-fluent-ui-react-v9-26a1

### Approach 1: CSS-Only Variant

The lightest approach — create a `makeStyles` class and apply it alongside the component's
existing classes using `mergeClasses`.

```tsx
import { Button, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import type { ButtonProps } from '@fluentui/react-components';

const useStyles = makeStyles({
  danger: {
    backgroundColor: tokens.colorPaletteRedBackground3,
    color: tokens.colorNeutralForegroundOnBrand,
    ':hover': {
      backgroundColor: tokens.colorPaletteRedForeground1,
    },
    ':active': {
      backgroundColor: tokens.colorPaletteRedForeground2,
    },
  },
});

const DangerButton: React.FC<ButtonProps> = ({ className, ...props }) => {
  const styles = useStyles();
  return (
    <Button
      {...props}
      className={mergeClasses(styles.danger, className)}
    />
  );
};
```

**When to use:** Visual-only changes. No behavior modification needed. The variant is purely
about applying different design tokens or spacing.

### Approach 2: Fixed Wrapper

A component that forces specific props, preventing the consumer from overriding them.

```tsx
import { Button } from '@fluentui/react-components';
import { DeleteRegular } from '@fluentui/react-icons';
import type { ButtonProps } from '@fluentui/react-components';

type DeleteButtonProps = Omit<ButtonProps, 'appearance' | 'icon'>;

const DeleteButton: React.FC<DeleteButtonProps> = (props) => {
  return (
    <Button
      {...props}
      appearance="primary"
      icon={<DeleteRegular />}
    />
  );
};
```

**When to use:** Enforcing consistent behavior across a codebase. The fixed props come after
`{...props}` to ensure they cannot be overridden by the consumer.

### Approach 3: Flexible Wrapper

A component that applies default styles but allows the consumer to extend or override them.

```tsx
import { Button, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import type { ButtonProps } from '@fluentui/react-components';

const useStyles = makeStyles({
  brandAccent: {
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    borderRadius: tokens.borderRadiusCircular,
    ':hover': {
      backgroundColor: tokens.colorBrandBackgroundHover,
    },
  },
});

type BrandPillButtonProps = ButtonProps & {
  variant?: 'default' | 'accent';
};

const BrandPillButton: React.FC<BrandPillButtonProps> = ({
  className,
  variant = 'accent',
  ...props
}) => {
  const styles = useStyles();
  return (
    <Button
      {...props}
      className={mergeClasses(
        variant === 'accent' && styles.brandAccent,
        className  // Consumer's className wins (comes last)
      )}
    />
  );
};
```

**When to use:** Providing a default look that consumers can still customize. The consumer's
`className` is passed last to `mergeClasses`, so it takes precedence.

### Advanced Styling Techniques

The Fluent storybook covers additional techniques:
https://storybooks.fluentui.dev/react/?path=/docs/concepts-developer-advanced-styling-techniques--docs

Key patterns include:

- **Style overrides via className** — Always use `mergeClasses` to combine Fluent's internal
  classes with your overrides. Never replace `className` directly.
- **Conditional styles** — Use `mergeClasses` with conditional expressions:
  ```tsx
  className={mergeClasses(styles.base, isActive && styles.active)}
  ```
- **Responsive styles** — Fluent's `makeStyles` supports media queries:
  ```tsx
  const useStyles = makeStyles({
    responsive: {
      width: '100%',
      '@media (min-width: 768px)': {
        width: '50%',
      },
    },
  });
  ```
- **Animation keyframes** — Use Griffel's keyframes support within `makeStyles`.

---

## customStyleHooks API

The `customStyleHooks` API on `FluentProvider` allows external systems (design systems built
on top of Fluent, theme packages, branding layers) to inject styles into Fluent components
without wrapping or modifying them.

### How It Works

`FluentProvider` accepts a `customStyleHooks_unstable` prop that maps component display names
to style hooks:

```tsx
import {
  FluentProvider,
  webLightTheme,
  makeStyles,
  mergeClasses,
} from '@fluentui/react-components';
import type { ButtonState } from '@fluentui/react-components';

const useCustomButtonStyles = makeStyles({
  root: {
    borderRadius: '9999px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
});

function useButtonStyleOverride(state: ButtonState): void {
  const styles = useCustomButtonStyles();
  state.root.className = mergeClasses(
    state.root.className,
    styles.root
  );
}

function App() {
  return (
    <FluentProvider
      theme={webLightTheme}
      customStyleHooks_unstable={{
        useButtonStyles_unstable: useButtonStyleOverride,
      }}
    >
      {/* All Buttons in this tree will have pill shape + uppercase */}
      <Button>I am styled by the provider</Button>
    </FluentProvider>
  );
}
```

### Available Style Hooks

Each Fluent component exports a `use<Component>Styles_unstable` hook. The `customStyleHooks`
map keys match these names:

| Component | Hook Key |
|---|---|
| Button | `useButtonStyles_unstable` |
| Input | `useInputStyles_unstable` |
| Card | `useCardStyles_unstable` |
| Dialog | `useDialogStyles_unstable` |
| Menu | `useMenuStyles_unstable` |
| Tooltip | `useTooltipStyles_unstable` |
| Popover | `usePopoverStyles_unstable` |
| (all others) | `use<ComponentName>Styles_unstable` |

### Important Notes

1. **`_unstable` suffix** — This API is marked unstable and may change between minor versions.
   Monitor the Fluent UI changelog when upgrading.
2. **Merge order** — Your custom styles are applied after the component's built-in styles,
   so they take precedence. Use `mergeClasses` to combine cleanly.
3. **Provider scoping** — Custom style hooks apply to all matching components within the
   provider's subtree. Nest providers to scope overrides to specific sections.
4. **State access** — The hook receives the component's full state object, so you can
   conditionally apply styles based on props like `appearance`, `size`, or `disabled`.

### Conditional Custom Styles

```tsx
function useButtonStyleOverride(state: ButtonState): void {
  const styles = useCustomButtonStyles();
  // Only apply custom styles to primary buttons
  if (state.appearance === 'primary') {
    state.root.className = mergeClasses(
      state.root.className,
      styles.primaryOverride
    );
  }
}
```

---

## Headless / Unstyled Components

The Fluent UI team has discussed headless (unstyled) component support in GitHub issue #35562:
https://github.com/microsoft/fluentui/issues/35562

### Current State

As of v9, Fluent UI components are **not fully headless** — they ship with both behavior hooks
and default styles. However, the architecture partially supports unstyled usage:

1. **State hooks are separate from styles** — Each component has a `use<Component>_unstable`
   hook that returns state without applying styles. You can call this hook and skip the
   built-in `use<Component>Styles_unstable`.

2. **Render functions are separate** — `render<Component>_unstable` takes state and produces
   JSX. It does not apply styles — that happens in the style hook.

3. **The composition pattern enables "bring your own styles":**
   ```tsx
   import {
     useButton_unstable,
     renderButton_unstable,
     // Intentionally NOT importing useButtonStyles_unstable
   } from '@fluentui/react-components';

   const UnstyledButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
     (props, ref) => {
       const state = useButton_unstable(props, ref);
       // Skip: useButtonStyles_unstable(state);
       // Apply your own styles instead:
       state.root.className = 'my-custom-button';
       return renderButton_unstable(state);
     }
   );
   ```

### Limitations

- **Not officially supported** — Skipping the style hook is an undocumented pattern. The
  internal state shape may change between versions.
- **Accessibility styles may be lost** — Some accessibility-critical styles (focus indicators,
  high-contrast mode) are applied in the style hook. Skipping it means you must implement
  these yourself.
- **No published headless package** — Unlike libraries like Radix UI or Headless UI, Fluent
  does not publish a separate headless package.

### Recommended Approach

If you need unstyled Fluent components:

1. **Use `customStyleHooks`** to override styles at the provider level rather than skipping
   the style hook entirely.
2. **Use CSS-only variants** (see Custom Variants above) to replace visual styles while
   keeping accessibility styles intact.
3. **Monitor the GitHub issue** for official headless support: https://github.com/microsoft/fluentui/issues/35562

---

## Custom Component Authoring

Building new components that integrate with Fluent UI's composition system requires following
a three-part pattern. This ensures your component works with slots, theming, and style hooks
just like built-in Fluent components.

**GitHub discussions:**
- Component authoring guide: https://github.com/microsoft/fluentui/discussions/26689
- Advanced patterns: https://github.com/microsoft/fluentui/discussions/26890

### The Three-Part Pattern

Every Fluent v9 component is decomposed into three functions:

```
use<Component>_unstable(props, ref)  →  State hook (behavior + slot resolution)
use<Component>Styles_unstable(state) →  Style hook (makeStyles application)
render<Component>_unstable(state)    →  Render function (JSX output)
```

Plus a type definition for the component's slots.

### Step 1: Define Slots

```tsx
import type { ComponentProps, ComponentState, Slot } from '@fluentui/react-components';

// Define the slot structure
type StatusBadgeSlots = {
  root: NonNullable<Slot<'div'>>;
  icon?: Slot<'span'>;
  label?: Slot<'span'>;
  indicator: NonNullable<Slot<'span'>>;
};

// Props type — what consumers pass in
type StatusBadgeProps = ComponentProps<StatusBadgeSlots> & {
  status?: 'online' | 'away' | 'busy' | 'offline';
  size?: 'small' | 'medium' | 'large';
};

// State type — what the hooks work with internally
type StatusBadgeState = ComponentState<StatusBadgeSlots> & {
  status: NonNullable<StatusBadgeProps['status']>;
  size: NonNullable<StatusBadgeProps['size']>;
};
```

### Step 2: State Hook

```tsx
import { getIntrinsicElementProps, slot } from '@fluentui/react-components';

function useStatusBadge_unstable(
  props: StatusBadgeProps,
  ref: React.Ref<HTMLDivElement>
): StatusBadgeState {
  const { status = 'offline', size = 'medium', ...rest } = props;

  const state: StatusBadgeState = {
    status,
    size,
    components: {
      root: 'div',
      icon: 'span',
      label: 'span',
      indicator: 'span',
    },
    root: slot.always(
      getIntrinsicElementProps('div', {
        ref,
        role: 'status',
        'aria-label': `Status: ${status}`,
        ...rest,
      }),
      { elementType: 'div' }
    ),
    icon: slot.optional(props.icon, { elementType: 'span' }),
    label: slot.optional(props.label, { elementType: 'span' }),
    indicator: slot.always(props.indicator, {
      defaultProps: { 'aria-hidden': true },
      elementType: 'span',
    }),
  };

  return state;
}
```

**Key utilities:**
- `slot.always(value, options)` — Slot is always rendered (required slot)
- `slot.optional(value, options)` — Slot renders only if the consumer provides content
- `getIntrinsicElementProps(tagName, props)` — Filters props to only valid HTML attributes
  for the given element type

### Step 3: Style Hook

```tsx
import { makeStyles, mergeClasses, tokens, shorthands } from '@fluentui/react-components';

const useRootStyles = makeStyles({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    ...shorthands.padding(tokens.spacingVerticalXS, tokens.spacingHorizontalS),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    backgroundColor: tokens.colorNeutralBackground1,
  },
  small: { fontSize: tokens.fontSizeBase200 },
  medium: { fontSize: tokens.fontSizeBase300 },
  large: { fontSize: tokens.fontSizeBase400 },
});

const useIndicatorStyles = makeStyles({
  base: {
    display: 'inline-block',
    width: '8px',
    height: '8px',
    ...shorthands.borderRadius(tokens.borderRadiusCircular),
  },
  online: { backgroundColor: tokens.colorPaletteGreenForeground1 },
  away: { backgroundColor: tokens.colorPaletteYellowForeground1 },
  busy: { backgroundColor: tokens.colorPaletteRedForeground1 },
  offline: { backgroundColor: tokens.colorNeutralForeground4 },
});

function useStatusBadgeStyles_unstable(state: StatusBadgeState): StatusBadgeState {
  const rootStyles = useRootStyles();
  const indicatorStyles = useIndicatorStyles();

  state.root.className = mergeClasses(
    'fui-StatusBadge',
    rootStyles.base,
    rootStyles[state.size],
    state.root.className
  );

  if (state.indicator) {
    state.indicator.className = mergeClasses(
      'fui-StatusBadge__indicator',
      indicatorStyles.base,
      indicatorStyles[state.status],
      state.indicator.className
    );
  }

  return state;
}
```

### Step 4: Render Function

```tsx
import { assertSlots } from '@fluentui/react-components';

function renderStatusBadge_unstable(state: StatusBadgeState) {
  assertSlots<StatusBadgeSlots>(state);

  return (
    <state.root>
      {state.icon && <state.icon />}
      <state.indicator />
      {state.label && <state.label />}
    </state.root>
  );
}
```

### Step 5: Compose the Component

```tsx
import * as React from 'react';

const StatusBadge = React.forwardRef<HTMLDivElement, StatusBadgeProps>(
  (props, ref) => {
    const state = useStatusBadge_unstable(props, ref);
    useStatusBadgeStyles_unstable(state);
    return renderStatusBadge_unstable(state);
  }
);

StatusBadge.displayName = 'StatusBadge';

export {
  StatusBadge,
  useStatusBadge_unstable,
  useStatusBadgeStyles_unstable,
  renderStatusBadge_unstable,
};
export type { StatusBadgeProps, StatusBadgeState, StatusBadgeSlots };
```

### Why Export Everything

Exporting all three functions plus types enables consumers to:

1. **Recompose** — Replace the style hook with their own
2. **Extend state** — Add behavior in a wrapper that calls the state hook
3. **Customize rendering** — Replace the render function while keeping behavior
4. **Type-safe wrappers** — Use the state/slot types for derived components

---

## v8 to v9 Migration Guide

Migrating from Fluent UI React v8 (`@fluentui/react`) to v9 (`@fluentui/react-components`)
is a significant but incremental process. The two versions can coexist in the same application,
allowing gradual migration.

### What's New in v9

Paul Gildea's overview: https://dev.to/paulgildea/whats-new-with-fluent-ui-react-v9-5h2d

Key architectural changes:

| Aspect | v8 | v9 |
|---|---|---|
| **Package** | `@fluentui/react` (monolith) | `@fluentui/react-components` (re-exports from granular packages) |
| **Styling** | `mergeStyleSets`, CSS-in-JS at runtime | Griffel `makeStyles` (atomic CSS, build-time extraction) |
| **Theming** | `ThemeProvider` + `ITheme` | `FluentProvider` + token-based themes |
| **DOM weight** | Heavier DOM (many wrapper divs) | Lighter DOM (fewer elements) |
| **Icons** | `@fluentui/react-icons-mdl2` (icon fonts) | `@fluentui/react-icons` (SVG, tree-shakeable) |
| **Composition** | Props-heavy, render callbacks | Slots, hooks, composition functions |
| **Bundle** | Large single bundle | Tree-shakeable, granular imports |
| **TypeScript** | Partial typing | Full strict TypeScript |

### Architecture Deep-Dive

Architecture document: https://hackmd.io/@fluentui/HJoyoD1lD

The v9 architecture separates concerns:
- **State management** — React hooks (`use<Component>_unstable`)
- **Styling** — Griffel makeStyles (`use<Component>Styles_unstable`)
- **Rendering** — Pure render functions (`render<Component>_unstable`)
- **Types** — Slot types, component props, state interfaces

This separation enables the extensibility patterns described above.

### Diamond Dependency Strategy

v9 uses a "diamond dependency" approach where `@fluentui/react-components` re-exports from
many smaller packages (`@fluentui/react-button`, `@fluentui/react-input`, etc.). You should:

- **Import from `@fluentui/react-components`** — not from individual packages
- **Let the package manager dedupe** — All sub-packages share the same version
- **Avoid mixing import paths** — Importing from both the umbrella and individual packages
  can cause duplicate instances

### Component Mapping: v8 to v9

| v8 Component | v9 Component | Notes |
|---|---|---|
| `DefaultButton` | `Button` | `appearance="secondary"` (default) |
| `PrimaryButton` | `Button` | `appearance="primary"` |
| `ActionButton` | `Button` | `appearance="transparent"` |
| `CommandBarButton` | `Button` | `appearance="transparent"` |
| `IconButton` | `Button` | `icon={...}` with no children |
| `CompoundButton` | `CompoundButton` | Direct equivalent |
| `Toggle` / `ToggleButton` | `ToggleButton` | Uses `checked` prop |
| `SplitButton` | `SplitButton` | Simplified API |
| `MenuButton` | `MenuButton` | Simplified API |
| `Link` | `Link` | Direct equivalent |
| `Checkbox` | `Checkbox` | Direct equivalent |
| `ChoiceGroup` | `RadioGroup` + `Radio` | Renamed |
| `TextField` | `Input` | Renamed |
| `SpinButton` | `SpinButton` | Direct equivalent |
| `Slider` | `Slider` | Direct equivalent |
| `Dropdown` | `Dropdown` + `Option` | New composition pattern |
| `ComboBox` | `Combobox` + `Option` | New composition pattern |
| `DatePicker` | `DatePicker` | From `@fluentui/react-datepicker-compat` |
| `DetailsList` | `DataGrid` | Complete rewrite |
| `Label` | `Label` | Direct equivalent |
| `Text` | `Text` | Direct equivalent |
| `Persona` | `Avatar` + `Persona` | Split into focused components |
| `Dialog` | `Dialog` + `DialogSurface` + `DialogBody` + `DialogTitle` + `DialogContent` + `DialogActions` | Decomposed into slots |
| `Panel` | `Drawer` / `OverlayDrawer` | Renamed + redesigned |
| `Modal` | `Dialog` | With `modalType="modal"` |
| `Callout` | `Popover` | Renamed |
| `TeachingBubble` | `Popover` | With custom content |
| `Tooltip` | `Tooltip` | Direct equivalent |
| `ContextualMenu` | `Menu` + `MenuTrigger` + `MenuPopover` + `MenuList` + `MenuItem` | Decomposed |
| `CommandBar` | `Toolbar` | Renamed |
| `Pivot` | `TabList` + `Tab` | Renamed |
| `Nav` | `Nav` / `NavDrawer` | Redesigned |
| `Breadcrumb` | `Breadcrumb` + `BreadcrumbItem` + `BreadcrumbButton` | Decomposed |
| `MessageBar` | `MessageBar` + `MessageBarBody` + `MessageBarTitle` + `MessageBarActions` | Decomposed |
| `ProgressIndicator` | `ProgressBar` | Renamed |
| `Spinner` | `Spinner` | Direct equivalent |
| `Badge` | `Badge` / `CounterBadge` / `PresenceBadge` | Split into variants |
| `Shimmer` | `Skeleton` | Renamed |
| `Separator` | `Divider` | Renamed |
| `Image` | `Image` | Direct equivalent |
| `Stack` | *Removed* | Use CSS Flexbox/Grid directly |
| `Text` (with variant) | `Text` / `Title1-3` / `Subtitle1-2` / `Body1-2` / `Caption1-2` / `LargeTitle` | Typography components |
| `SearchBox` | `SearchBox` | From `@fluentui/react-search` |
| `Announced` | *Removed* | Use native `aria-live` regions |
| `Layer` | *Not needed* | Portals handled by component internals |
| `ThemeProvider` | `FluentProvider` | New theming model |
| `Fabric` | `FluentProvider` | Merged |

### Import Path Changes

```tsx
// v8
import { DefaultButton, TextField, Dropdown } from '@fluentui/react';
import { initializeIcons } from '@fluentui/react/lib/Icons';

// v9
import {
  Button,
  Input,
  Dropdown,
  Option,
  FluentProvider,
  webLightTheme,
} from '@fluentui/react-components';
// Icons are imported individually (tree-shakeable)
import { SearchRegular, SettingsRegular } from '@fluentui/react-icons';
```

### Styling Migration

**v8 — mergeStyleSets / mergeStyles:**
```tsx
import { mergeStyleSets } from '@fluentui/react';

const classNames = mergeStyleSets({
  root: {
    display: 'flex',
    padding: '16px',
    backgroundColor: '#f3f3f3',
    selectors: {
      ':hover': {
        backgroundColor: '#e0e0e0',
      },
    },
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#323130',
  },
});

// Usage
<div className={classNames.root}>
  <span className={classNames.title}>Hello</span>
</div>
```

**v9 — makeStyles + tokens:**
```tsx
import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    padding: tokens.spacingHorizontalL,
    backgroundColor: tokens.colorNeutralBackground2,
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground2Hover,
    },
  },
  title: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
});

// Usage
const MyComponent = () => {
  const styles = useStyles();
  return (
    <div className={styles.root}>
      <span className={styles.title}>Hello</span>
    </div>
  );
};
```

**Key differences:**
1. `makeStyles` is a hook — must be called inside a React component
2. Use `tokens.*` instead of hardcoded values
3. Pseudo-selectors use CSS syntax (`:hover`) not `selectors: {}` wrapper
4. Use `mergeClasses()` to combine class names (not string concatenation)
5. Griffel generates atomic CSS classes for optimal caching and deduplication

### Theme Migration

v8 uses `ITheme` with semantic color slots. v9 uses flat token objects.

**v8 theme access:**
```tsx
import { useTheme } from '@fluentui/react';
const theme = useTheme();
const bg = theme.semanticColors.bodyBackground;
```

**v9 theme access:**
```tsx
import { tokens } from '@fluentui/react-components';
// tokens are CSS custom properties — use them directly in makeStyles
const useStyles = makeStyles({
  root: {
    backgroundColor: tokens.colorNeutralBackground1,
  },
});
```

**Common token mappings (v8 semantic colors to v9 tokens):**

| v8 `semanticColors.*` | v9 `tokens.*` |
|---|---|
| `bodyBackground` | `colorNeutralBackground1` |
| `bodyText` | `colorNeutralForeground1` |
| `bodySubtext` | `colorNeutralForeground2` |
| `disabledBackground` | `colorNeutralBackgroundDisabled` |
| `disabledText` | `colorNeutralForegroundDisabled` |
| `errorText` | `colorPaletteRedForeground1` |
| `inputBackground` | `colorNeutralBackground1` |
| `inputBorder` | `colorNeutralStroke1` |
| `inputBorderHovered` | `colorNeutralStroke1Hover` |
| `inputFocusBorderAlt` | `colorCompoundBrandStroke` |
| `link` | `colorBrandForegroundLink` |
| `linkHovered` | `colorBrandForegroundLinkHover` |
| `primaryButtonBackground` | `colorBrandBackground` |
| `primaryButtonBackgroundHovered` | `colorBrandBackgroundHover` |
| `primaryButtonText` | `colorNeutralForegroundOnBrand` |
| `buttonBackground` | `colorNeutralBackground1` |
| `buttonText` | `colorNeutralForeground1` |
| `menuBackground` | `colorNeutralBackground1` |
| `menuItemBackgroundHovered` | `colorNeutralBackground1Hover` |
| `menuItemText` | `colorNeutralForeground1` |

**Theme migration resources:**
- Theme application guide: https://github.com/microsoft/fluentui/wiki/How-to-apply-theme-to-Fluent-UI-React-components
- Theming in v9 (video): https://learn.microsoft.com/en-us/shows/fluent-ui-insights/fluent-ui-insights-theming-in-v9

### Incremental Coexistence Strategy

v8 and v9 can run side-by-side in the same application. This is the recommended approach for
large codebases.

#### Setup

```tsx
import { ThemeProvider } from '@fluentui/react';          // v8
import { FluentProvider, webLightTheme } from '@fluentui/react-components'; // v9

function App() {
  return (
    <ThemeProvider>
      <FluentProvider theme={webLightTheme}>
        {/* Both v8 and v9 components work here */}
        <YourApp />
      </FluentProvider>
    </ThemeProvider>
  );
}
```

#### Migration Order

Recommended order for migrating components (lowest risk first):

1. **Icons** — Replace `@fluentui/react-icons-mdl2` with `@fluentui/react-icons`
2. **Typography** — Replace `Text` variants with v9 `Text`, `Title1`, `Body1`, etc.
3. **Buttons** — `DefaultButton` / `PrimaryButton` to `Button`
4. **Form inputs** — `TextField` to `Input`, `Checkbox`, `RadioGroup`
5. **Layout** — Remove `Stack`, use CSS Flexbox/Grid
6. **Feedback** — `MessageBar`, `Spinner`, `ProgressBar`
7. **Navigation** — `Pivot` to `TabList`, `Breadcrumb`, `Nav`
8. **Overlays** — `Dialog`, `Drawer`, `Popover` (highest complexity)
9. **Data display** — `DetailsList` to `DataGrid` (highest effort)

#### Stack Removal

`Stack` has no v9 equivalent. Replace with CSS Flexbox:

```tsx
// v8
<Stack horizontal tokens={{ childrenGap: 8 }}>
  <Stack.Item grow>
    <Text>Left</Text>
  </Stack.Item>
  <Stack.Item>
    <Text>Right</Text>
  </Stack.Item>
</Stack>

// v9
const useStyles = makeStyles({
  row: {
    display: 'flex',
    flexDirection: 'row',
    gap: tokens.spacingHorizontalS,
  },
  grow: {
    flexGrow: 1,
  },
});

const styles = useStyles();
<div className={styles.row}>
  <div className={styles.grow}>
    <Text>Left</Text>
  </div>
  <div>
    <Text>Right</Text>
  </div>
</div>
```

### Common Migration Pitfalls

1. **Missing FluentProvider** — v9 components require `FluentProvider` at the root. Without it,
   tokens resolve to empty strings and components render unstyled.

2. **Icon initialization** — v8 requires `initializeIcons()`. v9 does not — icons are direct
   SVG imports. Remove the initialization call after fully migrating.

3. **Ref forwarding** — v9 components use `React.forwardRef`. If you have wrapper components
   that pass refs, update them to use `forwardRef`.

4. **Controlled vs uncontrolled** — Some v9 components have different controlled/uncontrolled
   patterns. Check the Storybook docs for each component.

5. **CSS specificity** — v8's CSS-in-JS and v9's Griffel may conflict. If styles look wrong
   during coexistence, check specificity. Griffel's atomic classes have lower specificity than
   v8's merged style blocks.

6. **DetailsList to DataGrid** — This is the hardest migration. DataGrid has a fundamentally
   different API. Plan significant refactoring time.

7. **Theme token names** — v8 semantic color names do not map 1:1 to v9 tokens. Consult the
   mapping table above.

---

## Cross-References

- **Griffel styling details** — See the `fluent-griffel` skill for comprehensive makeStyles,
  shorthands, keyframes, and build-time optimization patterns.
- **Core design system** — See the `fluent-design-system` skill for tokens, typography, color
  system, and FluentProvider configuration.
- **Next.js integration** — See the `fluent-nextjs` skill for SSR considerations with Griffel
  and server component compatibility.
- **Forms** — See the `fluent-forms` skill for form component patterns and validation.
- **Web Components** — See the `fluent-web-components` skill for framework-agnostic alternatives.

---

## Reference Documents

Detailed reference material is available in the `references/` directory:

- `slots-recomposition.md` — Complete slot API reference, trigger patterns, composition examples,
  and customStyleHooks implementation details.
- `migration-v8-v9.md` — Complete component mapping table, theme token mapping, styling migration
  examples, and step-by-step migration workflow.
