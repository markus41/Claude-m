---
name: latency-health-check
description: Assess mirroring latency and replication health against defined freshness targets.
argument-hint: "[--window <1h|24h|7d>] [--target-lag <minutes>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Latency Health Check

Run health checks to detect lag regressions before downstream consumers are impacted.

## Prerequisites

- Supported source systems configured for Fabric Mirroring.
- Network and identity access from Fabric to source databases.
- Ownership for source schema changes and downstream consumers.
- Defined freshness targets and reconciliation tolerances.

## Steps

1. Measure end-to-end lag for critical mirrored tables.
2. Identify latency hotspots by source, volume, and change-rate profile.
3. Correlate lag spikes with capacity pressure or source-side events.
4. Propose mitigations including scope and schedule tuning.

## Output

- Latency scorecard for critical mirrored assets.
- Mitigation recommendations for lag outliers and repeated incidents.
