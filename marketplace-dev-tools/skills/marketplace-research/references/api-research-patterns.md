# API Research Patterns — Microsoft Graph and Platform APIs

## Overview

This reference documents systematic patterns for researching Microsoft Graph and related platform APIs (Dataverse, Power Platform, Azure) when building new marketplace plugins. It covers Graph Explorer usage, changelog tracking, permission scope discovery, SDK client patterns, throttling research, and REST API versioning analysis.

---

## Graph Explorer Usage Patterns

Graph Explorer (`https://developer.microsoft.com/graph/graph-explorer`) is the primary interactive research tool for Microsoft Graph APIs.

### Key Research Techniques

```
# 1. Discover available APIs for a service — start with resource overview
GET https://graph.microsoft.com/v1.0/me

# 2. List all messages in a mailbox — understand pagination pattern
GET https://graph.microsoft.com/v1.0/me/messages?$top=10&$select=subject,receivedDateTime,from

# 3. Check what $expand fields are available
GET https://graph.microsoft.com/v1.0/me/messages/{id}?$expand=attachments,extensions

# 4. Try beta endpoint for new features
GET https://graph.microsoft.com/beta/me/messages

# 5. Discover navigation properties
GET https://graph.microsoft.com/v1.0/$metadata
# Returns CSDL (OData metadata) — search for EntityType definitions
```

### Graph Explorer Research Workflow

1. Start at `https://learn.microsoft.com/graph/api/overview` — navigate to the service area
2. Find the **resource** page (e.g., `message`, `event`, `driveItem`)
3. Find the **method** pages (list, get, create, update, delete)
4. Note: **required permissions** listed per method
5. Copy the sample request to Graph Explorer and test with your own data
6. Check the **$metadata** for undocumented navigation properties

---

## Graph API Changelog Tracking

```
# Official changelog RSS feed
https://developer.microsoft.com/graph/changelog/rss

# Changelog page (filter by workload)
https://developer.microsoft.com/graph/changelog

# API diff between versions — compare beta to v1.0 metadata:
GET https://graph.microsoft.com/v1.0/$metadata > v1_metadata.xml
GET https://graph.microsoft.com/beta/$metadata > beta_metadata.xml
diff v1_metadata.xml beta_metadata.xml

# Check deprecation notices
# Look for @deprecated annotations in $metadata or Learn docs
```

### Beta vs. v1.0 Decision Matrix

| Criterion | Use v1.0 | Use Beta |
|---|---|---|
| Production apps | Yes — stable contract | Only if feature not in v1.0 |
| Breaking change risk | Low | High — may change without notice |
| SLA for availability | 99.9% | No SLA |
| Permissions | Same | May require additional preview permissions |
| Pagination format | OData `@odata.nextLink` | Same, but may change |
| Migration effort | None | Must migrate when feature reaches GA |

**Strategy:** Research in beta; deploy to v1.0. File a UserVoice or GitHub issue to request GA promotion of beta features.

---

## Permission Scope Discovery

### Systematic Permission Research

```typescript
// Step 1: Find permissions from Graph docs (per-method)
// Each method page lists: Delegated (work/school), Delegated (personal), Application

// Step 2: Use Graph Explorer to test minimum permissions
// In Graph Explorer > Modify Permissions: test with one scope at a time

// Step 3: Verify in Microsoft Entra admin center
// App Registration > API Permissions > Add a permission > Microsoft Graph

// Step 4: Check if admin consent is required
// Application permissions ALWAYS require admin consent
// Some delegated permissions (e.g., User.Read.All) also require admin consent

// Permission research template
interface PermissionRequirement {
  operation: string;           // e.g., "List messages"
  endpoint: string;            // e.g., "GET /me/messages"
  minDelegated: string[];      // e.g., ["Mail.Read"]
  minApplication: string[];    // e.g., ["Mail.Read"]
  adminConsentRequired: boolean;
  notes: string;
}
```

### Common Permission Patterns

| API Area | Read Permissions | Write Permissions | Notes |
|---|---|---|---|
| Mail | `Mail.Read` | `Mail.Send`, `Mail.ReadWrite` | `Mail.Send` cannot read |
| Calendar | `Calendars.Read` | `Calendars.ReadWrite` | Shared calendars need `.Shared` variant |
| Files (OneDrive) | `Files.Read.All` | `Files.ReadWrite.All` | Requires drive/item scope for personal items |
| Teams | `Team.ReadBasic.All` | `Team.Create` | Channel ops need `Channel.*` |
| Users | `User.Read` | `User.ReadWrite.All` (admin) | Write is admin-only app permission |
| Groups | `Group.Read.All` | `Group.ReadWrite.All` | Admin consent required |
| SharePoint | `Sites.Read.All` | `Sites.ReadWrite.All` | Also works for Lists/Libraries |
| Audit logs | `AuditLog.Read.All` | N/A | Admin consent required |
| DeviceManagement | `DeviceManagementManagedDevices.Read.All` | `...ReadWrite.All` | Intune; admin consent |

