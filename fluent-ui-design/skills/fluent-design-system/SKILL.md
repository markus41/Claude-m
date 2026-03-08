---
name: Fluent 2 Design System
description: >
  This skill should be used when the user asks about Microsoft Fluent 2 design system — building
  components with Fluent UI React v9, applying design tokens, theming for Teams/Copilot, layout
  and responsive design, typography, color systems, motion/animation, accessibility patterns,
  Griffel/makeStyles styling, custom theme creation, Figma design kits, or any advanced UI design
  principles from the Fluent 2 ecosystem.

  Covers: design tokens (color, spacing, typography, border-radius, shadow, motion), the complete
  component library (@fluentui/react-components), Teams app theming (FluentProvider, teamsLightTheme,
  teamsDarkTheme, teamsHighContrastTheme), Griffel CSS-in-JS (makeStyles, mergeClasses, shorthands),
  layout system (4px base unit, 12-column grid, 6 breakpoint size classes), responsive techniques
  (reposition, resize, reflow, show/hide, re-architect), accessibility (WCAG 2.1 AA, high contrast,
  reduced motion, ARIA patterns), brand ramp generation, custom token creation, Figma design kits
  (Web, iOS, Android, Copilot, Labs), and advanced compound component / slot patterns.

  Example user requests: "build a Teams tab with Fluent UI", "create a custom Fluent theme",
  "what are the Fluent 2 spacing tokens", "make this component accessible", "set up Fluent UI
  React in my project", "design a responsive layout with Fluent grid", "style a component with
  makeStyles", "audit my app against Fluent 2 design guidelines".
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
  - fluent animation
  - fluent accessibility
  - fluent responsive
  - fluent grid
  - fluent makeStyles
  - fluent griffel
  - fluent react
  - fluent teams
  - fluent teams theme
  - fluent figma
  - fluent design kit
  - fluent brand ramp
  - fluent custom theme
  - fluent copilot
  - fluent icon
  - fluent elevation
  - fluent shadow
  - design tokens
  - design system microsoft
  - teams app design
  - teams ui
  - teams theming
  - fluentui react-components
  - makeStyles
  - css-in-js fluent
  - adaptive cards fluent
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

# Microsoft Fluent 2 Design System — Comprehensive Knowledge Base

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
- Fluent 2 site: `https://fluent2.microsoft.design/`
- Figma kits: `aka.ms/Fluent2Toolkits/Web/Figma`, `aka.ms/Fluent2Toolkits/iOS/Figma`, `aka.ms/Fluent2Toolkits/Android/Figma`
- Storybook: `https://react.fluentui.dev/`
- GitHub: `https://github.com/microsoft/fluentui`

---

## Core Design Principles

### 1. Content-First
The design serves the content. Chrome, ornamentation, and UI framework recede so content takes center stage.
Space, type hierarchy, and color draw attention to what matters most.

### 2. Inclusive by Default
Every component must be accessible. WCAG 2.1 AA compliance is the floor, not the ceiling.
High contrast mode, reduced motion, screen reader support, and keyboard navigation are first-class concerns.

### 3. Coherent, Not Uniform
Products across the Microsoft ecosystem share tokens, components, and patterns — but each product
adapts them to its unique context. Teams looks like Teams; Outlook looks like Outlook. The design
system provides coherence without forcing uniformity.

### 4. Calm Computing
Interfaces should reduce cognitive load, not increase it. Motion is purposeful and subtle.
Color draws focus, not distraction. Density is tuned to context.

### 5. Universal Design Language
Fluent 2 works across web, mobile, and desktop. Design tokens abstract platform differences.
The same conceptual component (e.g., Button) manifests appropriately on each platform.

---

## Design Tokens

Design tokens are the atomic values of the design system — named constants for colors, spacing,
typography, shadows, border radii, and motion. They are the bridge between design and code.

### Token Architecture

Fluent 2 uses a **three-tier token architecture:**

1. **Global tokens** — Raw palette values (e.g., `grey10`, `brandPrimary`). Never used directly in components.
2. **Alias tokens** — Semantic references (e.g., `colorNeutralBackground1`, `colorBrandForeground1`). Theme-aware.
3. **Component tokens** — Component-specific overrides (rare; most components use alias tokens).

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

