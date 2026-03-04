---
name: graphql-api-manage
description: Manage Fabric GraphQL API lifecycle with deterministic validation, guarded mutations, and post-change verification.
argument-hint: "[--workspace <id>] [--api <name>] [--action <create|update|validate|retire>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# graphql-api-manage

## Prerequisites and Permissions

- Integration context validated against [`docs/integration-context.md`](../../docs/integration-context.md).
- Caller has runtime API authoring rights in the target Fabric workspace.
- Action intent is explicit: `create`, `update`, `validate`, or `retire`.

## Deterministic Steps

1. Validate integration context and confirm GraphQL API management permissions.
2. Resolve target API object by immutable identifier and collect current schema/runtime metadata.
3. Validate action preconditions:
   - `create`: target name/route is unused.
   - `update`: target API exists and has no unresolved dependency blockers.
   - `validate`: schema and runtime config can be read.
   - `retire`: explicit owner approval is present.
4. Execute one mutation unit at a time and record operation references.
5. Re-run read operations to verify expected API status, schema binding, and publish state.
6. Return a redacted change summary with verification results and residual risks.

## Fail-Fast and Redaction

- Fail fast on missing context, unsupported action, or insufficient permissions.
- Require explicit confirmation before retire or destructive replacement actions.
- Redact identifiers and never include tokens, secrets, or private connection values.
