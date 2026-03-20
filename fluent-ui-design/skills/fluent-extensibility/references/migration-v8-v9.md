# Fluent UI v8 to v9 Migration — Complete Reference

## Complete Component Mapping Table

### Buttons

| v8 Component | v9 Component | Import | Notes |
|---|---|---|---|
| `DefaultButton` | `Button` | `@fluentui/react-components` | `appearance="secondary"` (default) |
| `PrimaryButton` | `Button` | `@fluentui/react-components` | `appearance="primary"` |
| `ActionButton` | `Button` | `@fluentui/react-components` | `appearance="transparent"` |
| `CommandBarButton` | `Button` | `@fluentui/react-components` | `appearance="transparent"` |
| `IconButton` | `Button` | `@fluentui/react-components` | Pass `icon` only, no `children` |
| `CompoundButton` | `CompoundButton` | `@fluentui/react-components` | Uses `secondaryContent` slot |
| `SplitButton` | `SplitButton` | `@fluentui/react-components` | Composed with `Menu` |
| `CommandButton` | `Button` | `@fluentui/react-components` | `appearance="transparent"` |
| `MessageBarButton` | `Button` | `@fluentui/react-components` | Use within `MessageBarActions` |

### Form Controls

| v8 Component | v9 Component | Import | Notes |
|---|---|---|---|
| `TextField` | `Input` | `@fluentui/react-components` | Single-line text input |
| `TextField multiline` | `Textarea` | `@fluentui/react-components` | Multi-line text input |
| `MaskedTextField` | `Input` | `@fluentui/react-components` | Use `contentBefore`/`contentAfter` for masks |
| `Checkbox` | `Checkbox` | `@fluentui/react-components` | Direct equivalent |
| `ChoiceGroup` | `RadioGroup` + `Radio` | `@fluentui/react-components` | Renamed |
| `Toggle` | `Switch` | `@fluentui/react-components` | Renamed |
| `Dropdown` | `Dropdown` + `Option` | `@fluentui/react-components` | Composition pattern |
| `ComboBox` | `Combobox` + `Option` | `@fluentui/react-components` | Note lowercase 'b' |
| `SpinButton` | `SpinButton` | `@fluentui/react-components` | Direct equivalent |
| `Slider` | `Slider` | `@fluentui/react-components` | Direct equivalent |
| `Rating` | `Rating` | `@fluentui/react-components` | Direct equivalent |
| `SearchBox` | `SearchBox` | `@fluentui/react-search` | Separate package |
| `DatePicker` | `DatePicker` | `@fluentui/react-datepicker-compat` | Compat package |
| `TimePicker` | `TimePicker` | `@fluentui/react-timepicker-compat` | Compat package |
| `ColorPicker` | `ColorPicker` | `@fluentui/react-color-picker-preview` | Preview package |
| `SwatchColorPicker` | `SwatchPicker` | `@fluentui/react-components` | Renamed |

### Layout and Structure

| v8 Component | v9 Component | Import | Notes |
|---|---|---|---|
| `Stack` | *Removed* | N/A | Use CSS Flexbox/Grid |
| `Stack.Item` | *Removed* | N/A | Use CSS flex properties |
| `Separator` | `Divider` | `@fluentui/react-components` | Renamed |
| `Fabric` | `FluentProvider` | `@fluentui/react-components` | Root wrapper |
| `ThemeProvider` | `FluentProvider` | `@fluentui/react-components` | Theme + config |
| `Layer` | *Not needed* | N/A | Portals handled internally |
| `ScrollablePane` | *Removed* | N/A | Use CSS overflow |

### Navigation

| v8 Component | v9 Component | Import | Notes |
|---|---|---|---|
| `Pivot` / `PivotItem` | `TabList` + `Tab` | `@fluentui/react-components` | Renamed |
| `Nav` / `NavLink` | `NavDrawer` / `NavItem` | `@fluentui/react-nav-preview` | Redesigned |
| `Breadcrumb` | `Breadcrumb` + `BreadcrumbItem` + `BreadcrumbButton` | `@fluentui/react-components` | Decomposed |
| `CommandBar` | `Toolbar` + `ToolbarButton` | `@fluentui/react-components` | Renamed |
| `OverflowSet` | `Overflow` + `OverflowItem` | `@fluentui/react-components` | Redesigned |
| `Link` | `Link` | `@fluentui/react-components` | Direct equivalent |

### Overlays and Surfaces

