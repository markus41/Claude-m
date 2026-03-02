# Fabric Real-Time Analytics Plugin

Microsoft Fabric Real-Time Analytics — create Eventhouses and KQL databases, build eventstreams for streaming ingestion, write KQL queries with time series analysis and anomaly detection, design Real-Time Dashboards with auto-refresh tiles, and configure Data Activator triggers for automated alerting.

## What This Plugin Provides

This is a **knowledge plugin** — it gives Claude deep expertise in Fabric Real-Time Analytics so it can design streaming pipelines, write KQL queries, configure eventstreams, build dashboards, and set up data-driven alerts. It does not contain runtime code, MCP servers, or executable scripts.

## Setup

Run `/setup` to install Kusto SDKs and configure Fabric workspace access:

```
/setup              # Full guided setup
/setup --minimal    # SDKs only
```

Requires a Fabric workspace with an Eventhouse or permissions to create one.

## Commands

| Command | Description |
|---------|-------------|
| `/setup` | Install Kusto SDKs, authenticate to Fabric, configure workspace access |
| `/eventhouse-create` | Create an Eventhouse with KQL database, table schema, and policies |
| `/kql-query` | Generate and run KQL queries from natural-language descriptions |
| `/eventstream-create` | Design an Eventstream pipeline with sources, transforms, and destinations |
| `/rt-dashboard-create` | Create a Real-Time Dashboard with KQL tiles, parameters, and auto-refresh |
| `/data-activator-trigger` | Create Data Activator triggers for automated alerting on data conditions |

## Agent

| Agent | Description |
|-------|-------------|
| **Real-Time Analytics Reviewer** | Reviews KQL databases, eventstreams, dashboards, and Data Activator configs for schema design, query efficiency, pipeline correctness, and security |

## Trigger Keywords

The skill activates automatically when conversations mention: `real time analytics`, `kql`, `kusto`, `eventhouse`, `eventstream`, `kql database`, `streaming ingestion`, `real time dashboard`, `fabric kql`, `data activator`, `reflex`, `event processing`, `time series fabric`.

## Author

Markus Ahling
