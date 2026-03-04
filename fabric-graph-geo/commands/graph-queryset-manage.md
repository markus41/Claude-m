---
name: graph-queryset-manage
description: Manage Fabric graph querysets with deterministic validation and preview guardrails.
argument-hint: "<create|update|list|delete|validate|execute> [options]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Graph Queryset Manage

Manage graph queryset definitions, validation, and execution checks.

## Preview Caveat

Graph queryset behavior is preview and may vary as query engines and graph features evolve.

## Prerequisites And Permissions

- `/graph-geo-setup` baseline complete.
- Workspace read/write access for queryset artifacts; query execution permissions.
- Integration context contract compliance per [`docs/integration-context.md`](../../docs/integration-context.md).
- Query safety constraints defined for expensive or broad scans.

## Deterministic Steps

1. Validate requested action and required queryset identifiers.
2. Capture current queryset definition and execution baseline.
3. Apply requested mutation or execute validation-only query run.
4. Re-run deterministic verification query set and compare outcomes.
5. Return redacted results with drift/performance notes.

## Fail-Fast And Redaction

- Fail on missing context, invalid query mode, or insufficient query permissions.
- Reject execute operations that violate defined safety constraints.
- Redact workspace/item/query identifiers and suppress sensitive data payloads.

## Output

- Queryset lifecycle operation result.
- Validation or execution summary with redacted identifiers.
- Follow-up actions for drift, failures, or safety policy violations.
