---
name: teams-manifest
description: "Generate or validate a Teams app manifest v1.25 — includes supportsChannelFeatures, nestedAppAuthInfo, backgroundLoadConfiguration, agenticUserTemplates"
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

# Teams App Manifest v1.25

Generate a new `manifest.json` or validate an existing one against the Teams app manifest schema v1.25.

## Instructions

### Mode: Generate (--generate or default when no manifest exists)

#### 1. Gather App Information

Ask the user for:
- **App name** (short and full)
- **Description** (short ≤80 chars, full ≤4000 chars)
- **Developer info** (name, website URL, privacy URL, terms URL)
- **App capabilities** — which of: bot, message extension, static tab, configurable tab, meeting app, custom engine agent
- **Bot ID** (if bot/message extension) — or use `{{BOT_ID}}` placeholder for M365 Agents Toolkit
- **Tenant ID** — required for single-tenant bot registration (`APP_TENANTID`)
- **Hosting domain** (for `validDomains`)
- **SSO** — whether to include `webApplicationInfo` and `nestedAppAuthInfo` (NAA)
- **Meeting app** — whether to include meeting context scopes
- **Agent templates** — whether to include `agenticUserTemplates`

#### 2. Generate Manifest

Create `appPackage/manifest.json` with:
- `$schema` pointing to v1.25 schema
- `manifestVersion`: `"1.25"`
- `id`: `"{{APP_ID}}"` (M365 Agents Toolkit placeholder) or a generated UUID
- All required developer, name, description, and icon fields
- Capability-specific sections (bots, composeExtensions, staticTabs, configurableTabs)
- `validDomains` with the hosting domain
- `webApplicationInfo` if SSO is requested
- `nestedAppAuthInfo` if NAA is requested
- `backgroundLoadConfiguration` if preloading is desired
- `agenticUserTemplates` if agent templates are requested
- `supportsChannelFeatures: true` on configurable tabs
- `authorization.permissions.resourceSpecific` for RSC permissions

#### 3. Create Placeholder Icons

If `appPackage/color.png` and `appPackage/outline.png` do not exist, inform the user they need to create:
- `color.png`: 192x192 pixel PNG
- `outline.png`: 32x32 pixel PNG with transparent background

### Mode: Validate (--validate)

#### 1. Locate Manifest

Find `manifest.json` at the provided `--path` or search in `appPackage/manifest.json`.

#### 2. Run Schema Validation

If M365 Agents Toolkit is installed:
```bash
m365agents validate --manifest-path <path>
```

#### 3. Run Additional Checks

Check:
- All required fields are present and non-empty
- `manifestVersion` is `"1.25"` (warn if using older schema)
- `$schema` URL matches `manifestVersion` value
- `id` and all `botId` values are valid UUIDs (not placeholder zeros)
- `name.short` ≤ 30 chars, `description.short` ≤ 80 chars, `description.full` ≤ 4000 chars
- `icons.color` and `icons.outline` files exist in the same directory
- Every domain in tab URLs appears in `validDomains`
- `composeExtensions[].botId` matches `bots[].botId` (if both exist)
- No `http://` URLs (must be HTTPS) except `localhost` for dev
- `accentColor` is a valid hex color (#RRGGBB)
- **v1.25-specific checks**:
  - `nestedAppAuthInfo.accessTokenAcceptedVersion` is `2` (not `1`)
  - `agenticUserTemplates` entries have `id`, `title`, `description`, and `prompt`
  - `configurableTabs` with meeting contexts include appropriate RSC permissions
  - `supportsChannelFeatures` is boolean (not string)
- **Known v1.25 bug checks**:
  - Warn if `Input.Text.regex` patterns are used (validator may reject valid regex)
  - Warn that Dev Portal may drop `nestedAppAuthInfo` on save

#### 4. Report Results

Display a table of validation results with fix suggestions for any failures.
