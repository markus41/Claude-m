---
name: graph-model-manage
description: Manage Fabric graph model workflows with deterministic validation and preview guardrails.
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

# Graph Model Manage

Manage graph model entities, relationships, and integrity checks.

## Preview Caveat

Graph model capabilities are preview-heavy. Entity constraints, relationship semantics, and schema compatibility can change.

## Prerequisites And Permissions

- Run `/graph-geo-setup` before mutating workflows.
- Workspace read/write access for graph model artifacts.
- Integration context requirements in [`docs/integration-context.md`](../../docs/integration-context.md).
- Explicit confirmation required for delete or broad-impact updates.

## Deterministic Steps

1. Validate action mode and required graph model identifiers.
2. Read current model schema and relationship baseline.
3. Apply requested create/update/delete/validate action.
4. Re-read model and run integrity checks for expected state.
5. Return redacted change summary and rollback guidance.

## Fail-Fast And Redaction

- Fail immediately on missing context, permissions, or model identifiers.
- Block destructive action without explicit user confirmation.
- Redact IDs and never expose credentials or secrets.

## Output

- Action status and post-change integrity result.
- Redacted schema/relationship diff.
- Deterministic remediation steps for failures.
