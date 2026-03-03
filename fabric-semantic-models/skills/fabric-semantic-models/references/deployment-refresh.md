# Deployment and Refresh — REST API, XMLA, Incremental Refresh, CI/CD Pipelines

This reference covers semantic model deployment via XMLA and REST API, incremental refresh configuration, CI/CD pipeline patterns, and operational refresh management for Microsoft Fabric Semantic Models.

---

## REST API — Refresh Operations

**Base URL**: `https://api.powerbi.com/v1.0/myorg`

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| POST | `/groups/{wId}/datasets/{dId}/refreshes` | Dataset Write | `type`, `notifyOption`, `objects` | Trigger async refresh |
| GET | `/groups/{wId}/datasets/{dId}/refreshes` | Dataset Read | `$top` | Refresh history (max 60) |
| GET | `/groups/{wId}/datasets/{dId}/refreshes/{refreshId}` | Dataset Read | — | Single refresh status |
| DELETE | `/groups/{wId}/datasets/{dId}/refreshes/{refreshId}` | Dataset Write | — | Cancel in-progress refresh |
| GET | `/groups/{wId}/datasets/{dId}/parameters` | Dataset Read | — | List parameters |
| PATCH | `/groups/{wId}/datasets/{dId}/parameters` | Dataset Write | `updateDetails` | Update parameter values |
| POST | `/groups/{wId}/datasets/{dId}/Default.TakeOver` | Dataset Admin | — | Transfer ownership |
| GET | `/groups/{wId}/datasets/{dId}/datasources` | Dataset Read | — | List data sources |

```bash
# Trigger a standard full refresh
curl -X POST \
  "https://api.powerbi.com/v1.0/myorg/groups/${WORKSPACE_ID}/datasets/${DATASET_ID}/refreshes" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"notifyOption": "MailOnFailure"}'

# Enhanced refresh — partial table + parallel processing
curl -X POST \
  "https://api.powerbi.com/v1.0/myorg/groups/${WORKSPACE_ID}/datasets/${DATASET_ID}/refreshes" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "full",
    "commitMode": "transactional",
    "maxParallelism": 6,
    "retryCount": 2,
    "notifyOption": "MailOnFailure",
    "objects": [
      { "table": "FactSales", "partition": "FactSales_202503" },
      { "table": "FactSales", "partition": "FactSales_202502" },
      { "table": "DimProduct" },
      { "table": "DimCustomer" }
    ]
  }'

# Check refresh status (poll for completion)
curl "https://api.powerbi.com/v1.0/myorg/groups/${WORKSPACE_ID}/datasets/${DATASET_ID}/refreshes?$top=1" \
  -H "Authorization: Bearer ${TOKEN}"
```

**Refresh types**:
| Type | Description |
|------|-------------|
| `full` | Re-queries all source data; processes all partitions |
| `clearValues` | Clears data but keeps partitions; does not fetch from source |
| `calculate` | Recalculates calculated columns and measures without re-querying source |
| `dataOnly` | Imports source data; skips recalculating |
| `automatic` | Only refreshes partitions detected as changed (requires detect data changes) |
| `defragment` | Optimizes in-memory storage; no source query |

### Poll for Refresh Completion (Python)

```python
import requests
import time

def wait_for_refresh(workspace_id: str, dataset_id: str, token: str, timeout_seconds: int = 3600) -> dict:
    """Trigger a refresh and poll until it completes."""
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    base = f"https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/datasets/{dataset_id}"

    # Trigger refresh
    resp = requests.post(f"{base}/refreshes",
        headers=headers,
        json={"notifyOption": "NoNotification", "type": "full"}
    )
    resp.raise_for_status()

    start_time = time.time()
    while time.time() - start_time < timeout_seconds:
        time.sleep(30)
        history = requests.get(f"{base}/refreshes?$top=1", headers=headers).json()
        latest = history["value"][0]
        status = latest["status"]

        if status == "Completed":
            return {"success": True, "details": latest}
        elif status == "Failed":
            return {"success": False, "details": latest, "error": latest.get("serviceExceptionJson")}
        # status == "Unknown" means still running

    return {"success": False, "error": "Timeout waiting for refresh"}
```

