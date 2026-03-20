---
name: Fluent UI Web Components
description: >
  Fluent UI Web Components — framework-agnostic custom elements built on FAST, design token integration,
  component catalog, DataGrid, and usage with vanilla JS, Angular, Vue, and Svelte.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - web components fluent
  - fluent web components
  - custom elements fluent
  - shadow dom fluent
  - non-react fluent
  - angular fluent
  - vue fluent
  - svelte fluent
  - fast fluent
  - fluent custom elements
---

# Fluent UI Web Components — Knowledge Base

## 1. Overview

Fluent UI Web Components provide Microsoft's Fluent 2 design language as **framework-agnostic custom
elements** built on the FAST element platform. They render in every environment that supports the
Web Components standard — vanilla HTML/JS, Angular, Vue, Svelte, Blazor, PHP templates, or any
micro-frontend shell.

### When to use Web Components vs React v9

| Scenario | Recommendation |
|---|---|
| React SPA or Next.js app | Use `@fluentui/react-components` (React v9) — richer API, SSR support |
| Angular / Vue / Svelte app | Use `@fluentui/web-components` — native custom elements |
| Micro-frontend with mixed frameworks | Web Components — framework boundary isolation |
| Legacy jQuery / server-rendered pages | Web Components — no build step required via CDN |
| SharePoint Framework (SPFx) extensions | Web Components — avoids React version conflicts |
| Electron / WebView2 shell | Either works; Web Components if shell is framework-free |
| Design-system-as-platform for multiple teams | Web Components — single registration, any consumer |

### Key characteristics

- **Shadow DOM encapsulation** — styles don't leak in or out
- **Custom element registration** — `<fluent-button>`, `<fluent-card>`, etc.
- **Design token CSS custom properties** — theme via `--fill-color`, `--accent-base-color`, etc.
- **FAST foundation** — element lifecycle, template binding, observable properties
- **Tree-shakeable** — import only the components you need

### Package identity

| Package | Purpose |
|---|---|
| `@fluentui/web-components` | Component library (buttons, cards, grids, etc.) |
| `@fluentui/tokens` | Shared token definitions consumed by CSS custom properties |
| `@microsoft/fast-element` | Underlying custom element framework |

**Official documentation:**
- https://learn.microsoft.com/en-us/fluent-ui/web-components/
- https://learn.microsoft.com/en-us/fluent-ui/web-components/components/overview
- https://www.npmjs.com/package/@fluentui/web-components

---

## 2. Package Setup

### npm / yarn / pnpm

```bash
# npm
npm install @fluentui/web-components

# yarn
yarn add @fluentui/web-components

# pnpm
pnpm add @fluentui/web-components
```

### Register all components (quick start)

```js
import {
  provideFluentDesignSystem,
  allComponents,
} from "@fluentui/web-components";

provideFluentDesignSystem().register(allComponents);
```

### Register individual components (tree-shaking)

```js
import {
  provideFluentDesignSystem,
  fluentButton,
  fluentCard,
  fluentTextField,
} from "@fluentui/web-components";

provideFluentDesignSystem().register(
  fluentButton(),
  fluentCard(),
  fluentTextField()
);
```

### CDN usage (no bundler)

```html
<script type="module" src="https://unpkg.com/@fluentui/web-components"></script>
```

Or for a specific version:

```html
<script
  type="module"
  src="https://unpkg.com/@fluentui/web-components@3.0.0/dist/web-components.min.js"
></script>
```

### TypeScript configuration

Add Web Component type declarations for HTML element inference:

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "target": "ES2021",
    "module": "ES2022",
    "lib": ["ES2021", "DOM", "DOM.Iterable"]
  }
}
```

---

## 3. Design Token Integration

Fluent Web Components use **CSS custom properties** (design tokens) for all visual values. Tokens
are set on a `<fluent-design-system-provider>` or on any ancestor element.

### How tokens flow

1. **Global defaults** — The component library ships sensible defaults.
2. **Design system provider** — Wrap the app or a section to override tokens.
3. **Inline overrides** — Any element's `style` attribute can set `--token-name`.

### Design system provider

```html
<fluent-design-system-provider
  fill-color="#ffffff"
  accent-base-color="#0078d4"
  neutral-base-color="#808080"
  base-layer-luminance="1"
>
  <!-- All children inherit these tokens -->
  <fluent-button appearance="accent">Themed Button</fluent-button>
