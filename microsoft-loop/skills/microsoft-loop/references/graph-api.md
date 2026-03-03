# Microsoft Loop — Graph API Reference

## Authentication

Loop Graph API endpoints use standard Microsoft Graph authentication.

### Required Permissions

| Operation | Delegated | Application |
|---|---|---|
| List / read workspaces | `FileStorageContainer.Selected` | `FileStorageContainer.Selected` |
| Create / update workspaces | `FileStorageContainer.Selected` | `FileStorageContainer.Selected` |
| Delete workspaces | `FileStorageContainer.Selected` | `FileStorageContainer.Selected` |
| Manage permissions | `FileStorageContainer.Selected` | `FileStorageContainer.Selected` |
| Read pages (drive items) | `Files.Read` or `Files.ReadWrite` | `Files.Read.All` |
| Create / modify pages | `Files.ReadWrite` | `Files.ReadWrite.All` |
| Admin: list all containers | `Sites.ReadWrite.All` | `Sites.ReadWrite.All` |

**Important:** `FileStorageContainer.Selected` must be added to the app registration AND
admin-consented at the tenant level. Standard delegated consent is not sufficient.

### App Registration Setup

```powershell
# Grant FileStorageContainer.Selected via PowerShell (requires Global Admin)
Connect-MgGraph -Scopes "Application.ReadWrite.All", "AppRoleAssignment.ReadWrite.All"

$appId = "{your-app-id}"
$sp = Get-MgServicePrincipal -Filter "appId eq '$appId'"

# Microsoft Graph service principal
$graph = Get-MgServicePrincipal -Filter "appId eq '00000003-0000-0000-c000-000000000000'"

# FileStorageContainer.Selected app role
$role = $graph.AppRoles | Where-Object { $_.Value -eq "FileStorageContainer.Selected" }

New-MgServicePrincipalAppRoleAssignment `
  -ServicePrincipalId $sp.Id `
  -PrincipalId $sp.Id `
  -ResourceId $graph.Id `
  -AppRoleId $role.Id
```

---

## TypeScript SDK Setup

```typescript
import { ClientSecretCredential } from "@azure/identity";
import { Client } from "@microsoft/microsoft-graph-client";
import { TokenCredentialAuthenticationProvider } from
  "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials";

const credential = new ClientSecretCredential(
  process.env.TENANT_ID!,
  process.env.CLIENT_ID!,
  process.env.CLIENT_SECRET!
);

const authProvider = new TokenCredentialAuthenticationProvider(credential, {
  scopes: ["https://graph.microsoft.com/.default"]
});

const graphClient = Client.initWithMiddleware({ authProvider });
```

---

## Container Type API

### List Container Types (Find Loop Type ID)

```http
GET https://graph.microsoft.com/v1.0/storage/fileStorage/containerTypes
```

```typescript
const types = await graphClient
  .api('/storage/fileStorage/containerTypes')
  .get();

// Loop app ID: a187e399-0c36-4b98-8f04-1efc167a35d6
const loopType = types.value.find(
  (t: any) => t.ownerAppId === 'a187e399-0c36-4b98-8f04-1efc167a35d6'
);
const loopContainerTypeId = loopType?.id;
```

---

## Workspace (Container) API

### Endpoint Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/v1.0/storage/fileStorage/containers?$filter=containerTypeId eq '{id}'` | List workspaces |
| GET | `/v1.0/storage/fileStorage/containers/{containerId}` | Get workspace |
| POST | `/v1.0/storage/fileStorage/containers` | Create workspace |
| PATCH | `/v1.0/storage/fileStorage/containers/{containerId}` | Update workspace |
| DELETE | `/v1.0/storage/fileStorage/containers/{containerId}` | Deactivate workspace |
| POST | `/v1.0/storage/fileStorage/containers/{containerId}/restore` | Restore deactivated workspace |
| GET | `/v1.0/storage/fileStorage/containers/{containerId}/permissions` | List workspace members |
| POST | `/v1.0/storage/fileStorage/containers/{containerId}/permissions` | Add workspace member |
| DELETE | `/v1.0/storage/fileStorage/containers/{containerId}/permissions/{permId}` | Remove member |

### Create Workspace — Full Example

