# Orchestration and Triggers

## Overview

Fabric Data Pipelines support schedule-based triggers, storage event triggers, and manual/API triggers. Complex orchestration is built using control flow activities — ForEach, If Condition, Switch, Until, Wait, and Set Variable — plus parameters passed between activities and across pipelines. This reference covers trigger types, control flow patterns, parameter passing between activities, and global parameter configuration.

---

## Trigger Types

### Schedule Trigger

```json
{
  "name": "DailyETLTrigger",
  "type": "ScheduleTrigger",
  "typeProperties": {
    "recurrence": {
      "frequency": "Day",
      "interval":   1,
      "startTime":  "2025-01-01T06:00:00Z",
      "timeZone":   "UTC",
      "schedule": {
        "hours":   [6],
        "minutes": [0]
      }
    }
  },
  "pipelines": [
    {
      "pipelineReference": { "referenceName": "MainETLPipeline" },
      "parameters": {
        "run_date": "@formatDateTime(trigger().scheduledTime, 'yyyy-MM-dd')"
      }
    }
  ]
}
```

**Recurrence frequency options**: `Minute`, `Hour`, `Day`, `Week`, `Month`

**Weekly trigger** (run on weekdays at 07:00):
```json
{
  "recurrence": {
    "frequency": "Week",
    "interval":   1,
    "startTime":  "2025-01-01T07:00:00Z",
    "schedule": {
      "weekDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "hours":    [7],
      "minutes":  [0]
    }
  }
}
```

### Storage Event Trigger

Trigger a pipeline when a file arrives in OneLake or ADLS Gen2.

```json
{
  "name": "FileArrivalTrigger",
  "type": "BlobEventsTrigger",
  "typeProperties": {
    "blobPathBeginsWith": "/mycontainer/blobs/raw/orders/",
    "blobPathEndsWith":   ".parquet",
    "events":             ["Microsoft.Storage.BlobCreated"],
    "scope":              "/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.Storage/storageAccounts/<account>"
  },
  "pipelines": [
    {
      "pipelineReference": { "referenceName": "ProcessArrivalPipeline" },
      "parameters": {
        "file_path": "@triggerBody().folderPath",
        "file_name": "@triggerBody().fileName"
      }
    }
  ]
}
```

**Trigger body expressions for blob events**:
- `@triggerBody().folderPath` — folder path of the triggering file
- `@triggerBody().fileName`   — file name only
- `@trigger().startTime`      — trigger fire time

### Manual / API Trigger

```bash
# Manual trigger via Fabric REST API
TOKEN=$(az account get-access-token --resource https://api.fabric.microsoft.com --query accessToken -o tsv)

curl -X POST \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items/<pipeline-id>/jobs/instances" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jobType": "Pipeline",
    "executionData": {
      "parameters": {
        "run_date":    "2025-03-01",
        "source_env":  "prod",
        "batch_size":  "5000"
      }
    }
  }'
```

---

## Control Flow Activities

### ForEach Activity

```json
{
  "name": "ProcessAllTables",
  "type": "ForEach",
  "typeProperties": {
    "isSequential":  false,
    "batchCount":    5,
    "items": {
      "value": "@pipeline().parameters.tableList",
      "type":  "Expression"
    },
    "activities": [
      {
        "name": "CopyTable",
        "type": "Copy",
        "typeProperties": {
          "source": {
            "type":            "AzureSqlSource",
            "sqlReaderQuery":  "@concat('SELECT * FROM dbo.', item())"
          },
          "sink": {
            "type":            "LakehouseTableSink",
            "tableActionOption": "Overwrite"
          }
        }
      }
    ]
  }
}
```

**`batchCount` guidance**:
| Source Concurrency | Recommended batchCount |
|-------------------|----------------------|
| F2–F4 capacity | 2–3 |
| F8–F16 capacity | 4–6 |
| F32–F64 capacity | 8–10 |
| F128+ capacity | 10–20 |

