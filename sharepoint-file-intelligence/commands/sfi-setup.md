---
name: sharepoint-file-intelligence:sfi-setup
description: Full interactive setup for the SharePoint File Intelligence plugin — scope wizard, auth mode selection, app registration walkthrough, connectivity tests, probe scan, settings file generation, and starter category rules.
argument-hint: "[--minimal] [--reset] [--auth-only] [--scope-only]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# SharePoint File Intelligence — Interactive Setup

End-to-end guided setup. Covers scope selection, authentication, app registration, permission
validation, connectivity tests, a live probe scan, settings file generation, and a starter
categories YAML. Run this once before using any other command in this plugin.

## Flags

- `--minimal`: Install Node.js dependencies only; skip app registration, settings, and probe scan
- `--reset`: Delete existing settings file and `.delta-state.json` and start fresh
- `--auth-only`: Re-run only the authentication and connectivity steps (Steps 3–5)
- `--scope-only`: Re-run only the scope wizard and settings file update (Steps 1, 8)

---

## Step 1: Welcome and Scope Wizard

Print a welcome banner:

```
╔══════════════════════════════════════════════════════════╗
║    SharePoint File Intelligence — Setup Wizard           ║
║    This wizard takes ~10 minutes for a full setup.       ║
╚══════════════════════════════════════════════════════════╝
```

Use `AskUserQuestion` to collect scope intent:

**Q1 — What do you want to scan?** (single-select)
- SharePoint sites only
- OneDrive for Business accounts only
- Both SharePoint and OneDrive (full tenant coverage)

**Q2 — What operations will you use?** (multi-select, drives permission scoping)
- Inventory only (read all files, produce reports)
- Find and report duplicates
- Apply metadata / content-type tags to files
- Move / reorganize files between folders
- Delete duplicate files (send to recycle bin)

Record answers — they determine the minimum required permissions in Step 3.

**Q3 — Which Microsoft cloud environment?**
- Commercial (graph.microsoft.com)
- GCC (graph.microsoft.com — same endpoint, tenant is GCC)
- GCC-High (graph.microsoft.us)
- DoD (dod-graph.microsoft.us)
- China (microsoftgraph.chinacloudapi.cn)

Set `GRAPH_ENDPOINT` based on answer:
| Environment | Endpoint |
|-------------|---------|
| Commercial / GCC | `https://graph.microsoft.com/v1.0` |
| GCC-High | `https://graph.microsoft.us/v1.0` |
| DoD | `https://dod-graph.microsoft.us/v1.0` |
| China | `https://microsoftgraph.chinacloudapi.cn/v1.0` |

**Q4 — SharePoint tenant root URL** (free text)
- Example: `https://contoso.sharepoint.com`
- Used to derive the admin URL and site search endpoint.
- Skip if OneDrive-only scope was selected.

