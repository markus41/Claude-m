---
name: fabric-developer-runtime
description: >
  Microsoft Fabric developer runtime operations - GraphQL API, environments, user data
  functions, and variable library governance.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - fabric developer runtime
  - fabric graphql api
  - fabric environment runtime
  - fabric user data function
  - fabric variable library
---

# fabric-developer-runtime

## Integration Context Contract
- Canonical contract: [`docs/integration-context.md`](../../../docs/integration-context.md)

| Workflow | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Fabric developer runtime operations | required | optional | `AzureCloud`* | delegated-user or service-principal | `Fabric Workspace Admin` (or equivalent runtime governance role) |

* Use sovereign cloud values from the canonical contract when applicable.

Fail fast before API calls when required context is missing or malformed. Redact tenant, workspace, environment, and object identifiers.

## Command Surface

| Command | Purpose |
|---|---|
| `runtime-setup` | Deterministic baseline workflow for runtime context and guardrails. |
| `graphql-api-manage` | Deterministic GraphQL API lifecycle management workflow. |
| `environment-manage` | Deterministic environment lifecycle management workflow. |
| `user-data-function-manage` | Deterministic user data function lifecycle workflow. |
| `variable-library-manage` | Deterministic variable library governance workflow. |

## Guardrails

1. Validate integration context schema and grants before API execution.
2. Start with read-only discovery and capture baseline state.
3. Require explicit confirmation before delete or replace operations.
4. Re-query post-change state and compare against intended outcome.
5. Return redacted output with unresolved risks and next actions.

## Progressive Disclosure - Reference Files

| Topic | File |
|---|---|
| Runtime API and governance patterns | [`references/api-patterns.md`](./references/api-patterns.md) |
