---
name: Fabric Data Factory
description: >
  Deep expertise in Microsoft Fabric Data Factory — build data pipelines with Copy, Dataflow Gen2,
  Notebook, and orchestration activities, configure 70+ source/sink connectors, write Power Query M
  transformations, design incremental load and watermark patterns, set up scheduling and triggers,
  monitor pipeline runs, and migrate from Azure Data Factory. Targets data engineers building
  production ETL/ELT workloads in Microsoft Fabric.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - fabric data factory
  - fabric pipeline
  - dataflow gen2
  - copy activity
  - data pipeline
  - fabric etl
  - fabric orchestration
  - pipeline trigger
  - fabric copy
  - data movement
  - fabric connector
  - pipeline expression
---

# Fabric Data Factory

## 1. Data Factory in Fabric Overview

Microsoft Fabric Data Factory is the data integration service within Microsoft Fabric. It provides a unified experience for building ETL (Extract, Transform, Load) and ELT (Extract, Load, Transform) data pipelines at scale.

**Data Factory vs Azure Data Factory (ADF)**:
| Aspect | Fabric Data Factory | Azure Data Factory |
|--------|--------------------|--------------------|
| Compute | Fabric capacity (CU-based) | Integration Runtime (self-hosted or Azure IR) |
| Connections | Centralized workspace connections | Linked services per factory |
| Dataflows | Dataflow Gen2 (Power Query Online) | Mapping Data Flows (Spark) + Wrangling Data Flows |
| Billing | Included in Fabric capacity | Per-activity and per-DIU pricing |
| Governance | Fabric workspace RBAC + domains | Factory-level RBAC |
| Git integration | Fabric Git integration (Azure DevOps, GitHub) | Native Git in ADF Studio |
| Monitoring | Fabric Monitoring Hub | ADF Monitor tab |

**Item types in Fabric Data Factory**:
- **Data Pipeline** — Orchestration of activities (Copy, Dataflow, Notebook, Script, etc.) with dependencies, parameters, and scheduling.
- **Dataflow Gen2** — Visual, low-code data transformation using Power Query Online and the M language. Outputs to lakehouse tables, warehouse, or other destinations.

**Capacity-based compute**:
- All pipeline and dataflow execution consumes Fabric Capacity Units (CUs).
- No need to provision separate integration runtimes.
- Fabric automatically scales compute within the capacity.
- Capacity can be paused to save costs; scheduled pipelines will queue and run when capacity resumes.

**Connector ecosystem**:
- 70+ built-in connectors for databases, files, SaaS services, and cloud platforms.
- Connectors are shared across Fabric workloads (pipelines, dataflows, notebooks).
- On-premises data access via the on-premises data gateway.
- Custom connectors via REST API or OData generic connectors.

**Relationship to other Fabric workloads**:
- **Lakehouse**: Primary destination for pipeline and dataflow output (Delta tables in OneLake).
- **Warehouse**: SQL-based destination for structured data.
- **Notebook**: Spark notebooks can be called as pipeline activities for complex transformations.
- **KQL Database**: Real-time analytics destination for streaming and event data.
- **Semantic Model**: Downstream consumption layer for Power BI reporting.

## 2. Data Pipelines

Data pipelines orchestrate data movement and transformation through a sequence of activities connected by dependencies.

**Pipeline JSON structure**:
```json
{
  "name": "MyPipeline",
  "properties": {
    "activities": [
      {
        "name": "CopyFromSQL",
        "type": "Copy",
        "dependsOn": [],
        "policy": {
          "timeout": "01:00:00",
          "retry": 2,
          "retryIntervalInSeconds": 30
        },
        "typeProperties": {
          "source": { "type": "AzureSqlSource", "sqlReaderQuery": "SELECT * FROM dbo.Customers" },
          "sink": { "type": "LakehouseSink", "tableActionOption": "Overwrite" }
        }
      }
    ],
    "parameters": {
      "sourceTable": { "type": "String", "defaultValue": "dbo.Customers" }
    },
    "variables": {
      "rowCount": { "type": "String", "defaultValue": "0" }
    },
    "annotations": ["production", "daily-load"]
  }
}
```

**Activity types**:
| Activity | Purpose | Key Properties |
|----------|---------|----------------|
| Copy | Move data between source and sink | `source`, `sink`, `translator`, `enableStaging` |
| Dataflow | Run a Dataflow Gen2 refresh | `dataflowReference` |
| Notebook | Execute a Fabric Spark notebook | `notebookReference`, `parameters` |
| Stored Procedure | Run a SQL stored procedure | `storedProcedureName`, `parameters` |
| ForEach | Iterate over a collection | `items`, `isSequential`, `batchCount`, `activities` |
| If Condition | Branch based on expression | `expression`, `ifTrueActivities`, `ifFalseActivities` |
| Until | Loop until condition is true | `expression`, `timeout`, `activities` |
| Switch | Multi-branch based on expression | `on`, `cases`, `defaultActivities` |
| Wait | Pause for a duration | `waitTimeInSeconds` |
| Web | Call an HTTP endpoint | `url`, `method`, `headers`, `body` |
| Set Variable | Set a pipeline variable | `variableName`, `value` |
| Append Variable | Append to an array variable | `variableName`, `value` |
| Lookup | Read a small dataset | `source`, `firstRowOnly` |
| Get Metadata | Read metadata from a connection | `fieldList` (e.g., `itemName`, `lastModified`, `childItems`) |
| Execute Pipeline | Call a child pipeline | `pipelineReference`, `parameters`, `waitOnCompletion` |
| Fail | Explicitly fail the pipeline | `message`, `errorCode` |
| Script | Run a SQL script | `scripts`, `scriptBlockExecutionTimeout` |

**Dependencies and execution order**:

Activities use `dependsOn` to define execution order. Each dependency specifies one of four conditions:

```json
"dependsOn": [
  {
    "activity": "CopyFromSQL",
    "dependencyConditions": ["Succeeded"]
  }
]
```

| Condition | Meaning |
|-----------|---------|
| `Succeeded` | Run only if the upstream activity succeeded |
| `Failed` | Run only if the upstream activity failed |
| `Completed` | Run regardless of upstream success or failure |
| `Skipped` | Run only if the upstream activity was skipped |

