---
name: azure-cost-governance
description: >
  Deep expertise in Azure Cost Management FinOps — cost queries, budget alerts, forecast,
  idle resource detection, usage details, scope hierarchy, dimension grouping, and
  savings recommendations via the Azure Cost Management and Consumption REST APIs.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
triggers:
  - azure cost
  - cost management
  - finops
  - cost query
  - budget alert
  - idle resources
  - cost savings
  - azure spend
  - cost forecast
  - cost optimization
  - budget overrun
  - cost analysis
  - cost policy optimization workflow
---

# Azure Cost Governance

## Shared Workflow Routing
- Use the shared workflow spec for deterministic multi-plugin routing: [`workflows/multi-plugin-workflows.md`](../../../workflows/multi-plugin-workflows.md#cost--policy-optimization-azure-cost-governance--azure-policy-security--microsoft-azure-mcp).
- Apply the trigger phrases, handoff contracts, auth prerequisites, validation checkpoints, and stop conditions before escalating to the next plugin.


This skill provides comprehensive FinOps guidance via the Azure Cost Management and Consumption REST APIs — cost queries, budgets, forecasts, idle resource detection, and savings recommendations with risk-ranked actions and rollback notes.

## Integration Context Contract
- Canonical contract: [`docs/integration-context.md`](../../../docs/integration-context.md)

| Workflow | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Cost query, budget, idle resource analysis | required | required | `AzureCloud`\* | `delegated-user` or `service-principal` | `CostManagement.Read`, `Consumption.Read`, Azure `Reader` |

\* Use sovereign cloud values from the canonical contract when applicable.

Fail fast before API calls when required context is missing or invalid. Redact tenant/subscription/object IDs in outputs.

## Base URLs

```
Cost Management:  https://management.azure.com/{scope}/providers/Microsoft.CostManagement
Consumption:      https://management.azure.com/{scope}/providers/Microsoft.Consumption
```

## API Endpoints

### Cost Management (Microsoft.CostManagement)

| Method | Endpoint | API Version | Purpose |
|--------|----------|-------------|---------|
| POST | `/{scope}/providers/Microsoft.CostManagement/query` | `2025-03-01` | Query cost data with grouping and filters |
| POST | `/{scope}/providers/Microsoft.CostManagement/forecast` | `2024-08-01` | Forecast future costs |
| GET | `/{scope}/providers/Microsoft.CostManagement/dimensions` | `2024-08-01` | List available dimensions for grouping |
| POST | `/{scope}/providers/Microsoft.CostManagement/generateCostDetailsReport` | `2024-08-01` | Generate detailed cost report (replaces Usage Details) |

### Consumption (Microsoft.Consumption)

| Method | Endpoint | API Version | Purpose |
|--------|----------|-------------|---------|
| PUT | `/{scope}/providers/Microsoft.Consumption/budgets/{name}` | `2024-08-01` | Create or update budget |
| GET | `/{scope}/providers/Microsoft.Consumption/budgets` | `2024-08-01` | List budgets |
| GET | `/{scope}/providers/Microsoft.Consumption/budgets/{name}` | `2024-08-01` | Get budget details |
| DELETE | `/{scope}/providers/Microsoft.Consumption/budgets/{name}` | `2024-08-01` | Delete budget |
| GET | `/{scope}/providers/Microsoft.Consumption/usageDetails` | `2024-08-01` | List usage details (deprecated — use generateCostDetailsReport) |

## Query API

### Request Body Schema

```json
POST /{scope}/providers/Microsoft.CostManagement/query?api-version=2025-03-01
{
  "type": "ActualCost",
  "timeframe": "MonthToDate",
  "dataset": {
    "granularity": "Daily",
    "aggregation": {
      "totalCost": {
        "name": "PreTaxCost",
        "function": "Sum"
      }
    },
    "grouping": [
      {
        "name": "ServiceName",
        "type": "Dimension"
      }
    ],
    "filter": {
      "dimensions": {
        "name": "ResourceGroup",
        "operator": "In",
        "values": ["rg-production", "rg-staging"]
      }
    }
  }
}
```

### Query Type Values

| Type | Description |
|------|-------------|
| `ActualCost` | Actual billed cost |
| `AmortizedCost` | Spreads reservation purchases over the commitment term |
| `Usage` | Equivalent to ActualCost for non-reservation scopes |

### Timeframe Values

| Timeframe | Description |
|-----------|-------------|
| `MonthToDate` | Current month so far |
| `BillingMonthToDate` | Current billing month |
| `TheLastMonth` | Previous full calendar month |
| `TheLastBillingMonth` | Previous full billing month |
| `WeekToDate` | Current week (Monday-based) |
| `Custom` | Requires `timePeriod` with `from` and `to` dates |

### Custom Time Period

```json
{
  "type": "ActualCost",
  "timeframe": "Custom",
  "timePeriod": {
    "from": "2026-01-01T00:00:00Z",
    "to": "2026-01-31T23:59:59Z"
  },
  "dataset": { ... }
}
```

### Dataset Options

- `granularity`: `Daily` or `Monthly`
- `aggregation`: up to 2 clauses, only `Sum` function. Columns: `PreTaxCost`, `Cost`, `CostUSD`, `PreTaxCostUSD`
- `grouping`: up to 2 clauses, `type` is `Dimension` or `TagKey`
- `filter`: nested structure with `and[]`, `or[]`, `dimensions`, `tags`

### Filter Structure

```json
{
  "filter": {
    "and": [
      {
        "dimensions": {
          "name": "ResourceGroup",
          "operator": "In",
          "values": ["rg-production"]
        }
      },
      {
        "tags": {
          "name": "Environment",
          "operator": "In",
          "values": ["Production"]
        }
      }
    ]
  }
}
```

### Pagination

Response includes `properties.nextLink` when more pages exist. POST the same body to the full `nextLink` URL (contains `$skiptoken`) until `nextLink` is `null`.

## Budgets API

### Create/Update Budget

```json
PUT /{scope}/providers/Microsoft.Consumption/budgets/{budgetName}?api-version=2024-08-01
{
  "properties": {
    "category": "Cost",
    "amount": 5000,
    "timeGrain": "Monthly",
    "timePeriod": {
      "startDate": "2026-03-01T00:00:00Z",
      "endDate": "2027-02-28T00:00:00Z"
    },
    "filter": {
      "and": [
        {
          "dimensions": {
            "name": "ResourceGroupName",
            "operator": "In",
            "values": ["rg-production"]
          }
        }
      ]
    },
    "notifications": {
      "actual_GreaterThan_80_Percent": {
        "enabled": true,
        "operator": "GreaterThan",
        "threshold": 80,
        "thresholdType": "Actual",
        "contactEmails": ["finops@contoso.com"],
        "contactRoles": ["Owner", "Contributor"],
        "contactGroups": [],
        "locale": "en-us"
      },
      "forecasted_GreaterThan_100_Percent": {
        "enabled": true,
        "operator": "GreaterThan",
        "threshold": 100,
        "thresholdType": "Forecasted",
        "contactEmails": ["finops@contoso.com"],
        "contactRoles": ["Owner"]
      }
    }
  }
}
```

### Budget Properties

| Property | Values | Description |
|----------|--------|-------------|
| `category` | `Cost` | Only `Cost` is supported |
| `timeGrain` | `Monthly`, `Quarterly`, `Annually` | Budget evaluation period |
| `thresholdType` | `Actual`, `Forecasted` | Alert on actual spend or forecasted spend |
| `operator` | `GreaterThan`, `GreaterThanOrEqualTo`, `EqualTo` | Alert comparison |
| `threshold` | 0-1000 | Percentage of budget amount |

Up to 5 notification rules per budget.

## Forecast API

```json
POST /{scope}/providers/Microsoft.CostManagement/forecast?api-version=2024-08-01
{
  "type": "ActualCost",
  "timeframe": "Custom",
  "timePeriod": {
    "from": "2026-03-01T00:00:00Z",
    "to": "2026-03-31T23:59:59Z"
  },
  "dataset": {
    "granularity": "Daily",
    "aggregation": {
      "totalCost": {
        "name": "Cost",
        "function": "Sum"
      }
    }
  },
  "includeActualCost": true,
  "includeFreshPartialCost": true
}
```

**Notes:**
- `timeframe` must be `Custom` for forecast
- `granularity` must be `Daily`
- `includeActualCost: true` merges already-accrued actuals with forecast rows
- Requires at least 1 week of historical data; returns `424 FailedDependency` if insufficient

## Usage Details (OData Filters)

```
GET /{scope}/providers/Microsoft.Consumption/usageDetails?api-version=2024-08-01
  &$filter=properties/resourceGroup eq 'rg-production' and properties/usageStart ge '2026-02-01'
  &$top=1000
  &metric=ActualCost
```

**Note:** This API is deprecated. Use `generateCostDetailsReport` for new implementations.

| Parameter | Description |
|-----------|-------------|
| `$filter` | OData filter on `properties/resourceGroup`, `properties/resourceName`, `properties/chargeType`, `properties/publisherType`, `tags` |
| `$top` | 1-1000 results per page |
| `$skiptoken` | Pagination token |
| `$expand` | `additionalInfo`, `meterDetails` |
| `metric` | `ActualCost`, `AmortizedCost`, `Usage` |

## Scope Reference

| Scope | URI Path |
|-------|----------|
| Management group | `/providers/Microsoft.Management/managementGroups/{id}` |
| Subscription | `/subscriptions/{id}` |
| Resource group | `/subscriptions/{id}/resourceGroups/{name}` |
| EA Billing account | `/providers/Microsoft.Billing/billingAccounts/{id}` |
| EA Department | `/providers/Microsoft.Billing/billingAccounts/{id}/departments/{deptId}` |
| EA Enrollment account | `/providers/Microsoft.Billing/billingAccounts/{id}/enrollmentAccounts/{acctId}` |
| MCA Billing profile | `/providers/Microsoft.Billing/billingAccounts/{id}/billingProfiles/{profileId}` |
| MCA Invoice section | `/providers/Microsoft.Billing/billingAccounts/{id}/billingProfiles/{profileId}/invoiceSections/{sectionId}` |

## Dimension Reference

Common dimension names for `grouping` and `filter`:

### Resource Dimensions

| Dimension | Description |
|-----------|-------------|
| `ResourceId` | Full ARM resource ID |
| `ResourceGroup` | Resource group name |
| `ResourceType` | ARM resource type (e.g., `Microsoft.Compute/virtualMachines`) |
| `ResourceLocation` | Azure region |
| `ResourceName` | Resource display name |

### Service Dimensions

| Dimension | Description |
|-----------|-------------|
| `ServiceName` | Service category (equivalent to MeterCategory) |
| `ServiceFamily` | Broader service family grouping |
| `MeterCategory` | Meter category |
| `MeterSubCategory` | Meter sub-category |
| `Meter` | Specific meter |
| `UnitOfMeasure` | Billing unit |

### Billing Dimensions

| Dimension | Description |
|-----------|-------------|
| `ChargeType` | `Usage`, `Purchase`, `Refund`, `Adjustment` |
| `PublisherType` | `Microsoft`/`Azure` (first-party) or `Marketplace` (third-party) |
| `Frequency` | `OneTime`, `Recurring`, `UsageBased` |
| `PricingModel` | `OnDemand`, `Reservation`, `Spot` |
| `SubscriptionId` | Subscription GUID |

### Tag Dimensions

Use `type: "TagKey"` in grouping. Use `filter.tags` for tag-based filtering.

## Common FinOps Patterns

### Pattern 1: Monthly Cost Breakdown by Service

1. `POST /{scope}/providers/Microsoft.CostManagement/query` with `type: ActualCost`, `timeframe: TheLastMonth`, grouping by `ServiceName`
2. Sort results by cost descending
3. Identify top 5 cost drivers
4. Compare with previous month using `Custom` timeframe
5. Flag services with >20% month-over-month growth

### Pattern 2: Budget Health Check

1. `GET /{scope}/providers/Microsoft.Consumption/budgets` — list all budgets
2. For each budget: calculate `currentSpend / amount * 100` to get utilization percentage
3. `POST .../forecast` — forecast remaining month spend
4. If forecast exceeds budget: flag with projected overrun amount
5. Generate alert recommendations for budgets missing forecasted thresholds

### Pattern 3: Idle Resource Detection

1. Query cost by `ResourceId` for the last 30 days — identify resources with near-zero cost
2. Cross-reference with Azure Advisor recommendations for right-sizing
3. Check for: unattached disks, stopped VMs with premium disks, idle load balancers, unused public IPs
4. Estimate monthly savings per idle resource
5. Classify by reversibility: safe to stop (VMs), safe to delete (unattached disks), needs review (load balancers)

### Pattern 4: Tag Compliance Audit

1. Query cost grouped by a required tag (e.g., `CostCenter`) — identify untagged spend
2. `POST .../query` with filter for resources missing the tag
3. Calculate percentage of total spend that is untagged
4. Identify top untagged resource groups for remediation
5. Produce tag compliance report with untagged cost by resource group

### Pattern 5: Reservation Utilization Review

1. `POST .../query` with `type: AmortizedCost` to see reservation amortization
2. Compare amortized cost vs on-demand equivalent
3. Identify underutilized reservations (amortized cost > actual usage)
4. Recommend reservation modifications or exchanges
5. Calculate net savings from reservation portfolio

## Required Permissions

| Role | Description |
|------|-------------|
| Cost Management Reader | Read cost data, view budgets/exports, view recommendations |
| Cost Management Contributor | Read/write budgets, exports, shared views |
| Reader | Read all cost data (includes Cost Management Reader) |
| Contributor | Full cost management access (includes Cost Management Contributor) |
| Billing Reader | Read billing data and invoices |
| Monitoring Contributor | Required for budget Action Group notifications |

**EA-specific roles:** Enterprise Administrator, Enterprise Read-Only, Department Administrator (requires DA view charges enabled), Account Owner (requires AO view charges enabled).

## Error Handling

| Status Code | Error Code | Common Cause |
|-------------|-----------|--------------|
| 400 | `BadRequest` | Malformed query body, unsupported scope, invalid filter |
| 401 | `AccountCostDisabled` | EA "view charges" not enabled for this role |
| 403 | `AuthorizationFailed` | Missing RBAC role at the target scope |
| 403 | `RBACAccessDenied` | Missing role for budget Action Group (needs Monitoring Reader) |
| 404 | `SubscriptionNotFound` | Invalid subscription ID or unsupported type |
| 424 | `FailedDependency` | Forecast: insufficient history (wait 1 week) or multiple currencies |
| 429 | `ResourceRequestsThrottled` | Rate limit — wait per `Retry-After` header (typically 5 minutes) |

### Throttle Handling

For 429 responses, read the `x-ms-ratelimit-microsoft.consumption-retry-after` or `Retry-After` header and wait before retrying:

```javascript
if (response.status === 429) {
  const retryAfter = parseInt(response.headers["retry-after"] || "300", 10);
  await new Promise(r => setTimeout(r, retryAfter * 1000));
}
```

## Azure CLI Reference

The Azure CLI provides direct command-line access to cost management and consumption APIs. The commands below complement the REST API patterns above.

### Prerequisites

```bash
# Sign in and set active subscription
az login
az account set --subscription "<sub-id>"

# Verify required extensions are installed
az extension add --name costmanagement --upgrade
az extension add --name resource-graph --upgrade
```

### Budget Management (az consumption budget)

```bash
# Create a resource-group-scoped budget
az consumption budget create --budget-name "<name>" --resource-group <rg> \
  --amount 1000 --time-grain Monthly \
  --start-date 2026-01-01 --end-date 2026-12-31 --category Cost

# Create budget with notification thresholds
az consumption budget create --budget-name "<name>" --resource-group <rg> \
  --amount 5000 --time-grain Monthly \
  --start-date 2026-01-01 --end-date 2026-12-31 --category Cost \
  --notifications "{\"Actual_GreaterThan_80_Percent\":{\"enabled\":true,\"operator\":\"GreaterThan\",\"threshold\":80,\"contactEmails\":[\"admin@contoso.com\"],\"contactRoles\":[\"Owner\"]}}"

# Subscription-level budget (omit --resource-group)
az consumption budget create --budget-name "<name>" \
  --amount 10000 --time-grain Monthly \
  --start-date 2026-01-01 --end-date 2026-12-31 --category Cost

# List budgets
az consumption budget list --output table
az consumption budget list --resource-group <rg> --output table

# Show / delete budget
az consumption budget show --budget-name "<name>"
az consumption budget show --budget-name "<name>" --resource-group <rg>
az consumption budget delete --budget-name "<name>"
```

### Usage Details (az consumption usage)

```bash
# Current billing period (top 50 rows)
az consumption usage list --top 50 --output table

# Specific date range
az consumption usage list --start-date 2026-01-01 --end-date 2026-01-31 --output table

# Usage by resource group with JMESPath projection
az consumption usage list --resource-group <rg> --top 100 \
  --query "[].{Resource:instanceName, Cost:pretaxCost, Currency:currency}" --output table
```

### Cost Management Queries (az costmanagement query)

```bash
# Costs by resource group — current month
az costmanagement query --type ActualCost --timeframe MonthToDate \
  --scope "subscriptions/<sub-id>" \
  --dataset-grouping name=ResourceGroup type=Dimension --output table

# Costs by service — custom date range
az costmanagement query --type ActualCost --timeframe Custom \
  --time-period from=2026-02-01 to=2026-03-01 \
  --scope "subscriptions/<sub-id>" \
  --dataset-grouping name=ServiceName type=Dimension --output table

# Amortized cost by resource — month to date
az costmanagement query --type AmortizedCost --timeframe MonthToDate \
  --scope "subscriptions/<sub-id>" \
  --dataset-grouping name=ResourceId type=Dimension --output table
```

### Cost Exports (az costmanagement export)

```bash
# Create a daily scheduled export to Storage
az costmanagement export create --name "<export-name>" \
  --scope "subscriptions/<sub-id>" \
  --storage-account-id "/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.Storage/storageAccounts/<sa>" \
  --storage-container exports --timeframe MonthToDate --type ActualCost \
  --schedule-recurrence Daily --schedule-status Active \
  --storage-directory "cost-reports"

# List / show / run / delete exports
az costmanagement export list --scope "subscriptions/<sub-id>" --output table
az costmanagement export show --name "<export-name>" --scope "subscriptions/<sub-id>"
az costmanagement export execute --name "<export-name>" --scope "subscriptions/<sub-id>"
az costmanagement export delete --name "<export-name>" --scope "subscriptions/<sub-id>" --yes
```

### Azure Advisor Cost Recommendations

```bash
# List cost recommendations
az advisor recommendation list --category Cost --output table

# Detailed view with savings estimates
az advisor recommendation list --category Cost \
  --query "[].{Impact:impact, Problem:shortDescription.problem, Solution:shortDescription.solution, Savings:extendedProperties.annualSavingsAmount}" \
  --output table

# Refresh recommendations with lower CPU threshold
az advisor configuration update --low-cpu-threshold 5
```

### Resource Graph — Idle Resource Detection

```bash
# Unattached managed disks
az graph query -q "Resources | where type == 'microsoft.compute/disks' | where properties.diskState == 'Unattached' | project name, resourceGroup, sku.name, properties.diskSizeGB, location" --output table

# Deallocated VMs (still incurring disk costs)
az graph query -q "Resources | where type == 'microsoft.compute/virtualMachines' | where properties.extended.instanceView.powerState.code == 'PowerState/deallocated' | project name, resourceGroup, location" --output table

# Empty App Service Plans (no hosted apps)
az graph query -q "Resources | where type == 'microsoft.web/serverfarms' | where properties.numberOfSites == 0 | project name, resourceGroup, sku.name, location" --output table

# Public IPs with no association
az graph query -q "Resources | where type == 'microsoft.network/publicipaddresses' | where isnull(properties.ipConfiguration) | project name, resourceGroup, properties.ipAddress, location" --output table
```

### Reservation Recommendations and Utilization

```bash
# Reservation recommendations (shared scope, 30-day lookback)
az consumption reservation recommendation list --scope Shared --look-back-period Last30Days --output table

# Reservation usage details
az consumption reservation detail list --reservation-order-id <order-id> \
  --start-date 2026-01-01 --end-date 2026-01-31 --output table

# Reservation utilization summaries (daily grain)
az consumption reservation summary list --reservation-order-id <order-id> \
  --grain daily --start-date 2026-01-01 --end-date 2026-01-31 --output table
```

## Decision Tree

1. Need to initialize scope/timeframe/currency/dimensions before analysis? → `setup`
2. Need spend breakdowns, groupings, filters, or reproducible query JSON? → `azure-cost-query`
3. Need budget utilization + forecast breach risk + interventions? → `azure-budget-check`
4. Need underutilization detection and reversible optimization actions? → `azure-idle-resources`
5. Request combines multiple goals? Run in order: `setup` → `azure-cost-query`/`azure-budget-check` → `azure-idle-resources`

## Minimal References

- `azure-cost-governance/commands/setup.md`
- `azure-cost-governance/commands/azure-cost-query.md`
- `azure-cost-governance/commands/azure-budget-check.md`
- `azure-cost-governance/commands/azure-idle-resources.md`
- `azure-cost-governance/README.md`

## Progressive Disclosure — Reference Files

| Topic | File |
|---|---|
| Cost Management REST API, query construction, pagination, TypeScript SDK | [`references/cost-management-api.md`](./references/cost-management-api.md) |
| Budget creation, threshold alerts, Action Group integration, automation | [`references/budget-alerts.md`](./references/budget-alerts.md) |
| Idle resource detection, unattached disks, stopped VMs, savings estimates | [`references/idle-resource-detection.md`](./references/idle-resource-detection.md) |
| FinOps query patterns, chargeback, tag compliance, reservation analysis | [`references/finops-queries.md`](./references/finops-queries.md) |
