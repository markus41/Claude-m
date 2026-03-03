# Azure Cost Management API — Deep Reference

## Overview

The Azure Cost Management API provides programmatic access to cost and usage data across subscriptions, resource groups, management groups, and billing accounts. It supports cost queries with grouping/filtering, dimensional analysis, amortized vs actual cost comparisons, and cost export scheduling. This reference covers API patterns, query construction, and SDK usage.

## REST API Endpoints

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|---|---|---|---|---|
| POST | `/{scope}/providers/Microsoft.CostManagement/query` | Cost Management Reader | `type`, `timeframe`, `dataset` | Primary cost query endpoint |
| POST | `/{scope}/providers/Microsoft.CostManagement/forecast` | Cost Management Reader | Same as query + `includeActualCost` | Forecast future spend |
| GET | `/{scope}/providers/Microsoft.CostManagement/dimensions` | Cost Management Reader | `$filter`, `$top` | List available dimension values |
| POST | `/{scope}/providers/Microsoft.CostManagement/generateCostDetailsReport` | Cost Management Reader | `billingPeriod` or `timePeriod`, `metric` | Async detailed report generation |
| GET | `/{scope}/providers/Microsoft.CostManagement/costDetailsOperationResults/{id}` | Cost Management Reader | — | Poll for report generation status |
| GET | `/{scope}/providers/Microsoft.CostManagement/exports` | Cost Management Contributor | — | List scheduled exports |
| PUT | `/{scope}/providers/Microsoft.CostManagement/exports/{name}` | Cost Management Contributor | Export definition, delivery config | Create/update scheduled export |
| POST | `/{scope}/providers/Microsoft.CostManagement/exports/{name}/run` | Cost Management Contributor | — | Trigger export run immediately |
| GET | `/{scope}/providers/Microsoft.CostManagement/views` | Cost Management Reader | — | List saved cost analysis views |

Base: `https://management.azure.com`

## Scope Reference

| Scope | URI Path | Use Case |
|---|---|---|
| Management group | `/providers/Microsoft.Management/managementGroups/{id}` | Enterprise-wide cost rollup |
| Subscription | `/subscriptions/{id}` | Single subscription cost |
| Resource group | `/subscriptions/{id}/resourceGroups/{name}` | Team/project cost |
| EA Billing account | `/providers/Microsoft.Billing/billingAccounts/{id}` | EA enrollment cost |
| EA Department | `/providers/Microsoft.Billing/billingAccounts/{id}/departments/{deptId}` | Department cost |
| MCA Billing profile | `/providers/Microsoft.Billing/billingAccounts/{id}/billingProfiles/{profileId}` | MCA profile cost |

## Query Construction Patterns

### Basic monthly cost by service

```json
POST /subscriptions/{id}/providers/Microsoft.CostManagement/query?api-version=2025-03-01
{
  "type": "ActualCost",
  "timeframe": "TheLastMonth",
  "dataset": {
    "granularity": "Monthly",
    "aggregation": {
      "totalCost": { "name": "PreTaxCost", "function": "Sum" }
    },
    "grouping": [
      { "type": "Dimension", "name": "ServiceName" }
    ]
  }
}
```

### Daily cost by resource group with tag filter

```json
POST /subscriptions/{id}/providers/Microsoft.CostManagement/query?api-version=2025-03-01
{
  "type": "ActualCost",
  "timeframe": "Custom",
  "timePeriod": {
    "from": "2026-01-01T00:00:00Z",
    "to": "2026-01-31T23:59:59Z"
  },
  "dataset": {
    "granularity": "Daily",
    "aggregation": {
      "totalCost": { "name": "PreTaxCost", "function": "Sum" }
    },
    "grouping": [
      { "type": "Dimension", "name": "ResourceGroup" },
      { "type": "Dimension", "name": "ServiceName" }
    ],
    "filter": {
      "and": [
        {
          "tags": {
            "name": "Environment",
            "operator": "In",
            "values": ["Production"]
          }
        },
        {
          "dimensions": {
            "name": "ResourceType",
            "operator": "NotIn",
            "values": ["Microsoft.Resources/subscriptions/resourceGroups"]
          }
        }
      ]
    }
  }
}
```

### Amortized cost for reservation analysis

```json
POST /subscriptions/{id}/providers/Microsoft.CostManagement/query?api-version=2025-03-01
{
  "type": "AmortizedCost",
  "timeframe": "TheLastMonth",
  "dataset": {
    "granularity": "Monthly",
    "aggregation": {
      "totalCost": { "name": "PreTaxCost", "function": "Sum" }
    },
    "grouping": [
      { "type": "Dimension", "name": "PricingModel" },
      { "type": "Dimension", "name": "ServiceName" }
    ]
  }
}
```

