# defender-endpoint

Microsoft Defender for Endpoint operations - incident triage, machine isolation, live response package metadata checks, and evidence summary generation.

## Purpose

This plugin is a knowledge plugin for Defender Endpoint workflows. It provides deterministic command guidance and review patterns, and does not include runtime MCP servers.

## Prerequisites

- Microsoft tenant access for the target workload.
- Required scopes or roles: `SecurityAlert.Read.All`, `SecurityIncident.Read.All`, `ThreatHunting.Read.All`, `Machine.Isolate`
- Redaction and fail-fast behavior must follow the shared integration contract.

## Install

```bash
/plugin install defender-endpoint@claude-m-microsoft-marketplace
```

## Integration Context Contract
- Canonical contract: [`docs/integration-context.md`](../docs/integration-context.md)

| Command family | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Defender Endpoint operations | required | optional | `AzureCloud`* | service-principal or delegated-user | `SecurityAlert.Read.All`, `SecurityIncident.Read.All`, `ThreatHunting.Read.All`, `Machine.Isolate` |

* Use sovereign cloud values from the canonical contract when applicable.

Commands must fail fast before network calls when required context is missing or invalid. All outputs must redact sensitive IDs and secrets.

## Commands

| Command | Description |
|---|---|
| `/defender-endpoint-setup` | Run defender endpoint setup workflow. |
| `/defender-endpoint-triage` | Run defender endpoint triage workflow. |
| `/defender-endpoint-isolate-machine` | Run defender endpoint isolate machine workflow. |
| `/defender-endpoint-live-response-metadata` | Run defender endpoint live response metadata workflow. |
| `/defender-endpoint-evidence-summary` | Run defender endpoint evidence summary workflow. |

## Agent

| Agent | Description |
|---|---|
| `defender-endpoint-reviewer` | Reviews command and skill docs for API correctness, permissions, and safety checks. |

## Trigger Keywords

- `defender endpoint`
- `endpoint triage`
- `isolate machine`
- `live response`
- `endpoint evidence`
