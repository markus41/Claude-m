---
name: digital-twin-builder-manage
description: Manage Fabric digital twin builder workflows with deterministic checks and preview guardrails.
argument-hint: "<create|update|list|delete|validate> [options]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Digital Twin Builder Manage

Manage digital twin builder assets, topology links, and validation workflows.

## Preview Caveat

Digital twin builder APIs and models are preview and may change in topology rules, limits, and execution behavior.

## Prerequisites And Permissions

- `/ai-agents-setup` baseline completed.
- Workspace read/write access for digital twin artifacts.
- Access to linked ontology or graph dependencies used by the twin model.
- Integration context and permission checks per [`docs/integration-context.md`](../../docs/integration-context.md).

## Deterministic Steps

1. Validate action intent and required twin model identifiers.
2. Capture current twin topology and dependency baseline.
3. Apply requested mutation or execute validation-only run.
4. Re-query topology links and model status for post-change verification.
5. Return redacted output including drift, integrity findings, and next actions.

## Fail-Fast And Redaction

- Fail early on missing context, permissions, or dependency identifiers.
- Require explicit confirmation for delete and broad-impact mutations.
- Redact tenant/workspace/item IDs; never output tokens or secret fields.

## Output

- Operation status with verification result.
- Topology integrity findings and compatibility notes.
- Ordered remediation steps for any failed checks.
