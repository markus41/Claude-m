# Slots, Recomposition & customStyleHooks — Reference

## Slot API Reference

### Core Types

```typescript
// Slot type — defines what a slot accepts
type Slot<
  Type extends keyof JSX.IntrinsicElements,
  AlternateAs extends keyof JSX.IntrinsicElements = never
> = ISlot<Type, AlternateAs>;

// What consumers can pass to a slot prop
type SlotValue<Type> =
  | React.ReactElement                           // Level 1: JSX content
  | SlotPropsRecord<Type>                        // Level 2: Props object
  | { as?: AlternateAs }                         // Level 3: Element type change
  | { children: SlotRenderFunction<Type> }       // Level 4: Render function
  | null;                                        // Suppress the slot

// Render function signature
type SlotRenderFunction<Type> = (
  Component: React.ElementType,
  props: React.HTMLAttributes<Type>
) => React.ReactElement | null;
```

### Slot Resolution Utilities

```typescript
import { slot } from '@fluentui/react-components';

// Always render this slot (required slot)
slot.always(value, options);

// Render only if consumer provides a value (optional slot)
slot.optional(value, options);

// Options shape
type SlotOptions<T extends keyof JSX.IntrinsicElements> = {
  elementType: T;                    // Default HTML element
  defaultProps?: React.HTMLAttributes<T>; // Default props merged with consumer props
};
```

### Component Props and State Types

```typescript
import type {
  ComponentProps,
  ComponentState,
} from '@fluentui/react-components';

// ComponentProps<Slots> — Derives the public props interface from slot definitions
// ComponentState<Slots> — Derives the internal state interface with resolved slots

// Example
type MySlots = {
  root: NonNullable<Slot<'div'>>;
  header?: Slot<'div'>;
  content: NonNullable<Slot<'div'>>;
  footer?: Slot<'div'>;
};

type MyComponentProps = ComponentProps<MySlots> & {
  variant?: 'default' | 'compact';
};

type MyComponentState = ComponentState<MySlots> & {
  variant: 'default' | 'compact';
};
```

---

## Level 1: Content Customization — Full Examples

### Simple JSX Content

```tsx
import { Input } from '@fluentui/react-components';
import { SearchRegular, DismissRegular } from '@fluentui/react-icons';

// Pass icon components to contentBefore and contentAfter slots
<Input
  contentBefore={<SearchRegular />}
  contentAfter={<DismissRegular />}
  placeholder="Search..."
/>
```

**Rendered HTML:**
```html
<span class="fui-Input">
  <span class="fui-Input__contentBefore">
    <svg><!-- SearchRegular --></svg>
  </span>
  <input class="fui-Input__input" placeholder="Search..." />
  <span class="fui-Input__contentAfter">
    <svg><!-- DismissRegular --></svg>
  </span>
</span>
```

### Complex JSX Content

```tsx
import { Card, CardHeader, Avatar, Button, Text } from '@fluentui/react-components';
import { MoreHorizontalRegular } from '@fluentui/react-icons';

<Card>
  <CardHeader
    image={<Avatar name="Jane Doe" />}
    header={<Text weight="semibold">Jane Doe</Text>}
    description={<Text size={200}>Software Engineer</Text>}
    action={
      <Button
        appearance="transparent"
        icon={<MoreHorizontalRegular />}
        aria-label="More options"
      />
    }
  />
</Card>
```

**Rendered HTML:**
```html
<div class="fui-Card" tabindex="0" role="group">
  <div class="fui-CardHeader">
    <div class="fui-CardHeader__image">
      <span class="fui-Avatar" role="img" aria-label="Jane Doe">
        <span class="fui-Avatar__initials">JD</span>
      </span>
    </div>
    <div class="fui-CardHeader__header">
      <span class="fui-Text" style="font-weight: 600;">Jane Doe</span>
    </div>
    <div class="fui-CardHeader__description">
      <span class="fui-Text" style="font-size: 12px;">Software Engineer</span>
    </div>
    <div class="fui-CardHeader__action">
      <button class="fui-Button" type="button" aria-label="More options">
        <span class="fui-Button__icon">
          <svg><!-- MoreHorizontalRegular --></svg>
        </span>
      </button>
    </div>
  </div>
</div>
```