---

## Incremental Refresh Configuration

Incremental refresh partitions large fact tables by date, refreshing only recent data automatically.

### Step 1: Define Power Query Parameters

In Power BI Desktop > Power Query Editor:

1. **New Parameter: RangeStart**
   - Type: `Date/Time`
   - Current value: `1/1/2000 12:00:00 AM` (placeholder)
2. **New Parameter: RangeEnd**
   - Type: `Date/Time`
   - Current value: `1/1/2000 12:00:00 AM` (placeholder)

### Step 2: Apply Date Filter in Power Query

```powerquery
// M code for FactSales table — filter using parameters
let
    Source = Sql.Database("contoso.database.windows.net", "SalesDB"),
    Navigation = Source{[Schema="dbo",Item="FactSales"]}[Data],
    FilteredRows = Table.SelectRows(Navigation, each
        [OrderDate] >= RangeStart and [OrderDate] < RangeEnd
    )
in
    FilteredRows
```

**Critical**: The filter must reference `RangeStart` and `RangeEnd` directly. Power BI detects query folding on these parameters to generate incremental refresh partitions. If the filter cannot be folded to the source, incremental refresh will not work.

### Step 3: Configure Incremental Refresh Policy

1. In Power BI Desktop, right-click `FactSales` > **Incremental refresh and real-time data**.
2. Configure:
   - **Archive data from**: `5 years before refresh date` (historical, rarely refreshed)
   - **Incrementally refresh data from**: `3 days before refresh date` (rolling refresh window)
   - **Detect data changes** (optional): Use a `LastModifiedDate` column if available — only processes changed rows
   - **Get the latest data in real time with DirectQuery**: Enables hybrid (historical partitions use import; recent uses DirectQuery)

### Step 4: Publish and Verify

```bash
# After publishing, check partitions via XMLA:
# Connect to: powerbi://api.powerbi.com/v1.0/myorg/<WorkspaceName>
# Run in SSMS or DAX Studio:

SELECT * FROM $SYSTEM.TMSCHEMA_PARTITIONS WHERE [TableID] = (
    SELECT [ID] FROM $SYSTEM.TMSCHEMA_TABLES WHERE [Name] = 'FactSales'
)
```

### Incremental Refresh REST API (Enhanced Refresh)

```bash
# Refresh only the recent rolling partition (last 3 days)
curl -X POST \
  "https://api.powerbi.com/v1.0/myorg/groups/${WORKSPACE_ID}/datasets/${DATASET_ID}/refreshes" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "full",
    "commitMode": "transactional",
    "objects": [
      { "table": "FactSales", "partition": "FactSales_Rolling_3_Days" }
    ]
  }'

# List partitions for a table (requires XMLA or Admin API)
# Via Admin API:
curl "https://api.powerbi.com/v1.0/myorg/admin/datasets/${DATASET_ID}/tables/FactSales/partitions" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## XMLA Deployment

### XMLA Endpoint URLs

| Environment | URL Pattern |
|-------------|------------|
| Power BI Service | `powerbi://api.powerbi.com/v1.0/myorg/<WorkspaceName>` |
| Sovereign clouds (GCC High) | `powerbi://api.powerbi.us/v1.0/myorg/<WorkspaceName>` |
| Azure Analysis Services (reference) | `asazure://<region>.asazure.windows.net/<server>` |

### Authentication for XMLA

```
Service Principal connection string:
  Data Source=powerbi://api.powerbi.com/v1.0/myorg/MyWorkspace;
  User ID=app:<clientId>@<tenantId>;
  Password=<clientSecret>;

Azure AD User (interactive):
  Data Source=powerbi://api.powerbi.com/v1.0/myorg/MyWorkspace;
  Provider=MSOLAP;
  Integrated Security=ClaimsToken;
```

### TMSL (Tabular Model Scripting Language) Operations

