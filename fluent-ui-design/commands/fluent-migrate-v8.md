---
name: fluent-ui-design:migrate-v8
description: Scan a project for Fluent UI v8 usage and generate a v9 migration plan with component mapping and priority ordering.
argument-hint: "[--scan-only] [--migrate] [--component=<name>]"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Edit
  - Bash
---

# Migrate Fluent UI v8 to v9

Scan a React project for `@fluentui/react` (v8) usage and produce a migration plan
to `@fluentui/react-components` (v9).

## Arguments

- `--scan-only` — Report findings without making changes (default behavior)
- `--migrate` — Apply migration changes (requires `--component`)
- `--component=<name>` — Target a specific v8 component for migration (e.g., `--component=DefaultButton`)

## Workflow

### Step 1: Detect v8 Imports

Search for all files importing from `@fluentui/react`:

```
Grep pattern: from ['"]@fluentui/react['"/]
File types: ts, tsx, js, jsx
```

Also search for:
- `@fluentui/react-icons-mdl2` — v8 icon font package
- `@fluentui/react/lib/` — Deep imports (v8 pattern)
- `initializeIcons` — v8 icon initialization
- `mergeStyleSets` / `mergeStyles` — v8 styling API
- `ThemeProvider` / `Fabric` — v8 root wrappers
- `ITheme` / `useTheme` / `getTheme` — v8 theme access

### Step 2: Map v8 Components to v9 Equivalents

For each imported v8 component, map to its v9 equivalent:

| v8 Component | v9 Component | Complexity |
|---|---|---|
| `DefaultButton` | `Button` | Low |
| `PrimaryButton` | `Button appearance="primary"` | Low |
| `ActionButton` | `Button appearance="transparent"` | Low |
| `IconButton` | `Button icon={...}` | Low |
| `CompoundButton` | `CompoundButton` | Low |
| `CommandBarButton` | `Button appearance="transparent"` | Low |
| `SplitButton` | `SplitButton` | Medium |
| `MenuButton` | `MenuButton` | Medium |
| `Link` | `Link` | Low |
| `TextField` | `Input` or `Textarea` | Low |
| `Checkbox` | `Checkbox` | Low |
| `ChoiceGroup` | `RadioGroup` + `Radio` | Medium |
| `Toggle` | `Switch` | Low |
| `Dropdown` | `Dropdown` + `Option` | Medium |
| `ComboBox` | `Combobox` + `Option` | Medium |
| `SpinButton` | `SpinButton` | Low |
| `Slider` | `Slider` | Low |
| `Label` | `Label` | Low |
| `Text` | `Text` / `Body1` / `Title1` etc. | Low |
| `Image` | `Image` | Low |
| `Separator` | `Divider` | Low |
| `Spinner` | `Spinner` | Low |
| `ProgressIndicator` | `ProgressBar` | Low |
| `Icon` | Individual SVG imports | Low |
| `Persona` | `Avatar` + text | Medium |
| `PersonaCoin` | `Avatar` | Low |
| `Facepile` | `AvatarGroup` | Medium |
| `Pivot` / `PivotItem` | `TabList` + `Tab` | Medium |
| `Breadcrumb` | `Breadcrumb` + `BreadcrumbItem` | Medium |
| `CommandBar` | `Toolbar` | Medium |
| `Nav` | `NavDrawer` + `NavItem` | Medium |
| `Stack` | CSS Flexbox/Grid | Medium |
| `MessageBar` | `MessageBar` + slots | Medium |
| `Badge` | `Badge` / `CounterBadge` / `PresenceBadge` | Medium |
| `Shimmer` | `Skeleton` + `SkeletonItem` | Medium |
| `Dialog` | `Dialog` + `DialogSurface` + slots | High |
| `Modal` | `Dialog modalType="modal"` | High |
| `Panel` | `Drawer` / `OverlayDrawer` | High |
| `Callout` | `Popover` + `PopoverSurface` | High |
| `ContextualMenu` | `Menu` + `MenuTrigger` + slots | High |
| `DetailsList` | `DataGrid` + slots | Very High |
| `GroupedList` | `Tree` / `FlatTree` | Very High |
| `DatePicker` | `DatePicker` (compat package) | Medium |
| `FocusZone` | `useArrowNavigationGroup` hook | Medium |
| `FocusTrapZone` | `useModalAttributes` hook | Medium |
| `ThemeProvider` | `FluentProvider` | Medium |
| `Fabric` | `FluentProvider` | Medium |