| v8 Component | v9 Component | Import | Notes |
|---|---|---|---|
| `Dialog` | `Dialog` + `DialogSurface` + `DialogBody` + `DialogTitle` + `DialogContent` + `DialogActions` | `@fluentui/react-components` | Fully decomposed |
| `Modal` | `Dialog` | `@fluentui/react-components` | `modalType="modal"` |
| `Panel` | `Drawer` / `OverlayDrawer` / `InlineDrawer` | `@fluentui/react-components` | Redesigned |
| `Callout` | `Popover` + `PopoverSurface` | `@fluentui/react-components` | Renamed |
| `TeachingBubble` | `TeachingPopover` | `@fluentui/react-teaching-popover-preview` | Preview |
| `Tooltip` / `TooltipHost` | `Tooltip` | `@fluentui/react-components` | Simplified |
| `Coachmark` | *No direct equivalent* | N/A | Use `TeachingPopover` |

### Menus

| v8 Component | v9 Component | Import | Notes |
|---|---|---|---|
| `ContextualMenu` | `Menu` + `MenuTrigger` + `MenuPopover` + `MenuList` + `MenuItem` | `@fluentui/react-components` | Fully decomposed |
| `ContextualMenuItem` | `MenuItem` | `@fluentui/react-components` | |
| `ContextualMenuItemType.Divider` | `MenuDivider` | `@fluentui/react-components` | |
| `ContextualMenuItemType.Header` | `MenuGroupHeader` | `@fluentui/react-components` | |
| `ContextualMenuItemType.Section` | `MenuGroup` | `@fluentui/react-components` | |

### Content Display

| v8 Component | v9 Component | Import | Notes |
|---|---|---|---|
| `Text` | `Text` | `@fluentui/react-components` | Direct equivalent |
| `Label` | `Label` | `@fluentui/react-components` | Direct equivalent |
| `Image` | `Image` | `@fluentui/react-components` | Direct equivalent |
| `Icon` | SVG imports | `@fluentui/react-icons` | Individual icon imports |
| `FontIcon` | SVG imports | `@fluentui/react-icons` | No more icon fonts |
| `Persona` | `Avatar` + text | `@fluentui/react-components` | Split |
| `PersonaCoin` | `Avatar` | `@fluentui/react-components` | Renamed |
| `Facepile` | `AvatarGroup` | `@fluentui/react-components` | Renamed |
| `Badge` (via Persona) | `Badge` / `CounterBadge` / `PresenceBadge` | `@fluentui/react-components` | Split |

### Data Display

| v8 Component | v9 Component | Import | Notes |
|---|---|---|---|
| `DetailsList` | `DataGrid` + `DataGridHeader` + `DataGridBody` + `DataGridRow` + `DataGridCell` | `@fluentui/react-components` | Complete rewrite |
| `GroupedList` | `Tree` / `FlatTree` | `@fluentui/react-components` | Different API |
| `List` | *Use virtualization libraries* | N/A | Use `react-window` or similar |
| `Shimmer` | `Skeleton` + `SkeletonItem` | `@fluentui/react-components` | Renamed |

### Feedback and Status

| v8 Component | v9 Component | Import | Notes |
|---|---|---|---|
| `MessageBar` | `MessageBar` + `MessageBarBody` + `MessageBarTitle` + `MessageBarActions` | `@fluentui/react-components` | Decomposed |
| `Spinner` | `Spinner` | `@fluentui/react-components` | Direct equivalent |
| `ProgressIndicator` | `ProgressBar` | `@fluentui/react-components` | Renamed |
| `Announced` | *Removed* | N/A | Use `aria-live` regions |

### Pickers

| v8 Component | v9 Component | Import | Notes |
|---|---|---|---|
| `TagPicker` | `TagPicker` | `@fluentui/react-tag-picker-preview` | Preview |
| `PeoplePicker` | *Compose with Combobox* | N/A | Build with `Combobox` + `Avatar` |
| `ColorPicker` | `ColorPicker` | `@fluentui/react-color-picker-preview` | Preview |

### Other

| v8 Component | v9 Component | Import | Notes |
|---|---|---|---|
| `Accordion` | `Accordion` + `AccordionItem` + `AccordionHeader` + `AccordionPanel` | `@fluentui/react-components` | Decomposed |
| `Calendar` | `Calendar` | `@fluentui/react-calendar-compat` | Compat package |
| `ResizeGroup` | `Overflow` | `@fluentui/react-components` | Different approach |
| `FocusZone` | `useFocusableGroup` / `useArrowNavigationGroup` / `useFocusFinders` | `@fluentui/react-components` | Hooks-based |
| `FocusTrapZone` | `useModalAttributes` / `Dialog` | `@fluentui/react-components` | Built into overlays |
| `Keytips` | *Not yet available* | N/A | |

---

## Import Path Mapping

### Package Changes

