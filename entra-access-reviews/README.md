# entra-access-reviews

Microsoft Entra access review automation - stale privileged access detection, review cycle drafting, remediation ticket generation, and status reporting.

## Purpose

This plugin is a knowledge plugin for Entra Access Reviews workflows. It provides deterministic command guidance and review patterns, and does not include runtime MCP servers.

## Prerequisites

- Microsoft tenant access for the target workload.
- Required scopes or roles: `AccessReview.ReadWrite.All`, `RoleManagement.Read.All`, `Directory.Read.All`
- Redaction and fail-fast behavior must follow the shared integration contract.

## Install

```bash
/plugin install entra-access-reviews@claude-m-microsoft-marketplace
```

## Integration Context Contract
- Canonical contract: [`docs/integration-context.md`](../docs/integration-context.md)

| Command family | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Entra Access Reviews operations | required | optional | `AzureCloud`* | delegated-user or service-principal | `AccessReview.ReadWrite.All`, `RoleManagement.Read.All`, `Directory.Read.All` |

* Use sovereign cloud values from the canonical contract when applicable.

Commands must fail fast before network calls when required context is missing or invalid. All outputs must redact sensitive IDs and secrets.

## Commands

| Command | Description |
|---|---|
| `/access-reviews-setup` | Run access reviews setup workflow. |
| `/access-reviews-stale-privileged` | Run access reviews stale privileged workflow. |
| `/access-reviews-cycle-draft` | Run access reviews cycle draft workflow. |
| `/access-reviews-remediation-tickets` | Run access reviews remediation tickets workflow. |
| `/access-reviews-status-report` | Run access reviews status report workflow. |

## Agent

| Agent | Description |
|---|---|
| `entra-access-reviews-reviewer` | Reviews command and skill docs for API correctness, permissions, and safety checks. |

## Trigger Keywords

- `access reviews`
- `entra access review`
- `stale privileged access`
- `review cycle`
- `access certification`
