---
name: teams-migrate
description: "Migration guide from Teams Toolkit (TeamsFx) to M365 Agents Toolkit — manifest v1.17→v1.25, teamsapp→m365agents, multi-tenant→single-tenant"
argument-hint: "[--path <project-root>] [--dry-run]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Migrate to M365 Agents Toolkit

Guide migration of an existing Teams Toolkit (TeamsFx) project to the M365 Agents Toolkit with manifest v1.25, single-tenant auth, and the new dialog namespace.

## Instructions

### 1. Analyze the Existing Project

Scan the project at `--path` (default: current directory) for:
- `teamsapp.yml` / `teamsapp.local.yml` — legacy config files
- `appPackage/manifest.json` — current manifest version
- `package.json` — dependencies including `@microsoft/teamsapp-cli`, `botbuilder` versions
- `.env*` files — environment variable structure
- Source files — usage of deprecated APIs (`tasks.startTask`, `tasks.submitTask`, multi-tenant adapter config)

If `--dry-run` is set, only report what would change without modifying files.

### 2. Report Migration Scope

Display a migration assessment:

| Area | Current | Target | Changes Required |
|------|---------|--------|-----------------|
| CLI | `@microsoft/teamsapp-cli` | `@microsoft/m365agentstoolkit-cli` | Reinstall CLI |
| Config file | `teamsapp.yml` | `m365agents.yml` | Rename + update version |
| Manifest schema | v1.17 (or earlier) | v1.25 | Update schema URL and version |
| Bot auth | Multi-tenant | Single-tenant | Add `APP_TENANTID`, update adapter |
| Task modules | `tasks` namespace | `dialog` namespace | Update client-side code |
| Bot registration | MultiTenant | SingleTenant | Update Azure Bot + Bicep |

### 3. Migrate CLI and Config (Step 1)

```bash
# Uninstall legacy CLI
npm uninstall -g @microsoft/teamsapp-cli

# Install M365 Agents Toolkit CLI
npm install -g @microsoft/m365agentstoolkit-cli
```

Rename config files:
- `teamsapp.yml` → `m365agents.yml`
- `teamsapp.local.yml` → `m365agents.local.yml`

Update the version field in the YAML:
```yaml
# Before
version: v1.4

# After
version: v1.6
```

### 4. Migrate Manifest to v1.25 (Step 2)

Update `appPackage/manifest.json`:

```diff
- "$schema": "https://developer.microsoft.com/json-schemas/teams/v1.17/MicrosoftTeams.schema.json",
- "manifestVersion": "1.17",
+ "$schema": "https://developer.microsoft.com/json-schemas/teams/v1.25/MicrosoftTeams.schema.json",
+ "manifestVersion": "1.25",
```

Add new v1.25 fields as applicable:
- `supportsChannelFeatures: true` on configurable tabs
- `nestedAppAuthInfo` for NAA (if SSO is used)
- `backgroundLoadConfiguration` (optional)
- `agenticUserTemplates` (if building agent-like experiences)

**Known v1.25 bugs to warn about**:
1. Regex validation may reject valid patterns — validate locally
2. Dev Portal may drop `nestedAppAuthInfo` on save — author in codebase only

### 5. Migrate to Single-Tenant Auth (Step 3)

**Update `.env`**:
```diff
  BOT_ID=<app-id>
  BOT_PASSWORD=<secret>
+ APP_TENANTID=<tenant-id>
```

**Update bot adapter** in `src/index.ts`:
```diff
- const adapter = new CloudAdapter();
+ const credentialsFactory = new ConfigurationServiceClientCredentialFactory({
+   MicrosoftAppId: process.env.BOT_ID!,
+   MicrosoftAppPassword: process.env.BOT_PASSWORD!,
+   MicrosoftAppType: "SingleTenant",
+   MicrosoftAppTenantId: process.env.APP_TENANTID!,
+ });
+ const botFrameworkAuthentication = new ConfigurationBotFrameworkAuthentication({}, credentialsFactory);
+ const adapter = new CloudAdapter(botFrameworkAuthentication);
```

**Update Bicep templates** (`infra/`):
```diff
  properties: {
    msaAppId: botAadAppClientId
-   msaAppType: 'MultiTenant'
+   msaAppType: 'SingleTenant'
+   msaAppTenantId: appTenantId
  }
```

**Update Azure Bot resource** (if already deployed):
- Azure Portal > Bot resource > Configuration > Microsoft App Type → Single Tenant
- Set the Tenant ID

### 6. Migrate Task Modules to Dialog Namespace (Step 4)

Search for deprecated `tasks` namespace usage:

```bash
grep -rn "tasks.startTask\|tasks.submitTask\|tasks.updateTask" src/
```

Replace each occurrence:

| Deprecated | Replacement |
|-----------|-------------|
| `microsoftTeams.tasks.startTask(taskInfo, callback)` | `dialog.url.open(dialogInfo, callback)` or `dialog.adaptiveCard.open(cardInfo, callback)` |
| `microsoftTeams.tasks.submitTask(result)` | `dialog.url.submit(result)` |
| `import { tasks } from "@microsoft/teams-js"` | `import { dialog } from "@microsoft/teams-js"` |

**Note**: Bot-side handlers (`handleTeamsTaskModuleFetch`, `handleTeamsTaskModuleSubmit`) do NOT need renaming — only the client-side code changes.

### 7. Update Dependencies (Step 5)

```bash
# Update bot framework packages
npm install botbuilder@latest botbuilder-dialogs@latest

# Update Teams JS SDK (ensure v2.19+ for dialog namespace)
npm install @microsoft/teams-js@latest

# Remove legacy references
npm uninstall @microsoft/teamsfx  # if present
```

### 8. Update CI/CD (Step 6)

Search for `teamsapp` references in CI/CD files:

```bash
grep -rn "teamsapp\|@microsoft/teamsapp-cli" .github/ azure-pipelines.yml
```

Replace:
- `npm install -g @microsoft/teamsapp-cli` → `npm install -g @microsoft/m365agentstoolkit-cli`
- `teamsapp provision` → `m365agents provision`
- `teamsapp deploy` → `m365agents deploy`
- `teamsapp publish` → `m365agents publish`
- `teamsapp validate` → `m365agents validate`

### 9. Validate Migration

```bash
# Validate the updated manifest
m365agents validate --manifest-path ./appPackage/manifest.json

# Test locally with Agents Playground
m365agents preview --local

# Run existing tests
npm test
```

### 10. Display Migration Report

Show a summary table:

| Step | Status | Details |
|------|--------|---------|
| CLI migration | DONE/SKIPPED | Installed `m365agentstoolkit-cli` |
| Config rename | DONE/SKIPPED | `teamsapp.yml` → `m365agents.yml` |
| Manifest v1.25 | DONE/SKIPPED | Updated schema + new fields |
| Single-tenant | DONE/SKIPPED | Added `APP_TENANTID`, updated adapter |
| Dialog namespace | DONE/SKIPPED | Migrated N occurrences |
| Dependencies | DONE/SKIPPED | Updated packages |
| CI/CD | DONE/SKIPPED | Updated pipeline references |

List any manual steps the user must complete:
- Update Azure Bot resource tenancy in Azure Portal
- Reconfigure OAuth connections for single-tenant
- Update Entra ID app registration redirect URIs
- Test in Teams after sideloading the updated package
