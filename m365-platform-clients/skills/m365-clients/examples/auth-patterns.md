# Auth Pattern Examples

Working examples for every common authentication scenario.

## 1. Minimal Setup — Local Dev with Env Vars

```typescript
import "dotenv/config";
import { DefaultAzureCredential } from "@azure/identity";
import { DataverseClient } from "./clients/dataverseClient";

const credential = new DefaultAzureCredential();
const client = new DataverseClient(
  { environmentUrl: process.env.DATAVERSE_ENV_URL! },
  credential
);

async function main() {
  const whoAmI = await client.whoAmI();
  console.log("Connected as:", whoAmI.UserId);
}

main().catch(console.error);
```

## 2. Explicit Client Secret (CI/CD)

```typescript
import { ClientSecretCredential } from "@azure/identity";
import { DataverseClient } from "./clients/dataverseClient";
import { GraphService } from "./clients/graphClient";

const credential = new ClientSecretCredential(
  process.env.AZURE_TENANT_ID!,
  process.env.AZURE_CLIENT_ID!,
  process.env.AZURE_CLIENT_SECRET!
);

const dvClient = new DataverseClient(
  { environmentUrl: process.env.DATAVERSE_ENV_URL! },
  credential
);
const graphService = new GraphService(credential);

// Both clients share the same credential
```

## 3. Managed Identity (Azure Functions)

```typescript
import { ManagedIdentityCredential } from "@azure/identity";
import { DataverseClient } from "./clients/dataverseClient";

// System-assigned MI — no client ID needed
const credential = new ManagedIdentityCredential();

const client = new DataverseClient(
  { environmentUrl: process.env.DATAVERSE_ENV_URL! },
  credential
);

// Azure Functions handler
export async function handler(req: Request): Promise<Response> {
  const whoAmI = await client.whoAmI();
  return new Response(JSON.stringify(whoAmI));
}
```

## 4. Fallback Chain (Multi-Environment)

```typescript
import {
  ChainedTokenCredential,
  ManagedIdentityCredential,
  EnvironmentCredential,
  AzureCliCredential
} from "@azure/identity";

// Tries in order: MI → Env vars → Azure CLI
const credential = new ChainedTokenCredential(
  new ManagedIdentityCredential(),
  new EnvironmentCredential(),
  new AzureCliCredential()
);
```

## 5. Multi-Tenant Access

```typescript
import { ClientSecretCredential } from "@azure/identity";

// Access multiple Dataverse environments with different tenants
const tenantACredential = new ClientSecretCredential(
  process.env.TENANT_A_ID!,
  process.env.TENANT_A_CLIENT_ID!,
  process.env.TENANT_A_SECRET!
);

const tenantBCredential = new ClientSecretCredential(
  process.env.TENANT_B_ID!,
  process.env.TENANT_B_CLIENT_ID!,
  process.env.TENANT_B_SECRET!
);

const clientA = new DataverseClient(
  { environmentUrl: "https://tenanta.crm.dynamics.com" },
  tenantACredential
);

const clientB = new DataverseClient(
  { environmentUrl: "https://tenantb.crm4.dynamics.com" },
  tenantBCredential
);
```

## 6. Token Caching Verification

```typescript
import { DefaultAzureCredential } from "@azure/identity";

const credential = new DefaultAzureCredential();

// First call acquires a fresh token
const t1 = await credential.getToken("https://graph.microsoft.com/.default");
console.log("Token 1 expires:", new Date(t1.expiresOnTimestamp));

// Second call returns cached token (no network call)
const t2 = await credential.getToken("https://graph.microsoft.com/.default");
console.log("Token 2 expires:", new Date(t2.expiresOnTimestamp));
console.log("Same token:", t1.token === t2.token); // true
```

## 7. Health Check Endpoint

```typescript
import { DefaultAzureCredential } from "@azure/identity";
import { DataverseClient } from "./clients/dataverseClient";
import { GraphService } from "./clients/graphClient";

const credential = new DefaultAzureCredential();

async function healthCheck(): Promise<{
  dataverse: { ok: boolean; userId?: string; error?: string };
  graph: { ok: boolean; error?: string };
}> {
  const result = {
    dataverse: { ok: false } as { ok: boolean; userId?: string; error?: string },
    graph: { ok: false } as { ok: boolean; error?: string }
  };

  // Test Dataverse
  try {
    const client = new DataverseClient(
      { environmentUrl: process.env.DATAVERSE_ENV_URL! },
      credential
    );
    const whoAmI = await client.whoAmI();
    result.dataverse = { ok: true, userId: whoAmI.UserId };
  } catch (error) {
    result.dataverse = { ok: false, error: String(error) };
  }

  // Test Graph
  try {
    const graph = new GraphService(credential);
    await graph.rawGet("/organization");
    result.graph = { ok: true };
  } catch (error) {
    result.graph = { ok: false, error: String(error) };
  }

  return result;
}
```
