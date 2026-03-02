# Azure Key Vault Plugin

Azure Key Vault secrets, keys, and certificates management -- RBAC access control, rotation policies, managed identity integration, application references, and monitoring across Azure workloads.

## What This Plugin Provides

This is a **knowledge plugin** -- it gives Claude deep expertise in Azure Key Vault so it can provision vaults, manage secrets/keys/certificates, configure RBAC and network security, set up rotation policies, integrate with App Service and other Azure services via managed identity, and audit access patterns. It does not contain runtime code, MCP servers, or executable scripts.

## Setup

Run `/setup` to install Azure CLI and configure Key Vault access:

```
/setup              # Full guided setup
/setup --minimal    # Dependencies only
```

Requires an Azure subscription with permissions to create and manage Key Vault resources.

## Commands

| Command | Description |
|---------|-------------|
| `/setup` | Install Azure CLI, create Key Vault, configure RBAC access |
| `/kv-secret-manage` | Create, read, update, list, and delete secrets |
| `/kv-certificate-manage` | Create self-signed or CA cert, configure auto-renewal |
| `/kv-access-audit` | Audit RBAC assignments, review network rules, check access logs |
| `/kv-rotation-policy` | Set up automatic secret/key rotation with Event Grid |
| `/kv-app-integration` | Configure App Service, Functions, or Container Apps to use KV secrets |

## Agent

| Agent | Description |
|-------|-------------|
| **Key Vault Reviewer** | Reviews Key Vault configurations for access control, network security, secret hygiene, backup strategy, and managed identity integration |

## Trigger Keywords

The skill activates automatically when conversations mention: `key vault`, `azure secrets`, `azure keys`, `azure certificates`, `secret rotation`, `managed identity`, `vault access`, `kv reference`, `keyvault`, `certificate renewal`, `secret management`, `encryption key`.

## Author

Markus Ahling
