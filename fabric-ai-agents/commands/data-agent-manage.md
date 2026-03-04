---
name: data-agent-manage
description: Manage Fabric data agent lifecycle and grounding workflows with preview guardrails.
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

# Data Agent Manage

Manage data agent definitions, data grounding bindings, and lifecycle checks.

## Preview Caveat

Data agent behavior and grounding contracts are preview and may change. Validate schema and permissions each run.

## Prerequisites And Permissions

- Completed `/ai-agents-setup` baseline.
- Workspace read/write access for data agent artifacts.
- Access to referenced data sources with least-privilege grants.
- Integration context compliance per [`docs/integration-context.md`](../../docs/integration-context.md).

## Deterministic Steps

1. Validate requested action and required identifiers/bindings.
2. Read current data agent state and referenced grounding source metadata.
3. Apply requested changes with minimal mutation scope.
4. Run post-change connectivity and configuration checks.
5. Produce a redacted summary with unresolved risks and rollback path.

## Fail-Fast And Redaction

- Stop before API calls if context, permissions, or source bindings are incomplete.
- Reject mutation when referenced sources are unavailable or incompatible.
- Redact all IDs and never disclose credentials or connection secrets.

## Output

- Lifecycle action outcome and validation status.
- Grounding source check results.
- Redacted change summary and follow-up actions.