---

## Postman Collection for Graph Research

```json
{
  "info": {
    "name": "Microsoft Graph Research",
    "_postman_id": "graph-research-collection"
  },
  "auth": {
    "type": "oauth2",
    "oauth2": [
      { "key": "tokenName", "value": "Graph Token" },
      { "key": "accessTokenUrl", "value": "https://login.microsoftonline.com/{{tenantId}}/oauth2/v2.0/token" },
      { "key": "authUrl", "value": "https://login.microsoftonline.com/{{tenantId}}/oauth2/v2.0/authorize" },
      { "key": "clientId", "value": "{{clientId}}" },
      { "key": "clientSecret", "value": "{{clientSecret}}" },
      { "key": "scope", "value": "https://graph.microsoft.com/.default" },
      { "key": "grant_type", "value": "client_credentials" }
    ]
  },
  "variable": [
    { "key": "tenantId", "value": "<your-tenant-id>" },
    { "key": "clientId", "value": "<your-client-id>" },
    { "key": "clientSecret", "value": "<your-client-secret>" },
    { "key": "baseUrl", "value": "https://graph.microsoft.com/v1.0" }
  ]
}
```

---

## Graph SDK Client Patterns

### TypeScript SDK Setup

```typescript
import { Client } from "@microsoft/microsoft-graph-client";
import { ClientSecretCredential } from "@azure/identity";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js";

// Application-level client (service-to-service)
function createGraphClient(tenantId: string, clientId: string, clientSecret: string) {
  const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ["https://graph.microsoft.com/.default"],
  });

  return Client.initWithMiddleware({
    authProvider,
    defaultVersion: "v1.0",
  });
}

// Paginated list pattern — always use for list operations
async function* listAllItems<T>(client: Client, url: string): AsyncGenerator<T> {
  let nextUrl: string | undefined = url;

  while (nextUrl) {
    const response = await client.api(nextUrl).get() as {
      value: T[];
      "@odata.nextLink"?: string;
    };

    for (const item of response.value) {
      yield item;
    }

    nextUrl = response["@odata.nextLink"];
  }
}

// Usage
const client = createGraphClient(tenantId, clientId, clientSecret);
for await (const user of listAllItems<{ displayName: string; id: string }>(client, "/users")) {
  console.log(user.displayName);
}
```

### Throttling-Aware Client Pattern

```typescript
import { RetryHandlerOptions } from "@microsoft/microsoft-graph-client";

const client = Client.initWithMiddleware({
  authProvider,
  defaultVersion: "v1.0",
  // SDK includes retry middleware by default
  // Configure max retries and delay
});

// Custom retry with exponential backoff
async function graphCallWithRetry<T>(
  call: () => Promise<T>,
  maxRetries = 5
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await call();
    } catch (err: unknown) {
      const error = err as { statusCode?: number; body?: string };
      if (error.statusCode === 429 || error.statusCode === 503) {
        const retryAfter = parseInt(
          (error.body as string | undefined) ?? "1"
        );
        const delay = Math.max(retryAfter * 1000, Math.pow(2, attempt) * 1000);
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
      }
      throw err;
    }
  }
  throw new Error("Max retries exceeded");
}
```

---

## Throttling Research Methodology

### Identifying Throttling Limits

```
# Step 1: Check the official throttling page
https://learn.microsoft.com/graph/throttling

# Step 2: Look for service-specific limits
# Each service has its own throttling page:
- Mail/Calendar: https://learn.microsoft.com/graph/throttling-limits#outlook-service-limits
- SharePoint: https://learn.microsoft.com/graph/throttling-limits#sharepoint-limits
- Teams: https://learn.microsoft.com/graph/throttling-limits#teams-service-limits
- OneDrive: https://learn.microsoft.com/graph/throttling-limits#onedrive-limits

# Step 3: Test throttling behavior in development
# Make rapid calls and capture the 429 response:
# Headers to capture:
# - Retry-After: seconds to wait
# - x-ms-throttle-information: human-readable reason
# - x-ms-throttle-scope: application | tenant | user
```

### Throttle Response Pattern

