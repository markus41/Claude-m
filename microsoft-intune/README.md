# microsoft-intune

Device lifecycle and compliance management for Microsoft Intune and Endpoint Manager - non-compliant device detection, lost device actions, compliance policy rollout, and app protection policy review.

## Purpose

This plugin is a knowledge plugin for Microsoft Intune workflows. It provides deterministic command guidance and review patterns, and does not include runtime MCP servers.

## Prerequisites

- Microsoft tenant access for the target workload.
- Required scopes or roles: `DeviceManagementManagedDevices.ReadWrite.All`, `DeviceManagementConfiguration.ReadWrite.All`, `DeviceManagementApps.Read.All`
- Redaction and fail-fast behavior must follow the shared integration contract.

## Install

```bash
/plugin install microsoft-intune@claude-m-microsoft-marketplace
```

## Integration Context Contract
- Canonical contract: [`docs/integration-context.md`](../docs/integration-context.md)

| Command family | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Microsoft Intune operations | required | optional | `AzureCloud`* | delegated-user or service-principal | `DeviceManagementManagedDevices.ReadWrite.All`, `DeviceManagementConfiguration.ReadWrite.All`, `DeviceManagementApps.Read.All` |

* Use sovereign cloud values from the canonical contract when applicable.

Commands must fail fast before network calls when required context is missing or invalid. All outputs must redact sensitive IDs and secrets.

## Commands

| Command | Description |
|---|---|
| `/intune-setup` | Run intune setup workflow. |
| `/intune-noncompliant-devices` | Run intune noncompliant devices workflow. |
| `/intune-lost-device-action` | Run intune lost device action workflow. |
| `/intune-compliance-policy-deploy` | Run intune compliance policy deploy workflow. |
| `/intune-app-protection-review` | Run intune app protection review workflow. |

## Agent

| Agent | Description |
|---|---|
| `microsoft-intune-reviewer` | Reviews command and skill docs for API correctness, permissions, and safety checks. |

## Trigger Keywords

- `microsoft intune`
- `intune`
- `endpoint manager`
- `non compliant device`
- `lost device`
- `compliance policy`
- `app protection policy`
