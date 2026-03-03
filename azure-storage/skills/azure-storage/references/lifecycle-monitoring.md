# Azure Storage Lifecycle Management and Monitoring — Deep Reference

## Overview

Azure Storage lifecycle management automates blob tier transitions and deletions based on age, last-access time, and last-modification time. Azure Monitor provides metrics, diagnostics logs, and alerts for storage accounts. This reference covers policy schemas, diagnostic settings, and alert configurations.

## REST API Endpoints — Lifecycle Management

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|---|---|---|---|---|
| PUT | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Storage/storageAccounts/{account}/managementPolicies/default` | Storage Account Contributor | Policy JSON body | Create or replace lifecycle policy |
| GET | Same path | Reader | — | Get current lifecycle policy |
| DELETE | Same path | Storage Account Contributor | — | Delete lifecycle policy |

Base: `https://management.azure.com`

## Lifecycle Policy Schema

```json
PUT https://management.azure.com/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Storage/storageAccounts/{account}/managementPolicies/default?api-version=2023-01-01

{
  "properties": {
    "policy": {
      "rules": [
        {
          "name": "move-old-logs-to-cool",
          "enabled": true,
          "type": "Lifecycle",
          "definition": {
            "filters": {
              "blobTypes": ["blockBlob"],
              "prefixMatch": ["logs/", "archive/"],
              "blobIndexMatch": [
                {
                  "name": "environment",
                  "op": "==",
                  "value": "production"
                }
              ]
            },
            "actions": {
              "baseBlob": {
                "tierToCool": { "daysAfterModificationGreaterThan": 30 },
                "tierToArchive": { "daysAfterModificationGreaterThan": 90 },
                "delete": { "daysAfterModificationGreaterThan": 365 }
              },
              "snapshot": {
                "tierToCool": { "daysAfterCreationGreaterThan": 30 },
                "delete": { "daysAfterCreationGreaterThan": 90 }
              },
              "version": {
                "tierToCool": { "daysAfterCreationGreaterThan": 30 },
                "delete": { "daysAfterCreationGreaterThan": 90 }
              }
            }
          }
        },
        {
          "name": "last-access-tiering",
          "enabled": true,
          "type": "Lifecycle",
          "definition": {
            "filters": {
              "blobTypes": ["blockBlob"],
              "prefixMatch": ["media/"]
            },
            "actions": {
              "baseBlob": {
                "enableAutoTierToHotFromCool": true,
                "tierToCool": { "daysAfterLastAccessTimeGreaterThan": 30 },
                "tierToArchive": { "daysAfterLastAccessTimeGreaterThan": 180 }
              }
            }
          }
        }
      ]
    }
  }
}
```

### Lifecycle Action Reference

| Action | Applies To | Notes |
|---|---|---|
| `tierToCool` | blockBlob, snapshot, version | Moves to Cool tier; minimum 30 days in Hot |
| `tierToCold` | blockBlob, snapshot, version | Moves to Cold tier (≥ 90 day min storage) |
| `tierToArchive` | blockBlob, snapshot, version | Moves to Archive; rehydration takes 1–15 hours |
| `delete` | blockBlob, snapshot, version | Soft-delete if enabled; otherwise permanent |
| `enableAutoTierToHotFromCool` | blockBlob | Moves back to Hot on access; requires last-access tracking |

### Filter Conditions

| Condition | Description |
|---|---|
| `daysAfterModificationGreaterThan` | Days since last write/metadata update |
| `daysAfterCreationGreaterThan` | Days since blob creation (snapshot/version only) |
| `daysAfterLastAccessTimeGreaterThan` | Days since last read/write (requires last-access tracking enabled) |
| `daysAfterLastTierChangeGreaterThan` | Days since tier was last changed |

## Azure CLI Patterns — Lifecycle Management

```bash
# Enable last-access time tracking
az storage account blob-service-properties update \
  --account-name mystorageaccount \
  --resource-group rg-prod \
  --last-access-tracking-policy enable

# Apply a lifecycle policy from JSON file
az storage account management-policy create \
  --account-name mystorageaccount \
  --resource-group rg-prod \
  --policy @lifecycle-policy.json

# Get current policy
az storage account management-policy show \
  --account-name mystorageaccount \
  --resource-group rg-prod

# Update policy
az storage account management-policy update \
  --account-name mystorageaccount \
  --resource-group rg-prod \
  --set "properties.policy.rules[0].definition.actions.baseBlob.delete.daysAfterModificationGreaterThan=180"
```

