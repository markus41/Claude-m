---
name: setup
description: Set up the M365 Admin plugin — configure Azure app registration, install dependencies, and verify Graph API connectivity
argument-hint: "[--minimal] [--with-exchange] [--with-sharepoint-pnp]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# M365 Admin Plugin Setup

Interactive guided setup for the M365 Admin plugin. Checks prerequisites, installs dependencies, walks through Azure app registration, and verifies Graph API connectivity.

## Flags

- `--minimal`: Install Node.js dependencies only; skip Azure app registration prompts and PowerShell modules
- `--with-exchange`: Include Exchange Online Management PowerShell module installation
- `--with-sharepoint-pnp`: Include PnP PowerShell module installation

Default (no flags): Full guided setup including Node.js dependencies, Azure app registration, and connectivity verification. Exchange and PnP modules are offered as optional steps.

## Integration Context Fail-Fast Check

Before any external API call, validate integration context from [`docs/integration-context.md`](../../docs/integration-context.md):
- `tenantId` (always required)
- `subscriptionId` (required for Azure-scope workflows)
- `environmentCloud`
- `principalType`
- `scopesOrRoles`

If validation fails, stop immediately and return a structured error using contract codes (`MissingIntegrationContext`, `InvalidIntegrationContext`, `ContextCloudMismatch`, `InsufficientScopesOrRoles`).
Redact tenant/subscription/object identifiers in setup output using contract redaction rules.

## Step 1: Check Prerequisites

Verify the following tools are available on the system. Report version and status for each.

### Node.js 18+

```bash
node --version
```

- Required. Must be v18.0.0 or higher.
- If missing or too old, instruct user to install from https://nodejs.org/ or via `nvm install 18`.

### Azure CLI (`az`)

```bash
az --version
```

- Recommended but not required. Used for scripted app registration and token debugging.
- If missing, note that the user can still register the app manually in the Azure Portal.

### PowerShell 7+ (`pwsh`)

```bash
pwsh --version
```

- Required only if `--with-exchange` or `--with-sharepoint-pnp` is used.
- If missing, instruct user to install from https://learn.microsoft.com/en-us/powershell/scripting/install/installing-powershell.

## Step 2: Install Node Dependencies

Initialize a Node project (if `package.json` does not already exist) and install Graph SDK dependencies.

```bash
npm init -y
npm install @azure/identity @microsoft/microsoft-graph-client isomorphic-fetch
```

Run this in the working directory (or a subdirectory the user specifies). Confirm the install completes without errors.

If `--minimal` is set, stop here and output a summary.

## Step 3: Azure App Registration

Guide the user through creating an Entra ID (Azure AD) app registration. Use `AskUserQuestion` to walk through each sub-step and collect the resulting IDs.

### 3a. Create the Registration

Instruct the user to:

1. Open the Azure Portal: https://portal.azure.com
2. Navigate to **Microsoft Entra ID** > **App registrations** > **New registration**
3. Set:
   - **Name**: e.g. `claude-m365-admin`
   - **Supported account types**: Single tenant (this organization only)
   - **Redirect URI**: Platform = Web, URI = `http://localhost` (for local dev / delegated auth)
4. Click **Register**
5. Copy the **Application (client) ID** and **Directory (tenant) ID** from the Overview page

Ask the user to provide the **Tenant ID** and **Client ID**.

### 3b. Add API Permissions

Instruct the user to:

1. In the app registration, go to **API permissions** > **Add a permission** > **Microsoft Graph** > **Application permissions**
2. Add the following permissions:

| Permission | Purpose |
|---|---|
| `User.ReadWrite.All` | Create, update, delete users |
| `Directory.ReadWrite.All` | Manage directory objects, roles, org settings |
| `Group.ReadWrite.All` | Create and manage groups and memberships |
| `Mail.ReadWrite` | Manage mailbox content and settings |
| `MailboxSettings.ReadWrite` | Configure auto-replies, forwarding, delegates |
| `Sites.FullControl.All` | Full control of all SharePoint site collections |
| `AuditLog.Read.All` | Read sign-in and directory audit logs |

3. Click **Grant admin consent for [tenant]** (requires Global Administrator)

Confirm with the user that admin consent has been granted.

### 3c. Generate Client Secret

Instruct the user to:

1. Go to **Certificates & secrets** > **Client secrets** > **New client secret**
2. Set a description (e.g. `claude-m365-admin-secret`) and expiry (recommended: 12 months)
3. Copy the **Value** immediately (it is only shown once)

Ask the user to provide the **Client Secret value**.

## Step 4: Configure Environment

Create a `.env` file in the working directory with the collected credentials.

```
AZURE_TENANT_ID=<tenant-id>
AZURE_CLIENT_ID=<client-id>
AZURE_CLIENT_SECRET=<client-secret>
```

- Write the file using the `Write` tool.
- Verify that `.gitignore` exists and contains `.env`. If not, add it.
- Warn the user to never commit this file to source control.

