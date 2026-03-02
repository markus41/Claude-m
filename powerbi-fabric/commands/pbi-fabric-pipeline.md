---
name: pbi-fabric-pipeline
description: Scaffold a Fabric Data Pipeline JSON definition with Copy and Notebook activities
argument-hint: "<pipeline-name> [--source lakehouse|warehouse|external]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - AskUserQuestion
---

# Scaffold Fabric Data Pipeline

Generate a Fabric Data Pipeline JSON definition with orchestration activities.

## Step 1: Gather Requirements

Ask the user for:
1. Pipeline name
2. Source type: Lakehouse, Warehouse, or external (ADLS, SQL, REST API)
3. Destination Lakehouse name
4. Activities needed: Copy Data, Notebook, Dataflow Gen2, ForEach, If Condition

## Step 2: Generate Pipeline JSON

Build the pipeline definition based on the selected activities.

### Copy + Notebook Pattern (Bronze → Silver)

```json
{
  "name": "<pipeline-name>",
  "properties": {
    "activities": [
      {
        "name": "Copy Raw Data to Bronze",
        "type": "Copy",
        "dependsOn": [],
        "policy": {
          "timeout": "0.01:00:00",
          "retry": 2,
          "retryIntervalInSeconds": 30
        },
        "typeProperties": {
          "source": {
            "type": "DelimitedTextSource",
            "storeSettings": {
              "type": "AzureBlobFSReadSettings",
              "recursive": true
            }
          },
          "sink": {
            "type": "LakehouseTableSink",
            "tableActionOption": "Append"
          }
        },
        "inputs": [
          {
            "referenceName": "SourceDataset",
            "type": "DatasetReference"
          }
        ],
        "outputs": [
          {
            "referenceName": "BronzeLakehouse",
            "type": "DatasetReference"
          }
        ]
      },
      {
        "name": "Transform Bronze to Silver",
        "type": "NotebookActivity",
        "dependsOn": [
          {
            "activity": "Copy Raw Data to Bronze",
            "dependencyConditions": ["Succeeded"]
          }
        ],
        "policy": {
          "timeout": "0.02:00:00",
          "retry": 1
        },
        "typeProperties": {
          "notebookId": "<notebook-id>",
          "parameters": {
            "source_table": {
              "value": "bronze_sales",
              "type": "string"
            },
            "target_table": {
              "value": "silver_sales",
              "type": "string"
            }
          }
        }
      },
      {
        "name": "Aggregate Silver to Gold",
        "type": "NotebookActivity",
        "dependsOn": [
          {
            "activity": "Transform Bronze to Silver",
            "dependencyConditions": ["Succeeded"]
          }
        ],
        "typeProperties": {
          "notebookId": "<gold-notebook-id>",
          "parameters": {
            "source_table": {
              "value": "silver_sales",
              "type": "string"
            },
            "target_table": {
              "value": "gold_sales_summary",
              "type": "string"
            }
          }
        }
      }
    ],
    "parameters": {
      "RunDate": {
        "type": "string",
        "defaultValue": "@utcNow('yyyy-MM-dd')"
      }
    }
  }
}
```

### ForEach Pattern (Process Multiple Tables)

```json
{
  "name": "ForEach Table",
  "type": "ForEach",
  "typeProperties": {
    "isSequential": false,
    "batchCount": 4,
    "items": {
      "value": "@pipeline().parameters.TableList",
      "type": "Expression"
    },
    "activities": [
      {
        "name": "Copy Table",
        "type": "Copy",
        "typeProperties": {
          "source": {
            "type": "SqlServerSource",
            "sqlReaderQuery": "SELECT * FROM @{item().SchemaName}.@{item().TableName}"
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

## Step 3: Create Pipeline via Fabric REST API

```
POST https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}/dataPipelines
{
  "displayName": "<pipeline-name>",
  "description": "Medallion architecture: Bronze → Silver → Gold"
}
```

## Step 4: Output Summary

Display the pipeline structure, activity chain, parameters, and instructions for triggering:

```
POST https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}/dataPipelines/{pipelineId}/jobs/instances?jobType=Pipeline
```
