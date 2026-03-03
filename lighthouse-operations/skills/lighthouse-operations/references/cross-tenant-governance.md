# Cross-Tenant Governance — Azure Policy, Workbooks, Monitor

## Azure Policy via Azure Lighthouse Delegation

Once Azure Lighthouse delegation is in place, policy operations from the partner tenant are
executed against customer subscriptions as if the partner were a native contributor.

### Deploy Policy Initiative Across Multiple Delegated Subscriptions

```bash
#!/bin/bash
# Get all subscriptions delegated to partner tenant
DELEGATED_SUBS=$(az account list --query "[?managedByTenants[0].tenantId=='<partner-tenant-id>'].id" -o tsv)

for SUB_ID in $DELEGATED_SUBS; do
  echo "Applying policy to subscription: $SUB_ID"

  # Assign Azure Security Benchmark initiative
  az policy assignment create \
    --name "azure-security-benchmark" \
    --display-name "Azure Security Benchmark" \
    --policy-set-definition "/providers/Microsoft.Authorization/policySetDefinitions/1f3afdf9-d0c9-4c3d-847f-89da613e70a8" \
    --scope "/subscriptions/${SUB_ID}" \
    --subscription "${SUB_ID}"
done
```

### Check Compliance Across All Delegated Subscriptions

```bash
# Aggregate non-compliant resources across all delegated subscriptions
for SUB_ID in $DELEGATED_SUBS; do
  echo "=== Subscription: $SUB_ID ==="
  az policy state list \
    --subscription "$SUB_ID" \
    --filter "complianceState eq 'NonCompliant'" \
    --select "resourceId,policyDefinitionName,complianceState,resourceGroup" \
    --output table
done
```

---

## Azure Monitor Workbooks — Cross-Tenant

Azure Workbooks support cross-workspace queries when reading from Log Analytics workspaces
in customer subscriptions (accessed via Lighthouse).

### Cross-Workspace KQL Query

```kusto
// Query Azure Activity across multiple delegated subscriptions
// In Azure Monitor / Log Analytics (partner tenant)
union
(workspace("customer-a-log-analytics").AzureActivity | where TimeGenerated > ago(7d)),
(workspace("customer-b-log-analytics").AzureActivity | where TimeGenerated > ago(7d))
| summarize EventCount = count() by OperationName, Caller, bin(TimeGenerated, 1d)
| order by EventCount desc
```

### Azure Monitor — Multi-Subscription Metrics Dashboard

```json
{
  "version": "Notebook/1.0",
  "items": [
    {
      "type": 9,
      "content": {
        "version": "KqlParameterItem/1.0",
        "parameters": [
          {
            "id": "subscription-param",
            "version": "KqlParameterItem/1.0",
            "name": "Subscriptions",
            "type": 6,
            "multiSelect": true,
            "value": "value::all",
            "typeSettings": {
              "additionalResourceOptions": ["value::all"]
            }
          }
        ]
      }
    }
  ]
}
```

---

## Azure Resource Graph — Cross-Subscription Inventory

Resource Graph queries run across all subscriptions accessible to the caller, including
Lighthouse-delegated subscriptions.

### List All VMs Across Delegated Subscriptions

```kusto
// Azure Resource Graph
Resources
| where type == 'microsoft.compute/virtualmachines'
| project name, location, resourceGroup, subscriptionId, properties.storageProfile.osDisk.osType
| order by subscriptionId asc, name asc
```

```bash
# Execute Resource Graph query
az graph query -q "
Resources
| where type == 'microsoft.compute/virtualmachines'
| project name, location, resourceGroup, subscriptionId
| order by subscriptionId asc
" --subscriptions $(echo $DELEGATED_SUBS | tr ' ' ',')
```

### Security Center / Defender for Cloud — Cross-Subscription

```kusto
// Resources with critical security recommendations
SecurityResources
| where type == 'microsoft.security/assessments'
| where properties.status.code == 'Unhealthy'
| where properties.metadata.severity == 'High'
| project resourceId, assessmentKey = name, displayName = properties.displayName, subscriptionId
| order by subscriptionId asc
```

---

## Cost Management — Cross-Subscription

```bash
# Get cost summary per customer subscription (last 30 days)
for SUB_ID in $DELEGATED_SUBS; do
  az consumption usage list \
    --subscription "$SUB_ID" \
    --start-date "$(date -d '-30 days' +%Y-%m-%d)" \
    --end-date "$(date +%Y-%m-%d)" \
    --query "sum(billedCost)" \
    --output tsv
done
```

### Cost Alerts via ARM

```json
{
  "properties": {
    "enabled": true,
    "notifications": {
      "BudgetThreshold": {
        "enabled": true,
        "contactEmails": ["msp-alerts@contoso.com"],
        "contactRoles": ["Owner", "Contributor"],
        "operator": "GreaterThan",
        "threshold": 80
      }
    },
    "timeGrain": "Monthly",
    "timePeriod": {
      "startDate": "2026-01-01T00:00:00Z"
    },
    "amount": 1000,
    "category": "Cost"
  }
}
```

---

## Azure Arc — Hybrid Server Management via Lighthouse

Azure Arc Connected Machines in customer subscriptions are fully accessible via Lighthouse delegation.

### List Arc Servers Across Delegated Subscriptions

```bash
az graph query -q "
Resources
| where type == 'microsoft.hybridcompute/machines'
| project name, location, resourceGroup, subscriptionId,
          osName = properties.osName,
          status = properties.status,
          agentVersion = properties.agentVersion
| order by subscriptionId asc
" --subscriptions $(echo $DELEGATED_SUBS | tr ' ' ',')
```

### Apply Extensions to Arc Servers at Scale

```bash
# Deploy Log Analytics agent to all Arc servers in a delegated subscription
az connectedmachine extension create \
  --subscription "<customer-sub-id>" \
  --resource-group "<rg-name>" \
  --machine-name "<arc-machine-name>" \
  --name "MMA" \
  --publisher "Microsoft.EnterpriseCloud.Monitoring" \
  --type "MicrosoftMonitoringAgent" \
  --settings '{"workspaceId": "<workspace-id>"}' \
  --protected-settings '{"workspaceKey": "<workspace-key>"}'
```

---

## Governance Reporting Template

Generate a monthly governance report across all delegated customers:

```
Report: Cross-Tenant Governance — {Month} {Year}

| Customer | Subscription | Policy Compliance | Non-Compliant Resources | Defender Score | Cost (MTD) |
|----------|-------------|-------------------|------------------------|----------------|-----------|
| Contoso  | sub-abc123  | 94%               | 12                     | 78/100         | $4,250    |
| Fabrikam | sub-def456  | 87%               | 31                     | 65/100         | $12,100   |
| ...      | ...         | ...               | ...                    | ...            | ...       |

Action items:
1. [CONTOSO] Resolve 12 non-compliant resources (8 Critical, 4 Medium)
2. [FABRIKAM] Defender score below threshold — review 6 open recommendations
```
