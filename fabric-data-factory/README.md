<!-- claude-m:premium-header:start -->
<div align="center">

<a id="top"></a>

# fabric-data-factory

### Microsoft Fabric Data Factory — data pipelines, Dataflow Gen2, Copy activity, orchestration patterns, and scheduling

<sub>Build, mirror, and govern analytics estates on Fabric.</sub>

<br />

<table align="center">
<tr>
<td align="center"><b>Category</b><br /><code>Analytics</code></td>
<td align="center"><b>Surfaces</b><br /><sub>Microsoft Fabric · Power BI · OneLake · DAX · KQL</sub></td>
<td align="center"><b>Version</b><br /><code>1.0.0</code></td>
<td align="center"><b>Marketplace</b><br /><code>claude-m-microsoft-marketplace</code></td>
</tr>
</table>

<sub><code>microsoft</code> &nbsp;·&nbsp; <code>fabric</code> &nbsp;·&nbsp; <code>data-factory</code> &nbsp;·&nbsp; <code>pipelines</code> &nbsp;·&nbsp; <code>dataflow</code> &nbsp;·&nbsp; <code>etl</code></sub>

<a href="#install"><b>Install</b></a> &nbsp;·&nbsp;
<a href="#overview"><b>Overview</b></a> &nbsp;·&nbsp;
<a href="#architecture"><b>Architecture</b></a> &nbsp;·&nbsp;
<a href="#related-plugins"><b>Related plugins</b></a> &nbsp;·&nbsp;
<a href="../README.md"><b>Marketplace</b></a>

</div>

---

> [!TIP]
> **One-line install** — `/plugin install fabric-data-factory@claude-m-microsoft-marketplace`



## Overview

> Microsoft Fabric Data Factory — data pipelines, Dataflow Gen2, Copy activity, orchestration patterns, and scheduling

<details>
<summary><b>What ships in this plugin</b> (commands, agents, skills)</summary>

| Component | Items |
|---|---|
| **Commands** | `/copy-activity-config` · `/copy-job-manage` · `/dataflow-create` · `/dataflow-gen2-manage` · `/fabric-adf-setup` · `/pipeline-create` · `/pipeline-monitor` · `/pipeline-schedule` |
| **Agents** | `data-factory-reviewer` |
| **Skills** | `fabric-data-factory` |

</details>


<details>
<summary><b>Quick example</b></summary>

```text
Use fabric-data-factory to design, build, and govern Fabric / Power BI assets.
```

</details>

<a id="architecture"></a>

## Architecture

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#0078D4','primaryTextColor':'#FFFFFF','lineColor':'#5B9BD5','fontFamily':'Segoe UI, Arial, sans-serif'}}}%%
flowchart LR
    classDef user fill:#1E1E1E,stroke:#FFFFFF,color:#FFFFFF,stroke-width:2px
    classDef cc fill:#D97757,stroke:#7A3E2A,color:#FFFFFF
    classDef plugin fill:#0078D4,stroke:#003E6B,color:#FFFFFF,stroke-width:2px
    classDef msft fill:#FFB900,stroke:#B07F00,color:#000000

    U["You"]:::user
    CC["Claude Code"]:::cc
    PG["fabric-data-factory<br/>(plugin)"]:::plugin

    subgraph MS[" Microsoft surfaces "]
        direction TB
        S0["Fabric REST"]:::msft
        S1["Power BI XMLA"]:::msft
        S2["OneLake"]:::msft
    end

    U -->|prompts| CC
    CC -->|loads| PG
    PG ==> S0
    PG ==> S1
    PG ==> S2
