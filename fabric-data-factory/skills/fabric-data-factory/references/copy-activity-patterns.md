# Copy Activity Patterns

## Overview

The Copy activity in Fabric Data Pipelines moves data between sources and sinks with high throughput. It supports 70+ connectors, binary and structured copy modes, schema/type mapping, parallel copy degrees, staging for large datasets, and compression. This reference covers the source/sink connector matrix, copy modes, schema mapping, data type mapping, parallel copy configuration, staging, and compression options.

---

## Source / Sink Connector Matrix

| Connector | Source | Sink | Auth Methods | Notes |
|-----------|--------|------|-------------|-------|
| Azure Data Lake Storage Gen2 | Yes | Yes | SAS, Service Principal, Managed Identity | Primary Fabric storage |
| OneLake / Fabric Lakehouse | Yes | Yes | Workspace Identity, Entra ID | Native Fabric connector |
| Fabric Warehouse | Yes | Yes | Entra ID | SQL endpoint |
| Azure Blob Storage | Yes | Yes | SAS, Account Key, Managed Identity | Legacy; prefer ADLS Gen2 |
| Azure SQL Database | Yes | Yes | SQL Auth, Entra ID, Managed Identity | Fully supported |
| Azure SQL Managed Instance | Yes | Yes | SQL Auth, Entra ID | Requires self-hosted IR |
| SQL Server (on-prem) | Yes | Yes | SQL Auth, Windows Auth | Requires on-prem IR |
| PostgreSQL | Yes | Yes | Password | Via Gateway for on-prem |
| MySQL / MariaDB | Yes | Yes | Password | Via Gateway for on-prem |
| Oracle | Yes | Yes | Password | Requires IR |
| SAP HANA | Yes | No | Password | Via IR |
| Salesforce | Yes | Yes | OAuth2 | Rate limits apply |
| SharePoint Online | Yes | No | Service Principal | List data only |
| REST API (HTTP) | Yes | No | Anonymous, Basic, OAuth2, API Key | Paginated REST supported |
| OData | Yes | No | Anonymous, Basic | |
| SFTP | Yes | Yes | Password, SSH Key | Requires IR or Gateway |
| Amazon S3 | Yes | Yes | IAM Access Key, IAM Role | Read from shortcuts preferred |
| Google Cloud Storage | Yes | No | Service Account | |
| Snowflake | Yes | Yes | Password, Key Pair | Staging recommended |
| Databricks | Yes | No | PAT | |
| Parquet files | Yes | Yes | N/A (storage credential) | Format, not connector |
| Delta format | Yes | Yes | N/A | Preview in some regions |
| CSV / JSON / Avro / ORC | Yes | Yes | N/A | Format options |

---

## Binary Copy vs Structured Copy

### Binary Copy (File-to-File)

Binary copy moves files without schema parsing — fastest for file migration.

```json
{
  "name": "BinaryCopyToLanding",
  "type": "Copy",
  "typeProperties": {
    "source": {
      "type": "BinarySource",
      "storeSettings": {
        "type":         "AzureBlobFSReadSettings",
        "recursive":    true,
        "wildcardFolderPath": "raw/orders/2025/03",
        "wildcardFileName":   "*.parquet"
      }
    },
    "sink": {
      "type": "BinarySink",
      "storeSettings": {
        "type":     "LakehouseWriteSettings",
        "copyBehavior": "PreserveHierarchy"
      }
    },
    "skipErrorFile": {
      "fileMissing": true
    }
  }
}
```

`copyBehavior` options:
- `PreserveHierarchy` — maintain folder structure from source
- `FlattenHierarchy` — all files into target folder, rename on conflict
- `MergeFiles` — merge all source files into one target file

### Structured Copy (Schema-Aware)

Structured copy parses source data, maps columns, and writes with schema awareness.

```json
{
  "name": "StructuredCopyToWarehouse",
  "type": "Copy",
  "typeProperties": {
    "source": {
      "type": "AzureSqlSource",
      "sqlReaderQuery": "SELECT * FROM dbo.Orders WHERE modified_date >= '@{formatDateTime(pipeline().TriggerTime, 'yyyy-MM-dd')}'"
    },
    "sink": {
      "type":              "WarehouseSink",
      "tableOption":       "autoCreate",
      "writeBehavior":     "Insert"
    },
    "translator": {
      "type":            "TabularTranslator",
      "mappings": [
        { "source": { "name": "OrderID",   "type": "String"  }, "sink": { "name": "order_id",    "type": "String"  } },
        { "source": { "name": "OrderDate", "type": "DateTime" }, "sink": { "name": "order_date",  "type": "DateTime" } },
        { "source": { "name": "Amount",    "type": "Decimal" }, "sink": { "name": "total_amount", "type": "Decimal" } }
      ]
    }
  }
}
```

---

## Schema Mapping

Schema mapping controls column name and type translation between source and sink.