```typescript
interface LoopWorkspaceCreateRequest {
  displayName: string;
  description?: string;
  containerTypeId: string;
}

async function createLoopWorkspace(
  graphClient: Client,
  request: LoopWorkspaceCreateRequest
): Promise<{ id: string; webUrl: string }> {
  const container = await graphClient
    .api('/storage/fileStorage/containers')
    .post({
      displayName: request.displayName,
      description: request.description,
      containerTypeId: request.containerTypeId
    });

  return { id: container.id, webUrl: container.webUrl };
}
```

### List Workspaces — Paginated

```typescript
async function listAllLoopWorkspaces(
  graphClient: Client,
  loopContainerTypeId: string
): Promise<any[]> {
  const workspaces: any[] = [];
  let response = await graphClient
    .api('/storage/fileStorage/containers')
    .filter(`containerTypeId eq '${loopContainerTypeId}'`)
    .select('id,displayName,description,webUrl,status,createdDateTime')
    .top(50)
    .get();

  workspaces.push(...response.value);

  while (response['@odata.nextLink']) {
    response = await graphClient
      .api(response['@odata.nextLink'])
      .get();
    workspaces.push(...response.value);
  }

  return workspaces;
}
```

### Add Member to Workspace

```typescript
async function addWorkspaceMember(
  graphClient: Client,
  containerId: string,
  userId: string,
  role: 'reader' | 'writer' | 'owner'
): Promise<void> {
  await graphClient
    .api(`/storage/fileStorage/containers/${containerId}/permissions`)
    .post({
      roles: [role],
      grantedToV2: {
        user: { id: userId }
      }
    });
}
```

---

## Drive / Page API

Loop workspace pages are OneDrive items in the workspace's backing drive.

### Endpoint Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/v1.0/storage/fileStorage/containers/{cId}/drive` | Get workspace drive |
| GET | `/v1.0/drives/{driveId}/root/children` | List root-level pages |
| GET | `/v1.0/drives/{driveId}/items/{itemId}/children` | List pages in folder |
| GET | `/v1.0/drives/{driveId}/items/{itemId}` | Get page metadata |
| GET | `/v1.0/drives/{driveId}/items/{itemId}/content` | Download page file |
| POST | `/v1.0/drives/{driveId}/items/{parentId}/children` | Create page (file entry) |
| PATCH | `/v1.0/drives/{driveId}/items/{itemId}` | Rename / move page |
| DELETE | `/v1.0/drives/{driveId}/items/{itemId}` | Delete page |
| POST | `/v1.0/drives/{driveId}/items/{itemId}/copy` | Copy page |
| GET | `/v1.0/drives/{driveId}/items/{itemId}/versions` | Page version history |

### Full Page Listing with Drive Discovery

```typescript
async function listLoopPages(
  graphClient: Client,
  containerId: string
): Promise<{ id: string; name: string; webUrl: string; lastModified: string }[]> {
  // Step 1: get drive ID
  const drive = await graphClient
    .api(`/storage/fileStorage/containers/${containerId}/drive`)
    .get();

  // Step 2: list all root children
  const items = await graphClient
    .api(`/drives/${drive.id}/root/children`)
    .select('id,name,webUrl,lastModifiedDateTime,file,folder,size')
    .get();

  // Filter to .loop files only
  return items.value
    .filter((item: any) => item.name?.endsWith('.loop'))
    .map((item: any) => ({
      id: item.id,
      name: item.name,
      webUrl: item.webUrl,
      lastModified: item.lastModifiedDateTime
    }));
}
```

### Version History for a Page

```http
GET https://graph.microsoft.com/v1.0/drives/{driveId}/items/{itemId}/versions
```

```typescript
const versions = await graphClient
  .api(`/drives/${driveId}/items/${itemId}/versions`)
  .select('id,lastModifiedDateTime,lastModifiedBy,size')
  .get();
```

---

## Search API — Find Loop Content

```http
POST https://graph.microsoft.com/v1.0/search/query
Content-Type: application/json

{
  "requests": [{
    "entityTypes": ["driveItem"],
    "query": {
      "queryString": "contentType:application/fluid OR fileExtension:loop site:loop.microsoft.com"
    },
    "fields": ["id", "name", "webUrl", "lastModifiedDateTime", "createdBy"],
    "size": 25
  }]
}
```