---

## Level 2: Props Customization — Full Examples

### Adding ARIA Attributes and Event Handlers

```tsx
import { Input } from '@fluentui/react-components';
import { SearchRegular } from '@fluentui/react-icons';

<Input
  contentBefore={{
    children: <SearchRegular />,
    'aria-hidden': true,
    onClick: () => console.log('Icon clicked'),
    style: { cursor: 'pointer' },
  }}
  placeholder="Search..."
/>
```

**Rendered HTML:**
```html
<span class="fui-Input">
  <span class="fui-Input__contentBefore"
        aria-hidden="true"
        style="cursor: pointer;">
    <svg><!-- SearchRegular --></svg>
  </span>
  <input class="fui-Input__input" placeholder="Search..." />
</span>
```

### Applying Custom Classes to Slots

```tsx
import { Button, makeStyles, tokens } from '@fluentui/react-components';
import { CalendarRegular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  iconSlot: {
    color: tokens.colorPaletteBlueForeground1,
    fontSize: '24px',
  },
});

const MyButton = () => {
  const styles = useStyles();
  return (
    <Button
      icon={{
        children: <CalendarRegular />,
        className: styles.iconSlot,
      }}
    >
      Open Calendar
    </Button>
  );
};
```

**Rendered HTML:**
```html
<button class="fui-Button" type="button">
  <span class="fui-Button__icon fe3e8s" style="color: var(--colorPaletteBlueForeground1); font-size: 24px;">
    <svg><!-- CalendarRegular --></svg>
  </span>
  Open Calendar
</button>
```

### Data Attributes on Slots

```tsx
<Input
  root={{
    'data-testid': 'search-input-wrapper',
    className: 'custom-wrapper',
  }}
  input={{
    'data-testid': 'search-input-field',
    autoComplete: 'off',
    spellCheck: false,
  }}
  contentBefore={{
    children: <SearchRegular />,
    'data-testid': 'search-input-icon',
  }}
/>
```

**Rendered HTML:**
```html
<span class="fui-Input custom-wrapper" data-testid="search-input-wrapper">
  <span class="fui-Input__contentBefore" data-testid="search-input-icon">
    <svg><!-- SearchRegular --></svg>
  </span>
  <input class="fui-Input__input"
         data-testid="search-input-field"
         autocomplete="off"
         spellcheck="false" />
</span>
```

---

## Level 3: Element Type Change — Full Examples

### Button as Anchor

```tsx
import { Button } from '@fluentui/react-components';
import { OpenRegular } from '@fluentui/react-icons';

<Button
  as="a"
  href="https://learn.microsoft.com"
  target="_blank"
  rel="noopener noreferrer"
  icon={<OpenRegular />}
  iconPosition="after"
>
  Microsoft Learn
</Button>
```

**Rendered HTML:**
```html
<a class="fui-Button"
   href="https://learn.microsoft.com"
   target="_blank"
   rel="noopener noreferrer">
  Microsoft Learn
  <span class="fui-Button__icon">
    <svg><!-- OpenRegular --></svg>
  </span>
</a>
```

### Input with Custom Root Element

```tsx
<Input
  root={{ as: 'label' }}
  contentBefore={<SearchRegular />}
  placeholder="Click anywhere to focus"
/>
```

**Rendered HTML:**
```html
<label class="fui-Input">
  <span class="fui-Input__contentBefore">
    <svg><!-- SearchRegular --></svg>
  </span>
  <input class="fui-Input__input" placeholder="Click anywhere to focus" />
</label>
```

### Type Constraints

Not all element changes are valid. The `Slot` generic constrains alternatives:

