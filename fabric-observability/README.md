# Fabric Observability Plugin

`fabric-observability` is an advanced Microsoft Fabric knowledge plugin for operational diagnostics and reliability engineering for Fabric notebooks, pipelines, and semantic workloads.

## What This Plugin Provides

This is a **knowledge plugin**. It provides implementation guidance, deterministic command workflows, and reviewer checks. It does not include runtime binaries or MCP servers.

Install with:

```bash
/plugin install fabric-observability@claude-m-microsoft-marketplace
```

## Prerequisites

- Access to Monitor Hub, pipeline history, notebook run details, and workspace logs.
- Defined service-level objectives for freshness, latency, and success rate.
- Alert routing channels with clear on-call ownership.
- Runbook location for incident response and postmortems.

## Setup

Run `/observability-setup` first to baseline environment, permissions, and rollout constraints.

## Commands

| Command | Description |
|---|---|
| `/observability-setup` | Set up Fabric observability with SLO definitions, signal inventory, and incident ownership. |
| `/monitor-hub-triage` | Triage Fabric failures and degradations from Monitor Hub with repeatable severity and dependency analysis. |
| `/notebook-pipeline-slo` | Define and validate notebook and pipeline SLOs with measurement logic, error budgets, and breach handling. |
| `/incident-runbook` | Create Fabric incident runbooks for recurring notebook, pipeline, and refresh failure patterns. |

## Agent

| Agent | Description |
|---|---|
| **Observability Reviewer** | Reviews Fabric observability practices for signal quality, alert reliability, runbook completeness, and SLO integrity. |

## Trigger Keywords

The skill activates when conversations mention: `fabric monitor hub`, `pipeline failure triage`, `fabric notebook reliability`, `fabric sla tracking`, `fabric alerting`, `incident diagnostics fabric`, `fabric runbook`, `job failure pattern fabric`.

## Author

Markus Ahling
