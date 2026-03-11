# Azure Cost Management Budgets and Alerts — Deep Reference

## Overview

Azure Consumption Budgets provide threshold-based alerts for cost and usage. Budgets can be scoped to subscriptions, resource groups, or management groups, and support email notifications to contacts, role-based contacts, and Action Groups for automated responses (e.g., stop VMs, send Teams messages, trigger Logic Apps).

## REST API Endpoints

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|---|---|---|---|---|
| PUT | `/{scope}/providers/Microsoft.Consumption/budgets/{name}` | Cost Management Contributor | category, amount, timeGrain, timePeriod, notifications | Create or update budget |
| GET | `/{scope}/providers/Microsoft.Consumption/budgets/{name}` | Cost Management Reader | — | Get budget with current spend |
| GET | `/{scope}/providers/Microsoft.Consumption/budgets` | Cost Management Reader | — | List all budgets at scope |
| DELETE | `/{scope}/providers/Microsoft.Consumption/budgets/{name}` | Cost Management Contributor | — | Delete budget |
| GET | `/{scope}/providers/Microsoft.Consumption/budgets/{name}` | Cost Management Reader | `$select=currentSpend,forecastSpend` | Get spend details |

Base: `https://management.azure.com`

## Budget Schema Reference

```json
PUT /subscriptions/{id}/providers/Microsoft.Consumption/budgets/budget-prod-monthly?api-version=2024-08-01
{
  "properties": {
    "category": "Cost",
    "amount": 10000,
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
            "values": ["rg-production", "rg-production-dr"]
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
    },
    "notifications": {
      "actual-80-percent": {
        "enabled": true,
        "operator": "GreaterThan",
        "threshold": 80,
        "thresholdType": "Actual",
        "contactEmails": ["finops@contoso.com", "cto@contoso.com"],
        "contactRoles": ["Owner", "Contributor"],
        "contactGroups": [
          "/subscriptions/{id}/resourceGroups/rg-monitoring/providers/microsoft.insights/actionGroups/ag-cost-alert"
        ],
        "locale": "en-us"
      },
      "forecasted-100-percent": {
        "enabled": true,
        "operator": "GreaterThan",
        "threshold": 100,
        "thresholdType": "Forecasted",
        "contactEmails": ["finops@contoso.com"],
        "contactGroups": [
          "/subscriptions/{id}/resourceGroups/rg-monitoring/providers/microsoft.insights/actionGroups/ag-cost-critical"
        ]
      },
      "actual-100-percent": {
        "enabled": true,
        "operator": "GreaterThan",
        "threshold": 100,
        "thresholdType": "Actual",
        "contactEmails": ["finops@contoso.com", "cto@contoso.com"],
        "contactRoles": ["Owner"],
        "contactGroups": [
          "/subscriptions/{id}/resourceGroups/rg-monitoring/providers/microsoft.insights/actionGroups/ag-cost-critical"
        ]
      }
    }
  }
}
```

## Budget Properties Reference

| Property | Type | Values | Notes |
|---|---|---|---|
| `category` | string | `Cost` only | Only cost budgets supported |
| `amount` | number | Positive decimal | Budget amount in billing currency |
| `timeGrain` | string | `Monthly`, `Quarterly`, `Annually` | Evaluation period |
| `timePeriod.startDate` | string | ISO 8601 | Must be first day of a month |
| `timePeriod.endDate` | string | ISO 8601 | Max 10 years from start |
| `thresholdType` | string | `Actual`, `Forecasted` | Forecasted triggers before exceeding |
| `operator` | string | `GreaterThan`, `GreaterThanOrEqualTo`, `EqualTo` | Comparison for threshold |
| `threshold` | number | 0–1000 | Percentage of budget amount |
| Max notifications per budget | — | 5 | Combine multiple contacts into Action Groups |

## Azure CLI Patterns

```bash
# Create budget with Action Group integration
ACTION_GROUP_ID="/subscriptions/$SUBSCRIPTION_ID/resourceGroups/rg-monitoring/providers/microsoft.insights/actionGroups/ag-cost-alert"

az consumption budget create \
  --budget-name "budget-prod-monthly" \
  --amount 10000 \
  --category Cost \
  --time-grain Monthly \
  --start-date "2026-03-01" \
  --end-date "2027-03-01" \
  --resource-group rg-production \
  --notification-enabled true \
  --notification-key "actual-80" \
  --notification-operator GreaterThan \
  --notification-threshold 80 \
  --notification-threshold-type Actual \
  --notification-contact-emails finops@contoso.com \
  --notification-contact-groups "$ACTION_GROUP_ID"

# List budgets
az consumption budget list \
  --resource-group rg-production \
  --output table

# Show budget with current spend
az consumption budget show \
  --budget-name "budget-prod-monthly" \
  --resource-group rg-production \
  --query "{name:name, amount:properties.amount, currentSpend:properties.currentSpend.amount, unit:properties.currentSpend.unit}"

# Delete budget
az consumption budget delete \
  --budget-name "budget-prod-monthly" \
  --resource-group rg-production
```

