# Fluent 2 Advanced UI Patterns & Architecture

## Slots, Composition, and Custom Components

### Mental Model

Every v9 component declares its anatomy as named **slots** (`root`, `icon`, `contentBefore`, `contentAfter`, etc.) instead of ad-hoc children. Each slot is a "mini component" with its own element type, props, classes, and children, while still participating in the parent's accessibility and behavior. Shorthands resolve to full slot props, so you always conceptually work with `{ children, className, ...rest }`.

### Consumer Patterns

```tsx
// Object notation — stateful, interactive content
<Button icon={{ children: <MyCounter />, onMouseEnter: handleHover, className: customClass }}>
  Click
</Button>

// Retag via `as` — turns the icon wrapper into a link
<Button icon={{ as: 'a', href: '#foo', children: '🚀' }}>Navigate</Button>

// Slot as props object (for customization)
<Button icon={{ children: <CalendarRegular />, className: customIconClass }}>Schedule</Button>

// Slot as null (hide the slot)
<CardHeader action={null} header={<Text>Title</Text>} />

// Children render function — wrap or replace the rendered element (render-prop style)
// Ideal for tooltips, triggers, or extra semantics
<PopoverTrigger>
  {(triggerProps) => <Button {...triggerProps}>Custom Trigger</Button>}
</PopoverTrigger>

// Full slot replacement — pass your own JSX component and forward computed slot props
// to keep classNames, aria-*, and state that Fluent generated
```

### Best Styling Approach for Slots (Tiger Oakes / CSS Tricks)

Three ways to style child elements, from worst to best:

1. **Tag selector** (bad): `.myButton span { color: red }` — slow, unclear
2. **Class name** (better): `.myButton .fui-Button__icon { color: red }` — uses Fluent's internal classnames (available as constants)
3. **Slot prop** (best): Pass `className` directly via the slot object — no child selector needed, most performant

Icons use `fill="currentColor"`, so style with `color` not `fill`.

### Authoring Your Own Slot-Based Components

Fluent's v9 composition pattern:

1. `useComponent_unstable(props, ref)` — state hook that computes state and shapes slot props
2. `renderComponent_unstable(state)` — render function that turns state into JSX with Slot helpers
3. Define a `Slots` type for strong typing

```tsx
import { ForwardRefComponent, slot, Slot, ComponentProps } from '@fluentui/react-components';

// Define slot types
type AppBarTitleSlots = {
  root: NonNullable<Slot<'div'> | Slot<'a'>>;
  icon?: Slot<'span'>;
  heading?: Slot<'h1'>;
};

type AppBarTitleProps = ComponentProps<AppBarTitleSlots> & {
  variant?: 'default' | 'compact';
};
```

This lets custom components like `AppBarTitle`, `CommandBar`, `PageHeader`, etc. behave identically to built-in Fluent components.

### Triggers Pattern

The Triggers API (e.g., `PopoverTrigger`, `MenuTrigger`) uses `React.cloneElement` to enhance arbitrary children with event handlers and ARIA in a generic way. You can create your own trigger-style utilities (analytics trigger, feature-flag trigger) that inject behavior without altering DOM hierarchies.

---

## CommandBar-Style Component with Slots

### Anatomy

- `root`: Toolbar container
- `primaryItems`: Main actions (buttons, split buttons, menus)
- `secondaryItems`: Right-aligned utility actions
- `search`: Optional search slot
- `overflowMenu`: Overflow entry point

### Implementation Pattern

```tsx
// useCommandBar_unstable returns slot props + items data arrays
// Render maps item data to Fluent Buttons/Menu, wraps primary items with Overflow/OverflowItem
// Consumers can replace search with a custom component or override overflowMenu slot entirely

const useStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    gap: tokens.spacingHorizontalS,
  },
  primaryItems: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    flex: 1,
  },
  secondaryItems: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    marginLeft: 'auto',
  },
});

function CommandBar({ primaryActions, secondaryActions, searchSlot }) {
  const styles = useStyles();

  return (
    <Toolbar className={styles.root}>
      <Overflow>
        <div className={styles.primaryItems}>
          {primaryActions.map((action) => (
            <OverflowItem key={action.id} id={action.id}>
              <ToolbarButton icon={action.icon}>{action.label}</ToolbarButton>
            </OverflowItem>
          ))}
          <OverflowMenu items={primaryActions} />
        </div>
      </Overflow>
      {searchSlot}
      <div className={styles.secondaryItems}>
        {secondaryActions.map((action) => (
          <ToolbarButton key={action.id} icon={action.icon} />
        ))}
      </div>
    </Toolbar>
  );
}
```

