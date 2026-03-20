# Fluent UI Web Components — Complete Component Catalog

> Exhaustive reference for every Fluent UI Web Component: element names, attributes, events, slots,
> CSS parts, code examples, design token CSS custom properties, framework integration recipes, and
> migration guidance from FAST to Fluent Web Components.
>
> **Package:** `@fluentui/web-components`
> **Docs:** https://learn.microsoft.com/en-us/fluent-ui/web-components/components/overview

---

## Table of Contents

1. [Registration & Setup](#registration--setup)
2. [Button](#button)
3. [Anchor](#anchor)
4. [Badge](#badge)
5. [Breadcrumb](#breadcrumb)
6. [Card](#card)
7. [Checkbox](#checkbox)
8. [Combobox](#combobox)
9. [Accordion](#accordion)
10. [DataGrid](#datagrid)
11. [Dialog](#dialog)
12. [Divider](#divider)
13. [Drawer](#drawer)
14. [Field](#field)
15. [Image](#image)
16. [Label](#label)
17. [Link](#link)
18. [Menu](#menu)
19. [MessageBar](#messagebar)
20. [ProgressBar](#progressbar)
21. [Radio & RadioGroup](#radio--radiogroup)
22. [Select](#select)
23. [Slider](#slider)
24. [Spinner](#spinner)
25. [Switch](#switch)
26. [Tabs](#tabs)
27. [Text](#text)
28. [TextField](#textfield)
29. [TextArea](#textarea)
30. [Tooltip](#tooltip)
31. [Design Token CSS Custom Properties](#design-token-css-custom-properties)
32. [Framework Integration Recipes](#framework-integration-recipes)
33. [Migration from FAST to Fluent Web Components](#migration-from-fast-to-fluent-web-components)

---

## Registration & Setup

### Register all components

```js
import { provideFluentDesignSystem, allComponents } from "@fluentui/web-components";
provideFluentDesignSystem().register(allComponents);
```

### Register individual components (recommended for production)

```js
import {
  provideFluentDesignSystem,
  fluentButton,
  fluentCard,
  fluentTextField,
  fluentDataGrid,
  fluentDataGridRow,
  fluentDataGridCell,
} from "@fluentui/web-components";

provideFluentDesignSystem().register(
  fluentButton(),
  fluentCard(),
  fluentTextField(),
  fluentDataGrid(),
  fluentDataGridRow(),
  fluentDataGridCell()
);
```

### Custom prefix

```js
provideFluentDesignSystem({ prefix: "my" }).register(fluentButton());
// Now use <my-button> instead of <fluent-button>
```

---

## Button

**Element:** `<fluent-button>`
**Registration:** `fluentButton()`

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `appearance` | `"accent"` \| `"lightweight"` \| `"neutral"` \| `"outline"` \| `"stealth"` | `"neutral"` | Visual style |
| `disabled` | `boolean` | `false` | Disabled state |
| `autofocus` | `boolean` | `false` | Auto focus on mount |
| `form` | `string` | — | Associated form ID |
| `formaction` | `string` | — | Form submission URL |
| `formmethod` | `string` | — | Form HTTP method |
| `type` | `"button"` \| `"submit"` \| `"reset"` | `"button"` | Button type |
| `name` | `string` | — | Form data name |
| `value` | `string` | — | Form data value |

### Events

| Event | Detail | Description |
|---|---|---|
| `click` | `MouseEvent` | Standard click event |

### Slots

| Slot | Description |
|---|---|
| (default) | Button text content |
| `start` | Icon or content before text |
| `end` | Icon or content after text |

### CSS Parts

| Part | Description |
|---|---|
| `control` | The button element itself |
| `content` | The text content wrapper |

### Examples

```html
<!-- Basic appearances -->
<fluent-button appearance="accent">Primary Action</fluent-button>
<fluent-button appearance="outline">Secondary</fluent-button>
<fluent-button appearance="stealth">Subtle</fluent-button>
<fluent-button appearance="lightweight">Link-like</fluent-button>

<!-- With icon slot -->
<fluent-button appearance="accent">
  <svg slot="start" width="16" height="16" viewBox="0 0 16 16">
    <path d="M8 1v14M1 8h14" stroke="currentColor" stroke-width="2"/>
  </svg>
  Add Item
</fluent-button>

<!-- Disabled -->
<fluent-button disabled>Cannot Click</fluent-button>

<!-- Submit button in form -->
<form id="myForm">
  <fluent-button type="submit" appearance="accent">Submit</fluent-button>
</form>
```

---

## Anchor

**Element:** `<fluent-anchor>`
**Registration:** `fluentAnchor()`

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `href` | `string` | — | Destination URL |
| `appearance` | `"accent"` \| `"lightweight"` \| `"neutral"` \| `"outline"` \| `"stealth"` \| `"hypertext"` | `"neutral"` | Visual style |
| `target` | `"_self"` \| `"_blank"` \| `"_parent"` \| `"_top"` | — | Link target |
| `download` | `string` | — | Download filename |
| `rel` | `string` | — | Link relationship |
| `hreflang` | `string` | — | Language of linked resource |

### Slots

| Slot | Description |
|---|---|
| (default) | Link text |
| `start` | Content before text |
| `end` | Content after text |

### CSS Parts

| Part | Description |
|---|---|
| `control` | The anchor element |
| `content` | Text wrapper |

### Examples

```html
<fluent-anchor href="https://microsoft.com" appearance="hypertext">
  Microsoft.com
</fluent-anchor>

<fluent-anchor href="/docs" appearance="accent">
  View Documentation
</fluent-anchor>

<fluent-anchor href="/file.pdf" download="report.pdf">
  Download Report
</fluent-anchor>
```

---

## Badge

**Element:** `<fluent-badge>`
**Registration:** `fluentBadge()`

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `appearance` | `"filled"` \| `"ghost"` \| `"outline"` \| `"tint"` | `"filled"` | Visual style |
| `color` | `"brand"` \| `"danger"` \| `"important"` \| `"informative"` \| `"severe"` \| `"subtle"` \| `"success"` \| `"warning"` | `"brand"` | Semantic color |
| `size` | `"tiny"` \| `"extra-small"` \| `"small"` \| `"medium"` \| `"large"` \| `"extra-large"` | `"medium"` | Badge size |
| `shape` | `"circular"` \| `"rounded"` \| `"square"` | `"circular"` | Badge shape |

### Slots

| Slot | Description |
|---|---|
| (default) | Badge content (text, number, icon) |

### CSS Parts

| Part | Description |
|---|---|
| `control` | The badge container |

### Examples

```html
<fluent-badge appearance="filled" color="success">Active</fluent-badge>
<fluent-badge appearance="ghost" color="danger">3 Errors</fluent-badge>
<fluent-badge appearance="outline" color="warning">Pending</fluent-badge>
<fluent-badge appearance="tint" color="informative" shape="rounded">Info</fluent-badge>
<fluent-badge color="important" size="small">!</fluent-badge>
```

---

## Breadcrumb

**Element:** `<fluent-breadcrumb>`, `<fluent-breadcrumb-item>`
**Registration:** `fluentBreadcrumb()`, `fluentBreadcrumbItem()`

### Breadcrumb Attributes

(none — driven by slotted items)

### BreadcrumbItem Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `href` | `string` | — | Navigation URL (omit for current page) |

### Slots (BreadcrumbItem)

| Slot | Description |
|---|---|
| (default) | Item text |
| `separator` | Custom separator (default is `/`) |
| `start` | Content before text |
| `end` | Content after text |

### Examples

```html
<fluent-breadcrumb>
  <fluent-breadcrumb-item href="/">Home</fluent-breadcrumb-item>
  <fluent-breadcrumb-item href="/products">Products</fluent-breadcrumb-item>
  <fluent-breadcrumb-item>Current Page</fluent-breadcrumb-item>
</fluent-breadcrumb>
```

---

## Card

**Element:** `<fluent-card>`
**Registration:** `fluentCard()`

### Attributes

The card is a token-driven container. It does not have specific functional attributes; it
inherits design tokens for `fill-color`, `corner-radius`, `elevation`, etc.

### Slots

| Slot | Description |
|---|---|
| (default) | Card content |

### CSS Parts

| Part | Description |
|---|---|
| `control` | The card container |

### Examples

```html
<fluent-card>
  <h3>Simple Card</h3>
  <p>Card content goes here.</p>
</fluent-card>

<!-- Card with custom token overrides -->
<fluent-card style="--card-width: 400px; padding: 24px;">
  <fluent-badge appearance="filled" color="success">Live</fluent-badge>
  <h3>Server Status</h3>
  <p>All services operational — last checked 2 minutes ago.</p>
  <fluent-button appearance="outline">View Details</fluent-button>
</fluent-card>
```

---

## Checkbox

**Element:** `<fluent-checkbox>`
**Registration:** `fluentCheckbox()`

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `checked` | `boolean` | `false` | Checked state |
| `disabled` | `boolean` | `false` | Disabled state |
| `required` | `boolean` | `false` | Required for form validation |
| `indeterminate` | `boolean` | `false` | Indeterminate state |
| `name` | `string` | — | Form data name |
| `value` | `string` | — | Form data value |

### Events

| Event | Detail | Description |
|---|---|---|
| `change` | — | Fires when checked state changes |

### Slots

| Slot | Description |
|---|---|
| (default) | Label text |
| `checked-indicator` | Custom checked icon |
| `indeterminate-indicator` | Custom indeterminate icon |

### Examples

```html
<fluent-checkbox>Accept terms and conditions</fluent-checkbox>
<fluent-checkbox checked>Remember me</fluent-checkbox>
<fluent-checkbox disabled>Unavailable option</fluent-checkbox>
<fluent-checkbox indeterminate>Select all (partial)</fluent-checkbox>
```

---

## Combobox

**Element:** `<fluent-combobox>`
**Registration:** `fluentCombobox()`

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `autocomplete` | `"none"` \| `"inline"` \| `"list"` \| `"both"` | `"none"` | Autocomplete behavior |
| `disabled` | `boolean` | `false` | Disabled state |
| `placeholder` | `string` | — | Placeholder text |
| `position` | `"above"` \| `"below"` | — | Dropdown position |
| `value` | `string` | — | Current value |
| `open` | `boolean` | `false` | Dropdown open state |

### Events

| Event | Detail | Description |
|---|---|---|
| `change` | — | Fires when selection changes |
| `input` | — | Fires on text input |

### Slots

| Slot | Description |
|---|---|
| (default) | `<fluent-option>` elements |
| `indicator` | Custom dropdown arrow |

### Examples

```html
<fluent-combobox autocomplete="both" placeholder="Select a country">
  <fluent-option value="us">United States</fluent-option>
  <fluent-option value="uk">United Kingdom</fluent-option>
  <fluent-option value="de">Germany</fluent-option>
  <fluent-option value="fr">France</fluent-option>
  <fluent-option value="jp">Japan</fluent-option>
</fluent-combobox>
```

---

## Accordion

**Element:** `<fluent-accordion>`, `<fluent-accordion-item>`
**Registration:** `fluentAccordion()`, `fluentAccordionItem()`

### Accordion Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `expand-mode` | `"single"` \| `"multi"` | `"multi"` | Single or multiple panels open |

### AccordionItem Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `expanded` | `boolean` | `false` | Expanded state |
| `disabled` | `boolean` | `false` | Disabled state |
| `heading-level` | `1`–`6` | `2` | ARIA heading level |

### Events

| Event | Detail | Description |
|---|---|---|
| `change` | — | Fires on expand/collapse |

### Slots (AccordionItem)

| Slot | Description |
|---|---|
| `heading` | Header content (required) |
| (default) | Panel content |
| `start` | Content before heading |
| `end` | Content after heading |
| `expanded-icon` | Custom expanded indicator |
| `collapsed-icon` | Custom collapsed indicator |

### CSS Parts

| Part | Description |
|---|---|
| `heading` | The header button |
| `region` | The content panel |
| `icon` | The expand/collapse indicator |

### Examples

```html
<fluent-accordion expand-mode="single">
  <fluent-accordion-item expanded>
    <span slot="heading">General Settings</span>
    <div>
      <fluent-checkbox checked>Enable notifications</fluent-checkbox>
      <fluent-checkbox>Dark mode</fluent-checkbox>
    </div>
  </fluent-accordion-item>
  <fluent-accordion-item>
    <span slot="heading">Advanced Settings</span>
    <div>
      <fluent-text-field placeholder="API Key"></fluent-text-field>
    </div>
  </fluent-accordion-item>
  <fluent-accordion-item disabled>
    <span slot="heading">Admin Settings (Restricted)</span>
    <div>Admin-only content.</div>
  </fluent-accordion-item>
</fluent-accordion>
```

---

## DataGrid

**Element:** `<fluent-data-grid>`, `<fluent-data-grid-row>`, `<fluent-data-grid-cell>`
**Registration:** `fluentDataGrid()`, `fluentDataGridRow()`, `fluentDataGridCell()`

**Reference:** https://learn.microsoft.com/en-us/fluent-ui/web-components/components/data-grid

### DataGrid Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `generate-header` | `"none"` \| `"default"` \| `"sticky"` | `"default"` | Header generation mode |
| `grid-template-columns` | `string` | `"1fr"` per column | CSS grid column template |
| `no-tabbing` | `boolean` | `false` | Disable cell tabbing |
| `page-size` | `number` | — | Rows per page |
| `row-item-template` | — | — | Custom row template |

### DataGrid Properties (JS only)

| Property | Type | Description |
|---|---|---|
| `rowsData` | `object[]` | Array of row data objects |
| `columnDefinitions` | `ColumnDefinition[]` | Column configuration |

### ColumnDefinition shape

```typescript
interface ColumnDefinition {
  columnDataKey: string;        // Property name in row data
  title: string;                // Header text
  isRowHeader?: boolean;        // First column that acts as row header
  cellTemplate?: (cell, row) => HTMLElement; // Custom cell renderer
  headerCellTemplate?: (cell) => HTMLElement; // Custom header renderer
  cellFocusTargetCallback?: (cell) => HTMLElement; // Focus target
}
```

### DataGridRow Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `row-type` | `"default"` \| `"header"` \| `"sticky-header"` | `"default"` | Row type |
| `grid-template-columns` | `string` | inherited | CSS grid column template |

### DataGridCell Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `cell-type` | `"default"` \| `"columnheader"` \| `"rowheader"` | `"default"` | Cell type |
| `grid-column` | `string` | — | CSS grid column position |

### Events

| Event | Detail | Description |
|---|---|---|
| `row-focused` | row element | A row received focus |
| `cell-focused` | cell element | A cell received focus |

### CSS Parts

| Part | Description |
|---|---|
| — | DataGrid uses CSS custom properties rather than parts |

### Examples

**Auto-generated grid from data:**

```html
<fluent-data-grid
  id="autoGrid"
  generate-header="sticky"
  grid-template-columns="1fr 1fr 120px 100px"
></fluent-data-grid>

<script>
  const grid = document.getElementById("autoGrid");
  grid.rowsData = [
    { name: "Alice Johnson", department: "Engineering", status: "Active", tenure: "3 years" },
    { name: "Bob Smith", department: "Design", status: "Away", tenure: "1 year" },
    { name: "Carol Lee", department: "Product", status: "Active", tenure: "5 years" },
    { name: "David Kim", department: "Engineering", status: "Offline", tenure: "2 years" },
  ];
</script>
```

**Explicit column definitions with custom cell template:**

```html
<fluent-data-grid id="customGrid" generate-header="sticky"></fluent-data-grid>

<script>
  const grid = document.getElementById("customGrid");

  grid.columnDefinitions = [
    { columnDataKey: "name", title: "Name", isRowHeader: true },
    { columnDataKey: "department", title: "Department" },
    {
      columnDataKey: "status",
      title: "Status",
      cellTemplate: (cell, row) => {
        const badge = document.createElement("fluent-badge");
        badge.textContent = row.status;
        const colorMap = { Active: "success", Away: "warning", Offline: "danger" };
        badge.setAttribute("color", colorMap[row.status] || "subtle");
        return badge;
      },
    },
  ];

  grid.rowsData = [
    { name: "Alice Johnson", department: "Engineering", status: "Active" },
    { name: "Bob Smith", department: "Design", status: "Away" },
    { name: "Carol Lee", department: "Product", status: "Offline" },
  ];
</script>
```

**Declarative grid (manual rows and cells):**

```html
<fluent-data-grid grid-template-columns="200px 150px 120px">
  <fluent-data-grid-row row-type="header">
    <fluent-data-grid-cell cell-type="columnheader">Name</fluent-data-grid-cell>
    <fluent-data-grid-cell cell-type="columnheader">Role</fluent-data-grid-cell>
    <fluent-data-grid-cell cell-type="columnheader">Status</fluent-data-grid-cell>
  </fluent-data-grid-row>
  <fluent-data-grid-row>
    <fluent-data-grid-cell>Alice Johnson</fluent-data-grid-cell>
    <fluent-data-grid-cell>Engineer</fluent-data-grid-cell>
    <fluent-data-grid-cell>
      <fluent-badge color="success">Active</fluent-badge>
    </fluent-data-grid-cell>
  </fluent-data-grid-row>
</fluent-data-grid>
```

**Sorting implementation:**

```js
let sortDirection = {};

function sortGrid(grid, columnKey) {
  const dir = sortDirection[columnKey] === "asc" ? "desc" : "asc";
  sortDirection = { [columnKey]: dir };

  const sorted = [...grid.rowsData].sort((a, b) => {
    const valA = String(a[columnKey]);
    const valB = String(b[columnKey]);
    const cmp = valA.localeCompare(valB);
    return dir === "asc" ? cmp : -cmp;
  });
  grid.rowsData = sorted;
}

grid.addEventListener("click", (e) => {
  const header = e.target.closest("fluent-data-grid-cell[cell-type='columnheader']");
  if (!header) return;
  const colDef = header.columnDefinition;
  if (colDef) sortGrid(grid, colDef.columnDataKey);
});
```

**Row selection tracking:**

```js
const selectedRows = new Set();

grid.addEventListener("row-focused", (e) => {
  const row = e.target;
  const rowData = row.rowData;

  if (e.ctrlKey || e.metaKey) {
    // Toggle selection
    if (selectedRows.has(rowData)) {
      selectedRows.delete(rowData);
      row.style.background = "";
    } else {
      selectedRows.add(rowData);
      row.style.background = "var(--neutral-fill-secondary-rest)";
    }
  } else {
    // Single select
    selectedRows.clear();
    grid.querySelectorAll("fluent-data-grid-row").forEach((r) => (r.style.background = ""));
    selectedRows.add(rowData);
    row.style.background = "var(--neutral-fill-secondary-rest)";
  }
});
```

---

## Dialog

**Element:** `<fluent-dialog>`
**Registration:** `fluentDialog()`

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `modal` | `boolean` | `false` | Modal (blocks interaction behind) |
| `hidden` | `boolean` | `true` | Visibility |
| `trap-focus` | `boolean` | `true` | Trap keyboard focus inside |
| `aria-label` | `string` | — | Accessible label |
| `aria-describedby` | `string` | — | Accessible description |

### Events

| Event | Detail | Description |
|---|---|---|
| `dismiss` | — | Fires on Escape key press |

### Slots

| Slot | Description |
|---|---|
| (default) | Dialog content |

### CSS Parts

| Part | Description |
|---|---|
| `control` | The dialog wrapper |
| `overlay` | The backdrop overlay (modal only) |

### Examples

```html
<fluent-button id="openDialogBtn" appearance="accent">Open Dialog</fluent-button>

<fluent-dialog id="myDialog" modal hidden trap-focus aria-label="Confirm action">
  <h2>Confirm Delete</h2>
  <p>Are you sure you want to delete this item? This action cannot be undone.</p>
  <div style="display: flex; gap: 8px; justify-content: flex-end;">
    <fluent-button id="cancelBtn" appearance="outline">Cancel</fluent-button>
    <fluent-button id="confirmBtn" appearance="accent">Delete</fluent-button>
  </div>
</fluent-dialog>

<script>
  const dialog = document.getElementById("myDialog");
  const openBtn = document.getElementById("openDialogBtn");

  openBtn.addEventListener("click", () => { dialog.hidden = false; });

  document.getElementById("cancelBtn").addEventListener("click", () => {
    dialog.hidden = true;
    openBtn.focus();
  });

  dialog.addEventListener("dismiss", () => {
    dialog.hidden = true;
    openBtn.focus();
  });
</script>
```

---

## Divider

**Element:** `<fluent-divider>`
**Registration:** `fluentDivider()`

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `role` | `"separator"` \| `"presentation"` | `"separator"` | ARIA role |
| `orientation` | `"horizontal"` \| `"vertical"` | `"horizontal"` | Direction |

### Examples

```html
<p>Content above</p>
<fluent-divider></fluent-divider>
<p>Content below</p>

<div style="display: flex; height: 40px; align-items: center; gap: 8px;">
  <span>Left</span>
  <fluent-divider orientation="vertical"></fluent-divider>
  <span>Right</span>
</div>
```

---

## Drawer

**Element:** `<fluent-drawer>`
**Registration:** `fluentDrawer()`

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `position` | `"start"` \| `"end"` | `"start"` | Side of viewport |
| `size` | `"small"` \| `"medium"` \| `"large"` \| `"full"` | `"small"` | Width preset |
| `modal` | `boolean` | `false` | Block background interaction |
| `hidden` | `boolean` | `true` | Visibility |

### Events

| Event | Detail | Description |
|---|---|---|
| `dismiss` | — | Fires on backdrop click or Escape |

### Slots

| Slot | Description |
|---|---|
| (default) | Drawer content |

### Examples

```html
<fluent-button id="openDrawerBtn">Open Drawer</fluent-button>

<fluent-drawer id="myDrawer" position="end" size="medium" modal hidden>
  <h2 style="padding: 16px;">Navigation</h2>
  <fluent-divider></fluent-divider>
  <nav style="padding: 16px;">
    <fluent-anchor href="/home" appearance="stealth" style="display: block;">Home</fluent-anchor>
    <fluent-anchor href="/settings" appearance="stealth" style="display: block;">Settings</fluent-anchor>
  </nav>
</fluent-drawer>

<script>
  const drawer = document.getElementById("myDrawer");
  document.getElementById("openDrawerBtn").addEventListener("click", () => {
    drawer.hidden = false;
  });
  drawer.addEventListener("dismiss", () => { drawer.hidden = true; });
</script>
```

---

## Field

**Element:** `<fluent-field>`
**Registration:** `fluentField()`

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `label-position` | `"above"` \| `"before"` \| `"after"` | `"above"` | Label placement |
| `orientation` | `"horizontal"` \| `"vertical"` | `"vertical"` | Layout direction |

### Slots

| Slot | Description |
|---|---|
| `label` | Label element |
| `input` | Input control |
| `message` | Validation or help message |

### Examples

```html
<fluent-field label-position="above">
  <label slot="label">Email address</label>
  <fluent-text-field slot="input" type="email" placeholder="user@example.com" required>
  </fluent-text-field>
  <span slot="message">We'll never share your email.</span>
</fluent-field>
```

---

## Image

**Element:** `<fluent-image>`
**Registration:** `fluentImage()`

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `src` | `string` | — | Image source URL |
| `alt` | `string` | — | Alternative text |
| `fit` | `"none"` \| `"center"` \| `"contain"` \| `"cover"` \| `"default"` | `"default"` | Object-fit behavior |
| `shadow` | `boolean` | `false` | Apply elevation shadow |
| `shape` | `"square"` \| `"circular"` \| `"rounded"` | `"square"` | Image shape |
| `bordered` | `boolean` | `false` | Show border |
| `block` | `boolean` | `false` | Display block |

### Examples

```html
<fluent-image src="/avatar.jpg" alt="User avatar" shape="circular" shadow
  style="width: 80px; height: 80px;">
</fluent-image>

<fluent-image src="/banner.jpg" alt="Page banner" fit="cover" block bordered
  style="width: 100%; height: 200px;">
</fluent-image>
```

---

## Label

**Element:** `<fluent-label>`
**Registration:** `fluentLabel()`

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `for` | `string` | — | Associated input ID |
| `required` | `boolean` | `false` | Show required indicator |
| `disabled` | `boolean` | `false` | Disabled appearance |
| `size` | `"small"` \| `"medium"` \| `"large"` | `"medium"` | Text size |
| `weight` | `"regular"` \| `"semibold"` | `"regular"` | Font weight |

### Examples

```html
<fluent-label for="nameInput" required>Full Name</fluent-label>
<fluent-text-field id="nameInput"></fluent-text-field>

<fluent-label size="large" weight="semibold">Section Title</fluent-label>
```

---

## Link

**Element:** `<fluent-link>`
**Registration:** `fluentLink()`

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `href` | `string` | — | Destination URL |
| `appearance` | `"default"` \| `"subtle"` | `"default"` | Visual style |
| `inline` | `boolean` | `false` | Inline with text |
| `target` | `string` | — | Link target |
| `disabled` | `boolean` | `false` | Disabled state |

### Examples

```html
<p>
  Read the <fluent-link href="/docs" inline>documentation</fluent-link> for details.
</p>
<fluent-link href="/settings" appearance="subtle">Manage Settings</fluent-link>
```

---

## Menu

**Element:** `<fluent-menu>`, `<fluent-menu-item>`, `<fluent-menu-list>`
**Registration:** `fluentMenu()`, `fluentMenuItem()`, `fluentMenuList()`

### MenuItem Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `role` | `"menuitem"` \| `"menuitemcheckbox"` \| `"menuitemradio"` | `"menuitem"` | ARIA role |
| `disabled` | `boolean` | `false` | Disabled state |
| `checked` | `boolean` | `false` | Checked state (checkbox/radio roles) |

### Events

| Event | Detail | Description |
|---|---|---|
| `change` | — | Selection change (checkbox/radio items) |
| `expanded-change` | — | Submenu expand/collapse |

### Slots (MenuItem)

| Slot | Description |
|---|---|
| (default) | Menu item text |
| `start` | Leading icon |
| `end` | Trailing content (shortcut key hint) |
| `submenu` | Nested `<fluent-menu>` for submenus |

### Examples

```html
<fluent-menu>
  <fluent-menu-list>
    <fluent-menu-item>
      <svg slot="start" width="16" height="16"><use href="#cut-icon"/></svg>
      Cut
      <span slot="end">Ctrl+X</span>
    </fluent-menu-item>
    <fluent-menu-item>
      Copy
      <span slot="end">Ctrl+C</span>
    </fluent-menu-item>
    <fluent-menu-item>
      Paste
      <span slot="end">Ctrl+V</span>
    </fluent-menu-item>
    <fluent-divider></fluent-divider>
    <fluent-menu-item role="menuitemcheckbox" checked>
      Word Wrap
    </fluent-menu-item>
    <fluent-menu-item role="menuitemcheckbox">
      Minimap
    </fluent-menu-item>
  </fluent-menu-list>
</fluent-menu>
```

---

## MessageBar

**Element:** `<fluent-message-bar>`
**Registration:** `fluentMessageBar()`

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `intent` | `"info"` \| `"success"` \| `"warning"` \| `"error"` | `"info"` | Semantic intent |
| `layout` | `"singleline"` \| `"multiline"` | `"singleline"` | Layout mode |

### Slots

| Slot | Description |
|---|---|
| (default) | Message text |
| `icon` | Custom icon |
| `actions` | Action buttons |
| `dismiss` | Dismiss button |

### Examples

```html
<fluent-message-bar intent="success">
  Changes saved successfully.
  <fluent-button slot="dismiss" appearance="stealth" size="small">×</fluent-button>
</fluent-message-bar>

<fluent-message-bar intent="error" layout="multiline">
  <strong>Error:</strong> Failed to connect to the server. Please check your network and try again.
  <fluent-button slot="actions" appearance="outline" size="small">Retry</fluent-button>
</fluent-message-bar>

<fluent-message-bar intent="warning">
  Your session will expire in 5 minutes.
</fluent-message-bar>
```

---

## ProgressBar

**Element:** `<fluent-progress-bar>`
**Registration:** `fluentProgressBar()`

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `value` | `number` | — | Current progress (omit for indeterminate) |
| `min` | `number` | `0` | Minimum value |
| `max` | `number` | `1` | Maximum value |

### CSS Parts

| Part | Description |
|---|---|
| `progress` | The progress track |
| `determinate` | The progress fill bar |
| `indeterminate` | The indeterminate animation bar |

### Examples

```html
<!-- Determinate -->
<fluent-progress-bar value="0.65" min="0" max="1"></fluent-progress-bar>

<!-- Indeterminate (loading) -->
<fluent-progress-bar></fluent-progress-bar>
```

---

## Radio & RadioGroup

**Element:** `<fluent-radio>`, `<fluent-radio-group>`
**Registration:** `fluentRadio()`, `fluentRadioGroup()`

### RadioGroup Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `orientation` | `"horizontal"` \| `"vertical"` | `"horizontal"` | Layout direction |
| `disabled` | `boolean` | `false` | Disable all radios |
| `name` | `string` | — | Form field name |
| `value` | `string` | — | Currently selected value |

### Radio Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `checked` | `boolean` | `false` | Selected state |
| `disabled` | `boolean` | `false` | Disabled |
| `value` | `string` | — | Radio value |
| `name` | `string` | — | Group name |

### Events

| Event | Detail | Description |
|---|---|---|
| `change` | — | Selection changed |

### Examples

```html
<fluent-radio-group orientation="vertical" name="size" value="medium">
  <fluent-label slot="label">Choose size</fluent-label>
  <fluent-radio value="small">Small</fluent-radio>
  <fluent-radio value="medium">Medium</fluent-radio>
  <fluent-radio value="large">Large</fluent-radio>
</fluent-radio-group>
```

---

## Select

**Element:** `<fluent-select>`
**Registration:** `fluentSelect()`

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `disabled` | `boolean` | `false` | Disabled state |
| `multiple` | `boolean` | `false` | Multi-select mode |
| `value` | `string` | — | Selected value |
| `name` | `string` | — | Form name |
| `position` | `"above"` \| `"below"` | — | Dropdown position |

### Events

| Event | Detail | Description |
|---|---|---|
| `change` | — | Selection changed |

### Examples

```html
<fluent-select>
  <fluent-option value="">-- Select department --</fluent-option>
  <fluent-option value="eng">Engineering</fluent-option>
  <fluent-option value="design">Design</fluent-option>
  <fluent-option value="pm">Product Management</fluent-option>
  <fluent-option value="sales">Sales</fluent-option>
</fluent-select>
```

---

## Slider

**Element:** `<fluent-slider>`, `<fluent-slider-label>`
**Registration:** `fluentSlider()`, `fluentSliderLabel()`

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `min` | `number` | `0` | Minimum value |
| `max` | `number` | `10` | Maximum value |
| `step` | `number` | `1` | Step increment |
| `value` | `string` | — | Current value |
| `orientation` | `"horizontal"` \| `"vertical"` | `"horizontal"` | Layout |
| `disabled` | `boolean` | `false` | Disabled |

### Events

| Event | Detail | Description |
|---|---|---|
| `change` | — | Value changed |

### Examples

```html
<fluent-slider min="0" max="100" step="5" value="50">
  <fluent-slider-label position="0">0%</fluent-slider-label>
  <fluent-slider-label position="50">50%</fluent-slider-label>
  <fluent-slider-label position="100">100%</fluent-slider-label>
</fluent-slider>
```

---

## Spinner

**Element:** `<fluent-spinner>`
**Registration:** `fluentSpinner()`

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `size` | `"tiny"` \| `"extra-small"` \| `"small"` \| `"medium"` \| `"large"` \| `"extra-large"` \| `"huge"` | `"medium"` | Spinner size |
| `appearance` | `"primary"` \| `"inverted"` | `"primary"` | Color scheme |

### Examples

```html
<fluent-spinner size="small"></fluent-spinner>
<fluent-spinner size="large" aria-label="Loading data"></fluent-spinner>
```

---

## Switch

**Element:** `<fluent-switch>`
**Registration:** `fluentSwitch()`

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `checked` | `boolean` | `false` | On/off state |
| `disabled` | `boolean` | `false` | Disabled |
| `name` | `string` | — | Form name |
| `value` | `string` | — | Form value |
| `required` | `boolean` | `false` | Required |

### Events

| Event | Detail | Description |
|---|---|---|
| `change` | — | Toggle state changed |

### Slots

| Slot | Description |
|---|---|
| (default) | Label text |
| `checked-message` | Text shown when checked |
| `unchecked-message` | Text shown when unchecked |

### Examples

```html
<fluent-switch checked>
  Enable notifications
  <span slot="checked-message">On</span>
  <span slot="unchecked-message">Off</span>
</fluent-switch>
```

---

## Tabs

**Element:** `<fluent-tabs>`, `<fluent-tab>`, `<fluent-tab-panel>`
**Registration:** `fluentTabs()`, `fluentTab()`, `fluentTabPanel()`

### Tabs Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `activeid` | `string` | — | ID of the active tab |
| `orientation` | `"horizontal"` \| `"vertical"` | `"horizontal"` | Layout |

### Tab Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `disabled` | `boolean` | `false` | Disabled tab |
| `id` | `string` | — | Tab identifier |

### Events

| Event | Detail | Description |
|---|---|---|
| `change` | — | Active tab changed |

### Examples

```html
<fluent-tabs activeid="tab-1">
  <fluent-tab id="tab-1">Overview</fluent-tab>
  <fluent-tab id="tab-2">Details</fluent-tab>
  <fluent-tab id="tab-3" disabled>Settings</fluent-tab>

  <fluent-tab-panel id="panel-1">
    <p>Overview content here.</p>
  </fluent-tab-panel>
  <fluent-tab-panel id="panel-2">
    <p>Detail information goes here.</p>
  </fluent-tab-panel>
  <fluent-tab-panel id="panel-3">
    <p>Settings are disabled.</p>
  </fluent-tab-panel>
</fluent-tabs>
```

---

## Text

**Element:** `<fluent-text>`
**Registration:** `fluentText()`

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `size` | `100`–`1000` | `300` | Type ramp size |
| `weight` | `"regular"` \| `"medium"` \| `"semibold"` \| `"bold"` | `"regular"` | Font weight |
| `font` | `"base"` \| `"monospace"` \| `"numeric"` | `"base"` | Font family |
| `align` | `"start"` \| `"center"` \| `"end"` \| `"justify"` | `"start"` | Text alignment |
| `block` | `boolean` | `false` | Block-level display |
| `italic` | `boolean` | `false` | Italic style |
| `underline` | `boolean` | `false` | Underline |
| `strikethrough` | `boolean` | `false` | Strikethrough |
| `truncate` | `boolean` | `false` | Text overflow ellipsis |
| `wrap` | `boolean` | `true` | Text wrapping |

### Examples

```html
<fluent-text size="500" weight="semibold" block>Page Title</fluent-text>
<fluent-text size="300">Regular body text with Fluent typography tokens.</fluent-text>
<fluent-text size="200" font="monospace">const x = 42;</fluent-text>
<fluent-text italic>Italic emphasis text.</fluent-text>
<fluent-text truncate block style="max-width: 200px;">
  This long text will be truncated with an ellipsis when it overflows.
</fluent-text>
```

---

## TextField

**Element:** `<fluent-text-field>`
**Registration:** `fluentTextField()`

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `type` | `"text"` \| `"email"` \| `"password"` \| `"tel"` \| `"url"` | `"text"` | Input type |
| `placeholder` | `string` | — | Placeholder text |
| `value` | `string` | — | Current value |
| `maxlength` | `number` | — | Max characters |
| `minlength` | `number` | — | Min characters |
| `pattern` | `string` | — | Validation regex |
| `required` | `boolean` | `false` | Required |
| `disabled` | `boolean` | `false` | Disabled |
| `readonly` | `boolean` | `false` | Read-only |
| `autofocus` | `boolean` | `false` | Auto focus |
| `size` | `number` | — | Visible character width |
| `spellcheck` | `boolean` | — | Spell check |
| `appearance` | `"outline"` \| `"filled-darker"` \| `"filled-lighter"` | `"outline"` | Visual style |

### Events

| Event | Detail | Description |
|---|---|---|
| `change` | — | Value committed (blur) |
| `input` | — | Value changing (keystroke) |

### Slots

| Slot | Description |
|---|---|
| `start` | Content before input (icon) |
| `end` | Content after input (icon) |

### CSS Parts

| Part | Description |
|---|---|
| `root` | Outer container |
| `control` | The input element |
| `label` | Associated label |

### Examples

```html
<fluent-text-field
  type="email"
  placeholder="user@example.com"
  required
  appearance="outline"
>
  <svg slot="start" width="16" height="16"><use href="#mail-icon"/></svg>
</fluent-text-field>

<fluent-text-field
  type="password"
  placeholder="Enter password"
  minlength="8"
  appearance="filled-darker"
></fluent-text-field>
```

---

## TextArea

**Element:** `<fluent-text-area>`
**Registration:** `fluentTextArea()`

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `resize` | `"none"` \| `"both"` \| `"horizontal"` \| `"vertical"` | `"none"` | Resize behavior |
| `rows` | `number` | — | Visible rows |
| `cols` | `number` | — | Visible columns |
| `placeholder` | `string` | — | Placeholder |
| `value` | `string` | — | Content |
| `maxlength` | `number` | — | Max length |
| `required` | `boolean` | `false` | Required |
| `disabled` | `boolean` | `false` | Disabled |
| `readonly` | `boolean` | `false` | Read-only |
| `appearance` | `"outline"` \| `"filled-darker"` \| `"filled-lighter"` | `"outline"` | Visual style |

### Events

| Event | Detail | Description |
|---|---|---|
| `change` | — | Value committed |
| `input` | — | Value changing |

### Examples

```html
<fluent-text-area
  resize="vertical"
  rows="4"
  placeholder="Enter your message..."
  appearance="outline"
></fluent-text-area>
```

---

## Tooltip

**Element:** `<fluent-tooltip>`
**Registration:** `fluentTooltip()`

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `anchor` | `string` | — | ID of the target element |
| `position` | `"above"` \| `"below"` \| `"before"` \| `"after"` | `"above"` | Tooltip position |
| `delay` | `number` | `300` | Show delay in ms |

### Slots

| Slot | Description |
|---|---|
| (default) | Tooltip content |

### Examples

```html
<fluent-button id="saveBtn" appearance="accent">Save</fluent-button>
<fluent-tooltip anchor="saveBtn" position="below">
  Save all changes (Ctrl+S)
</fluent-tooltip>
```

---

## Design Token CSS Custom Properties

Complete list of CSS custom properties available on `<fluent-design-system-provider>` and any element:

### Color tokens

| CSS Custom Property | Description |
|---|---|
| `--fill-color` | Page/surface background fill |
| `--accent-base-color` | Brand/accent seed color |
| `--neutral-base-color` | Neutral palette seed color |
| `--accent-fill-rest` | Accent fill at rest state |
| `--accent-fill-hover` | Accent fill on hover |
| `--accent-fill-active` | Accent fill when active/pressed |
| `--accent-fill-focus` | Accent fill when focused |
| `--accent-foreground-rest` | Accent text color at rest |
| `--accent-foreground-hover` | Accent text color on hover |
| `--accent-foreground-active` | Accent text color when active |
| `--neutral-fill-rest` | Neutral fill at rest |
| `--neutral-fill-hover` | Neutral fill on hover |
| `--neutral-fill-active` | Neutral fill when active |
| `--neutral-fill-stealth-rest` | Stealth (transparent) fill at rest |
| `--neutral-fill-stealth-hover` | Stealth fill on hover |
| `--neutral-fill-input-rest` | Input field fill at rest |
| `--neutral-fill-input-hover` | Input field fill on hover |
| `--neutral-fill-secondary-rest` | Secondary surface fill |
| `--neutral-foreground-rest` | Primary text color |
| `--neutral-foreground-hint` | Hint/placeholder text color |
| `--neutral-stroke-rest` | Border color at rest |
| `--neutral-stroke-hover` | Border color on hover |
| `--neutral-stroke-strong-rest` | Strong border (inputs) at rest |
| `--focus-stroke-outer` | Outer focus ring color |
| `--focus-stroke-inner` | Inner focus ring color |

### Layout tokens

| CSS Custom Property | Description |
|---|---|
| `--base-layer-luminance` | Light (1) vs dark (0) mode |
| `--control-corner-radius` | Corner radius for controls |
| `--layer-corner-radius` | Corner radius for layers/cards |
| `--stroke-width` | Border width |
| `--focus-stroke-width` | Focus indicator width |
| `--disabled-opacity` | Opacity for disabled elements |
| `--design-unit` | Base spacing unit (default 4) |
| `--density` | Spacing density adjustment |
| `--base-height-multiplier` | Control height multiplier |
| `--base-horizontal-spacing-multiplier` | Horizontal padding multiplier |

### Typography tokens

| CSS Custom Property | Description |
|---|---|
| `--type-ramp-base-font-size` | Body text font size |
| `--type-ramp-base-line-height` | Body text line height |
| `--type-ramp-minus-1-font-size` | Caption font size |
| `--type-ramp-minus-1-line-height` | Caption line height |
| `--type-ramp-minus-2-font-size` | Small caption font size |
| `--type-ramp-plus-1-font-size` | Subtitle 2 font size |
| `--type-ramp-plus-2-font-size` | Subtitle 1 font size |
| `--type-ramp-plus-3-font-size` | Title 3 font size |
| `--type-ramp-plus-4-font-size` | Title 2 font size |
| `--type-ramp-plus-5-font-size` | Title 1 font size |
| `--type-ramp-plus-6-font-size` | Large title font size |
| `--body-font` | Body font family |
| `--font-weight` | Default font weight |

### Elevation tokens

| CSS Custom Property | Description |
|---|---|
| `--elevation-shadow-card-rest` | Card shadow at rest |
| `--elevation-shadow-tooltip` | Tooltip shadow |
| `--elevation-shadow-flyout` | Flyout/popup shadow |
| `--elevation-shadow-dialog` | Dialog shadow |

---

## Framework Integration Recipes

### Angular — Complete Setup

**1. Install dependencies:**

```bash
npm install @fluentui/web-components
```

**2. Register in `main.ts`:**

```typescript
import {
  provideFluentDesignSystem,
  allComponents,
} from "@fluentui/web-components";

provideFluentDesignSystem().register(allComponents);
```

**3. Module configuration (`app.module.ts`):**

```typescript
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { FormsModule } from "@angular/forms";
import { AppComponent } from "./app.component";

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  bootstrap: [AppComponent],
})
export class AppModule {}
```

**4. Standalone component alternative (Angular 14+):**

```typescript
import { Component, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";

@Component({
  selector: "app-form",
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <fluent-card>
      <fluent-field label-position="above">
        <label slot="label">Name</label>
        <fluent-text-field
          slot="input"
          [placeholder]="'Enter name'"
          (input)="onInput($event)"
        ></fluent-text-field>
      </fluent-field>
      <fluent-button appearance="accent" (click)="onSubmit()">Submit</fluent-button>
    </fluent-card>
  `,
})
export class FormComponent {
  name = "";

  onInput(e: Event) {
    this.name = (e.target as HTMLInputElement).value;
  }

  onSubmit() {
    console.log("Submitted:", this.name);
  }
}
```

**5. Angular property binding patterns:**

```html
<!-- String attribute — just use the value -->
<fluent-button appearance="accent">OK</fluent-button>

<!-- Dynamic attribute — use property binding -->
<fluent-button [appearance]="buttonAppearance" [disabled]="isLoading">
  {{ isLoading ? 'Loading...' : 'Submit' }}
</fluent-button>

<!-- Event handling -->
<fluent-checkbox (change)="onCheckChange($event)">Toggle</fluent-checkbox>

<!-- Two-way with custom element (manual) -->
<fluent-text-field
  [value]="email"
  (input)="email = $any($event).target.value"
></fluent-text-field>
```

### Vue 3 — Complete Setup

**1. `vite.config.ts`:**

```typescript
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith("fluent-"),
        },
      },
    }),
  ],
});
```

**2. `main.ts`:**

```typescript
import { createApp } from "vue";
import App from "./App.vue";
import { provideFluentDesignSystem, allComponents } from "@fluentui/web-components";

provideFluentDesignSystem().register(allComponents);
createApp(App).mount("#app");
```

**3. Composable for Fluent theme:**

```typescript
// composables/useFluentTheme.ts
import { ref, onMounted } from "vue";
import { baseLayerLuminance, accentBaseColor } from "@fluentui/web-components";

export function useFluentTheme() {
  const isDark = ref(false);

  function toggleTheme() {
    isDark.value = !isDark.value;
    const provider = document.querySelector("fluent-design-system-provider");
    if (provider) {
      baseLayerLuminance.setValueFor(provider as HTMLElement, isDark.value ? 0.15 : 1);
    }
  }

  function setBrandColor(color: string) {
    const provider = document.querySelector("fluent-design-system-provider");
    if (provider) {
      accentBaseColor.setValueFor(provider as HTMLElement, color);
    }
  }

  return { isDark, toggleTheme, setBrandColor };
}
```

**4. Vue component usage:**

```vue
<template>
  <fluent-design-system-provider :base-layer-luminance="isDark ? 0.15 : 1">
    <fluent-card>
      <fluent-field label-position="above">
        <label slot="label">Search</label>
        <fluent-text-field
          slot="input"
          :placeholder="'Type to search...'"
          @input="onSearch"
        ></fluent-text-field>
      </fluent-field>

      <fluent-data-grid ref="gridRef" generate-header="sticky"></fluent-data-grid>

      <fluent-switch :checked="isDark" @change="toggleTheme">Dark Mode</fluent-switch>
    </fluent-card>
  </fluent-design-system-provider>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useFluentTheme } from "./composables/useFluentTheme";

const { isDark, toggleTheme } = useFluentTheme();
const gridRef = ref<HTMLElement | null>(null);

onMounted(() => {
  if (gridRef.value) {
    (gridRef.value as any).rowsData = [
      { name: "Alice", role: "Engineer" },
      { name: "Bob", role: "Designer" },
    ];
  }
});

function onSearch(e: Event) {
  const query = (e.target as HTMLInputElement).value;
  console.log("Search:", query);
}
</script>
```

### Svelte — Complete Setup

**1. Register in entry point (`src/main.ts` or `src/routes/+layout.ts`):**

```typescript
import { provideFluentDesignSystem, allComponents } from "@fluentui/web-components";
provideFluentDesignSystem().register(allComponents);
```

**2. SvelteKit `+layout.svelte`:**

```svelte
<script lang="ts">
  import "../app.css";
  import { onMount } from "svelte";

  onMount(async () => {
    const { provideFluentDesignSystem, allComponents } = await import(
      "@fluentui/web-components"
    );
    provideFluentDesignSystem().register(allComponents);
  });
</script>

<fluent-design-system-provider base-layer-luminance="1" accent-base-color="#0078d4">
  <slot />
</fluent-design-system-provider>
```

**3. Svelte component with bindings:**

```svelte
<script lang="ts">
  let name = $state("");
  let agreed = $state(false);

  function handleInput(e: Event) {
    name = (e.target as HTMLInputElement).value;
  }

  function handleCheck(e: Event) {
    agreed = (e.target as HTMLInputElement).checked;
  }

  function submit() {
    console.log("Name:", name, "Agreed:", agreed);
  }
</script>

<fluent-card style="padding: 20px; max-width: 400px;">
  <fluent-field label-position="above">
    <label slot="label">Full Name</label>
    <fluent-text-field
      slot="input"
      placeholder="Enter name"
      value={name}
      on:input={handleInput}
    ></fluent-text-field>
  </fluent-field>

  <fluent-checkbox checked={agreed} on:change={handleCheck}>
    I agree to the terms
  </fluent-checkbox>

  <fluent-button appearance="accent" disabled={!agreed} on:click={submit}>
    Register
  </fluent-button>
</fluent-card>
```

**4. Svelte action for DataGrid:**

```svelte
<script lang="ts">
  import { onMount } from "svelte";

  let gridEl: HTMLElement;

  const data = [
    { name: "Alice", department: "Engineering", status: "Active" },
    { name: "Bob", department: "Design", status: "Away" },
    { name: "Carol", department: "Product", status: "Active" },
  ];

  onMount(() => {
    (gridEl as any).rowsData = data;
  });
</script>

<fluent-data-grid
  bind:this={gridEl}
  generate-header="sticky"
  grid-template-columns="1fr 1fr 120px"
></fluent-data-grid>
```

---

## Migration from FAST to Fluent Web Components

### Background

Fluent Web Components were originally built on `@microsoft/fast-foundation` and
`@microsoft/fast-element`. Modern versions consolidate into `@fluentui/web-components` with
FAST as an internal dependency.

### Package mapping

| Old (FAST-based) | New (Fluent) |
|---|---|
| `@microsoft/fast-components` | `@fluentui/web-components` |
| `@microsoft/fast-foundation` | Internal dependency (no direct import needed) |
| `@microsoft/fast-element` | Still used for custom element authoring |
| `provideFASTDesignSystem` | `provideFluentDesignSystem` |
| `fast-*` element prefix | `fluent-*` element prefix |

### Element name changes

| FAST Element | Fluent Element |
|---|---|
| `<fast-button>` | `<fluent-button>` |
| `<fast-card>` | `<fluent-card>` |
| `<fast-text-field>` | `<fluent-text-field>` |
| `<fast-checkbox>` | `<fluent-checkbox>` |
| `<fast-dialog>` | `<fluent-dialog>` |
| `<fast-data-grid>` | `<fluent-data-grid>` |
| `<fast-tabs>` | `<fluent-tabs>` |
| `<fast-tab>` | `<fluent-tab>` |
| `<fast-tab-panel>` | `<fluent-tab-panel>` |
| `<fast-accordion>` | `<fluent-accordion>` |
| `<fast-menu>` | `<fluent-menu>` |
| `<fast-select>` | `<fluent-select>` |
| `<fast-slider>` | `<fluent-slider>` |
| `<fast-switch>` | `<fluent-switch>` |
| `<fast-progress>` | `<fluent-progress-bar>` |
| `<fast-badge>` | `<fluent-badge>` |
| `<fast-breadcrumb>` | `<fluent-breadcrumb>` |
| `<fast-divider>` | `<fluent-divider>` |
| `<fast-tooltip>` | `<fluent-tooltip>` |
| `<fast-anchor>` | `<fluent-anchor>` |
| `<fast-radio-group>` | `<fluent-radio-group>` |
| `<fast-radio>` | `<fluent-radio>` |
| `<fast-text-area>` | `<fluent-text-area>` |
| `<fast-combobox>` | `<fluent-combobox>` |

### Registration migration

**Before (FAST):**

```js
import { provideFASTDesignSystem, fastButton, fastCard } from "@microsoft/fast-components";

provideFASTDesignSystem().register(fastButton(), fastCard());
```

**After (Fluent):**

```js
import { provideFluentDesignSystem, fluentButton, fluentCard } from "@fluentui/web-components";

provideFluentDesignSystem().register(fluentButton(), fluentCard());
```

### Design token migration

FAST tokens and Fluent tokens use the same underlying `DesignToken` system. The main difference
is the token names and default values.

**Before:**

```js
import { fillColor } from "@microsoft/fast-components";
fillColor.setValueFor(element, "#ffffff");
```

**After:**

```js
import { fillColor } from "@fluentui/web-components";
fillColor.setValueFor(element, "#ffffff");
```

### CSS custom property migration

Most CSS custom properties remain the same since both FAST and Fluent use the same token system.
The key change is the design system provider element name:

```html
<!-- Before -->
<fast-design-system-provider fill-color="#fff">...</fast-design-system-provider>

<!-- After -->
<fluent-design-system-provider fill-color="#fff">...</fluent-design-system-provider>
```

### Step-by-step migration checklist

1. **Update package.json** — Replace `@microsoft/fast-components` with `@fluentui/web-components`
2. **Update imports** — Change `provideFASTDesignSystem` to `provideFluentDesignSystem`, `fast*` to `fluent*`
3. **Find and replace element prefixes** — `<fast-` to `<fluent-` in all HTML/templates
4. **Update CSS selectors** — `fast-button { }` to `fluent-button { }` in stylesheets
5. **Test design tokens** — Verify that token values render correctly
6. **Check new components** — Fluent adds `MessageBar`, `Drawer`, `Field`, `Image`, `Text`, `Link` which were not in FAST
7. **Update tests** — Adjust selectors in E2E/integration tests
8. **Verify accessibility** — Run screen reader and keyboard navigation tests
9. **Remove FAST packages** — Uninstall `@microsoft/fast-components` and `@microsoft/fast-foundation`
