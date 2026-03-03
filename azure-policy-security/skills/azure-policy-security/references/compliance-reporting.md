# Azure Policy — Compliance Reporting

## Overview

Azure Policy compliance state is the result of evaluating resource configurations against assigned policy rules. The Policy Insights API provides query interfaces for retrieving compliance data at any scope (management group, subscription, resource group, resource). Compliance data includes per-resource state, per-policy aggregates, and historical snapshots. Exemptions remove specific resources from compliance calculations. On-demand evaluation triggers immediate assessment without waiting for the periodic 24-hour scan cycle.

---

## REST API Endpoints

Base URL: `https://management.azure.com`
API Version: `2019-10-01`

### Policy States (Compliance Queries)

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| POST | `/{scope}/providers/Microsoft.PolicyInsights/policyStates/latest/queryResults` | Policy Insights Data Reader | `$filter`, `$top`, `$orderby`, `$select`, `$apply` | Query latest compliance state |
| POST | `/{scope}/providers/Microsoft.PolicyInsights/policyStates/default/queryResults` | Policy Insights Data Reader | Same | Query default (latest) state |
| POST | `/subscriptions/{id}/providers/Microsoft.PolicyInsights/policyStates/latest/triggerEvaluation` | Resource Policy Contributor | — | Trigger on-demand evaluation for subscription |
| POST | `/subscriptions/{id}/resourceGroups/{rg}/providers/Microsoft.PolicyInsights/policyStates/latest/triggerEvaluation` | Resource Policy Contributor | — | Trigger evaluation for resource group |

### Policy State Summarize

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| POST | `/{scope}/providers/Microsoft.PolicyInsights/policyStates/latest/summarize` | Policy Insights Data Reader | `$top`, `$filter` | Get aggregated compliance summary |
| POST | `/subscriptions/{id}/providers/Microsoft.PolicyInsights/policyStates/latest/summarize` | Policy Insights Data Reader | — | Subscription-level summary |
| POST | `/managementGroups/{mg}/providers/Microsoft.PolicyInsights/policyStates/latest/summarize` | Policy Insights Data Reader | — | Management group summary |

### Policy Exemptions

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| PUT | `/{scope}/providers/Microsoft.Authorization/policyExemptions/{name}` | Resource Policy Contributor + exempt/Action | Body: exemption definition | Create or update exemption |
| GET | `/{scope}/providers/Microsoft.Authorization/policyExemptions/{name}` | Reader | — | Get specific exemption |
| GET | `/subscriptions/{id}/providers/Microsoft.Authorization/policyExemptions` | Reader | `$filter` | List all exemptions in subscription |
| DELETE | `/{scope}/providers/Microsoft.Authorization/policyExemptions/{name}` | Resource Policy Contributor | — | Delete exemption |

**`{scope}` examples**:
- Subscription: `/subscriptions/{id}`
- Resource group: `/subscriptions/{id}/resourceGroups/{rg}`
- Resource: `/subscriptions/{id}/resourceGroups/{rg}/providers/{resourceType}/{name}`
- Management group: `/providers/Microsoft.Management/managementGroups/{mg}`

---

## Compliance State Values

| State | Description | Counted in Compliance % |
|-------|-------------|------------------------|
| `Compliant` | Resource satisfies the policy rule | Yes (numerator + denominator) |
| `NonCompliant` | Resource violates the policy rule | Denominator only |
| `Exempt` | Resource has an active exemption | Yes (treated as compliant) |
| `Conflicting` | Resource affected by conflicting policy definitions | Neither (excluded) |
| `Unknown` | Default state for `manual` effect policies | Yes (treated as compliant) |
| `Error` | Policy evaluation encountered an error | Neither (excluded) |
| `Protected` | Resource covered by `denyAction` effect | Yes (treated as compliant) |

**Formula**: Compliance% = (Compliant + Exempt + Unknown + Protected) / (Compliant + NonCompliant + Exempt + Unknown + Protected) × 100

---

## Query Non-Compliant Resources

```
POST /subscriptions/{id}/providers/Microsoft.PolicyInsights/policyStates/latest/queryResults
  ?api-version=2019-10-01
  &$filter=ComplianceState eq 'NonCompliant'
  &$orderby=timestamp desc
  &$top=100
  &$select=resourceId,policyDefinitionId,policyAssignmentId,complianceState,policyDefinitionAction,policyDefinitionGroupNames,timestamp
```

### Response Structure

