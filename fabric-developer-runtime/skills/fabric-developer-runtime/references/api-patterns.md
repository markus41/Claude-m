# Fabric Developer Runtime API Patterns

Use these patterns for deterministic runtime operations in Fabric.

## Prerequisites

- Confirm runtime features are enabled for the target workspace.
- Confirm caller has runtime administration rights for target assets.
- Confirm integration context matches [`docs/integration-context.md`](../../../../docs/integration-context.md).

## Core Operation Pattern

1. Validate required context fields and minimum role grants.
2. Run read-only discovery for current runtime, environment, function, and variable state.
3. Build a change plan with explicit action type: create, update, rotate, or retire.
4. Execute one change unit at a time with operation-level verification.
5. Re-read final state and return a redacted delta summary.

## Governance Controls

- Use fail-fast contract errors for missing or invalid context.
- Use least privilege for runtime changes; avoid broad tenant-scoped writes when workspace scope is sufficient.
- Require explicit confirmation for destructive actions.
- Redact IDs and never print secret values in response payloads.

## Recommended Output Sections

- `Execution Scope`
- `Validated Permissions`
- `Change Plan`
- `Applied Changes`
- `Post-Change Verification`
- `Residual Risks`
