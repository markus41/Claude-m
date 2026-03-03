# Data Pipelines

## Overview

Fabric Data Pipelines orchestrate data movement and transformation activities within a workspace. They are built on the same engine as Azure Data Factory and support Copy activity, Notebook activity, Dataflow Gen2 activity, stored procedure execution, and control flow activities. This reference covers the Pipeline REST API, Copy activity for OneLake, Lakehouse connectors, activity dependencies, parallel execution, error handling with retry, and pipeline monitoring.

---

## Pipeline REST API

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| POST | `/v1/workspaces/{workspaceId}/items` | Workspace Contributor | `type=DataPipeline`, `displayName`, `definition` | Creates pipeline |
| GET | `/v1/workspaces/{workspaceId}/dataPipelines` | Workspace Viewer | — | Lists pipelines |
| GET | `/v1/workspaces/{workspaceId}/dataPipelines/{pipelineId}` | Workspace Viewer | — | Gets pipeline metadata |
| GET | `/v1/workspaces/{workspaceId}/dataPipelines/{pipelineId}/content` | Workspace Viewer | — | Downloads pipeline JSON definition |
| POST | `/v1/workspaces/{workspaceId}/items/{pipelineId}/jobs/instances` | Workspace Contributor | `jobType=Pipeline`, `executionData.parameters` | Triggers pipeline run |
| GET | `/v1/workspaces/{workspaceId}/items/{pipelineId}/jobs/instances/{jobInstanceId}` | Workspace Viewer | — | Polls run status |
| GET | `/v1/workspaces/{workspaceId}/items/{pipelineId}/jobs/instances` | Workspace Viewer | `maxResults`, `continuationToken` | Lists historical runs |

**Base URL**: `https://api.fabric.microsoft.com`

### Trigger a Pipeline Run

```bash
TOKEN=$(az account get-access-token --resource https://api.fabric.microsoft.com --query accessToken -o tsv)

curl -X POST \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items/<pipeline-id>/jobs/instances" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jobType": "Pipeline",
    "executionData": {
      "parameters": {
        "run_date":   "2025-03-01",
        "source_env": "prod"
      }
    }
  }'
```

### Poll Run Status

```python
import time, requests

def wait_for_pipeline(token, workspace_id, pipeline_id, job_instance_id, poll_interval=15, timeout=3600):
    url = (f"https://api.fabric.microsoft.com/v1/workspaces/{workspace_id}"
           f"/items/{pipeline_id}/jobs/instances/{job_instance_id}")
    headers = {"Authorization": f"Bearer {token}"}
    elapsed = 0
    while elapsed < timeout:
        resp = requests.get(url, headers=headers)
        resp.raise_for_status()
        status = resp.json().get("status")
        print(f"  [{elapsed}s] Status: {status}")
        if status in ("Completed", "Failed", "Cancelled"):
            return status
        time.sleep(poll_interval)
        elapsed += poll_interval
    raise TimeoutError(f"Pipeline did not complete within {timeout}s")
```

---

## Copy Activity for OneLake

The Copy activity moves data between any supported connector and a Fabric Lakehouse or Warehouse.

### Copy Activity JSON (Pipeline Definition Snippet)

```json
{
  "name": "CopyRawOrdersToLakehouse",
  "type": "Copy",
  "dependsOn": [],
  "policy": {
    "timeout": "01:00:00",
    "retry": 3,
    "retryIntervalInSeconds": 60,
    "secureOutput": false
  },
  "typeProperties": {
    "source": {
      "type": "AzureBlobFSSource",
      "recursive": true,
      "wildcardFolderPath": "raw/orders/2025",
      "wildcardFileName": "*.parquet"
    },
    "sink": {
      "type": "LakehouseTableSink",
      "tableActionOption": "Append",
      "partitionOption": "None"
    },
    "enableStaging": false,
    "parallelCopies": 8,
    "dataIntegrationUnits": 4
  },
  "inputs": [
    {
      "referenceName": "ds_adls_raw",
      "type": "DatasetReference"
    }
  ],
  "outputs": [
    {
      "referenceName": "ds_lakehouse_orders",
      "type": "DatasetReference"
    }
  ]
}
```

### Key Copy Activity Sink Types for Fabric

