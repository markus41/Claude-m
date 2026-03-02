---
name: pipeline-create
description: "Create a new Fabric Data Factory pipeline with activities, parameters, and dependencies"
argument-hint: "<pipeline-name> [--type <copy|orchestration|incremental>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Create a Fabric Data Factory Pipeline

Generate a new Data Factory pipeline definition with configured activities.

## Instructions

### 1. Validate Inputs

- `<pipeline-name>` — Name for the pipeline (e.g., `IngestCustomerData`, `DailyETL`). Ask if not provided.
- `--type` — Pipeline template type. One of:
  - `copy` — Single Copy activity from source to sink (default)
  - `orchestration` — Master pipeline calling child pipelines with error handling
  - `incremental` — Incremental load with watermark pattern (Lookup + Copy + Update)

Ask the user which type if not specified.

### 2. Gather Configuration

**For `copy` type**:
- Source type and connection details (e.g., Azure SQL, Blob, REST API, SFTP)
- Sink type (lakehouse, warehouse, Azure SQL)
- Whether to use column mapping or auto-map
- Fault tolerance settings (skip incompatible rows?)

**For `orchestration` type**:
- Number of child pipelines and their names
- Execution order (sequential or parallel via ForEach)
- Error handling strategy (fail fast, continue on error, notify on failure)

**For `incremental` type**:
- Source table and watermark column (e.g., `ModifiedDate`, `RowVersion`)
- Where to store the watermark (lakehouse table, pipeline variable)
- Sink destination

### 3. Generate Pipeline JSON

Create the pipeline definition following the Fabric Data Factory JSON schema:

```json
{
  "name": "<pipeline-name>",
  "properties": {
    "activities": [],
    "parameters": {},
    "variables": {},
    "annotations": []
  }
}
```

**For `copy` type** — Generate:
- A single Copy activity with configured source, sink, and optional column mapping
- Parameters for connection-specific values (server name, database, file path)

**For `orchestration` type** — Generate:
- An Execute Pipeline activity for each child pipeline
- Dependencies between activities (sequential) or a ForEach wrapper (parallel)
- An If Condition activity on failure paths to send notifications or log errors
- A Set Variable activity to track overall status

**For `incremental` type** — Generate:
- A Lookup activity to read the current watermark value
- A Copy activity with a filter using the watermark (e.g., `WHERE ModifiedDate > @{activity('GetWatermark').output.firstRow.watermark}`)
- A Stored Procedure or Copy activity to update the watermark after successful copy

### 4. Save the Pipeline

Write the pipeline JSON to `pipelines/<pipeline-name>.json`.

### 5. Deploy (Optional)

If the user wants to deploy immediately:

```bash
az rest --method POST \
  --url "https://api.fabric.microsoft.com/v1/workspaces/${FABRIC_WORKSPACE_ID}/items" \
  --headers "Content-Type=application/json" \
  --body '{"displayName": "<pipeline-name>", "type": "DataPipeline", "definition": {...}}'
```

### 6. Display Summary

Show the user:
- Created pipeline file and its structure
- Activity chain and dependency flow
- Parameters that need to be configured
- Next steps: configure connections, test with `/pipeline-monitor`, schedule with `/pipeline-schedule`
