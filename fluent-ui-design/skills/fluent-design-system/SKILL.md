---
name: Fluent 2 Design System
description: >
  Core skill for Microsoft Fluent 2 design system — design tokens, color system, typography, layout,
  component library overview, theming with FluentProvider, accessibility patterns, and iconography.
  This is the foundational skill; specialized topics are covered by dedicated skills (fluent-nextjs,
  fluent-griffel, fluent-extensibility, fluent-web-components, fluent-charting, fluent-cross-platform,
  fluent-forms, fluent-integration).
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - fluent
  - fluent ui
  - fluent 2
  - fluent design
  - fluent tokens
  - fluent components
  - fluent theme
  - fluent layout
  - fluent typography
  - fluent color
  - fluent spacing
  - fluent motion
  - fluent accessibility
  - fluent responsive
  - fluent grid
  - fluent react
  - fluent figma
  - fluent design kit
  - fluent brand ramp
  - fluent custom theme
  - fluent copilot
  - fluent icon
  - fluent elevation
  - fluent shadow
  - fluent positioning
  - fluent overflow
  - fluent drawer
  - fluent carousel
  - fluent tree shaking
  - fluent bundle
  - fluent rtl
  - fluent nav
  - fluent app shell
  - design tokens
  - design system microsoft
  - fluentui react-components
  - fluent button
  - fluent dialog
  - fluent card
  - fluent input
  - fluent avatar
  - fluent badge
  - fluent menu
  - fluent toolbar
  - fluent data grid
  - microsoft design system
---

# Microsoft Fluent 2 Design System — Core Knowledge Base

## Overview

Fluent 2 is Microsoft's open-source design system powering Microsoft 365, Teams, Copilot, Windows,
and the broader Microsoft ecosystem. It provides a unified design language with design tokens,
a React component library (`@fluentui/react-components`), and platform-specific implementations
for Web, iOS, and Android.

**Key packages:**
- `@fluentui/react-components` — Main component library (Fluent UI React v9)
- `@fluentui/react-icons` — Fluent icon system (filled + regular variants)
- `@fluentui/tokens` — Design token definitions
- `@fluentui/react-theme` — Theme definitions and brand ramp utilities

**Design resources:**
- Fluent 2 site: https://fluent2.microsoft.design/
- Storybook: https://react.fluentui.dev/
- GitHub: https://github.com/microsoft/fluentui
- Developer portal: https://developer.microsoft.com/en-us/fluentui

---

## Core Design Principles

### 1. Content-First
The design serves the content. Chrome, ornamentation, and UI framework recede so content takes center stage.

### 2. Inclusive by Default
Every component must be accessible. WCAG 2.1 AA compliance is the floor, not the ceiling.

### 3. Coherent, Not Uniform
Products share tokens, components, and patterns — but each adapts them to its unique context.

### 4. Calm Computing
Interfaces should reduce cognitive load. Motion is purposeful. Color draws focus, not distraction.

### 5. Universal Design Language
Fluent 2 works across web, mobile, and desktop. Design tokens abstract platform differences.

**External resources:**
- Design principles: https://fluent2.microsoft.design/design-principles
- Get started with design: https://fluent2.microsoft.design/get-started/design

---

## Design Tokens

Design tokens are the atomic values of the design system — named constants for colors, spacing,
typography, shadows, border radii, and motion.

### Token Architecture

Fluent 2 uses a **three-tier token architecture:**

1. **Global tokens** — Raw palette values (e.g., `grey10`, `brandPrimary`). Never used directly in components.
2. **Alias tokens** — Semantic references (e.g., `colorNeutralBackground1`). Theme-aware.
3. **Component tokens** — Component-specific overrides (rare).

### Spacing Tokens (Global Spacing Ramp)

Base unit: **4px**. All spacing derives from this unit.

| Token | Value |
|---|---|
| `spacingHorizontalNone` / `spacingVerticalNone` | 0px |
| `spacingHorizontalXXS` / `spacingVerticalXXS` | 2px |
| `spacingHorizontalXS` / `spacingVerticalXS` | 4px |
| `spacingHorizontalSNudge` / `spacingVerticalSNudge` | 6px |
| `spacingHorizontalS` / `spacingVerticalS` | 8px |
| `spacingHorizontalMNudge` / `spacingVerticalMNudge` | 10px |
| `spacingHorizontalM` / `spacingVerticalM` | 12px |
| `spacingHorizontalL` / `spacingVerticalL` | 16px |
| `spacingHorizontalXL` / `spacingVerticalXL` | 20px |
| `spacingHorizontalXXL` / `spacingVerticalXXL` | 24px |
| `spacingHorizontalXXXL` / `spacingVerticalXXXL` | 32px |

### Border Radius Tokens

