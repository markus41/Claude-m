---
name: Fabric AI Agents
description: >
  Microsoft Fabric AI and operations agents - anomaly detector, data agent, operations agent,
  ontology, and digital twin builder workflows with preview guardrails.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - fabric ai agent
  - anomaly detector
  - data agent
  - operations agent
  - ontology
  - digital twin builder
  - preview guardrails
---

# Fabric AI Agents

## Integration Context Contract

- Canonical contract: [`docs/integration-context.md`](../../../docs/integration-context.md)

| Workflow | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| AI and operations agent workflows | required | optional (required only for Azure-linked sources) | `AzureCloud`* | `delegated-user` or `service-principal` | Fabric workspace read/write permissions plus workflow-specific API grants |

* Use sovereign cloud values from the canonical contract where applicable.

Fail fast before any network/API call when context fields are missing, malformed, or cloud-incompatible.
Redact tenant, subscription, workspace, item, object, and principal identifiers in all outputs.

## Preview Caveat

These workflows depend on preview-heavy Fabric surfaces. Treat model schemas, endpoint behavior, limits, and permissions as change-prone. Validate in the target tenant at run time and avoid assuming GA stability.

## Command Surface

| Command | Purpose |
|---|---|
| `ai-agents-setup` | Validate prerequisites, context, and preview readiness for AI agent workflows. |
| `anomaly-detector-manage` | Manage anomaly detector definitions, thresholds, and verification loops. |
| `data-agent-manage` | Manage data agent lifecycle, grounding sources, and validation checks. |
| `operations-agent-manage` | Manage operations agent lifecycle and incident/runbook integration workflows. |
| `ontology-manage` | Manage ontology model definitions, mappings, and compatibility checks. |
| `digital-twin-builder-manage` | Manage digital twin builder definitions, graph links, and validation checks. |

## Guardrails

1. Validate integration context and minimum permissions first.
2. Prefer read-only discovery before any mutating step.
3. Require explicit user confirmation for destructive or bulk changes.
4. Run post-change verification queries and compare with baseline.
5. Return structured output with redacted identifiers and no secrets.

## Progressive Disclosure - Reference Files

| Topic | File |
|---|---|
| API and workflow patterns for preview-safe execution | [`references/api-patterns.md`](./references/api-patterns.md) |