```typescript
// Button root accepts 'button' or 'a'
root: Slot<'button', 'a'>;

// This is valid:
<Button as="a" href="..." />

// This would be a TypeScript error:
<Button as="div" />  // Error: 'div' is not assignable to 'button' | 'a'
```

---

## Level 4: Render Function Replacement — Full Examples

### Wrapping a Slot in a Tooltip

```tsx
import { Input, Tooltip } from '@fluentui/react-components';
import { InfoRegular } from '@fluentui/react-icons';

<Input
  contentAfter={{
    children: (Component, props) => (
      <Tooltip content="Enter your full legal name" relationship="description">
        <Component {...props}>
          <InfoRegular />
        </Component>
      </Tooltip>
    ),
  }}
  placeholder="Full name"
/>
```

**Rendered HTML:**
```html
<span class="fui-Input">
  <input class="fui-Input__input" placeholder="Full name" />
  <span class="fui-Input__contentAfter" aria-describedby="tooltip-1">
    <svg><!-- InfoRegular --></svg>
  </span>
</span>
<!-- When tooltip visible: -->
<div role="tooltip" id="tooltip-1" class="fui-Tooltip">
  Enter your full legal name
</div>
```

### Conditional Rendering in a Slot

```tsx
import { Button, Badge } from '@fluentui/react-components';
import { MailRegular } from '@fluentui/react-icons';

type NotificationButtonProps = {
  count: number;
};

const NotificationButton: React.FC<NotificationButtonProps> = ({ count }) => (
  <Button
    icon={{
      children: (Component, props) => (
        <Component {...props} style={{ position: 'relative' }}>
          <MailRegular />
          {count > 0 && (
            <Badge
              size="tiny"
              color="danger"
              style={{ position: 'absolute', top: -4, right: -4 }}
            >
              {count}
            </Badge>
          )}
        </Component>
      ),
    }}
  >
    Messages
  </Button>
);
```

### Adding a Context Provider Around a Slot

```tsx
import { Menu, MenuTrigger, MenuPopover, MenuList, MenuItem } from '@fluentui/react-components';

const MyContext = React.createContext<string>('default');

<Menu>
  <MenuTrigger>
    <Button>Open Menu</Button>
  </MenuTrigger>
  <MenuPopover>
    <MenuList
      root={{
        children: (Component, props) => (
          <MyContext.Provider value="inside-menu">
            <Component {...props} />
          </MyContext.Provider>
        ),
      }}
    >
      <MenuItem>Item 1</MenuItem>
      <MenuItem>Item 2</MenuItem>
    </MenuList>
  </MenuPopover>
</Menu>
```

### Complete Slot Replacement

```tsx
import { Input } from '@fluentui/react-components';

// Replace the input element entirely with a textarea
<Input
  input={{
    children: (_Component, props) => (
      <textarea
        {...props}
        rows={3}
        style={{ resize: 'vertical', border: 'none', outline: 'none', width: '100%' }}
      />
    ),
  }}
/>
```

---

## Trigger Patterns

### Overview

Several Fluent v9 compound components use a **trigger pattern** where a child component
acts as the interaction target for a parent behavior (popover, menu, tooltip, dialog).
The trigger clones the child and injects event handlers and ARIA attributes.

### Built-in Triggers

| Trigger Component | Parent Component | Injected Behavior |
|---|---|---|
| `PopoverTrigger` | `Popover` | Click/hover to open popover |
| `MenuTrigger` | `Menu` | Click to open menu |
| `TooltipTrigger` | (via Tooltip) | Hover/focus to show tooltip |
| `DialogTrigger` | `Dialog` | Click to open/close dialog |
| `ComboboxTrigger` | (internal) | Input focus to open listbox |

### PopoverTrigger