| v8 Import | v9 Import |
|---|---|
| `@fluentui/react` | `@fluentui/react-components` |
| `@fluentui/react/lib/Button` | `@fluentui/react-components` (all from umbrella) |
| `@fluentui/react-icons-mdl2` | `@fluentui/react-icons` |
| `@fluentui/react/lib/Icons` | *Not needed* (icons are direct imports) |
| `@fluentui/react/lib/Styling` | `@fluentui/react-components` (makeStyles, tokens) |
| `@fluentui/react/lib/Utilities` | Various hooks from `@fluentui/react-components` |
| `@fluentui/react-hooks` | React standard hooks + Fluent-specific hooks |

### Import Pattern Changes

```tsx
// v8 — Named imports from monolith
import {
  DefaultButton,
  PrimaryButton,
  TextField,
  Dropdown,
  IDropdownOption,
  Stack,
  Text,
  ThemeProvider,
  mergeStyleSets,
  getTheme,
} from '@fluentui/react';
import { initializeIcons } from '@fluentui/react/lib/Icons';

// v9 — Named imports from umbrella package
import {
  Button,
  Input,
  Dropdown,
  Option,
  Text,
  FluentProvider,
  webLightTheme,
  webDarkTheme,
  makeStyles,
  mergeClasses,
  tokens,
} from '@fluentui/react-components';

// v9 — Icons are individual tree-shakeable imports
import {
  AddRegular,
  DeleteRegular,
  EditRegular,
  SearchRegular,
  SettingsRegular,
  ChevronDownRegular,
} from '@fluentui/react-icons';
```

### Icon Migration

```tsx
// v8 — Icon font with name strings
import { Icon } from '@fluentui/react';
<Icon iconName="Add" />
<Icon iconName="Delete" />
<Icon iconName="Settings" />

// v8 — Requires initialization
import { initializeIcons } from '@fluentui/react/lib/Icons';
initializeIcons();

// v9 — Direct SVG imports (no initialization needed)
import { AddRegular, DeleteRegular, SettingsRegular } from '@fluentui/react-icons';
<AddRegular />
<DeleteRegular />
<SettingsRegular />

// v9 icon variants: Regular (outline) and Filled
import { HeartRegular, HeartFilled } from '@fluentui/react-icons';

// v9 icon sizing
import { AddRegular } from '@fluentui/react-icons';
<AddRegular fontSize={24} />
// Or use bundleIcon for filled/regular toggle:
import { bundleIcon, HeartFilled, HeartRegular } from '@fluentui/react-icons';
const HeartIcon = bundleIcon(HeartFilled, HeartRegular);
```

### Common v8 Icon Name to v9 Icon Name

| v8 `iconName` | v9 Import |
|---|---|
| `Add` | `AddRegular` |
| `Cancel` | `DismissRegular` |
| `Delete` | `DeleteRegular` |
| `Edit` | `EditRegular` |
| `Search` | `SearchRegular` |
| `Settings` | `SettingsRegular` |
| `ChevronDown` | `ChevronDownRegular` |
| `ChevronRight` | `ChevronRightRegular` |
| `ChevronUp` | `ChevronUpRegular` |
| `Info` | `InfoRegular` |
| `Warning` | `WarningRegular` |
| `Error` / `ErrorBadge` | `ErrorCircleRegular` |
| `CheckMark` | `CheckmarkRegular` |
| `Copy` | `CopyRegular` |
| `Save` | `SaveRegular` |
| `Mail` | `MailRegular` |
| `Calendar` | `CalendarRegular` |
| `People` | `PeopleRegular` |
| `Person` | `PersonRegular` |
| `Home` | `HomeRegular` |
| `Filter` | `FilterRegular` |
| `Sort` | `ArrowSortRegular` |
| `Refresh` | `ArrowClockwiseRegular` |
| `Download` | `ArrowDownloadRegular` |
| `Upload` | `ArrowUploadRegular` |
| `Share` | `ShareRegular` |
| `More` / `MoreVertical` | `MoreVerticalRegular` |
| `MoreHorizontal` | `MoreHorizontalRegular` |

---

## Theme Token Mapping

### v8 ISemanticColors to v9 Tokens

#### Background Tokens