**Q5 — Which sites to include in scans?** (single-select, if SharePoint scope selected)
- Specific sites (I'll provide a list)
- All sites in the tenant
- Sites matching a keyword / path pattern

If "Specific sites" selected, ask for a comma-separated list of site URLs.

**Q6 — OneDrive scope** (single-select, if OneDrive scope selected)
- My OneDrive only (the signed-in user)
- Specific users (I'll provide a list of emails)
- All users in the tenant (requires `User.Read.All` + `Files.Read.All`)

---

## Step 2: Check Prerequisites

For each tool, run the version check and report status in a table. Do not fail on optional tools — mark them as MISSING with install instructions.

### Node.js 18+

```bash
node --version
```

- Required. If missing or < 18, instruct: "Install from https://nodejs.org/ or via `nvm install 18`."

### Azure CLI

```bash
az --version 2>/dev/null | head -1
```

- Recommended. Used for scripted app registration and token acquisition. If missing, note that portal registration is available as an alternative.

### PowerShell 7+

```bash
pwsh --version 2>/dev/null
```

- Required only if PnP PowerShell is needed (for advanced SharePoint operations). If missing, provide OS-specific install link.

### PnP PowerShell

```bash
pwsh -Command "Get-Module -ListAvailable PnP.PowerShell | Select-Object -First 1 Name,Version" 2>/dev/null
```

- Optional. Needed for tenant sharing settings, managed metadata operations, and folder permission audits. Offer to install if missing.

### jq (for token debugging)

```bash
jq --version 2>/dev/null
```

- Optional. Used in connectivity test scripts for readable output.

Print a prerequisites summary table:

```
## Prerequisites
| Tool | Required | Status | Version |
|------|----------|--------|---------|
| Node.js 18+ | Yes | OK | v20.11.0 |
| Azure CLI | Recommended | OK | 2.57.0 |
| PowerShell 7+ | Optional | MISSING | — |
| PnP PowerShell | Optional | MISSING | — |
| jq | Optional | OK | 1.7.1 |
```

If Node.js is missing or too old, stop and ask the user to install it before continuing.

**Optional: Install PnP PowerShell**

If PowerShell 7+ is available and the user wants PnP support, ask:
"Install PnP.PowerShell now? (Recommended for managed metadata and folder permission features)"

If yes:
```bash
pwsh -Command "Install-Module -Name PnP.PowerShell -Scope CurrentUser -Force -AllowClobber"
pwsh -Command "Get-Module -ListAvailable PnP.PowerShell | Select-Object Name, Version"
```

---

## Step 3: Install Node.js Dependencies

Check if `node_modules` already contains the required packages:

```bash
node -e "require('@microsoft/microsoft-graph-client'); require('@azure/identity'); console.log('OK')" 2>/dev/null
```

If missing, initialize and install:

```bash
npm init -y 2>/dev/null || true
npm install @microsoft/microsoft-graph-client @azure/identity @azure/msal-node isomorphic-fetch dotenv
```

Confirm install success. If `--minimal` is set, print a summary and stop here.

---

## Step 4: Authentication Mode Selection

Use `AskUserQuestion`:

**Q — How will you authenticate to Microsoft Graph?** (single-select)
- **App registration (service principal)** — Recommended for automated/background scans. Requires Azure admin to register an app and grant consent.
- **Delegated (device code flow)** — Easiest to start. Authenticates as your user account. Good for one-off scans but tokens expire.
- **I already have an access token** — Paste a token directly into `MICROSOFT_ACCESS_TOKEN`. Useful for testing or CI pipelines.

Store the selected `auth_mode` for the settings file.

### 4a: App Registration Path

Guide the user through registering an Entra ID app. Offer two sub-paths:

**Sub-path A: Azure CLI (automated)**

```bash
# Create the app registration
az ad app create --display-name "claude-sharepoint-file-intelligence" \
  --sign-in-audience AzureADMyOrg

# Get the app ID
APP_ID=$(az ad app list --display-name "claude-sharepoint-file-intelligence" \
  --query "[0].appId" -o tsv)
echo "Client ID: $APP_ID"

# Create a service principal
az ad sp create --id $APP_ID

# Create a client secret (valid 12 months)
az ad app credential reset --id $APP_ID --years 1 \
  --query "{clientId:appId, clientSecret:password, tenantId:tenant}" -o json
```

Collect the printed `clientId`, `clientSecret`, and `tenantId`.

**Sub-path B: Azure Portal (manual)**

Print step-by-step portal instructions:

1. Open https://portal.azure.com → **Microsoft Entra ID** → **App registrations** → **New registration**
2. Name: `claude-sharepoint-file-intelligence` | Supported account types: **Single tenant** | Redirect URI: Web → `http://localhost`
3. Click **Register** → copy **Application (client) ID** and **Directory (tenant) ID** from the Overview blade
4. Go to **API permissions** → **Add a permission** → **Microsoft Graph**

Print the permissions table based on the operations selected in Step 1 Q2:

| Permission | Type | Required for |
|---|---|---|
| `Sites.Read.All` | Application | All scan operations |
| `Files.Read.All` | Application | OneDrive scans |
| `Sites.ReadWrite.All` | Application | Apply metadata, move files |
| `Files.ReadWrite.All` | Application | OneDrive write operations |
| `User.Read.All` | Application | Tenant-wide OneDrive scan |
| `TermStore.Read.All` | Application | Managed metadata reads |
| `TermStore.ReadWrite.All` | Application | Managed metadata writes |

Only include permissions that match the operations selected in Step 1 Q2. Do not over-provision.

5. Click **Grant admin consent for [tenant name]** (requires Global Administrator or Privileged Role Administrator)
6. Go to **Certificates & secrets** → **Client secrets** → **New client secret** → set description `claude-sfi` and expiry **12 months** → copy the **Value** immediately

Ask the user to paste: Tenant ID, Client ID, Client Secret.

### 4b: Delegated (Device Code) Path

Print instructions:

```javascript
// acquire-token.js — run this once to get a delegated access token
const { PublicClientApplication } = require('@azure/msal-node');

const pca = new PublicClientApplication({
  auth: {
    clientId: process.env.AZURE_CLIENT_ID || 'YOUR_CLIENT_ID',
    authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID || 'YOUR_TENANT_ID'}`
  }
});