---

## Griffel Styling Engine — Deep Patterns

### Core Concepts

- **Atomic CSS**: Every property-value is a single CSS rule; maximizes reuse across components
- **`makeStyles`**: Defines style permutations; returns a React hook
- **`mergeClasses`**: Merges and deduplicates atomic classes; **order of arguments determines priority**
- **`makeResetStyles`**: Generates a single monolithic class to avoid "CSS rule explosion" from many nested/pseudo selectors
- **Hybrid approach**: Use `makeResetStyles` for base styles, `makeStyles` for conditional overrides

### Critical Rules

1. **Never concatenate** Griffel classes with string concatenation; always use `mergeClasses()`
2. **Avoid `!important`**: The atomic system makes it unnecessary
3. **Use tokens over direct colors**: `tokens.colorBrandForeground1` instead of `'red'`
4. **Avoid rule duplication**: Don't repeat base styles in permutation styles
5. **Use `mergeClasses` only once** per element for performance
6. **No CSS shorthands**: Use Griffel's `shorthands.*` functions instead

### Selector Performance

- Tag selectors (`> div`, `> *`) are slow — browser checks every matching element
- Class selectors (`.fui-Button__icon`) are fast — browser only checks elements with that class
- Best: apply classes directly to elements (no nested selectors at all)
- Avoid complicated nested selectors — they produce unique, non-reusable CSS rules and bigger bundles with AOT

### RTL Support

- `makeStyles` and `makeResetStyles` automatically flip CSS properties for RTL
- `FluentProvider` with `dir="rtl"` activates RTL styles
- Use `/* @noflip */` comment to opt out specific rules
- CSS variables with tokens may not auto-flip; use `useFluent()` hook's `dir` for manual handling

### Dynamic Styles

`makeStyles` hooks can't be called conditionally, but you can use `mergeClasses` with conditions:

```tsx
// Conditional class application
const className = mergeClasses(baseClassName, props.primary && classes.primary);

// Map props to style keys for structured variants
const className = mergeClasses(classes.root, classes[props.size]);
```

### Shared Styles (Style Libraries)

Create reusable style fragments across components:

```tsx
// styles/shared.ts
import { makeStyles, tokens } from '@fluentui/react-components';

export const useLayoutStyles = makeStyles({
  pageContainer: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: tokens.colorNeutralBackground2,
  },
  contentArea: {
    flex: 1,
    padding: tokens.spacingHorizontalXXL,
    maxWidth: '1200px',
    marginLeft: 'auto',
    marginRight: 'auto',
    width: '100%',
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: tokens.spacingHorizontalL,
  },
  stack: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
  },
});
```

**Known issue**: Sharing `makeStyles` across files for reusability can cause TypeScript inference issues — solution: export explicit types.

### makeResetStyles (Non-Atomic Base Styles)

```tsx
import { makeResetStyles, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';

// makeResetStyles generates a SINGLE class (not atomic)
// Good for base/reset styles with many properties
const useBaseStyles = makeResetStyles({
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  boxSizing: 'border-box',
  minWidth: 0,
  minHeight: 0,
  padding: 0,
  margin: 0,
  border: 'none',
  outline: 'none',
  backgroundColor: 'transparent',
  fontFamily: tokens.fontFamilyBase,
  fontSize: tokens.fontSizeBase300,
  lineHeight: tokens.lineHeightBase300,
  color: tokens.colorNeutralForeground1,
});

// makeStyles generates ATOMIC classes (individual property classes)
// Good for variants and conditional styles
const useVariantStyles = makeStyles({
  primary: {
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
  },
  outlined: {
    borderWidth: tokens.strokeWidthThin,
    borderStyle: 'solid',
    borderColor: tokens.colorNeutralStroke1,
  },
});

const MyComponent = ({ variant }: { variant: 'primary' | 'outlined' }) => {
  const baseClass = useBaseStyles();
  const variantStyles = useVariantStyles();
  return (
    <div className={mergeClasses(baseClass, variantStyles[variant])}>
      Content
    </div>
  );
};
```

### CSS Variables via Custom Properties (Custom Tokens)

```tsx
const useStyles = makeStyles({
  container: {
    // Use Fluent tokens as defaults, allow override via CSS custom properties
    '--card-padding': tokens.spacingHorizontalL,
    '--card-radius': tokens.borderRadiusLarge,
    '--card-shadow': tokens.shadow4,
    padding: 'var(--card-padding)',
    borderRadius: 'var(--card-radius)',
    boxShadow: 'var(--card-shadow)',
  },
  compact: {
    '--card-padding': tokens.spacingHorizontalS,
    '--card-radius': tokens.borderRadiusMedium,
    '--card-shadow': tokens.shadow2,
  },
});
```