| Sink Type | Target | Write Mode | Notes |
|-----------|--------|-----------|-------|
| `LakehouseTableSink` | Lakehouse Delta table | Append, Overwrite | Preferred for lakehouse tables |
| `LakehouseFileSink` | Lakehouse Files/ folder | WriteFiles | For raw file landing |
| `WarehouseSink` | Fabric Warehouse table | Insert, Upsert | For warehouse destinations |

### Copy Activity for Files/ Landing (Binary Copy)

```json
{
  "name": "CopyFilesToLanding",
  "type": "Copy",
  "typeProperties": {
    "source": {
      "type": "BinarySource",
      "storeSettings": {
        "type": "AzureBlobFSReadSettings",
        "recursive": true
      }
    },
    "sink": {
      "type": "BinarySink",
      "storeSettings": {
        "type": "LakehouseWriteSettings"
      }
    }
  }
}
```

---

## Lakehouse Connector

The Fabric Lakehouse connector provides direct read/write access to Delta tables and files without staging.

### Lakehouse Linked Service (Connection)

In Fabric pipelines, connections replace Azure Data Factory linked services. A Lakehouse connection is automatically available within the same workspace — no explicit connection setup needed.

```json
{
  "name": "ds_lakehouse_orders",
  "type": "Dataset",
  "typeProperties": {
    "type": "LakehouseTable",
    "linkedServiceName": {
      "referenceName": "ls_workspace_lakehouse",
      "type": "LinkedServiceReference"
    },
    "typeProperties": {
      "workspaceId":   "@pipeline().parameters.workspaceId",
      "artifactId":    "@pipeline().parameters.lakhouseId",
      "tableName":     "raw_orders"
    }
  }
}
```

---

## Activity Dependencies

Activities execute sequentially by default. Define `dependsOn` to control ordering and branching.

### Dependency Condition Values

| Condition | Meaning |
|-----------|---------|
| `Succeeded` | Run this activity only if predecessor succeeded |
| `Failed` | Run this activity only if predecessor failed |
| `Skipped` | Run this activity only if predecessor was skipped |
| `Completed` | Run this activity regardless of predecessor outcome |

### Sequential Chain

```json
{
  "activities": [
    { "name": "LoadBronze",  "dependsOn": [] },
    { "name": "TransformSilver", "dependsOn": [{"activity": "LoadBronze", "dependencyConditions": ["Succeeded"]}] },
    { "name": "BuildGold",   "dependsOn": [{"activity": "TransformSilver", "dependencyConditions": ["Succeeded"]}] }
  ]
}
```

### Error Branch (Notify on Failure)

```json
{
  "name": "NotifyFailure",
  "type": "WebActivity",
  "dependsOn": [
    {"activity": "LoadBronze", "dependencyConditions": ["Failed"]}
  ],
  "typeProperties": {
    "url":    "https://prod-hooks.example.com/alert",
    "method": "POST",
    "body":   "@concat('{\"message\":\"Pipeline failed: ', activity('LoadBronze').error.message, '\"}')"
  }
}
```

---

## Parallel Execution

Use ForEach and activity fan-out to process multiple partitions or files concurrently.

### ForEach Activity (Parallel)

```json
{
  "name": "ForEachTable",
  "type": "ForEach",
  "typeProperties": {
    "isSequential": false,
    "batchCount":   5,
    "items": "@pipeline().parameters.tableList",
    "activities": [
      {
        "name": "CopyTable",
        "type": "Copy",
        "typeProperties": {
          "source": {
            "type": "SqlServerSource",
            "sqlReaderQuery": "@concat('SELECT * FROM ', item(), ' WHERE modified_date >= ''2025-03-01''')"
          },
          "sink": {
            "type": "LakehouseTableSink",
            "tableActionOption": "Overwrite"
          }
        }
      }
    ]
  }
}
```

`batchCount` controls parallelism. Maximum is 50. Values above 10 can stress Fabric capacity on smaller SKUs.

### Parameterize Table List

```json
{
  "parameters": {
    "tableList": {
      "type": "Array",
      "defaultValue": ["orders", "customers", "products", "inventory"]
    }
  }
}
```

---

## Error Handling and Retry

### Activity-Level Retry Policy

```json
{
  "policy": {
    "timeout":                "00:30:00",
    "retry":                  3,
    "retryIntervalInSeconds": 60,
    "secureOutput":           false,
    "secureInput":            false
  }
}
```

- `timeout`: Max time for a single activity attempt (ISO 8601 duration).
- `retry`: Number of retry attempts after initial failure (0–10).
- `retryIntervalInSeconds`: Wait time between retries (30–86400).