```tsx
import {
  Popover,
  PopoverTrigger,
  PopoverSurface,
  Button,
} from '@fluentui/react-components';

<Popover>
  <PopoverTrigger disableButtonEnhancement>
    <Button>Click me</Button>
  </PopoverTrigger>
  <PopoverSurface>
    <p>Popover content here</p>
  </PopoverSurface>
</Popover>
```

**How it works:**
1. `PopoverTrigger` clones its child element
2. Injects `onClick` (or `onMouseEnter` for hover mode) to toggle the popover
3. Adds `aria-expanded`, `aria-haspopup`, and `aria-controls` attributes
4. The child must accept a `ref` (use `forwardRef` for custom components)

**`disableButtonEnhancement`** — By default, `PopoverTrigger` wraps non-button children in
a `<button>` element for accessibility. Set `disableButtonEnhancement` when the child is
already a button or interactive element.

### MenuTrigger

```tsx
import {
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  MenuButton,
} from '@fluentui/react-components';

// Using MenuButton (recommended)
<Menu>
  <MenuTrigger disableButtonEnhancement>
    <MenuButton>Actions</MenuButton>
  </MenuTrigger>
  <MenuPopover>
    <MenuList>
      <MenuItem>Edit</MenuItem>
      <MenuItem>Delete</MenuItem>
    </MenuList>
  </MenuPopover>
</Menu>

// Using a regular Button
<Menu>
  <MenuTrigger disableButtonEnhancement>
    <Button>Actions</Button>
  </MenuTrigger>
  <MenuPopover>
    <MenuList>
      <MenuItem>Edit</MenuItem>
      <MenuItem>Delete</MenuItem>
    </MenuList>
  </MenuPopover>
</Menu>
```

**MenuTrigger injects:**
- `onClick` — Toggle menu open/close
- `onKeyDown` — Arrow key navigation (ArrowDown opens menu)
- `aria-expanded` — Current open state
- `aria-haspopup` — `"menu"`
- `ref` — For positioning the popover relative to the trigger

### DialogTrigger

```tsx
import {
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@fluentui/react-components';

<Dialog>
  <DialogTrigger disableButtonEnhancement>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogSurface>
    <DialogBody>
      <DialogTitle>Confirm Action</DialogTitle>
      <DialogContent>Are you sure?</DialogContent>
      <DialogActions>
        <DialogTrigger disableButtonEnhancement>
          <Button appearance="secondary">Cancel</Button>
        </DialogTrigger>
        <Button appearance="primary">Confirm</Button>
      </DialogActions>
    </DialogBody>
  </DialogSurface>
</Dialog>
```

**Key detail:** `DialogTrigger` can be used both to open and close. When placed inside
`DialogActions`, clicking it closes the dialog. The `action` prop controls this:
- `action="open"` — Opens the dialog (default when outside DialogSurface)
- `action="close"` — Closes the dialog (default when inside DialogSurface)

### Nested Triggers

Triggers can be nested. A common pattern is a menu item that opens a sub-menu:

```tsx
<Menu>
  <MenuTrigger disableButtonEnhancement>
    <MenuButton>File</MenuButton>
  </MenuTrigger>
  <MenuPopover>
    <MenuList>
      <MenuItem>New</MenuItem>
      <Menu>
        <MenuTrigger disableButtonEnhancement>
          <MenuItem>Open Recent</MenuItem>
        </MenuTrigger>
        <MenuPopover>
          <MenuList>
            <MenuItem>Document.docx</MenuItem>
            <MenuItem>Spreadsheet.xlsx</MenuItem>
          </MenuList>
        </MenuPopover>
      </Menu>
      <MenuItem>Save</MenuItem>
    </MenuList>
  </MenuPopover>
</Menu>
```

### Custom Trigger Components

If you need a custom component as a trigger, it must:

1. **Accept and forward a `ref`** — Triggers need a DOM reference for positioning
2. **Spread received props** — Triggers inject event handlers and ARIA attributes via props
3. **Render a focusable element** — The trigger must be keyboard accessible

