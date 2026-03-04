# fabric-data-engineering

Microsoft Fabric Data Engineering — lakehouses, Spark notebooks, Delta Lake operations, and data pipeline engineering.

## Purpose

`fabric-data-engineering` provides deterministic runbooks for Fabric lakehouse and Spark engineering workflows.

## Prerequisites

- Fabric capacity and workspace access with Spark notebook permissions.
- Lakehouse create/manage permissions in target workspace.
- Workspace role: Admin, Member, or Contributor.

## Setup

Run `/setup` to verify Fabric capacity, create workspace dependencies, and configure lakehouse access.

## Commands

| Command | Description |
|---|---|
| `/setup` | Verify Fabric capacity, create workspace, and configure lakehouse access. |
| `/lakehouse-create` | Create a lakehouse with medallion folder structure. |
| `/notebook-create` | Create a Spark notebook with scenario-specific starter code. |
| `/pipeline-create` | Create a data pipeline with activities and scheduling. |
| `/delta-table-manage` | Create, optimize, vacuum, and manage Delta tables. |
| `/lakehouse-load-data` | Load data from files and APIs into lakehouse Delta tables. |
| `/spark-job-definition-manage` | Manage Fabric Spark Job Definition assets and execution policy checks. |

## Agent

| Agent | Description |
|---|---|
| **Data Engineering Reviewer** | Reviews lakehouse design, Spark code quality, Delta management, and security posture. |
