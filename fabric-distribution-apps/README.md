# fabric-distribution-apps

Microsoft Fabric org app distribution - package, permission model, release, and adoption workflows for organizational app rollout.

## Purpose

This plugin is a knowledge plugin for Fabric organizational app rollout workflows. It provides deterministic command guidance and review patterns, and does not include runtime MCP servers.

## Preview Caveat

Fabric organizational app distribution capabilities are preview. API contracts, portal flows, and role requirements can change; validate current behavior before production rollout.

## Prerequisites

- Microsoft Fabric tenant access with organizational app distribution features enabled.
- Tenant/workspace permissions for app packaging, release, and audience assignment.
- Required permissions baseline: `Fabric Tenant Admin` or delegated publisher governance role.

## Install

```bash
/plugin install fabric-distribution-apps@claude-m-microsoft-marketplace
```

## Integration Context Contract
- Canonical contract: [`docs/integration-context.md`](../docs/integration-context.md)

| Command family | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Fabric org app distribution workflows | required | optional | `AzureCloud`* | delegated-user or service-principal | `Fabric Tenant Admin` or app distribution publisher role |

* Use sovereign cloud values from the canonical contract when applicable.

Commands must fail fast before network calls when required context is missing or invalid. All outputs must redact sensitive IDs, audience identifiers, and credential material.

## Commands

| Command | Description |
|---|---|
| `/org-app-setup` | Validate preview readiness, rollout scope, and operational guardrails. |
| `/org-app-package` | Build and validate org app package metadata and release artifacts. |
| `/org-app-permission-model` | Define and validate least-privilege org app permission model. |
| `/org-app-release` | Execute staged org app release workflow with approval gates and rollback checks. |
| `/org-app-adoption-report` | Produce redacted adoption and rollout health reporting for org app distribution. |

## Agent

| Agent | Description |
|---|---|
| `fabric-distribution-apps-reviewer` | Reviews org app docs for preview caveats, permission safety, deterministic steps, and redaction quality. |

## Trigger Keywords

- `fabric org app`
- `fabric app rollout`
- `fabric app package`
- `fabric app permissions`
- `fabric app adoption`