### Step 3: Identify Styling Patterns to Migrate

Search for v8 styling patterns:

1. **`mergeStyleSets`** — Replace with `makeStyles`
2. **`mergeStyles`** — Replace with `makeStyles` + `mergeClasses`
3. **`getTheme()`** — Replace with `tokens.*` in `makeStyles`
4. **`useTheme()`** — Replace with `tokens.*` in `makeStyles`
5. **`theme.palette.*`** — Map to `tokens.color*`
6. **`theme.semanticColors.*`** — Map to `tokens.color*`
7. **`theme.fonts.*`** — Map to `tokens.fontSize*` / `tokens.fontWeight*`
8. **`theme.effects.*`** — Map to `tokens.shadow*`
9. **`selectors: { ':hover': ... }`** — Flatten to `':hover': { ... }`
10. **`IStyle`** — Remove; `makeStyles` uses `GriffelStyle`

### Step 4: Generate Prioritized Migration Plan

Sort components by migration priority:

**Priority 1 (Low risk, high impact):**
- Icons (`Icon` to SVG imports)
- Typography (`Text` variants)
- Simple buttons (`DefaultButton`, `PrimaryButton`)
- Labels, Links, Images

**Priority 2 (Medium risk):**
- Form inputs (`TextField` to `Input`, `Checkbox`, `Toggle` to `Switch`)
- Layout (`Stack` to CSS Flexbox)
- Feedback (`MessageBar`, `Spinner`, `ProgressIndicator`)
- Navigation (`Pivot` to `TabList`, `Breadcrumb`)

**Priority 3 (High risk):**
- Overlays (`Dialog`, `Panel` to `Drawer`, `Callout` to `Popover`)
- Menus (`ContextualMenu` to `Menu`)
- Complex forms (`Dropdown`, `ComboBox`)
- Persona/Avatar

**Priority 4 (Very high risk):**
- Data grids (`DetailsList` to `DataGrid`)
- Grouped lists
- Custom theme-dependent components

### Step 5: Apply Migration (if --migrate flag set)

When `--migrate` is specified with `--component=<name>`:

1. **Find all files** using the specified v8 component
2. **Update imports:**
   - Remove the v8 import from `@fluentui/react`
   - Add the v9 import from `@fluentui/react-components`
3. **Update JSX:**
   - Replace component name (e.g., `<DefaultButton>` to `<Button>`)
   - Map props (e.g., `text=` to `children`, `iconProps=` to `icon=`)
   - Add required props (e.g., `appearance="primary"` for PrimaryButton)
4. **Update styling:**
   - Replace `mergeStyleSets` with `makeStyles` where possible
   - Map theme references to tokens
5. **Verify** the file still compiles (run `tsc --noEmit` if available)

### Step 6: Generate Report

Output format:

```
FLUENT UI v8 MIGRATION REPORT
==============================

Summary
-------
Files with v8 imports: X
Total v8 components found: Y
Estimated migration effort: Z hours

Components Found
-----------------
| Component | Files | Occurrences | v9 Equivalent | Complexity |
|---|---|---|---|---|
| DefaultButton | 12 | 28 | Button | Low |
| DetailsList | 3 | 5 | DataGrid | Very High |
| ...

Styling Patterns Found
-----------------------
| Pattern | Files | Occurrences |
|---|---|---|
| mergeStyleSets | 15 | 15 |
| theme.palette.* | 8 | 23 |
| ...

Recommended Migration Order
----------------------------
1. Phase 1 (Week 1-2): Icons, Typography, Buttons — X files
2. Phase 2 (Week 3-4): Form inputs, Layout — X files
3. Phase 3 (Week 5-6): Navigation, Feedback — X files
4. Phase 4 (Week 7-8): Overlays, Menus — X files
5. Phase 5 (Week 9+): Data grids, Complex components — X files

Prerequisites
--------------
- [ ] Install @fluentui/react-components
- [ ] Install @fluentui/react-icons
- [ ] Set up FluentProvider with matching theme
- [ ] Configure v8/v9 coexistence at app root
```