```

<a id="install"></a>

## Install

```bash
/plugin marketplace add markus41/Claude-m
/plugin install fabric-data-factory@claude-m-microsoft-marketplace
```

> [!IMPORTANT]
> This plugin operates against **Microsoft Fabric · Power BI · OneLake · DAX · KQL**. Configure credentials via environment variables — never commit secrets.

[Back to top](#top)

---

<!-- claude-m:premium-header:end -->

Microsoft Fabric Data Factory — data pipelines, Dataflow Gen2, Copy activity, orchestration patterns, and scheduling.

## Purpose

`fabric-data-factory` is the broad orchestration plugin for Fabric pipeline and Dataflow Gen2 operations.

## Prerequisites

- Fabric workspace access with pipeline and dataflow author rights.
- Connection resources configured for source and sink systems.
- Workspace role: Admin, Member, or Contributor with item create permissions.

## Setup

Run `/setup` to configure Fabric workspace access and verify API connectivity.

## Commands

| Command | Description |
|---|---|
| `/setup` | Configure Azure authentication, workspace access, and environment. |
| `/pipeline-create` | Create a data pipeline (copy, orchestration, or incremental load). |
| `/dataflow-create` | Create a Dataflow Gen2 with Power Query M transformations. |
| `/copy-activity-config` | Configure Copy activity with source, sink, mapping, and performance settings. |
| `/pipeline-schedule` | Create or update schedule triggers for pipelines. |
| `/pipeline-monitor` | Monitor pipeline runs, diagnose failures, and analyze performance. |
| `/copy-job-manage` | Manage Fabric Copy job item lifecycle and validation checks. |
| `/dataflow-gen2-manage` | Manage Dataflow Gen2 item governance and execution controls. |

## Routing Boundaries

- Use `fabric-data-prep-jobs` for Dataflow Gen1, Apache Airflow job, dbt job (preview), and ADF mount workflows.
- Keep `fabric-data-factory` focused on Dataflow Gen2 and orchestration pipeline operations.

## Agent

| Agent | Description |
|---|---|
| **Data Factory Reviewer** | Reviews pipelines and dataflows for structure, performance, error handling, and security checks. |
<!-- claude-m:premium-footer:start -->

---

<a id="related-plugins"></a>

## Related plugins

<table>
<tr><th>Plugin</th><th>What it does</th></tr>
<tr><td><a href="../fabric-ai-agents/README.md"><code>fabric-ai-agents</code></a></td><td>Microsoft Fabric AI and operations agents - anomaly detector, data agent, operations agent, ontology, and digital twin builder workflows with preview guardrails.</td></tr>
<tr><td><a href="../fabric-capacity-ops/README.md"><code>fabric-capacity-ops</code></a></td><td>Microsoft Fabric Capacity Operations — CU monitoring, throttling diagnostics, workload tuning, autoscale planning, and cost-performance optimization</td></tr>
<tr><td><a href="../fabric-data-activator/README.md"><code>fabric-data-activator</code></a></td><td>Microsoft Fabric Data Activator — Reflex triggers, condition-based alerts, real-time actions, and event-driven automation on Fabric data</td></tr>
<tr><td><a href="../fabric-data-engineering/README.md"><code>fabric-data-engineering</code></a></td><td>Microsoft Fabric Data Engineering — lakehouses, Spark notebooks, data pipelines, Delta Lake tables, lakehouse SQL endpoints, multi-notebook orchestration, workspace lifecycle management, pipeline monitoring, and advanced optimization</td></tr>
<tr><td><a href="../fabric-data-prep-jobs/README.md"><code>fabric-data-prep-jobs</code></a></td><td>Microsoft Fabric data preparation jobs - Dataflow Gen1, Apache Airflow jobs, mounted Azure Data Factory pipelines, and dbt job governance for deterministic prep workflows.</td></tr>
<tr><td><a href="../fabric-data-science/README.md"><code>fabric-data-science</code></a></td><td>Microsoft Fabric Data Science — ML experiments, model training, MLflow tracking, PREDICT function, and semantic link integration</td></tr>
</table>


<details>
<summary><b>Composable stacks that include <code>fabric-data-factory</code></b></summary>

Combine with sibling plugins to build cross-surface runbooks. Browse the full [marketplace catalog](../README.md#plugin-catalog) for a tailored selection.

</details>

---

<div align="center">

<sub>Part of <a href="../README.md"><b>Claude-m</b></a> — the Microsoft plugin marketplace for Claude Code.</sub>

<sub>Licensed under <a href="../LICENSE">MIT</a>. Built for engineers, MSPs, SOC teams, and analytics leaders.</sub>

</div>

<!-- claude-m:premium-footer:end -->