```json
// Full database refresh via XMLA
{
  "refresh": {
    "type": "full",
    "database": "MySemanticModel",
    "maxParallelism": 4
  }
}

// Partial refresh — specific tables and partitions
{
  "refresh": {
    "type": "full",
    "maxParallelism": 6,
    "objects": [
      { "database": "MySemanticModel", "table": "FactSales", "partition": "FactSales_202503" },
      { "database": "MySemanticModel", "table": "DimProduct" }
    ]
  }
}

// Add a partition (for manual partition management)
{
  "createOrReplace": {
    "object": {
      "database": "MySemanticModel",
      "table": "FactSales",
      "partition": "FactSales_202503"
    },
    "partition": {
      "name": "FactSales_202503",
      "source": {
        "type": "m",
        "expression": "let Source = ..., FilteredRows = Table.SelectRows(Source, each [OrderDate] >= #datetime(2025,3,1,0,0,0) and [OrderDate] < #datetime(2025,4,1,0,0,0)) in FilteredRows"
      }
    }
  }
}

// Drop a partition
{
  "delete": {
    "object": {
      "database": "MySemanticModel",
      "table": "FactSales",
      "partition": "FactSales_201901"
    }
  }
}
```

### PowerShell Deployment Script

```powershell
param(
    [Parameter(Mandatory=$true)]
    [string]$WorkspaceName,

    [Parameter(Mandatory=$true)]
    [string]$ModelPath,  # Path to .bim or TMDL folder

    [string]$ModelName = "MySemanticModel",

    [string]$ClientId = $env:FABRIC_CLIENT_ID,
    [string]$ClientSecret = $env:FABRIC_CLIENT_SECRET,
    [string]$TenantId = $env:FABRIC_TENANT_ID
)

$xmlaEndpoint = "powerbi://api.powerbi.com/v1.0/myorg/$WorkspaceName"

# Deploy model using Tabular Editor (must be installed)
$teArgs = @(
    "deploy",
    "`"$ModelPath`"",
    "`"$xmlaEndpoint`"",
    "`"$ModelName`"",
    "-U `"app:$ClientId@$TenantId`"",
    "-P `"$ClientSecret`"",
    "-O",   # Overwrite existing model
    "-P",   # Preserve data partitions (don't clear on deploy)
    "-R",   # Role members
    "-M",   # Model definition only (no data refresh)
    "-V",   # Run validation
    "-A BestPracticeRules.json"  # Best practice rules check
)

$result = & "TabularEditor.exe" $teArgs
if ($LASTEXITCODE -ne 0) {
    Write-Error "Tabular Editor deployment failed: $result"
    exit 1
}
Write-Host "Model deployed successfully to $WorkspaceName"

