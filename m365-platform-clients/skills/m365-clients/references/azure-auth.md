# Azure Authentication Patterns

Complete reference for authenticating TypeScript applications against Dataverse and Microsoft Graph using `@azure/identity`.

## Azure Entra App Registration Setup

### Step 1: Register the App

1. Go to [Azure Portal](https://portal.azure.com) → Azure Active Directory → App registrations → New registration
2. Name: `my-m365-automation` (or descriptive name)
3. Supported account types: "Accounts in this organizational directory only"
4. Redirect URI: Not needed for service-to-service
5. Click Register

### Step 2: Create Client Secret

1. Go to Certificates & secrets → New client secret
2. Add description and expiry
3. **Copy the secret value immediately** — it's only shown once
4. Record: Tenant ID, Client ID, Client Secret

### Step 3: Add API Permissions

**For Dataverse:**
1. API permissions → Add a permission → APIs my organization uses
2. Search "Dataverse" or "Dynamics CRM"
3. Add `user_impersonation` (Delegated) — or for S2S, use application permission

**For Microsoft Graph:**
1. API permissions → Add a permission → Microsoft Graph → Application permissions
2. Add permissions as needed:

| Permission | Use Case |
|-----------|----------|
| `User.Read.All` | Read user profiles |
| `Group.Read.All` | List group members |
| `Channel.Create` | Create Teams channels |
| `Files.ReadWrite.All` | SharePoint file operations |
| `Sites.ReadWrite.All` | SharePoint site operations |
| `Mail.Send` | Send emails |
| `Calendars.ReadWrite` | Calendar operations |

3. Click "Grant admin consent" (requires admin role)

### Step 4: Create Dataverse Application User

1. Go to [Power Platform Admin Center](https://admin.powerplatform.microsoft.com)
2. Environments → Select environment → Settings → Users + permissions → Application users
3. New app user → Select the app registration → Assign security role (e.g., System Administrator)

## DefaultAzureCredential

The recommended approach — tries multiple credential sources in order:

```typescript
import { DefaultAzureCredential } from "@azure/identity";

// Automatically resolves to the right credential for your environment
const credential = new DefaultAzureCredential();
```

**Resolution order:**
1. `EnvironmentCredential` — reads `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`
2. `WorkloadIdentityCredential` — Kubernetes OIDC federation
3. `ManagedIdentityCredential` — Azure VMs, Functions, App Service, AKS
4. `AzureCliCredential` — from `az login` session
5. `AzurePowerShellCredential` — from `Connect-AzAccount`
6. `AzureDeveloperCliCredential` — from `azd auth login`

### Environment Variables for Local Dev

```bash
export AZURE_TENANT_ID="your-tenant-id"
export AZURE_CLIENT_ID="your-client-id"
export AZURE_CLIENT_SECRET="your-client-secret"
```

Or in a `.env` file (with `dotenv`):

```
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
```

## ClientSecretCredential

Explicit client credentials — use when you need precise control:

```typescript
import { ClientSecretCredential } from "@azure/identity";

const credential = new ClientSecretCredential(
  process.env.AZURE_TENANT_ID!,
  process.env.AZURE_CLIENT_ID!,
  process.env.AZURE_CLIENT_SECRET!
);
```

## ManagedIdentityCredential

For Azure-hosted services with zero secrets:

```typescript
import { ManagedIdentityCredential } from "@azure/identity";

// System-assigned managed identity (no client ID needed)
const credential = new ManagedIdentityCredential();

// User-assigned managed identity (specify client ID)
const credential = new ManagedIdentityCredential("your-managed-identity-client-id");
```

**Setup:**
1. Enable managed identity on your Azure resource (Function App, VM, AKS, etc.)
2. In Dataverse: create Application User with the MI's Client ID
3. In Graph: assign app roles to the MI's service principal
4. No env vars or secrets needed — identity is bound to the Azure resource

## ChainedTokenCredential

Combine credentials for maximum flexibility:

```typescript
import {
  ChainedTokenCredential,
  ManagedIdentityCredential,
  ClientSecretCredential,
  AzureCliCredential
} from "@azure/identity";

const credential = new ChainedTokenCredential(
  new ManagedIdentityCredential(),                    // Try MI first (Azure)
  new ClientSecretCredential(tenantId, clientId, secret), // Fallback to secret
  new AzureCliCredential()                            // Fallback to CLI (dev)
);
```

## Token Provider Utility

A shared utility that provides tokens for both Dataverse and Graph:

```typescript
import { TokenCredential } from "@azure/identity";

export class TokenProvider {
  constructor(private credential: TokenCredential) {}

  async getDataverseToken(orgUrl: string): Promise<string> {
    const response = await this.credential.getToken(`${orgUrl}/.default`);
    if (!response?.token) throw new Error("Dataverse token acquisition failed");
    return response.token;
  }

  async getGraphToken(): Promise<string> {
    const response = await this.credential.getToken("https://graph.microsoft.com/.default");
    if (!response?.token) throw new Error("Graph token acquisition failed");
    return response.token;
  }

  // Generic token for any scope
  async getToken(scope: string): Promise<string> {
    const response = await this.credential.getToken(scope);
    if (!response?.token) throw new Error(`Token acquisition failed for: ${scope}`);
    return response.token;
  }
}
```

## Scopes Reference

| Service | Scope |
|---------|-------|
| Dataverse | `https://{org}.crm.dynamics.com/.default` |
| Microsoft Graph | `https://graph.microsoft.com/.default` |
| SharePoint | `https://{tenant}.sharepoint.com/.default` |
| Azure Management | `https://management.azure.com/.default` |
| Key Vault | `https://vault.azure.net/.default` |

## Token Caching

`@azure/identity` handles token caching automatically:
- Tokens are cached in memory for the credential's lifetime
- Cached tokens are reused until ~5 minutes before expiry
- Refresh happens transparently
- No manual cache management needed

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `AADSTS700016: Application not found` | Wrong Client ID or tenant | Verify `AZURE_CLIENT_ID` and `AZURE_TENANT_ID` |
| `AADSTS7000215: Invalid client secret` | Secret expired or wrong | Regenerate secret in Azure Portal |
| `AADSTS65001: No permission` | Missing API permission or consent | Grant admin consent in Azure Portal |
| `403 Forbidden` on Dataverse | Missing security role | Assign role to Application User in PPAC |
| `403 Forbidden` on Graph | Missing application permission | Add permission + grant admin consent |
| `ManagedIdentityCredential: No response` | Not running on Azure | Use `DefaultAzureCredential` which falls back |

## Debugging Auth

```typescript
import { setLogLevel } from "@azure/logger";

// Enable verbose logging for auth troubleshooting
setLogLevel("verbose");

// Or just info level
setLogLevel("info");
```

Check which credential resolved:

```typescript
const credential = new DefaultAzureCredential();
try {
  const token = await credential.getToken("https://graph.microsoft.com/.default");
  console.log("Token acquired, expires:", new Date(token.expiresOnTimestamp));
} catch (error) {
  console.error("Auth failed:", error);
}
```
