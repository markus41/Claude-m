# Fabric Capacity Operations Plugin

`fabric-capacity-ops` is an advanced Microsoft Fabric knowledge plugin for capacity reliability and cost-performance tuning across Fabric workloads.

## What This Plugin Provides

This is a **knowledge plugin**. It provides implementation guidance, deterministic command workflows, and reviewer checks. It does not include runtime binaries or MCP servers.

Install with:

```bash
/plugin install fabric-capacity-ops@claude-m-microsoft-marketplace
```

## Prerequisites

- Fabric capacity admin or delegated operations permissions.
- Access to Fabric Capacity Metrics app and workspace monitor data.
- Known business SLAs for interactive and scheduled workloads.
- Budget and guardrail targets for cost-performance decisions.

## Setup

Run `/capacity-setup` first to baseline environment, permissions, and rollout constraints.

## Commands

| Command | Description |
|---|---|
| `/capacity-setup` | Prepare Fabric capacity operations by defining workload priorities, SLAs, and baseline telemetry. |
| `/capacity-monitor` | Analyze Fabric capacity utilization, burst behavior, and saturation windows to identify pressure points. |
| `/throttling-diagnose` | Diagnose Fabric throttling events and identify root causes across competing workloads and schedule collisions. |
| `/workload-tune` | Tune workload settings, scheduling, and concurrency controls to improve Fabric capacity efficiency. |

## Agent

| Agent | Description |
|---|---|
| **Capacity Ops Reviewer** | Reviews Fabric capacity operations for utilization accuracy, throttling analysis quality, and workload tuning safety. |

## Trigger Keywords

The skill activates when conversations mention: `fabric capacity`, `cu utilization`, `fabric throttling`, `workload settings fabric`, `fabric autoscale`, `capacity metrics app`, `fabric concurrency`, `cost performance fabric`.

## Author

Markus Ahling