Layout spacing ramp (for layout-level spacing):

| Token | Value |
|---|---|
| `sizeNone` | 0px |
| `size20` | 2px |
| `size40` | 4px |
| `size60` | 6px |
| `size80` | 8px |
| `size100` | 10px |
| `size120` | 12px |
| `size160` | 16px |
| `size200` | 20px |
| `size240` | 24px |
| `size280` | 28px |
| `size320` | 32px |
| `size360` | 36px |
| `size400` | 40px |
| `size480` | 48px |
| `size520` | 52px |
| `size560` | 56px |

Spacing is applied at four levels:
- **Component spacing** — Tight relationships within a component (4-8px)
- **Pattern spacing** — Consistent rhythm across patterns (8-16px)
- **Layout spacing** — Major section separation and hierarchy (16-48px)
- **Responsive spacing** — Adjustments for different viewport sizes

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
| `shadow2Brand` – `shadow64Brand` | Brand-colored shadow variants |

### Typography Tokens

Font family: `'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif`

| Token | Size | Line Height | Weight |
|---|---|---|---|
| `fontSizeBase100` | 10px | 14px | — |
| `fontSizeBase200` | 12px | 16px | — |
| `fontSizeBase300` | 14px | 20px | — |
| `fontSizeBase400` | 16px | 22px | — |
| `fontSizeBase500` | 20px | 28px | — |
| `fontSizeBase600` | 24px | 32px | — |
| `fontSizeHero700` | 28px | 36px | — |
| `fontSizeHero800` | 32px | 40px | — |
| `fontSizeHero900` | 40px | 52px | — |
| `fontSizeHero1000` | 68px | 92px | — |

Font weights:
| Token | Value |
|---|---|
| `fontWeightRegular` | 400 |
| `fontWeightMedium` | 500 |
| `fontWeightSemibold` | 600 |
| `fontWeightBold` | 700 |

Typography presets (composite tokens — `typographyStyles.*`):

| Preset | Weight | Size | Line Height |
|---|---|---|---|
| `caption2` | Regular (400) | 10px | 14px |
| `caption2Strong` | Semibold (600) | 10px | 14px |
| `caption1` | Regular (400) | 12px | 16px |
| `caption1Strong` | Semibold (600) | 12px | 16px |
| `caption1Stronger` | Bold (700) | 12px | 16px |
| `body1` | Regular (400) | 14px | 20px |
| `body1Strong` | Semibold (600) | 14px | 20px |
| `body1Stronger` | Bold (700) | 14px | 20px |
| `subtitle2` | Semibold (600) | 16px | 22px |
| `subtitle2Stronger` | Bold (700) | 16px | 22px |
| `subtitle1` | Semibold (600) | 20px | 26px |
| `title3` | Semibold (600) | 24px | 32px |
| `title2` | Semibold (600) | 28px | 36px |
| `title1` | Semibold (600) | 32px | 40px |
| `largeTitle` | Semibold (600) | 40px | 52px |
| `display` | Semibold (600) | 68px | 92px |

Platform font families:

| Platform | Font |
|---|---|
| Web | Segoe UI |
| Windows | Segoe UI Variable |
| macOS / iOS | San Francisco Pro |
| Android | Roboto |

### Motion Tokens

Duration:
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

Easing curves:
| Token | Value | Usage |
|---|---|---|
| `curveAccelerateMax` | `cubic-bezier(1, 0, 1, 1)` | Exit animations |
| `curveAccelerateMid` | `cubic-bezier(0.7, 0, 1, 0.5)` | Exit animations |
| `curveAccelerateMin` | `cubic-bezier(0.8, 0, 1, 1)` | Subtle exits |
| `curveDecelerateMax` | `cubic-bezier(0, 0, 0, 1)` | Enter animations |
| `curveDecelerateMid` | `cubic-bezier(0.1, 0.9, 0.2, 1)` | Enter animations |
| `curveDecelerateMin` | `cubic-bezier(0.33, 0, 0.1, 1)` | Subtle enters |
| `curveEasyEaseMax` | `cubic-bezier(0.8, 0, 0.2, 1)` | State transitions |
| `curveEasyEase` | `cubic-bezier(0.33, 0, 0.67, 1)` | General transitions |
| `curveLinear` | `cubic-bezier(0, 0, 1, 1)` | Progress indicators |