## TypeScript SDK Patterns

### Cost query with pagination

```typescript
import { CostManagementClient } from "@azure/arm-costmanagement";
import { DefaultAzureCredential } from "@azure/identity";

const client = new CostManagementClient(new DefaultAzureCredential());

const scope = `/subscriptions/${process.env.SUBSCRIPTION_ID}`;

async function queryCostByService(startDate: string, endDate: string) {
  const queryResult = await client.query.usage(scope, {
    type: "ActualCost",
    timeframe: "Custom",
    timePeriod: { from: new Date(startDate), to: new Date(endDate) },
    dataset: {
      granularity: "Monthly",
      aggregation: {
        totalCost: { name: "PreTaxCost", function: "Sum" },
      },
      grouping: [
        { type: "Dimension", name: "ServiceName" },
        { type: "Dimension", name: "ResourceGroup" },
      ],
    },
  });

  // Parse columns header
  const columns = queryResult.columns?.map(c => c.name) ?? [];

  // Process rows
  const results: Record<string, unknown>[] = [];
  for (const row of queryResult.rows ?? []) {
    const item: Record<string, unknown> = {};
    columns.forEach((col, i) => { if (col) item[col] = row[i]; });
    results.push(item);
  }

  // Handle pagination
  let nextLink = queryResult.nextLink;
  while (nextLink) {
    // For paginated results, POST to the nextLink URL directly
    const nextPage = await fetch(nextLink, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${await getAccessToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "ActualCost",
        timeframe: "Custom",
        timePeriod: { from: startDate, to: endDate },
        dataset: { granularity: "Monthly", aggregation: { totalCost: { name: "PreTaxCost", function: "Sum" } } },
      }),
    });
    const page = await nextPage.json();
    for (const row of page.properties?.rows ?? []) {
      const item: Record<string, unknown> = {};
      columns.forEach((col, i) => { if (col) item[col] = row[i]; });
      results.push(item);
    }
    nextLink = page.properties?.nextLink;
  }

  return results;
}
```

### Cost analysis with multi-scope aggregation

```typescript
import { CostManagementClient } from "@azure/arm-costmanagement";
import { DefaultAzureCredential } from "@azure/identity";

const client = new CostManagementClient(new DefaultAzureCredential());

// Query cost across multiple subscriptions
async function aggregateCostAcrossSubscriptions(subscriptionIds: string[]) {
  const results = await Promise.all(
    subscriptionIds.map(async (subId) => {
      const scope = `/subscriptions/${subId}`;
      const result = await client.query.usage(scope, {
        type: "ActualCost",
        timeframe: "MonthToDate",
        dataset: {
          granularity: "Monthly",
          aggregation: { totalCost: { name: "PreTaxCost", function: "Sum" } },
          grouping: [{ type: "Dimension", name: "ServiceName" }],
        },
      });

      return {
        subscriptionId: subId,
        rows: result.rows ?? [],
        columns: result.columns?.map(c => c.name) ?? [],
      };
    })
  );

  // Aggregate across all subscriptions
  const totals = new Map<string, number>();
  for (const { rows, columns } of results) {
    const serviceIdx = columns.indexOf("ServiceName");
    const costIdx = columns.indexOf("PreTaxCost");
    for (const row of rows) {
      const service = String(row[serviceIdx]);
      const cost = Number(row[costIdx]);
      totals.set(service, (totals.get(service) ?? 0) + cost);
    }
  }

  return Array.from(totals.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([service, cost]) => ({ service, cost: Math.round(cost * 100) / 100 }));
}
```

### Generate detailed cost report (async pattern)