### AOT Compilation

Griffel supports ahead-of-time (AOT) compilation with CSS extraction to eliminate runtime CSS-in-JS overhead. This is recommended for production builds.

---

## Custom Variants and Wrapper Components

Build variants like `DangerPrimaryButton`, `QuietToolbar`, `MetricCard` as wrapper components:

```tsx
import { Button, ButtonProps, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  danger: {
    backgroundColor: tokens.colorStatusDangerBackground3,
    color: tokens.colorNeutralForegroundStaticInverted,
    ':hover': {
      backgroundColor: tokens.colorStatusDangerForeground1,
    },
  },
});

const DangerButton = (props: ButtonProps) => {
  const styles = useStyles();
  return (
    <Button
      {...props}
      className={mergeClasses(styles.danger, props.className)}
    />
  );
};
```

- Use `mergeClasses` to layer base + variant styles
- Expose only safe props; delegate styling to tokens + `makeStyles`
- Over time this becomes a "pattern library" where teams use only wrapped components, not raw Fluent primitives

---

## Theming and Token Pipeline

### Token Architecture

- **Global tokens**: Canonical design values (base color palette)
- **Alias tokens**: Semantic surface tokens (e.g., `colorNeutralForeground1`, `colorBrandBackground`)
- Fluent 2 defines a brand ramp of 16 colors; `createLightTheme(brandVariants)` and `createDarkTheme(brandVariants)` generate full themes

### Token Pipeline

- Source: JSON design tokens → Pipeline generates platform-specific artifacts (TS themes, CSS variables, design tool exports)
- GitHub: `microsoft/fluentui-token-pipeline`
- Extend with your own brand tokens and modes (custom brand, dark/light, compact/comfortable)
- Generate custom themes as code, not ad-hoc overrides
- Define brand tokens in W3C format → generate custom themes
- Manage multiple brands, densities, modes as code

### Scoped Providers

```tsx
// Dark left nav, light content area, each with its own provider
<FluentProvider theme={webDarkTheme}>
  <NavSidebar />
</FluentProvider>
<FluentProvider theme={webLightTheme}>
  <MainContent />
</FluentProvider>

// Portals and overlays need the correct provider to inherit theme variables
```

---

## Shell and Layout Patterns

### CSS Grid/Flex (Not a Fluent Grid)

Fluent v9 intentionally does not ship a responsive grid; use native CSS Grid/Flex.

### Desktop App Shell Layout

```tsx
const useStyles = makeStyles({
  appShell: {
    display: 'grid',
    gridTemplateRows: 'auto 1fr',
    gridTemplateColumns: '260px 1fr',
    gridTemplateAreas: '"header header" "nav main"',
    height: '100vh',
  },
  header: {
    gridArea: 'header',
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    alignItems: 'center',
    padding: `0 ${tokens.spacingHorizontalL}`,
    height: '48px',
  },
  nav: {
    gridArea: 'nav',
    backgroundColor: tokens.colorNeutralBackground3,
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    overflowY: 'auto',
  },
  main: {
    gridArea: 'main',
    overflowY: 'auto',
    backgroundColor: tokens.colorNeutralBackground2,
  },
  // Mobile: collapse to single column
  '@media (max-width: 767px)': {
    appShellMobile: {
      gridTemplateColumns: '1fr',
      gridTemplateAreas: '"header" "main"',
    },
    navHidden: {
      display: 'none',
    },
  },
});
```

### Responsive Strategies (Fluent 2 Guidance)

1. **Resize**: Adjust widths/margins
2. **Reflow**: Multi-column → single-column
3. **Show/hide**: Collapse secondary content into menus or drawers
4. **Re-architect**: Entirely different layouts for different screens

### No Built-in Responsive Hook

v9 doesn't ship `useResponsiveMode` (v8 feature); build your own breakpoint hook or use container queries.

---

## Collapsible Left Nav + Top Toolbar Integration

### Architecture

- `AppShell` owns `isMobile` (breakpoint hook) and `isNavOpen` state
- Desktop: `<SideNav />` rendered inline in left column
- Mobile: `<NavDrawer open={isNavOpen}><SideNav /></NavDrawer>`
- `TopToolbar` receives `isMobile` and `onToggleNav`; shows hamburger only on mobile

### Drawer Component (Official)