### If Condition Activity

```json
{
  "name": "CheckDataExists",
  "type": "IfCondition",
  "typeProperties": {
    "expression": {
      "value": "@greater(activity('CountNewRows').output.firstRow.new_row_count, 0)",
      "type":  "Expression"
    },
    "ifTrueActivities": [
      {
        "name": "TransformData",
        "type": "Notebook",
        "typeProperties": {
          "notebook": { "referenceName": "transform-notebook" }
        }
      }
    ],
    "ifFalseActivities": [
      {
        "name": "LogSkip",
        "type": "WebActivity",
        "typeProperties": {
          "url":    "https://prod-hooks.example.com/pipeline-events",
          "method": "POST",
          "body":   "{\"event\": \"skipped\", \"reason\": \"no_new_data\", \"date\": \"@{pipeline().parameters.run_date}\"}"
        }
      }
    ]
  }
}
```

### Switch Activity

```json
{
  "name": "RouteByEnvironment",
  "type": "Switch",
  "typeProperties": {
    "on": {
      "value": "@pipeline().parameters.environment",
      "type":  "Expression"
    },
    "cases": [
      {
        "value": "prod",
        "activities": [{ "name": "RunProdLoad", "type": "Notebook" }]
      },
      {
        "value": "staging",
        "activities": [{ "name": "RunStagingLoad", "type": "Notebook" }]
      }
    ],
    "defaultActivities": [
      { "name": "RunDevLoad", "type": "Notebook" }
    ]
  }
}
```

### Until Activity

```json
{
  "name": "WaitForFileArrival",
  "type": "Until",
  "typeProperties": {
    "expression": {
      "value": "@equals(variables('fileArrived'), true)",
      "type":  "Expression"
    },
    "timeout": "PT1H",
    "activities": [
      {
        "name": "CheckFile",
        "type": "GetMetadata",
        "typeProperties": {
          "fieldList": ["exists"],
          "dataset":   { "referenceName": "ds_landing_marker_file" }
        }
      },
      {
        "name": "SetFileArrived",
        "type": "SetVariable",
        "typeProperties": {
          "variableName": "fileArrived",
          "value": {
            "value": "@activity('CheckFile').output.exists",
            "type":  "Expression"
          }
        }
      },
      {
        "name": "WaitIfNotArrived",
        "type": "IfCondition",
        "typeProperties": {
          "expression": {
            "value": "@not(variables('fileArrived'))",
            "type":  "Expression"
          },
          "ifTrueActivities": [
            { "name": "Sleep60s", "type": "Wait", "typeProperties": { "waitTimeInSeconds": 60 } }
          ]
        }
      }
    ]
  }
}
```

### Wait Activity

```json
{
  "name": "WaitForDependency",
  "type": "Wait",
  "typeProperties": {
    "waitTimeInSeconds": 300
  }
}
```

### Set Variable Activity

```json
{
  "name": "SetRunDate",
  "type": "SetVariable",
  "typeProperties": {
    "variableName": "current_run_date",
    "value": {
      "value": "@formatDateTime(utcNow(), 'yyyy-MM-dd')",
      "type":  "Expression"
    }
  }
}
```

---

## Pass Parameters Between Activities

### Activity Output Expressions

| Expression | Description | Example |
|-----------|-------------|---------|
| `@activity('<name>').output` | Full activity output object | `@activity('Lookup').output` |
| `@activity('<name>').output.firstRow` | First row of Lookup output | `@activity('GetWatermark').output.firstRow.last_ts` |
| `@activity('<name>').output.value` | Array output (e.g., from Lookup `firstRowOnly=false`) | `@activity('GetTables').output.value` |
| `@activity('<name>').output.rowCount` | Rows written by Copy activity | `@activity('CopyOrders').output.rowsTransferred` |
| `@activity('<name>').output.exitCode` | Notebook exit value | `@activity('RunNotebook').output.exitCode` |
| `@activity('<name>').error.message` | Error message from failed activity | `@activity('CopyData').error.message` |