| Token | Value |
|---|---|
| `borderRadiusNone` | 0px |
| `borderRadiusSmall` | 2px |
| `borderRadiusMedium` | 4px |
| `borderRadiusLarge` | 6px |
| `borderRadiusXLarge` | 8px |
| `borderRadiusCircular` | 10000px |

### Shadow / Elevation Tokens

| Token | Usage |
|---|---|
| `shadow2` | Subtle lift (cards at rest) |
| `shadow4` | Light elevation (dropdowns) |
| `shadow8` | Medium elevation (popovers) |
| `shadow16` | High elevation (dialogs) |
| `shadow28` | Highest elevation (teaching callouts) |
| `shadow64` | Maximum elevation |

### Typography Tokens

Font family: `'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif`

| Token | Size | Line Height |
|---|---|---|
| `fontSizeBase100` | 10px | 14px |
| `fontSizeBase200` | 12px | 16px |
| `fontSizeBase300` | 14px | 20px |
| `fontSizeBase400` | 16px | 22px |
| `fontSizeBase500` | 20px | 28px |
| `fontSizeBase600` | 24px | 32px |
| `fontSizeHero700` | 28px | 36px |
| `fontSizeHero800` | 32px | 40px |
| `fontSizeHero900` | 40px | 52px |
| `fontSizeHero1000` | 68px | 92px |

Font weights: `fontWeightRegular` (400), `fontWeightMedium` (500), `fontWeightSemibold` (600), `fontWeightBold` (700)

### Motion Tokens

| Token | Value |
|---|---|
| `durationUltraFast` | 50ms |
| `durationFaster` | 100ms |
| `durationFast` | 150ms |
| `durationNormal` | 200ms |
| `durationGentle` | 250ms |
| `durationSlow` | 300ms |
| `durationSlower` | 400ms |
| `durationUltraSlow` | 500ms |

**External resources:**
- Design tokens overview: https://fluent2.microsoft.design/design-tokens
- Color tokens: https://fluent2.microsoft.design/design-tokens/color-tokens
- Elevation: https://fluent2.microsoft.design/design-tokens/elevation
- Motion: https://fluent2.microsoft.design/design-tokens/motion

---

## Color System

### Neutral Colors

**Backgrounds:**
- `colorNeutralBackground1` — Primary surface
- `colorNeutralBackground2` — Secondary surface
- `colorNeutralBackground3` through `6` — Tertiary+
- `colorSubtleBackground` — Transparent at rest, visible on hover
- `colorTransparentBackground` — Fully transparent

**Foregrounds:**
- `colorNeutralForeground1` — Primary text (high contrast)
- `colorNeutralForeground2` — Secondary text
- `colorNeutralForeground3` — Tertiary text
- `colorNeutralForegroundDisabled` — Disabled text

**Strokes:**
- `colorNeutralStroke1` — Primary border
- `colorNeutralStrokeAccessible` — AA-contrast border
- `colorNeutralStrokeDisabled` — Disabled border

### Brand Colors

Brand tokens use a **16-shade ramp** (shade10 through shade160) generated from a primary color:

```typescript
import { createLightTheme, createDarkTheme, BrandVariants } from '@fluentui/react-components';

const myBrand: BrandVariants = {
  10: '#020305', 20: '#111723', 30: '#16212F', 40: '#1B2C3D',
  50: '#1F374B', 60: '#24425A', 70: '#284D69', 80: '#2D5979',
  90: '#366B8E', 100: '#437DA3', 110: '#548FB7', 120: '#6BA1C9',
  130: '#85B3D7', 140: '#A1C5E3', 150: '#BFD7ED', 160: '#DDE9F6',
};

const lightTheme = createLightTheme(myBrand);
const darkTheme = createDarkTheme(myBrand);
```

### Status Colors

| Token | Usage |
|---|---|
| `colorStatusSuccessBackground1` / `Foreground1` | Success states |
| `colorStatusWarningBackground1` / `Foreground1` | Warning states |
| `colorStatusDangerBackground1` / `Foreground1` | Error/danger states |

---

## Layout System

### Breakpoints / Size Classes

| Size Class | Range | Typical Use |
|---|---|---|
| `small` | 320–479px | Phone portrait |
| `medium` | 480–639px | Phone landscape / small tablet |
| `large` | 640–1023px | Tablet |
| `x-large` | 1024–1365px | Small desktop / laptop |
| `xx-large` | 1366–1919px | Desktop |
| `xxx-large` | 1920px+ | Large desktop / ultrawide |

### Responsive Techniques

1. **Reposition** — Move elements from vertical to horizontal layout
2. **Resize** — Adjust element dimensions and margins
3. **Reflow** — Single-column to multi-column
4. **Show/Hide** — Display or hide elements based on viewport
5. **Re-architect** — Restructure layout entirely

### Touch Targets

- iOS and Web: minimum 44×44px
- Android: minimum 48×48px

**External resources:**
- Layout system: https://fluent2.microsoft.design/layout
- Accessibility: https://fluent2.microsoft.design/accessibility