## PowerShell Patterns — Lifecycle Management

```powershell
# Create lifecycle policy
$action = Add-AzStorageAccountManagementPolicyAction `
  -BaseBlobAction TierToCool `
  -daysAfterModificationGreaterThan 30

$action = Add-AzStorageAccountManagementPolicyAction `
  -InputObject $action `
  -BaseBlobAction TierToArchive `
  -daysAfterModificationGreaterThan 90

$action = Add-AzStorageAccountManagementPolicyAction `
  -InputObject $action `
  -BaseBlobAction Delete `
  -daysAfterModificationGreaterThan 365

$filter = New-AzStorageAccountManagementPolicyFilter `
  -PrefixMatch "logs/", "archive/" `
  -BlobType blockBlob

$rule = New-AzStorageAccountManagementPolicyRule `
  -Name "archive-logs" `
  -Action $action `
  -Filter $filter

Set-AzStorageAccountManagementPolicy `
  -ResourceGroupName "rg-prod" `
  -StorageAccountName "mystorageaccount" `
  -Rule $rule
```

## Diagnostic Settings — Monitoring

```bash
# Create Log Analytics workspace
az monitor log-analytics workspace create \
  --resource-group rg-monitoring \
  --workspace-name laws-storage-monitoring \
  --location eastus

LAWS_ID=$(az monitor log-analytics workspace show \
  --resource-group rg-monitoring \
  --workspace-name laws-storage-monitoring \
  --query id -o tsv)

STORAGE_ID=$(az storage account show \
  --name mystorageaccount \
  --resource-group rg-prod \
  --query id -o tsv)

# Enable diagnostic settings for Blob service
az monitor diagnostic-settings create \
  --name diag-storage-blob \
  --resource "$STORAGE_ID/blobServices/default" \
  --workspace "$LAWS_ID" \
  --logs '[
    {"category": "StorageRead", "enabled": true, "retentionPolicy": {"enabled": true, "days": 90}},
    {"category": "StorageWrite", "enabled": true, "retentionPolicy": {"enabled": true, "days": 90}},
    {"category": "StorageDelete", "enabled": true, "retentionPolicy": {"enabled": true, "days": 90}}
  ]' \
  --metrics '[
    {"category": "Transaction", "enabled": true},
    {"category": "Capacity", "enabled": true}
  ]'
```

## Key Metrics to Monitor

| Metric | Description | Alert Threshold |
|---|---|---|
| `Transactions` | Total API request count | Spike > 2x baseline |
| `SuccessE2ELatency` | End-to-end latency for successful requests | > 1000 ms |
| `SuccessServerLatency` | Server processing time | > 200 ms |
| `Availability` | Service availability percentage | < 99.9% |
| `Ingress` | Total inbound data (bytes) | > 80% of account limit |
| `Egress` | Total outbound data (bytes) | Monitor for unexpected spikes |
| `BlobCount` | Number of blobs per tier (Hot/Cool/Archive) | Track over time for cost |
| `BlobCapacity` | Total bytes per tier | Alert on unexpected growth |
| `QueueMessageCount` | Messages in queue | > threshold indicates processing backlog |
| `TableCount` | Number of tables | Track for quota awareness |

## Azure Monitor Alert Configuration

```bash
STORAGE_ID=$(az storage account show \
  --name mystorageaccount \
  --resource-group rg-prod \
  --query id -o tsv)

# Alert on high latency
az monitor metrics alert create \
  --name "storage-high-latency" \
  --resource-group rg-monitoring \
  --scopes "$STORAGE_ID" \
  --condition "avg SuccessE2ELatency > 1000" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --severity 2 \
  --description "Storage latency exceeded 1 second average"

# Alert on availability drop
az monitor metrics alert create \
  --name "storage-availability-drop" \
  --resource-group rg-monitoring \
  --scopes "$STORAGE_ID" \
  --condition "avg Availability < 99.9" \
  --window-size 15m \
  --evaluation-frequency 5m \
  --severity 1 \
  --description "Storage availability below 99.9%"

# Alert on transaction spike (anomaly detection)
az monitor metrics alert create \
  --name "storage-transaction-spike" \
  --resource-group rg-monitoring \
  --scopes "$STORAGE_ID" \
  --condition "avg Transactions > 50000" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --severity 3
```

## KQL Queries for Storage Diagnostics