### Automatic Mapping (name-based)

By default, Copy activity maps columns with identical names. Name mismatches cause columns to be skipped unless explicit mapping is defined.

```json
"translator": {
  "type": "TabularTranslator",
  "typeConversion": true,
  "typeConversionSettings": {
    "allowDataTruncation":   true,
    "treatBooleanAsNumber":  false,
    "dateTimeFormat":        "yyyy-MM-dd HH:mm:ss.fff",
    "dateTimeOffsetFormat":  "yyyy-MM-dd HH:mm:ss.fff zzz",
    "timeSpanFormat":        "d.HH:mm:ss.fffffff",
    "culture":               "en-us"
  }
}
```

### Explicit Column Mapping

```json
"translator": {
  "type": "TabularTranslator",
  "mappings": [
    { "source": { "name": "customer_id",    "type": "String"   }, "sink": { "name": "CustomerID",   "type": "String"   } },
    { "source": { "name": "order_total",    "type": "Double"   }, "sink": { "name": "TotalAmount",   "type": "Decimal"  } },
    { "source": { "name": "order_date_str", "type": "String"   }, "sink": { "name": "OrderDate",     "type": "DateTime" } },
    { "source": { "name": "is_active",      "type": "Boolean"  }, "sink": { "name": "IsActive",      "type": "Int16"    } }
  ]
}
```

### JSON/Hierarchical Source Flattening

```json
"translator": {
  "type": "TabularTranslator",
  "mappings": [
    { "source": { "path": "$['order_id']"              }, "sink": { "name": "order_id"       } },
    { "source": { "path": "$['customer']['id']"        }, "sink": { "name": "customer_id"    } },
    { "source": { "path": "$['customer']['name']"      }, "sink": { "name": "customer_name"  } },
    { "source": { "path": "$['items'][0]['sku']"       }, "sink": { "name": "first_item_sku" } },
    { "source": { "path": "$['metadata']['region']"   }, "sink": { "name": "region"         } }
  ],
  "collectionReference": "$['orders']"
}
```

---

## Data Type Mapping

### SQL Server / Azure SQL → Fabric Warehouse

| Source Type | Fabric Warehouse Type | Notes |
|------------|----------------------|-------|
| `INT` | `INT` | Direct mapping |
| `BIGINT` | `BIGINT` | Direct mapping |
| `DECIMAL(p,s)` | `DECIMAL(p,s)` | Use explicit mapping to preserve precision |
| `FLOAT` / `REAL` | `FLOAT` / `REAL` | May lose precision vs DECIMAL |
| `NVARCHAR(n)` | `NVARCHAR(n)` | Direct mapping |
| `DATETIME` | `DATETIME2(7)` | Upcast; DATETIME not supported in Fabric DW |
| `DATETIME2` | `DATETIME2(n)` | Direct mapping |
| `DATE` | `DATE` | Direct mapping |
| `BIT` | `BIT` | Direct mapping |
| `UNIQUEIDENTIFIER` | `UNIQUEIDENTIFIER` | Direct mapping |
| `XML` | `NVARCHAR(MAX)` | XML type not supported in Fabric DW |
| `GEOMETRY` / `GEOGRAPHY` | Not supported | Convert to WKT string first |

### Parquet → Fabric Warehouse

| Parquet Type | Fabric Warehouse Type | Notes |
|-------------|----------------------|-------|
| `INT32` | `INT` | |
| `INT64` | `BIGINT` | |
| `FLOAT` | `REAL` | |
| `DOUBLE` | `FLOAT` | |
| `BYTE_ARRAY` (UTF8) | `NVARCHAR(MAX)` or `VARCHAR(n)` | |
| `FIXED_LEN_BYTE_ARRAY` | `BINARY(n)` | |
| `INT96` (timestamp) | `DATETIME2(7)` | Legacy Parquet timestamp format |
| `DATE` (logical) | `DATE` | |
| `DECIMAL(p,s)` (logical) | `DECIMAL(p,s)` | Preserve precision in mapping |
| `BOOLEAN` | `BIT` | |

---

## Parallel Copy Degree

Parallel copy uses multiple threads to read from source and write to sink simultaneously.

```json
{
  "name": "HighThroughputCopy",
  "type": "Copy",
  "typeProperties": {
    "source": {
      "type":                   "ParquetSource",
      "storeSettings": {
        "type":                 "AzureBlobFSReadSettings",
        "recursive":            true
      }
    },
    "sink": {
      "type":                   "LakehouseTableSink",
      "tableActionOption":      "Append"
    },
    "parallelCopies":           8,
    "dataIntegrationUnits":     8,
    "enableStaging":            false
  }
}
```

### parallelCopies vs dataIntegrationUnits

| Setting | Purpose | Range |
|---------|---------|-------|
| `parallelCopies` | Number of reader/writer threads per DIU | 1–512 |
| `dataIntegrationUnits` | Compute units allocated to the copy | 2–256 (multiples of 2) |

