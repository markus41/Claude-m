---
name: eventhouse-create
description: "Create an Eventhouse with KQL database, table schema, ingestion mappings, and policies"
argument-hint: "<eventhouse-name> --database <db-name> [--table <table-name>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Create an Eventhouse with KQL Database

Create a new Fabric Eventhouse, configure a KQL database with table schema, ingestion mappings, and retention/caching policies.

## Instructions

### 1. Validate Inputs

- `<eventhouse-name>` — Name for the Eventhouse item. Ask if not provided.
- `--database` — Name for the KQL database (defaults to the Eventhouse name). Ask if not provided.
- `--table` — Optional table name to create immediately. If not provided, ask the user what data they plan to ingest.

### 2. Gather Schema Information

Ask the user to describe the data they want to ingest:
- What fields/columns does the data have?
- What are the data types? (datetime, string, real, long, int, dynamic, bool)
- Which column is the timestamp?
- What is the expected data format? (JSON, CSV)
- What is the expected data volume? (events/second, GB/day)

### 3. Create the Eventhouse via REST API

Generate and execute the Fabric REST API call:

```bash
az rest --method POST \
  --url "https://api.fabric.microsoft.com/v1/workspaces/${FABRIC_WORKSPACE_ID}/items" \
  --headers "Content-Type=application/json" \
  --body '{
    "type": "Eventhouse",
    "displayName": "<eventhouse-name>",
    "description": "<user-provided description>"
  }'
```

Note the returned item ID for the next step.

### 4. Create the KQL Database (if separate from default)

If the user wants a database with a different name than the Eventhouse default:

```bash
az rest --method POST \
  --url "https://api.fabric.microsoft.com/v1/workspaces/${FABRIC_WORKSPACE_ID}/items" \
  --headers "Content-Type=application/json" \
  --body '{
    "type": "KQLDatabase",
    "displayName": "<database-name>",
    "description": "<description>"
  }'
```

### 5. Generate KQL Schema Commands

Based on the gathered schema, produce `.create table` and `.create ingestion mapping` commands:

```kql
.create table <TableName> (
    <Column1>: <type>,
    <Column2>: <type>,
    ...
)

.create table <TableName> ingestion json mapping '<MappingName>'
'[
  {"column":"<Column1>", "path":"$.<jsonField1>", "datatype":"<type>"},
  {"column":"<Column2>", "path":"$.<jsonField2>", "datatype":"<type>"}
]'
```

### 6. Configure Policies

Based on the expected data volume and query patterns, set retention and caching:

```kql
// Retention: how long to keep data (default recommendation based on volume)
.alter table <TableName> policy retention '{"SoftDeletePeriod":"<days>.00:00:00","Recoverability":"Enabled"}'

// Hot cache: keep recent data in fast SSD cache
.alter table <TableName> policy caching hot = <days>d

// Batching policy (if low-latency ingestion is needed)
.alter table <TableName> policy ingestionbatching '{"MaximumBatchingTimeSpan":"00:00:30","MaximumNumberOfItems":500,"MaximumRawDataSizeMB":100}'
```

**Policy recommendations by volume**:
| Daily volume | Retention | Hot cache | Batching time |
|-------------|-----------|-----------|---------------|
| < 1 GB/day | 365 days | 30 days | Default (5 min) |
| 1-10 GB/day | 180 days | 14 days | 1 minute |
| 10-100 GB/day | 90 days | 7 days | 30 seconds |
| > 100 GB/day | 30 days | 3 days | 10 seconds |

### 7. Display Summary

Show the user:
- Created Eventhouse and KQL database names and IDs
- Table schema (columns and types)
- Ingestion mapping name and format
- Retention and caching policies
- Next steps: create an Eventstream (`/eventstream-create`) or run queries (`/kql-query`)
- The Eventhouse query URI for SDK access
