# Azure FinOps Queries — Deep Reference

## Overview

FinOps (Financial Operations) practices for Azure involve systematic cost analysis, allocation, forecasting, and optimization. This reference provides ready-to-use cost query patterns, chargeback/showback calculations, reservation utilization analysis, tag compliance auditing, and cross-subscription cost aggregation queries.

## Standard FinOps Query Patterns

### Monthly Cost Trend (Last 6 Months)

```json
POST /subscriptions/{id}/providers/Microsoft.CostManagement/query?api-version=2025-03-01
{
  "type": "ActualCost",
  "timeframe": "Custom",
  "timePeriod": {
    "from": "2025-10-01T00:00:00Z",
    "to": "2026-03-31T23:59:59Z"
  },
  "dataset": {
    "granularity": "Monthly",
    "aggregation": {
      "totalCost": { "name": "PreTaxCost", "function": "Sum" }
    },
    "grouping": [
      { "type": "Dimension", "name": "ServiceFamily" }
    ]
  }
}
```

### Chargeback by Cost Center Tag

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
      { "type": "TagKey", "name": "CostCenter" },
      { "type": "Dimension", "name": "ServiceName" }
    ]
  }
}
```

### Tag Compliance — Untagged Spend

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
      { "type": "Dimension", "name": "ResourceGroup" },
      { "type": "TagKey", "name": "CostCenter" }
    ],
    "filter": {
      "tags": {
        "name": "CostCenter",
        "operator": "In",
        "values": [""]
      }
    }
  }
}
```

### Reservation Utilization (AmortizedCost)

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

### Top 20 Most Expensive Resources

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
      { "type": "Dimension", "name": "ResourceId" },
      { "type": "Dimension", "name": "ResourceType" },
      { "type": "Dimension", "name": "ResourceGroup" }
    ],
    "sorting": [
      { "name": "PreTaxCost", "direction": "Descending" }
    ],
    "top": 20
  }
}
```

### Marketplace vs First-Party Spend

```json
POST /subscriptions/{id}/providers/Microsoft.CostManagement/query?api-version=2025-03-01
{
  "type": "ActualCost",
  "timeframe": "MonthToDate",
  "dataset": {
    "granularity": "Monthly",
    "aggregation": {
      "totalCost": { "name": "PreTaxCost", "function": "Sum" }
    },
    "grouping": [
      { "type": "Dimension", "name": "PublisherType" },
      { "type": "Dimension", "name": "ServiceName" }
    ]
  }
}
```

## TypeScript FinOps Analysis Functions

```typescript
import { CostManagementClient } from "@azure/arm-costmanagement";
import { DefaultAzureCredential } from "@azure/identity";

const client = new CostManagementClient(new DefaultAzureCredential());

// Helper: parse cost query rows into objects
function parseQueryRows(columns: Array<{name?: string}>, rows: unknown[][]): Record<string, unknown>[] {
  return rows.map(row => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => { if (col.name) obj[col.name] = row[i]; });
    return obj;
  });
}