---

## Color System

### Neutral Colors

Fluent 2 uses a comprehensive neutral palette with semantic alias tokens:

**Backgrounds:**
- `colorNeutralBackground1` — Primary surface (white in light, dark grey in dark)
- `colorNeutralBackground2` — Secondary surface (slightly darker/lighter)
- `colorNeutralBackground3` — Tertiary surface
- `colorNeutralBackground4` — Quaternary surface
- `colorNeutralBackground5` — Quinary surface
- `colorNeutralBackground6` — Senary surface
- `colorNeutralBackgroundInverted` — Inverted (dark on light, light on dark)
- `colorSubtleBackground` — Transparent at rest
- `colorSubtleBackgroundHover` — Appears on hover
- `colorSubtleBackgroundPressed` — Pressed state
- `colorSubtleBackgroundSelected` — Selected state
- `colorTransparentBackground` — Fully transparent

**Foregrounds:**
- `colorNeutralForeground1` — Primary text (high contrast)
- `colorNeutralForeground2` — Secondary text (medium contrast)
- `colorNeutralForeground3` — Tertiary text (lower contrast)
- `colorNeutralForeground4` — Quaternary (disabled-adjacent)
- `colorNeutralForegroundDisabled` — Disabled text
- `colorNeutralForegroundInverted` — Inverted text

**Strokes / Borders:**
- `colorNeutralStroke1` — Primary border
- `colorNeutralStroke2` — Secondary border (subtle)
- `colorNeutralStroke3` — Tertiary border
- `colorNeutralStrokeAccessible` — AA-contrast border
- `colorNeutralStrokeDisabled` — Disabled border

### Brand Colors

Brand tokens use a **16-shade ramp** generated from a primary brand color:

| Token | Shade | Light Theme Usage | Dark Theme Usage |
|---|---|---|---|
| `colorBrandBackground` | Shade Primary | Buttons, primary actions | Buttons |
| `colorBrandBackgroundHover` | Shade +1 | Hover state | Hover state |
| `colorBrandBackgroundPressed` | Shade +2 | Pressed state | Pressed state |
| `colorBrandBackgroundSelected` | Shade +1 | Selected state | Selected state |
| `colorBrandForeground1` | Shade Primary | Brand text, links | Brand text |
| `colorBrandForeground2` | Shade -1 | Secondary brand text | — |
| `colorBrandForegroundLink` | Shade Primary | Hyperlinks | Hyperlinks |
| `colorBrandStroke1` | Shade Primary | Brand borders | Brand borders |
| `colorBrandStroke2` | Shade -2 | Subtle brand borders | — |

**Brand ramp generation** — To create a custom theme, supply a primary brand color and generate a
16-shade ramp (shade10 through shade160):
```typescript
import { createLightTheme, createDarkTheme, BrandVariants } from '@fluentui/react-components';

const myBrand: BrandVariants = {
  10: '#020305',   // Darkest
  20: '#111723',
  30: '#16212F',
  40: '#1B2C3D',
  50: '#1F374B',
  60: '#24425A',
  70: '#284D69',
  80: '#2D5979',  // Primary
  90: '#366B8E',
  100: '#437DA3',
  110: '#548FB7',
  120: '#6BA1C9',
  130: '#85B3D7',
  140: '#A1C5E3',
  150: '#BFD7ED',
  160: '#DDE9F6', // Lightest
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
| `colorPaletteRedBackground1` – `3` | Red palette |
| `colorPaletteGreenBackground1` – `3` | Green palette |
| `colorPaletteYellowBackground1` – `3` | Yellow palette |
| `colorPaletteBlueBorderActive` | Active blue |

### Teams-Specific Themes

```typescript
import {
  FluentProvider,
  teamsLightTheme,
  teamsDarkTheme,
  teamsHighContrastTheme,
} from '@fluentui/react-components';

// Wrap your Teams app
<FluentProvider theme={teamsLightTheme}>
  <App />
