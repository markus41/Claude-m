# Fluent 2 Advanced UI Patterns & Architecture

## Compound Component Pattern (Slots)

Fluent UI v9 uses a compound component architecture where complex components are composed of smaller,
independently customizable sub-components (slots).

### How Slots Work

Every Fluent component exposes named "slots" — render points that accept JSX, props objects, or null:

```tsx
// Slot as JSX element
<Button icon={<CalendarRegular />}>Schedule</Button>

// Slot as props object (for customization)
<Button icon={{ children: <CalendarRegular />, className: customIconClass }}>Schedule</Button>

// Slot as null (hide the slot)
<CardHeader action={null} header={<Text>Title</Text>} />
```

### Creating Custom Compound Components

```tsx
import { ForwardRefComponent, slot, useControllableState } from '@fluentui/react-components';

// Define slot types
type CustomCardSlots = {
  root: NonNullable<Slot<'div'>>;
  header?: Slot<'div'>;
  body?: Slot<'div'>;
  footer?: Slot<'div'>;
  media?: Slot<'div'>;
};

type CustomCardProps = ComponentProps<CustomCardSlots> & {
  variant?: 'default' | 'compact' | 'hero';
};

// Use slots in component
const useCustomCardStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow4,
  },
  header: {
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  body: {
    padding: tokens.spacingHorizontalL,
    flex: 1,
  },
  footer: {
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL}`,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    justifyContent: 'flex-end',
    gap: tokens.spacingHorizontalS,
  },
});
```

---

## Advanced makeStyles Patterns

### Shared Styles (Style Libraries)

Create reusable style fragments across components:

```tsx
// styles/shared.ts
import { makeStyles, tokens, shorthands } from '@fluentui/react-components';

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

### makeResetStyles (Non-Atomic Base Styles)

For complex base styles that shouldn't be atomized:

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

### CSS Variables via createCustomProperties (Custom Tokens)

```tsx
import { makeStyles, tokens } from '@fluentui/react-components';

// Define custom CSS variables alongside Fluent tokens
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

### Complex Animations

```tsx
import { makeStyles, tokens } from '@fluentui/react-components';

const useAnimationStyles = makeStyles({
  // Slide in from bottom
  slideInUp: {
    animationName: {
      from: {
        opacity: 0,
        transform: 'translateY(16px)',
      },
      to: {
        opacity: 1,
        transform: 'translateY(0)',
      },
    },
    animationDuration: tokens.durationSlow,
    animationTimingFunction: tokens.curveDecelerateMid,
    animationFillMode: 'forwards',
  },

  // Slide out to top
  slideOutUp: {
    animationName: {
      from: {
        opacity: 1,
        transform: 'translateY(0)',
      },
      to: {
        opacity: 0,
        transform: 'translateY(-16px)',
      },
    },
    animationDuration: tokens.durationNormal,
    animationTimingFunction: tokens.curveAccelerateMid,
    animationFillMode: 'forwards',
  },

  // Scale in (dialog entrance)
  scaleIn: {
    animationName: {
      from: {
        opacity: 0,
        transform: 'scale(0.95)',
      },
      to: {
        opacity: 1,
        transform: 'scale(1)',
      },
    },
    animationDuration: tokens.durationGentle,
    animationTimingFunction: tokens.curveDecelerateMid,
    animationFillMode: 'forwards',
  },

  // Staggered children (cascade effect)
  staggerChild: {
    animationName: {
      from: { opacity: 0, transform: 'translateY(8px)' },
      to: { opacity: 1, transform: 'translateY(0)' },
    },
    animationDuration: tokens.durationNormal,
    animationTimingFunction: tokens.curveDecelerateMid,
    animationFillMode: 'forwards',
    // Use custom property for delay per child
    animationDelay: 'var(--stagger-delay, 0ms)',
  },

  // Reduced motion respect
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

## Responsive Design Patterns

### Responsive Card Grid

```tsx
const useStyles = makeStyles({
  grid: {
    display: 'grid',
    gap: tokens.spacingHorizontalL,
    gridTemplateColumns: '1fr',

    // Tablet (640px+)
    '@media (min-width: 640px)': {
      gridTemplateColumns: 'repeat(2, 1fr)',
    },

    // Desktop (1024px+)
    '@media (min-width: 1024px)': {
      gridTemplateColumns: 'repeat(3, 1fr)',
    },

    // Large desktop (1366px+)
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
  // On mobile, when detail is selected, hide master
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

## Focus Management Patterns

### Arrow Key Navigation Group

```tsx
import { useArrowNavigationGroup, useFocusFinders } from '@fluentui/react-components';

function NavigableList({ items }: { items: Item[] }) {
  // Enable arrow key navigation within the list
  const arrowNavAttrs = useArrowNavigationGroup({
    axis: 'vertical',        // vertical, horizontal, both
    circular: true,           // Wrap around at ends
    memorizeCurrent: true,    // Remember last focused item
  });

  return (
    <div role="listbox" {...arrowNavAttrs}>
      {items.map((item) => (
        <div key={item.id} role="option" tabIndex={0}>
          {item.name}
        </div>
      ))}
    </div>
  );
}
```

### Focus Trap (Dialogs, Drawers)

```tsx
import { useFocusTrap } from '@fluentui/react-components';

function TrapExample() {
  const trapAttrs = useFocusTrap();

  return (
    <div {...trapAttrs}>
      {/* Focus is trapped within this div */}
      <Button>First focusable</Button>
      <Input />
      <Button>Last focusable</Button>
      {/* Tab from last goes back to first */}
    </div>
  );
}
```

### Programmatic Focus

```tsx
import { useFocusFinders } from '@fluentui/react-components';

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

## Overflow Pattern

Handle responsive toolbars and tab bars that overflow:

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
  createDOMRenderer,
  renderToStyleElements,
  RendererProvider,
  SSRProvider,
  FluentProvider,
  webLightTheme,
} from '@fluentui/react-components';
import { renderToString } from 'react-dom/server';

// Server
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

// Insert `styles` into document <head> and `html` into <body>
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

### Virtual Scrolling

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';
import { makeStyles, tokens } from '@fluentui/react-components';

function VirtualList({ items }: { items: Item[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48, // Estimated row height
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

### Memoization with Fluent Styles

```tsx
import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
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

## Custom Component Design Checklist

When building custom components with Fluent 2:

1. **Use tokens** — Never hardcode colors, spacing, or typography values
2. **Support themes** — Test with light, dark, and high-contrast themes
3. **Keyboard accessible** — All interactive elements focusable and operable via keyboard
4. **ARIA attributes** — Proper roles, labels, and descriptions
5. **Responsive** — Works at all breakpoints (320px to 1920px+)
6. **Touch targets** — Minimum 44×44px for interactive elements
7. **Loading states** — Use Skeleton or Spinner during async operations
8. **Error states** — Use MessageBar or Field validation for error feedback
9. **Empty states** — Show meaningful content when data is empty
10. **Reduced motion** — Respect `prefers-reduced-motion` preference
11. **RTL support** — Use logical properties (start/end vs left/right)
12. **Focus management** — Proper focus order and focus restoration after dialogs
