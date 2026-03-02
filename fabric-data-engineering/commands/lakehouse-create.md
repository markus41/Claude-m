---
name: lakehouse-create
description: "Create a Fabric lakehouse with medallion folder structure and SQL analytics endpoint"
argument-hint: "<lakehouse-name> --workspace <workspace-name> [--layer <bronze|silver|gold>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Create a Fabric Lakehouse

Create a new lakehouse in a Fabric workspace with proper folder structure and naming conventions.

## Instructions

### 1. Validate Inputs

- `<lakehouse-name>` -- Name for the lakehouse (e.g., `lh_bronze_sales`). Ask if not provided.
- `--workspace` -- Target Fabric workspace. Ask if not provided.
- `--layer` -- Medallion layer: `bronze`, `silver`, or `gold`. Determines folder structure and naming prefix. Ask if not provided.

### 2. Apply Naming Convention

Prefix the lakehouse name with the layer if not already present:
| Layer | Prefix | Example |
|-------|--------|---------|
| bronze | `lh_bronze_` | `lh_bronze_sales` |
| silver | `lh_silver_` | `lh_silver_sales` |
| gold | `lh_gold_` | `lh_gold_sales` |

### 3. Create the Lakehouse via REST API

```bash
# Get workspace ID
WORKSPACE_ID=$(curl -s "https://api.fabric.microsoft.com/v1/workspaces" \
  -H "Authorization: Bearer $TOKEN" | python -c "
import json, sys
data = json.load(sys.stdin)
for ws in data['value']:
    if ws['displayName'] == '<workspace-name>':
        print(ws['id']); break
")

# Create lakehouse
curl -X POST "https://api.fabric.microsoft.com/v1/workspaces/$WORKSPACE_ID/lakehouses" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"displayName": "<lakehouse-name>"}'
```

### 4. Create Folder Structure

After the lakehouse is created, set up the standard folder structure under `Files/`:

**Bronze layer**:
```
Files/
  landing/           # Raw files as received (CSV, JSON, Parquet)
  archive/           # Processed files moved here after ingestion
  _errors/           # Files that failed ingestion
```

**Silver layer**:
```
Files/
  staging/           # Intermediate transformation outputs
  _checkpoints/      # Structured streaming checkpoint directories
```

**Gold layer**:
```
Files/
  exports/           # Scheduled data exports (CSV, Excel)
  _metadata/         # Data quality reports, lineage docs
```

Create folders via OneLake ADLS Gen2 endpoint:
```bash
ONELAKE_PATH="abfss://<workspace-name>@onelake.dfs.fabric.microsoft.com/<lakehouse-name>.Lakehouse"

# Create folders using Azure CLI
az storage fs directory create --file-system "<workspace-name>" \
  --name "<lakehouse-name>.Lakehouse/Files/landing" \
  --account-name onelake --auth-mode login
```

### 5. Configure Table Maintenance Defaults

Provide a maintenance notebook template that should be scheduled weekly:

```sql
-- Run OPTIMIZE on all tables in the lakehouse
OPTIMIZE <table_name>;

-- Run VACUUM with default 7-day retention
VACUUM <table_name>;

-- Add Z-ORDER for frequently filtered columns
OPTIMIZE <table_name> ZORDER BY (date_key, region);
```

### 6. Display Summary

Show the user:
- Lakehouse name and workspace
- OneLake path: `abfss://<workspace>@onelake.dfs.fabric.microsoft.com/<lakehouse>.Lakehouse`
- SQL analytics endpoint connection string (auto-generated, found in lakehouse settings)
- Created folder structure
- Next steps: load data with `/lakehouse-load-data`, create notebooks with `/notebook-create`
