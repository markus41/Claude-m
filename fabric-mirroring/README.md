# Fabric Mirroring Plugin

`fabric-mirroring` is an advanced Microsoft Fabric knowledge plugin for operationally safe mirrored data pipelines with CDC health and reconciliation controls.

## What This Plugin Provides

This is a **knowledge plugin**. It provides implementation guidance, deterministic command workflows, and reviewer checks. It does not include runtime binaries or MCP servers.

Install with:

```bash
/plugin install fabric-mirroring@claude-m-microsoft-marketplace
```

## Prerequisites

- Supported source systems configured for Fabric Mirroring.
- Network and identity access from Fabric to source databases.
- Ownership for source schema changes and downstream consumers.
- Defined freshness targets and reconciliation tolerances.

## Setup

Run `/mirroring-setup` first to baseline environment, permissions, and rollout constraints.

## Commands

| Command | Description |
|---|---|
| `/mirroring-setup` | Prepare Fabric Mirroring by validating source readiness, connectivity, identity, and target workspace controls. |
| `/source-onboarding` | Onboard a new source to Fabric Mirroring with controlled table scope and replication guardrails. |
| `/latency-health-check` | Assess mirroring latency and replication health against defined freshness targets. |
| `/cdc-reconciliation` | Reconcile mirrored datasets with source-of-truth systems to validate CDC completeness and integrity. |

## Agent

| Agent | Description |
|---|---|
| **Mirroring Reviewer** | Reviews Fabric Mirroring implementations for source onboarding safety, CDC integrity, latency controls, and reconciliation rigor. |

## Trigger Keywords

The skill activates when conversations mention: `fabric mirroring`, `mirrored database`, `cdc lag`, `replication health`, `schema drift mirroring`, `fabric reconciliation`, `source onboarding fabric`, `mirroring incident`.

## Author

Markus Ahling