Activities with no `dependsOn` run in parallel at the start of the pipeline.

**REST API for pipeline CRUD**:

```bash
# List pipelines in a workspace
GET https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}/items?type=DataPipeline

# Create a pipeline
POST https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}/items
Body: { "displayName": "MyPipeline", "type": "DataPipeline", "definition": { ... } }

# Update a pipeline
PATCH https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}/items/{itemId}
Body: { "displayName": "UpdatedName" }

# Delete a pipeline
DELETE https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}/items/{itemId}

# Run a pipeline on demand
POST https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}/items/{itemId}/jobs/instances?jobType=Pipeline
```

## 3. Copy Activity

The Copy activity moves data between 70+ supported sources and sinks with optional transformations, fault tolerance, and performance tuning.

**Source connectors (selected)**:
| Category | Connectors |
|----------|-----------|
| Azure | Azure SQL Database, Azure Synapse Analytics, Azure Blob Storage, ADLS Gen2, Azure Cosmos DB, Azure Table Storage, Azure Data Explorer |
| Database | SQL Server, Oracle, MySQL, PostgreSQL, IBM DB2, SAP HANA, SAP Table, Teradata, Snowflake |
| File | SFTP, FTP, HTTP, Amazon S3, Google Cloud Storage |
| SaaS | SharePoint Online, Dynamics 365, Salesforce, SAP Cloud for Customer, ServiceNow, Jira, HubSpot |
| API | REST, OData, Web Table |
| Fabric | Lakehouse, Warehouse, KQL Database |

**Sink connectors**:
| Destination | Write Modes |
|-------------|-------------|
| Lakehouse (Delta tables) | Overwrite, Append |
| Lakehouse (Files) | Parquet, CSV, JSON, Avro to OneLake files area |
| Warehouse | Insert, Upsert (with key columns) |
| Azure SQL Database | Insert, Upsert, Stored Procedure |
| Azure Blob / ADLS Gen2 | Parquet, CSV, JSON, Avro, ORC files |
| KQL Database | Append (streaming ingestion) |

**Column mapping**:
```json
"translator": {
  "type": "TabularTranslator",
  "mappings": [
    {
      "source": { "name": "CustomerID", "type": "Int32" },
      "sink": { "name": "customer_id", "type": "Int64" }
    },
    {
      "source": { "name": "FullName" },
      "sink": { "name": "full_name" }
    },
    {
      "source": { "name": "SignupDate", "type": "DateTime" },
      "sink": { "name": "signup_date", "type": "DateTime", "format": "yyyy-MM-dd" }
    }
  ],
  "typeConversion": true,
  "typeConversionSettings": {
    "allowDataTruncation": false,
    "treatBooleanAsNumber": false
  }
}
```

If no explicit mapping is specified, columns are auto-mapped by name (case-insensitive). Unmapped source columns are ignored; unmapped sink columns receive null.

**Fault tolerance**:
```json
"typeProperties": {
  "source": { ... },
  "sink": { ... },
  "enableSkipIncompatibleRow": true,
  "redirectIncompatibleRowSettings": {
    "linkedServiceName": "BlobForLogs",
    "path": "errors/incompatible-rows"
  }
}
```

Incompatible rows (type mismatches, constraint violations) are skipped and logged to the redirect path instead of failing the entire copy.

**Staging**:
```json
"enableStaging": true,
"stagingSettings": {
  "linkedServiceName": "AzureBlobStaging",
  "path": "staging-container"
}
```

Staging is recommended for:
- On-premises to cloud copies (via gateway)
- Cross-region copies for better throughput
- Format conversions (e.g., Parquet to SQL)

**Performance settings**:
| Setting | Description | Default | Recommendation |
|---------|-------------|---------|----------------|
| `parallelCopies` | Number of parallel read/write threads | Auto (up to 32) | 4-16 for large tables |
| `dataIntegrationUnits` | Compute units for cloud copies | Auto (4) | 8-32 for large files |
| `writeBatchSize` | Rows per batch for database sinks | 10,000 | 10K-100K based on row size |
| `writeBatchTimeout` | Max wait time per batch | 00:30:00 | Reduce for latency-sensitive loads |

**Performance tips**:
- Use Parquet format for file destinations — columnar compression gives best throughput.
- Enable staging for copies involving format conversion.
- For large single-file copies, enable block-level parallelism with `enablePartitionDiscovery`.
- Prefer `SELECT column1, column2 FROM table` over `SELECT * FROM table` to reduce data volume.
- When copying to lakehouse, use Delta table Overwrite mode for full loads (avoids small file problem).

## 4. Dataflow Gen2

Dataflow Gen2 provides a visual, low-code data transformation experience powered by Power Query Online and the M language. It is the primary tool for data cleansing, shaping, and lightweight transformations in Fabric.

**Dataflow Gen2 vs Dataflow Gen1**:
| Aspect | Gen2 | Gen1 |
|--------|------|------|
| Engine | Enhanced Power Query Online | Legacy Power Query Online |
| Output | Lakehouse, Warehouse, or other Fabric items | Dataverse, CDS |
| Staging | Lakehouse staging for performance | No staging |
| Scale | Scales with Fabric capacity | Fixed compute |
| Refresh | Pipeline integration, on-demand, or scheduled | Scheduled only |

**M language basics**:

M (Power Query Formula Language) is a functional language with a `let`/`in` structure:

```m
let
    // Each step is a named expression
    Source = Sql.Database("server.database.windows.net", "AdventureWorks"),
    Navigation = Source{[Schema="Sales", Item="Customer"]}[Data],
    FilteredRows = Table.SelectRows(Navigation, each [IsActive] = true),
    SelectedColumns = Table.SelectColumns(FilteredRows, {"CustomerID", "Name", "Email", "Region"}),
    RenamedColumns = Table.RenameColumns(SelectedColumns, {
        {"CustomerID", "customer_id"},
        {"Name", "customer_name"},
        {"Email", "email"},
        {"Region", "region"}
    }),
    ChangedTypes = Table.TransformColumnTypes(RenamedColumns, {
        {"customer_id", Int64.Type},
        {"customer_name", type text},
        {"email", type text},
        {"region", type text}
    })
in
    ChangedTypes
```