### Additional budget CLI commands

```bash
# Subscription-level budget (no --resource-group)
az consumption budget create --budget-name "<name>" \
  --amount 10000 --time-grain Monthly \
  --start-date 2026-01-01 --end-date 2026-12-31 --category Cost

# Budget with inline JSON notifications
az consumption budget create --budget-name "<name>" --resource-group <rg> \
  --amount 5000 --time-grain Monthly \
  --start-date 2026-01-01 --end-date 2026-12-31 --category Cost \
  --notifications "{\"Actual_GreaterThan_80_Percent\":{\"enabled\":true,\"operator\":\"GreaterThan\",\"threshold\":80,\"contactEmails\":[\"admin@contoso.com\"],\"contactRoles\":[\"Owner\"]}}"

# List budgets at subscription level
az consumption budget list --output table

# Show specific budget
az consumption budget show --budget-name "<name>"
az consumption budget show --budget-name "<name>" --resource-group <rg>

# Delete budget
az consumption budget delete --budget-name "<name>"
```

## Action Group Configuration

```bash
# Create Action Group for budget alerts
az monitor action-group create \
  --name ag-cost-alert \
  --resource-group rg-monitoring \
  --short-name "CostAlert" \
  --email-receiver name="FinOps Team" email-address="finops@contoso.com" use-common-alert-schema true \
  --email-receiver name="CTO" email-address="cto@contoso.com" use-common-alert-schema true

# Add webhook for automated response (e.g., stop VMs)
az monitor action-group update \
  --name ag-cost-alert \
  --resource-group rg-monitoring \
  --add-action webhook name="stop-dev-vms" uri="https://func-costmanagement.azurewebsites.net/api/stop-dev-resources?code=<key>" use-common-alert-schema true

# Add Logic App for Teams notification
az monitor action-group update \
  --name ag-cost-alert \
  --resource-group rg-monitoring \
  --add-action logicapp name="notify-teams" resource-id "$LOGIC_APP_ID" callback-url "$LOGIC_APP_CALLBACK_URL" use-common-alert-schema true
```

## TypeScript — Budget Monitoring and Automation

```typescript
import { ConsumptionManagementClient } from "@azure/arm-consumption";
import { DefaultAzureCredential } from "@azure/identity";

const client = new ConsumptionManagementClient(new DefaultAzureCredential());
const scope = `/subscriptions/${process.env.SUBSCRIPTION_ID}`;

// Get all budgets with utilization
async function getBudgetUtilization() {
  const budgets = [];

  for await (const budget of client.budgets.list(scope)) {
    const currentSpend = (budget as any).currentSpend?.amount ?? 0;
    const budgetAmount = budget.amount ?? 0;
    const utilizationPct = budgetAmount > 0 ? (currentSpend / budgetAmount) * 100 : 0;

    budgets.push({
      name: budget.name,
      amount: budgetAmount,
      currentSpend,
      utilizationPct: Math.round(utilizationPct * 10) / 10,
      status: utilizationPct >= 100 ? "EXCEEDED" : utilizationPct >= 80 ? "WARNING" : "OK",
      timeGrain: budget.timeGrain,
    });
  }

  return budgets.sort((a, b) => b.utilizationPct - a.utilizationPct);
}

// Automated budget alert handler (Azure Function triggered by Action Group)
interface BudgetAlertPayload {
  schemaId: string;
  data: {
    essentials: {
      alertId: string;
      alertRule: string;
      severity: string;
      signalType: string;
      monitorCondition: string;
    };
    alertContext: {
      BudgetName: string;
      BudgetAmount: number;
      NotificationThresholdAmount: number;
      CurrentSpend: number;
    };
  };
}

async function handleBudgetAlert(payload: BudgetAlertPayload) {
  const { BudgetName, BudgetAmount, CurrentSpend, NotificationThresholdAmount } = payload.data.alertContext;
  const utilizationPct = (CurrentSpend / BudgetAmount) * 100;

  console.log(`Budget Alert: ${BudgetName}`);
  console.log(`  Budget: $${BudgetAmount} | Spent: $${CurrentSpend} | Utilization: ${utilizationPct.toFixed(1)}%`);

  if (utilizationPct >= 100) {
    // Critical: stop non-production VMs in the affected scope
    await stopNonProductionResources();
    await sendTeamsAlert(BudgetName, utilizationPct, "EXCEEDED", BudgetAmount, CurrentSpend);
  } else if (utilizationPct >= 80) {
    // Warning: notify team
    await sendTeamsAlert(BudgetName, utilizationPct, "WARNING", BudgetAmount, CurrentSpend);
  }
}

async function sendTeamsAlert(
  budgetName: string,
  utilization: number,
  level: "WARNING" | "EXCEEDED",
  budgetAmount: number,
  currentSpend: number
) {
  const webhookUrl = process.env.TEAMS_WEBHOOK_URL!;
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      "@type": "MessageCard",
      "@context": "http://schema.org/extensions",
      summary: `Budget ${level}: ${budgetName}`,
      themeColor: level === "EXCEEDED" ? "FF0000" : "FFA500",
      sections: [{
        activityTitle: `Budget ${level}: ${budgetName}`,
        facts: [
          { name: "Budget Amount", value: `$${budgetAmount.toLocaleString()}` },
          { name: "Current Spend", value: `$${currentSpend.toLocaleString()}` },
          { name: "Utilization", value: `${utilization.toFixed(1)}%` },
        ],
      }],
    }),
  });
}

async function stopNonProductionResources() {
  // Implementation: use Azure SDK to stop VMs in dev/staging resource groups
  console.log("Stopping non-production VMs...");
}
```