```tsx
import * as React from 'react';

// Custom trigger-compatible component
const CustomTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>((props, ref) => {
  return (
    <button
      ref={ref}
      {...props}  // Spread ALL props — trigger injects onClick, aria-*, etc.
      className={`my-custom-trigger ${props.className || ''}`}
    >
      {props.children}
    </button>
  );
});

CustomTrigger.displayName = 'CustomTrigger';

// Usage
<Popover>
  <PopoverTrigger disableButtonEnhancement>
    <CustomTrigger>Click me</CustomTrigger>
  </PopoverTrigger>
  <PopoverSurface>Content</PopoverSurface>
</Popover>
```

### Trigger with Non-Button Elements

When the trigger child is not a native `<button>`, `PopoverTrigger` and `MenuTrigger` will
enhance it by default — wrapping it in a `<button>` or adding `role="button"` and keyboard
handlers. Use `disableButtonEnhancement` only when the child is already interactive:

```tsx
// span is NOT interactive — trigger enhances it automatically
<PopoverTrigger>
  <span>Click this text</span>
</PopoverTrigger>
// Result: <button class="..."><span>Click this text</span></button>

// With disableButtonEnhancement on a non-interactive element — NOT recommended
<PopoverTrigger disableButtonEnhancement>
  <span>This is not accessible!</span>
</PopoverTrigger>
// Result: <span onClick="...">This is not accessible!</span>
// Missing: keyboard focus, role="button", Enter/Space handlers
```

---

## Composition Patterns for Complex Components

### Pattern 1: Wrapping a Fluent Component with Extra Behavior

```tsx
import * as React from 'react';
import {
  Input,
  makeStyles,
  mergeClasses,
  tokens,
  Text,
} from '@fluentui/react-components';
import type { InputProps } from '@fluentui/react-components';

const useStyles = makeStyles({
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  error: {
    color: tokens.colorPaletteRedForeground1,
    fontSize: tokens.fontSizeBase200,
  },
  errorInput: {
    borderColor: tokens.colorPaletteRedBorder1,
  },
});

type ValidatedInputProps = InputProps & {
  label?: string;
  error?: string;
  required?: boolean;
};

const ValidatedInput = React.forwardRef<HTMLInputElement, ValidatedInputProps>(
  ({ label, error, required, className, ...props }, ref) => {
    const styles = useStyles();
    const id = React.useId();

    return (
      <div className={styles.wrapper}>
        {label && (
          <label htmlFor={id}>
            {label}
            {required && <span aria-hidden="true"> *</span>}
          </label>
        )}
        <Input
          ref={ref}
          id={id}
          aria-invalid={!!error}
          aria-errormessage={error ? `${id}-error` : undefined}
          aria-required={required}
          className={mergeClasses(error && styles.errorInput, className)}
          {...props}
        />
        {error && (
          <Text id={`${id}-error`} className={styles.error} role="alert">
            {error}
          </Text>
        )}
      </div>
    );
  }
);

ValidatedInput.displayName = 'ValidatedInput';
```

### Pattern 2: Recomposing with Custom State

```tsx
import {
  useButton_unstable,
  useButtonStyles_unstable,
  renderButton_unstable,
} from '@fluentui/react-components';
import type { ButtonProps, ButtonState } from '@fluentui/react-components';

type LoadingButtonProps = ButtonProps & {
  loading?: boolean;
};

const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ loading, children, ...props }, ref) => {
    const state = useButton_unstable(
      {
        ...props,
        disabled: props.disabled || loading,
        icon: loading ? <Spinner size="tiny" /> : props.icon,
        children: loading ? 'Loading...' : children,
      },
      ref
    );

    useButtonStyles_unstable(state);
    return renderButton_unstable(state);
  }
);

LoadingButton.displayName = 'LoadingButton';
```

### Pattern 3: Multi-Component Composition

