# Fabric Data Factory Plugin

Microsoft Fabric Data Factory — build data pipelines with Copy activity, Dataflow Gen2 transformations, Notebook orchestration, incremental load patterns, scheduling, and monitoring. Covers 70+ connectors, Power Query M language, expression functions, error handling, and migration from Azure Data Factory.

## What This Plugin Provides

This is a **knowledge plugin** — it gives Claude deep expertise in Fabric Data Factory so it can design pipelines, write Copy activity configurations, build Dataflow Gen2 M queries, set up scheduling, and diagnose pipeline failures. It does not contain runtime code, MCP servers, or executable scripts.

## Setup

Run `/setup` to configure Fabric workspace access and verify API connectivity:

```
/setup              # Full guided setup
/setup --minimal    # Authentication and workspace verification only
```

Requires an Azure account with access to a Microsoft Fabric workspace.

## Commands

| Command | Description |
|---------|-------------|
| `/setup` | Configure Azure authentication, workspace access, and environment |
| `/pipeline-create` | Create a data pipeline (copy, orchestration, or incremental load) |
| `/dataflow-create` | Create a Dataflow Gen2 with Power Query M transformations |
| `/copy-activity-config` | Configure a Copy activity with source, sink, mapping, and performance |
| `/pipeline-schedule` | Create or update a schedule trigger for a pipeline |
| `/pipeline-monitor` | Monitor pipeline runs, diagnose failures, analyze performance |

## Agent

| Agent | Description |
|-------|-------------|
| **Data Factory Reviewer** | Reviews pipelines and dataflows for structure, performance, error handling, expression correctness, and security |

## Trigger Keywords

The skill activates automatically when conversations mention: `fabric data factory`, `fabric pipeline`, `dataflow gen2`, `copy activity`, `data pipeline`, `fabric etl`, `fabric orchestration`, `pipeline trigger`, `fabric copy`, `data movement`, `fabric connector`, `pipeline expression`.

## Author

Markus Ahling