### Watermark Lookup → Incremental Copy

```json
{
  "activities": [
    {
      "name": "GetLastWatermark",
      "type": "Lookup",
      "typeProperties": {
        "source": {
          "type":            "WarehouseSource",
          "sqlReaderQuery":  "SELECT MAX(last_loaded_at) AS watermark FROM ctrl.load_log WHERE table_name = 'orders'"
        },
        "firstRowOnly": true
      }
    },
    {
      "name": "CopyIncrementalOrders",
      "type": "Copy",
      "dependsOn": [{ "activity": "GetLastWatermark", "dependencyConditions": ["Succeeded"] }],
      "typeProperties": {
        "source": {
          "type":           "SqlServerSource",
          "sqlReaderQuery": "@concat('SELECT * FROM dbo.orders WHERE modified_at > ''', activity('GetLastWatermark').output.firstRow.watermark, '''')"
        },
        "sink": {
          "type":             "LakehouseTableSink",
          "tableActionOption": "Append"
        }
      }
    },
    {
      "name": "UpdateWatermark",
      "type": "Script",
      "dependsOn": [{ "activity": "CopyIncrementalOrders", "dependencyConditions": ["Succeeded"] }],
      "typeProperties": {
        "scripts": [{
          "text": "@concat('INSERT INTO ctrl.load_log (table_name, last_loaded_at, rows_loaded) VALUES (''orders'', GETDATE(), ', activity('CopyIncrementalOrders').output.rowsTransferred, ')')"
        }]
      }
    }
  ]
}
```

### Dynamic Table List via Lookup

```json
{
  "name": "GetTableList",
  "type": "Lookup",
  "typeProperties": {
    "source": {
      "type":            "WarehouseSource",
      "sqlReaderQuery":  "SELECT table_name FROM ctrl.tables_to_load WHERE is_active = 1"
    },
    "firstRowOnly": false
  }
},
{
  "name": "ProcessEachTable",
  "type": "ForEach",
  "dependsOn": [{ "activity": "GetTableList", "dependencyConditions": ["Succeeded"] }],
  "typeProperties": {
    "isSequential": false,
    "batchCount":   5,
    "items": {
      "value": "@activity('GetTableList').output.value",
      "type":  "Expression"
    },
    "activities": [
      {
        "name": "CopyTable",
        "type": "Copy",
        "typeProperties": {
          "source": {
            "sqlReaderQuery": "@concat('SELECT * FROM dbo.', item().table_name)"
          }
        }
      }
    ]
  }
}
```

---

## Global Parameters

Global parameters are pipeline-level named values accessible across all activities via `@pipeline().parameters.<name>`.

### Define Global Parameters

```json
{
  "parameters": {
    "workspace_id":    { "type": "String",  "defaultValue": "<workspace-guid>" },
    "lakehouse_id":    { "type": "String",  "defaultValue": "<lakehouse-guid>" },
    "run_date":        { "type": "String",  "defaultValue": "" },
    "environment":     { "type": "String",  "defaultValue": "prod" },
    "batch_size":      { "type": "Int",     "defaultValue": 10000 },
    "enable_debug":    { "type": "Bool",    "defaultValue": false },
    "source_tables":   { "type": "Array",   "defaultValue": ["orders", "customers", "products"] }
  }
}
```

### Use Parameters in Expressions

```json
// In a Copy activity source query
"sqlReaderQuery": "@concat('SELECT TOP ', string(pipeline().parameters.batch_size), ' * FROM dbo.', pipeline().parameters.source_table, ' WHERE env = ''', pipeline().parameters.environment, '''')"

// In a Notebook activity parameter
"parameters": {
  "run_date":    "@pipeline().parameters.run_date",
  "environment": "@pipeline().parameters.environment"
}

// In a WebActivity URL
"url": "@concat('https://hooks.example.com/notify?env=', pipeline().parameters.environment)"
```