**Recommendation**: For large Parquet copies, set `parallelCopies = 8–16` and `dataIntegrationUnits = 8`. Monitor capacity metrics — high DIU values consume more Fabric CUs.

---

## Staging for Large Datasets

For large copies between incompatible connectors (e.g., on-prem SQL → Fabric Warehouse), use ADLS Gen2 staging to avoid single-threaded inserts.

```json
{
  "name": "StagedCopyToWarehouse",
  "type": "Copy",
  "typeProperties": {
    "source": {
      "type":            "SqlServerSource",
      "sqlReaderQuery":  "SELECT * FROM dbo.HistoricalOrders"
    },
    "sink": {
      "type":            "WarehouseSink",
      "writeBehavior":   "Insert"
    },
    "enableStaging": true,
    "stagingSettings": {
      "linkedServiceName": {
        "referenceName": "ls_staging_adls",
        "type":          "LinkedServiceReference"
      },
      "path":           "staging/copy-temp/",
      "enableCompression": true
    },
    "parallelCopies": 4,
    "dataIntegrationUnits": 8
  }
}
```

**When to use staging**:
- Source → sink requires type conversion not natively supported
- Source is on-premises and sink is Fabric (avoid large single-threaded ODBC writes)
- Sink is Fabric Warehouse and data volume > 1 GB (staging enables bulk load path)
- Network latency is high between source IR and sink (stage locally first)

---

## Compression

```json
{
  "source": {
    "type": "DelimitedTextSource",
    "formatSettings": {
      "type":             "DelimitedTextReadSettings"
    },
    "storeSettings": {
      "type":             "AzureBlobFSReadSettings"
    }
  },
  "sink": {
    "type": "ParquetSink",
    "formatSettings": {
      "type":               "ParquetWriteSettings",
      "compressionCodec":   "snappy"
    }
  }
}
```

### Supported Compression Codecs

| Format | Supported Compression | Recommended |
|--------|----------------------|-------------|
| Parquet | `snappy`, `gzip`, `lz4`, `brotli`, `zstd` | `snappy` (fast) or `zstd` (small) |
| CSV / TSV | `gzip`, `bzip2`, `deflate`, `none` | `gzip` for archival |
| Avro | `deflate`, `snappy`, `null` | `snappy` |
| ORC | `zlib`, `snappy`, `none` | `snappy` |
| Binary | N/A (preserves original) | — |

---

## Error Codes Table

| Error | Meaning | Remediation |
|-------|---------|-------------|
| `ErrorCode=UserErrorInvalidDataset` | Dataset references a missing connection or item | Verify workspace/item IDs; re-create connection |
| `ErrorCode=TypeMismatch` | Source column type cannot be cast to sink type | Add explicit column mapping with type cast |
| `ErrorCode=DataConsistencyCheckFailed` | Row count mismatch between source and sink | Enable fault tolerance with `enableSkipIncompatibleRow`; investigate source |
| `ErrorCode=FailedToConnect` | Cannot reach source connector | Verify credentials; check firewall/network for on-prem sources |
| `ErrorCode=CopyActivityInvalidSchemaMapping` | Mapped source column not found in source | Update column mapping to match actual source schema |
| `Staging: Access denied on staging path` | SAS/Managed Identity lacks write access to staging path | Grant Storage Blob Data Contributor on staging ADLS account |
| `ParallelCopy: Exceeded capacity limits` | Too many parallel copies consuming all capacity CUs | Reduce `parallelCopies` and `dataIntegrationUnits` |
| `ErrorCode=SqlFailedToConnect` | SQL connector auth failure | Verify Entra ID / SQL auth; check firewall rules for Azure SQL |
| `ErrorCode=FileNotFound` | Source file path is wrong or file deleted | Verify path; enable `skipErrorFile.fileMissing = true` for optional files |
| HTTP 429 on Pipeline trigger API | Rate limit exceeded | Implement exponential backoff |

---

## Throttling / Limits Table

| Resource | Limit | Notes |
|----------|-------|-------|
| `parallelCopies` max | 512 | Practical max depends on source connector concurrency |
| `dataIntegrationUnits` max | 256 | High DIU = high CU cost; use minimum needed |
| Single file size in binary copy | No hard limit | Very large files (> 100 GB) may require `chunkSize` option |
| REST source pagination | Max 1,000 pages per run | Use date-range parameters to limit page count |
| Copy activity timeout per activity | Up to 7 days | Default is `0.12:00:00` (12 hours) |
| Concurrent pipeline runs | 25 per workspace | Includes all pipeline run types |
| Staging path TTL | Manual cleanup required | Staging files are NOT auto-deleted; clean up after copy |
| Column mapping count | 1,000 columns | More than 1,000 requires chunked copy activities |
