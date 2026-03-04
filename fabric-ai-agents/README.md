# fabric-ai-agents

Microsoft Fabric AI and operations agents - anomaly detector, data agent, operations agent, ontology, and digital twin builder workflows with preview guardrails.

Category: `analytics`

## Purpose

This is a knowledge plugin for planning and reviewing Fabric AI agent workflows. It provides deterministic command guidance and reviewer checks, but does not ship runtime MCP servers or executable automation.

## Preview Caveat

Fabric AI agent surfaces in this plugin are preview-heavy. APIs, item schemas, role requirements, and limits can change between releases. Re-run setup and re-validate assumptions before production use.

## Prerequisites

- Fabric-enabled tenant and workspace access.
- Workspace role that can read and manage the target artifacts (Contributor or higher where mutation is required).
- Integration context with required identity fields and permissions.
- Microsoft/Azure permissions aligned to each workflow command.

## Integration Context Contract

- Canonical contract: [`docs/integration-context.md`](../docs/integration-context.md)

| Command family | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| AI and operations agent workflows | required | optional (required only for Azure-linked resources) | `AzureCloud`* | `delegated-user` or `service-principal` | Fabric workspace read/write permissions plus workload-specific API grants |

* Use sovereign cloud values from the canonical contract where applicable.

Commands must fail fast before network calls when required context is missing or invalid. Output must redact tenant, subscription, workspace, item, and principal identifiers and must never expose secrets or tokens.

## Commands

| Command | Description |
|---|---|
| `/ai-agents-setup` | Validate preview readiness, identity context, and workspace prerequisites for agent workflows. |
| `/anomaly-detector-manage` | Define and manage anomaly detector workflows with deterministic validation and rollback checks. |
| `/data-agent-manage` | Define and manage data agent workflows and grounding sources with preview-safe guardrails. |
| `/operations-agent-manage` | Define and manage operations agent workflows for monitoring and runbook responses. |
| `/ontology-manage` | Define and manage ontology assets, versioning, and compatibility checks. |
| `/digital-twin-builder-manage` | Define and manage digital twin builder workflows, model links, and validation checks. |

## Agent

| Agent | Description |
|---|---|
| `fabric-ai-agents-reviewer` | Reviews docs for preview caveats, permission coverage, fail-fast behavior, redaction, and deterministic command quality. |

## Trigger Keywords

- `fabric ai agent`
- `anomaly detector`
- `data agent`
- `operations agent`
- `fabric ontology`
- `digital twin builder`
- `preview guardrails`
