# fabric-real-time-analytics

Microsoft Fabric Real-Time Analytics — Eventhouse, KQL databases, eventstreams, KQL querysets, and real-time dashboards.

## Purpose

`fabric-real-time-analytics` delivers deterministic workflows for streaming ingestion, KQL authoring, and real-time observability.

## Prerequisites

- Fabric workspace with Eventhouse permissions.
- KQL database and eventstream creation rights.
- Workspace role: Admin, Member, or Contributor with analytics item permissions.

## Setup

Run `/setup` to configure workspace authentication and KQL tooling.

## Commands

| Command | Description |
|---|---|
| `/setup` | Configure Fabric workspace and KQL dependencies. |
| `/eventhouse-create` | Create Eventhouse with KQL database and table schema baselines. |
| `/kql-query` | Generate and run KQL queries from natural-language requests. |
| `/eventstream-create` | Design eventstream source-transform-destination pipelines. |
| `/rt-dashboard-create` | Create a real-time dashboard with KQL-powered tiles. |
| `/data-activator-trigger` | Configure Data Activator triggers for alerting. |
| `/kql-queryset-manage` | Manage KQL Queryset item lifecycle and governance checks. |

## Agent

| Agent | Description |
|---|---|
| **Real-Time Analytics Reviewer** | Reviews KQL, eventstream, dashboard, and alerting configurations for reliability and security. |