**Key M functions by category**:

| Category | Functions |
|----------|----------|
| Row filtering | `Table.SelectRows(table, each [Col] > 10)` |
| Column selection | `Table.SelectColumns(table, {"Col1", "Col2"})` |
| Column removal | `Table.RemoveColumns(table, {"Col3"})` |
| Rename | `Table.RenameColumns(table, {{"Old", "New"}})` |
| Type conversion | `Table.TransformColumnTypes(table, {{"Col", type number}})` |
| Sort | `Table.Sort(table, {{"Col", Order.Ascending}})` |
| Group by | `Table.Group(table, {"Region"}, {{"Total", each List.Sum([Amount]), type number}})` |
| Add column | `Table.AddColumn(table, "NewCol", each [A] + [B], type number)` |
| Conditional column | `Table.AddColumn(table, "Tier", each if [Amount] > 1000 then "High" else "Low")` |
| Replace values | `Table.ReplaceValue(table, null, "Unknown", Replacer.ReplaceValue, {"Col"})` |
| Merge (join) | `Table.NestedJoin(tableA, "Key", tableB, "Key", "Joined", JoinKind.LeftOuter)` then `Table.ExpandTableColumn(...)` |
| Append (union) | `Table.Combine({table1, table2})` |
| Pivot | `Table.Pivot(table, pivotColumn, valueColumn, List.Sum)` |
| Unpivot | `Table.UnpivotOtherColumns(table, {"Key"}, "Attribute", "Value")` |
| Split column | `Table.SplitColumn(table, "Col", Splitter.SplitTextByDelimiter(","))` |
| Index column | `Table.AddIndexColumn(table, "Index", 1, 1, Int64.Type)` |
| Distinct rows | `Table.Distinct(table)` or `Table.Distinct(table, {"Col"})` |
| Null handling | `Table.SelectRows(table, each [Col] <> null)` |
| Custom function | `(param as text) => Table.SelectRows(Source, each [Category] = param)` |

**Merge (join) types**:
| Join Kind | M Value | Description |
|-----------|---------|-------------|
| Inner | `JoinKind.Inner` | Only matching rows from both tables |
| Left outer | `JoinKind.LeftOuter` | All rows from left, matching from right |
| Right outer | `JoinKind.RightOuter` | All rows from right, matching from left |
| Full outer | `JoinKind.FullOuter` | All rows from both tables |
| Left anti | `JoinKind.LeftAnti` | Left rows with no match in right |
| Right anti | `JoinKind.RightAnti` | Right rows with no match in left |

**Staging to lakehouse**:

Dataflow Gen2 can stage intermediate data in a lakehouse for better performance:

1. Enable staging in the dataflow output settings.
2. Select the target lakehouse and table name.
3. Choose the load mode: `Overwrite` or `Append`.

Staging uses the lakehouse as a temporary buffer, enabling larger datasets to process without hitting memory limits. Data is written as Delta tables.

**Performance optimization**:
- **Push filters early**: Apply `Table.SelectRows` before joins and aggregations so the engine can push filters to the source (query folding).
- **Limit columns early**: Use `Table.SelectColumns` immediately after the source step to reduce data volume.
- **Enable staging**: Always enable lakehouse staging for dataflows processing more than a few thousand rows.
- **Avoid custom functions on large datasets**: `Table.AddColumn` with complex `each` expressions breaks query folding. Prefer native M functions.
- **Use native query**: For SQL sources, provide a native SQL query via `Value.NativeQuery()` when M transformations alone cannot fold.

## 5. Expressions & Parameters

Pipeline expressions provide dynamic content in activity properties using a rich expression language.

**Expression syntax**:

Expressions are enclosed in `@{...}` for string interpolation or used directly with `@` prefix:

```
# String interpolation
"Hello @{pipeline().parameters.userName}, your run ID is @{pipeline().RunId}"

# Direct expression (for non-string properties)
@pipeline().parameters.maxRows

# Nested expressions
@concat('output_', formatDateTime(utcNow(), 'yyyyMMdd'), '.csv')
```

**Pipeline system variables**:
| Variable | Description | Example Value |
|----------|-------------|---------------|
| `@pipeline().RunId` | Unique GUID for the current run | `a1b2c3d4-e5f6-...` |
| `@pipeline().TriggerTime` | Time the pipeline was triggered | `2025-01-15T06:00:00.000Z` |
| `@pipeline().TriggerType` | How the pipeline was triggered | `ScheduleTrigger`, `Manual` |
| `@pipeline().TriggeredByPipelineName` | Parent pipeline name (if child) | `MasterPipeline` |
| `@pipeline().GroupId` | Pipeline group ID | `group-guid-...` |
| `@pipeline().WorkspaceId` | Fabric workspace ID | `workspace-guid-...` |

**Parameters**:

Parameters are defined at the pipeline level and can be set at runtime:

```json
"parameters": {
  "sourceTable": {
    "type": "String",
    "defaultValue": "dbo.Customers"
  },
  "loadDate": {
    "type": "String",
    "defaultValue": ""
  },
  "maxRetries": {
    "type": "Int",
    "defaultValue": 3
  },
  "isFullLoad": {
    "type": "Bool",
    "defaultValue": false
  }
}
```

Reference parameters in expressions: `@pipeline().parameters.sourceTable`

**Variables**:

Variables are pipeline-scoped and can be set during execution:

```json
"variables": {
  "currentStatus": { "type": "String", "defaultValue": "Running" },
  "processedCount": { "type": "String", "defaultValue": "0" },
  "fileList": { "type": "Array", "defaultValue": [] }
}
```

Set variables with the Set Variable activity. Append to arrays with Append Variable.

**Activity output references**:

Reference output from upstream activities:

```
# Copy activity output
@activity('CopyCustomers').output.rowsCopied
@activity('CopyCustomers').output.rowsRead
@activity('CopyCustomers').output.dataWritten
@activity('CopyCustomers').output.throughput

# Lookup activity output
@activity('GetWatermark').output.firstRow.watermarkValue
@activity('GetWatermark').output.count
@activity('GetWatermark').output.value    # Array of all rows

# Get Metadata output
@activity('CheckFile').output.itemName
@activity('CheckFile').output.exists
@activity('CheckFile').output.lastModified
@activity('CheckFile').output.childItems   # List of files in a folder

# Web activity output
@activity('CallAPI').output.statusCode
@activity('CallAPI').output.Response       # Parsed JSON response body

# Activity status
@activity('CopyCustomers').status          # Succeeded, Failed, Cancelled
```

**Common expression functions**:

| Category | Function | Example |
|----------|----------|---------|
| String | `concat(s1, s2, ...)` | `@concat('Hello', ' ', 'World')` → `Hello World` |
| String | `replace(str, old, new)` | `@replace('2025-01-15', '-', '')` → `20250115` |
| String | `substring(str, start, len)` | `@substring('abcdef', 2, 3)` → `cde` |
| String | `toLower(str)` / `toUpper(str)` | `@toLower('ABC')` → `abc` |
| String | `trim(str)` | `@trim('  hello  ')` → `hello` |
| String | `split(str, delimiter)` | `@split('a,b,c', ',')` → `['a','b','c']` |
| Date | `utcNow()` | Current UTC datetime |
| Date | `addDays(dateTime, days)` | `@addDays(utcNow(), -7)` → 7 days ago |
| Date | `addHours(dateTime, hours)` | `@addHours(utcNow(), -1)` → 1 hour ago |
| Date | `formatDateTime(dt, fmt)` | `@formatDateTime(utcNow(), 'yyyy-MM-dd')` → `2025-01-15` |
| Date | `startOfDay(dt)` / `startOfMonth(dt)` | Truncate to start of period |
| Math | `add(a, b)`, `sub(a, b)`, `mul(a, b)`, `div(a, b)` | `@add(1, 2)` → `3` |
| Logic | `if(condition, trueVal, falseVal)` | `@if(equals(1, 1), 'yes', 'no')` → `yes` |
| Logic | `equals(a, b)`, `greater(a, b)`, `less(a, b)` | Boolean comparisons |
| Logic | `and(a, b)`, `or(a, b)`, `not(expr)` | Boolean operators |
| Logic | `coalesce(val1, val2, ...)` | First non-null value |
| Collection | `length(array)` | `@length(variables('fileList'))` |
| Collection | `first(array)`, `last(array)` | First/last element |
| Conversion | `int(str)`, `float(str)`, `string(val)`, `bool(str)` | Type conversions |
| JSON | `json(str)` | Parse string as JSON |

## 6. Orchestration Patterns

Well-designed orchestration separates concerns into reusable, composable pipeline patterns.

**Master-child pipeline pattern**:

A master (parent) pipeline calls child pipelines using Execute Pipeline activities. This separates data movement, transformation, and reporting into independent, testable units.

```json
{
  "name": "MasterPipeline",
  "properties": {
    "activities": [
      {
        "name": "IngestRawData",
        "type": "ExecutePipeline",
        "typeProperties": {
          "pipeline": { "referenceName": "IngestPipeline", "type": "PipelineReference" },
          "parameters": { "sourceDate": "@pipeline().parameters.loadDate" },
          "waitOnCompletion": true
        }
      },
      {
        "name": "TransformData",
        "type": "ExecutePipeline",
        "dependsOn": [{ "activity": "IngestRawData", "dependencyConditions": ["Succeeded"] }],
        "typeProperties": {
          "pipeline": { "referenceName": "TransformPipeline", "type": "PipelineReference" },
          "waitOnCompletion": true
        }
      },
      {
        "name": "RefreshReports",
        "type": "ExecutePipeline",
        "dependsOn": [{ "activity": "TransformData", "dependencyConditions": ["Succeeded"] }],
        "typeProperties": {
          "pipeline": { "referenceName": "RefreshPipeline", "type": "PipelineReference" },
          "waitOnCompletion": true
        }
      }
    ],
    "parameters": {
      "loadDate": { "type": "String", "defaultValue": "" }
    }
  }
}
```

**ForEach with parallel execution**:

Process multiple items (tables, files, partitions) in parallel:

```json
{
  "name": "ProcessAllTables",
  "type": "ForEach",
  "typeProperties": {
    "items": {
      "value": "@pipeline().parameters.tableList",
      "type": "Expression"
    },
    "isSequential": false,
    "batchCount": 10,
    "activities": [
      {
        "name": "CopyTable",
        "type": "Copy",
        "typeProperties": {
          "source": {
            "type": "AzureSqlSource",
            "sqlReaderQuery": "SELECT * FROM @{item().schemaName}.@{item().tableName}"
          },
          "sink": {
            "type": "LakehouseSink",
            "tableActionOption": "Overwrite"
          }
        }
      }
    ]
  }
}
```

- `isSequential: false` — Items process in parallel.
- `batchCount: 10` — Up to 10 items execute concurrently (max 50).
- `@item()` — References the current item in the ForEach loop.

**Error handling with If Condition**:

Branch pipeline execution based on the success or failure of upstream activities:

```json
{
  "name": "HandleCopyResult",
  "type": "IfCondition",
  "dependsOn": [{ "activity": "CopyData", "dependencyConditions": ["Completed"] }],
  "typeProperties": {
    "expression": {
      "value": "@equals(activity('CopyData').status, 'Succeeded')",
      "type": "Expression"
    },
    "ifTrueActivities": [
      {
        "name": "LogSuccess",
        "type": "Script",
        "typeProperties": {
          "scripts": [{ "text": "INSERT INTO dbo.PipelineLog VALUES ('@{pipeline().RunId}', 'Succeeded', GETUTCDATE())" }]
        }
      }
    ],
    "ifFalseActivities": [
      {
        "name": "LogFailure",
        "type": "Script",
        "typeProperties": {
          "scripts": [{ "text": "INSERT INTO dbo.PipelineLog VALUES ('@{pipeline().RunId}', 'Failed', GETUTCDATE())" }]
        }
      },
      {
        "name": "SendAlert",
        "type": "Web",
        "typeProperties": {
          "url": "https://webhook.site/notify",
          "method": "POST",
          "body": { "pipeline": "@{pipeline().Pipeline}", "error": "@{activity('CopyData').error.message}" }
        }
      }
    ]
  }
}
```

