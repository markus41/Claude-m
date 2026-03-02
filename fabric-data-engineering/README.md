# Fabric Data Engineering Plugin

Microsoft Fabric Data Engineering — create and manage lakehouses with OneLake, author PySpark and SparkSQL notebooks, build Delta Lake tables with ACID transactions and time travel, design data pipelines with Copy/Notebook/Dataflow activities, implement medallion architecture (bronze/silver/gold), and optimize Spark workloads for performance.

## What This Plugin Provides

This is a **knowledge plugin** — it gives Claude deep expertise in Microsoft Fabric data engineering so it can create lakehouses, generate Spark notebooks, design Delta tables, build pipelines, and guide medallion architecture implementation. It does not contain runtime code, MCP servers, or executable scripts.

## Setup

Run `/setup` to verify Fabric capacity, create a workspace, and configure lakehouse access:

```
/setup              # Full guided setup
/setup --minimal    # Local development tools only
```

Requires a Microsoft Fabric capacity (F2+), Power BI Premium (P1+), or a Fabric trial.

## Commands

| Command | Description |
|---------|-------------|
| `/setup` | Verify Fabric capacity, create workspace, configure lakehouse access |
| `/lakehouse-create` | Create a lakehouse with medallion folder structure |
| `/notebook-create` | Create a Spark notebook with starter code for a given scenario |
| `/pipeline-create` | Create a data pipeline with activities and scheduling |
| `/delta-table-manage` | Create, optimize, vacuum, and manage Delta tables |
| `/lakehouse-load-data` | Load data from files/APIs into lakehouse Delta tables |

## Agent

| Agent | Description |
|-------|-------------|
| **Data Engineering Reviewer** | Reviews Fabric projects for lakehouse design, Spark code quality, Delta Lake management, pipeline orchestration, and security |

## Trigger Keywords

The skill activates automatically when conversations mention: `fabric data engineering`, `lakehouse`, `spark notebook`, `fabric notebook`, `delta lake`, `fabric pipeline`, `pyspark fabric`, `lakehouse sql`, `fabric spark`, `data pipeline fabric`, `delta table`, `medallion architecture`.

## Author

Markus Ahling
