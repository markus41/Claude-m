# fabric-graph-geo

Microsoft Fabric graph and geospatial analytics - graph model, graph queryset, map, and exploration workflows with preview guardrails.

Category: `analytics`

## Purpose

This is a knowledge plugin for planning and reviewing Fabric graph and geospatial workflows. It provides deterministic command guidance and reviewer checks, and does not include runtime MCP servers.

## Preview Caveat

Graph and geospatial capabilities in Fabric are preview-heavy. API shapes, query semantics, limits, and visualization behavior may change; validate assumptions in the target tenant before production rollout.

## Prerequisites

- Fabric-enabled tenant and workspace access.
- Workspace role that can read and manage graph/geospatial artifacts.
- Integration context with required identity fields and permissions.
- Any linked Azure data source permissions for hybrid scenarios.

## Integration Context Contract

- Canonical contract: [`docs/integration-context.md`](../docs/integration-context.md)

| Command family | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Graph and geospatial analytics workflows | required | optional (required for Azure-linked data paths) | `AzureCloud`* | `delegated-user` or `service-principal` | Fabric workspace read/write permissions and query execution grants |

* Use sovereign cloud values from the canonical contract where applicable.

Commands must fail fast before network calls when required context is missing or malformed. Output must redact tenant, subscription, workspace, item, and principal identifiers and must never expose secrets or tokens.

## Commands

| Command | Description |
|---|---|
| `/graph-geo-setup` | Validate workspace, context, and preview readiness for graph and geospatial workflows. |
| `/graph-model-manage` | Manage graph model assets, labels, relationships, and integrity checks. |
| `/graph-queryset-manage` | Manage graph querysets and deterministic validation for query behavior. |
| `/map-manage` | Manage geospatial map definitions, layers, and rendering guardrails. |
| `/exploration-manage` | Manage exploration workflows for graph and map-driven analysis. |

## Agent

| Agent | Description |
|---|---|
| `fabric-graph-geo-reviewer` | Reviews docs for preview caveats, deterministic command quality, permissions, fail-fast handling, and redaction coverage. |

## Trigger Keywords

- `fabric graph`
- `graph model`
- `graph queryset`
- `fabric map`
- `geospatial analytics`
- `graph exploration`
- `preview guardrails`