**Watermark pattern for incremental loads**:

Load only new or changed data by tracking a high-watermark value:

1. **Lookup** — Read the current watermark from a control table.
2. **Copy** — Copy rows where the change column > watermark.
3. **Script** — Update the control table with the new watermark value.

```
Lookup(GetWatermark) → Copy(IncrementalCopy) → Script(UpdateWatermark)
```

The watermark column is typically `ModifiedDate`, `RowVersion`, or an auto-increment ID.

## 7. Scheduling & Triggers

Pipelines can be triggered on a schedule, by events, or manually.

**Schedule triggers**:

Configure recurring execution using frequency and interval:

```json
{
  "type": "ScheduleTrigger",
  "typeProperties": {
    "recurrence": {
      "frequency": "Day",
      "interval": 1,
      "startTime": "2025-01-01T06:00:00Z",
      "timeZone": "UTC",
      "schedule": {
        "hours": [6],
        "minutes": [0]
      }
    }
  }
}
```

**Recurrence examples**:
| Schedule | Frequency | Interval | Schedule |
|----------|-----------|----------|----------|
| Every 15 minutes | `Minute` | 15 | — |
| Every hour at :00 | `Hour` | 1 | `{ "minutes": [0] }` |
| Daily at 6 AM | `Day` | 1 | `{ "hours": [6], "minutes": [0] }` |
| Weekdays at 8 AM | `Week` | 1 | `{ "hours": [8], "minutes": [0], "weekDays": ["Monday","Tuesday","Wednesday","Thursday","Friday"] }` |
| 1st of month at midnight | `Month` | 1 | `{ "hours": [0], "minutes": [0], "monthDays": [1] }` |
| Every 4 hours | `Hour` | 4 | `{ "minutes": [0] }` |

**Tumbling window triggers**:

Process data in fixed, non-overlapping time windows. Useful for time-partitioned loads:

- Each window has a defined start and end time.
- Missed windows are automatically backfilled.
- Dependencies can be set between tumbling windows of different pipelines.
- Retry policies apply per window.

**Event-based triggers**:

Trigger pipeline execution when specific events occur:

- File arrival in Blob Storage or ADLS Gen2 (e.g., new file in `input/` folder).
- Custom events via Event Grid.
- Storage event triggers monitor a specific container and path pattern.

**On-demand execution**:

Run a pipeline manually via the Fabric UI or REST API:

```bash
POST https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}/items/{pipelineId}/jobs/instances?jobType=Pipeline
Body: { "executionData": { "parameters": { "loadDate": "2025-01-15" } } }
```

**Parameters at trigger time**:

Schedule triggers can pass parameters to the pipeline at execution time:

```json
"pipelines": [{
  "pipelineReference": { "referenceName": "DailyLoad" },
  "parameters": {
    "loadDate": "@trigger().scheduledTime",
    "windowStart": "@trigger().outputs.windowStartTime",
    "windowEnd": "@trigger().outputs.windowEndTime"
  }
}]
```

## 8. Connectors & Connections

Connections define how Fabric connects to external data sources. They are workspace-level resources shared across pipelines and dataflows.

**Connection types**:
| Type | Description | Example |
|------|-------------|---------|
| Cloud | Direct connection to cloud services | Azure SQL, Blob, Snowflake |
| On-premises | Requires on-premises data gateway | SQL Server, Oracle, file shares |
| SaaS | OAuth-based connections to SaaS apps | SharePoint, Dynamics 365, Salesforce |
| Generic | REST or OData for custom endpoints | Any HTTP API |

**Authentication methods**:
| Method | Use Case | Configuration |
|--------|----------|---------------|
| OAuth 2.0 | SaaS connectors, Graph API | User or app OAuth flow, refresh tokens |
| Service Principal | Azure services, automated pipelines | App ID + client secret or certificate |
| Managed Identity | Azure-to-Azure, Fabric workspace identity | No credentials to manage |
| Key / Connection String | Storage accounts, databases | Account key or full connection string |
| Basic | REST APIs, SFTP | Username + password |
| Anonymous | Public endpoints | No credentials |

**Connection best practices**:
- Prefer managed identity for Azure-to-Azure connectivity — no credential rotation needed.
- Use service principal for CI/CD pipelines that deploy and run pipelines programmatically.
- Store connection strings and secrets in Azure Key Vault; reference them via linked Key Vault connections.
- Use workspace-level connections to avoid duplicate credentials across pipelines.
- Rotate shared keys and client secrets on a regular schedule (90 days recommended).

**On-premises data gateway**:

For accessing data behind firewalls (SQL Server, Oracle, file shares):

1. Install the on-premises data gateway on a machine with network access to the data source.
2. Register the gateway in the Fabric admin portal.
3. Create a connection that references the gateway.
4. Use the connection in pipelines and dataflows.

Gateway considerations:
- Deploy in a cluster (2+ nodes) for high availability.
- Monitor gateway health via the Fabric admin portal.
- Keep the gateway software updated (auto-update recommended).
- Place the gateway machine close to the data source to minimize latency.

## 9. Error Handling & Retry

Production pipelines must handle errors gracefully to avoid data loss and provide visibility into failures.

**Activity-level retry policies**:

```json
"policy": {
  "timeout": "01:00:00",
  "retry": 3,
  "retryIntervalInSeconds": 30,
  "secureOutput": false,
  "secureInput": false
}
```

| Setting | Description | Default |
|---------|-------------|---------|
| `timeout` | Maximum activity execution time | `7.00:00:00` (7 days) |
| `retry` | Number of retry attempts on failure | 0 |
| `retryIntervalInSeconds` | Seconds between retries | 30 |
| `secureInput` | Hide input from monitoring logs | false |
| `secureOutput` | Hide output from monitoring logs | false |

**Try-catch pattern**:

Use dependency conditions to create try-catch-like behavior:

```
CopyData (main activity)
  ├── [Succeeded] → LogSuccess
  └── [Failed] → HandleError
                    ├── LogError (Script activity)
                    └── SendNotification (Web activity)
```