| v8 `semanticColors.*` | v9 `tokens.*` |
|---|---|
| `bodyBackground` | `colorNeutralBackground1` |
| `bodyBackgroundHovered` | `colorNeutralBackground1Hover` |
| `bodyBackgroundChecked` | `colorNeutralBackground1Selected` |
| `bodyStandoutBackground` | `colorNeutralBackground2` |
| `bodyFrameBackground` | `colorNeutralBackground3` |
| `bodyFrameDivider` | `colorNeutralStroke2` |
| `defaultStateBackground` | `colorNeutralBackground1` |
| `disabledBackground` | `colorNeutralBackgroundDisabled` |
| `accentButtonBackground` | `colorBrandBackground` |
| `buttonBackground` | `colorNeutralBackground1` |
| `buttonBackgroundHovered` | `colorNeutralBackground1Hover` |
| `buttonBackgroundPressed` | `colorNeutralBackground1Pressed` |
| `buttonBackgroundDisabled` | `colorNeutralBackgroundDisabled` |
| `primaryButtonBackground` | `colorBrandBackground` |
| `primaryButtonBackgroundHovered` | `colorBrandBackgroundHover` |
| `primaryButtonBackgroundPressed` | `colorBrandBackgroundPressed` |
| `primaryButtonBackgroundDisabled` | `colorNeutralBackgroundDisabled` |
| `inputBackground` | `colorNeutralBackground1` |
| `inputBackgroundChecked` | `colorCompoundBrandBackground` |
| `inputBackgroundCheckedHovered` | `colorCompoundBrandBackgroundHover` |
| `menuBackground` | `colorNeutralBackground1` |
| `menuItemBackgroundHovered` | `colorNeutralBackground1Hover` |
| `menuItemBackgroundPressed` | `colorNeutralBackground1Pressed` |
| `listBackground` | `colorNeutralBackground1` |
| `listItemBackgroundHovered` | `colorNeutralBackground1Hover` |
| `listItemBackgroundChecked` | `colorNeutralBackground1Selected` |
| `listItemBackgroundCheckedHovered` | `colorNeutralBackground1Selected` |
| `listHeaderBackgroundHovered` | `colorNeutralBackground1Hover` |
| `listHeaderBackgroundPressed` | `colorNeutralBackground1Pressed` |
| `errorBackground` | `colorPaletteRedBackground1` |
| `warningBackground` | `colorPaletteYellowBackground1` |
| `successBackground` | `colorPaletteGreenBackground1` |

#### Foreground/Text Tokens

| v8 `semanticColors.*` | v9 `tokens.*` |
|---|---|
| `bodyText` | `colorNeutralForeground1` |
| `bodySubtext` | `colorNeutralForeground2` |
| `bodyTextChecked` | `colorNeutralForeground1Selected` |
| `disabledText` | `colorNeutralForegroundDisabled` |
| `disabledSubtext` | `colorNeutralForegroundDisabled` |
| `actionLink` | `colorBrandForegroundLink` |
| `actionLinkHovered` | `colorBrandForegroundLinkHover` |
| `link` | `colorBrandForegroundLink` |
| `linkHovered` | `colorBrandForegroundLinkHover` |
| `buttonText` | `colorNeutralForeground1` |
| `buttonTextHovered` | `colorNeutralForeground1Hover` |
| `buttonTextPressed` | `colorNeutralForeground1Pressed` |
| `buttonTextDisabled` | `colorNeutralForegroundDisabled` |
| `primaryButtonText` | `colorNeutralForegroundOnBrand` |
| `primaryButtonTextHovered` | `colorNeutralForegroundOnBrand` |
| `primaryButtonTextPressed` | `colorNeutralForegroundOnBrand` |
| `primaryButtonTextDisabled` | `colorNeutralForegroundDisabled` |
| `inputText` | `colorNeutralForeground1` |
| `inputTextHovered` | `colorNeutralForeground1Hover` |
| `inputPlaceholderText` | `colorNeutralForeground4` |
| `menuItemText` | `colorNeutralForeground1` |
| `menuItemTextHovered` | `colorNeutralForeground1Hover` |
| `errorText` | `colorPaletteRedForeground1` |
| `warningText` | `colorPaletteYellowForeground2` |
| `successText` | `colorPaletteGreenForeground1` |

#### Border/Stroke Tokens

| v8 `semanticColors.*` | v9 `tokens.*` |
|---|---|
| `inputBorder` | `colorNeutralStroke1` |
| `inputBorderHovered` | `colorNeutralStroke1Hover` |
| `inputFocusBorderAlt` | `colorCompoundBrandStroke` |
| `buttonBorder` | `colorNeutralStroke1` |
| `buttonBorderDisabled` | `colorNeutralStrokeDisabled` |
| `primaryButtonBorder` | `transparent` |
| `focusBorder` | `colorStrokeFocus2` |
| `menuDivider` | `colorNeutralStroke2` |
| `variantBorder` | `colorNeutralStroke1` |
| `variantBorderHovered` | `colorNeutralStroke1Hover` |
| `errorBorder` | `colorPaletteRedBorder1` |

