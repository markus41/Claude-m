---
name: warehouse-create
description: "Create a new Fabric Data Warehouse with schemas and initial configuration"
argument-hint: "<warehouse-name> [--workspace <workspace-id>] [--schemas <comma-separated>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Create a Fabric Data Warehouse

Provision a new warehouse in a Fabric workspace and set up the foundational schema structure.

## Instructions

### 1. Validate Inputs

- `<warehouse-name>` — Name for the warehouse (letters, numbers, underscores, hyphens, max 256 chars). Ask if not provided.
- `--workspace` — Fabric workspace ID. Ask if not provided or read from `.env` (`FABRIC_WORKSPACE_ID`).
- `--schemas` — Comma-separated list of schemas to create. Default: `staging,dim,fact,rpt`.

### 2. Create the Warehouse via REST API

```bash
# Get an access token
TOKEN=$(az account get-access-token --resource https://api.fabric.microsoft.com --query accessToken -o tsv)

# Create the warehouse
curl -X POST "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/items" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "<warehouse-name>",
    "type": "Warehouse",
    "description": "Created by fabric-data-warehouse plugin"
  }'
```

If the REST API is not available, guide the user to create via the Fabric portal:
1. Open the workspace in the Fabric portal.
2. Click **+ New** > **Warehouse**.
3. Enter the warehouse name and confirm.

### 3. Create Schemas

Generate and execute a SQL script to create the requested schemas:

```sql
CREATE SCHEMA staging;
CREATE SCHEMA dim;
CREATE SCHEMA fact;
CREATE SCHEMA rpt;
```

### 4. Create Utility Tables

Set up standard utility tables for ETL operations:

```sql
-- Load logging table
CREATE TABLE staging.LoadLog (
    LoadLogID         BIGINT          NOT NULL,
    ProcedureName     NVARCHAR(256)   NOT NULL,
    StartDate         DATE            NULL,
    EndDate           DATE            NULL,
    Status            NVARCHAR(20)    NOT NULL DEFAULT 'RUNNING',
    RowsAffected      INT             NULL,
    ErrorMessage      NVARCHAR(4000)  NULL,
    LoadTimestamp     DATETIME2(0)    NOT NULL DEFAULT GETDATE()
);

-- Watermark table for incremental loads
CREATE TABLE staging.Watermark (
    TableName         NVARCHAR(128)   NOT NULL,
    LastLoadTimestamp  DATETIME2(0)   NOT NULL DEFAULT '1900-01-01',
    LastLoadRowCount  INT             NOT NULL DEFAULT 0,
    UpdatedDate       DATETIME2(0)   NOT NULL DEFAULT GETDATE()
);
```

### 5. Generate SQL Files

Write the schema creation scripts to the project directory:

- `schemas/create_schemas.sql` — All CREATE SCHEMA statements
- `tables/staging/LoadLog.sql` — Load logging table
- `tables/staging/Watermark.sql` — Watermark table

### 6. Display Summary

Show the user:
- Warehouse name and workspace
- SQL connection endpoint
- Created schemas and utility tables
- Next steps: create dimension/fact tables (`/warehouse-table-create`), load data (`/warehouse-load`)