# Optionally trigger a refresh after deployment
$token = (az account get-access-token --resource https://analysis.windows.net/powerbi/api --query accessToken -o tsv)
# ... use REST API to trigger refresh
```

---

## CI/CD Pipeline Patterns

### Azure DevOps Pipeline — Semantic Model Deployment

```yaml
# azure-pipelines.yml

trigger:
  branches:
    include: [main]
  paths:
    include: ['semantic-models/**']

variables:
  WORKSPACE_NAME_DEV: 'Analytics-Dev'
  WORKSPACE_NAME_PROD: 'Analytics-Prod'
  MODEL_PATH: 'semantic-models/SalesAnalytics'

stages:
  - stage: ValidateModel
    jobs:
      - job: BestPracticeCheck
        steps:
          - task: PowerShell@2
            displayName: 'Run Tabular Editor Best Practice Rules'
            inputs:
              script: |
                TabularEditor.exe "$(MODEL_PATH)/database.tmdl" `
                  -A BestPracticeRules.json `
                  -V
              failOnStderr: true

  - stage: DeployDev
    dependsOn: ValidateModel
    condition: succeeded()
    jobs:
      - deployment: DeployTodev
        environment: Dev
        strategy:
          runOnce:
            deploy:
              steps:
                - task: PowerShell@2
                  displayName: 'Deploy to Dev workspace'
                  env:
                    CLIENT_SECRET: $(FABRIC_CLIENT_SECRET)
                  inputs:
                    script: |
                      TabularEditor.exe deploy `
                        "$(MODEL_PATH)/database.tmdl" `
                        "powerbi://api.powerbi.com/v1.0/myorg/$(WORKSPACE_NAME_DEV)" `
                        "SalesAnalytics-Dev" `
                        -U "app:$(FABRIC_CLIENT_ID)@$(FABRIC_TENANT_ID)" `
                        -P "$env:CLIENT_SECRET" -O -P

  - stage: DeployProd
    dependsOn: DeployDev
    condition: succeeded()
    jobs:
      - deployment: DeployToProd
        environment: Production
        strategy:
          runOnce:
            deploy:
              steps:
                - task: PowerShell@2
                  displayName: 'Deploy to Production workspace'
                  env:
                    CLIENT_SECRET: $(FABRIC_CLIENT_SECRET)
                  inputs:
                    script: |
                      TabularEditor.exe deploy `
                        "$(MODEL_PATH)/database.tmdl" `
                        "powerbi://api.powerbi.com/v1.0/myorg/$(WORKSPACE_NAME_PROD)" `
                        "SalesAnalytics" `
                        -U "app:$(FABRIC_CLIENT_ID)@$(FABRIC_TENANT_ID)" `
                        -P "$env:CLIENT_SECRET" -O -P
```

### PBIP Format for Git-Friendly Storage

Power BI Project (PBIP) format stores the model as human-readable TMDL files:

```
SalesAnalytics/
├── SalesAnalytics.SemanticModel/
│   ├── definition/
│   │   ├── database.tmdl          # Model metadata
│   │   ├── tables/
│   │   │   ├── DimDate.tmdl       # Per-table definition
│   │   │   ├── FactSales.tmdl
│   │   │   └── DimProduct.tmdl
│   │   ├── relationships.tmdl
│   │   ├── roles.tmdl
│   │   └── expressions.tmdl      # Power Query (M code)
│   └── .platform                 # Fabric metadata
└── SalesAnalytics.Report/        # Optional: linked report
```

TMDL is diff-friendly for code review — changes to a single measure produce a one-line diff.

---

## Error Codes and Remediation

| Error | Meaning | Fix |
|-------|---------|-----|
| `NotFound: Dataset not found` | Dataset ID or workspace ID invalid | Re-fetch IDs using GET /datasets endpoint |
| `Forbidden: Insufficient privileges` | Service principal lacks Dataset.ReadWrite.All | Grant permission in Power BI Admin portal + service principal consent |
| `Refresh failed: Data source credentials required` | Credentials not set for data source in Power BI service | Set credentials via Manage gateways or dataset settings |
| `Refresh limit exceeded: 48 per day` | Scheduled + API refreshes exceeded daily limit | Use incremental refresh (reduces per-partition count); stagger schedules |
| `commitMode: transactional not supported` | Model is in import mode without Premium | Enhanced refresh with `commitMode` requires Premium/Fabric SKU |
| `XMLA: Not authorized` | XMLA read-write not enabled or caller not in workspace | Enable XMLA in admin portal + workspace settings; add to workspace |
| `Tabular Editor: Connection refused` | Workspace name has special characters or spaces | URL-encode the workspace name in the XMLA endpoint |
| `Incremental refresh: query fold not detected` | Power Query filter on RangeStart/RangeEnd cannot fold | Rewrite M query to ensure filter is applied before any non-foldable operation |

---

## Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Refresh requests per hour (API) | 50 | Spread calls with retry logic |
| Scheduled refreshes per day | 48 | Incremental refresh does not multiply count |
| Max parallel tables in enhanced refresh | 16 | `maxParallelism` parameter |
| Max partitions per table | 4,000 | Incremental refresh typically creates 1 per period |
| Refresh retry count (enhanced) | 10 | `retryCount` parameter |
| Incremental refresh lookback for detect changes | 90 days | Older partitions are never re-checked |
| XMLA connections per workspace | 100 | Per tenant |
| Model backup size (ABFS) | Unlimited | Stored in OneLake |
