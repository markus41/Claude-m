---
name: pipeline-create
description: "Create a Fabric data pipeline with activities, error handling, and scheduling"
argument-hint: "<pipeline-name> --workspace <workspace-name> [--trigger <schedule|tumbling-window|event>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Create a Fabric Data Pipeline

Create a data pipeline with activities, parameterization, error handling, and trigger configuration.

## Instructions

### 1. Validate Inputs

- `<pipeline-name>` -- Name for the pipeline (e.g., `pl_ingest_sales_daily`). Ask if not provided.
- `--workspace` -- Target Fabric workspace. Ask if not provided.
- `--trigger` -- Trigger type: `schedule` (cron-based), `tumbling-window` (fixed intervals), `event` (storage event). Default is `schedule`.

### 2. Apply Naming Convention

Pipeline names should follow the pattern: `pl_<action>_<domain>_<frequency>`
- Examples: `pl_ingest_sales_daily`, `pl_transform_inventory_hourly`, `pl_refresh_reports_weekly`

### 3. Define Pipeline Parameters

Every pipeline should include these standard parameters:

```json
{
  "parameters": {
    "environment": { "type": "string", "defaultValue": "prod" },
    "run_date": { "type": "string", "defaultValue": "@utcNow('yyyy-MM-dd')" },
    "source_lakehouse": { "type": "string", "defaultValue": "" },
    "target_lakehouse": { "type": "string", "defaultValue": "" }
  }
}
```

### 4. Common Pipeline Patterns

**Pattern A: Copy then Transform**
```
Copy Activity (source -> bronze lakehouse)
  -> Notebook Activity (bronze -> silver transform)
    -> Notebook Activity (silver -> gold aggregate)
      -> [On Success] Web Activity (notify success)
      -> [On Failure] Web Activity (notify failure)
```

**Pattern B: ForEach Parallel Ingestion**
```
Lookup Activity (get list of sources)
  -> ForEach Activity (parallel)
    -> Copy Activity (load each source)
  -> Notebook Activity (merge all sources)
```

**Pattern C: Incremental Load with Watermark**
```
Lookup Activity (get last watermark)
  -> Copy Activity (load rows > watermark)
    -> Stored Procedure Activity (update watermark)
```

### 5. Configure Activities

**Copy Activity**:
```json
{
  "name": "Copy_Source_To_Bronze",
  "type": "Copy",
  "inputs": [{ "referenceName": "SourceDataset", "type": "DatasetReference" }],
  "outputs": [{ "referenceName": "BronzeLakehouse", "type": "DatasetReference" }],
  "typeProperties": {
    "source": { "type": "DelimitedTextSource" },
    "sink": { "type": "ParquetSink", "storeSettings": { "type": "AzureBlobFSWriteSettings" } }
  },
  "policy": { "retry": 3, "retryIntervalInSeconds": 30, "timeout": "01:00:00" }
}
```

**Notebook Activity**:
```json
{
  "name": "Transform_Bronze_To_Silver",
  "type": "SparkNotebook",
  "typeProperties": {
    "notebook": { "referenceName": "nb_transform_silver", "type": "NotebookReference" },
    "parameters": {
      "source_table": { "value": "@pipeline().parameters.source_table", "type": "string" },
      "run_date": { "value": "@pipeline().parameters.run_date", "type": "string" }
    }
  },
  "dependsOn": [{ "activity": "Copy_Source_To_Bronze", "dependencyConditions": ["Succeeded"] }],
  "policy": { "retry": 2, "retryIntervalInSeconds": 60, "timeout": "02:00:00" }
}
```

**Error Handling Activity**:
```json
{
  "name": "Notify_Failure",
  "type": "WebActivity",
  "typeProperties": {
    "url": "@pipeline().parameters.alert_webhook_url",
    "method": "POST",
    "body": {
      "pipeline": "@pipeline().Pipeline",
      "runId": "@pipeline().RunId",
      "error": "@activity('Transform_Bronze_To_Silver').error.message",
      "timestamp": "@utcNow()"
    }
  },
  "dependsOn": [{ "activity": "Transform_Bronze_To_Silver", "dependencyConditions": ["Failed"] }]
}
```

### 6. Configure Trigger

**Schedule trigger** (runs at a fixed cron schedule):
```json
{
  "type": "ScheduleTrigger",
  "typeProperties": {
    "recurrence": {
      "frequency": "Day",
      "interval": 1,
      "startTime": "2024-01-01T06:00:00Z",
      "timeZone": "UTC"
    }
  }
}
```

**Tumbling window trigger** (fixed intervals with retry):
```json
{
  "type": "TumblingWindowTrigger",
  "typeProperties": {
    "frequency": "Hour",
    "interval": 1,
    "startTime": "2024-01-01T00:00:00Z",
    "delay": "00:05:00",
    "maxConcurrency": 1,
    "retryPolicy": { "count": 3, "intervalInSeconds": 300 }
  }
}
```

### 7. Create via REST API

```bash
curl -X POST "https://api.fabric.microsoft.com/v1/workspaces/$WORKSPACE_ID/dataPipelines" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"displayName": "<pipeline-name>", "definition": {"parts": [...]}}'
```

### 8. Display Summary

Show the user:
- Pipeline name, workspace, and trigger configuration
- Activities and their dependency chain
- Parameters and default values
- Error handling strategy
- Next steps: test with manual trigger, monitor in Monitoring Hub
