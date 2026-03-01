# Dataverse Web API for Power Automate Flows

Complete reference for creating, reading, updating, enabling, and deleting cloud flows via the Dataverse Web API.

## Endpoint

```
https://{org}.crm.dynamics.com/api/data/v9.2/workflows
```

Replace `{org}` with your Dataverse organization name (e.g., `contoso` for `contoso.crm.dynamics.com`).

## Authentication

All API calls require an Azure AD OAuth 2.0 access token with Dataverse permissions.

### Option 1: Client Credentials (App-Only)

For CI/CD, daemon services, and unattended scenarios.

**Azure AD App Registration:**
1. Register an app in Azure AD (Entra ID)
2. Add API permission: `Dynamics CRM` → `user_impersonation` (or application permission)
3. Create a client secret or certificate
4. Grant the app a security role in your Dataverse environment (e.g., System Administrator or a custom role with workflow create/update privileges)

**REST — Get Token:**

```http
POST https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token
Content-Type: application/x-www-form-urlencoded

client_id={clientId}
&client_secret={clientSecret}
&scope=https://{org}.crm.dynamics.com/.default
&grant_type=client_credentials
```

**TypeScript:**

```typescript
import { ClientSecretCredential } from "@azure/identity";

const credential = new ClientSecretCredential(
  process.env.AZURE_TENANT_ID!,
  process.env.AZURE_CLIENT_ID!,
  process.env.AZURE_CLIENT_SECRET!
);

async function getToken(orgUrl: string): Promise<string> {
  const tokenResponse = await credential.getToken(`${orgUrl}/.default`);
  return tokenResponse.token;
}
```

### Option 2: Authorization Code (Delegated)

For interactive user scenarios (Power Apps, browser-based tools).

```http
POST https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token
Content-Type: application/x-www-form-urlencoded

client_id={clientId}
&code={authorizationCode}
&redirect_uri={redirectUri}
&scope=https://{org}.crm.dynamics.com/user_impersonation
&grant_type=authorization_code
```

### Option 3: Device Code Flow

For CLI tools and scripts running on devices without a browser.

```typescript
import { DeviceCodeCredential } from "@azure/identity";

const credential = new DeviceCodeCredential({
  tenantId: process.env.AZURE_TENANT_ID,
  clientId: process.env.AZURE_CLIENT_ID,
  userPromptCallback: (info) => console.log(info.message)
});
```

## CRUD Operations

### Create a Flow

```http
POST /api/data/v9.2/workflows
Content-Type: application/json
Authorization: Bearer {access_token}
OData-MaxVersion: 4.0
OData-Version: 4.0

{
  "category": 5,
  "type": 1,
  "primaryentity": "none",
  "name": "Daily Sales Report",
  "description": "Runs an Office Script to generate sales reports every morning",
  "clientdata": "{\"properties\":{\"definition\":{...},\"connectionReferences\":{...}},\"schemaVersion\":\"1.0.0.0\"}"
}
```

**Response:** `201 Created` with the workflow record including `workflowid`.

**TypeScript helper:**

```typescript
interface CreateFlowRequest {
  category: 5;
  type: 1;
  primaryentity: "none";
  name: string;
  description?: string;
  clientdata: string;
}

interface WorkflowRecord {
  workflowid: string;
  name: string;
  statecode: number;
  statuscode: number;
  createdon: string;
  modifiedon: string;
  clientdata: string;
}

async function createFlow(
  orgUrl: string,
  token: string,
  flow: CreateFlowRequest
): Promise<WorkflowRecord> {
  const response = await fetch(`${orgUrl}/api/data/v9.2/workflows`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
      "Prefer": "return=representation"
    },
    body: JSON.stringify(flow)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Create flow failed: ${response.status} - ${JSON.stringify(error)}`);
  }

  return response.json();
}
```

### Enable a Flow

Newly created flows have `statecode = 0` (Off/Draft). Enable them:

```http
PATCH /api/data/v9.2/workflows({workflowid})
Content-Type: application/json
Authorization: Bearer {access_token}

