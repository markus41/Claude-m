---
name: teams-manifest
description: "Generate or validate a Microsoft 365 app manifest (v1.25)"
argument-hint: "[--validate] [--generate] [--path <manifest-path>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Microsoft 365 App Manifest

Generate a new `manifest.json` or validate an existing one against the Microsoft 365 app manifest schema v1.25.

## Instructions

### Mode: Generate (--generate or default when no manifest exists)

#### 1. Gather App Information

Ask the user for:
- **App name** (short and full)
- **Description** (short ≤80 chars, full ≤4000 chars)
- **Developer info** (name, website URL, privacy URL, terms URL)
- **App capabilities** — which of: bot, message extension, static tab, configurable tab, meeting extension, agent
- **Bot ID** (if bot/message extension/agent) — or use `{{BOT_ID}}` placeholder for ATK
- **Hosting domain** (for `validDomains`)
- **SSO** — whether to include `webApplicationInfo` section
- **NAA** — whether to include `nestedAppAuthInfo` for Nested App Auth
- **Team-scoped** — whether to include `supportsChannelFeatures: "tier1"`
- **Agent 365 blueprint** — whether to include `agenticUserTemplates`

#### 2. Generate Manifest

Create `appPackage/manifest.json` with:
- `$schema` pointing to the v1.25 schema: `https://developer.microsoft.com/json-schemas/teams/v1.25/MicrosoftTeams.schema.json`
- `manifestVersion`: `"1.25"`
- `id`: `"{{APP_ID}}"` (ATK placeholder) or a generated UUID
- All required developer, name, description, and icon fields
- Capability-specific sections (`bots`, `composeExtensions`, `staticTabs`, `configurableTabs`)
- `validDomains` with the hosting domain
- `webApplicationInfo` if SSO is requested
- `nestedAppAuthInfo` if NAA is requested
- `supportsChannelFeatures` if team-scoped
- `agenticUserTemplates` if Agent 365 blueprint is provided
- `backgroundLoadConfiguration` for tab precaching if appropriate

#### 3. Create Placeholder Icons

If `appPackage/color.png` and `appPackage/outline.png` do not exist, inform the user they need to create:
- `color.png`: 192x192 pixel PNG
- `outline.png`: 32x32 pixel PNG with transparent background (also used for consistent Outlook/M365 appearance)

### Mode: Validate (--validate)

#### 1. Locate Manifest

Find `manifest.json` at the provided `--path` or search in `appPackage/manifest.json`.

#### 2. Run Schema Validation

If M365 Agents Toolkit is installed:
```bash
m365agents validate --manifest-path <path>
```

#### 3. Run Additional Checks

Regardless of toolkit availability, check:
- All required fields are present and non-empty
- `manifestVersion` is `"1.25"` (or explain if using an older version)
- `$schema` URL matches the declared `manifestVersion`
- `id` and all `botId` values are valid UUIDs (not placeholder zeros)
- `name.short` ≤ 30 chars, `description.short` ≤ 80 chars, `description.full` ≤ 4000 chars
- `icons.color` and `icons.outline` files exist in the same directory
- Every domain in tab URLs appears in `validDomains`
- `composeExtensions[].botId` matches `bots[].botId` (if both exist)
- No `http://` URLs (must be HTTPS) except `localhost` for dev
- `accentColor` is a valid hex color (#RRGGBB)
- `supportsChannelFeatures` is set to `"tier1"` if team-scoped tabs are present
- `webApplicationInfo` is present if SSO is used
- If `agenticUserTemplates` is present, validate blueprint ID format

#### 4. Check for Known v1.25 Issues

- Warn about the `.xll` regex validation bug (GitHub Issue #15340)
- Warn if `supportsChannelFeatures` is used (Dev Portal has known bugs saving this property — manual ZIP packaging may be needed)

#### 5. Report Results

Display a table of validation results:
| Check | Status | Details |
|-------|--------|---------|
| Required fields | PASS/FAIL | List missing fields |
| GUID validity | PASS/FAIL | List invalid GUIDs |
| Schema version match | PASS/FAIL | Expected vs actual |
| ... | ... | ... |

Provide fix suggestions for any failures.