v9 ships `@fluentui/react-drawer` with:
- `OverlayDrawer`: Covers content with a scrim
- `InlineDrawer`: Pushes content aside
- `DrawerHeader`, `DrawerHeaderTitle`, `DrawerBody`
- Motion slots for enter/exit animations (uses transform + opacity for 60fps+)

**Known issue**: InlineDrawer animation can cause content to "jump" — consider using CSS transitions on the grid column instead.

### Nav Component

- `@fluentui/react-nav-preview` (recently stabilized)
- `Nav`, `NavItem`, `NavSectionHeader`, `NavSubItem`
- Guidance: switch to overlay behavior around 640px width

```tsx
import { Drawer, DrawerHeader, DrawerHeaderTitle, DrawerBody, Button } from '@fluentui/react-components';
import { Navigation24Regular, Dismiss24Regular } from '@fluentui/react-icons';

function AppShell() {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 767px)');

  return (
    <div className={styles.shell}>
      <div className={styles.topBar}>
        {isMobile && (
          <Button
            appearance="subtle"
            icon={<Navigation24Regular />}
            onClick={() => setIsNavOpen(true)}
          />
        )}
        <Text weight="semibold">My App</Text>
      </div>

      {isMobile ? (
        <Drawer
          type="overlay"
          position="start"
          open={isNavOpen}
          onOpenChange={(_, { open }) => setIsNavOpen(open)}
        >
          <DrawerHeader>
            <DrawerHeaderTitle
              action={
                <Button
                  appearance="subtle"
                  icon={<Dismiss24Regular />}
                  onClick={() => setIsNavOpen(false)}
                />
              }
            >
              Navigation
            </DrawerHeaderTitle>
          </DrawerHeader>
          <DrawerBody>
            <SideNav />
          </DrawerBody>
        </Drawer>
      ) : (
        <div className={styles.desktopNav}>
          <SideNav />
        </div>
      )}

      <main className={styles.main}>
        {/* Page content */}
      </main>
    </div>
  );
}
```

---

## Positioning API

### Core Options

- `position`: `'above'` | `'below'` | `'before'` | `'after'`
- `align`: `'start'` | `'center'` | `'end'` | `'top'` | `'bottom'`
- `offset`: Static value or function for dynamic offsets
- `positionFixed`: Use CSS `position: fixed` instead of absolute

### Boundary Controls

- **`overflowBoundary`**: Constrains the positioned element so it stays within a container
- **`flipBoundary`**: If not enough space, flips to the opposite position
- **`overflowBoundaryPadding`**: Adds padding to the overflow boundary
- **`autoSize`**: Automatically sizes the element to fit within the boundary
  - `true`: applies to both width and height
  - `'always'`: applies max-height/max-width regardless of overflow

### Advanced Techniques

```tsx
import { Popover, PopoverTrigger, PopoverSurface } from '@fluentui/react-components';

// Custom target — position relative to any element, not just the trigger
<Popover positioning={{ target: customTargetRef.current, position: 'above', align: 'center' }}>
  <PopoverSurface>Content positioned relative to custom target</PopoverSurface>
</Popover>

// Offset function — dynamic offsets based on current position/alignment
<Popover positioning={{ position: 'below', offset: ({ positionedRect }) => positionedRect.width / 2 }}>
  ...
</Popover>

// Boundary controls
<Popover positioning={{
  position: 'below',
  overflowBoundary: containerRef.current,
  flipBoundary: containerRef.current,
  overflowBoundaryPadding: 16,
  autoSize: 'always',
}}>
  ...
</Popover>
```

### Gotchas

- `flipBoundaryPadding` is a requested feature (not yet available)
- Boundaries default to browser window; override with refs to specific containers

---

## Overflow API

### How It Works

- `<Overflow>` detects and hides overflowing elements in DOM
- `<OverflowItem>` wraps each item that can be hidden
- `useOverflowMenu()` hook tells you how many items overflowed and provides refs
- Items can be grouped with `groupId`; entire groups overflow together

### Complete Pattern