### v8 IPalette to v9 Tokens

| v8 `palette.*` | v9 `tokens.*` |
|---|---|
| `themePrimary` | `colorBrandBackground` |
| `themeDarkAlt` | `colorBrandBackgroundHover` |
| `themeDark` | `colorBrandBackgroundPressed` |
| `themeDarker` | `colorBrandBackground2Pressed` |
| `themeLight` | `colorBrandBackground2` |
| `themeLighter` | `colorBrandBackground2Hover` |
| `themeLighterAlt` | `colorBrandBackgroundInverted` |
| `neutralPrimary` | `colorNeutralForeground1` |
| `neutralPrimaryAlt` | `colorNeutralForeground2` |
| `neutralSecondary` | `colorNeutralForeground2` |
| `neutralSecondaryAlt` | `colorNeutralForeground3` |
| `neutralTertiary` | `colorNeutralForeground3` |
| `neutralTertiaryAlt` | `colorNeutralForeground4` |
| `neutralLight` | `colorNeutralBackground4` |
| `neutralLighter` | `colorNeutralBackground3` |
| `neutralLighterAlt` | `colorNeutralBackground2` |
| `white` | `colorNeutralBackground1` |
| `black` | `colorNeutralForeground1` |

---

## Styling Migration Examples

### Example 1: Simple Component Styles

```tsx
// ===== v8 =====
import { mergeStyleSets, getTheme } from '@fluentui/react';

const theme = getTheme();

const classNames = mergeStyleSets({
  container: {
    display: 'flex',
    flexDirection: 'column',
    padding: '16px',
    backgroundColor: theme.palette.white,
    borderRadius: '4px',
    boxShadow: theme.effects.elevation4,
  },
  header: {
    fontSize: theme.fonts.xLarge.fontSize,
    fontWeight: theme.fonts.xLarge.fontWeight,
    color: theme.palette.neutralPrimary,
    marginBottom: '8px',
  },
  body: {
    fontSize: theme.fonts.medium.fontSize,
    color: theme.palette.neutralSecondary,
  },
});

// Usage
<div className={classNames.container}>
  <div className={classNames.header}>Title</div>
  <div className={classNames.body}>Content</div>
</div>

// ===== v9 =====
import { makeStyles, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    padding: tokens.spacingHorizontalL,
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    boxShadow: tokens.shadow4,
  },
  header: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    marginBottom: tokens.spacingVerticalS,
  },
  body: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground2,
  },
});

// Usage (inside a component)
const MyComponent = () => {
  const styles = useStyles();
  return (
    <div className={styles.container}>
      <div className={styles.header}>Title</div>
      <div className={styles.body}>Content</div>
    </div>
  );
};
```

### Example 2: Conditional and State-Based Styles

```tsx
// ===== v8 =====
import { mergeStyleSets, mergeStyles, IStyle } from '@fluentui/react';

const classNames = mergeStyleSets({
  button: {
    padding: '8px 16px',
    border: '1px solid #ccc',
    cursor: 'pointer',
    selectors: {
      ':hover': {
        backgroundColor: '#f0f0f0',
      },
      ':active': {
        backgroundColor: '#e0e0e0',
      },
      ':focus': {
        outline: '2px solid #0078d4',
        outlineOffset: '2px',
      },
      '&.is-disabled': {
        opacity: 0.5,
        cursor: 'not-allowed',
      },
    },
  } as IStyle,
});

// Conditional class
const activeClass = mergeStyles({
  backgroundColor: '#0078d4',
  color: '#fff',
});

<div className={`${classNames.button} ${isActive ? activeClass : ''}`}>
  Click me
</div>

// ===== v9 =====
import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  button: {
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL}`,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    cursor: 'pointer',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
    ':active': {
      backgroundColor: tokens.colorNeutralBackground1Pressed,
    },
    ':focus-visible': {
      outlineColor: tokens.colorStrokeFocus2,
      outlineWidth: tokens.strokeWidthThick,
      outlineStyle: 'solid',
      outlineOffset: '2px',
    },
  },
  disabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  active: {
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
  },
});

// Usage
const MyButton = ({ isActive, disabled }: { isActive: boolean; disabled: boolean }) => {
  const styles = useStyles();
  return (
    <div
      className={mergeClasses(
        styles.button,
        isActive && styles.active,
        disabled && styles.disabled
      )}
    >
      Click me
    </div>
  );
};
```

### Example 3: Theme-Dependent Styles

```tsx
// ===== v8 =====
import { mergeStyleSets, useTheme } from '@fluentui/react';

