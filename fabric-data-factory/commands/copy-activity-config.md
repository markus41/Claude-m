---
name: copy-activity-config
description: "Configure a Copy activity with source, sink, column mapping, and performance settings"
argument-hint: "--source <source-type> --sink <sink-type> [--mapping] [--staging]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Configure a Copy Activity

Generate a fully configured Copy activity JSON for a Fabric Data Factory pipeline.

## Instructions

### 1. Validate Inputs

- `--source` — Source connector type. Ask if not provided. Common types:
  - Database: `AzureSqlDatabase`, `SqlServer`, `Oracle`, `MySQL`, `PostgreSql`, `SapHana`, `SapTable`
  - File: `AzureBlobStorage`, `AzureDataLakeStoreGen2`, `Sftp`, `FileSystem`
  - Service: `RestApi`, `OData`, `SharePointOnline`, `Dynamics365`, `Salesforce`
  - Fabric: `Lakehouse`, `Warehouse`, `KqlDatabase`
- `--sink` — Sink connector type. Ask if not provided. Common types:
  - `Lakehouse`, `Warehouse`, `AzureSqlDatabase`, `AzureBlobStorage`, `AzureDataLakeStoreGen2`
- `--mapping` — Include explicit column mapping (ask user for column pairs).
- `--staging` — Enable staging via Azure Blob for cross-region or on-premises copies.

### 2. Configure Source

Based on the source type, ask for connection-specific properties:

**Database sources**:
- Connection name or reference
- Table name or custom query
- Query timeout
- Isolation level (for SQL sources)

**File sources**:
- Connection name or path
- File format (CSV, Parquet, JSON, Avro, ORC, Excel)
- Delimiter, encoding, header row (for CSV)
- Compression type (gzip, snappy, lz4)
- Wildcard file path (for multiple files)

**REST/OData sources**:
- Base URL and relative URL
- HTTP method (GET, POST)
- Request headers and body
- Pagination rules

### 3. Configure Sink

Based on the sink type, ask for:

**Lakehouse sink**:
- Lakehouse name
- Table name
- Write mode: `Overwrite`, `Append`
- File format for files area (Parquet, CSV, JSON)

**Warehouse sink**:
- Warehouse name
- Schema and table name
- Write behavior: `Insert`, `Upsert` (requires key columns)
- Pre-copy script (e.g., `TRUNCATE TABLE [schema].[table]`)

**Database sinks**:
- Table name
- Write behavior: `Insert`, `Upsert`, `StoredProcedure`
- Pre-copy script
- Batch size and timeout

### 4. Configure Column Mapping (when --mapping)

Ask the user for source-to-sink column mappings:

```json
{
  "translator": {
    "type": "TabularTranslator",
    "mappings": [
      { "source": { "name": "src_col1" }, "sink": { "name": "dest_col1" } },
      { "source": { "name": "src_col2" }, "sink": { "name": "dest_col2", "type": "Int32" } }
    ]
  }
}
```

If no explicit mapping, use auto-mapping (map by column name or ordinal position).

### 5. Configure Performance Settings

Ask about performance requirements:

- **Parallel copies**: Number of parallel threads (default: auto, max: 50). Recommend 4-16 for large datasets.
- **Data Integration Units (DIU)**: Compute power for cloud-to-cloud copies (2-256, default: auto). Higher DIU for larger files.
- **Staging**: Enable for on-premises to cloud or cross-region copies. Requires an Azure Blob staging account.
- **Batch size**: For database sinks (default: 10000).
- **Fault tolerance**: Skip incompatible rows, redirect failed rows to a log path.

### 6. Generate Copy Activity JSON

```json
{
  "name": "CopyFromSourceToSink",
  "type": "Copy",
  "dependsOn": [],
  "policy": {
    "timeout": "01:00:00",
    "retry": 2,
    "retryIntervalInSeconds": 30
  },
  "typeProperties": {
    "source": { ... },
    "sink": { ... },
    "translator": { ... },
    "enableStaging": false,
    "parallelCopies": null,
    "dataIntegrationUnits": null
  }
}
```

### 7. Display Summary

Show the user:
- Generated Copy activity JSON
- Source and sink configuration summary
- Column mapping (if configured)
- Performance settings and recommendations
- How to add this activity to a pipeline: insert into the `activities` array of a pipeline JSON
