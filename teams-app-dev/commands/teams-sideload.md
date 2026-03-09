---
name: teams-sideload
description: "Package and sideload a Teams app for testing — supports M365 Agents Toolkit and Agents Playground"
argument-hint: "[--path <appPackage-dir>] [--env <environment>] [--playground]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
---

# Package and Sideload a Teams App

Build the app package (ZIP) and sideload it into Teams for testing, or use Agents Playground for local development.

## Instructions

### 1. Choose Testing Method

- `--playground` — Use Agents Playground for local testing (no registration needed)
- Default — Package and sideload to Teams client

**Agents Playground** (recommended for local dev):
```bash
m365agents preview --local
```

If `--playground` is set, run the above and skip to Step 6.

### 2. Locate App Package Files

Find the manifest and icons:
- `--path` specifies the appPackage directory (default: `./appPackage`)
- Required files: `manifest.json`, `color.png`, `outline.png`

### 3. Resolve Template Variables

If the manifest contains `{{VAR}}` placeholders:
- Read the environment file (`env/.env.<env>` or `.env`) to get variable values
- Replace all `{{VAR}}` with their values in a temporary copy of the manifest
- Common variables: `APP_ID`, `BOT_ID`, `BOT_ENDPOINT`, `AZURE_CLIENT_ID`, `TAB_ENDPOINT`, `APP_TENANTID`

### 4. Validate Before Packaging

Run quick validation:
- `manifestVersion` is `"1.25"` (warn if older)
- `id` is a valid, non-placeholder GUID
- `botId` (if present) is a valid, non-placeholder GUID
- All referenced icon files exist

### 5. Create the ZIP Package

**Option A: M365 Agents Toolkit (preferred)**:
```bash
m365agents package --manifest-path <path>/manifest.json --output-zip-path ./appPackage/build/appPackage.zip
```

**Option B: Manual packaging**:
```bash
cd <appPackage-dir>
zip -j ../appPackage.zip manifest.json color.png outline.png
```

### 6. Sideload to Teams

**Option A: M365 Agents Toolkit**:
```bash
m365agents preview --local    # For local development
m365agents preview --remote   # For deployed app
```

**Option B: Manual sideload**:
1. Open Microsoft Teams > **Apps** > **Manage your apps** > **Upload an app**.
2. Select **Upload a custom app**.
3. Choose the ZIP file.
4. Click **Add** to install.

### 7. Verify Installation

After sideloading:
- **Bot**: Send a message and check for a response.
- **Tab**: Open the tab and verify content loads.
- **Message extension**: Open the compose box and find the extension.
- **Meeting app**: Schedule a meeting and add the app. Check side panel and stage.

If the app fails to install, check:
- The bot endpoint is reachable
- The manifest passes validation (`/teams-manifest --validate`)
- Sideloading is enabled in the tenant
- Bot is registered as **Single Tenant** with correct `APP_TENANTID`