const MyComponent = () => {
  const theme = useTheme();

  const classNames = mergeStyleSets({
    card: {
      backgroundColor: theme.semanticColors.bodyBackground,
      color: theme.semanticColors.bodyText,
      border: `1px solid ${theme.semanticColors.variantBorder}`,
      padding: '16px',
      borderRadius: '8px',
    },
  });

  return <div className={classNames.card}>Card content</div>;
};

// ===== v9 =====
import { makeStyles, tokens } from '@fluentui/react-components';

// Styles are defined OUTSIDE the component — tokens resolve at render time via CSS vars
const useStyles = makeStyles({
  card: {
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    padding: tokens.spacingHorizontalL,
    borderRadius: tokens.borderRadiusXLarge,
  },
});

const MyComponent = () => {
  const styles = useStyles();
  return <div className={styles.card}>Card content</div>;
};
```

---

## Step-by-Step Migration Workflow

### Phase 1: Preparation

1. **Audit current v8 usage**
   ```bash
   # Use the fluent-migrate-v8 command to scan
   /fluent-ui-design:migrate-v8 --scan-only
   ```

2. **Install v9 packages alongside v8**
   ```bash
   npm install @fluentui/react-components @fluentui/react-icons
   ```

3. **Set up coexistence providers**
   ```tsx
   // App.tsx
   import { ThemeProvider } from '@fluentui/react';
   import { FluentProvider, webLightTheme } from '@fluentui/react-components';

   function App() {
     return (
       <ThemeProvider>
         <FluentProvider theme={webLightTheme}>
           <YourApp />
         </FluentProvider>
       </ThemeProvider>
     );
   }
   ```

4. **Create a v9 theme that matches your v8 custom theme**
   ```tsx
   import { createLightTheme, createDarkTheme } from '@fluentui/react-components';
   import type { BrandVariants } from '@fluentui/react-components';

   // Match your v8 brand colors
   const brand: BrandVariants = {
     10: '#020305',
     20: '#111723',
     30: '#16253A',
     40: '#1B324D',
     50: '#204060',
     60: '#254E74',
     70: '#2B5D89',
     80: '#316C9E',  // Primary
     90: '#3A7BB3',
     100: '#478AC6',
     110: '#5A99D1',
     120: '#6FA8DA',
     130: '#85B7E3',
     140: '#9DC6EB',
     150: '#B6D5F2',
     160: '#D0E4F8',
   };

   export const lightTheme = createLightTheme(brand);
   export const darkTheme = createDarkTheme(brand);
   ```

### Phase 2: Incremental Migration

Migrate in this order (lowest risk first):

#### Step 1: Icons
```tsx
// Before
import { Icon } from '@fluentui/react';
<Icon iconName="Add" />

// After
import { AddRegular } from '@fluentui/react-icons';
<AddRegular />
```

#### Step 2: Typography
```tsx
// Before
import { Text } from '@fluentui/react';
<Text variant="xLarge">Title</Text>
<Text variant="medium">Body</Text>

// After
import { Title2, Body1 } from '@fluentui/react-components';
<Title2>Title</Title2>
<Body1>Body</Body1>
```

#### Step 3: Buttons
```tsx
// Before
import { DefaultButton, PrimaryButton, IconButton } from '@fluentui/react';
<DefaultButton text="Cancel" onClick={onCancel} />
<PrimaryButton text="Submit" onClick={onSubmit} />
<IconButton iconProps={{ iconName: 'Delete' }} onClick={onDelete} />

// After
import { Button } from '@fluentui/react-components';
import { DeleteRegular } from '@fluentui/react-icons';
<Button onClick={onCancel}>Cancel</Button>
<Button appearance="primary" onClick={onSubmit}>Submit</Button>
<Button icon={<DeleteRegular />} onClick={onDelete} aria-label="Delete" />
```

#### Step 4: Form Inputs
```tsx
// Before
import { TextField, Dropdown, IDropdownOption, Checkbox } from '@fluentui/react';
<TextField label="Name" value={name} onChange={(e, v) => setName(v || '')} />
<Dropdown
  label="Country"
  options={countries}
  selectedKey={country}
  onChange={(e, option) => setCountry(option?.key as string)}
/>
<Checkbox label="Agree" checked={agreed} onChange={(e, v) => setAgreed(!!v)} />

// After
import { Input, Label, Dropdown, Option, Checkbox } from '@fluentui/react-components';
<div>
  <Label htmlFor="name-input">Name</Label>
  <Input id="name-input" value={name} onChange={(e, data) => setName(data.value)} />
