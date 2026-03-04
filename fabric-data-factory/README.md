# fabric-data-factory

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