The key is using `dependencyConditions: ["Failed"]` to route to error-handling activities.

**Logging errors to a table**:

```json
{
  "name": "LogError",
  "type": "Script",
  "dependsOn": [{ "activity": "CopyData", "dependencyConditions": ["Failed"] }],
  "typeProperties": {
    "scripts": [{
      "text": "INSERT INTO dbo.ErrorLog (RunId, PipelineName, ActivityName, ErrorMessage, ErrorTime) VALUES ('@{pipeline().RunId}', '@{pipeline().Pipeline}', 'CopyData', '@{activity('CopyData').error.message}', GETUTCDATE())"
    }]
  }
}
```

**Pipeline failure notifications**:

Use a Web activity to call a webhook (Teams, Slack, email service) on failure:

```json
{
  "name": "NotifyOnFailure",
  "type": "Web",
  "dependsOn": [{ "activity": "CopyData", "dependencyConditions": ["Failed"] }],
  "typeProperties": {
    "url": "https://outlook.office.com/webhook/...",
    "method": "POST",
    "headers": { "Content-Type": "application/json" },
    "body": {
      "title": "Pipeline Failed: @{pipeline().Pipeline}",
      "text": "Run @{pipeline().RunId} failed at @{utcNow()}. Error: @{activity('CopyData').error.message}"
    }
  }
}
```

**Best practices**:
- Always set `retry` on activities that call external services (Copy, Web, Script) — transient errors are common.
- Set explicit `timeout` values — the default 7-day timeout is too long for production pipelines.
- Log all errors to a persistent store (lakehouse table or SQL table) for trend analysis.
- Use `secureInput: true` on activities that handle credentials (e.g., Web activity calling a token endpoint).
- Implement a "dead letter" pattern: move failed records to a separate table for manual review instead of blocking the entire pipeline.

## 10. Monitoring

Monitoring pipeline and dataflow execution is essential for maintaining data freshness and reliability.

**Fabric Monitoring Hub**:

The Monitoring Hub provides a centralized view of all Fabric item executions:

- Filter by workspace, item type (pipeline, dataflow, notebook), status, and time range.
- View pipeline run history with status, duration, start time, and trigger type.
- Drill into individual runs to see activity-level details.
- View data read/written, throughput, and duration per activity.

**Pipeline run states**:
| Status | Description |
|--------|-------------|
| `InProgress` | Pipeline is currently executing |
| `Succeeded` | All activities completed successfully |
| `Failed` | One or more activities failed (without error handling) |
| `Cancelled` | Pipeline was manually cancelled |
| `Queued` | Pipeline is waiting for capacity |

**REST API for monitoring**:

```bash
# List pipeline runs
GET https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}/items/{pipelineId}/jobs/instances

# Get specific run details
GET https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}/items/{pipelineId}/jobs/instances/{runId}

# Cancel a running pipeline
POST https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}/items/{pipelineId}/jobs/instances/{runId}/cancel
```

**Diagnostic logs**:

Enable diagnostic settings to send pipeline logs to:
- Log Analytics workspace (for KQL queries and dashboards)
- Storage account (for long-term retention)
- Event Hub (for real-time alerting)

**Alerting on failure**:

Configure alerts via:
1. **Fabric workspace settings** — Built-in email notifications for pipeline failures.
2. **Azure Monitor alerts** — KQL-based alerts on diagnostic logs.
3. **Custom webhook** — Web activity in the pipeline that fires on failure paths.
4. **Teams / Slack** — Incoming webhook to a Teams channel for real-time notifications.

**Performance baselines**:

Track and baseline pipeline performance:
- Monitor run duration trends — increasing duration signals schema drift, data growth, or resource contention.
- Track rows read vs rows written — discrepancies indicate data quality issues or filter drift.
- Monitor capacity utilization — high CU consumption may require capacity scaling.
- Set up SLA alerts — notify if a pipeline does not complete within its expected window.

## 11. Migration from ADF

Teams moving from Azure Data Factory to Fabric Data Factory should understand the key differences and migration path.

**Key differences**:
| Aspect | Azure Data Factory | Fabric Data Factory |
|--------|-------------------|---------------------|
| Compute | Integration Runtime (Azure IR, Self-hosted IR) | Fabric Capacity Units (CU) |
| Connections | Linked Services (per factory) | Workspace Connections (shared) |
| Dataflows | Mapping Data Flows (Spark), Wrangling (Power Query) | Dataflow Gen2 (Power Query Online) |
| Triggers | Schedule, Tumbling Window, Event, Custom | Schedule, Tumbling Window, Event |
| Monitoring | ADF Monitor, Azure Monitor | Fabric Monitoring Hub |
| Git | Native Git integration in ADF Studio | Fabric Git integration |
| Pricing | Pay-per-activity + DIU hours | Included in Fabric capacity |

**Migration considerations**:
- **No self-hosted IR in Fabric**: Use the on-premises data gateway instead for on-premises data access.
- **Linked services become connections**: Recreate each linked service as a Fabric workspace connection.
- **Mapping Data Flows become Dataflow Gen2 or Notebooks**: Mapping Data Flow logic needs to be rewritten as Power Query M (Dataflow Gen2) or PySpark (Notebook activities).
- **Trigger migration**: Schedule and tumbling window triggers have direct equivalents. Custom event triggers use the same Event Grid integration.
- **Pipeline JSON compatibility**: Pipeline activity definitions are largely compatible, but connection references need updating.
- **Global parameters**: ADF global parameters map to Fabric workspace variables or pipeline parameters.

**Feature parity gaps** (as of 2025):
- No SSIS Integration Runtime in Fabric — SSIS packages must be re-implemented as pipelines or notebooks.
- Limited custom activity support — ADF's Azure Batch custom activities are not directly available.
- No private endpoint support for Fabric Data Factory connections (use gateway instead).
- Mapping Data Flow debug sessions are not available in Fabric; use Dataflow Gen2 preview or notebook debugging.

## 12. Common Patterns

### Pattern 1: Full and Incremental Load from SQL to Lakehouse

Load a SQL table to a lakehouse using a full load on first run and incremental loads thereafter.