// Month-over-month cost delta analysis
async function analyzeCostTrend(scope: string): Promise<{ service: string; lastMonth: number; thisMonth: number; delta: number; deltaPct: number }[]> {
  const now = new Date();
  const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

  // Query last month
  const lastMonthResult = await client.query.usage(scope, {
    type: "ActualCost",
    timeframe: "Custom",
    timePeriod: { from: new Date(firstOfLastMonth), to: new Date(endOfLastMonth) },
    dataset: {
      granularity: "Monthly",
      aggregation: { totalCost: { name: "PreTaxCost", function: "Sum" } },
      grouping: [{ type: "Dimension", name: "ServiceName" }],
    },
  });

  // Query this month
  const thisMonthResult = await client.query.usage(scope, {
    type: "ActualCost",
    timeframe: "MonthToDate",
    dataset: {
      granularity: "Monthly",
      aggregation: { totalCost: { name: "PreTaxCost", function: "Sum" } },
      grouping: [{ type: "Dimension", name: "ServiceName" }],
    },
  });

  const lastMonthMap = new Map<string, number>();
  for (const row of parseQueryRows(lastMonthResult.columns ?? [], (lastMonthResult.rows ?? []) as unknown[][])) {
    lastMonthMap.set(String(row["ServiceName"]), Number(row["PreTaxCost"]));
  }

  const results: Array<{ service: string; lastMonth: number; thisMonth: number; delta: number; deltaPct: number }> = [];
  for (const row of parseQueryRows(thisMonthResult.columns ?? [], (thisMonthResult.rows ?? []) as unknown[][])) {
    const service = String(row["ServiceName"]);
    const thisMonth = Number(row["PreTaxCost"]);
    const lastMonth = lastMonthMap.get(service) ?? 0;
    const delta = thisMonth - lastMonth;
    const deltaPct = lastMonth > 0 ? (delta / lastMonth) * 100 : 100;

    results.push({ service, lastMonth, thisMonth, delta, deltaPct: Math.round(deltaPct * 10) / 10 });
  }

  return results.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

// Tag compliance report
async function tagComplianceReport(scope: string, requiredTags: string[]): Promise<{
  totalCost: number;
  taggedCost: number;
  untaggedCost: number;
  compliancePct: number;
  untaggedByResourceGroup: Array<{ resourceGroup: string; cost: number }>;
}> {
  // Get total cost
  const totalResult = await client.query.usage(scope, {
    type: "ActualCost",
    timeframe: "TheLastMonth",
    dataset: {
      granularity: "Monthly",
      aggregation: { totalCost: { name: "PreTaxCost", function: "Sum" } },
    },
  });
  const totalCost = Number((totalResult.rows ?? [[0]])[0]?.[0] ?? 0);

  // Get untagged cost by resource group (for first required tag)
  const primaryTag = requiredTags[0];
  const untaggedResult = await client.query.usage(scope, {
    type: "ActualCost",
    timeframe: "TheLastMonth",
    dataset: {
      granularity: "Monthly",
      aggregation: { totalCost: { name: "PreTaxCost", function: "Sum" } },
      grouping: [{ type: "Dimension", name: "ResourceGroup" }],
      filter: {
        tags: { name: primaryTag, operator: "In", values: [""] },
      },
    },
  });

  const untaggedByRG = parseQueryRows(untaggedResult.columns ?? [], (untaggedResult.rows ?? []) as unknown[][])
    .map(row => ({ resourceGroup: String(row["ResourceGroup"]), cost: Number(row["PreTaxCost"]) }))
    .sort((a, b) => b.cost - a.cost);

  const untaggedCost = untaggedByRG.reduce((sum, r) => sum + r.cost, 0);
  const taggedCost = totalCost - untaggedCost;
  const compliancePct = totalCost > 0 ? (taggedCost / totalCost) * 100 : 100;

  return {
    totalCost: Math.round(totalCost * 100) / 100,
    taggedCost: Math.round(taggedCost * 100) / 100,
    untaggedCost: Math.round(untaggedCost * 100) / 100,
    compliancePct: Math.round(compliancePct * 10) / 10,
    untaggedByResourceGroup: untaggedByRG,
  };
}

// Reservation vs on-demand savings analysis
async function reservationSavingsAnalysis(scope: string): Promise<{
  reservedCost: number;
  onDemandCost: number;
  spotCost: number;
  estimatedOnDemandIfNoReservations: number;
  reservationSavings: number;
}> {
  const result = await client.query.usage(scope, {
    type: "AmortizedCost",
    timeframe: "TheLastMonth",
    dataset: {
      granularity: "Monthly",
      aggregation: { totalCost: { name: "PreTaxCost", function: "Sum" } },
      grouping: [{ type: "Dimension", name: "PricingModel" }],
    },
  });

  const rows = parseQueryRows(result.columns ?? [], (result.rows ?? []) as unknown[][]);
  const costByModel = new Map(rows.map(r => [String(r["PricingModel"]), Number(r["PreTaxCost"])]));

  const reservedCost = costByModel.get("Reservation") ?? 0;
  const onDemandCost = costByModel.get("OnDemand") ?? 0;
  const spotCost = costByModel.get("Spot") ?? 0;

  // Rough estimate: reservations are ~30-40% cheaper than on-demand
  // Actual savings require Advisor Reservation recommendations
  const estimatedOnDemandIfNoReservations = reservedCost / 0.65; // assume 35% savings
  const reservationSavings = estimatedOnDemandIfNoReservations - reservedCost;

  return {
    reservedCost: Math.round(reservedCost * 100) / 100,
    onDemandCost: Math.round(onDemandCost * 100) / 100,
    spotCost: Math.round(spotCost * 100) / 100,
    estimatedOnDemandIfNoReservations: Math.round(estimatedOnDemandIfNoReservations * 100) / 100,
    reservationSavings: Math.round(reservationSavings * 100) / 100,
  };
}
```

## Azure CLI FinOps Workflows

```bash
# Full FinOps monthly report
SCOPE="/subscriptions/$SUBSCRIPTION_ID"
LAST_MONTH_START=$(date -d "$(date +%Y-%m-01) -1 month" +%Y-%m-01)
LAST_MONTH_END=$(date -d "$(date +%Y-%m-01) -1 day" +%Y-%m-%d)

# 1. Total spend last month
echo "=== Total Spend: $LAST_MONTH_START to $LAST_MONTH_END ==="
az costmanagement query \
  --scope "$SCOPE" \
  --type ActualCost \
  --timeframe Custom \
  --time-period from="$LAST_MONTH_START" to="$LAST_MONTH_END" \
  --dataset-granularity Monthly \
  --dataset-aggregation '{"totalCost":{"name":"PreTaxCost","function":"Sum"}}' \
  --output json | jq '.properties.rows[0][0]'

# 2. Top 5 cost drivers
echo "=== Top Cost Drivers ==="
az costmanagement query \
  --scope "$SCOPE" \
  --type ActualCost \
  --timeframe Custom \
  --time-period from="$LAST_MONTH_START" to="$LAST_MONTH_END" \
  --dataset-granularity Monthly \
  --dataset-aggregation '{"totalCost":{"name":"PreTaxCost","function":"Sum"}}' \
  --dataset-grouping '[{"type":"Dimension","name":"ServiceName"}]' \
  --output json | jq -r '.properties | [.columns[].name] as $cols | .rows[] | [(.[($cols | index("ServiceName"))]), (.[($cols | index("PreTaxCost"))] | round)] | @tsv' | sort -t$'\t' -k2 -rn | head -5

# 3. Tag compliance check
echo "=== Untagged Spend (missing CostCenter tag) ==="
az costmanagement query \
  --scope "$SCOPE" \
  --type ActualCost \
  --timeframe TheLastMonth \
  --dataset-granularity Monthly \
  --dataset-aggregation '{"totalCost":{"name":"PreTaxCost","function":"Sum"}}' \
  --dataset-grouping '[{"type":"Dimension","name":"ResourceGroup"}]' \
  --dataset-filter '{"tags":{"name":"CostCenter","operator":"In","values":[""]}}' \
  --output json | jq -r '.properties.rows | sort_by(-.[0]) | .[:10][] | [.[1], .[0]] | @tsv'

# 4. Anomaly detection (services with >20% MoM growth)
echo "=== Services with Significant Month-over-Month Growth ==="
# (Requires two query calls and comparison — implement in TypeScript above)
```

## Cost Allocation and Showback Patterns

```bash
# Create tag policy to enforce required tags
az policy assignment create \
  --name "require-costcenter-tag" \
  --scope "/subscriptions/$SUBSCRIPTION_ID" \
  --policy "/providers/Microsoft.Authorization/policyDefinitions/96670d01-0a4d-4649-9c89-2d3abc0a5025" \
  --params '{"tagName":{"value":"CostCenter"}}'

# Assign cost tags to resource groups
for RG in rg-team-a rg-team-b rg-team-c; do
  COST_CENTER=$(az group show --name "$RG" --query "tags.CostCenter" -o tsv || echo "Unassigned")
  echo "$RG: $COST_CENTER"
done

# Tag all VMs in a resource group with team tag
az resource list \
  --resource-group rg-team-a \
  --resource-type "Microsoft.Compute/virtualMachines" \
  --output json | \
  jq -r '.[].id' | \
  xargs -I{} az tag update \
    --resource-id {} \
    --operation merge \
    --tags "Team=TeamA" "CostCenter=CC-001" "Environment=Production"
```

## Error Codes

| Code | Meaning | Remediation |
|---|---|---|
| 422 InvalidTimePeriod | Date range exceeds maximum (3 years) | Split into multiple queries with shorter date ranges |
| 400 InvalidGroupBy | Grouping dimension not valid for this scope | Use `dimensions` endpoint to check valid names for scope |
| 400 TooManyGroupings | More than 2 grouping clauses | Cost API supports max 2 grouping dimensions per query |
| 404 ScopeNotFound | Billing scope ID invalid | Verify scope format and permissions on billing account |
| 429 Throttled | Too many Cost Management API calls | Cache results for at least 1 hour; add retry with backoff |

## Throttling Limits

| Resource | Limit | Notes |
|---|---|---|
| Cost Management Query API | ~30 requests/minute per scope | Implement query result caching with 1-hour TTL |
| Maximum date range per query | 3 years | Split historical analysis into annual queries |
| Maximum grouping dimensions | 2 per query | Use multiple queries and join results in application |
| Maximum filter values per dimension | 500 values | Use broader filters; post-filter in application logic |
| Cost data freshness | Up to 24 hours | Do not alert on hourly cost data; use daily aggregations |

## Production Gotchas

- **Cost data is eventually consistent**: Charges may appear in the API up to 24 hours after the resource is used. Billing data for the current month may be revised as Azure finalizes invoices. Never use raw cost data for financial reconciliation without a 24–48 hour buffer.
- **Reservation amortization requires AmortizedCost type**: When querying costs for environments that use reservations, use `AmortizedCost` to spread the upfront reservation cost across the commitment period. `ActualCost` shows the full reservation purchase in the month it was bought.
- **Tag inheritance limitations**: Tags set at the subscription or management group level are NOT automatically inherited by child resources. Use Azure Policy with the `inheritTagFromSubscription` or `inheritTagFromResourceGroup` effect to enforce tag inheritance.
- **Multi-currency subscriptions**: If your organization spans multiple Azure subscriptions in different billing currencies, cost queries return values in each subscription's billing currency. Normalize to a single currency using exchange rates before aggregating.
- **Cost for resource groups vs actual resource costs**: When grouping by ResourceGroup, Azure allocates shared costs (bandwidth, support charges) proportionally to resource groups. These shared costs may appear in resource group totals but not in individual resource-level queries.
- **Savings estimate accuracy**: Azure Advisor savings estimates are calculated based on the last 30 days of usage and current pricing. Actual savings depend on actual usage patterns and price changes. Use ±20% as a confidence interval for savings estimates.
