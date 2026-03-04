# azure-service-bus

Azure messaging operations for Service Bus and event-driven workloads - lag scans, dead-letter replay planning, stale subscription cleanup, and namespace quota checks.

## Purpose

This plugin is a knowledge plugin for Azure Service Bus workflows. It provides deterministic command guidance and review patterns, and does not include runtime MCP servers.

## Prerequisites

- Microsoft tenant access for the target workload.
- Required scopes or roles: `Azure Service Bus Data Owner`, `Reader`
- Redaction and fail-fast behavior must follow the shared integration contract.

## Install

```bash
/plugin install azure-service-bus@claude-m-microsoft-marketplace
```

## Integration Context Contract
- Canonical contract: [`docs/integration-context.md`](../docs/integration-context.md)

| Command family | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Azure Service Bus operations | required | required | `AzureCloud`* | service-principal or delegated-user | `Azure Service Bus Data Owner`, `Reader` |

* Use sovereign cloud values from the canonical contract when applicable.

Commands must fail fast before network calls when required context is missing or invalid. All outputs must redact sensitive IDs and secrets.

## Commands

| Command | Description |
|---|---|
| `/service-bus-setup` | Run service bus setup workflow. |
| `/service-bus-lag-scan` | Run service bus lag scan workflow. |
| `/service-bus-deadletter-replay-plan` | Run service bus deadletter replay plan workflow. |
| `/service-bus-stale-subscription-cleanup` | Run service bus stale subscription cleanup workflow. |
| `/service-bus-namespace-quota-check` | Run service bus namespace quota check workflow. |

## Agent

| Agent | Description |
|---|---|
| `azure-service-bus-reviewer` | Reviews command and skill docs for API correctness, permissions, and safety checks. |

## Trigger Keywords

- `azure service bus`
- `queue lag`
- `dead letter`
- `subscription cleanup`
- `namespace quota`