</FluentProvider>
```

Teams provides three built-in themes:
- `teamsLightTheme` — Standard light mode
- `teamsDarkTheme` — Dark mode
- `teamsHighContrastTheme` — High contrast for accessibility

Detect theme changes in Teams SDK:
```typescript
import { app } from '@microsoft/teams-js';

app.registerOnThemeChangeHandler((theme: string) => {
  switch (theme) {
    case 'dark': setTheme(teamsDarkTheme); break;
    case 'contrast': setTheme(teamsHighContrastTheme); break;
    default: setTheme(teamsLightTheme);
  }
});
```

---

## Layout System

### Grid System

Fluent uses a **12-column grid** as the standard framework. The grid consists of:

- **Columns** — 12 flexible columns for content placement
- **Gutters** — Space between columns (multiples of 4px base unit)
- **Margins** — Space outside the grid (fixed or percentage-based)
- **Regions** — Logical groupings of columns for composition

Grid types:
- **Column Grid** — Standard 12-col web layout
- **Baseline Grid** — Dense horizontal rows for vertical text rhythm
- **Manuscript Grid** — Single-column for long-form reading
- **Modular Grid** — Column + row intersections for cell-based layouts

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
3. **Reflow** — Single-column to multi-column as space permits
4. **Show/Hide** — Display or hide elements based on viewport
5. **Re-architect** — Restructure layout entirely (e.g., list+detail → detail-only)

### Alignment Principles

- Vertical alignment: Top, center, bottom on the same horizontal plane
- Horizontal alignment: Left, center, right edges aligned
- Object alignment: Center images/icons, left-align text
- Central alignment: Focuses attention — use intentionally

### Touch Targets

- iOS and Web: minimum 44×44px
- Android: minimum 48×48px

---

## Component Library

The `@fluentui/react-components` package provides the full Fluent UI React v9 component library.

### Core Components

**Actions:**
- `Button` — Primary, Secondary, Outline, Subtle, Transparent variants; size small/medium/large; icon support
- `CompoundButton` — Button with secondary text
- `SplitButton` — Button with dropdown action
- `ToggleButton` — On/off toggle button
- `MenuButton` — Button that opens a menu
- `Link` — Inline and standalone hyperlinks

**Inputs:**
- `Input` — Text input with underline, outline, filled-darker, filled-lighter appearances
- `Textarea` — Multi-line text input
- `Select` — Native select dropdown
- `Combobox` — Filterable dropdown
- `Dropdown` — Non-filterable dropdown
- `SearchBox` — Search-optimized input
- `SpinButton` — Numeric input with increment/decrement
- `Slider` — Range slider
- `Switch` — Toggle switch
- `Checkbox` — Checkbox with mixed state support
- `RadioGroup` / `Radio` — Radio button groups
- `DatePicker` — Date selection
- `TimePicker` — Time selection
- `ColorPicker` — Color selection (preview)
- `Rating` — Star rating

**Layout & Containers:**
- `Card` — Content container with header, body, footer, preview areas
- `CardHeader` / `CardFooter` / `CardPreview` — Card sub-components
- `Divider` — Horizontal/vertical separator
- `Drawer` — Slide-in panel (overlay or inline)
- `Dialog` — Modal/non-modal dialog with DialogSurface, DialogBody, DialogTitle, DialogContent, DialogActions
- `Accordion` / `AccordionItem` — Expandable/collapsible sections
- `TabList` / `Tab` — Tab navigation (horizontal, vertical, subtle, transparent)
- `Toolbar` — Action bar with overflow
- `Breadcrumb` / `BreadcrumbItem` — Navigation breadcrumbs

**Data Display:**
- `Avatar` — User/entity representation (image, initials, icon); sizes 16-128px
- `AvatarGroup` — Clustered avatars with overflow
- `Badge` — Status/count indicator
- `CounterBadge` — Numeric badge
- `PresenceBadge` — Online/busy/away/offline status
- `Tag` / `TagGroup` — Categorization labels
- `InteractionTag` — Actionable tags
- `DataGrid` — Sortable, selectable data table (DataGridHeader, DataGridBody, DataGridRow, DataGridCell)
- `Table` — Simple tabular data (TableHeader, TableBody, TableRow, TableCell)
- `Tree` / `TreeItem` — Hierarchical tree view
- `Persona` — Identity block (avatar + name + status)
- `Text` — Typography primitive with semantic sizing
- `Label` — Form label
- `InfoLabel` — Label with info tooltip

**Feedback:**
- `Toast` / `Toaster` — Notification toasts (success, warning, error, info)
- `MessageBar` — Inline messages (single-line, multi-line)
- `ProgressBar` — Determinate/indeterminate progress
- `Spinner` — Loading indicator
- `Skeleton` / `SkeletonItem` — Content loading placeholder
- `Alert` — Alert messages

**Navigation:**
- `Menu` / `MenuItem` / `MenuList` — Context menus, dropdown menus
- `MenuItemCheckbox` / `MenuItemRadio` — Selectable menu items
- `Nav` / `NavItem` / `NavCategory` — Side navigation (preview)
- `Overflow` / `OverflowItem` — Responsive overflow handling

**Overlays:**
- `Popover` / `PopoverSurface` / `PopoverTrigger` — Popover containers
- `Tooltip` — Hover tooltips
- `TeachingPopover` — Onboarding popovers
- `InfoButton` — Compact info trigger

**Media:**
- `Image` — Image with fit, shape, shadow, border support

### Compound Component Pattern

Fluent UI v9 uses a **compound component pattern** with slots:

```tsx
import { Button, makeStyles, tokens } from '@fluentui/react-components';
import { CalendarRegular } from '@fluentui/react-icons';

