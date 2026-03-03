---
name: capacity-monitor
description: Analyze Fabric capacity utilization, burst behavior, and saturation windows to identify pressure points.
argument-hint: "[--window <24h|7d|30d>] [--workload <type>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Capacity Monitor

Run a structured utilization review to separate normal burst patterns from sustained saturation.

## Prerequisites

- Fabric capacity admin or delegated operations permissions.
- Access to Fabric Capacity Metrics app and workspace monitor data.
- Known business SLAs for interactive and scheduled workloads.
- Budget and guardrail targets for cost-performance decisions.

## Steps

1. Collect CU utilization trends by workload and time window.
2. Identify sustained saturation, backlog accumulation, and smoothing impacts.
3. Correlate peak windows with specific artifacts and schedules.
4. Rank optimization opportunities by impact versus effort.

## Output

- Utilization report with peak windows and pressure drivers.
- Prioritized optimization candidates for next tuning cycle.