```json
{
  "@odata.context": "...",
  "@odata.count": 247,
  "@odata.nextLink": "...&$skiptoken=abc123",
  "value": [
    {
      "resourceId": "/subscriptions/{id}/resourceGroups/rg-prod/providers/Microsoft.Compute/virtualMachines/vm-001",
      "policyAssignmentId": "/subscriptions/{id}/providers/Microsoft.Authorization/policyAssignments/org-security-assign",
      "policyDefinitionId": "/providers/Microsoft.Authorization/policyDefinitions/guid",
      "policyDefinitionReferenceId": "RequireCostCenterTag",
      "complianceState": "NonCompliant",
      "policyDefinitionAction": "deny",
      "policyDefinitionGroupNames": ["TagGovernance"],
      "policySetDefinitionId": "/subscriptions/{id}/providers/Microsoft.Authorization/policySetDefinitions/org-security-baseline",
      "timestamp": "2026-03-01T10:00:00Z",
      "resourceType": "microsoft.compute/virtualmachines",
      "resourceGroup": "rg-prod",
      "resourceLocation": "eastus"
    }
  ]
}
```

---

## OData Filter Expressions

```bash
# Non-compliant only
$filter=ComplianceState eq 'NonCompliant'

# Non-compliant for a specific assignment
$filter=ComplianceState eq 'NonCompliant' and PolicyAssignmentId eq '/subscriptions/{id}/providers/Microsoft.Authorization/policyAssignments/my-assign'

# Non-compliant by resource type
$filter=ComplianceState eq 'NonCompliant' and ResourceType eq 'microsoft.compute/virtualmachines'

# Non-compliant by policy effect
$filter=ComplianceState eq 'NonCompliant' and PolicyDefinitionAction eq 'audit'

# Non-compliant in specific time window
$filter=ComplianceState eq 'NonCompliant'&$from=2026-02-01T00:00:00Z&$to=2026-03-01T00:00:00Z

# Aggregate: count by compliance state
$apply=groupby((ComplianceState), aggregate($count as Count))

# Aggregate: count non-compliant by policy
$apply=groupby((PolicyAssignmentId, PolicyDefinitionId), aggregate($count as NumNonCompliant))
  &$filter=ComplianceState eq 'NonCompliant'

# Aggregate: count by resource type
$apply=groupby((ResourceType), aggregate($count as NumNonCompliant))
  &$filter=ComplianceState eq 'NonCompliant'
```

---

## Compliance Summary

The summarize endpoint returns aggregated data without needing `$apply`:

```
POST /subscriptions/{id}/providers/Microsoft.PolicyInsights/policyStates/latest/summarize
  ?api-version=2019-10-01
```

**Response**:
```json
{
  "@odata.context": "...",
  "@odata.count": 1,
  "value": [
    {
      "results": {
        "queryResultsUri": "...",
        "nonCompliantResources": 142,
        "nonCompliantPolicies": 8
      },
      "policyAssignments": [
        {
          "policyAssignmentId": "/subscriptions/{id}/providers/Microsoft.Authorization/policyAssignments/org-security-assign",
          "policySetDefinitionId": "/subscriptions/{id}/providers/Microsoft.Authorization/policySetDefinitions/org-security-baseline",
          "results": {
            "nonCompliantResources": 89,
            "nonCompliantPolicies": 4
          },
          "policyDefinitions": [
            {
              "policyDefinitionId": "/providers/Microsoft.Authorization/policyDefinitions/guid",
              "policyDefinitionReferenceId": "RequireCostCenterTag",
              "effect": "deny",
              "results": {
                "nonCompliantResources": 45
              }
            }
          ]
        }
      ]
    }
  ]
}
```

---

## Management Group Scope Compliance

```bash
# Query compliance across entire management group (covers all child subscriptions)
POST /providers/Microsoft.Management/managementGroups/my-mg/providers/Microsoft.PolicyInsights/policyStates/latest/queryResults
  ?api-version=2019-10-01
  &$filter=ComplianceState eq 'NonCompliant'
  &$top=500
  &$select=resourceId,policyDefinitionId,complianceState,resourceType,subscriptionId

# Summarize at management group level
POST /providers/Microsoft.Management/managementGroups/my-mg/providers/Microsoft.PolicyInsights/policyStates/latest/summarize
  ?api-version=2019-10-01
```

---

## On-Demand Compliance Scan

By default, compliance data is refreshed every 24 hours. Trigger an immediate scan after creating new assignments or making changes:

```bash
# Azure CLI: trigger subscription-level evaluation
az policy state trigger-scan --subscription {subscription-id}

# Azure CLI: trigger resource group evaluation
az policy state trigger-scan \
  --resource-group rg-prod \
  --subscription {subscription-id}

# ARM API call (async, returns 202)
POST /subscriptions/{id}/providers/Microsoft.PolicyInsights/policyStates/latest/triggerEvaluation
  ?api-version=2019-10-01
```

