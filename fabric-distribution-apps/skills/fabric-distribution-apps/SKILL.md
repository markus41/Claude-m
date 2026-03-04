---
name: fabric-distribution-apps
description: >
  Microsoft Fabric org app distribution - package, permission model, release,
  and adoption workflows for organizational app rollout.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - fabric org app
  - fabric app rollout
  - fabric app package
  - fabric app permissions
  - fabric app adoption
---

# fabric-distribution-apps

## Preview Caveat

Fabric organizational app distribution capabilities are preview. Validate current API behavior, portal sequence, and role model before production use.

## Integration Context Contract
- Canonical contract: [`docs/integration-context.md`](../../../docs/integration-context.md)

| Workflow | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Fabric org app distribution workflows | required | optional | `AzureCloud`* | delegated-user or service-principal | `Fabric Tenant Admin` or app distribution publisher role |

* Use sovereign cloud values from the canonical contract when applicable.

Fail fast before API calls when required context is missing or malformed. Redact tenant, app, audience, and object identifiers.

## Command Surface

| Command | Purpose |
|---|---|
| `org-app-setup` | Deterministic setup for preview readiness and rollout guardrails. |
| `org-app-package` | Deterministic packaging and artifact validation workflow. |
| `org-app-permission-model` | Deterministic permission model and least-privilege validation workflow. |
| `org-app-release` | Deterministic staged release workflow with rollback controls. |
| `org-app-adoption-report` | Deterministic adoption reporting workflow for distributed org apps. |

## Guardrails

1. Validate preview availability and permissions before any write action.
2. Validate integration context and grants before network calls.
3. Require explicit approval for audience expansion and production release.
4. Verify release and permission state after every mutation batch.
5. Return structured redacted output with clear next actions.

## Progressive Disclosure - Reference Files

| Topic | File |
|---|---|
| Packaging, release, permission, and adoption API patterns | [`references/api-patterns.md`](./references/api-patterns.md) |
