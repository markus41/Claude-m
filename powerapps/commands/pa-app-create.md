---
name: pa-app-create
description: Scaffold a complete Power Apps canvas app project with screens, data bindings, and formulas
argument-hint: "<app-name> --template crud|dashboard|approval|master-detail|blank [--data-source <name>] [--workflow git|pack]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - AskUserQuestion
---

# Scaffold Canvas App

Scaffold a complete Power Apps canvas app project from a template. Generates `.pa.yaml` source files ready for Power Platform Git Integration or PAC CLI pack/unpack.

## Inputs

| Argument | Required | Default | Description |
|---|---|---|---|
| `<app-name>` | Yes | — | App name (PascalCase, no spaces). Used as folder name and app title. |
| `--template` | Yes | — | Template: `crud`, `dashboard`, `approval`, `master-detail`, `blank` |
| `--data-source` | No | `Accounts` | Primary data source name (Dataverse table logical name) |
| `--workflow` | No | `git` | Deployment workflow: `git` (`.pa.yaml` for Git Integration) or `pack` (`.fx.yaml` + CanvasManifest.json for `pac canvas pack`) |

## Instructions

### Step 1: Validate Inputs

1. If `<app-name>` is missing, ask the user.
2. If `--template` is missing, ask the user to choose from: `crud`, `dashboard`, `approval`, `master-detail`, `blank`.
3. Normalize `<app-name>` to PascalCase.

### Step 2: Create Project Directory

Create the directory structure based on `--workflow`:

**For `--workflow git` (default):**

```
<app-name>/
  src/
    App.pa.yaml
    Screens/
      <screen files per template>.pa.yaml
    DataSources/
      <data-source>.pa.yaml
```

**For `--workflow pack`:**

```
<app-name>/
  src/
    App.fx.yaml
    Screens/
      <screen files per template>.fx.yaml
    CanvasManifest.json
    Connections/
    Assets/
      Images/
```

### Step 3: Generate App File

Create `App.pa.yaml` (or `App.fx.yaml`) with:

- `StartScreen` pointing to the first screen in the template
- `Theme: =PowerAppsTheme`
- Named formulas in `Formulas` property if the template uses cached data

### Step 4: Generate Screen Files

Read the template patterns from `references/app-templates.md` and generate screen files.

**Per template:**

| Template | Screens to Generate |
|---|---|
| `crud` | `scrList.pa.yaml`, `scrDetail.pa.yaml`, `scrEdit.pa.yaml` |
| `dashboard` | `scrDashboard.pa.yaml`, `scrDrillDown.pa.yaml` |
| `approval` | `scrSubmit.pa.yaml`, `scrMyRequests.pa.yaml`, `scrApproval.pa.yaml`, `scrRequestDetail.pa.yaml` |
| `master-detail` | `scrMasterDetail.pa.yaml` |
| `blank` | `scrMain.pa.yaml` |

For each screen:

1. Use the `.pa.yaml` format from `references/canvas-app-source.md`.
2. Replace placeholder data source names with `--data-source` value.
3. Follow naming conventions: `scr` screens, `gal` galleries, `btn` buttons, `txt` text inputs, `lbl` labels, `frm` forms, `ico` icons, `con` containers.
4. All `Patch`/`Remove` calls wrapped in `IfError`.
5. Gallery `Items` use delegation-safe `Filter` with `StartsWith` on the primary text column.
6. Include `Notify` calls for success and failure.

### Step 5: Generate DataSources Stub

Create a data source declaration file:

```yaml
DataSources:
  <data-source>:
    Type: Dataverse
    TableLogicalName: <data-source>
```

### Step 6: Generate CanvasManifest.json (pack workflow only)

If `--workflow pack`, generate `CanvasManifest.json` with:

- `Name`: `<app-name>`
- `ScreenOrder`: list of screen names in navigation order
- Placeholder `Id` and `FileID` (filled on first pack)

### Step 7: Output Summary

Display:

1. File tree of generated project.
2. Next steps:
   - **Git workflow**: "Commit these files and push to your connected Git branch. The Power Platform will sync automatically."
   - **Pack workflow**: "Run `pac canvas pack --msapp <app-name>.msapp --sources ./src` then use `/pa-deploy` to import."
3. Suggest `/pa-deploy` for deployment.
4. Suggest editing individual screens with `/pa-canvas-screen`.

## Reference Files

- Template patterns: `references/app-templates.md`
- `.pa.yaml` format: `references/canvas-app-source.md`
- Power Fx formulas: `references/power-fx-formulas.md`
- Canvas app patterns: `references/canvas-apps.md`