// Each component exposes named slots
<Button
  appearance="primary"
  size="medium"
  icon={<CalendarRegular />}            // icon slot
  iconPosition="before"
>
  Schedule Meeting                       {/* children slot */}
</Button>
```

**Slot customization:**
```tsx
<Card>
  <CardHeader
    image={<Avatar name="John Doe" />}          // image slot
    header={<Text weight="semibold">Title</Text>}  // header slot
    description={<Caption1>Subtitle</Caption1>}     // description slot
    action={<Button icon={<MoreHorizontalRegular />} appearance="transparent" />}
  />
  <CardPreview>                                       // preview slot
    <img src="preview.png" alt="Preview" />
  </CardPreview>
  <p>Card body content</p>
  <CardFooter>                                        // footer slot
    <Button appearance="primary">Action</Button>
  </CardFooter>
</Card>
```

---

## Styling with Griffel (makeStyles)

Fluent UI v9 uses **Griffel** — an atomic CSS-in-JS engine — for styling.

### Basic Usage

```tsx
import { makeStyles, tokens, shorthands, mergeClasses } from '@fluentui/react-components';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingHorizontalL,
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
  },
  title: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    lineHeight: tokens.lineHeightBase500,
  },
  subtitle: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground2,
  },
  highlighted: {
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
  },
});

const MyComponent = ({ highlighted }: { highlighted?: boolean }) => {
  const styles = useStyles();
  return (
    <div className={mergeClasses(styles.root, highlighted && styles.highlighted)}>
      <span className={styles.title}>Title</span>
      <span className={styles.subtitle}>Subtitle</span>
    </div>
  );
};
```

### Shorthands

Griffel provides shorthands for CSS shorthand properties that must be expanded for atomic CSS:

```tsx
import { shorthands } from '@fluentui/react-components';

const useStyles = makeStyles({
  root: {
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM),
    ...shorthands.margin(tokens.spacingVerticalL),
    ...shorthands.gap(tokens.spacingHorizontalS),
    ...shorthands.overflow('hidden'),
    ...shorthands.flex(1, 1, 'auto'),
  },
});
```

### Conditional Styles & mergeClasses

```tsx
const useStyles = makeStyles({
  base: { /* always applied */ },
  primary: { /* applied when primary */ },
  disabled: { /* applied when disabled */ },
  sizeLarge: { /* applied for large size */ },
});

const MyComponent = ({ primary, disabled, size }) => {
  const styles = useStyles();
  const className = mergeClasses(
    styles.base,
    primary && styles.primary,
    disabled && styles.disabled,
    size === 'large' && styles.sizeLarge,
  );
  return <div className={className} />;
};
```

### Media Queries and Keyframes

```tsx
import { makeStyles, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  root: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    '@media (min-width: 640px)': {
      gridTemplateColumns: '1fr 1fr',
    },
    '@media (min-width: 1024px)': {
      gridTemplateColumns: '1fr 1fr 1fr',
    },
  },
});
```

```tsx
import { makeStyles, shorthands } from '@fluentui/react-components';

