# Azure Monitor — Log Analytics & KQL

## Overview

Log Analytics workspaces are the central storage and query engine for Azure Monitor log data. Kusto Query Language (KQL) is used to query, transform, and visualize log data. Workspaces receive data from diagnostic settings, agents, data collection rules (DCRs), and SDK-based ingestion. Cross-workspace and cross-resource queries enable fleet-wide analytics.

---

## REST API Endpoints

Base URL: `https://api.loganalytics.io/v1` (direct query API)
Alternative: `https://management.azure.com` (ARM API for workspace management)

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| POST | `/workspaces/{workspaceId}/query` | Log Analytics Reader | `query`, `timespan` | Execute KQL against a workspace |
| GET | `/workspaces/{workspaceId}/query` | Log Analytics Reader | `query`, `timespan` | GET variant for simple queries |
| POST | `https://management.azure.com/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.OperationalInsights/workspaces/{ws}/api/query` | Log Analytics Reader | Body: `{ query, timespan }` | ARM-authenticated query (preferred with managed identity) |

**Workspace management**:

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| PUT | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.OperationalInsights/workspaces/{ws}` | Log Analytics Contributor | Body: workspace definition | Create or update workspace |
| GET | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.OperationalInsights/workspaces/{ws}` | Reader | — | Get workspace details |
| PUT | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.OperationalInsights/workspaces/{ws}/savedSearches/{searchId}` | Log Analytics Contributor | Body: saved search | Create saved search |
| PUT | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.OperationalInsights/workspaces/{ws}/dataExports/{exportName}` | Log Analytics Contributor | Body: export rules | Configure continuous data export |

---

## KQL Language Fundamentals

### Table | Operator | Operator Pipeline

```kql
// Basic pipeline: table | filter | project | summarize | render
AzureActivity
| where TimeGenerated > ago(24h)
| where OperationNameValue contains "write" or OperationNameValue contains "delete"
| where ActivityStatusValue == "Failure"
| project TimeGenerated, Caller, OperationNameValue, ResourceGroup, ActivityStatusValue
| order by TimeGenerated desc
| take 100
```

### Time Filtering

```kql
// Relative time
| where TimeGenerated > ago(1h)
| where TimeGenerated > ago(7d)
| where TimeGenerated between (ago(48h) .. ago(24h))

// Absolute time
| where TimeGenerated >= datetime(2026-01-01T00:00:00Z)
| where TimeGenerated between (datetime(2026-01-01) .. datetime(2026-01-31))
```

### Summarize and Aggregate

```kql
// Count by category
Heartbeat
| where TimeGenerated > ago(1h)
| summarize count() by Computer, OSType
| order by count_ desc

// Time-series aggregation
Perf
| where TimeGenerated > ago(4h)
| where ObjectName == "Processor" and CounterName == "% Processor Time"
| summarize avg(CounterValue) by bin(TimeGenerated, 5m), Computer
| render timechart
```

### Extend (Computed Columns)

```kql
requests
| where timestamp > ago(1h)
| extend
    durationMs = duration,
    isSlowRequest = duration > 2000,
    hourOfDay = hourofday(timestamp)
| summarize
    slowRequests = countif(isSlowRequest),
    totalRequests = count(),
    p95 = percentile(durationMs, 95)
    by bin(timestamp, 15m)
```

### Join Operations

```kql
// Inner join: correlate two tables
let failedRequests = requests
| where success == false
| project operation_Id, name, timestamp;

exceptions
| join kind=inner failedRequests on operation_Id
| project timestamp, name, type, outerMessage
| order by timestamp desc
```

### Let Statements (Variables and Functions)

```kql
let threshold = 1000; // constant
let startTime = ago(6h);
let slowOps = (minDuration: long) {
    requests
    | where timestamp > startTime
    | where duration > minDuration
};
slowOps(threshold)
| summarize count() by name
| order by count_ desc
```

---

## Common Queries by Resource Type

### Virtual Machine Performance