**TypeScript:**
```typescript
const results = await graphClient
  .api('/search/query')
  .post({
    requests: [{
      entityTypes: ['driveItem'],
      query: { queryString: 'fileExtension:loop' },
      fields: ['id', 'name', 'webUrl', 'lastModifiedDateTime'],
      size: 25
    }]
  });

const pages = results.value[0].hitsContainers[0].hits ?? [];
```

---

## Audit & Activity API

### Office 365 Audit Log (Purview / Graph)

Loop-specific audit events:

| Activity | Operation Name |
|---|---|
| Workspace created | `LoopWorkspaceCreated` |
| Workspace deleted | `LoopWorkspaceDeleted` |
| Component created | `LoopComponentCreated` |
| Component shared | `LoopComponentShared` |
| Component modified | `LoopComponentModified` |
| Page created | `LoopPageCreated` |
| Page deleted | `LoopPageDeleted` |

Query via Purview compliance portal or via Management Activity API:
```http
GET https://manage.office.com/api/v1.0/{tenantId}/activity/feed/subscriptions/content
    ?contentType=Audit.SharePoint&startTime=...&endTime=...
```

Filter results for `Operation` values matching Loop events above.

---

## Error Handling — TypeScript Pattern

```typescript
import { GraphError } from "@microsoft/microsoft-graph-client";

async function safeLoopOperation<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof GraphError) {
      switch (error.statusCode) {
        case 400:
          console.error(`[${context}] Bad request: ${error.message}`);
          break;
        case 403:
          console.error(`[${context}] Forbidden — check FileStorageContainer.Selected permission`);
          break;
        case 404:
          console.warn(`[${context}] Not found — workspace or page may have been deleted`);
          break;
        case 429: {
          const retryAfter = parseInt(error.headers?.['retry-after'] ?? '5', 10);
          console.warn(`[${context}] Throttled — retrying after ${retryAfter}s`);
          await new Promise(r => setTimeout(r, retryAfter * 1000));
          return safeLoopOperation(operation, context);
        }
        default:
          console.error(`[${context}] Graph error ${error.statusCode}: ${error.message}`);
      }
    }
    return null;
  }
}

// Usage
const workspace = await safeLoopOperation(
  () => createLoopWorkspace(graphClient, { displayName: 'My Project', containerTypeId }),
  'createWorkspace'
);
```

---

## Throttling Limits

| API Area | Limit | Notes |
|---|---|---|
| fileStorage/containers | 10,000 req / 10 min per app | Shared across all container operations |
| Drive API (pages) | 10,000 req / 10 min per app | Standard OneDrive throttle |
| Search API | 30 req / min per user | Lower limit — batch searches |
| Permissions API | 250 req / sec per tenant | |
| Concurrent requests | 4 concurrent per connection | Use batch or sequential calls |

**Recommended patterns:**
- Use `$select` to reduce response size and throttle risk
- Use `$batch` endpoint for bulk workspace/page operations (up to 20 requests per batch)
- Implement exponential backoff on 429 (start at 1s, max 32s, 5 attempts)

### Batch Request Example

```typescript
const batchBody = {
  requests: [
    { id: '1', method: 'GET', url: '/storage/fileStorage/containers/ws1' },
    { id: '2', method: 'GET', url: '/storage/fileStorage/containers/ws2' },
    { id: '3', method: 'GET', url: '/storage/fileStorage/containers/ws3' }
  ]
};

const batchResponse = await graphClient
  .api('/$batch')
  .post(batchBody);

for (const response of batchResponse.responses) {
  if (response.status === 200) {
    console.log(`Workspace ${response.id}: ${response.body.displayName}`);
  }
}
```

---

## Environment Variables

Recommended env var names for Loop integrations:

```bash
AZURE_TENANT_ID=               # AAD tenant ID
AZURE_CLIENT_ID=               # App registration client ID
AZURE_CLIENT_SECRET=           # App registration client secret (use Key Vault in prod)
LOOP_CONTAINER_TYPE_ID=        # Loop workspace container type ID for this tenant
LOOP_GRAPH_BASE_URL=https://graph.microsoft.com/v1.0
```

Store `LOOP_CONTAINER_TYPE_ID` as an environment variable / Azure App Config value so it
can be updated if the tenant's Loop configuration changes without redeployment.