## Step 5: Install Exchange Online Module (Optional)

Run only if `--with-exchange` is passed or the user opts in during full setup.

```powershell
Install-Module -Name ExchangeOnlineManagement -Scope CurrentUser -Force -AllowClobber
```

Execute via:

```bash
pwsh -Command "Install-Module -Name ExchangeOnlineManagement -Scope CurrentUser -Force -AllowClobber"
```

Verify installation:

```bash
pwsh -Command "Get-Module -ListAvailable ExchangeOnlineManagement | Select-Object Name, Version"
```

## Step 6: Install PnP PowerShell (Optional)

Run only if `--with-sharepoint-pnp` is passed or the user opts in during full setup.

```powershell
Install-Module -Name PnP.PowerShell -Scope CurrentUser -Force -AllowClobber
```

Execute via:

```bash
pwsh -Command "Install-Module -Name PnP.PowerShell -Scope CurrentUser -Force -AllowClobber"
```

Verify installation:

```bash
pwsh -Command "Get-Module -ListAvailable PnP.PowerShell | Select-Object Name, Version"
```

## Step 7: Verify Connectivity

### Graph API Test

Create and run a small Node.js script that authenticates with the client credentials and calls the `/organization` endpoint (a lightweight WhoAmI-style call):

```javascript
const { ClientSecretCredential } = require("@azure/identity");
const { Client } = require("@microsoft/microsoft-graph-client");
const { TokenCredentialAuthenticationProvider } = require("@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials");
require("isomorphic-fetch");

async function main() {
  const credential = new ClientSecretCredential(
    process.env.AZURE_TENANT_ID,
    process.env.AZURE_CLIENT_ID,
    process.env.AZURE_CLIENT_SECRET
  );
  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ["https://graph.microsoft.com/.default"],
  });
  const client = Client.initWithMiddleware({ authProvider });
  const org = await client.api("/organization").select("displayName,id").get();
  console.log(JSON.stringify(org.value[0], null, 2));
}

main().catch(console.error);
```

- Load `.env` values before running (use `dotenv` or export manually).
- If successful, print the tenant display name and ID.
- If it fails, report the error and suggest checking credentials and permissions.

### Exchange Online Test (if module installed)

```bash
pwsh -Command "Import-Module ExchangeOnlineManagement; Connect-ExchangeOnline -CertificateThumbprint '' -AppId $env:AZURE_CLIENT_ID -Organization '<tenant>.onmicrosoft.com' -ShowBanner:\$false; Get-OrganizationConfig | Select-Object DisplayName; Disconnect-ExchangeOnline -Confirm:\$false"
```

Note: Exchange Online certificate-based auth requires a certificate rather than client secret. If using client secret only, inform the user that Exchange Online PowerShell requires additional certificate configuration and provide a link: https://learn.microsoft.com/en-us/powershell/exchange/app-only-auth-powershell-v2

### PnP PowerShell Test (if module installed)

```bash
pwsh -Command "Import-Module PnP.PowerShell; Connect-PnPOnline -Url 'https://<tenant>.sharepoint.com' -ClientId $env:AZURE_CLIENT_ID -ClientSecret $env:AZURE_CLIENT_SECRET -Tenant $env:AZURE_TENANT_ID; Get-PnPWeb | Select-Object Title; Disconnect-PnPOnline"
```

Ask the user for their tenant SharePoint root URL before running.

## Step 8: Output Summary Report

Print a markdown report summarizing the setup status:

```markdown
# M365 Admin Setup Report

| Component | Status | Details |
|---|---|---|
| Node.js | OK / MISSING | v20.x.x |
| Azure CLI | OK / MISSING | v2.x.x |
| PowerShell 7 | OK / MISSING / SKIPPED | v7.x.x |
| Node dependencies | INSTALLED / FAILED | @azure/identity, @microsoft/microsoft-graph-client, isomorphic-fetch |
| App registration | CONFIGURED / SKIPPED | App ID: xxxxxxxx-xxxx-... |
| .env file | CREATED / SKIPPED | AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET |
| Graph API connectivity | OK / FAILED | Tenant: Contoso Ltd |
| Exchange Online module | INSTALLED / SKIPPED / FAILED | v3.x.x |
| PnP PowerShell | INSTALLED / SKIPPED / FAILED | v2.x.x |

Setup completed at <timestamp>.
```

## Important Notes

- The client secret expires according to the chosen duration. Set a calendar reminder to rotate it.
- For production use, consider certificate-based authentication instead of client secrets.
- The permissions listed are broad (ReadWrite.All). For least-privilege setups, assign only the permissions needed for specific commands.
- `Sites.FullControl.All` is a high-privilege permission. Only grant it if SharePoint admin operations are needed.
- `AuditLog.Read.All` requires the calling identity to have at minimum Security Reader or Reports Reader role for sign-in log access.
- Reference: `skills/m365-admin/SKILL.md` for full Graph API guidance and patterns.
