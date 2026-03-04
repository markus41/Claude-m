---
name: service-bus-lag-scan
description: Execute the service bus lag scan workflow with deterministic validation and redacted output.
argument-hint: "[options]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Service Bus Lag Scan

Run the service bus lag scan workflow for azure-service-bus.

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
| Primary workflow query | GET | `/service-bus-lag-scan` |
| Follow-up verification | GET | `/azure-service-bus/verification` |

## Output

- Markdown summary with findings, actions, and unresolved risks.
- Redacted identifiers and no secret or token material.

