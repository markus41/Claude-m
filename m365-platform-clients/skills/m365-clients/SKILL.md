---
name: m365-clients
description: "Expert knowledge of TypeScript clients for Dataverse Web API and Microsoft Graph, including Azure identity auth, DefaultAzureCredential, managed identity, and combined Dataverse+Graph provisioning workflows"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
dependencies: []
triggers:
  - dataverse client
  - dataverse api
  - graph client
  - microsoft graph
  - azure identity
  - DefaultAzureCredential
  - managed identity
  - client secret credential
  - token provider
  - m365 client
  - power platform api
  - crm dynamics
  - graph sdk
  - provision workflow
  - dataverse typescript
  - graph typescript
  - create-m365-client
---

# M365 Platform Clients — Dataverse & Microsoft Graph in TypeScript

TypeScript patterns for authenticating and calling the Dataverse Web API and Microsoft Graph, including shared auth, typed clients, and combined provisioning workflows.

## When to Activate

- User writes TypeScript that calls Dataverse (`/api/data/v9.2/`) or Graph (`graph.microsoft.com`)
- User asks about `DefaultAzureCredential`, managed identity, or client secret auth
- User wants to create a Dataverse + Graph client setup
- User asks about M365 provisioning (Teams channels, SharePoint folders, Dataverse records)
- User needs `@azure/identity` or `@microsoft/microsoft-graph-client` patterns

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  Your Node/TS Service                │
│                                                     │
│  ┌─────────────────┐    ┌────────────────────────┐  │
│  │ DataverseClient  │    │    GraphService         │  │
│  │ /api/data/v9.2/  │    │ graph.microsoft.com/v1  │  │
│  └────────┬─────────┘    └───────────┬────────────┘  │
│           └──────────┬───────────────┘               │
│                      │                               │
│            ┌─────────▼──────────┐                    │
│            │   TokenProvider    │                    │
│            │ DefaultAzureCred   │                    │
│            └─────────┬──────────┘                    │
└──────────────────────┼───────────────────────────────┘
                       │ OAuth2
                       ▼
             ┌──────────────────┐
             │  Microsoft Entra │
             │  (one app reg)   │
             └────────┬─────────┘
            ┌─────────┴──────────┐
            ▼                    ▼
   ┌─────────────────┐  ┌──────────────────┐
   │ Dataverse Env   │  │ Microsoft Graph  │
   │ (App User +     │  │ (application     │
   │  security role) │  │  permissions)    │
   └─────────────────┘  └──────────────────┘
```

## Dependencies

```bash
npm install @azure/identity @microsoft/microsoft-graph-client
# For Graph auth middleware:
npm install @microsoft/microsoft-graph-client/authProviders/azureTokenCredentials
```

## Auth: Shared Token Provider

One credential instance serves both Dataverse and Graph. `DefaultAzureCredential` tries (in order):
1. Environment variables (`AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`)
2. Workload Identity (Kubernetes)
3. Managed Identity (Azure VMs, Functions, AKS)
4. Azure CLI (`az login`)
5. Azure PowerShell

```typescript
import { DefaultAzureCredential, TokenCredential } from "@azure/identity";

export function getCredential(): TokenCredential {
  return new DefaultAzureCredential();
}

export async function getToken(credential: TokenCredential, scope: string): Promise<string> {
  const response = await credential.getToken(scope);
  if (!response?.token) throw new Error(`Token acquisition failed for: ${scope}`);
  return response.token;
}
```

**Local dev**: Set `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` env vars.
**Azure production**: Use Managed Identity — zero secrets in config.

See `references/azure-auth.md` for complete auth patterns.

## Dataverse Client (Quick Reference)

```typescript
const client = new DataverseClient(
  { environmentUrl: "https://contoso.crm.dynamics.com" },
  getCredential()
);

// Test connection
const whoAmI = await client.whoAmI();

// CRUD
const id = await client.create("accounts", { name: "Contoso" });
const account = await client.get("accounts", `$filter=name eq 'Contoso'`);
await client.patch("accounts", id, { revenue: 1000000 });
await client.delete("accounts", id);
```

See `references/dataverse-client.md` for the full typed client class.

## Graph Service (Quick Reference)

```typescript
const graph = new GraphService(getCredential());

// Users
const user = await graph.getUser("user@contoso.com");

// Teams
const channel = await graph.createTeamsChannel(teamId, "Project Alpha");

// SharePoint
const folder = await graph.createSharePointFolder(siteId, driveId, "root", "Project Alpha");

// Groups
const members = await graph.listGroupMembers(groupId);
```

See `references/graph-client.md` for the full service class.

## Combined Provisioning Workflow

The powerful pattern: orchestrate Dataverse record creation with Graph resource provisioning.

```typescript
// 1. Create record in Dataverse
const projectId = await dvClient.create("new_projects", {
  new_name: "Project Alpha",
  new_status: "provisioning"
});

// 2. Provision M365 resources in parallel via Graph
const [channel, folder] = await Promise.all([
  graph.createTeamsChannel(teamId, "Project Alpha"),
  graph.createSharePointFolder(siteId, driveId, "root", "Project Alpha")
]);

// 3. Write Graph resource IDs back to Dataverse
await dvClient.patch("new_projects", projectId, {
  new_status: "active",
  new_teams_channel_id: channel.id,
  new_sharepoint_folder_url: folder.webUrl
});
```

See `examples/combined-workflows.md` for complete provisioning patterns.

## Azure Entra Setup Checklist

1. **Register app** in Azure AD (Entra ID)
2. **API permissions**:
   - `Dynamics CRM` → `user_impersonation` (delegated) or application permission
   - `Microsoft Graph` → Application permissions as needed (`User.Read.All`, `Files.ReadWrite.All`, `Channel.Create`, etc.)
3. **Grant admin consent** for application permissions
4. **Create Application User** in Dataverse environment bound to the app's Client ID
5. **Assign security role** to the Application User (e.g., System Administrator or custom)
6. **For production**: Create Managed Identity, assign same permissions

See `references/azure-auth.md` for step-by-step setup.

## Environment Auth Strategies

| Environment | Credential | Config |
|-------------|-----------|--------|
| Local dev | Environment variables | `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` |
| Azure Functions | System-assigned MI | No env vars needed |
| AKS | Workload Identity | OIDC federation, no secrets |
| Non-Azure K8s | Client secret | Mount from K8s Secret / Vault |
| CI/CD pipelines | Client secret | From GitHub/Azure DevOps secrets |

`DefaultAzureCredential` handles the transition automatically — no code changes between environments.

## Reference Files

| Resource | Path | Content |
|----------|------|---------|
| Azure Auth | `references/azure-auth.md` | DefaultAzureCredential, managed identity, Entra setup |
| Dataverse Client | `references/dataverse-client.md` | Full typed client class, CRUD, OData queries |
| Graph Client | `references/graph-client.md` | Full service class, Teams/SharePoint/Users |
| Environment Strategies | `references/environment-strategies.md` | Local vs prod auth, secrets management |
| Auth Examples | `examples/auth-patterns.md` | Token providers for every environment |
| Dataverse Operations | `examples/dataverse-operations.md` | Common Dataverse patterns |
| Graph Operations | `examples/graph-operations.md` | Common Graph patterns |
| Combined Workflows | `examples/combined-workflows.md` | Dataverse + Graph provisioning |
