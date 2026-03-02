---
name: teams-manifest
description: "Generate or validate a Teams app manifest (v1.17+)"
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

# Teams App Manifest

Generate a new `manifest.json` or validate an existing one against the Teams app manifest schema v1.17+.

## Instructions

### Mode: Generate (--generate or default when no manifest exists)

#### 1. Gather App Information

Ask the user for:
- **App name** (short and full)
- **Description** (short ≤80 chars, full ≤4000 chars)
- **Developer info** (name, website URL, privacy URL, terms URL)
- **App capabilities** — which of: bot, message extension, static tab, configurable tab
- **Bot ID** (if bot/message extension) — or use `{{BOT_ID}}` placeholder for Teams Toolkit
- **Hosting domain** (for `validDomains`)
- **SSO** — whether to include `webApplicationInfo` section

#### 2. Generate Manifest

Create `appPackage/manifest.json` with:
- `$schema` pointing to the v1.17 schema
- `manifestVersion`: `"1.17"`
- `id`: `"{{APP_ID}}"` (Teams Toolkit placeholder) or a generated UUID
- All required developer, name, description, and icon fields
- Capability-specific sections (`bots`, `composeExtensions`, `staticTabs`, `configurableTabs`)
- `validDomains` with the hosting domain
- `webApplicationInfo` if SSO is requested

#### 3. Create Placeholder Icons

If `appPackage/color.png` and `appPackage/outline.png` do not exist, inform the user they need to create:
- `color.png`: 192x192 pixel PNG
- `outline.png`: 32x32 pixel PNG with transparent background

### Mode: Validate (--validate)

#### 1. Locate Manifest

Find `manifest.json` at the provided `--path` or search in `appPackage/manifest.json`.

#### 2. Run Schema Validation

If Teams Toolkit is installed:
```bash
teamsapp validate --manifest-path <path>
```

#### 3. Run Additional Checks

Regardless of Teams Toolkit availability, check:
- All required fields are present and non-empty
- `id` and all `botId` values are valid UUIDs (not placeholder zeros)
- `name.short` ≤ 30 chars, `description.short` ≤ 80 chars, `description.full` ≤ 4000 chars
- `icons.color` and `icons.outline` files exist in the same directory
- Every domain in tab URLs appears in `validDomains`
- `composeExtensions[].botId` matches `bots[].botId` (if both exist)
- No `http://` URLs (must be HTTPS) except `localhost` for dev
- `accentColor` is a valid hex color (#RRGGBB)

#### 4. Report Results

Display a table of validation results:
| Check | Status | Details |
|-------|--------|---------|
| Required fields | PASS/FAIL | List missing fields |
| GUID validity | PASS/FAIL | List invalid GUIDs |
| ... | ... | ... |

Provide fix suggestions for any failures.