```json
{
  "name": "SQLToLakehouse_Incremental",
  "properties": {
    "activities": [
      {
        "name": "GetWatermark",
        "type": "Lookup",
        "typeProperties": {
          "source": {
            "type": "LakehouseSource",
            "sqlReaderQuery": "SELECT COALESCE(MAX(watermark_value), '1900-01-01') AS watermark FROM control.watermark_table WHERE table_name = '@{pipeline().parameters.tableName}'"
          },
          "firstRowOnly": true
        }
      },
      {
        "name": "IncrementalCopy",
        "type": "Copy",
        "dependsOn": [{ "activity": "GetWatermark", "dependencyConditions": ["Succeeded"] }],
        "typeProperties": {
          "source": {
            "type": "AzureSqlSource",
            "sqlReaderQuery": "SELECT * FROM @{pipeline().parameters.tableName} WHERE ModifiedDate > '@{activity('GetWatermark').output.firstRow.watermark}' AND ModifiedDate <= '@{pipeline().parameters.loadDate}'"
          },
          "sink": {
            "type": "LakehouseSink",
            "tableActionOption": "Append"
          }
        }
      },
      {
        "name": "UpdateWatermark",
        "type": "Script",
        "dependsOn": [{ "activity": "IncrementalCopy", "dependencyConditions": ["Succeeded"] }],
        "typeProperties": {
          "scripts": [{
            "text": "MERGE control.watermark_table AS t USING (SELECT '@{pipeline().parameters.tableName}' AS table_name, '@{pipeline().parameters.loadDate}' AS watermark_value) AS s ON t.table_name = s.table_name WHEN MATCHED THEN UPDATE SET watermark_value = s.watermark_value WHEN NOT MATCHED THEN INSERT (table_name, watermark_value) VALUES (s.table_name, s.watermark_value);"
          }]
        }
      }
    ],
    "parameters": {
      "tableName": { "type": "String" },
      "loadDate": { "type": "String", "defaultValue": "@utcNow()" }
    }
  }
}
```

### Pattern 2: Dataflow Gen2 Data Cleaning Pipeline

Ingest raw data, clean it with a Dataflow Gen2, and validate output quality.

```json
{
  "name": "DataCleaningPipeline",
  "properties": {
    "activities": [
      {
        "name": "CopyRawData",
        "type": "Copy",
        "typeProperties": {
          "source": { "type": "AzureBlobSource", "recursive": true },
          "sink": { "type": "LakehouseSink", "tableActionOption": "Overwrite" }
        }
      },
      {
        "name": "CleanWithDataflow",
        "type": "DataflowActivity",
        "dependsOn": [{ "activity": "CopyRawData", "dependencyConditions": ["Succeeded"] }],
        "typeProperties": {
          "dataflowReference": {
            "referenceName": "CleanCustomerDataflow",
            "type": "DataflowReference"
          }
        }
      },
      {
        "name": "ValidateRowCount",
        "type": "Lookup",
        "dependsOn": [{ "activity": "CleanWithDataflow", "dependencyConditions": ["Succeeded"] }],
        "typeProperties": {
          "source": {
            "type": "LakehouseSource",
            "sqlReaderQuery": "SELECT COUNT(*) AS row_count FROM cleaned_customers"
          },
          "firstRowOnly": true
        }
      },
      {
        "name": "CheckQuality",
        "type": "IfCondition",
        "dependsOn": [{ "activity": "ValidateRowCount", "dependencyConditions": ["Succeeded"] }],
        "typeProperties": {
          "expression": {
            "value": "@greater(activity('ValidateRowCount').output.firstRow.row_count, 0)",
            "type": "Expression"
          },
          "ifTrueActivities": [
            {
              "name": "LogSuccess",
              "type": "Script",
              "typeProperties": {
                "scripts": [{ "text": "INSERT INTO control.pipeline_log VALUES ('@{pipeline().RunId}', 'DataCleaning', 'Succeeded', @{activity('ValidateRowCount').output.firstRow.row_count}, GETUTCDATE())" }]
              }
            }
          ],
          "ifFalseActivities": [
            {
              "name": "FailPipeline",
              "type": "Fail",
              "typeProperties": {
                "message": "Data quality check failed: cleaned table has 0 rows",
                "errorCode": "DQ_ZERO_ROWS"
              }
            }
          ]
        }
      }
    ]
  }
}
```

**Companion Dataflow Gen2 M query** (`CleanCustomerDataflow`):

```m
let
    Source = Lakehouse.Contents(null){[workspaceId="<workspace-id>"]}[Data]{[lakehouseId="<lakehouse-id>"]}[Data],
    RawCustomers = Source{[Id="raw_customers", ItemKind="Table"]}[Data],
    RemoveNulls = Table.SelectRows(RawCustomers, each [Email] <> null and [Name] <> null),
    TrimWhitespace = Table.TransformColumns(RemoveNulls, {
        {"Name", Text.Trim, type text},
        {"Email", Text.Trim, type text}
    }),
    NormalizeEmail = Table.TransformColumns(TrimWhitespace, {
        {"Email", Text.Lower, type text}
    }),
    DeduplicateByEmail = Table.Distinct(NormalizeEmail, {"Email"}),
    AddLoadDate = Table.AddColumn(DeduplicateByEmail, "LoadDate", each DateTime.LocalNow(), type datetime),
    SetTypes = Table.TransformColumnTypes(AddLoadDate, {
        {"CustomerID", Int64.Type},
        {"Name", type text},
        {"Email", type text},
        {"Region", type text},
        {"LoadDate", type datetime}
    })
in
    SetTypes
```

### Pattern 3: Master Orchestration Pipeline (Copy, Notebook, Refresh)

A master pipeline that ingests data, transforms it with a Spark notebook, and refreshes a semantic model.