```tsx
import {
  Card,
  CardHeader,
  CardPreview,
  Avatar,
  Button,
  Text,
  Badge,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { MoreHorizontalRegular, HeartRegular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  card: {
    width: '360px',
  },
  preview: {
    height: '200px',
    objectFit: 'cover',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: tokens.spacingHorizontalM,
  },
  stats: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    alignItems: 'center',
  },
});

type ArticleCardProps = {
  title: string;
  author: string;
  imageUrl: string;
  likes: number;
  category: string;
  onLike?: () => void;
  onMore?: () => void;
};

const ArticleCard: React.FC<ArticleCardProps> = ({
  title,
  author,
  imageUrl,
  likes,
  category,
  onLike,
  onMore,
}) => {
  const styles = useStyles();
  return (
    <Card className={styles.card}>
      <CardPreview>
        <img src={imageUrl} alt={title} className={styles.preview} />
      </CardPreview>
      <CardHeader
        image={<Avatar name={author} size={32} />}
        header={<Text weight="semibold">{title}</Text>}
        description={<Text size={200}>{author}</Text>}
        action={
          <Button
            appearance="transparent"
            icon={<MoreHorizontalRegular />}
            aria-label="More options"
            onClick={onMore}
          />
        }
      />
      <div className={styles.footer}>
        <Badge appearance="tint" color="brand">{category}</Badge>
        <div className={styles.stats}>
          <Button
            appearance="transparent"
            icon={<HeartRegular />}
            onClick={onLike}
            size="small"
          >
            {likes}
          </Button>
        </div>
      </div>
    </Card>
  );
};
```

### Pattern 4: Higher-Order Component Wrapping

```tsx
import type { ComponentType } from 'react';
import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';

const useElevatedStyles = makeStyles({
  elevated: {
    boxShadow: tokens.shadow8,
    ':hover': {
      boxShadow: tokens.shadow16,
    },
    transitionProperty: 'box-shadow',
    transitionDuration: tokens.durationNormal,
    transitionTimingFunction: tokens.curveEasyEase,
  },
});

function withElevation<P extends { className?: string }>(
  WrappedComponent: ComponentType<P>
): ComponentType<P> {
  const ElevatedComponent = React.forwardRef<unknown, P>((props, ref) => {
    const styles = useElevatedStyles();
    return (
      <WrappedComponent
        {...props}
        ref={ref}
        className={mergeClasses(styles.elevated, props.className)}
      />
    );
  });

  ElevatedComponent.displayName = `withElevation(${
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  })`;

  return ElevatedComponent as ComponentType<P>;
}

// Usage
const ElevatedCard = withElevation(Card);
<ElevatedCard>Content</ElevatedCard>
```

---

## customStyleHooks Implementation Details

### How Fluent Components Consume Custom Style Hooks

Internally, each Fluent v9 component calls `useCustomStyleHook_unstable` during its render
cycle. This function checks the `FluentProvider` context for a matching custom style hook
and invokes it if present.

The simplified internal flow:

```typescript
// Inside the Button component (simplified)
const Button = React.forwardRef((props, ref) => {
  const state = useButton_unstable(props, ref);
  useButtonStyles_unstable(state);          // Built-in styles
  useCustomStyleHook_unstable('useButtonStyles_unstable')(state); // Custom override
  return renderButton_unstable(state);
});
```

### Provider Nesting and Specificity

Custom style hooks are resolved from the nearest `FluentProvider`. Nested providers
can override parent-level hooks:

```tsx
<FluentProvider
  theme={webLightTheme}
  customStyleHooks_unstable={{
    useButtonStyles_unstable: useGlobalButtonOverride,
  }}
>
  {/* All buttons get global override */}
  <Button>Global</Button>

  <FluentProvider
    customStyleHooks_unstable={{
      useButtonStyles_unstable: useSectionButtonOverride,
    }}
  >
    {/* Buttons here get section override (replaces global) */}
    <Button>Section</Button>
  </FluentProvider>
</FluentProvider>
```