</fluent-design-system-provider>
```

### Common CSS custom property tokens

| Token | CSS Custom Property | Purpose |
|---|---|---|
| Fill color | `--fill-color` | Page background |
| Accent base | `--accent-base-color` | Primary brand color |
| Neutral base | `--neutral-base-color` | Neutral palette seed |
| Base layer luminance | `--base-layer-luminance` | Light (1) vs dark (0) mode |
| Type ramp base size | `--type-ramp-base-font-size` | Body text size |
| Type ramp base line height | `--type-ramp-base-line-height` | Body line height |
| Corner radius | `--control-corner-radius` | Border radius for controls |
| Stroke width | `--stroke-width` | Border width for inputs/cards |
| Focus stroke width | `--focus-stroke-width` | Focus indicator width |
| Disabled opacity | `--disabled-opacity` | Opacity for disabled controls |
| Design unit | `--design-unit` | Base spacing unit (default 4px) |
| Density | `--density` | Spacing density adjustment |
| Base height multiplier | `--base-height-multiplier` | Control height calculation |

### Dark mode

Toggle dark mode by changing `base-layer-luminance`:

```html
<!-- Light mode -->
<fluent-design-system-provider base-layer-luminance="1">
  ...
</fluent-design-system-provider>

<!-- Dark mode -->
<fluent-design-system-provider base-layer-luminance="0.15">
  ...
</fluent-design-system-provider>
```

### Nested theming

Providers can nest to create themed regions:

```html
<fluent-design-system-provider base-layer-luminance="1" accent-base-color="#0078d4">
  <fluent-card>
    <p>Light region with blue accent</p>
  </fluent-card>

  <fluent-design-system-provider base-layer-luminance="0.15" accent-base-color="#9b59b6">
    <fluent-card>
      <p>Dark region with purple accent</p>
    </fluent-card>
  </fluent-design-system-provider>
</fluent-design-system-provider>
```

### Programmatic token access

```js
import {
  fillColor,
  accentBaseColor,
  baseLayerLuminance,
} from "@fluentui/web-components";

const provider = document.querySelector("fluent-design-system-provider");
fillColor.setValueFor(provider, "#f5f5f5");
accentBaseColor.setValueFor(provider, "#0078d4");
baseLayerLuminance.setValueFor(provider, 1);
```

---

## 4. Component Catalog

All components are registered as custom elements with a `fluent-` prefix. Below is the full catalog.
For exhaustive attribute/event/slot/CSS-part details, load the reference:

```
${CLAUDE_PLUGIN_ROOT}/skills/fluent-web-components/references/web-components-catalog.md
```

### Interactive controls

| Element | Registration function | Key attributes |
|---|---|---|
| `<fluent-button>` | `fluentButton()` | `appearance`, `disabled`, `form`, `type` |
| `<fluent-anchor>` | `fluentAnchor()` | `href`, `appearance`, `target` |
| `<fluent-checkbox>` | `fluentCheckbox()` | `checked`, `disabled`, `required` |
| `<fluent-combobox>` | `fluentCombobox()` | `autocomplete`, `disabled`, `placeholder` |
| `<fluent-menu>` | `fluentMenu()` | (slot-driven, contains `<fluent-menu-item>`) |
| `<fluent-radio>` | `fluentRadio()` | `checked`, `disabled`, `name`, `value` |
| `<fluent-radio-group>` | `fluentRadioGroup()` | `orientation`, `disabled`, `name` |
| `<fluent-select>` | `fluentSelect()` | `disabled`, `multiple`, `value` |
| `<fluent-slider>` | `fluentSlider()` | `min`, `max`, `step`, `value`, `orientation` |
| `<fluent-switch>` | `fluentSwitch()` | `checked`, `disabled` |
| `<fluent-text-area>` | `fluentTextArea()` | `resize`, `rows`, `cols`, `placeholder` |
| `<fluent-text-field>` | `fluentTextField()` | `type`, `placeholder`, `maxlength` |
| `<fluent-tooltip>` | `fluentTooltip()` | `anchor`, `position`, `delay` |

### Layout & containers

| Element | Registration function | Key attributes |
|---|---|---|
| `<fluent-accordion>` | `fluentAccordion()` | `expand-mode` |
| `<fluent-accordion-item>` | `fluentAccordionItem()` | `expanded`, `heading-level` |
| `<fluent-breadcrumb>` | `fluentBreadcrumb()` | (slot-driven) |
| `<fluent-card>` | `fluentCard()` | (token-driven container) |
| `<fluent-dialog>` | `fluentDialog()` | `modal`, `hidden`, `trap-focus` |
| `<fluent-divider>` | `fluentDivider()` | `role`, `orientation` |
| `<fluent-drawer>` | `fluentDrawer()` | `position`, `size`, `modal` |
| `<fluent-tab-panel>` | `fluentTabPanel()` | (content panel for tabs) |
| `<fluent-tabs>` | `fluentTabs()` | `activeid`, `orientation` |
| `<fluent-tab>` | `fluentTab()` | `disabled` |

### Data display

| Element | Registration function | Key attributes |
|---|---|---|
| `<fluent-badge>` | `fluentBadge()` | `appearance`, `color` |
| `<fluent-data-grid>` | `fluentDataGrid()` | `generate-header`, `grid-template-columns` |
| `<fluent-data-grid-row>` | `fluentDataGridRow()` | `row-type`, `grid-template-columns` |
| `<fluent-data-grid-cell>` | `fluentDataGridCell()` | `cell-type`, `grid-column` |
| `<fluent-image>` | `fluentImage()` | `src`, `alt`, `fit`, `shadow` |
| `<fluent-label>` | `fluentLabel()` | `for`, `required`, `disabled` |
| `<fluent-text>` | `fluentText()` | (wraps text with Fluent typography tokens) |

### Feedback & progress

| Element | Registration function | Key attributes |
|---|---|---|
| `<fluent-message-bar>` | `fluentMessageBar()` | `intent`, `layout` |
| `<fluent-progress-bar>` | `fluentProgressBar()` | `value`, `min`, `max` |
| `<fluent-spinner>` | `fluentSpinner()` | `size` |

### Form structure

| Element | Registration function | Key attributes |
|---|---|---|
| `<fluent-field>` | `fluentField()` | `label-position`, `orientation` |
| `<fluent-link>` | `fluentLink()` | `href`, `appearance`, `inline` |

### Quick examples

```html
<!-- Accent button -->
<fluent-button appearance="accent">Save Changes</fluent-button>