## PowerShell Patterns

```powershell
# Get all budgets with utilization across subscriptions
Get-AzContext -ListAvailable | ForEach-Object {
  Set-AzContext -SubscriptionId $_.Subscription.Id
  $budgets = Get-AzConsumptionBudget -SubscriptionId $_.Subscription.Id

  foreach ($budget in $budgets) {
    $utilization = if ($budget.Amount -gt 0) {
      [math]::Round($budget.CurrentSpend.Amount / $budget.Amount * 100, 1)
    } else { 0 }

    [PSCustomObject]@{
      SubscriptionId = $_.Subscription.Id
      BudgetName = $budget.Name
      Amount = $budget.Amount
      CurrentSpend = $budget.CurrentSpend.Amount
      UtilizationPct = $utilization
      Status = if ($utilization -ge 100) { "EXCEEDED" } elseif ($utilization -ge 80) { "WARNING" } else { "OK" }
    }
  }
} | Sort-Object UtilizationPct -Descending | Format-Table
```

## Error Codes

| Code | Meaning | Remediation |
|---|---|---|
| BudgetAlreadyExists (409) | Budget name already exists at scope | Delete existing budget or use a different name |
| BudgetNotSupported (422) | Budget not supported for scope type | Budgets not supported on Free/Trial subscriptions |
| NotificationEmailsExceeded (400) | More than 50 contact emails | Consolidate via Action Group |
| BudgetTimePeriodStartDateMustBeFirstDayOfMonth (400) | startDate not on first of month | Set startDate to `YYYY-MM-01T00:00:00Z` |
| ActionGroupNotFound (404) | Action Group resource ID invalid | Verify Action Group exists and resource ID is correct |
| MaxBudgetsReached (429) | Subscription budget limit exceeded | Max ~1,000 budgets per subscription; clean up old budgets |
| BudgetAmountMustBePositive (400) | Amount is zero or negative | Set amount to a positive value |

## Throttling Limits

| Resource | Limit | Notes |
|---|---|---|
| Budgets per subscription | ~1,000 | Clean up stale budgets; use resource group scope for granularity |
| Notification rules per budget | 5 | Use Action Groups to consolidate multiple recipients |
| Budget evaluation frequency | Every 24 hours | Alerts may have up to 24-hour delay |
| Action Group email delay | ~15 minutes | Action Group webhook fires faster than email |

## Production Gotchas

- **Budget alerts are not real-time**: Budgets evaluate approximately every 24 hours. A burst of spend can exceed the budget without triggering an alert until the next evaluation cycle. Use Azure Monitor cost alerts (Preview) for near-real-time alerting.
- **Forecasted thresholds fire early**: A forecasted threshold (e.g., `thresholdType: Forecasted` at 100%) fires when the forecasted month-end spend is projected to exceed 100% of the budget. This is typically more useful than waiting for actual spend to breach.
- **Budget filters are additive with AND**: Multiple filter conditions in the `filter` object are combined with AND logic. A budget that filters by `ResourceGroup = rg-prod AND Environment tag = Production` only counts costs matching both conditions.
- **Action Group requires Monitoring Contributor**: To add an Action Group to a budget notification's `contactGroups`, the caller must have the Monitoring Contributor role on the Action Group resource. Budget create/update fails with `RBACAccessDenied` without this.
- **Budget resets monthly, not cumulative**: Monthly budgets reset on the first day of each month. After reset, current spend returns to zero. If you need multi-month tracking, use a longer `timeGrain` (Quarterly or Annually).
- **Budget does not enforce spending**: Budgets are notification-only. They do not block resource creation or halt services when the budget is exceeded. Use Azure Policy with `deny` effects or automation via Action Groups to enforce spending limits.
