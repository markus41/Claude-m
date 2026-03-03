# Fabric Semantic Models Plugin

`fabric-semantic-models` is an advanced Microsoft Fabric knowledge plugin for Direct Lake semantic modeling, DAX quality controls, and deployment-safe model lifecycle management.

## What This Plugin Provides

This is a **knowledge plugin**. It provides implementation guidance, deterministic command workflows, and reviewer checks. It does not include runtime binaries or MCP servers.

Install with:

```bash
/plugin install fabric-semantic-models@claude-m-microsoft-marketplace
```

## Prerequisites

- Fabric workspace with Contributor or Admin permissions.
- XMLA endpoint access for deployment and model operations.
- Access to lakehouse or warehouse source tables used by semantic models.
- Power BI Desktop, Tabular Editor, or equivalent model authoring tooling.

## Setup

Run `/semantic-setup` first to baseline environment, permissions, and rollout constraints.

## Commands

| Command | Description |
|---|---|
| `/semantic-setup` | Prepare Fabric semantic modeling by validating workspace, XMLA endpoint, model source tables, and release boundaries. |
| `/directlake-model-design` | Design Direct Lake semantic models with clear grain, relationship strategy, and refresh-safe table layout. |
| `/dax-governance` | Define DAX standards for measure quality, time intelligence consistency, and performance-aware patterns. |
| `/xmla-deploy` | Plan and execute XMLA deployments for semantic models with diff review, rollback, and environment safety checks. |

## Agent

| Agent | Description |
|---|---|
| **Semantic Model Reviewer** | Reviews Fabric semantic model projects for data model grain, DAX quality, security role design, refresh policy, and deployment safety. |

## Trigger Keywords

The skill activates when conversations mention: `fabric semantic model`, `direct lake`, `dax governance`, `calculation groups`, `xmla endpoint`, `semantic link`, `incremental refresh fabric`, `tabular model fabric`.

## Author

Markus Ahling
