# Operational Knowledge: Azure Tenant Assessment

Compact reference for ARM REST API surface, prerequisites, failure modes, pagination, and safe-default patterns.

## ARM REST API Surface

### Base URL

```
https://management.azure.com
```

### Key Endpoints

| Method | Endpoint | API Version | Purpose |
|--------|----------|-------------|---------|
| GET | `/subscriptions` | `2022-12-01` | List all subscriptions in tenant |
| GET | `/subscriptions/{id}` | `2022-12-01` | Get single subscription details |
| GET | `/subscriptions/{id}/resourceGroups` | `2021-04-01` | List resource groups in subscription |
| GET | `/subscriptions/{id}/resourceGroups/{rg}` | `2021-04-01` | Get single resource group |
| GET | `/subscriptions/{id}/resources` | `2021-04-01` | List all resources in subscription |
| GET | `/subscriptions/{id}/resourceGroups/{rg}/resources` | `2021-04-01` | List resources in a resource group |
| GET | `/providers` | `2021-04-01` | List all registered resource providers |
| GET | `/subscriptions/{id}/providers` | `2021-04-01` | List registered providers for subscription |

### MCP Tool Names (microsoft-azure-mcp)

| MCP tool | ARM equivalent | Notes |
|---|---|---|
| `azure_list_subscriptions` | `GET /subscriptions` | Returns array of subscription objects |
| `azure_list_resource_groups` | `GET /subscriptions/{id}/resourceGroups` | Requires `subscriptionId` parameter |
| `azure_list_resources` | `GET /subscriptions/{id}/resources` or per-RG | Requires `subscriptionId`; optionally `resourceGroupName` |

## Prerequisite Matrix

| Assessment scope | Minimum Azure RBAC role | Required context fields |
|---|---|---|
| List subscriptions | Reader on any subscription | `tenantId` |
| List resource groups | Reader on the subscription | `tenantId`, `subscriptionId` |
| List resources | Reader on the resource group or subscription | `tenantId`, `subscriptionId` |
| Cost overview (optional) | Cost Management Reader | `tenantId`, `subscriptionId` |
| Security posture (optional) | Security Reader | `tenantId`, `subscriptionId` |

**Minimum for full assessment**: Azure `Reader` role at subscription scope.

## Common Failure Modes

| Failure | Symptom | Resolution |
|---|---|---|
| No subscriptions returned | `azure_list_subscriptions` returns empty array | User has no Reader role on any subscription; verify RBAC |
| `AuthorizationFailed` on RG list | 403 from ARM | Reader role is scoped too narrowly; need subscription-level Reader |
| Paginated responses truncated | Resource count lower than expected | Must follow `nextLink` — see pagination section |
| Sovereign cloud mismatch | 401 or wrong endpoint | Check `environmentCloud` in integration context; use correct base URL |
| MCP tools not available | Tool call fails with unknown tool | Fall back to guided mode; recommend installing `microsoft-azure-mcp` |
| Multiple subscription pages | `nextLink` present on subscriptions | Rare but possible in large CSP/MSP tenants; handle pagination |

## Pagination

ARM list operations return at most **1,000 items** per page. For tenants with many resources:

1. Check response for `nextLink` property at the top level of the response object.
2. If present, `GET` the full `nextLink` URL (it contains `$skiptoken`).
3. Repeat until `nextLink` is absent or `null`.
4. Aggregate all pages before computing resource counts and type taxonomy.

Example response structure:
```json
{
  "value": [ ... up to 1000 items ... ],
  "nextLink": "https://management.azure.com/subscriptions/.../resources?$skiptoken=..."
}
```

When using MCP tools, check if the tool returns a pagination token or automatically follows `nextLink`. If not, note the limitation in the report ("resource count may be partial for subscriptions with >1000 resources").

## Safe-Default Pattern

The assessment is **strictly read-only**:
- Never create, modify, or delete any Azure resource.
- Never write to Azure (no PUT, PATCH, POST, DELETE ARM calls).
- MCP tools used: `azure_list_subscriptions`, `azure_list_resource_groups`, `azure_list_resources` — all GET operations.
- Report file is written locally to disk only.
- If a write operation is accidentally requested, refuse and explain the read-only constraint.

## Resource Type Taxonomy

When building the resource catalog, normalize resource types as follows:

1. Collect the `type` field from each resource object (e.g., `microsoft.compute/virtualmachines`).
2. Normalize to title case: `Microsoft.Compute/virtualMachines`.
3. Group by type and count occurrences.
4. Extract the namespace prefix (e.g., `Microsoft.Compute`) for plugin matrix matching.
5. Sort by count descending for the report table.

## Redaction Rules

Redact the following identifiers in all report output:
- Tenant IDs: show as `xxxxxxxx-xxxx-xxxx-xxxx-xxxx<last4>`
- Subscription IDs: show as `xxxx...yyyy` (first 4 + `...` + last 4 characters)
- Object IDs / principal IDs: same redaction pattern
- Service principal application IDs: same redaction pattern

Resource group names and resource names are generally non-sensitive and may be shown unredacted unless they contain embedded GUIDs or PII patterns.