<!-- Text field with label -->
<fluent-field label-position="above">
  <label slot="label">Email address</label>
  <fluent-text-field slot="input" type="email" placeholder="user@example.com">
  </fluent-text-field>
</fluent-field>

<!-- Card container -->
<fluent-card>
  <h3>Project Status</h3>
  <fluent-badge appearance="filled" color="success">Active</fluent-badge>
  <p>All systems operational.</p>
</fluent-card>

<!-- Accordion -->
<fluent-accordion expand-mode="single">
  <fluent-accordion-item expanded>
    <span slot="heading">Section One</span>
    <p>Content for section one.</p>
  </fluent-accordion-item>
  <fluent-accordion-item>
    <span slot="heading">Section Two</span>
    <p>Content for section two.</p>
  </fluent-accordion-item>
</fluent-accordion>
```

---

## 5. DataGrid Web Component

The `<fluent-data-grid>` is the most complex Web Component and deserves detailed coverage.

**Reference:** https://learn.microsoft.com/en-us/fluent-ui/web-components/components/data-grid

### Basic usage

```html
<fluent-data-grid id="myGrid" generate-header="sticky" grid-template-columns="1fr 1fr 1fr">
</fluent-data-grid>

<script>
  const grid = document.getElementById("myGrid");
  grid.rowsData = [
    { name: "Alice Johnson", role: "Engineer", status: "Active" },
    { name: "Bob Smith", role: "Designer", status: "Away" },
    { name: "Carol Lee", role: "PM", status: "Active" },
  ];
</script>
```

### Column definitions

For explicit column control, define `columnDefinitions`:

```js
grid.columnDefinitions = [
  { columnDataKey: "name", title: "Name" },
  { columnDataKey: "role", title: "Role" },
  {
    columnDataKey: "status",
    title: "Status",
    cellTemplate: (cell, row) => {
      const badge = document.createElement("fluent-badge");
      badge.textContent = row.status;
      badge.setAttribute("color", row.status === "Active" ? "success" : "warning");
      return badge;
    },
  },
];
```

### Sorting

Sorting is implemented via column header click handlers:

```js
grid.columnDefinitions = [
  {
    columnDataKey: "name",
    title: "Name",
    isRowHeader: true,
    headerCellTemplate: /* custom sort header template */,
  },
  { columnDataKey: "role", title: "Role" },
];

