# azure-backup-recovery

Azure Backup and Site Recovery operations - job health checks, restore drill readiness, recovery plan audits, and cross-region resilience checks.

## Purpose

This plugin is a knowledge plugin for Azure Backup Recovery workflows. It provides deterministic command guidance and review patterns, and does not include runtime MCP servers.

## Prerequisites

- Microsoft tenant access for the target workload.
- Required scopes or roles: `Backup Reader`, `Site Recovery Contributor`, `Reader`
- Redaction and fail-fast behavior must follow the shared integration contract.

## Install

```bash
/plugin install azure-backup-recovery@claude-m-microsoft-marketplace
```

## Integration Context Contract
- Canonical contract: [`docs/integration-context.md`](../docs/integration-context.md)

| Command family | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Azure Backup Recovery operations | required | required | `AzureCloud`* | service-principal or delegated-user | `Backup Reader`, `Site Recovery Contributor`, `Reader` |

* Use sovereign cloud values from the canonical contract when applicable.

Commands must fail fast before network calls when required context is missing or invalid. All outputs must redact sensitive IDs and secrets.

## Commands

| Command | Description |
|---|---|
| `/backup-recovery-setup` | Run backup recovery setup workflow. |
| `/backup-job-health` | Run backup job health workflow. |
| `/backup-restore-drill` | Run backup restore drill workflow. |
| `/backup-recovery-plan-audit` | Run backup recovery plan audit workflow. |
| `/backup-cross-region-check` | Run backup cross region check workflow. |

## Agent

| Agent | Description |
|---|---|
| `azure-backup-recovery-reviewer` | Reviews command and skill docs for API correctness, permissions, and safety checks. |

## Trigger Keywords

- `azure backup`
- `site recovery`
- `backup health`
- `restore drill`
- `recovery plan`
