---
name: user-data-function-manage
description: Manage Fabric user data functions with deterministic packaging, deployment, versioning, and rollback checks.
argument-hint: "[--workspace <id>] [--function <name>] [--action <publish|update|validate|retire>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# user-data-function-manage

## Prerequisites and Permissions

- Integration context validated against [`docs/integration-context.md`](../../docs/integration-context.md).
- Caller has function deployment permissions in the target Fabric workspace.
- Function package source, runtime dependencies, and owner approval are available.

## Deterministic Steps

1. Validate context, role grants, and action value.
2. Resolve target function identity and read current deployment/version state.
3. Validate package integrity and compatibility with the target environment runtime.
4. Apply requested action:
   - `publish` or `update`: deploy package and capture version metadata.
   - `validate`: run read-only health and dependency checks.
   - `retire`: require explicit approval and rollback fallback.
5. Verify function status, binding integrity, and invocation readiness after mutation.
6. Return a redacted summary with version delta, verification outcomes, and next actions.

## Fail-Fast and Redaction

- Fail fast on missing package metadata, invalid context, or insufficient permissions.
- Block retire unless rollback path and owner approval are present.
- Redact identifiers and never print function secrets or connection credentials.