---

## Component Library

The `@fluentui/react-components` package provides the full Fluent UI React v9 component library.

| Category | Components |
|---|---|
| **Actions** | Button, CompoundButton, SplitButton, ToggleButton, MenuButton, Link |
| **Inputs** | Input, Textarea, Select, Combobox, Dropdown, SearchBox, SpinButton, Slider, Switch, Checkbox, RadioGroup, DatePicker, TimePicker, ColorPicker, Rating |
| **Layout** | Card, CardHeader/Footer/Preview, Divider, Drawer, Dialog, Accordion, TabList/Tab, Toolbar, Breadcrumb |
| **Data Display** | Avatar, AvatarGroup, Badge, CounterBadge, PresenceBadge, Tag/TagGroup, DataGrid, Table, Tree, Persona, Text, Label, InfoLabel |
| **Feedback** | Toast/Toaster, MessageBar, ProgressBar, Spinner, Skeleton, Alert |
| **Navigation** | Menu/MenuItem/MenuList, Nav/NavItem, Overflow/OverflowItem |
| **Overlays** | Popover, Tooltip, TeachingPopover, InfoButton |
| **Media** | Image |

---

## Theming

### FluentProvider

All Fluent components must be wrapped in a `FluentProvider`:

```tsx
import { FluentProvider, webLightTheme } from '@fluentui/react-components';

<FluentProvider theme={webLightTheme}>
  <App />
</FluentProvider>
```

Built-in themes: `webLightTheme`, `webDarkTheme`, `teamsLightTheme`, `teamsDarkTheme`, `teamsHighContrastTheme`

### Nested Themes

```tsx
<FluentProvider theme={webLightTheme}>
  <MainContent />
  <FluentProvider theme={webDarkTheme}>
    <Sidebar />
  </FluentProvider>
</FluentProvider>
```

---

## Accessibility

- **Color contrast**: 4.5:1 for normal text, 3:1 for large text, 3:1 for non-text UI
- **Focus indicators**: Visible 2px focus ring on all interactive elements
- **Keyboard navigation**: All interactive components reachable via keyboard
- **Screen readers**: Proper ARIA attributes on all components
- **Reduced motion**: `prefers-reduced-motion` support
- **High contrast**: Full Windows High Contrast Mode support

Focus utilities:
```tsx
import { useArrowNavigationGroup, useFocusableGroup } from '@fluentui/react-components';
```

---

## Iconography

Package: `@fluentui/react-icons` — 20,000+ icons in Regular (outline) and Filled styles.

Sizes: 16px, 20px, 24px, 28px, 32px, 48px. Default export = 20px.

```tsx
import { CalendarRegular, CalendarFilled, bundleIcon } from '@fluentui/react-icons';
const CalendarIcon = bundleIcon(CalendarFilled, CalendarRegular);
```

---

## Cross-Reference: Specialized Skills

For detailed coverage of specific topics, see these dedicated skills:

| Skill | Topics |
|---|---|
| **fluent-nextjs** | Next.js App Router + Pages Router setup, SSR, `use client` boundaries, Griffel AOT with Next.js |
| **fluent-griffel** | makeStyles deep dive, AOT compilation, shorthands, selectors, RTL, DevTools |
| **fluent-extensibility** | Slots (4 levels), custom variants, customStyleHooks, headless patterns, v8→v9 migration |
| **fluent-web-components** | Web Components (`@fluentui/web-components`), framework-agnostic usage |
| **fluent-charting** | `@fluentui/react-charting` — chart types, theming, accessibility |
| **fluent-cross-platform** | iOS (Swift/UIKit) and Android (Kotlin) Fluent implementations |
| **fluent-forms** | Form orchestration with Formik/Yup, React Hook Form/Zod, Field validation |
| **fluent-integration** | B2C UI customization, Office Add-ins, SharePoint integration |

## Reference Files

- `${CLAUDE_PLUGIN_ROOT}/skills/fluent-design-system/references/design-tokens-reference.md` — Complete token catalog
- `${CLAUDE_PLUGIN_ROOT}/skills/fluent-design-system/references/component-catalog.md` — All components with props
- `${CLAUDE_PLUGIN_ROOT}/skills/fluent-design-system/references/teams-integration.md` — Teams multi-surface architecture
- `${CLAUDE_PLUGIN_ROOT}/skills/fluent-design-system/references/advanced-patterns.md` — Advanced UI patterns
- `${CLAUDE_PLUGIN_ROOT}/skills/fluent-design-system/references/motion-framer-reference.md` — Motion system deep dive
- `${CLAUDE_PLUGIN_ROOT}/skills/fluent-design-system/examples/theme-examples.md` — Theme creation walkthroughs
- `${CLAUDE_PLUGIN_ROOT}/skills/fluent-design-system/examples/layout-patterns.md` — Responsive layout examples
