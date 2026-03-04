---
name: environment-manage
description: Manage Fabric runtime environments through deterministic create, update, validation, and retire workflows.
argument-hint: "[--workspace <id>] [--environment <name>] [--action <create|update|validate|retire>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# environment-manage

## Prerequisites and Permissions

- Integration context validated against [`docs/integration-context.md`](../../docs/integration-context.md).
- Caller has environment administration rights for the target Fabric workspace.
- Environment action is explicit and approved for the target runtime stage.

## Deterministic Steps

1. Validate context fields, cloud boundary, and minimum environment role grants.
2. Resolve the target environment and collect current configuration state.
3. Validate action preconditions:
   - `create`: environment name and key attributes are available.
   - `update`: target exists and change scope is approved.
   - `validate`: target exists and status endpoints are reachable.
   - `retire`: dependencies and rollback ownership are confirmed.
4. Apply the requested change with one controlled mutation batch.
5. Verify post-change state including environment status and dependency health.
6. Return a redacted outcome report with applied changes and unresolved risks.

## Fail-Fast and Redaction

- Stop before write operations if context, permission, or dependency checks fail.
- Require explicit confirmation for retire and high-impact updates.
- Redact tenant/workspace/environment IDs and secret-bearing fields in all outputs.
