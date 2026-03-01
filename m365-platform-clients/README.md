# M365 Platform Clients Plugin

Claude Code plugin providing deep knowledge of TypeScript patterns for Microsoft 365 platform integration — Dataverse Web API, Microsoft Graph, and shared Azure Identity authentication.

## What's Included

### Skill: `m365-clients`

Core knowledge for building typed TypeScript clients that wrap Dataverse and Graph APIs with shared `@azure/identity` credentials.

**Triggers on**: "dataverse client", "graph client", "DefaultAzureCredential", "managed identity", "Microsoft Graph TypeScript", "DataverseClient", "GraphService", "m365 integration"

**References**:
- `azure-auth.md` — Credential types, Entra app registration, token caching, scopes
- `dataverse-client.md` — Full `DataverseClient` class with typed CRUD, queries, batch, actions
- `graph-client.md` — Full `GraphService` class with Users, Teams, SharePoint, Mail, Calendar
- `environment-strategies.md` — Auth patterns per environment (local, Azure, K8s, CI/CD)

**Examples**:
- `auth-patterns.md` — 7 auth scenarios (local dev, client secret, managed identity, multi-tenant, etc.)
- `dataverse-operations.md` — 7 Dataverse patterns (CRUD, OData queries, lookups, bulk, flows)
- `graph-operations.md` — 7 Graph patterns (users, Teams, SharePoint, email, calendar, batch)
- `combined-workflows.md` — 5 combined patterns (provisioning, onboarding, reporting, decommission)

### Command: `/create-m365-client`

Generates production-ready TypeScript code for Dataverse and/or Graph operations with proper auth, typing, and error handling.

```
/create-m365-client query active projects from Dataverse and post summary to Teams
```

### Agent: `m365-client-reviewer`

Reviews TypeScript code that integrates with Dataverse or Graph for correctness, auth patterns, API usage, and production readiness.

## Dependencies

```
@azure/identity
@microsoft/microsoft-graph-client
dotenv (dev)
```

## Quick Start

```typescript
import { DefaultAzureCredential } from "@azure/identity";
import { DataverseClient } from "./clients/dataverseClient";
import { GraphService } from "./clients/graphClient";

const credential = new DefaultAzureCredential();

const dv = new DataverseClient(
  { environmentUrl: process.env.DATAVERSE_ENV_URL! },
  credential
);
const graph = new GraphService(credential);

// Both clients share the same credential and token cache
const whoAmI = await dv.whoAmI();
const user = await graph.getUser("admin@contoso.com");
```

## Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `AZURE_TENANT_ID` | Entra tenant ID | `xxxxxxxx-xxxx-...` |
| `AZURE_CLIENT_ID` | App registration client ID | `xxxxxxxx-xxxx-...` |
| `AZURE_CLIENT_SECRET` | Client secret (local/CI only) | `your-secret` |
| `DATAVERSE_ENV_URL` | Dataverse environment URL | `https://contoso.crm.dynamics.com` |

In Azure-hosted environments, use Managed Identity instead of client secrets — no env vars needed beyond `DATAVERSE_ENV_URL`.
