---
name: pa-deploy
description: Pack and deploy a Power Apps canvas app or solution to a Power Platform environment
argument-hint: "<canvas|solution> --path <dir> --environment <url> [--managed] [--publish]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Deploy Power App

Pack and deploy a canvas app or Dataverse solution to a Power Platform environment using the PAC CLI.

## Inputs

| Argument | Required | Default | Description |
|---|---|---|---|
| `<canvas\|solution>` | Yes | — | Deployment type: `canvas` (canvas app from source files) or `solution` (Dataverse solution) |
| `--path` | Yes | — | Path to the source directory (canvas app src/ or solution folder) |
| `--environment` | Yes | — | Target environment URL (e.g., `https://org12345.crm.dynamics.com`) |
| `--managed` | No | `false` | If set, pack as a managed solution (cannot be edited in target) |
| `--publish` | No | `false` | If set, publish all customizations after import |

## Instructions

### Step 1: Validate Prerequisites

1. Check that `pac` CLI is installed:
   ```bash
   pac --version
   ```
   If not found, instruct the user to install it: `dotnet tool install --global Microsoft.PowerApps.CLI.Tool` or `npm install -g pac`.

2. Check PAC CLI authentication:
   ```bash
   pac auth list
   ```
   If no auth profile exists for the target environment, run:
   ```bash
   pac auth create --environment <environment-url>
   ```
   This opens a browser for interactive login.

3. Verify the source path exists and contains expected files:
   - **Canvas**: Check for `App.pa.yaml` or `App.fx.yaml` or `CanvasManifest.json` in `--path`.
   - **Solution**: Check for `Solution.xml` or `*.cdsproj` in `--path`.

### Step 2: Deploy Canvas App

**If deploying `canvas`:**

1. **Pack the source files into .msapp:**

   ```bash
   pac canvas pack --msapp <app-name>.msapp --sources <path>
   ```

2. **Validate the packed file (optional but recommended):**

   ```bash
   pac canvas validate --msapp <app-name>.msapp
   ```

   If validation errors occur, display them and stop. Suggest fixes based on error codes (see `references/canvas-app-source.md`).

3. **Wrap in a solution for import:**

   Canvas apps must be imported inside a Dataverse solution. If no solution wrapper exists:

   ```bash
   # Create a temporary solution wrapper
   pac solution init --publisher-name TempPublisher --publisher-prefix tmp --outputDirectory _deploy_wrapper
   # Add the canvas app reference
   pac solution add-reference --path <app-name>.msapp
   # Pack the solution
   pac solution pack --zipfile <app-name>_solution.zip --folder _deploy_wrapper
   ```

4. **Import the solution:**

   ```bash
   pac solution import --path <app-name>_solution.zip --environment <environment-url>
   ```

   Add `--publish-changes` if `--publish` is set.

### Step 3: Deploy Solution

**If deploying `solution`:**

1. **Pack the solution:**

   ```bash
   pac solution pack \
     --zipfile <app-name>.zip \
     --folder <path> \
     --type $(if --managed then "Managed" else "Unmanaged")
   ```

   Alternatively, if the solution was already exported as a zip:

   ```bash
   pac solution import --path <path-to-zip> --environment <environment-url>
   ```

2. **Import:**

   ```bash
   pac solution import \
     --path <app-name>.zip \
     --environment <environment-url>
   ```

3. **Publish customizations (if `--publish`):**

   ```bash
   pac solution publish
   ```

### Step 4: Verify Deployment

After import completes:

1. Display the import result status.
2. Construct the app URL:
   - Canvas: `https://apps.powerapps.com/play/e/<environment-id>/a/<app-id>`
   - Model-driven: `https://<org>.crm.dynamics.com/main.aspx?appid=<app-id>`
3. Display the URL for the user to open the app.

### Step 5: Output Summary

Display:

1. Deployment status (success or failure with error details).
2. App URL in the target environment.
3. Solution version imported.
4. Rollback instructions:
   - "To rollback, delete the solution from the target environment:"
   - `pac solution delete --solution-name <solution-unique-name> --environment <environment-url>`
   - "Or import the previous version of the solution zip."

## Error Handling

| Error | Cause | Fix |
|---|---|---|
| `Authentication required` | No PAC auth profile | Run `pac auth create --environment <url>` |
| `Solution import failed — missing dependency` | Target environment lacks a required component | Install dependencies first; check `Solution.xml` for required components |
| `Canvas pack failed` | Invalid source files | Run `pac canvas validate` and fix reported errors |
| `Environment not found` | Wrong URL or no access | Verify environment URL and user permissions |
| `Managed solution cannot be edited` | Imported as managed | Re-import as unmanaged, or create a new unmanaged solution layer |

## Reference Files

- Canvas app source format: `references/canvas-app-source.md`
- Canvas app patterns: `references/canvas-apps.md`
- Model-driven configuration: `references/model-driven-apps.md`
