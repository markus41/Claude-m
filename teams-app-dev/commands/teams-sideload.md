---
name: teams-sideload
description: "Package and sideload a Teams app for testing"
argument-hint: "[--path <appPackage-dir>] [--env <environment>]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
---

# Package and Sideload a Teams App

Build the app package (ZIP) and sideload it into Teams for testing.

## Instructions

### 1. Locate App Package Files

Find the manifest and icons:
- `--path` specifies the appPackage directory (default: `./appPackage`)
- Required files: `manifest.json`, `color.png`, `outline.png`

Verify all three files exist. If missing, tell the user which files are needed.

### 2. Resolve Template Variables

If the manifest contains `{{VAR}}` placeholders (Teams Toolkit style):
- Read the environment file (`env/.env.<env>` or `.env`) to get variable values
- Replace all `{{VAR}}` with their values in a temporary copy of the manifest
- Common variables: `APP_ID`, `BOT_ID`, `BOT_ENDPOINT`, `AZURE_CLIENT_ID`, `TAB_ENDPOINT`

If any variable is unresolved, warn the user and list the missing variables.

### 3. Validate Before Packaging

Run quick validation on the resolved manifest:
- `id` is a valid, non-placeholder GUID
- `botId` (if present) is a valid, non-placeholder GUID
- `validDomains` does not contain `localhost` (unless explicitly developing locally)
- All referenced icon files exist

### 4. Create the ZIP Package

**Option A: Teams Toolkit (preferred)**:
```bash
teamsapp package --manifest-path <path>/manifest.json --output-zip-path ./appPackage/build/appPackage.zip
```

**Option B: Manual packaging**:
```bash
cd <appPackage-dir>
# Create ZIP with manifest.json, color.png, outline.png at the root level
zip -j ../appPackage.zip manifest.json color.png outline.png
```

The ZIP must contain the three files at the **root level** (no subdirectories).

### 5. Sideload to Teams

**Option A: Teams Toolkit**:
```bash
teamsapp preview --local    # For local development
teamsapp preview --remote   # For deployed app
```

**Option B: Manual sideload**:
1. Open Microsoft Teams (desktop or web).
2. Go to **Apps** (left sidebar) > **Manage your apps** > **Upload an app**.
3. Select **Upload a custom app** (or **Upload for my org** if publishing to org).
4. Choose the ZIP file created in Step 4.
5. Teams will show a preview of the app — click **Add** to install.

If "Upload a custom app" is not visible, the org admin must enable custom app sideloading:
- Teams Admin Center > Teams apps > Setup policies > Global policy > Enable "Upload custom apps"

### 6. Verify Installation

After sideloading:
- **Bot**: Send a message in the chat where the bot was added. Check for a response.
- **Tab**: Open the tab and verify content loads.
- **Message extension**: Open the compose box, click the `...` menu, and find the extension.

If the app fails to install, check:
- The bot endpoint is reachable (use `curl <endpoint>/api/messages`)
- The manifest passes validation (`/teams-manifest --validate`)
- Sideloading is enabled in the tenant
