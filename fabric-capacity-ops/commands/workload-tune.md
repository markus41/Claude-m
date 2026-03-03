---
name: workload-tune
description: Tune workload settings, scheduling, and concurrency controls to improve Fabric capacity efficiency.
argument-hint: "[--focus <latency|throughput|cost>] [--target-workload <type>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Workload Tune

Apply practical workload tuning changes with measurable before-and-after criteria.

## Prerequisites

- Fabric capacity admin or delegated operations permissions.
- Access to Fabric Capacity Metrics app and workspace monitor data.
- Known business SLAs for interactive and scheduled workloads.
- Budget and guardrail targets for cost-performance decisions.

## Steps

1. Select optimization objective and acceptable trade-offs.
2. Adjust workload priorities and schedule distribution.
3. Validate impact using controlled baseline comparisons.
4. Document retained settings and rollback triggers.

## Output

- Tuning plan with expected and observed impact.
- Rollback-safe configuration record for operations.