```json
{
  "name": "MasterOrchestration",
  "properties": {
    "activities": [
      {
        "name": "IngestFromMultipleSources",
        "type": "ForEach",
        "typeProperties": {
          "items": {
            "value": "@pipeline().parameters.sourceTables",
            "type": "Expression"
          },
          "isSequential": false,
          "batchCount": 5,
          "activities": [
            {
              "name": "CopySourceTable",
              "type": "Copy",
              "typeProperties": {
                "source": {
                  "type": "AzureSqlSource",
                  "sqlReaderQuery": "SELECT * FROM @{item().schema}.@{item().table}"
                },
                "sink": {
                  "type": "LakehouseSink",
                  "tableActionOption": "Overwrite"
                }
              }
            }
          ]
        }
      },
      {
        "name": "RunTransformNotebook",
        "type": "NotebookActivity",
        "dependsOn": [{ "activity": "IngestFromMultipleSources", "dependencyConditions": ["Succeeded"] }],
        "typeProperties": {
          "notebookReference": {
            "referenceName": "TransformSilverToGold",
            "type": "NotebookReference"
          },
          "parameters": {
            "run_date": { "value": "@formatDateTime(utcNow(), 'yyyy-MM-dd')", "type": "string" }
          }
        }
      },
      {
        "name": "RefreshSemanticModel",
        "type": "Web",
        "dependsOn": [{ "activity": "RunTransformNotebook", "dependencyConditions": ["Succeeded"] }],
        "typeProperties": {
          "url": "https://api.fabric.microsoft.com/v1/workspaces/@{pipeline().parameters.workspaceId}/semanticModels/@{pipeline().parameters.modelId}/refresh",
          "method": "POST",
          "headers": { "Content-Type": "application/json" },
          "body": { "type": "Full" }
        }
      }
    ],
    "parameters": {
      "sourceTables": {
        "type": "Array",
        "defaultValue": [
          { "schema": "Sales", "table": "Orders" },
          { "schema": "Sales", "table": "Customers" },
          { "schema": "Sales", "table": "Products" }
        ]
      },
      "workspaceId": { "type": "String" },
      "modelId": { "type": "String" }
    }
  }
}
```

### Pattern 4: Error Handling with Logging and Email Notification

A pipeline with comprehensive error handling: try-catch, error logging, and email alert.

```json
{
  "name": "RobustCopyPipeline",
  "properties": {
    "activities": [
      {
        "name": "CopyData",
        "type": "Copy",
        "policy": { "timeout": "01:00:00", "retry": 3, "retryIntervalInSeconds": 60 },
        "typeProperties": {
          "source": { "type": "AzureSqlSource", "sqlReaderQuery": "SELECT * FROM dbo.Transactions" },
          "sink": { "type": "LakehouseSink", "tableActionOption": "Append" },
          "enableSkipIncompatibleRow": true,
          "redirectIncompatibleRowSettings": {
            "linkedServiceName": "LakehouseForLogs",
            "path": "errors/incompatible-rows/@{pipeline().RunId}"
          }
        }
      },
      {
        "name": "SetSuccessStatus",
        "type": "SetVariable",
        "dependsOn": [{ "activity": "CopyData", "dependencyConditions": ["Succeeded"] }],
        "typeProperties": {
          "variableName": "pipelineStatus",
          "value": "Succeeded"
        }
      },
      {
        "name": "HandleFailure",
        "type": "IfCondition",
        "dependsOn": [{ "activity": "CopyData", "dependencyConditions": ["Failed"] }],
        "typeProperties": {
          "expression": { "value": "@bool(true)", "type": "Expression" },
          "ifTrueActivities": [
            {
              "name": "LogErrorToTable",
              "type": "Script",
              "typeProperties": {
                "scripts": [{
                  "text": "INSERT INTO control.error_log (run_id, pipeline_name, activity_name, error_message, error_code, logged_at) VALUES ('@{pipeline().RunId}', '@{pipeline().Pipeline}', 'CopyData', '@{replace(activity('CopyData').error.message, '''', '''''')}', '@{activity('CopyData').error.errorCode}', GETUTCDATE())"
                }]
              }
            },
            {
              "name": "SendFailureEmail",
              "type": "Web",
              "dependsOn": [{ "activity": "LogErrorToTable", "dependencyConditions": ["Completed"] }],
              "typeProperties": {
                "url": "https://prod-00.eastus.logic.azure.com:443/workflows/.../triggers/manual/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=...",
                "method": "POST",
                "headers": { "Content-Type": "application/json" },
                "body": {
                  "to": "data-team@company.com",
                  "subject": "Pipeline Failed: @{pipeline().Pipeline}",
                  "body": "Pipeline @{pipeline().Pipeline} (Run ID: @{pipeline().RunId}) failed at @{utcNow()}.\n\nError: @{activity('CopyData').error.message}\n\nPlease investigate in the Fabric Monitoring Hub."
                }
              }
            },
            {
              "name": "FailPipeline",
              "type": "Fail",
              "dependsOn": [{ "activity": "SendFailureEmail", "dependencyConditions": ["Completed"] }],
              "typeProperties": {
                "message": "CopyData failed after retries: @{activity('CopyData').error.message}",
                "errorCode": "COPY_FAILED"
              }
            }
          ]
        }
      }
    ],
    "variables": {
      "pipelineStatus": { "type": "String", "defaultValue": "Unknown" }
    }
  }
}
```

This pattern ensures that:
1. The Copy activity retries 3 times on transient failures.
2. Incompatible rows are logged rather than failing the pipeline.
3. On permanent failure, the error is logged to a SQL table for trend analysis.
4. An email notification is sent to the data team via a Logic App webhook.
5. The pipeline explicitly fails with a clear error message for the Monitoring Hub.

## Progressive Disclosure — Reference Files

| Topic | File |
|---|---|
| Source/sink connector matrix, schema mapping, data type mapping, parallelism, staging | [`references/copy-activity-patterns.md`](./references/copy-activity-patterns.md) |
| Power Query M patterns, incremental refresh, gateway types, staging lakehouse, output destinations | [`references/dataflow-gen2.md`](./references/dataflow-gen2.md) |
| Schedule/event/manual triggers, ForEach/IfCondition/Until, watermark patterns, expression language | [`references/orchestration-triggers.md`](./references/orchestration-triggers.md) |
| Activity run history API, KQL monitoring queries, failed run remediation, alerting, error logging | [`references/monitoring-debugging.md`](./references/monitoring-debugging.md) |