</div>
<div>
  <Label htmlFor="country-dropdown">Country</Label>
  <Dropdown
    id="country-dropdown"
    value={country}
    onOptionSelect={(e, data) => setCountry(data.optionValue || '')}
  >
    {countries.map((c) => (
      <Option key={c.key} value={c.key}>{c.text}</Option>
    ))}
  </Dropdown>
</div>
<Checkbox label="Agree" checked={agreed} onChange={(e, data) => setAgreed(!!data.checked)} />
```

#### Step 5: Layout (Stack Removal)
```tsx
// Before
import { Stack, IStackTokens } from '@fluentui/react';
const stackTokens: IStackTokens = { childrenGap: 16 };
<Stack horizontal tokens={stackTokens}>
  <Stack.Item grow><div>Left</div></Stack.Item>
  <Stack.Item><div>Right</div></Stack.Item>
</Stack>

// After
import { makeStyles, tokens } from '@fluentui/react-components';
const useStyles = makeStyles({
  row: {
    display: 'flex',
    gap: tokens.spacingHorizontalL,
    flexDirection: 'row',
  },
  grow: { flexGrow: 1 },
});

const styles = useStyles();
<div className={styles.row}>
  <div className={styles.grow}>Left</div>
  <div>Right</div>
</div>
```

#### Step 6: Overlays (Dialog, Drawer, Popover)
```tsx
// Before
import { Dialog, DialogType, DialogFooter, PrimaryButton, DefaultButton } from '@fluentui/react';
<Dialog
  hidden={!isOpen}
  onDismiss={onClose}
  dialogContentProps={{ type: DialogType.normal, title: 'Confirm' }}
>
  <p>Are you sure?</p>
  <DialogFooter>
    <PrimaryButton text="Yes" onClick={onConfirm} />
    <DefaultButton text="No" onClick={onClose} />
  </DialogFooter>
</Dialog>

// After
import {
  Dialog, DialogTrigger, DialogSurface, DialogBody,
  DialogTitle, DialogContent, DialogActions, Button,
} from '@fluentui/react-components';
<Dialog open={isOpen} onOpenChange={(e, data) => !data.open && onClose()}>
  <DialogSurface>
    <DialogBody>
      <DialogTitle>Confirm</DialogTitle>
      <DialogContent>Are you sure?</DialogContent>
      <DialogActions>
        <DialogTrigger disableButtonEnhancement>
          <Button appearance="secondary">No</Button>
        </DialogTrigger>
        <Button appearance="primary" onClick={onConfirm}>Yes</Button>
      </DialogActions>
    </DialogBody>
  </DialogSurface>
</Dialog>
```

### Phase 3: Cleanup

1. **Remove v8 dependencies** once all components are migrated:
   ```bash
   npm uninstall @fluentui/react @fluentui/react-icons-mdl2
   ```

2. **Remove `initializeIcons()` call** from app entry point.

3. **Remove `ThemeProvider`** wrapper — `FluentProvider` handles all theming.

4. **Remove v8 type imports** — Replace `IButtonProps` with `ButtonProps`, etc.

5. **Run a final audit:**
   ```bash
   /fluent-ui-design:audit --strict
   ```

---

## Coexistence Strategy for Large Codebases

### Shared Theme Synchronization

When running v8 and v9 side-by-side, keep themes in sync:

```tsx
import { createTheme } from '@fluentui/react';
import { createLightTheme, BrandVariants } from '@fluentui/react-components';

// Define brand colors once
const brandColors = {
  primary: '#0078d4',
  // ...
};

// v8 theme
const v8Theme = createTheme({
  palette: { themePrimary: brandColors.primary },
});

// v9 theme
const brand: BrandVariants = { /* ... matching brand ramp ... */ };
const v9Theme = createLightTheme(brand);

// App root
<ThemeProvider theme={v8Theme}>
  <FluentProvider theme={v9Theme}>
    <App />
  </FluentProvider>
</ThemeProvider>
```

### Feature Flag Migration

Use feature flags to gradually roll out v9 components:

```tsx
const useV9Button = featureFlags.isEnabled('fluent-v9-button');

const ActionButton = useV9Button
  ? React.lazy(() => import('./ButtonV9'))
  : React.lazy(() => import('./ButtonV8'));
```

### Module Boundary Migration

Migrate at module/feature boundaries rather than individual components:

```
src/
  features/
    dashboard/     ← Fully migrated to v9
    settings/      ← Still v8
    profile/       ← Mixed (in progress)