const useStyles = makeStyles({
  fadeIn: {
    animationName: {
      from: { opacity: 0, transform: 'translateY(8px)' },
      to: { opacity: 1, transform: 'translateY(0)' },
    },
    animationDuration: tokens.durationNormal,
    animationTimingFunction: tokens.curveDecelerateMid,
    animationFillMode: 'forwards',
  },
});
```

---

## Theming

### FluentProvider

All Fluent components must be wrapped in a `FluentProvider` with a theme:

```tsx
import { FluentProvider, webLightTheme, webDarkTheme } from '@fluentui/react-components';

function App() {
  return (
    <FluentProvider theme={webLightTheme}>
      <YourApp />
    </FluentProvider>
  );
}
```

Available built-in themes:
- `webLightTheme` / `webDarkTheme` — Standard web themes
- `teamsLightTheme` / `teamsDarkTheme` / `teamsHighContrastTheme` — Teams themes

### Custom Theme Creation

```typescript
import {
  createLightTheme,
  createDarkTheme,
  BrandVariants,
  Theme,
} from '@fluentui/react-components';

// 1. Define brand ramp (16 shades, 10-160)
const contosoBrand: BrandVariants = {
  10: '#061724', 20: '#0A2E4A', 30: '#0E446E',
  40: '#115B93', 50: '#1572B6', 60: '#1A89D8',
  70: '#2B9EEB', 80: '#4AAFEF', 90: '#6DC0F3',
  100: '#8FD0F6', 110: '#AEE0F9', 120: '#CBECFB',
  130: '#E5F5FD', 140: '#F0F9FE', 150: '#F7FCFF',
  160: '#FFFFFF',
};

// 2. Generate themes
const contosoLightTheme: Theme = {
  ...createLightTheme(contosoBrand),
};

const contosoDarkTheme: Theme = {
  ...createDarkTheme(contosoBrand),
  // Override specific tokens if needed
  colorBrandForeground1: contosoBrand[110],
  colorBrandForeground2: contosoBrand[120],
};
```

### Nested Themes

```tsx
<FluentProvider theme={webLightTheme}>
  <MainContent />
  <FluentProvider theme={webDarkTheme}>
    <Sidebar /> {/* Dark theme within light theme */}
  </FluentProvider>
</FluentProvider>
```

### Custom Token Injection

```tsx
const customTokens = {
  ...webLightTheme,
  colorNeutralBackground1: '#FAFAFA',
  spacingHorizontalL: '20px',
  borderRadiusMedium: '8px',
};

<FluentProvider theme={customTokens}>
  <App />
</FluentProvider>
```

---

## Accessibility

### WCAG 2.1 AA Requirements

- **Color contrast**: 4.5:1 for normal text, 3:1 for large text, 3:1 for non-text UI
- **Focus indicators**: Visible 2px focus ring on all interactive elements
- **Keyboard navigation**: All interactive components reachable and operable via keyboard
- **Screen readers**: Proper ARIA attributes on all components
- **Reduced motion**: `prefers-reduced-motion` support — disable animations
- **High contrast**: Full Windows High Contrast Mode support via `teamsHighContrastTheme` and forced-colors media query

### Focus Management

Fluent UI provides focus utilities:
```tsx
import { useFocusableGroup, useArrowNavigationGroup } from '@fluentui/react-components';

// Arrow key navigation within a group
const attrs = useArrowNavigationGroup({ axis: 'both' });
<div {...attrs}>
  <Button>First</Button>
  <Button>Second</Button>
  <Button>Third</Button>
</div>

// Tab focus management
const focusAttrs = useFocusableGroup();
<div {...focusAttrs}>
  <InteractiveContent />
