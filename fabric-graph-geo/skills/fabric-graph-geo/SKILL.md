---
name: Fabric Graph And Geo
description: >
  Microsoft Fabric graph and geospatial analytics - graph model, graph queryset, map,
  and exploration workflows with preview guardrails.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - fabric graph
  - graph model
  - graph queryset
  - map manage
  - geospatial analytics
  - exploration workflow
  - preview guardrails
---

# Fabric Graph And Geo

## Integration Context Contract

- Canonical contract: [`docs/integration-context.md`](../../../docs/integration-context.md)

| Workflow | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Graph and geospatial analytics workflows | required | optional (required for Azure-linked data paths) | `AzureCloud`* | `delegated-user` or `service-principal` | Fabric workspace read/write permissions and query execution grants |

* Use sovereign cloud values from the canonical contract where applicable.

Fail fast before any network/API call when required context or permissions are missing.
Redact tenant, subscription, workspace, item, principal, and query-identifying values in output.

## Preview Caveat

Graph and geospatial capabilities used by this skill are preview-heavy. Query behavior, model constraints, rendering options, and API contracts can change; always validate against current tenant behavior before broad rollout.

## Command Surface

| Command | Purpose |
|---|---|
| `graph-geo-setup` | Validate prerequisites, context, and preview readiness for graph/geospatial workflows. |
| `graph-model-manage` | Manage graph model entities, relationships, and integrity checks. |
| `graph-queryset-manage` | Manage graph queryset definitions and deterministic query validation. |
| `map-manage` | Manage map definitions, layer mappings, and render constraints. |
| `exploration-manage` | Manage exploration workflows across graph patterns and map views. |

## Guardrails

1. Validate integration context and permission grants before any API call.
2. Run read-only baseline discovery first.
3. Require explicit confirmation before destructive or broad-impact mutations.
4. Verify post-change state with deterministic read-back checks.
5. Return redacted output with no secrets.

## Progressive Disclosure - Reference Files

| Topic | File |
|---|---|
| API and query patterns for graph and geospatial workflows | [`references/api-patterns.md`](./references/api-patterns.md) |