```kql
// CPU utilization — top 10 VMs by average CPU
Perf
| where TimeGenerated > ago(1h)
| where ObjectName == "Processor" and CounterName == "% Processor Time" and InstanceName == "_Total"
| summarize avgCPU = avg(CounterValue) by Computer
| top 10 by avgCPU desc
| render barchart

// Memory available
Perf
| where TimeGenerated > ago(1h)
| where ObjectName == "Memory" and CounterName == "Available MBytes"
| summarize avgMemAvailMB = avg(CounterValue) by Computer, bin(TimeGenerated, 5m)
| order by TimeGenerated asc

// Disk I/O
Perf
| where TimeGenerated > ago(1h)
| where ObjectName == "LogicalDisk" and CounterName in ("Disk Read Bytes/sec", "Disk Write Bytes/sec")
| summarize total = sum(CounterValue) by Computer, CounterName, bin(TimeGenerated, 5m)
```

### Application Insights — Request Analytics

```kql
// Request rate and failure rate by 5-minute buckets
requests
| where timestamp > ago(2h)
| summarize
    total = count(),
    failed = countif(success == false),
    p50 = percentile(duration, 50),
    p95 = percentile(duration, 95),
    p99 = percentile(duration, 99)
    by bin(timestamp, 5m)
| extend failureRate = round(100.0 * failed / total, 2)
| order by timestamp asc
| render timechart

// Top slow operations
requests
| where timestamp > ago(1h)
| summarize
    count = count(),
    p95 = percentile(duration, 95),
    failRate = countif(success == false) * 100.0 / count()
    by name
| where p95 > 500
| order by p95 desc
```

### Azure Activity Log Analysis

```kql
// Failed operations in the last 24h
AzureActivity
| where TimeGenerated > ago(24h)
| where ActivityStatusValue in ("Failed", "Failure")
| summarize
    failCount = count(),
    resources = make_set(ResourceGroup, 10)
    by OperationNameValue, Caller
| order by failCount desc

// Policy changes
AzureActivity
| where TimeGenerated > ago(7d)
| where OperationNameValue has "policyAssignments" or OperationNameValue has "policyDefinitions"
| project TimeGenerated, Caller, OperationNameValue, Properties, ResourceGroup
| order by TimeGenerated desc

// Role assignment changes
AzureActivity
| where TimeGenerated > ago(7d)
| where OperationNameValue == "Microsoft.Authorization/roleAssignments/write"
    or OperationNameValue == "Microsoft.Authorization/roleAssignments/delete"
| project TimeGenerated, Caller, OperationNameValue, Properties
| extend
    principalId = tostring(parse_json(Properties).requestbody.Properties.PrincipalId),
    roleDefinitionId = tostring(parse_json(Properties).requestbody.Properties.RoleDefinitionId)
| order by TimeGenerated desc
```

### Security Audit Queries

```kql
// Sign-in failures from Entra ID
SigninLogs
| where TimeGenerated > ago(1h)
| where ResultType != "0" // non-success
| summarize
    failCount = count(),
    ips = make_set(IPAddress, 5),
    apps = make_set(AppDisplayName, 5)
    by UserPrincipalName, ResultDescription
| where failCount > 5
| order by failCount desc

// Azure Diagnostics — Key Vault access
AzureDiagnostics
| where ResourceType == "VAULTS"
| where OperationName == "SecretGet" or OperationName == "SecretList"
| where TimeGenerated > ago(1h)
| summarize count() by CallerIPAddress, identity_claim_oid_g, requestUri_s
| order by count_ desc

// NSG denied traffic
AzureDiagnostics
| where Category == "NetworkSecurityGroupFlowEvent"
| where TimeGenerated > ago(1h)
| extend
    srcIP = split(msg_s, ",")[3],
    dstIP = split(msg_s, ",")[4],
    action = split(msg_s, ",")[12]
| where action == "D" // Denied
| summarize count() by tostring(srcIP), tostring(dstIP)
| top 20 by count_ desc
```

### Container / AKS Queries