---

## Execute Pipeline Activity (Child Pipelines)

Break large orchestrations into parent + child pipelines for modularity.

```json
{
  "name": "RunChildPipeline",
  "type": "ExecutePipeline",
  "typeProperties": {
    "pipeline": {
      "referenceName": "child-etl-pipeline",
      "type":          "PipelineReference"
    },
    "parameters": {
      "run_date":    "@pipeline().parameters.run_date",
      "table_name":  "@item()"
    },
    "waitOnCompletion": true
  }
}
```

**`waitOnCompletion = true`**: Parent waits for child before continuing (synchronous).
**`waitOnCompletion = false`**: Parent fires and continues without waiting (async fan-out).

---

## Expression Language Quick Reference

| Expression | Output | Notes |
|-----------|--------|-------|
| `@utcNow()` | Current UTC datetime string | ISO 8601 format |
| `@formatDateTime(utcNow(), 'yyyy-MM-dd')` | Today's date | Format as needed |
| `@formatDateTime(addDays(utcNow(), -1), 'yyyy-MM-dd')` | Yesterday's date | Use `addDays` for offset |
| `@pipeline().parameters.run_date` | Pipeline parameter value | String type |
| `@trigger().scheduledTime` | Scheduled trigger time | Only valid in triggered runs |
| `@activity('name').output.firstRow.column` | Lookup activity result | Access nested output |
| `@concat('a', 'b', 'c')` | `'abc'` | String concatenation |
| `@string(1234)` | `'1234'` | Convert int to string |
| `@int('1234')` | `1234` | Convert string to int |
| `@bool('true')` | `true` | Convert string to bool |
| `@split('a,b,c', ',')` | `['a', 'b', 'c']` | Split string to array |
| `@join(array, ',')` | `'a,b,c'` | Join array to string |
| `@length(array)` | Integer | Array length |
| `@empty(array)` | Boolean | True if array is empty |
| `@if(condition, trueValue, falseValue)` | Conditional | Ternary-style |
| `@equals(a, b)` | Boolean | Equality check |
| `@greater(a, b)` | Boolean | Numeric comparison |
| `@contains(collection, value)` | Boolean | Array/string contains |

---

## Error Codes Table

| Error | Meaning | Remediation |
|-------|---------|-------------|
| `ActivityFailed: ForEach item evaluation error` | Expression in `items` returned wrong type | Ensure items expression returns an array |
| `IfCondition: Expression must return Boolean` | If condition expression is non-Boolean | Wrap in `@equals()` or `@bool()` |
| `Activity 'X' has no output property 'Y'` | Referencing non-existent activity output field | Check activity output schema; use correct property path |
| `ExecutePipeline: Pipeline not found` | Child pipeline name or ID is wrong | Verify pipeline reference name matches exactly |
| `Until: Timeout exceeded` | Until loop ran longer than timeout | Increase timeout; add fallback activities; check loop termination condition |
| `SetVariable: Variable not declared` | Using a variable not declared in pipeline variables | Add the variable under pipeline Variables section |
| `Trigger failed: Schedule overlap` | Previous run still active when next trigger fires | Increase trigger interval; add concurrency check |

---

## Throttling / Limits Table

| Resource | Limit | Notes |
|----------|-------|-------|
| Max activities per pipeline | 40 | Use child pipelines for complex orchestrations |
| ForEach batchCount max | 50 | Test with low values first on shared capacity |
| Until loop max timeout | 7 days | Use `PT1H` format for short-lived waits |
| ExecutePipeline nesting depth | 3 levels | Avoid deep nesting; prefer flat orchestration |
| Pipeline parameter count | 100 | Use JSON string parameter to bundle many values |
| Variable count per pipeline | 100 | Use object type variables for complex state |
| Concurrent pipeline runs per workspace | 25 | Queued when limit reached |
| Trigger max concurrent runs | 1 (default) | Set `concurrency > 1` for parallel batch processing |