```tsx
import {
  Overflow, OverflowItem, useIsOverflowItemVisible,
  useOverflowMenu, Menu, MenuTrigger, MenuPopover,
  MenuList, MenuItem, Button
} from '@fluentui/react-components';
import { MoreHorizontalRegular } from '@fluentui/react-icons';

function OverflowMenuItem({ id, children }: { id: string; children: string }) {
  const isVisible = useIsOverflowItemVisible(id);
  if (isVisible) return null; // Don't show in menu if visible in toolbar
  return <MenuItem>{children}</MenuItem>;
}

function OverflowMenu({ items }: { items: { id: string; label: string }[] }) {
  const { ref, isOverflowing, overflowCount } = useOverflowMenu<HTMLButtonElement>();

  if (!isOverflowing) return null;

  return (
    <Menu>
      <MenuTrigger disableButtonEnhancement>
        <Button ref={ref} icon={<MoreHorizontalRegular />} appearance="subtle">
          +{overflowCount}
        </Button>
      </MenuTrigger>
      <MenuPopover>
        <MenuList>
          {items.map((item) => (
            <OverflowMenuItem key={item.id} id={item.id}>
              {item.label}
            </OverflowMenuItem>
          ))}
        </MenuList>
      </MenuPopover>
    </Menu>
  );
}

function ResponsiveToolbar() {
  const items = [
    { id: 'bold', label: 'Bold' },
    { id: 'italic', label: 'Italic' },
    { id: 'underline', label: 'Underline' },
    { id: 'strikethrough', label: 'Strikethrough' },
    { id: 'highlight', label: 'Highlight' },
  ];

  return (
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
  );
}
```

### Patterns

- Toolbar + Overflow = responsive command bar
- Desktop: show all actions; narrow: overflow into a menu
- Menu items should show icon + text even if toolbar uses icon-only

---

## Motion System

### Fluent 2 Motion Principles

- Functional, natural, subtle
- Clarify state changes and hierarchy, not decoration
- Larger moves = longer durations; important elements animate first
- Stagger preferred for groups
- Respect `prefers-reduced-motion`

### v9 Motion APIs (react-motion package)

- **`createPresenceComponent()`**: Factory for enter/exit presence animations (e.g., Collapse, Fade, Scale)
- **`createMotionComponent()`**: Factory for continuous/trigger-based motion
- **`onMotionFinish`** callback (being replaced with custom events for start/cancel/finish)
- **Motion groups & sequences**: Feature in development for complex choreography (multi-step, staggered, chained animations)

### Built-in Motion Components (preview)

`@fluentui/react-motion-components-preview`:

- `Collapse`: Height/width transition
- `Fade`: Opacity transition
- `Scale`: Scale transform
- Being adopted by core components (e.g., DialogBackdrop → Fade, DialogSurface migrating)

### Known Gaps

