---
name: capacity-setup
description: Prepare Fabric capacity operations by defining workload priorities, SLAs, and baseline telemetry.
argument-hint: "[--capacity <name>] [--slo <profile>] [--minimal]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Capacity Setup

Establish a baseline operating model for capacity tuning and incident response.

## Prerequisites

- Fabric capacity admin or delegated operations permissions.
- Access to Fabric Capacity Metrics app and workspace monitor data.
- Known business SLAs for interactive and scheduled workloads.
- Budget and guardrail targets for cost-performance decisions.

## Steps

1. Document capacity scope, owners, and change control policy.
2. Define workload classes and priority expectations.
3. Capture baseline metrics for CU consumption and queueing.
4. Set SLO targets and escalation thresholds by workload class.

## Output

- Capacity baseline profile with ownership and SLOs.
- Missing telemetry or governance prerequisites to resolve first.