**Important:** Nested custom style hooks **replace** parent hooks for the same component,
they do not merge. If you need both, call the parent hook from within the child:

```tsx
function useSectionButtonOverride(state: ButtonState): void {
  // Apply global overrides first
  useGlobalButtonOverride(state);
  // Then section-specific overrides
  const sectionStyles = useSectionStyles();
  state.root.className = mergeClasses(
    state.root.className,
    sectionStyles.root
  );
}
```

### Building a Design System Layer

A common use case for `customStyleHooks` is building a branded design system on top of Fluent:

```tsx
import {
  FluentProvider,
  webLightTheme,
  makeStyles,
  mergeClasses,
  tokens,
} from '@fluentui/react-components';
import type {
  ButtonState,
  InputState,
  CardState,
} from '@fluentui/react-components';

// Brand-specific overrides
const useBrandButtonStyles = makeStyles({
  root: {
    fontFamily: '"Brand Font", sans-serif',
    borderRadius: tokens.borderRadiusLarge,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontWeight: tokens.fontWeightBold,
  },
  primary: {
    backgroundImage: 'linear-gradient(135deg, var(--colorBrandBackground), var(--colorBrandBackgroundHover))',
  },
});

const useBrandInputStyles = makeStyles({
  root: {
    borderRadius: tokens.borderRadiusLarge,
  },
});

function useBrandButtonOverride(state: ButtonState): void {
  const styles = useBrandButtonStyles();
  state.root.className = mergeClasses(
    state.root.className,
    styles.root,
    state.appearance === 'primary' && styles.primary
  );
}

function useBrandInputOverride(state: InputState): void {
  const styles = useBrandInputStyles();
  state.root.className = mergeClasses(state.root.className, styles.root);
}

// Export a pre-configured provider for the brand
const BrandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <FluentProvider
    theme={webLightTheme}
    customStyleHooks_unstable={{
      useButtonStyles_unstable: useBrandButtonOverride,
      useInputStyles_unstable: useBrandInputOverride,
    }}
  >
    {children}
  </FluentProvider>
);
```

### Accessing Component State for Conditional Styling

The state object passed to custom style hooks contains all resolved props and slot states:

```tsx
function useConditionalButtonOverride(state: ButtonState): void {
  const styles = useConditionalStyles();

  // Access resolved props
  const { appearance, size, disabled, iconOnly } = state;

  state.root.className = mergeClasses(
    state.root.className,
    // Apply based on appearance
    appearance === 'primary' && styles.primary,
    appearance === 'subtle' && styles.subtle,
    // Apply based on size
    size === 'small' && styles.small,
    size === 'large' && styles.large,
    // Apply based on state
    disabled && styles.disabled,
    iconOnly && styles.iconOnly
  );

  // Style individual slots
  if (state.icon) {
    state.icon.className = mergeClasses(
      state.icon.className,
      size === 'large' && styles.largeIcon
    );
  }
}
```

### Full List of Commonly Used Style Hook Keys