**Note**: The trigger returns HTTP 202 Accepted. The evaluation runs in the background and may take several minutes for large subscriptions. Monitor the `Azure-AsyncOperation` header URL to check completion.

---

## Compliance Reporting via Azure CLI

```bash
# Summary for subscription
az policy state summarize --subscription {id}

# Query non-compliant resources
az policy state list \
  --filter "ComplianceState eq 'NonCompliant'" \
  --apply "groupby((policyDefinitionId), aggregate(\$count as NonCompliantCount))" \
  --order-by "NonCompliantCount desc" \
  --top 20

# Non-compliant VMs only
az policy state list \
  --filter "ComplianceState eq 'NonCompliant' and ResourceType eq 'Microsoft.Compute/virtualMachines'" \
  --select "resourceId,policyDefinitionId,policyDefinitionAction"

# Export compliance data to CSV
az policy state list \
  --subscription {id} \
  --filter "ComplianceState eq 'NonCompliant'" \
  --query "[].{Resource:resourceId, Policy:policyDefinitionId, State:complianceState, Action:policyDefinitionAction}" \
  -o tsv > non-compliant-resources.tsv
```

---

## PowerShell: Compliance Reporting

```powershell
# Get compliance summary
$summary = Get-AzPolicyStateSummary -SubscriptionId "{id}"
Write-Host "Non-compliant resources: $($summary.Results.NonCompliantResources)"
Write-Host "Non-compliant policies: $($summary.Results.NonCompliantPolicies)"

# List all non-compliant resources
$nonCompliant = Get-AzPolicyState `
  -SubscriptionId "{id}" `
  -Filter "ComplianceState eq 'NonCompliant'" `
  -Top 1000

$nonCompliant | Select-Object ResourceId, PolicyDefinitionId, PolicyDefinitionAction, Timestamp |
  Export-Csv -Path "non-compliant.csv" -NoTypeInformation

# Group by policy definition
$nonCompliant |
  Group-Object PolicyDefinitionId |
  Sort-Object Count -Descending |
  Select-Object Count, Name |
  Format-Table

# Trigger on-demand evaluation
Start-AzPolicyComplianceScan -SubscriptionId "{id}" -ResourceGroupName "rg-prod"

# List exemptions
Get-AzPolicyExemption -SubscriptionId "{id}" |
  Select-Object Name, ExemptionCategory, ExpiresOn, PolicyAssignmentId |
  Format-Table
```

---

## Compliance Report Generation (TypeScript)

```typescript
import { PolicyInsightsClient } from "@azure/arm-policyinsights";
import { DefaultAzureCredential } from "@azure/identity";

const credential = new DefaultAzureCredential();
const client = new PolicyInsightsClient(credential, subscriptionId);

interface ComplianceSummary {
  totalNonCompliant: number;
  byPolicy: Record<string, number>;
  byResourceType: Record<string, number>;
}

