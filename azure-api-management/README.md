# azure-api-management

Azure API Management operations - API inventory, policy drift detection, key rotation workflows, and contract diff checks across revisions.

## Purpose

This plugin is a knowledge plugin for Azure API Management workflows. It provides deterministic command guidance and review patterns, and does not include runtime MCP servers.

## Prerequisites

- Microsoft tenant access for the target workload.
- Required scopes or roles: `API Management Service Contributor`, `Reader`
- Redaction and fail-fast behavior must follow the shared integration contract.

## Install

```bash
/plugin install azure-api-management@claude-m-microsoft-marketplace
```

## Integration Context Contract
- Canonical contract: [`docs/integration-context.md`](../docs/integration-context.md)

| Command family | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Azure API Management operations | required | required | `AzureCloud`* | service-principal or delegated-user | `API Management Service Contributor`, `Reader` |

* Use sovereign cloud values from the canonical contract when applicable.

Commands must fail fast before network calls when required context is missing or invalid. All outputs must redact sensitive IDs and secrets.

## Commands

| Command | Description |
|---|---|
| `/apim-setup` | Run apim setup workflow. |
| `/apim-api-inventory` | Run apim api inventory workflow. |
| `/apim-policy-drift` | Run apim policy drift workflow. |
| `/apim-secret-rotation` | Run apim secret rotation workflow. |
| `/apim-contract-diff` | Run apim contract diff workflow. |

## Agent

| Agent | Description |
|---|---|
| `azure-api-management-reviewer` | Reviews command and skill docs for API correctness, permissions, and safety checks. |

## Trigger Keywords

- `apim`
- `azure api management`
- `api policy`
- `api revision`
- `api contract diff`
