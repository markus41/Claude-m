---
name: fluent-ui-design:web-component
description: Scaffold a Fluent Web Component integration — register components, set up design tokens, and generate framework-specific wrapper code.
argument-hint: "<component-name> [--framework=<vanilla|angular|vue|svelte>] [--all]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
---

# Scaffold a Fluent Web Component Integration

Set up Fluent UI Web Components for any framework — register custom elements, configure design tokens,
and generate framework-specific wrapper/binding code.

## Arguments

- `<component-name>` — Fluent Web Component name without prefix (e.g., `button`, `data-grid`, `card`).
  Use `--all` to register all components.
- `--framework=<vanilla|angular|vue|svelte>` — Target framework (default: `vanilla`)
- `--all` — Register all Fluent Web Components instead of a single component

## Workflow

### 1. Determine target framework

Inspect the project to detect the framework in use:

```
# Check for framework indicators
- Read package.json for @angular/core, vue, svelte dependencies
- Check for angular.json, vue.config.js / vite.config.ts with vue plugin, svelte.config.js
- If --framework is provided, use that; otherwise auto-detect
- Default to vanilla if no framework is detected
```

**Auto-detection rules:**
| File / dependency | Framework |
|---|---|
| `@angular/core` in package.json | `angular` |
| `vue` in package.json | `vue` |
| `svelte` in package.json | `svelte` |
| None of the above | `vanilla` |

### 2. Install @fluentui/web-components

Run the appropriate install command:

```bash
# Detect package manager from lock file
# package-lock.json → npm
# yarn.lock → yarn
# pnpm-lock.yaml → pnpm

npm install @fluentui/web-components
# or
yarn add @fluentui/web-components
# or
pnpm add @fluentui/web-components
```

### 3. Generate component registration code

**Read the reference for component details:**

```
${CLAUDE_PLUGIN_ROOT}/skills/fluent-web-components/references/web-components-catalog.md
```

**If `--all` is specified**, generate a registration file that imports all components:

```typescript
// fluent-registration.ts
import { provideFluentDesignSystem, allComponents } from "@fluentui/web-components";

provideFluentDesignSystem().register(allComponents);
```

**If a specific component is named**, generate selective registration:

```typescript
// fluent-registration.ts
import {
  provideFluentDesignSystem,
  fluentButton,    // ← mapped from component-name argument
} from "@fluentui/web-components";

provideFluentDesignSystem().register(
  fluentButton(),  // ← mapped from component-name argument
);
```

**Component name mapping rules:**

| Argument | Import | Registration |
|---|---|---|
| `button` | `fluentButton` | `fluentButton()` |
| `data-grid` | `fluentDataGrid, fluentDataGridRow, fluentDataGridCell` | All three |
| `accordion` | `fluentAccordion, fluentAccordionItem` | Both |
| `tabs` | `fluentTabs, fluentTab, fluentTabPanel` | All three |
| `menu` | `fluentMenu, fluentMenuItem, fluentMenuList` | All three |
| `breadcrumb` | `fluentBreadcrumb, fluentBreadcrumbItem` | Both |
| `radio` | `fluentRadio, fluentRadioGroup` | Both |
| `slider` | `fluentSlider, fluentSliderLabel` | Both |
| `combobox` | `fluentCombobox, fluentOption` | Both |
| `select` | `fluentSelect, fluentOption` | Both |
| Any other | `fluent<PascalCase>` | `fluent<PascalCase>()` |

### 4. Create framework-specific wrapper if needed

#### vanilla

No wrapper needed. Generate an HTML file with the component usage:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Fluent Web Component — <component-name></title>
  <script type="module" src="./fluent-registration.js"></script>
</head>
<body>
  <fluent-design-system-provider
    fill-color="#ffffff"
    accent-base-color="#0078d4"
    base-layer-luminance="1"
  >
    <!-- Component usage example here -->
  </fluent-design-system-provider>
</body>
</html>
```

#### angular

1. **Check for `CUSTOM_ELEMENTS_SCHEMA`** in `app.module.ts` or standalone component. Add if missing.
2. **Add registration import** to `main.ts`.
3. **Generate an Angular component** that uses the Fluent Web Component with proper property binding
   and event handling:

```typescript
import { Component, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";

@Component({
  selector: "app-fluent-<component-name>-example",
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <!-- Fluent Web Component usage with Angular bindings -->
  `,
})
export class Fluent<PascalName>ExampleComponent {
  // Event handlers and state
}
```

#### vue

1. **Check `vite.config.ts`** for `isCustomElement` compiler option. Add if missing.
2. **Add registration import** to `main.ts`.
3. **Generate a Vue SFC** (`.vue` file) with `v-bind` and `v-on` bindings:

```vue
<template>
  <fluent-design-system-provider :accent-base-color="brandColor">
    <!-- Component usage with Vue bindings -->
  </fluent-design-system-provider>
</template>

<script setup lang="ts">
// Reactive state and event handlers
</script>
```

#### svelte

1. **Add registration import** to entry point or `+layout.ts`.
2. **Generate a `.svelte` file** with Svelte bindings:

```svelte
<script lang="ts">
  // State and handlers
</script>

<!-- Component usage with Svelte on: bindings -->
```

### 5. Set up design token provider

If no `<fluent-design-system-provider>` exists in the project, wrap the app root:

- **vanilla:** Add to `index.html` body
- **angular:** Add to `app.component.html` or root template
- **vue:** Add to `App.vue` template
- **svelte:** Add to `+layout.svelte` or root component

Default provider configuration:

```html
<fluent-design-system-provider
  fill-color="#ffffff"
  accent-base-color="#0078d4"
  neutral-base-color="#808080"
  base-layer-luminance="1"
>
  <!-- App content -->
</fluent-design-system-provider>
```

### 6. Generate usage example

Create a working example that demonstrates the component with:
- Basic usage with common attributes
- Event handling appropriate to the framework
- Design token integration
- Accessibility attributes (ARIA labels, keyboard handling)

**Read the full component API from the reference:**

```
${CLAUDE_PLUGIN_ROOT}/skills/fluent-web-components/references/web-components-catalog.md
```

## Output Files

| Framework | Files generated |
|---|---|
| `vanilla` | `fluent-registration.ts`, `index.html` |
| `angular` | `fluent-registration.ts` (in `src/`), example component |
| `vue` | `fluent-registration.ts` (in `src/`), example `.vue` component |
| `svelte` | `fluent-registration.ts` (in `src/`), example `.svelte` component |

## Quality Checklist

- [ ] `@fluentui/web-components` is installed
- [ ] Only needed components are registered (unless `--all`)
- [ ] Design system provider wraps the component tree
- [ ] Framework-specific binding syntax is correct
- [ ] Event handlers use the right pattern for the framework
- [ ] Accessibility: ARIA labels present, keyboard navigation works
- [ ] TypeScript types are correct (no `any` except for Web Component element refs)
- [ ] Example renders and is functional

## Cross-references

- **Full component API catalog:** `${CLAUDE_PLUGIN_ROOT}/skills/fluent-web-components/references/web-components-catalog.md`
- **Core design system skill:** `${CLAUDE_PLUGIN_ROOT}/skills/fluent-design-system/SKILL.md`
- **Token reference:** `${CLAUDE_PLUGIN_ROOT}/skills/fluent-design-system/references/token-reference.md`
- **Griffel styling (React):** `${CLAUDE_PLUGIN_ROOT}/skills/fluent-griffel/SKILL.md`