```

### CSS Specificity Conflicts

v8 and v9 use different CSS injection strategies. Common conflicts:

1. **v8 `mergeStyleSets` generates high-specificity rules** — They may override v9's atomic
   classes. Solution: Use `!important` sparingly in v9 overrides, or increase specificity
   with `&&` in Griffel:
   ```tsx
   const useStyles = makeStyles({
     override: {
       '&&': {
         backgroundColor: tokens.colorBrandBackground,
       },
     },
   });
   ```

2. **CSS insertion order** — v8 injects styles into `<head>`, v9 uses Griffel's insertion
   point. Ensure v9's `<style>` tag comes after v8's by controlling `<GriffelRenderer>` placement.

3. **Global resets** — v8's `Fabric` component applies global CSS resets. `FluentProvider`
   does not. Verify that removing `Fabric` does not break layout.

---

## Common Migration Pitfalls and Solutions

### 1. Missing FluentProvider

**Symptom:** v9 components render but have no styles (raw HTML appearance).

**Cause:** `FluentProvider` is not wrapping the component tree.

**Fix:** Ensure `FluentProvider` with a theme is at the app root.

### 2. onChange Signature Changes

**Symptom:** Event handler type errors after migration.

**Cause:** v9 `onChange` handlers use a different signature: `(event, data) => void` instead of `(event, value) => void`.

**Fix:**
```tsx
// v8
<TextField onChange={(e, newValue) => setValue(newValue || '')} />

// v9
<Input onChange={(e, data) => setValue(data.value)} />
```

### 3. Controlled Component Differences

**Symptom:** Components do not update when state changes.

**Cause:** v9 uses stricter controlled/uncontrolled patterns. Some components require `onOptionSelect` instead of `onChange`.

**Fix:** Check the v9 Storybook docs for each component's controlled API.

### 4. Stack Removal Complexity

**Symptom:** Layout breaks after replacing `Stack`.

**Cause:** `Stack` handled alignment, wrap, grow, and gap automatically. CSS Flexbox requires explicit properties.

**Fix:** Map Stack props to CSS:
| Stack prop | CSS equivalent |
|---|---|
| `horizontal` | `flex-direction: row` |
| `verticalFill` | `height: 100%` |
| `grow` | `flex-grow: 1` |
| `tokens.childrenGap` | `gap` |
| `horizontalAlign="center"` | `justify-content: center` |
| `verticalAlign="center"` | `align-items: center` |
| `wrap` | `flex-wrap: wrap` |

### 5. DetailsList to DataGrid

**Symptom:** Cannot find equivalent props in DataGrid.

**Cause:** DataGrid has a fundamentally different API using render props and column definitions.

**Fix:** This requires a full rewrite. Plan for significant effort.

```tsx
// v8 DetailsList
<DetailsList
  items={items}
  columns={columns}
  selectionMode={SelectionMode.multiple}
  onItemInvoked={onItemClick}
/>

// v9 DataGrid
<DataGrid items={items} columns={columnsDef} sortable selectable>
  <DataGridHeader>
    <DataGridRow>
      {({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}
    </DataGridRow>
  </DataGridHeader>
  <DataGridBody<Item>>
    {({ item, rowId }) => (
      <DataGridRow<Item> key={rowId}>
        {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
      </DataGridRow>
    )}
  </DataGridBody>
</DataGrid>
```

### 6. FocusZone Replacement

**Symptom:** Arrow key navigation stops working after removing FocusZone.

**Cause:** v9 replaces `FocusZone` with hooks.

**Fix:**
```tsx
// v8
import { FocusZone, FocusZoneDirection } from '@fluentui/react';
<FocusZone direction={FocusZoneDirection.horizontal}>
  <button>A</button>
  <button>B</button>
</FocusZone>

// v9
import { useArrowNavigationGroup } from '@fluentui/react-components';
const arrowNavAttrs = useArrowNavigationGroup({ axis: 'horizontal' });
<div {...arrowNavAttrs}>
  <button>A</button>
  <button>B</button>
</div>
```

### 7. Theme Access Pattern Change

**Symptom:** `useTheme()` returns undefined or wrong theme.

**Cause:** v9 does not use `useTheme()` from v8. Tokens are CSS custom properties.

**Fix:** In v9, use `tokens.*` in `makeStyles`. For runtime access, use `useFluent_unstable()` or read CSS custom properties.

---

## References

- What's new in v9 (Paul Gildea): https://dev.to/paulgildea/whats-new-with-fluent-ui-react-v9-5h2d
- Architecture doc: https://hackmd.io/@fluentui/HJoyoD1lD
- Theme application: https://github.com/microsoft/fluentui/wiki/How-to-apply-theme-to-Fluent-UI-React-components
- Theming in v9 (video): https://learn.microsoft.com/en-us/shows/fluent-ui-insights/fluent-ui-insights-theming-in-v9
- Storybook: https://react.fluentui.dev/
- GitHub: https://github.com/microsoft/fluentui
