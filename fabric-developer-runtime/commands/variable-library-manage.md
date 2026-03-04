---
name: variable-library-manage
description: Govern Fabric variable libraries with deterministic lifecycle controls, least-privilege validation, and redacted outputs.
argument-hint: "[--workspace <id>] [--library <name>] [--action <create|update|rotate|retire>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# variable-library-manage

## Prerequisites and Permissions

- Integration context validated against [`docs/integration-context.md`](../../docs/integration-context.md).
- Caller has variable library governance permissions in the target workspace.
- Variable classification rules (secret vs non-secret) are defined before change execution.

## Deterministic Steps

1. Validate context, role grants, and requested library action.
2. Resolve target library and collect current variable metadata (names, classifications, owners).
3. Validate action preconditions:
   - `create`: library name and ownership are available.
   - `update`: update scope does not violate least-privilege policy.
   - `rotate`: rotation plan and validation probe are defined.
   - `retire`: downstream dependency and rollback path are confirmed.
4. Apply one controlled change unit and capture operation metadata.
5. Re-read library state and verify policy conformance after mutation.
6. Return a redacted summary with policy deviations, resolved items, and follow-ups.

## Fail-Fast and Redaction

- Stop on missing integration context, invalid role grants, or policy violations.
- Require explicit confirmation for retire and broad-scope updates.
- Redact sensitive IDs and mask all secret variable values in full.