</div>
```

### ARIA Patterns

- Use `role`, `aria-label`, `aria-describedby` consistently
- Dialog: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- Menu: `role="menu"`, `role="menuitem"`, arrow key navigation
- Tree: `role="tree"`, `role="treeitem"`, `aria-expanded`
- DataGrid: `role="grid"`, `role="row"`, `role="gridcell"`

---

## Iconography

### Fluent UI Icons

Package: `@fluentui/react-icons`

- **20,000+** icons in two styles: **Regular** (outline) and **Filled** (solid)
- Sizes: 16px, 20px, 24px, 28px, 32px, 48px
- Naming: `{Name}{Size}{Style}` — e.g., `Calendar24Regular`, `Calendar24Filled`
- Default export: 20px size — e.g., `CalendarRegular` = `Calendar20Regular`

```tsx
import { CalendarRegular, CalendarFilled, bundleIcon } from '@fluentui/react-icons';

// Bundle regular + filled for interactive states
const CalendarIcon = bundleIcon(CalendarFilled, CalendarRegular);

<Button icon={<CalendarIcon />}>Schedule</Button>
```

Icon sizing with Fluent components:
```tsx
<Avatar icon={<PersonRegular />} size={32} />
<Badge icon={<CheckmarkRegular />} />
<MenuItem icon={<SettingsRegular />}>Settings</MenuItem>
```

---

## Teams App Integration

### Setting Up a Teams Tab with Fluent

```tsx
import React, { useState, useEffect } from 'react';
import { FluentProvider, teamsLightTheme, teamsDarkTheme, teamsHighContrastTheme } from '@fluentui/react-components';
import { app } from '@microsoft/teams-js';

const getTheme = (themeName: string) => {
  switch (themeName) {
    case 'dark': return teamsDarkTheme;
    case 'contrast': return teamsHighContrastTheme;
    default: return teamsLightTheme;
  }
};

function TeamsApp() {
  const [theme, setTheme] = useState(teamsLightTheme);

  useEffect(() => {
    app.initialize().then(() => {
      app.getContext().then((context) => {
        setTheme(getTheme(context.app.theme));
      });
      app.registerOnThemeChangeHandler((themeName) => {
        setTheme(getTheme(themeName));
      });
    });
  }, []);

  return (
    <FluentProvider theme={theme}>
      <TabContent />
    </FluentProvider>
  );
}
```

### Teams-Specific Design Patterns

**Conversation UI:**
- Use `Chat` / `ChatMessage` components (from `@fluentui/react-components` or `@fluentui/react-northstar` migration)
- Follow left-aligned incoming, right-aligned outgoing message pattern
- Use `Avatar` + `PresenceBadge` for user identity

**Meeting Panel / Side Panel:**
- Constrained width (280–320px)
- Use `Accordion` for collapsible sections
- Keep critical actions at top
- Use `Skeleton` for loading states

**Task Module / Dialog:**
- Use Fluent `Dialog` component
- Standard sizes: small (400px), medium (600px), large (800px)
- Always provide close button and keyboard escape

**Adaptive Cards:**
- Use `hostConfig` to align Adaptive Card styling with Fluent tokens
- Map Fluent colors to Adaptive Card color scheme
- Use Fluent spacing values for card padding

**Stage View:**
- Full-width content area
- Use responsive layout patterns
- Leverage `Toolbar` for actions
- Consider `Drawer` for supplementary panels

---

## Advanced Patterns

### Controlled vs Uncontrolled Components

```tsx
// Uncontrolled (internal state)
<Input defaultValue="hello" />
<Checkbox defaultChecked />

// Controlled (external state)
const [value, setValue] = useState('hello');
<Input value={value} onChange={(e, data) => setValue(data.value)} />

const [checked, setChecked] = useState(true);
<Checkbox checked={checked} onChange={(e, data) => setChecked(data.checked)} />
```

### Overflow Pattern

```tsx
import { Overflow, OverflowItem, OverflowItemProps } from '@fluentui/react-components';

<Overflow>
  <div style={{ display: 'flex', gap: '4px' }}>
    {items.map((item) => (
      <OverflowItem key={item.id} id={item.id}>
        <Button>{item.label}</Button>
      </OverflowItem>
    ))}
    <OverflowMenu items={items} />
  </div>
</Overflow>
```

### Virtual Scrolling with DataGrid

```tsx
import { DataGrid, DataGridBody, DataGridRow, DataGridCell, createTableColumn } from '@fluentui/react-components';