// Sort handler
grid.addEventListener("click", (e) => {
  const header = e.target.closest("fluent-data-grid-cell[cell-type='columnheader']");
  if (!header) return;

  const columnKey = header.columnDefinition?.columnDataKey;
  if (!columnKey) return;

  const sorted = [...grid.rowsData].sort((a, b) =>
    String(a[columnKey]).localeCompare(String(b[columnKey]))
  );
  grid.rowsData = sorted;
});
```

### Row selection

```js
grid.addEventListener("row-focused", (e) => {
  const row = e.detail;
  console.log("Selected row data:", row);
});
```

### Column resizing

Set `grid-template-columns` to enable user-controlled column widths:

```html
<fluent-data-grid
  grid-template-columns="minmax(150px, 1fr) minmax(100px, 1fr) 120px"
  generate-header="sticky"
>
</fluent-data-grid>
```

### Virtualization with large datasets

For large datasets, batch-render rows or use IntersectionObserver for virtual scrolling:

```js
const PAGE_SIZE = 50;
let currentPage = 0;

function loadPage(page) {
  const start = page * PAGE_SIZE;
  grid.rowsData = allData.slice(start, start + PAGE_SIZE);
}

loadPage(0);
```

---

## 6. Framework Integration

### 6.1 Vanilla JS / HTML

The simplest approach — no framework tooling needed.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Fluent Web Components — Vanilla</title>
  <script type="module">
    import {
      provideFluentDesignSystem,
      fluentButton,
      fluentCard,
      fluentTextField,
    } from "https://unpkg.com/@fluentui/web-components";

    provideFluentDesignSystem().register(
      fluentButton(),
      fluentCard(),
      fluentTextField()
    );
  </script>
</head>
<body>
  <fluent-design-system-provider base-layer-luminance="1" accent-base-color="#0078d4">
    <fluent-card>
      <h2>Contact Form</h2>
      <fluent-text-field placeholder="Your name"></fluent-text-field>
      <fluent-button appearance="accent" id="submitBtn">Submit</fluent-button>
    </fluent-card>
  </fluent-design-system-provider>

  <script>
    document.getElementById("submitBtn").addEventListener("click", () => {
      alert("Form submitted!");
    });
  </script>
</body>
</html>
```

### 6.2 Angular

Angular fully supports custom elements via `CUSTOM_ELEMENTS_SCHEMA`.

**Step 1 — Install:**

```bash
npm install @fluentui/web-components
```

**Step 2 — Register components in `main.ts`:**

```typescript
import {
  provideFluentDesignSystem,
  fluentButton,
  fluentCard,
  fluentTextField,
} from "@fluentui/web-components";

provideFluentDesignSystem().register(
  fluentButton(),
  fluentCard(),
  fluentTextField()
);
```

**Step 3 — Enable custom elements in module:**

```typescript
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";

@NgModule({
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  // ...
})
export class AppModule {}
```

**Step 4 — Use in templates with property binding:**

```html
<fluent-text-field
  [placeholder]="'Enter your name'"
  (change)="onNameChange($event)"
></fluent-text-field>

<fluent-button
  [appearance]="'accent'"
  [disabled]="isSubmitting"
  (click)="onSubmit()"
>
  Submit
</fluent-button>
```

**Important:** Use property binding `[attr]` for properties and `(event)` for events.
Angular's standard attribute binding works for string attributes.

### 6.3 Vue

Vue 3 recognizes custom elements automatically when configured.

**Step 1 — Configure in `vite.config.ts`:**

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

**Step 2 — Register in `main.ts`:**

```typescript
import {
  provideFluentDesignSystem,
  fluentButton,
  fluentCard,
  fluentTextField,
} from "@fluentui/web-components";

provideFluentDesignSystem().register(
  fluentButton(),
  fluentCard(),
  fluentTextField()
);
```

**Step 3 — Use in templates with `v-bind` and `v-on`:**

