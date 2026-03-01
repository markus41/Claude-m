---
name: alm-pcf-init
description: Scaffold a new PCF (PowerApps Component Framework) control from template — field, dataset, or React-based.
argument-hint: "<name> [--type field|dataset] [--framework react] [--namespace Contoso]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# Scaffold PCF Control

Generate a new PCF control project with the appropriate template, manifest, and initial implementation.

## PAC CLI Commands

```bash
# Field control (standard DOM)
pac pcf init --namespace {Namespace} --name {ControlName} --template field

# Dataset control
pac pcf init --namespace {Namespace} --name {ControlName} --template dataset

# React field control
pac pcf init --namespace {Namespace} --name {ControlName} --template field --framework react
```

## Steps

1. Gather control requirements:
   - **Name** — PascalCase control name (e.g., `StarRating`, `CardGallery`)
   - **Namespace** — publisher namespace (e.g., `Contoso`)
   - **Type** — field (single value), dataset (collection/view), or React-based
   - **Bound properties** — what data the control reads/writes
   - **Input properties** — configuration options for makers
2. Run the scaffold command
3. Install dependencies: `npm install`
4. If React: install Fluent UI: `npm install @fluentui/react-components @fluentui/react-icons`
5. Generate a customized `ControlManifest.Input.xml` based on the user's requirements
6. Generate initial `index.ts` with proper lifecycle methods
7. If React: generate the `.tsx` component file
8. Generate CSS file with base styles

## Control Templates

### Field Control
- Bound to a single column value
- Implements: `init`, `updateView`, `getOutputs`, `destroy`
- Use for: custom inputs, visualizations of single values

### Dataset Control
- Bound to a view/collection of records
- Uses `<data-set>` in manifest instead of `<property>`
- Handles: paging, sorting, filtering, record navigation
- Use for: custom grids, galleries, charts, kanban boards

### React Control
- Uses `control-type="virtual"` in manifest
- `updateView` returns `React.ReactElement` instead of manipulating DOM
- Recommended for complex interactive UI
- Pairs with Fluent UI v9 for consistent Power Platform look

## Post-Scaffold

- Edit `ControlManifest.Input.xml` to define properties
- Implement control logic in `index.ts`
- Test: `npm start` (opens browser harness)
- Push to dev: `pac pcf push --publisher-prefix cr`