```typescript
import { fetch } from "node-fetch";

const BASE_URL = "https://management.azure.com";
const API_VERSION = "2024-08-01";
const scope = `/subscriptions/${process.env.SUBSCRIPTION_ID}`;

async function generateDetailedReport(accessToken: string) {
  // Start async report generation
  const startResponse = await fetch(
    `${BASE_URL}${scope}/providers/Microsoft.CostManagement/generateCostDetailsReport?api-version=${API_VERSION}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        metric: "ActualCost",
        timePeriod: {
          start: "2026-01-01",
          end: "2026-01-31",
        },
      }),
    }
  );

  if (startResponse.status !== 202) {
    throw new Error(`Failed to start report: ${startResponse.status}`);
  }

  const operationLocation = startResponse.headers.get("Location");
  const retryAfter = parseInt(startResponse.headers.get("Retry-After") ?? "30", 10);

  // Poll for completion
  let pollResponse;
  do {
    await new Promise(r => setTimeout(r, retryAfter * 1000));
    pollResponse = await fetch(operationLocation!, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } while (pollResponse.status === 202);

  const result = await pollResponse.json();
  // result.properties.downloadUrl contains a SAS URL to download the CSV/Parquet report
  console.log("Download URL:", result.properties?.downloadUrl);
  return result.properties?.downloadUrl;
}
```

## Azure CLI Patterns

```bash
# Query cost for current month grouped by service
az costmanagement query \
  --scope "/subscriptions/$SUBSCRIPTION_ID" \
  --type ActualCost \
  --timeframe MonthToDate \
  --dataset-granularity Monthly \
  --dataset-aggregation '{"totalCost":{"name":"PreTaxCost","function":"Sum"}}' \
  --dataset-grouping '[{"type":"Dimension","name":"ServiceName"}]'

# List dimensions available for a scope
az costmanagement dimension list \
  --scope "/subscriptions/$SUBSCRIPTION_ID" \
  --output table

# Create a scheduled export
az costmanagement export create \
  --name "monthly-export" \
  --scope "/subscriptions/$SUBSCRIPTION_ID" \
  --type ActualCost \
  --storage-account-id "$STORAGE_ACCOUNT_ID" \
  --storage-container "cost-exports" \
  --storage-path "" \
  --recurrence Monthly \
  --recurrence-period from="2026-01-01T00:00:00Z" to="2027-01-01T00:00:00Z" \
  --timeframe MonthToDate

# Trigger export run
az costmanagement export run \
  --name "monthly-export" \
  --scope "/subscriptions/$SUBSCRIPTION_ID"
```

## Error Codes

| Code | Meaning | Remediation |
|---|---|---|
| 400 BadRequest | Malformed query body or unsupported field combination | Validate JSON against schema; check `granularity` is Daily for forecast |
| 401 AccountCostDisabled | EA "view charges" not enabled for role | EA Admin must enable DepartmentAdmin/AccountOwner view charges |
| 403 AuthorizationFailed | Missing Cost Management Reader role | Assign Cost Management Reader at the target scope |
| 404 SubscriptionNotFound | Subscription ID invalid or subscription is Free/Trial | Cost Management not supported on Free/Trial subscriptions |
| 404 BillingAccountNotFound | Invalid billing account ID | Verify billing account GUID in Azure portal |
| 422 UnprocessableEntity | Date range exceeds 3 years | Split queries into smaller date ranges |
| 424 FailedDependency | Forecast lacks sufficient history | Wait for at least 7 days of data |
| 429 ResourceRequestsThrottled | Rate limit hit | Respect `Retry-After` header; reduce query frequency |

## Throttling Limits

| Resource | Limit | Retry Strategy |
|---|---|---|
| Query API calls | ~30 per minute per scope | Cache results; retry with backoff after 429 |
| Max rows per query page | 1,000 rows | Use `nextLink` for continuation |
| Forecast API calls | Lower limit than query | Cache forecasts for 1 hour; avoid per-request forecast calls |
| Export generations | 5 concurrent per subscription | Queue exports; poll `generateCostDetailsReport` status |
| Scheduled exports | 10 per scope | Reuse existing exports; schedule at off-peak times |

## Production Gotchas

- **Cost data has up to 24-hour lag**: Azure cost data appears with a delay of up to 24 hours. Do not compare yesterday's cost to today expecting real-time accuracy. Use monthly or weekly aggregations for dashboards.
- **Currency consistency**: All cost values in the API are in the billing currency. Multi-currency environments (multiple subscriptions with different billing currencies) require normalization before aggregation. Check `currency` in the response.
- **Free tier resources appear in cost API with zero cost**: Resources on free tiers (e.g., Azure Functions Consumption first 1M executions) appear in cost data with a PreTaxCost of 0. Filter by `PreTaxCost > 0` if you want to exclude free-tier usage.
- **AmortizedCost vs ActualCost**: Use `ActualCost` for month-to-date invoice reconciliation. Use `AmortizedCost` for reservation utilization analysis (spreads upfront reservation purchases over the commitment period). Mixing types in a single analysis gives misleading results.
- **Management group scope requires explicit permissions**: Querying at the management group scope requires Cost Management Reader role at the management group level, not just at subscription level. IAM at management group level is separate from subscription-level RBAC.
- **Pagination is required**: The Cost Management Query API returns at most 1,000 rows per call. Always check for `nextLink` and paginate. Not all results are returned in the first call, even for small datasets.