- RTL support for motion APIs (directional animations like "slide left" don't auto-flip)
- Motion groups/sequences API still in development
- Motion docs have had rendering issues in Storybook

### Integration with Framer Motion

Use Fluent motion tokens for timing; use Framer Motion for rich animations:

```tsx
import { motion } from 'framer-motion';
import { tokens } from '@fluentui/react-components';

// Parameterize durations/easings from Fluent tokens
const transition = {
  duration: 0.2, // matches tokens.durationNormal (200ms)
  ease: [0.1, 0.9, 0.2, 1], // matches tokens.curveDecelerateMid
};
```

### Complex Animations

```tsx
const useAnimationStyles = makeStyles({
  slideInUp: {
    animationName: {
      from: { opacity: 0, transform: 'translateY(16px)' },
      to: { opacity: 1, transform: 'translateY(0)' },
    },
    animationDuration: tokens.durationSlow,
    animationTimingFunction: tokens.curveDecelerateMid,
    animationFillMode: 'forwards',
  },
  slideOutUp: {
    animationName: {
      from: { opacity: 1, transform: 'translateY(0)' },
      to: { opacity: 0, transform: 'translateY(-16px)' },
    },
    animationDuration: tokens.durationNormal,
    animationTimingFunction: tokens.curveAccelerateMid,
    animationFillMode: 'forwards',
  },
  scaleIn: {
    animationName: {
      from: { opacity: 0, transform: 'scale(0.95)' },
      to: { opacity: 1, transform: 'scale(1)' },
    },
    animationDuration: tokens.durationGentle,
    animationTimingFunction: tokens.curveDecelerateMid,
    animationFillMode: 'forwards',
  },
  staggerChild: {
    animationName: {
      from: { opacity: 0, transform: 'translateY(8px)' },
      to: { opacity: 1, transform: 'translateY(0)' },
    },
    animationDuration: tokens.durationNormal,
    animationTimingFunction: tokens.curveDecelerateMid,
    animationFillMode: 'forwards',
    animationDelay: 'var(--stagger-delay, 0ms)',
  },
  reducedMotion: {
    '@media (prefers-reduced-motion: reduce)': {
      animationDuration: '0.01ms !important',
      animationDelay: '0ms !important',
      transitionDuration: '0.01ms !important',
    },
  },
});
```

---

## Staggered Animations for Lists and Tables

### Pattern with Framer Motion

```tsx
import { motion, AnimatePresence } from 'framer-motion';
import { TableBody, TableRow } from '@fluentui/react-components';

const bodyVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.02 } },
};
const rowVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.18, ease: [0.2, 0, 0, 1] } },
};

// Wrap TableBody and TableRow with motion() elements
const MotionTableBody = motion(TableBody);
const MotionTableRow = motion(TableRow);

function AnimatedTable({ data }) {
  return (
    <MotionTableBody
      key={data.length} // Change key to retrigger stagger on filter/sort
      variants={bodyVariants}
      initial="hidden"
      animate="visible"
    >
      <AnimatePresence>
        {data.map((item) => (
          <MotionTableRow key={item.id} variants={rowVariants} exit={{ opacity: 0 }}>
            {/* cells */}
          </MotionTableRow>
        ))}
      </AnimatePresence>
    </MotionTableBody>
  );
}
```

### Dynamic Updates

- Change `key` on `MotionTableBody` to retrigger stagger on filter/sort changes
- Use `<AnimatePresence>` with `exit` variants for rows being removed
- Framer Motion's layout animations can smooth reorder transitions

---

## Virtualization

### Official + Community Options

| Package | Type | Details |
|---------|------|---------|
| `@fluentui-contrib/react-data-grid-react-window` | Vertical only | Uses `FixedSizeList` from react-window |
| `@fluentui-contrib/react-data-grid-react-window-grid` | 2D (horizontal + vertical) | Uses `VariableSizeGrid`; includes virtualized header via `DataGridHeaderRow` |

### Key Considerations

- DataGrid selection performance degrades with 250+ rows without virtualization (full re-render on selection)
- Tree virtualization: no built-in support; external libraries recommended (react-window, react-virtualized)
- Virtualized grid uses cell-level rendering, not row-level — no `DataGridRow` needed
- Memoization is critical: use `React.memo` on row/cell components, `useMemo` for data processing

### Virtual Scrolling Pattern

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';
import { makeStyles, tokens } from '@fluentui/react-components';

function VirtualList({ items }: { items: Item[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 5,
  });

  return (
    <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <ListItem item={items[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Accessibility — Advanced Patterns

### "Accessible by Default" Approach

- Color contrast: meets WCAG requirements across themes; design tokens encode proper contrast for UI states
- Forced colors mode: supported via `@media (forced-colors: active)` with system colors
- Screen readers: proper ARIA roles, labeling, live regions
- Keyboard: full keyboard navigation for all composite widgets; follows APG patterns
- Composite widgets: roving tabindex for Tab panels, Listboxes, Menus, Trees, Toolbars

### Advanced Patterns

- Focus management in modals/drawers: focus trapping, return focus on close
- Nested focusable elements: careful handling to avoid accessibility violations
- Badge `aria-hidden`: reconsidered for badges that carry meaningful info (PresenceBadge)
- Card a11y: keyboard patterns match closest APG pattern
- Design for 200% text zoom without horizontal scroll, down to 320px minimum width
- WCAG 2.2 improvements tracked for Drawer, InfoLabel, SplitButton components

### Focus Management Patterns

```tsx
import { useArrowNavigationGroup, useFocusFinders } from '@fluentui/react-components';

// Arrow key navigation within a group
function NavigableList({ items }) {
  const arrowNavAttrs = useArrowNavigationGroup({
    axis: 'vertical',
    circular: true,
    memorizeCurrent: true,
  });

  return (
    <div role="listbox" {...arrowNavAttrs}>
      {items.map((item) => (
        <div key={item.id} role="option" tabIndex={0}>{item.name}</div>
      ))}
    </div>
  );
}

// Programmatic focus
function FocusExample() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { findFirstFocusable, findLastFocusable } = useFocusFinders();

  const focusFirst = () => {
    if (containerRef.current) {
      const first = findFirstFocusable(containerRef.current);
      first?.focus();
    }
  };

  return (
    <div ref={containerRef}>
      <Button onClick={focusFirst}>Focus First Item</Button>
      {/* ... interactive content ... */}
    </div>
  );
}
```

---

## Drawer Component — Deep Dive

### Two Variants

- **OverlayDrawer**: Covers content with a semi-transparent scrim; position: start (left) or end (right)
- **InlineDrawer**: Pushes content aside; animates with transform + opacity for 60fps+

### Structure

```tsx
<OverlayDrawer open={open} onOpenChange={(_, { open }) => setOpen(open)} position="end">
  <DrawerHeader>
    <DrawerHeaderTitle action={<Button onClick={() => setOpen(false)} icon={<Dismiss24Regular />} />}>
      Title
    </DrawerHeaderTitle>
  </DrawerHeader>
  <DrawerBody>Content</DrawerBody>
</OverlayDrawer>
```

### Known Issues

- `defaultOpen` was not respected on OverlayDrawer (fixed)
- InlineDrawer animation can cause content jump (transform pushes content immediately)
- Inline Toaster inside OverlayDrawer can be covered by content
- Motion slots available for custom enter/exit animations

---

## Carousel Component

### Architecture

- Uses direct DOM manipulation for slide transitions to avoid React render cycles for slide content
- `CarouselSlider` contains `CarouselCard` elements
- `CarouselNavContainer` with prev/next buttons and `CarouselNav` with pagination dots
- `CarouselAnnouncer` for accessibility (announces page changes)
- Supports `groupSize`, `circular`, `autoplay` with `autoplayInterval`

### Responsive Considerations

- Known issue: Carousel not fully responsive on mobile/small devices (cards extending outside container) — fix has been shipped
- Smaller responsive cards support keyboard navigation (left/right arrows) with group focus (Enter/Esc)

---

## Tree Shaking and Bundle Optimization

### Why It Matters

Without proper tree shaking, a simple Fluent UI control can balloon to 12-18MB. With correct configuration, bundles drop dramatically.

### Configuration

- Set TypeScript `moduleResolution` to `"node16"` or `"bundler"` (not `"node"`)
- Ensure your bundler (webpack/vite) can tree-shake ES modules
- Import from `@fluentui/react-components` (re-exports as named ES modules)
- Avoid `import *` patterns that defeat tree shaking
- Griffel supports ahead-of-time (AOT) compilation with CSS extraction to eliminate runtime CSS-in-JS overhead

```tsx
// GOOD — tree-shakeable
import { Button } from '@fluentui/react-components';

// BAD — pulls entire bundle
import FluentUI from '@fluentui/react-components';
```

---

## Responsive Design Patterns

### Responsive Card Grid

```tsx
const useStyles = makeStyles({
  grid: {
    display: 'grid',
    gap: tokens.spacingHorizontalL,
    gridTemplateColumns: '1fr',
    '@media (min-width: 640px)': {
      gridTemplateColumns: 'repeat(2, 1fr)',
    },
    '@media (min-width: 1024px)': {
      gridTemplateColumns: 'repeat(3, 1fr)',
    },
    '@media (min-width: 1366px)': {
      gridTemplateColumns: 'repeat(4, 1fr)',
    },
  },
});
```

### Responsive Navigation

```tsx
const useStyles = makeStyles({
  nav: {
    display: 'flex',
    flexDirection: 'column',
    width: '64px', // Collapsed on mobile
    transition: `width ${tokens.durationNormal} ${tokens.curveEasyEase}`,
    backgroundColor: tokens.colorNeutralBackground3,
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    '@media (min-width: 1024px)': {
      width: '280px', // Expanded on desktop
    },
  },
  navLabel: {
    display: 'none',
    '@media (min-width: 1024px)': {
      display: 'inline',
    },
  },
});
```

### Master-Detail Layout

```tsx
const useStyles = makeStyles({
  container: {
    display: 'flex',
    height: '100vh',
  },
  masterList: {
    width: '100%',
    borderRight: 'none',
    '@media (min-width: 768px)': {
      width: '360px',
      borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    },
  },
  detail: {
    display: 'none',
    flex: 1,
    '@media (min-width: 768px)': {
      display: 'flex',
      flexDirection: 'column',
    },
  },
  masterHidden: {
    display: 'none',
    '@media (min-width: 768px)': {
      display: 'flex',
    },
  },
  detailVisible: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
});
```

---

## SSR / Server-Side Rendering

### Next.js Integration

```tsx
// app/layout.tsx (Next.js App Router)
import { FluentProvider, webLightTheme } from '@fluentui/react-components';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <FluentProvider theme={webLightTheme}>
          {children}
        </FluentProvider>
      </body>
    </html>
  );
}
```

### SSR Style Extraction

```tsx
import {
  createDOMRenderer, renderToStyleElements, RendererProvider,
  SSRProvider, FluentProvider, webLightTheme,
} from '@fluentui/react-components';
import { renderToString } from 'react-dom/server';

const renderer = createDOMRenderer();

const html = renderToString(
  <RendererProvider renderer={renderer}>
    <SSRProvider>
      <FluentProvider theme={webLightTheme}>
        <App />
      </FluentProvider>
    </SSRProvider>
  </RendererProvider>
);

// Extract style elements for <head>
const styles = renderToStyleElements(renderer);
```

---

## Performance Patterns

### Lazy Loading Components

```tsx
import { lazy, Suspense } from 'react';
import { Spinner } from '@fluentui/react-components';

const HeavyDataGrid = lazy(() => import('./HeavyDataGrid'));

function Dashboard() {
  return (
    <Suspense fallback={<Spinner label="Loading data..." />}>
      <HeavyDataGrid />
    </Suspense>
  );
}
```

### Memoization with Fluent Styles

```tsx
import { makeStyles, tokens } from '@fluentui/react-components';
import { memo, useMemo } from 'react';

// Styles are already memoized by makeStyles — no need to wrap
const useStyles = makeStyles({
  item: {
    padding: tokens.spacingHorizontalM,
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
  },
});

// Memoize the component to prevent unnecessary re-renders
const ListItem = memo(({ item }: { item: Item }) => {
  const styles = useStyles();
  return <div className={styles.item}>{item.name}</div>;
});
```

---

## Community Insights

### Strengths (Consensus)

- Accessibility: best-in-class for enterprise
- Documentation: comprehensive Storybook + Microsoft Learn
- v9 API: massive improvement over v8; "switching to MUI from Fluent v9 would be stepping back 5 years"
- Interoperability: works well with popular form libraries, routers, etc.

### Common Complaints

- Visual feel can look "dated" without customization — solvable with theme/variant work
- Component architecture (`state + render + _unstable` hooks) feels over-engineered to newcomers — serves the composition/extensibility model
- Sharing `makeStyles` across files for reusability can cause TypeScript inference issues — solution: export explicit types

### Recommended Pairings

- Fluent UI v9 + react-window for virtualization
- Fluent UI v9 + Framer Motion for rich animations
- Fluent UI v9 + custom theme pipeline for brand consistency

---

## Extending Fluent Further

### Own the Token Pipeline

- Fork/extend `microsoft/fluentui-token-pipeline`
- Define brand tokens in W3C format → generate custom themes
- Manage multiple brands, densities, modes as code

### Build Your Own Component Layer

- Use the state + render + slots pattern for custom components
- Build product-specific library: `AppShell`, `CommandBar`, `PageHeader`, `EntityList`, `FormLayout`
- Treat Fluent as "foundation layer," your DS as the consumer-facing layer

### Triggers and Extension Points

- Create custom trigger utilities for analytics, feature flags, etc.
- Define new design tokens that emit custom CSS variables
- Mix React components and Web Components when needed

---

## Custom Component Design Checklist

When building custom components with Fluent 2:

1. **Use tokens** — Never hardcode colors, spacing, or typography values
2. **Support themes** — Test with light, dark, and high-contrast themes
3. **Keyboard accessible** — All interactive elements focusable and operable via keyboard
4. **ARIA attributes** — Proper roles, labels, and descriptions
5. **Responsive** — Works at all breakpoints (320px to 1920px+)
6. **Touch targets** — Minimum 44x44px for interactive elements
7. **Loading states** — Use Skeleton or Spinner during async operations
8. **Error states** — Use MessageBar or Field validation for error feedback
9. **Empty states** — Show meaningful content when data is empty
10. **Reduced motion** — Respect `prefers-reduced-motion` preference
11. **RTL support** — Use logical properties (start/end vs left/right)
12. **Focus management** — Proper focus order and focus restoration after dialogs

---

## Reference Resources

### Official Training (Video + Docs)

- Fluent UI React Trainings: Advanced slots design & Positioning API
- Fluent UI React Trainings: Styling components & theming
- Fluent UI React Trainings: Styling best practices and icons
- Fluent UI React Trainings: Accessibility basics
- Fluent UI React Insights: APIs in v9 — Slots, JSX children & triggers
- Fluent UI React Insights: Theming in v9
- Fluent UI React Insights: Accessible by default
- Fluent UI React Insights: Positioning

### Official Docs

- Styles Handbook (Griffel): `fluentui/docs/react-v9/contributing/rfcs/react-components/styles-handbook.md`
- Storybook: `https://react.fluentui.dev/`
- Fluent 2 Design System: `https://fluent2.microsoft.design/`
- Token Pipeline: `https://github.com/microsoft/fluentui-token-pipeline`

### Community

- Tiger Oakes: "Tricks for writing CSS in Fluent UI React v9"
- Paul Gildea: "Using Slots with Fluent UI React v9", "Creating Custom Variants with Fluent UI React v9"
- GitHub Discussions: "v9: Custom Components with Slots & Composition API Part 1"
- fluentui-contrib: Virtualized DataGrid packages
- Axis Communications: Examples for Fluent UI v9
