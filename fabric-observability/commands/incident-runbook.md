---
name: incident-runbook
description: Create Fabric incident runbooks for recurring notebook, pipeline, and refresh failure patterns.
argument-hint: "<incident-class> [--owner <team>] [--template <standard|extended>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Incident Runbook

Build actionable runbooks that reduce mean-time-to-recovery for common Fabric failures.

## Prerequisites

- Access to Monitor Hub, pipeline history, notebook run details, and workspace logs.
- Defined service-level objectives for freshness, latency, and success rate.
- Alert routing channels with clear on-call ownership.
- Runbook location for incident response and postmortems.

## Steps

1. Define incident trigger conditions and required diagnostics.
2. Document containment and recovery actions with decision points.
3. Add validation checks to confirm service recovery and data correctness.
4. Attach communication and postmortem steps with ownership.

## Output

- Operational runbook for the specified incident class.
- Recovery validation checklist and post-incident tasks.
