# fabric-developer-runtime

Microsoft Fabric developer runtime operations - GraphQL API, environments, user data functions, and variable library governance.

## Purpose

This plugin is a knowledge plugin for Fabric developer runtime workflows. It provides deterministic command guidance and review patterns, and does not include runtime MCP servers.

## Prerequisites

- Microsoft Fabric tenant access for the target workspace.
- Runtime and environment administration rights for target Fabric workspaces.
- Required permissions baseline: `Fabric Workspace Admin` or equivalent runtime governance role.

## Install

```bash
/plugin install fabric-developer-runtime@claude-m-microsoft-marketplace
```

## Integration Context Contract
- Canonical contract: [`docs/integration-context.md`](../docs/integration-context.md)

| Command family | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Fabric developer runtime operations | required | optional | `AzureCloud`* | delegated-user or service-principal | `Fabric Workspace Admin` (or equivalent runtime governance role) |

* Use sovereign cloud values from the canonical contract when applicable.

Commands must fail fast before network calls when required context is missing or invalid. All outputs must redact sensitive IDs, secrets, and credential material.

## Commands

| Command | Description |
|---|---|
| `/runtime-setup` | Baseline runtime governance context and execution safety gates. |
| `/graphql-api-manage` | Create, update, validate, or retire Fabric GraphQL API assets with deterministic checks. |
| `/environment-manage` | Manage Fabric runtime environments with explicit lifecycle controls. |
| `/user-data-function-manage` | Manage user data function packaging, deployment, and version governance. |
| `/variable-library-manage` | Govern variable libraries with least-privilege and redacted output controls. |

## Agent

| Agent | Description |
|---|---|
| `fabric-developer-runtime-reviewer` | Reviews runtime docs for context integrity, permissions, fail-fast checks, and redaction safety. |

## Trigger Keywords

- `fabric developer runtime`
- `fabric graphql api`
- `fabric environment runtime`
- `fabric user data function`
- `fabric variable library`