{
  "statecode": 1,
  "statuscode": 2
}
```

**TypeScript:**

```typescript
async function enableFlow(orgUrl: string, token: string, workflowId: string): Promise<void> {
  const response = await fetch(`${orgUrl}/api/data/v9.2/workflows(${workflowId})`, {
    method: "PATCH",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0"
    },
    body: JSON.stringify({ statecode: 1, statuscode: 2 })
  });

  if (!response.ok) {
    throw new Error(`Enable flow failed: ${response.status}`);
  }
}
```

### Disable a Flow

```http
PATCH /api/data/v9.2/workflows({workflowid})
Content-Type: application/json

{
  "statecode": 0,
  "statuscode": 1
}
```

### Update a Flow Definition

Replace the `clientdata` to update the flow's triggers and actions:

```http
PATCH /api/data/v9.2/workflows({workflowid})
Content-Type: application/json

{
  "clientdata": "{...updated JSON string...}"
}
```

**Important:** Disable the flow before updating, then re-enable:

```typescript
async function updateFlow(
  orgUrl: string,
  token: string,
  workflowId: string,
  clientdata: string
): Promise<void> {
  // 1. Disable
  await disableFlow(orgUrl, token, workflowId);

  // 2. Update definition
  const response = await fetch(`${orgUrl}/api/data/v9.2/workflows(${workflowId})`, {
    method: "PATCH",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0"
    },
    body: JSON.stringify({ clientdata })
  });

  if (!response.ok) {
    throw new Error(`Update flow failed: ${response.status}`);
  }

  // 3. Re-enable
  await enableFlow(orgUrl, token, workflowId);
}
```

### Delete a Flow

```http
DELETE /api/data/v9.2/workflows({workflowid})
Authorization: Bearer {access_token}
```

### List Flows

```http
GET /api/data/v9.2/workflows?$filter=category eq 5&$select=name,statecode,statuscode,createdon,modifiedon,description
Authorization: Bearer {access_token}
```

**Filter examples:**

```
# All cloud flows
$filter=category eq 5

# Only active flows
$filter=category eq 5 and statecode eq 1

# Flows by name
$filter=category eq 5 and contains(name,'Sales Report')

# Flows created after a date
$filter=category eq 5 and createdon gt 2024-01-01T00:00:00Z
```

**TypeScript:**

```typescript
interface FlowListItem {
  workflowid: string;
  name: string;
  statecode: number;
  statuscode: number;
  createdon: string;
  description: string;
}

async function listFlows(
  orgUrl: string,
  token: string,
  filter?: string
): Promise<FlowListItem[]> {
  const baseFilter = "category eq 5";
  const fullFilter = filter ? `${baseFilter} and ${filter}` : baseFilter;
  const select = "name,statecode,statuscode,createdon,description";
  const url = `${orgUrl}/api/data/v9.2/workflows?$filter=${encodeURIComponent(fullFilter)}&$select=${select}`;

  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0"
    }
  });

  if (!response.ok) {
    throw new Error(`List flows failed: ${response.status}`);
  }

  const data = await response.json();
  return data.value;
}
```

### Get a Single Flow

```http
GET /api/data/v9.2/workflows({workflowid})?$select=name,statecode,clientdata,createdon
Authorization: Bearer {access_token}
```

## Complete TypeScript Client

A reusable class wrapping all operations:

```typescript
import { ClientSecretCredential, TokenCredential } from "@azure/identity";

interface FlowClientConfig {
  orgUrl: string;
  tenantId: string;
  clientId: string;
  clientSecret: string;
}

interface ClientData {
  properties: {
    definition: FlowDefinition;
    connectionReferences: Record<string, ConnectionReference>;
  };
  schemaVersion: "1.0.0.0";
}

interface FlowDefinition {
  $schema: string;
  contentVersion: string;
  parameters: Record<string, unknown>;
  triggers: Record<string, unknown>;
  actions: Record<string, unknown>;
  outputs: Record<string, unknown>;
}

interface ConnectionReference {
  connectionName: string;
  source: "Invoker" | "Embedded";
  id: string;
  tier: string;
}

class PowerAutomateClient {
  private credential: TokenCredential;
  private orgUrl: string;

  constructor(config: FlowClientConfig) {
    this.orgUrl = config.orgUrl;
    this.credential = new ClientSecretCredential(
      config.tenantId,
      config.clientId,
      config.clientSecret
    );
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const tokenResponse = await this.credential.getToken(`${this.orgUrl}/.default`);
    return {
      "Authorization": `Bearer ${tokenResponse.token}`,
      "Content-Type": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0"
    };
  }