### If Condition for Conditional Logic

```json
{
  "name": "IfDataExists",
  "type": "IfCondition",
  "typeProperties": {
    "expression": {
      "value": "@greater(activity('GetRowCount').output.firstRow.row_count, 0)",
      "type":  "Expression"
    },
    "ifTrueActivities":  [{ "name": "TransformData", "type": "Notebook" }],
    "ifFalseActivities": [{ "name": "LogSkip",       "type": "WebActivity" }]
  }
}
```

### Until Activity (Wait for Condition)

```json
{
  "name": "WaitForData",
  "type": "Until",
  "typeProperties": {
    "expression": {
      "value": "@equals(activity('CheckFile').output.exists, true)",
      "type":  "Expression"
    },
    "timeout":    "01:00:00",
    "activities": [
      {
        "name": "CheckFile",
        "type": "GetMetadata",
        "typeProperties": {
          "fieldList": ["exists"],
          "dataset":   { "referenceName": "ds_landing_file" }
        }
      },
      { "name": "Wait30s", "type": "Wait", "typeProperties": {"waitTimeInSeconds": 30} }
    ]
  }
}
```

---

## Pipeline Monitoring API

### List Activity Runs for a Pipeline Run

```bash
# First trigger a run, get jobInstanceId
JOB_INSTANCE_ID="<from-trigger-response>"

# Get run details including individual activity status
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items/<pipeline-id>/jobs/instances/$JOB_INSTANCE_ID"
```

### Query Pipeline Run History

```bash
# List recent pipeline runs
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items/<pipeline-id>/jobs/instances?maxResults=20" \
  | python -m json.tool
```

### Monitor via Fabric Monitoring Hub

1. Navigate to the Fabric workspace.
2. Click the **Monitoring hub** (stopwatch icon in the left nav).
3. Filter by item type (Data pipeline), status (Failed), and time range.
4. Click a run to view activity-level details, durations, and error messages.

---

## Passing Parameters Between Activities

Use the `@activity()` expression to reference output from previous activities.

```json
{
  "name": "LoadAndTransform",
  "activities": [
    {
      "name": "GetWatermark",
      "type": "Lookup",
      "typeProperties": {
        "source": {
          "type": "WarehouseSource",
          "sqlReaderQuery": "SELECT MAX(loaded_at) AS last_load FROM staging.Watermark WHERE table_name = 'orders'"
        }
      }
    },
    {
      "name": "CopyIncrementalData",
      "type": "Copy",
      "dependsOn": [{"activity": "GetWatermark", "dependencyConditions": ["Succeeded"]}],
      "typeProperties": {
        "source": {
          "type": "SqlServerSource",
          "sqlReaderQuery": "@concat('SELECT * FROM dbo.orders WHERE modified_at > ''', activity('GetWatermark').output.firstRow.last_load, '''')"
        }
      }
    }
  ]
}
```

---

## Global Parameters

Global parameters are pipeline-level variables reusable across all activities.

```json
{
  "parameters": {
    "workspace_id":   { "type": "String", "defaultValue": "<workspace-guid>" },
    "lakehouse_id":   { "type": "String", "defaultValue": "<lakehouse-guid>" },
    "environment":    { "type": "String", "defaultValue": "prod" },
    "batch_date":     { "type": "String", "defaultValue": "" }
  }
}
```

Access in expressions: `@pipeline().parameters.batch_date`

---

## Error Codes Table

| Error | Meaning | Remediation |
|-------|---------|-------------|
| `ErrorCode=UserErrorInvalidDataset` | Dataset configuration references a missing connection or item | Verify workspace/item GUIDs in dataset properties |
| `ErrorCode=ConnectorNotSupported` | Connector type not available in Fabric pipelines | Check Fabric connector support list; use alternative source |
| `ErrorCode=FailedToConnect` | Cannot reach source/sink (network, credentials) | Verify connection credentials; check firewall rules for on-prem sources |
| `ErrorCode=TypeMismatch` | Source column type incompatible with sink | Add explicit type mapping in Copy activity column mapping |
| `ErrorCode=NotFound_TableNotExist` | Target lakehouse table does not exist | Create the table first or set sink `tableActionOption=Overwrite` |
| `ActivityTimeoutReached` | Activity exceeded its timeout setting | Increase timeout; optimize the activity; add retry |
| `UserErrorFailedToConnect_AzureDataLakeStorage` | Invalid ADLS credentials or endpoint | Re-create the Fabric connection; verify SPN permissions on ADLS |
| HTTP 400 on trigger API | Malformed parameter types | Verify parameter value types are strings (pipeline parameters are always strings at API level) |
| HTTP 429 on pipeline API | Rate limit exceeded | Apply exponential backoff; avoid rapid repeated triggers |