```kql
// Pod restart count
KubePodInventory
| where TimeGenerated > ago(1h)
| where Namespace != "kube-system"
| summarize restarts = sum(RestartCount) by Name, Namespace, ContainerName
| where restarts > 0
| order by restarts desc

// Node CPU utilization
InsightsMetrics
| where TimeGenerated > ago(1h)
| where Namespace == "container.azm.ms/cpuUsageNanoCores"
| summarize
    cpuNanoCores = avg(Val)
    by Computer, bin(TimeGenerated, 5m)
| extend cpuCores = cpuNanoCores / 1000000000
| render timechart

// OOMKilled pods
KubeEvents
| where TimeGenerated > ago(24h)
| where Reason == "OOMKilling"
| project TimeGenerated, Name, Namespace, Message
| order by TimeGenerated desc
```

---

## Cross-Workspace Queries

```kql
// Query multiple workspaces in a single query
union
    workspace("workspace-1").requests,
    workspace("workspace-2").requests,
    workspace("/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.OperationalInsights/workspaces/workspace-3").requests
| where timestamp > ago(1h)
| summarize count() by cloud_RoleName, bin(timestamp, 5m)
| render timechart
```

**Syntax options**:
- `workspace("name")` — by workspace name (must be in same subscription)
- `workspace("customerId")` — by workspace GUID
- `workspace("/subscriptions/.../workspaces/name")` — by full resource ID (cross-subscription)

---

## Saved Searches (ARM)

```json
PUT .../workspaces/{ws}/savedSearches/slow-requests-p95?api-version=2020-08-01
{
  "properties": {
    "category": "Performance",
    "displayName": "Slow Requests P95",
    "query": "requests | where timestamp > ago(1h) | summarize p95=percentile(duration,95) by name | order by p95 desc",
    "version": 2,
    "tags": [
      { "name": "Group", "value": "AppPerformance" }
    ]
  }
}
```

---

## Data Export Configuration

Continuous export sends new log data to a Storage account or Event Hub for archival or streaming.

```json
PUT .../workspaces/{ws}/dataExports/export-to-storage?api-version=2020-08-01
{
  "properties": {
    "destination": {
      "resourceId": "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Storage/storageAccounts/archivestorage",
      "metaData": {
        "storageAccountTableName": "monitoring"
      }
    },
    "tableNames": ["requests", "exceptions", "traces", "dependencies"],
    "enable": true
  }
}
```

Supported destinations: Storage Account (blob/table) and Event Hub (streaming).

---

## TypeScript: Execute KQL Query

```typescript
import { LogsQueryClient, LogsQueryResultStatus } from "@azure/monitor-query";
import { DefaultAzureCredential } from "@azure/identity";

const credential = new DefaultAzureCredential();
const client = new LogsQueryClient(credential);

async function queryLogs(workspaceId: string): Promise<void> {
  const query = `
    requests
    | where timestamp > ago(1h)
    | summarize count = count(), p95 = percentile(duration, 95) by name
    | order by p95 desc
    | take 10
  `;

  const result = await client.queryWorkspace(workspaceId, query, { duration: "PT1H" });

  if (result.status === LogsQueryResultStatus.Success) {
    const table = result.tables[0];
    const columns = table.columnDescriptors.map((c) => c.name);
    console.log("Columns:", columns);
    for (const row of table.rows) {
      console.log(Object.fromEntries(columns.map((col, i) => [col, row[i]])));
    }
  } else {
    console.error("Query failed:", result.partialError);
  }
}
```

---

## PowerShell: Workspace Operations

```powershell
# Create workspace
New-AzOperationalInsightsWorkspace `
  -ResourceGroupName "rg-monitoring" `
  -Name "my-law" `
  -Location "eastus" `
  -Sku "PerGB2018" `
  -RetentionInDays 90

# Execute KQL query
Invoke-AzOperationalInsightsQuery `
  -WorkspaceId "xxx-yyy-zzz" `
  -Query "Heartbeat | summarize count() by Computer | order by count_ desc | take 10" `
  -Timespan (New-TimeSpan -Hours 1)

# Create saved search
New-AzOperationalInsightsSavedSearch `
  -ResourceGroupName "rg-monitoring" `
  -WorkspaceName "my-law" `
  -SavedSearchId "my-slow-requests" `
  -DisplayName "Slow Requests" `
  -Category "Performance" `
  -Query "requests | where duration > 1000 | summarize count() by name" `
  -Version 2