## Prop Mapping Reference

### Button Props

| v8 Prop | v9 Prop |
|---|---|
| `text` | `children` (JSX content) |
| `iconProps={{ iconName: 'Add' }}` | `icon={<AddRegular />}` |
| `onClick` | `onClick` (same) |
| `disabled` | `disabled` (same) |
| `primary` (PrimaryButton) | `appearance="primary"` |
| `checked` (ToggleButton) | `checked` (same) |
| `menuProps` | Compose with `Menu` + `MenuTrigger` |
| `split` | Use `SplitButton` component |
| `href` | `as="a" href="..."` |
| `styles` | `className` with `makeStyles` |
| `theme` | Inherited from `FluentProvider` |

### TextField / Input Props

| v8 Prop | v9 Prop |
|---|---|
| `label` | Use separate `<Label>` component |
| `value` | `value` (same) |
| `defaultValue` | `defaultValue` (same) |
| `onChange={(e, value) => ...}` | `onChange={(e, data) => data.value}` |
| `errorMessage` | Use separate error `<Text>` with `aria-errormessage` |
| `description` | Not built-in; add as sibling text |
| `prefix` | `contentBefore` slot |
| `suffix` | `contentAfter` slot |
| `multiline` | Use `<Textarea>` instead |
| `type` | `type` (same) |
| `disabled` | `disabled` (same) |
| `readOnly` | `readOnly` (same) |
| `placeholder` | `placeholder` (same) |
| `styles` | `className` with `makeStyles` |

### Dropdown Props

| v8 Prop | v9 Prop |
|---|---|
| `options` | Child `<Option>` components |
| `selectedKey` | `value` / `selectedOptions` |
| `defaultSelectedKey` | `defaultValue` / `defaultSelectedOptions` |
| `onChange={(e, option) => ...}` | `onOptionSelect={(e, data) => data.optionValue}` |
| `multiSelect` | `multiselect` |
| `placeholder` | `placeholder` (same) |
| `label` | Use separate `<Label>` component |
| `disabled` | `disabled` (same) |
| `styles` | `className` with `makeStyles` |

### Dialog Props

| v8 Prop | v9 Prop |
|---|---|
| `hidden` | `open` (inverted logic) |
| `onDismiss` | `onOpenChange={(e, data) => !data.open && ...}` |
| `dialogContentProps.title` | `<DialogTitle>` component |
| `dialogContentProps.subText` | `<DialogContent>` children |
| `dialogContentProps.type` | `modalType` on `<Dialog>` |
| `minWidth` | Style on `<DialogSurface>` |
| `maxWidth` | Style on `<DialogSurface>` |
| `isBlocking` | `modalType="alert"` |
| `styles` | `className` on `<DialogSurface>` |

## Effort Estimation Guide

| Complexity | Estimated Time Per Instance | Description |
|---|---|---|
| Low | 5 minutes | Direct rename, minimal prop changes |
| Medium | 15-30 minutes | API changes, composition pattern updates |
| High | 30-60 minutes | Significant restructuring, new composition patterns |
| Very High | 1-4 hours | Complete rewrite (e.g., DetailsList to DataGrid) |

## Notes

- Always test migrated components in both light and dark themes
- Verify keyboard navigation after migration (v9 may handle focus differently)
- Check accessibility — run axe-core or similar after migration
- If using custom themes, ensure the v9 theme matches the v8 brand colors
- Consider creating a shared `useAppStyles` hook for common patterns to avoid duplication during migration