---

## Throttling / Limits Table

| Resource | Limit | Notes |
|----------|-------|-------|
| Max concurrent pipeline runs per workspace | 25 | Queued runs wait for capacity |
| Max activities per pipeline | 40 | Split into child pipelines for large orchestrations |
| ForEach batchCount (parallelism) | 50 | Keep ≤10 on small SKUs to avoid capacity spikes |
| Copy activity retry max | 10 | Avoid excessive retries masking systematic failures |
| Lookup activity result rows | 5,000 | Use aggregation SQL to return single-row watermarks |
| Pipeline run history retention | 45 days | Export to Log Analytics for longer retention |
| Activity timeout max | 7 days | Use Azure Data Factory for multi-day long-running jobs |
| Fabric pipeline API rate | 1,000 requests/minute per user | Use service principal and implement exponential backoff |

---

## Common Patterns and Gotchas

### Gotcha: ForEach Parallelism and Capacity Spikes

Running ForEach with `batchCount=50` across Notebook activities each starting a Spark session can saturate Fabric capacity, causing throttling and session failures. Test with `batchCount=3–5` before increasing.

### Pattern: Watermark-Based Incremental Copy

```json
{
  "name": "IncrementalLoadPipeline",
  "activities": [
    {
      "name": "GetLastWatermark",
      "type": "Lookup",
      "typeProperties": {
        "source": {
          "sqlReaderQuery": "SELECT last_load_ts FROM ctrl.watermark WHERE table_name = 'orders'"
        }
      }
    },
    {
      "name": "CopyNewRows",
      "type": "Copy",
      "dependsOn": [{"activity": "GetLastWatermark", "dependencyConditions": ["Succeeded"]}],
      "typeProperties": {
        "source": {
          "sqlReaderQuery": "@concat('SELECT * FROM dbo.orders WHERE updated_at > ''', activity('GetLastWatermark').output.firstRow.last_load_ts, '''')"
        },
        "sink": { "type": "LakehouseTableSink", "tableActionOption": "Append" }
      }
    },
    {
      "name": "UpdateWatermark",
      "type": "Script",
      "dependsOn": [{"activity": "CopyNewRows", "dependencyConditions": ["Succeeded"]}],
      "typeProperties": {
        "scripts": [{
          "text": "UPDATE ctrl.watermark SET last_load_ts = GETDATE() WHERE table_name = 'orders'"
        }]
      }
    }
  ]
}
```

### Gotcha: Notebook Activity Does Not Propagate Spark Errors by Default

A Notebook activity reports success even if the notebook cell raises a Python exception, unless `mssparkutils.notebook.exit()` is called with a non-success value or an unhandled exception propagates to the top level.

**Solution**: Use structured exit codes.

```python
try:
    # processing logic
    row_count = df.count()
    mssparkutils.notebook.exit(f"SUCCESS:{row_count}")
except Exception as e:
    mssparkutils.notebook.exit(f"FAILED:{str(e)}")
    raise
```

Then in the pipeline, check the notebook output:
```
@startsWith(activity('RunTransform').output.exitCode, 'FAILED')
```

### Pattern: Parallel Multi-Source Copy Fan-In

Load from multiple source tables in parallel, then run a single downstream transformation notebook after all copies succeed.

```json
{
  "activities": [
    { "name": "CopyOrders",    "type": "Copy", "dependsOn": [] },
    { "name": "CopyCustomers", "type": "Copy", "dependsOn": [] },
    { "name": "CopyProducts",  "type": "Copy", "dependsOn": [] },
    {
      "name": "TransformAll",
      "type": "Notebook",
      "dependsOn": [
        {"activity": "CopyOrders",    "dependencyConditions": ["Succeeded"]},
        {"activity": "CopyCustomers", "dependencyConditions": ["Succeeded"]},
        {"activity": "CopyProducts",  "dependencyConditions": ["Succeeded"]}
      ]
    }
  ]
}
```