```kusto
// Top failed requests by operation type (last 24 hours)
StorageBlobLogs
| where TimeGenerated > ago(24h)
| where StatusCode >= 400
| summarize ErrorCount = count() by OperationName, StatusCode, StatusText
| order by ErrorCount desc
| take 20

// Latency percentiles by hour
StorageBlobLogs
| where TimeGenerated > ago(7d)
| where OperationName == "GetBlob"
| summarize
    p50 = percentile(DurationMs, 50),
    p95 = percentile(DurationMs, 95),
    p99 = percentile(DurationMs, 99)
    by bin(TimeGenerated, 1h)
| render timechart

// Top IP addresses by request volume
StorageBlobLogs
| where TimeGenerated > ago(24h)
| summarize RequestCount = count() by CallerIpAddress
| order by RequestCount desc
| take 10

// Authentication failures (potential unauthorized access)
StorageBlobLogs
| where TimeGenerated > ago(24h)
| where StatusCode in (401, 403)
| project TimeGenerated, CallerIpAddress, OperationName, AuthenticationType, StatusCode, StatusText, Uri
| order by TimeGenerated desc

// Data egress by caller IP (data exfiltration detection)
StorageBlobLogs
| where TimeGenerated > ago(24h)
| where OperationName == "GetBlob"
| summarize TotalEgressBytes = sum(ResponseBodySize) by CallerIpAddress
| order by TotalEgressBytes desc
| take 10
```

## Error Codes — Lifecycle and Monitoring

| Code | Meaning | Remediation |
|---|---|---|
| PolicyAlreadyExists (409) | A policy with this name exists | Use PUT to replace or GET the existing policy |
| InvalidLifecycleRuleError (400) | Rule references unsupported action for blob type | Page blobs do not support tier actions; filter to blockBlob only |
| DiagnosticSettingsConflict (409) | A diagnostic setting with this name exists | Delete old setting or use a different name |
| InsufficientPermissions (403) | Missing Monitoring Contributor role | Assign Monitoring Contributor to create diagnostic settings |
| WorkspaceNotFound (404) | Log Analytics workspace not found | Verify workspace resource ID and region |

## Throttling Limits

| Resource | Limit | Retry Strategy |
|---|---|---|
| Lifecycle policy rules per account | 100 rules | Combine rules with `blobIndexMatch` filters |
| Lifecycle policy evaluation | Once per day | Design policies conservatively; changes take 24–48 hours to apply |
| Diagnostic settings per resource | 5 settings | Use one Log Analytics workspace per environment |
| Metric alert rules per subscription | 5,000 | Consolidate alerts; use dynamic thresholds |
| Log query results per query | 500,000 rows | Use time range filters and aggregations to reduce result sets |

## Production Gotchas

- **Last-access tracking costs**: Enabling last-access time tracking adds a transaction to every read operation (for updating the timestamp). This increases transaction costs — evaluate carefully for high-read workloads. The cost is typically justified for tiering accuracy.
- **Lifecycle policy evaluation lag**: Lifecycle policies are evaluated once per day. There is also a propagation delay — new or updated policies may take 24–48 hours before the first evaluation run. Do not rely on lifecycle for time-critical cleanup.
- **Archive rehydration is expensive and slow**: Rehydration from Archive takes 1–15 hours (standard priority) or 1–10 hours (high priority). High-priority rehydration costs significantly more. Plan restores well in advance.
- **Cool/Cold tier early deletion charges**: Moving a blob to Cool tier before it has been in Hot for at least 30 days incurs an early deletion fee. For Cold tier, the minimum is 90 days. Account for this when designing lifecycle policies.
- **Blob versioning and lifecycle**: With versioning enabled, lifecycle policies must explicitly include version actions (`actions.version`) to manage old versions. Base blob actions only apply to the current blob; previous versions accumulate indefinitely without explicit version lifecycle rules.
- **Diagnostic log volume and cost**: Enabling all three categories (StorageRead, StorageWrite, StorageDelete) for a high-traffic account generates very large log volumes in Log Analytics. Use sampling or selective category enablement for high-traffic accounts, and configure data retention limits on the workspace.
- **Metric granularity**: Azure Storage metrics are available at 1-minute, 1-hour, and 1-day granularity in Azure Monitor. 1-minute metrics are retained for 93 days; 1-day metrics for 2 years. Use appropriate retention windows in alert queries.
- **Cross-account lifecycle policies**: Lifecycle policies apply only to the storage account they are configured on. For multi-account environments, deploy identical policies via ARM templates or Bicep to maintain consistency.