async function generateComplianceReport(subscriptionId: string): Promise<ComplianceSummary> {
  const summary: ComplianceSummary = {
    totalNonCompliant: 0,
    byPolicy: {},
    byResourceType: {},
  };

  // Get summary
  const summaryResult = await client.policyStates.summarizeForSubscription(subscriptionId);
  for (const item of summaryResult.value ?? []) {
    summary.totalNonCompliant = item.results?.nonCompliantResources ?? 0;
  }

  // Query by policy definition
  const byPolicyResult = client.policyStates.listQueryResultsForSubscription(
    "latest",
    subscriptionId,
    {
      filter: "ComplianceState eq 'NonCompliant'",
      apply: "groupby((policyDefinitionId), aggregate($count as NonCompliantCount))",
      orderBy: "NonCompliantCount desc",
      top: 50,
    }
  );

  for await (const page of byPolicyResult.byPage()) {
    for (const item of page) {
      const policyId = item.policyDefinitionId ?? "unknown";
      summary.byPolicy[policyId] = (item as any).nonCompliantCount ?? 0;
    }
  }

  // Query by resource type
  const byTypeResult = client.policyStates.listQueryResultsForSubscription(
    "latest",
    subscriptionId,
    {
      filter: "ComplianceState eq 'NonCompliant'",
      apply: "groupby((resourceType), aggregate($count as NonCompliantCount))",
      orderBy: "NonCompliantCount desc",
      top: 20,
    }
  );

  for await (const page of byTypeResult.byPage()) {
    for (const item of page) {
      const resourceType = item.resourceType ?? "unknown";
      summary.byResourceType[resourceType] = (item as any).nonCompliantCount ?? 0;
    }
  }

  return summary;
}
```

---

## Create Policy Exemption

```json
PUT /{scope}/providers/Microsoft.Authorization/policyExemptions/exempt-sandbox-sku?api-version=2022-07-01-preview
{
  "properties": {
    "policyAssignmentId": "/subscriptions/{id}/providers/Microsoft.Authorization/policyAssignments/org-security-assign",
    "policyDefinitionReferenceIds": [
      "RequiredSkuPolicy"
    ],
    "exemptionCategory": "Waiver",
    "displayName": "Exempt sandbox resource group from SKU restrictions",
    "description": "Dev/test sandbox environment approved for non-compliant SKUs — reviewed quarterly",
    "expiresOn": "2026-06-30T23:59:00Z",
    "metadata": {
      "requestedBy": "Dev Platform Team",
      "approvedBy": "Information Assurance",
      "ticketRef": "CHG-2026-0099",
      "reviewDate": "2026-04-01"
    }
  }
}
```

**Exemption categories**:
| Category | When to Use |
|----------|-------------|
| `Waiver` | Risk accepted — compensating controls in place or risk formally accepted |
| `Mitigated` | Alternative control achieves the same security objective |

---

## Error Codes Table

| Code | Meaning | Remediation |
|------|---------|-------------|
| `PolicyInsightsNotEnabled` | Policy Insights not available for scope | Register `Microsoft.PolicyInsights` resource provider on subscription |
| `InvalidQueryFilter` | OData filter syntax error | Check filter expression; use correct field names from response schema |
| `ExemptionNotFound` | Exemption name/scope incorrect | Verify exemption name and scope; list exemptions first |
| `InvalidExpiryDate` | `expiresOn` is in the past or invalid format | Use ISO 8601 format: `2026-06-30T23:59:00Z` |
| `MissingExemptAction` | Role lacks `exempt/Action` permission | Assign `Resource Policy Contributor` plus ensure `exempt/Action` is included |
| `ScanInProgress` | On-demand scan already running | Wait for current scan to complete; check via `Azure-AsyncOperation` URL |
| `QueryTimeoutError` | Large compliance query timed out | Reduce `$top` value; add more specific `$filter`; use pagination with `$skiptoken` |

---

## Throttling Limits Table

| Resource | Limit | Retry Strategy |
|----------|-------|---------------|
| Policy state query page size | 1,000 records per page | Use `@odata.nextLink` for pagination; implement retry with exponential backoff |
| Compliance scan frequency | 24-hour automatic cycle | Use `triggerEvaluation` for immediate scans (avoid excessive triggers) |
| Policy Insights API rate | 1,200 read/min per subscription | Cache compliance results; schedule bulk reports off-peak |
| Exemptions per assignment | 400 `notScopes` on assignment (not exemptions per se) | Use exemptions instead of `notScopes` for granular exclusions |
| On-demand evaluation triggers | 1 concurrent trigger per scope | Check `Azure-AsyncOperation` before triggering another scan |
| Data retention | 7 days of state history via API | Export to Log Analytics for longer compliance history |

---

## Common Patterns and Gotchas

**1. Compliance data latency**
Compliance data is refreshed every 24 hours by default. After assigning a new policy or modifying resources, trigger `triggerEvaluation` to get fresh data. Note that the evaluation is asynchronous — check the `Azure-AsyncOperation` URL for completion status.

**2. Exemptions vs `notScopes`**
`notScopes` on a policy assignment excludes entire resource scopes (subscription, resource group) from evaluation — the resources are invisible to the policy. Exemptions apply at the individual resource level and are tracked in compliance data (with `Exempt` state). Prefer exemptions over `notScopes` for auditability.

**3. Management group compliance queries**
Querying compliance at management group scope includes ALL subscriptions in the hierarchy. This is the most comprehensive view but can return millions of records for large organizations. Always add `$top` and appropriate `$filter` to avoid timeout.

**4. Pagination with `$skiptoken`**
Large compliance queries return `@odata.nextLink` containing `$skiptoken`. Always implement pagination in compliance reporting tools — assuming all results are in the first page leads to incomplete reports.

**5. Compliance % calculation**
The compliance percentage displayed in the portal includes Exempt and Unknown resources as "compliant" for scoring purposes. If you need a stricter metric (only Compliant resources), calculate manually: `Compliant / (Compliant + NonCompliant) × 100` using the `$apply=groupby` aggregation.

**6. Exemption expiry management**
Expired exemptions are still stored but no longer honored — the resource becomes NonCompliant again. Set up Azure Monitor alerts on exemptions approaching expiry using the Policy Insights API and a scheduled Azure Function to check exemption expiry dates.
