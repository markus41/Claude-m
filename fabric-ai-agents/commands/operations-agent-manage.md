---
name: operations-agent-manage
description: Manage Fabric operations agent workflows for monitoring and runbook response with preview guardrails.
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

# Operations Agent Manage

Manage operations agent definitions, execution policies, and runbook-oriented checks.

## Preview Caveat

Operations agent capabilities are preview-heavy and may change in execution semantics, policy options, and run APIs.

## Prerequisites And Permissions

- Completed `/ai-agents-setup` readiness check.
- Workspace write access for operations agent mutation actions.
- Access to linked observability and runbook resources (read/write as required).
- Integration context contract compliance per [`docs/integration-context.md`](../../docs/integration-context.md).

## Deterministic Steps

1. Validate action intent and required operation policy inputs.
2. Capture current agent state and linked runbook configuration baseline.
3. Apply requested create/update/delete/validate action.
4. Execute post-change status checks for agent health and bindings.
5. Return redacted results with drift findings and remediation actions.

## Fail-Fast And Redaction

- Fail on missing context, missing permissions, or invalid operation policy input.
- Require explicit user confirmation for destructive operations.
- Redact identifiers and suppress any secret material in output.

## Output

- Requested action result and health verification.
- Binding and drift status summary.
- Ordered remediation items when checks fail.