```typescript
const customStyleHooks_unstable = {
  // Buttons
  useButtonStyles_unstable: ...,
  useCompoundButtonStyles_unstable: ...,
  useMenuButtonStyles_unstable: ...,
  useSplitButtonStyles_unstable: ...,
  useToggleButtonStyles_unstable: ...,

  // Inputs
  useInputStyles_unstable: ...,
  useTextareaStyles_unstable: ...,
  useSliderStyles_unstable: ...,
  useSpinButtonStyles_unstable: ...,
  useCheckboxStyles_unstable: ...,
  useRadioStyles_unstable: ...,
  useRadioGroupStyles_unstable: ...,
  useSwitchStyles_unstable: ...,
  useComboboxStyles_unstable: ...,
  useDropdownStyles_unstable: ...,
  useOptionStyles_unstable: ...,

  // Content
  useAvatarStyles_unstable: ...,
  useBadgeStyles_unstable: ...,
  useCounterBadgeStyles_unstable: ...,
  usePresenceBadgeStyles_unstable: ...,
  useImageStyles_unstable: ...,
  useTextStyles_unstable: ...,
  useLabelStyles_unstable: ...,
  useDividerStyles_unstable: ...,
  useSkeletonStyles_unstable: ...,

  // Cards
  useCardStyles_unstable: ...,
  useCardHeaderStyles_unstable: ...,
  useCardPreviewStyles_unstable: ...,
  useCardFooterStyles_unstable: ...,

  // Navigation
  useTabListStyles_unstable: ...,
  useTabStyles_unstable: ...,
  useBreadcrumbStyles_unstable: ...,
  useLinkStyles_unstable: ...,

  // Overlays
  useDialogStyles_unstable: ...,
  useDialogSurfaceStyles_unstable: ...,
  usePopoverSurfaceStyles_unstable: ...,
  useTooltipStyles_unstable: ...,
  useDrawerStyles_unstable: ...,

  // Menus
  useMenuStyles_unstable: ...,
  useMenuListStyles_unstable: ...,
  useMenuItemStyles_unstable: ...,
  useMenuPopoverStyles_unstable: ...,

  // Data display
  useTableStyles_unstable: ...,
  useTableRowStyles_unstable: ...,
  useTableCellStyles_unstable: ...,
  useDataGridStyles_unstable: ...,

  // Feedback
  useSpinnerStyles_unstable: ...,
  useProgressBarStyles_unstable: ...,
  useMessageBarStyles_unstable: ...,

  // Layout
  useToolbarStyles_unstable: ...,
  useAccordionStyles_unstable: ...,
};
```

---

## Slot Shorthand Resolution Rules

When a slot value is resolved, the following rules apply:

| Input | Resolution |
|---|---|
| `undefined` (optional slot) | Slot not rendered |
| `null` | Slot explicitly removed |
| `<Element />` (JSX) | Becomes `{ children: <Element /> }` |
| `"string"` | Becomes `{ children: "string" }` |
| `{ children: ..., ...props }` | Used as-is, merged with defaults |
| `{ children: (C, p) => ... }` | Render function called with (Component, mergedProps) |

### Merge Priority

When a slot has both default props (from the component's state hook) and consumer-provided props:

1. Consumer props override default props for the same key
2. `className` values are **not** automatically merged — use `mergeClasses` in state hooks
3. Event handlers are **not** automatically merged — only the consumer's handler is used
4. `ref` is forwarded using React's ref forwarding mechanism
5. `children` from consumer replaces default children entirely

```typescript
// In a state hook:
const state = {
  icon: slot.optional(props.icon, {
    elementType: 'span',
    defaultProps: {
      'aria-hidden': true,        // Default
      className: 'fui-default',   // Default
    },
  }),
};

// Consumer provides:
<Component icon={{ className: 'my-class', onClick: handler }} />

// Resolved slot props:
{
  'aria-hidden': true,     // From defaults (not overridden)
  className: 'my-class',  // Consumer wins (replaces default)
  onClick: handler,        // From consumer
}
```

---

## References

- Slots article (Paul Gildea): https://dev.to/paulgildea/using-slots-with-fluent-ui-react-v9-jf1
- Custom variants article (Paul Gildea): https://dev.to/paulgildea/creating-custom-variants-with-fluent-ui-react-v9-26a1
- Slots Storybook docs: https://storybooks.fluentui.dev/react/?path=/docs/concepts-developer-customizing-components-with-slots--docs
- Advanced styling: https://storybooks.fluentui.dev/react/?path=/docs/concepts-developer-advanced-styling-techniques--docs
- Component authoring: https://github.com/microsoft/fluentui/discussions/26689
- Advanced patterns: https://github.com/microsoft/fluentui/discussions/26890
- Headless components issue: https://github.com/microsoft/fluentui/issues/35562
