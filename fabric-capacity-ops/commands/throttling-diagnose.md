---
name: throttling-diagnose
description: Diagnose Fabric throttling events and identify root causes across competing workloads and schedule collisions.
argument-hint: "<incident-window> [--artifact <name>] [--severity <high|medium|low>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Throttling Diagnose

Perform targeted throttling analysis with explicit root-cause and mitigation outputs.

## Prerequisites

- Fabric capacity admin or delegated operations permissions.
- Access to Fabric Capacity Metrics app and workspace monitor data.
- Known business SLAs for interactive and scheduled workloads.
- Budget and guardrail targets for cost-performance decisions.

## Steps

1. Locate throttling intervals and affected artifacts.
2. Trace contention from concurrent refreshes, notebooks, and pipelines.
3. Validate whether issue is sizing, imbalance, or schedule design.
4. Define immediate mitigations plus structural fixes.

## Output

- Root-cause analysis for throttling incidents.
- Mitigation plan split into short-term and long-term actions.
