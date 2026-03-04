---
name: defender-endpoint-setup
description: Execute the defender endpoint setup workflow with deterministic validation and redacted output.
argument-hint: "[options]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Defender Endpoint Setup

Run the defender endpoint setup workflow for defender-endpoint.

## Preconditions

- Validate integration context using [`docs/integration-context.md`](../../docs/integration-context.md).
- Confirm required scopes or roles are granted.
- Define safety gates before any mutating API call.

## Steps

1. Validate required context fields and fail fast on missing values.
2. Collect read-only baseline data for targets.
3. Execute the requested workflow with explicit safety checks.
4. Verify final state with post-action read operations.
5. Produce a redacted summary and next actions.

## Key Endpoints

| Operation | Method | Endpoint |
|---|---|---|
| Primary workflow query | GET | `/defender-endpoint-setup` |
| Follow-up verification | GET | `/defender-endpoint/verification` |

## Output

- Markdown summary with findings, actions, and unresolved risks.
- Redacted identifiers and no secret or token material.