  async create(name: string, clientData: ClientData, description?: string): Promise<string> {
    const headers = await this.getHeaders();
    const response = await fetch(`${this.orgUrl}/api/data/v9.2/workflows`, {
      method: "POST",
      headers: { ...headers, "Prefer": "return=representation" },
      body: JSON.stringify({
        category: 5,
        type: 1,
        primaryentity: "none",
        name,
        description: description ?? "",
        clientdata: JSON.stringify(clientData)
      })
    });

    if (!response.ok) throw new Error(`Create failed: ${response.status}`);
    const result = await response.json();
    return result.workflowid;
  }

  async enable(workflowId: string): Promise<void> {
    const headers = await this.getHeaders();
    await fetch(`${this.orgUrl}/api/data/v9.2/workflows(${workflowId})`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ statecode: 1, statuscode: 2 })
    });
  }

  async disable(workflowId: string): Promise<void> {
    const headers = await this.getHeaders();
    await fetch(`${this.orgUrl}/api/data/v9.2/workflows(${workflowId})`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ statecode: 0, statuscode: 1 })
    });
  }

  async delete(workflowId: string): Promise<void> {
    const headers = await this.getHeaders();
    await fetch(`${this.orgUrl}/api/data/v9.2/workflows(${workflowId})`, {
      method: "DELETE",
      headers
    });
  }

  async update(workflowId: string, clientData: ClientData): Promise<void> {
    await this.disable(workflowId);
    const headers = await this.getHeaders();
    await fetch(`${this.orgUrl}/api/data/v9.2/workflows(${workflowId})`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ clientdata: JSON.stringify(clientData) })
    });
    await this.enable(workflowId);
  }

  async list(filter?: string): Promise<{ workflowid: string; name: string; statecode: number }[]> {
    const headers = await this.getHeaders();
    const baseFilter = "category eq 5";
    const fullFilter = filter ? `${baseFilter} and ${filter}` : baseFilter;
    const url = `${this.orgUrl}/api/data/v9.2/workflows?$filter=${encodeURIComponent(fullFilter)}&$select=name,statecode,createdon`;

    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`List failed: ${response.status}`);
    const data = await response.json();
    return data.value;
  }
}
```

## Error Handling

Common error responses from the Dataverse API:

| Status | Meaning | Common Cause |
|--------|---------|-------------|
| `401` | Unauthorized | Token expired or invalid scope |
| `403` | Forbidden | App lacks required security role in environment |
| `400` | Bad Request | Malformed `clientdata` JSON or missing required fields |
| `404` | Not Found | Invalid `workflowid` |
| `409` | Conflict | Flow already enabled/disabled, or concurrent modification |
| `412` | Precondition Failed | ETag mismatch (use `If-Match: *` to override) |

**Common `clientdata` errors:**
- Invalid `$schema` URL → use exactly `https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#`
- Missing `$connections` parameter → required even if empty
- Invalid `connectionReferences` API ID → check connector API ID format
- Trigger name collision → only one trigger allowed, any name is fine

## Rate Limits and Quotas

| Limit | Value |
|-------|-------|
| API calls per user | 6,000/5 minutes (Dataverse) |
| Batch operations | 1,000 requests per $batch |
| Flow executions | Based on Power Automate license tier |
| Max `clientdata` size | No documented limit; keep under 1 MB |

## Environment-Specific URLs

| Region | URL Pattern |
|--------|------------|
| North America | `https://{org}.crm.dynamics.com` |
| Europe | `https://{org}.crm4.dynamics.com` |
| Asia Pacific | `https://{org}.crm5.dynamics.com` |
| UK | `https://{org}.crm11.dynamics.com` |
| Australia | `https://{org}.crm6.dynamics.com` |
| Canada | `https://{org}.crm3.dynamics.com` |
| Japan | `https://{org}.crm7.dynamics.com` |
| GCC | `https://{org}.crm9.dynamics.com` |

Use the Power Platform Admin Center or `GET /api/data/v9.2/` discovery endpoint to find your org URL.