const scopes = [
  'https://graph.microsoft.com/Sites.Read.All',
  'https://graph.microsoft.com/Files.Read.All'
];

pca.acquireTokenByDeviceCode({ scopes, deviceCodeCallback: info => console.log(info.message) })
  .then(res => {
    console.log('\nAccess token (expires in ~1h):');
    console.log(res.accessToken);
  })
  .catch(console.error);
```

Write `acquire-token.js` to the output directory using the Write tool. Instruct the user to run it and paste the printed token.

Ask the user to paste: Tenant ID, and optionally Client ID (for a registered public client app).

### 4c: Existing Token Path

Ask the user to paste their bearer token. Confirm it is not expired by decoding the `exp` claim:

```bash
echo "TOKEN_VALUE" | cut -d'.' -f2 | base64 --decode 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Expires: {d[\"exp\"]}, UPN: {d.get(\"upn\",\"app-token\")}')" 2>/dev/null || echo "(could not decode — proceeding)"
```

---

## Step 5: Connectivity and Permissions Tests

For each test, execute the Graph call and report PASS/FAIL with the response detail.

### Test 1: Basic connectivity — Tenant info

```
GET {GRAPH_ENDPOINT}/organization?$select=displayName,id,verifiedDomains
```

Expected: HTTP 200 with `displayName`. Captures tenant name for the settings file.

### Test 2: SharePoint root access

```
GET {GRAPH_ENDPOINT}/sites/root?$select=id,displayName,webUrl
```

Expected: HTTP 200. Failure indicates `Sites.Read.All` not granted or wrong cloud endpoint.

### Test 3: Sites enumeration

```
GET {GRAPH_ENDPOINT}/sites?search=*&$select=id,displayName,webUrl&$top=5
```

Expected: HTTP 200 with at least one result. Lists first 5 sites.

### Test 4: Drive enumeration (first site found)

```
GET {GRAPH_ENDPOINT}/sites/{siteId}/drives?$select=id,name,driveType&$top=5
```

Expected: HTTP 200 with at least one drive. Captures first `driveId` for Test 5.

### Test 5: Delta query access (first drive)

```
GET {GRAPH_ENDPOINT}/drives/{driveId}/root/delta?$select=id,name,file&$top=1
```

Expected: HTTP 200. Confirms delta query permission.

### Test 6: OneDrive access (if OneDrive scope selected)

```
GET {GRAPH_ENDPOINT}/me/drive?$select=id,name,driveType,quota
```

Or for app-only:
```
GET {GRAPH_ENDPOINT}/users?$select=id,displayName,mail&$top=3
```

Expected: HTTP 200. Failure may indicate missing `User.Read.All` for app-only mode.

### Test 7: Metadata write access (if write operations selected)

```
GET {GRAPH_ENDPOINT}/sites/{siteId}/lists/{listId}/columns?$select=id,name,type&$top=5
```

Expected: HTTP 200. Note: actual PATCH test is skipped to avoid modifying data.

### Test 8: Term store access (if managed metadata selected)

```
GET {GRAPH_ENDPOINT}/sites/{siteId}/termStore?$select=id,defaultLanguageTag
```

Expected: HTTP 200 or 404 (no term store configured). 403 indicates missing `TermStore.Read.All`.

Print a results table:

```
## Connectivity Test Results
| Test | Endpoint | Status | Detail |
|------|----------|--------|--------|
| 1 Tenant info | /organization | PASS | Contoso Ltd (contoso.onmicrosoft.com) |
| 2 SharePoint root | /sites/root | PASS | root |
| 3 Sites enumeration | /sites?search=* | PASS | 47 sites found |
| 4 Drive enumeration | /sites/{id}/drives | PASS | 3 drives in first site |
| 5 Delta query | /drives/{id}/root/delta | PASS | Delta token received |
| 6 OneDrive access | /me/drive | PASS | 12.4 GB used |
| 7 Metadata read | /sites/{id}/lists/{id}/columns | PASS | 23 columns |
| 8 Term store | /sites/{id}/termStore | PASS | en-US |
```

If any REQUIRED test fails (Tests 1–5), stop and diagnose:
- 401 → token expired or invalid
- 403 → permission not granted or admin consent missing
- Wrong endpoint → confirm cloud environment selection

---

## Step 6: Probe Scan

Ask:
"Run a quick probe scan on one drive to confirm end-to-end enumeration works? This will scan the first 200 files only and write a small sample inventory to `./sp-reports/probe-scan.csv`. [Y/n]"

If yes:
1. Take the first `driveId` discovered in Test 4
2. Run delta query with `$top=200` and a single page only (do not follow nextLink)
3. Write `./sp-reports/probe-scan.csv` with the first 200 items
4. Print a mini-summary:

```
## Probe Scan Results — Shared Documents (drive: {id})
| Metric | Value |
|--------|-------|
| Files sampled | 200 |
| Extensions found | .docx (82), .xlsx (54), .pdf (41), .pptx (23) |
| Date range | 2019-03-12 → 2025-02-28 |
| Largest file | Strategy-2024.pptx (48.2 MB) |
| Files with hashes | 200 / 200 |

Probe scan saved to: ./sp-reports/probe-scan.csv
```

5. Check that hash fields (`sha1Hash`) are present in the response — warn if missing (some library configurations disable file hashing).

---

## Step 7: Save Credentials to .env

Write a `.env` file with the collected credentials:

```
MICROSOFT_TENANT_ID=<tenant-id>
MICROSOFT_CLIENT_ID=<client-id>
MICROSOFT_CLIENT_SECRET=<client-secret>
MICROSOFT_ACCESS_TOKEN=<token-if-delegated>
GRAPH_ENDPOINT=https://graph.microsoft.com/v1.0
```

- Only include `MICROSOFT_CLIENT_SECRET` if app-only auth was selected.
- Only include `MICROSOFT_ACCESS_TOKEN` if token-paste auth was selected.
- Check that `.gitignore` exists in the working directory and contains `.env`. If not, create or append it.

Print a warning:
```
⚠ .env written. This file contains credentials — never commit it to source control.
   Added to .gitignore: .env
```

---

## Step 8: Generate Settings File

Write `.claude/sharepoint-file-intelligence.local.md` with YAML frontmatter populated from
all answers collected in Steps 1 and 5:

```markdown
---
# SharePoint File Intelligence — Local Settings
# Generated by sfi-setup on {date}
# Edit this file to change scan defaults.

# Authentication
auth_mode: app          # app | delegated | token
tenant_id: "{tenantId}"
client_id: "{clientId}"
# client_secret is in .env — do not store it here

# Graph endpoint (change for sovereign clouds)
graph_endpoint: https://graph.microsoft.com/v1.0

# Scan scope
scan_scope: site        # site | onedrive | both | tenant
site_url: "{tenantRoot}/sites/{firstSiteFound}"
# Additional sites to include (one per line):
# sites:
#   - https://contoso.sharepoint.com/sites/finance
#   - https://contoso.sharepoint.com/sites/hr

# OneDrive scope (used when scan_scope is onedrive or both)
onedrive_scope: me      # me | users | tenant
# onedrive_users:
#   - jane@contoso.com
#   - bob@contoso.com

# Output
output_dir: ./sp-reports
output_format: csv      # csv | json

# Scan parameters
max_depth: 10           # 0 = unlimited
all_drives: false       # true = scan all drives per site
incremental: false      # true = use saved delta link on next run

# Classification
stale_days: 180         # files with no changes for this many days are flagged as stale
naming_convention: kebab  # kebab | title | original
min_file_size_mb: 0     # skip files smaller than this (0 = include all)

# Categories rules file (used by apply-categories command)
categories_file: ./sp-categories.yaml
---

# Notes
# - Run /sharepoint-file-intelligence:sfi-setup --auth-only to re-authenticate
# - Run /sharepoint-file-intelligence:sfi-setup --scope-only to update scan scope
# - Run /sharepoint-file-intelligence:scan-inventory to start your first full scan
```

Confirm the file was written and is readable.

---

## Step 9: Generate Starter Categories YAML

Ask:
"Generate a starter `./sp-categories.yaml` with common rules for Finance, HR, Legal, and IT? You can edit it before running `apply-categories`. [Y/n]"

If yes, write `./sp-categories.yaml`:

```yaml
# SharePoint File Intelligence — Categorization Rules
# Generated by sfi-setup on {date}
#
# Usage: /sharepoint-file-intelligence:apply-categories --rules-file ./sp-categories.yaml --dry-run
#
# Rules are evaluated top-to-bottom. First match wins unless "continue: true" is set.
# Match criteria: extensions, path_contains, name_contains, name_regex, owner_email, size_mb_gt, modified_before

rules:
  - name: Finance — budgets and reports
    match:
      extensions: [.xlsx, .xls, .csv]
      path_contains: [finance, budget, accounts, accounting, ap, ar, payroll]
    apply:
      Department: Finance
      RetentionLabel: "7-Year Financial Records"

  - name: Finance — contracts and invoices
    match:
      extensions: [.docx, .pdf]
      name_contains: [invoice, receipt, purchase-order, po-, vendor, supplier]
    apply:
      Department: Finance
      RetentionLabel: "7-Year Financial Records"
      ContentType: Financial Document

  - name: HR — policies and handbooks
    match:
      extensions: [.docx, .pdf]
      path_contains: [hr, human-resources, personnel, people-ops]
      name_contains: [policy, handbook, procedures, onboarding, benefits, payslip]
    apply:
      Department: HR
      RetentionLabel: "7-Year HR Records"
      ContentType: HR Document

  - name: Legal — contracts
    match:
      extensions: [.docx, .pdf]
      name_contains: [contract, agreement, nda, msa, sla, mou, statement-of-work, sow]
    apply:
      Department: Legal
      RetentionLabel: "10-Year Legal Records"
      ContentType: Contract

  - name: IT — technical documentation
    match:
      extensions: [.docx, .pdf, .md, .txt]
      path_contains: [it, infrastructure, helpdesk, runbook, sop]
      name_contains: [runbook, sop, architecture, network-diagram, it-policy]
    apply:
      Department: IT
      RetentionLabel: "3-Year IT Records"

  - name: Meeting notes and minutes
    match:
      extensions: [.docx, .onenote]
      name_contains: [meeting-notes, minutes, agenda, action-items]
    apply:
      ContentType: Meeting Notes

  - name: Presentations
    match:
      extensions: [.pptx, .ppt]
    apply:
      ContentType: Presentation

  # Catch-all: large old files (stale candidates)
  - name: Stale large files
    match:
      size_mb_gt: 50
      modified_before: "2023-01-01"
    apply:
      ReviewStatus: StaleCandidate
```

---

## Step 10: Final Setup Report

Print a comprehensive summary of everything configured:

```
╔══════════════════════════════════════════════════════════════════╗
║    SharePoint File Intelligence — Setup Complete                  ║
╚══════════════════════════════════════════════════════════════════╝

## Setup Summary — {date} {time}

### Environment
| Item | Value |
|------|-------|
| Tenant | Contoso Ltd (contoso.onmicrosoft.com) |
| Tenant ID | xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx |
| Cloud | Commercial (graph.microsoft.com) |
| Auth mode | App registration (service principal) |

### Permissions Granted
| Permission | Status |
|---|---|
| Sites.Read.All | GRANTED |
| Files.Read.All | GRANTED |
| Sites.ReadWrite.All | GRANTED |
| User.Read.All | GRANTED |
| TermStore.Read.All | GRANTED |

### Connectivity
| Test | Result |
|------|--------|
| Tenant info | PASS — Contoso Ltd |
| SharePoint root | PASS |
| Sites enumeration | PASS — 47 sites |
| Drive enumeration | PASS — 3 drives |
| Delta query | PASS |
| OneDrive access | PASS |
| Metadata read | PASS |
| Term store | PASS |

### Probe Scan
| Result | Value |
|--------|-------|
| Files sampled | 200 |
| Hash coverage | 100% |
| Status | PASS |

### Files Created
| File | Purpose |
|------|---------|
| .env | Credentials (gitignored) |
| .claude/sharepoint-file-intelligence.local.md | Plugin settings |
| ./sp-reports/probe-scan.csv | Sample inventory from probe |
| ./sp-categories.yaml | Starter categorization rules |

### Next Steps

1. Run your first full scan:
   /sharepoint-file-intelligence:scan-inventory --all-drives

2. Find duplicates in the inventory:
   /sharepoint-file-intelligence:find-duplicates

3. Preview metadata categories (dry run):
   /sharepoint-file-intelligence:apply-categories --dry-run

4. Ask the AI analyst for a governance plan:
   "analyze my SharePoint inventory at ./sp-reports/sharepoint-inventory.csv"

### Useful Commands
| Action | Command |
|--------|---------|
| Re-authenticate | /sharepoint-file-intelligence:sfi-setup --auth-only |
| Update scan scope | /sharepoint-file-intelligence:sfi-setup --scope-only |
| Reset everything | /sharepoint-file-intelligence:sfi-setup --reset |
```

---

## Error Handling

### Token Expired During Setup

If any API call returns 401 after credentials were configured:
1. For app-only: re-run `az account get-access-token` or re-check client secret expiry
2. For delegated: re-run `node acquire-token.js` and update `MICROSOFT_ACCESS_TOKEN` in `.env`
3. Offer to re-run from Step 5 (`--auth-only` flag)

### Admin Consent Not Granted

If Test 2 or 3 returns 403:
- Print the direct admin consent URL: `https://login.microsoftonline.com/{tenantId}/adminconsent?client_id={clientId}&redirect_uri=http://localhost`
- Instruct the user to open it as a Global Administrator to grant consent
- Re-run Tests 2–5 after consent is granted

### Wrong Cloud Endpoint

If Test 1 returns a redirect or unexpected error:
- Confirm cloud selection with the user
- Provide the correct Graph endpoint for their environment
- Re-run all connectivity tests

### Hash Fields Missing in Probe Scan

If `sha1Hash` / `quickXorHash` are absent from probe scan results:
- This is common for some SharePoint library configurations or very old documents
- The `find-duplicates` command will fall back to name+size comparison
- Print a warning: "Exact duplicate detection will use `quickXorHash` as fallback. For libraries where hashes are missing entirely, only near-duplicate strategies will be available."

---

## Important Notes

- The client secret set in Step 4 expires after the chosen duration. Set a calendar reminder to rotate it before expiry via **Entra ID** > **App registrations** > **{app}** > **Certificates & secrets**.
- For production or long-running tenant scans, prefer **certificate-based auth** over client secrets. See: https://learn.microsoft.com/en-us/azure/active-directory/develop/howto-create-self-signed-certificate
- Tenant-wide OneDrive scans make one Graph call per user. For large tenants (1000+ users), use `--incremental` after the first full scan.
- The `.env` file is written to your working directory. If running in a shared environment, use environment variables injected via CI/CD secrets instead.
- All permissions granted are **read** by default. Only `Sites.ReadWrite.All` / `Files.ReadWrite.All` are added if write operations were selected in Step 1 Q2.