```vue
<template>
  <fluent-design-system-provider :accent-base-color="brandColor">
    <fluent-text-field
      :placeholder="'Enter name'"
      @change="onNameChange"
    ></fluent-text-field>

    <fluent-button
      appearance="accent"
      :disabled="isSubmitting"
      @click="handleSubmit"
    >
      Submit
    </fluent-button>
  </fluent-design-system-provider>
</template>

<script setup lang="ts">
import { ref } from "vue";

const brandColor = ref("#0078d4");
const isSubmitting = ref(false);

function onNameChange(e: Event) {
  console.log((e.target as HTMLInputElement).value);
}

function handleSubmit() {
  isSubmitting.value = true;
}
</script>
```

### 6.4 Svelte

Svelte treats unknown HTML tags as custom elements natively.

**Step 1 — Register in `main.ts` or `+layout.ts`:**

```typescript
import {
  provideFluentDesignSystem,
  fluentButton,
  fluentCard,
  fluentTextField,
} from "@fluentui/web-components";

provideFluentDesignSystem().register(
  fluentButton(),
  fluentCard(),
  fluentTextField()
);
```

**Step 2 — Use in `.svelte` files:**

```svelte
<script lang="ts">
  let name = "";
  let submitting = false;

  function handleChange(e: Event) {
    name = (e.target as HTMLInputElement).value;
  }

  function submit() {
    submitting = true;
    console.log("Submitted:", name);
  }
</script>

<fluent-design-system-provider accent-base-color="#0078d4" base-layer-luminance="1">
  <fluent-card>
    <h2>Registration</h2>
    <fluent-text-field placeholder="Full name" on:change={handleChange}></fluent-text-field>
    <fluent-button appearance="accent" disabled={submitting} on:click={submit}>
      Register
    </fluent-button>
  </fluent-card>
</fluent-design-system-provider>

<style>
  fluent-card {
    padding: 20px;
    max-width: 400px;
  }
</style>
```

**Svelte compiler note:** If Svelte warns about unknown elements, add to `svelte.config.js`:

```js
export default {
  compilerOptions: {
    customElement: false, // app is NOT a custom element itself
  },
  // Svelte 4+: no extra config needed for consuming custom elements
};
```

---

## 7. FAST Foundation

Fluent Web Components are built on **FAST** (`@microsoft/fast-element`), Microsoft's custom element
authoring platform. Understanding FAST helps when extending or creating custom Fluent-compatible
components.

### Core FAST concepts

| Concept | Description |
|---|---|
| `FASTElement` | Base class for all custom elements |
| `@attr` | Decorator that creates observed attributes |
| `@observable` | Decorator for observable properties (no DOM attribute) |
| `html` tagged template | Efficient DOM template engine |
| `css` tagged template | Encapsulated Shadow DOM styles |
| `DesignToken` | Reactive CSS custom property system |
| `FoundationElement` | Base with design system awareness |

### Creating a custom FAST element

```typescript
import { FASTElement, customElement, attr, html, css } from "@microsoft/fast-element";

const template = html<MyAlert>`
  <div class="alert ${(x) => x.severity}">
    <slot></slot>
    <button @click="${(x) => x.dismiss()}">×</button>
  </div>