```

---

## Azure CLI: Workspace and Query

```bash
# Create workspace
az monitor log-analytics workspace create \
  --resource-group rg-monitoring \
  --workspace-name my-law \
  --location eastus \
  --sku PerGB2018 \
  --retention-time 90

# Get workspace ID
az monitor log-analytics workspace show \
  --resource-group rg-monitoring \
  --workspace-name my-law \
  --query customerId -o tsv

# Execute query
az monitor log-analytics query \
  --workspace "{workspaceId}" \
  --analytics-query "Heartbeat | summarize count() by Computer | take 5" \
  --timespan "PT1H"

# List tables in workspace
az monitor log-analytics workspace table list \
  --resource-group rg-monitoring \
  --workspace-name my-law \
  --query "[].name" -o table
```

---

## Error Codes Table

| Code | Meaning | Remediation |
|------|---------|-------------|
| `BadArgumentError: query parse failed` | KQL syntax error | Use KQL reference; check operator names and pipe syntax |
| `403 Forbidden` | No access to workspace or table | Assign Log Analytics Reader role on workspace resource |
| `WorkspaceNotFound` | Workspace ID incorrect | Use workspace GUID (customerId), not workspace name |
| `QueryTimeoutError` | Query took > 10 minutes | Narrow time range; add filters before summarize; partition large queries |
| `DataCapReached` | Workspace daily data cap hit | Increase cap or add filters to reduce ingestion; check noisy tables |
| `PartialError on cross-workspace query` | One workspace inaccessible | Check permissions on each workspace in the union |
| `Schema does not contain column` | Column name wrong or table schema changed | Check table schema in workspace → Tables; use `getschema` operator |
| `Ingestion latency` | Logs arriving 2-5 min late | Account for ingestion lag in alert evaluation windows |

---

## Throttling Limits Table

| Resource | Limit | Retry Strategy |
|----------|-------|---------------|
| Log Analytics API queries | 200 concurrent per workspace | Queue queries; implement retry with exponential backoff |
| Query timeout | 10 minutes | Break into smaller time-range queries; use `take` to limit output |
| Data ingestion | 500 GB/day (default cap) | Review and reduce verbose log sources; use sampling |
| Workspace retention | 4 years maximum | Use data export to Storage for longer retention |
| Saved searches | 5,000 per workspace | Archive unused saved searches; use workbooks instead |
| Cross-workspace query depth | 100 workspaces per query | Use management groups and workspace hierarchies |
| Log alert evaluation | 1-minute minimum frequency | Use 5-minute frequency for cost optimization |

---

## Common Patterns and Gotchas

**1. Ingestion latency in alert queries**
Log data takes 2-5 minutes to appear in Log Analytics after generation. Alert queries using `> ago(5m)` may miss recent events. Use `> ago(10m)` for alert window sizing to account for ingestion delay.

**2. `make_set` vs `mv-expand`**
`make_set` creates an array column (useful for display). `mv-expand` expands an array column into multiple rows (useful for further filtering). They are inverse operations — use `make_set` to aggregate, `mv-expand` to unnest.

**3. Case sensitivity**
KQL operators `contains`, `has`, `startswith` are case-insensitive by default. Use `contains_cs`, `has_cs`, `startswith_cs` for case-sensitive matching. Column names are case-sensitive.

**4. `project` vs `project-away` vs `project-rename`**
`project` selects specific columns (drops all others). `project-away` drops specific columns (keeps all others). `project-rename` renames without dropping. Prefer `project-away` when you want most columns but need to remove a few.

**5. Performance: filter early, summarize late**
Always apply `where` filters as early in the pipeline as possible — before `extend`, `join`, or `summarize`. This reduces data scanned and speeds queries significantly.

**6. `union` vs `join`**
`union` combines rows from tables with similar schemas (vertical stack). `join` combines columns from two tables on a key (horizontal merge). Using `union` when you need `join` produces unexpected row multiplication.

**7. Workspace resource ID vs customerId**
The REST API for direct queries uses `customerId` (GUID, shown in workspace properties). ARM management APIs use the full resource ID. The Log Analytics SDK (`@azure/monitor-query`) accepts the `customerId`.
