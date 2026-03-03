---
name: notebook-pipeline-slo
description: Define and validate notebook and pipeline SLOs with measurement logic, error budgets, and breach handling.
argument-hint: "<workload> [--slo-profile <critical|standard>] [--window <30d>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Notebook Pipeline SLO

Create measurable SLO contracts that drive operational decisions and release discipline.

## Prerequisites

- Access to Monitor Hub, pipeline history, notebook run details, and workspace logs.
- Defined service-level objectives for freshness, latency, and success rate.
- Alert routing channels with clear on-call ownership.
- Runbook location for incident response and postmortems.

## Steps

1. Define SLI formulas for success, freshness, and latency.
2. Set SLO targets and error budgets aligned to expectations.
3. Define breach detection, alert thresholds, and response policy.
4. Review historical performance against target realism.

## Output

- SLO definition pack with SLI formulas and thresholds.
- Error-budget policy for release and incident decisions.