`;

const styles = css`
  :host {
    display: block;
    padding: 12px;
    border-radius: var(--control-corner-radius, 4px);
  }
  .info { background: var(--accent-fill-rest); color: white; }
  .warning { background: #fff3cd; color: #856404; }
  .error { background: #f8d7da; color: #721c24; }
`;

@customElement({ name: "my-alert", template, styles })
export class MyAlert extends FASTElement {
  @attr severity: "info" | "warning" | "error" = "info";

  dismiss() {
    this.$emit("dismissed");
    this.remove();
  }
}
```

### FAST template bindings

| Syntax | Purpose |
|---|---|
| `${x => x.prop}` | One-way property binding |
| `${x => x.prop ? "yes" : "no"}` | Conditional text |
| `?attr="${x => x.boolProp}"` | Boolean attribute |
| `@event="${(x, c) => x.handler(c.event)}"` | Event handler |
| `<template when="${x => x.show}">` | Conditional rendering |
| `<template repeat.for="${x => x.items}">` | List rendering |

---

## 8. Theming

### Brand color theming

Map your brand to the Fluent palette by setting `accent-base-color`:

```html
<!-- Microsoft blue (default) -->
<fluent-design-system-provider accent-base-color="#0078d4"></fluent-design-system-provider>

<!-- Custom green brand -->
<fluent-design-system-provider accent-base-color="#107c10"></fluent-design-system-provider>

<!-- Custom orange brand -->
<fluent-design-system-provider accent-base-color="#ff8c00"></fluent-design-system-provider>
```

The design system automatically derives an entire palette (hover, pressed, focus states) from the
base color.

### Teams theme mapping

To match Microsoft Teams themes in Web Components:

```js
const teamsThemes = {
  default: { accent: "#6264A7", luminance: 1 },
  dark: { accent: "#6264A7", luminance: 0.15 },
  highContrast: { accent: "#FFFF00", luminance: 0 },
};

function applyTeamsTheme(themeName) {
  const provider = document.querySelector("fluent-design-system-provider");
  const theme = teamsThemes[themeName];
  provider.setAttribute("accent-base-color", theme.accent);
  provider.setAttribute("base-layer-luminance", String(theme.luminance));
}
```

### High contrast support

Web Components respect the OS forced-colors mode via CSS `forced-colors` media query. The FAST
foundation handles this automatically. To test:

```css
@media (forced-colors: active) {
  /* Override styles for Windows High Contrast Mode */
  :host {
    border: 1px solid ButtonText;
  }
}
```

### CSS custom property override at component level

```html
<fluent-button
  style="--accent-fill-rest: #107c10; --accent-fill-hover: #0e6b0e;"
  appearance="accent"
>
  Green Override
</fluent-button>
```

---

## 9. Accessibility

### ARIA in Shadow DOM

Custom elements use Shadow DOM, which creates challenges for ARIA references (e.g., `aria-labelledby`
pointing to an element in the light DOM). Fluent Web Components handle this via:

1. **Delegated focus** — `delegatesFocus: true` on shadow root
2. **ARIA reflection** — Attributes set on the host are forwarded into the shadow root
3. **Slot-based labeling** — Named slots allow label association

```html
<!-- Correct: label association via slot -->
<fluent-field label-position="above">
  <label slot="label">Username</label>
  <fluent-text-field slot="input" required></fluent-text-field>
</fluent-field>
```

### Keyboard navigation patterns

| Component | Key | Action |
|---|---|---|
| Button | Enter, Space | Activate |
| Checkbox | Space | Toggle |
| Radio group | Arrow keys | Move selection |
| Tabs | Arrow keys | Switch tab |
| Menu | Arrow keys, Enter | Navigate, select |
| Accordion | Enter, Space | Toggle section |
| Dialog | Escape | Close |
| Combobox | Arrow keys, Enter | Navigate, select option |
| Data grid | Arrow keys | Cell navigation |

### Focus management

```js
// Move focus into a dialog after opening
const dialog = document.querySelector("fluent-dialog");
dialog.hidden = false;
dialog.focus(); // trap-focus handles the rest

// Return focus after dialog closes
dialog.addEventListener("dismiss", () => {
  triggerButton.focus();
});
```

### Screen reader testing checklist

- [ ] Every interactive control announces its role and label
- [ ] State changes (checked, expanded, selected) are announced
- [ ] Error messages are linked via `aria-describedby` or live regions
- [ ] Data grid announces row/column position
- [ ] Dialog announces its title on open
- [ ] Loading spinners use `aria-busy` and `aria-label`

---

## 10. Cross-references

| Topic | Skill / Reference |
|---|---|
| Core Fluent 2 tokens, colors, typography | `fluent-design-system` (core skill) |
| Griffel CSS-in-JS for React | `fluent-griffel` |
| React v9 component library | `fluent-design-system` — component catalog |
| Forms, validation, field patterns | `fluent-forms` |
| Charts and data visualization | `fluent-charting` |
| iOS, Android, cross-platform | `fluent-cross-platform` |
| Next.js integration | `fluent-nextjs` |
| Extensibility, custom components | `fluent-extensibility` |

### Reference files

- **Component catalog (full):** `${CLAUDE_PLUGIN_ROOT}/skills/fluent-web-components/references/web-components-catalog.md`
- **Core component catalog (React):** `${CLAUDE_PLUGIN_ROOT}/skills/fluent-design-system/references/component-catalog.md`
- **Token reference:** `${CLAUDE_PLUGIN_ROOT}/skills/fluent-design-system/references/token-reference.md`

### Command

To scaffold a new Web Component integration:

```
/fluent-ui-design:web-component <component-name> --framework=<vanilla|angular|vue|svelte>
```