```typescript
interface ThrottleHeaders {
  "retry-after"?: string;
  "x-ms-throttle-information"?: string;
  "x-ms-throttle-scope"?: string;
  "x-ms-resource-unit"?: string;
}

function extractThrottleInfo(headers: ThrottleHeaders) {
  return {
    retryAfterSeconds: parseInt(headers["retry-after"] ?? "60"),
    reason: headers["x-ms-throttle-information"],
    scope: headers["x-ms-throttle-scope"],  // application | tenant | user
    resourceUnit: headers["x-ms-resource-unit"],
  };
}
```

---

## REST API Versioning Analysis

### Graph API Versioning

| Version | URL | Stability | Use For |
|---|---|---|---|
| v1.0 | `https://graph.microsoft.com/v1.0` | GA — breaking changes announced 12+ months ahead | Production apps |
| beta | `https://graph.microsoft.com/beta` | Preview — may change without notice | Research and testing |

### Dataverse/Power Platform API Versions

| API | Version Format | Notes |
|---|---|---|
| Dataverse Web API | `https://org.crm.dynamics.com/api/data/v9.2/` | v9.2 is current stable |
| Power Platform REST | `api-version=2022-03-01-preview` | Date-versioned; check changelog |
| Power Automate | `api-version=2016-06-01` | Stable for flow management |
| Azure APIs | `api-version=2023-07-01` | Per-resource-provider; check docs |

### Version Discovery for Azure Resource Providers

```bash
# List all API versions for a resource provider
az provider show \
  --namespace Microsoft.BotService \
  --query "resourceTypes[?resourceType=='botServices'].apiVersions" \
  --output table

# Check the latest stable (non-preview) version
az provider show \
  --namespace Microsoft.BotService \
  --query "resourceTypes[?resourceType=='botServices'].apiVersions | [0] | [?!contains(@, 'preview')] | [0]" \
  --output tsv
```

---

## GraphQL vs REST Considerations

| Consideration | REST (Graph OData) | GraphQL (not available in Graph) |
|---|---|---|
| Over-fetching | Use `$select` to minimize fields | N/A |
| Under-fetching | Use `$expand` for related data | N/A |
| Batching | Use `$batch` endpoint | N/A |
| Real-time | Use Graph Change Notifications (webhooks) | N/A |
| Type safety | OData CSDL; use Graph SDK | N/A |

**Note:** Microsoft Graph does not expose a GraphQL endpoint. OData is the query protocol. For Fabric/Dataverse, REST with OData is the standard. Use `$select`, `$filter`, `$expand`, and `$batch` to minimize round trips.

---

## Fabric API Research Patterns

```python
# Fabric REST API — research base URL
FABRIC_BASE = "https://api.fabric.microsoft.com/v1"

# Discover workspaces and items
GET {FABRIC_BASE}/workspaces
GET {FABRIC_BASE}/workspaces/{workspaceId}/items
GET {FABRIC_BASE}/workspaces/{workspaceId}/items?type=Lakehouse

# Long-running operations pattern
POST {FABRIC_BASE}/workspaces/{id}/lakehouses
# Returns: 202 Accepted with Location header
# Poll: GET {location_url}
# Until: {"status": "Succeeded"} or {"status": "Failed"}
```

---

## Error Codes Reference

| Code | Meaning | Research Action |
|------|---------|-----------------|
| `Authorization_RequestDenied` | Missing permission scope | Check method page for minimum required permissions |
| `Request_BadRequest` | Invalid query parameter | Validate OData syntax; check `$filter` operators for the resource |
| `Request_UnsupportedQuery` | `$filter`/`$orderby` not supported on this property | Check if property is indexed; use `ConsistencyLevel: eventual` |
| `TooManyRequests` | Throttled | Check `Retry-After` header; implement exponential backoff |
| `ServiceNotAvailable` | Transient error | Retry with backoff |
| `MailboxNotEnabledForRESTAPI` | User not licensed for Exchange | Check Exchange Online license on the user |
| `invalidRequest` | Beta feature not available in v1.0 | Confirm GA status; fall back to beta if needed |
| `NotFound` | Resource or navigation property doesn't exist | Verify the entity exists; check if navigation property requires `$expand` |

---

## Limits

| Resource | Limit | Notes |
|---|---|---|
| `$batch` requests per call | 20 sub-requests | Use multiple batch calls for larger sets |
| `$top` max (Graph) | 999 | Default varies by resource; always paginate |
| `$filter` on non-indexed properties | Requires `ConsistencyLevel: eventual` | Add `Count: true` header |
| `$expand` depth | 1 level | Multi-level expand not fully supported |
| Graph subscription (webhook) max | 100 per app | Use change tracking for high-volume scenarios |
| Change notification expiry | 1–4230 minutes depending on resource | Must renew before expiry |
| Graph Explorer session | No auth needed for `/me` with personal account | Use your own tenant for organizational data |
| Metadata file size | ~10 MB | Cache locally; avoid fetching per request |
