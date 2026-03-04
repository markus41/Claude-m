# azure-service-health

Azure Service Health operations - active incident watchlists, impact scoring, runbook mapping, and communications-ready outage summaries.

## Purpose

This plugin is a knowledge plugin for Azure Service Health workflows. It provides deterministic command guidance and review patterns, and does not include runtime MCP servers.

## Prerequisites

- Microsoft tenant access for the target workload.
- Required scopes or roles: `Reader`, `Monitoring Reader`
- Redaction and fail-fast behavior must follow the shared integration contract.

## Install

```bash
/plugin install azure-service-health@claude-m-microsoft-marketplace
```

## Integration Context Contract
- Canonical contract: [`docs/integration-context.md`](../docs/integration-context.md)

| Command family | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Azure Service Health operations | required | required | `AzureCloud`* | service-principal or delegated-user | `Reader`, `Monitoring Reader` |

* Use sovereign cloud values from the canonical contract when applicable.

Commands must fail fast before network calls when required context is missing or invalid. All outputs must redact sensitive IDs and secrets.

## Commands

| Command | Description |
|---|---|
| `/service-health-setup` | Run service health setup workflow. |
| `/service-health-watchlist` | Run service health watchlist workflow. |
| `/service-health-runbook-map` | Run service health runbook map workflow. |
| `/service-health-impact-score` | Run service health impact score workflow. |
| `/service-health-comms-summary` | Run service health comms summary workflow. |

## Agent

| Agent | Description |
|---|---|
| `azure-service-health-reviewer` | Reviews command and skill docs for API correctness, permissions, and safety checks. |

## Trigger Keywords

- `azure service health`
- `service advisory`
- `incident watchlist`
- `impact score`
- `outage summary`