const columns = [
  createTableColumn({ columnId: 'name', renderHeaderCell: () => 'Name', renderCell: (item) => item.name }),
  createTableColumn({ columnId: 'status', renderHeaderCell: () => 'Status', renderCell: (item) => <Badge>{item.status}</Badge> }),
];

<DataGrid items={items} columns={columns} sortable selectionMode="multiselect">
  <DataGridHeader><DataGridRow>{({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}</DataGridRow></DataGridHeader>
  <DataGridBody>{({ item, rowId }) => <DataGridRow key={rowId}>{({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}</DataGridRow>}</DataGridBody>
</DataGrid>
```

### Portal and Mounting

```tsx
import { Portal } from '@fluentui/react-components';

// Renders children outside React tree (for overlays, modals)
<Portal>
  <div className={styles.overlay}>Overlay content</div>
</Portal>
```

---

## Figma Design Kits

### Available Kits (4-tier system)

**Tier 1 — Design Language (tokens source of truth):**
- Color tokens, stroke width, corner radius, spacing, size tokens
- Implemented as Figma Variables for light/dark mode toggling
- Supports both Fluent and Copilot brand styling

**Tier 2 — Core UI Kits:**
- **Web UI Kit** — `aka.ms/Fluent2Toolkits/Web/Figma`
- **iOS UI Kit** — `aka.ms/Fluent2Toolkits/iOS/Figma`
- **Android UI Kit** — `aka.ms/Fluent2Toolkits/Android/Figma`
- Code-aligned: component properties map to code props

**Tier 3 — Copilot UI Kits:**
- AI-focused components and patterns
- Extends Core for conversational AI, generative UI experiences
- Aligned with OneCopilot Mobile patterns

**Tier 4 — Labs UI Kits:**
- Partner-led experimental designs
- Visionary ideas and emerging patterns

### Enabling Libraries

1. Open **Assets** panel → **Libraries** in Figma
2. Enable desired Fluent 2 kits
3. For auto-enable, set in **Account settings**
4. Additional shared libraries: **Fluent Iconography**, **Fluent Emoji kits**

### Component Organization

- Components organized in Assets panel, max 2 levels deep
- Variants and component properties map directly to code
- Use Figma variable modes for light/dark/high-contrast switching

---

## Performance Best Practices

### Tree Shaking

Import components individually:
```tsx
// GOOD — tree-shakeable
import { Button } from '@fluentui/react-components';

// AVOID — pulls entire bundle
import FluentUI from '@fluentui/react-components';
```

### Bundle Optimization

- Griffel generates atomic CSS — no duplicate styles
- Use `makeResetStyles` for base styles that shouldn't be atomic:
```tsx
import { makeResetStyles } from '@fluentui/react-components';

const useBaseStyles = makeResetStyles({
  display: 'flex',
  flexDirection: 'column',
  /* ... base layout ... */
});
```

### SSR Support

```tsx
import { createDOMRenderer, RendererProvider, SSRProvider } from '@fluentui/react-components';

const renderer = createDOMRenderer();

// Server-side
<RendererProvider renderer={renderer}>
  <SSRProvider>
    <FluentProvider theme={webLightTheme}>
      <App />
    </FluentProvider>
  </SSRProvider>
</RendererProvider>
```

---

## Reference Files

For detailed information on specific topics, consult:
- `${CLAUDE_PLUGIN_ROOT}/skills/fluent-design-system/references/design-tokens-reference.md` — Complete token catalog
- `${CLAUDE_PLUGIN_ROOT}/skills/fluent-design-system/references/component-catalog.md` — All components with props
- `${CLAUDE_PLUGIN_ROOT}/skills/fluent-design-system/references/teams-integration.md` — Teams-specific patterns
- `${CLAUDE_PLUGIN_ROOT}/skills/fluent-design-system/references/advanced-patterns.md` — Advanced UI architecture
- `${CLAUDE_PLUGIN_ROOT}/skills/fluent-design-system/examples/theme-examples.md` — Theme creation walkthroughs
- `${CLAUDE_PLUGIN_ROOT}/skills/fluent-design-system/examples/layout-patterns.md` — Responsive layout examples
