---
name: observability-setup
description: Set up Fabric observability with SLO definitions, signal inventory, and incident ownership.
argument-hint: "[--workspace <name>] [--service <name>] [--minimal]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Observability Setup

Establish baseline reliability signals and ownership before triaging incidents.

## Prerequisites

- Access to Monitor Hub, pipeline history, notebook run details, and workspace logs.
- Defined service-level objectives for freshness, latency, and success rate.
- Alert routing channels with clear on-call ownership.
- Runbook location for incident response and postmortems.

## Steps

1. Define SLOs for success rate, freshness, and end-to-end latency.
2. Inventory telemetry signals from notebooks, pipelines, and refreshes.
3. Map alert routes to owners and escalation paths.
4. Document incident lifecycle expectations and postmortems.

## Output

- Observability baseline with SLOs and signal coverage.
- Ownership map for alert response and incident escalation.
