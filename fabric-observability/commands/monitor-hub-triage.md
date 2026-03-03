---
name: monitor-hub-triage
description: Triage Fabric failures and degradations from Monitor Hub with repeatable severity and dependency analysis.
argument-hint: "<time-window> [--severity <sev1|sev2|sev3>] [--workload <type>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Monitor Hub Triage

Use Monitor Hub data to classify incidents quickly and isolate highest-impact breakpoints.

## Prerequisites

- Access to Monitor Hub, pipeline history, notebook run details, and workspace logs.
- Defined service-level objectives for freshness, latency, and success rate.
- Alert routing channels with clear on-call ownership.
- Runbook location for incident response and postmortems.

## Steps

1. Collect failed and degraded runs from the scoped window.
2. Group failures by workload, owner, and dependency chain.
3. Classify severity by user impact, freshness breach, and business criticality.
4. Create containment actions and longer-term structural fixes.

## Output

- Triage report with incident clusters and top breakpoints.
- Action plan covering containment, fix, and verification.
