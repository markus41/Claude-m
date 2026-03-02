# Fabric OneLake Plugin

Microsoft Fabric OneLake — unified data lake management, shortcuts, file operations, ADLS Gen2 compatibility, and cross-workspace data access patterns.

## What This Plugin Provides

This is a **knowledge plugin** — it gives Claude deep expertise in Microsoft Fabric OneLake so it can manage file hierarchies, create shortcuts, interact with the OneLake REST and DFS APIs, configure access control, and design cross-workspace data architectures. It does not contain runtime code, MCP servers, or executable scripts.

## Setup

Run `/setup` to install Azure CLI, authenticate, and configure Fabric workspace access:

```
/setup              # Full guided setup
/setup --minimal    # Dependencies only
```

Requires an Azure subscription with Microsoft Fabric capacity enabled.

## Commands

| Command | Description |
|---------|-------------|
| `/setup` | Install Azure CLI, authenticate, configure Fabric workspace access |
| `/onelake-browse` | Browse OneLake hierarchy — workspaces, items, folders, and files |
| `/shortcut-create` | Create a shortcut to ADLS Gen2, S3, GCS, Dataverse, or another OneLake item |
| `/onelake-upload` | Upload local files or directories to a OneLake lakehouse |
| `/onelake-access-audit` | Audit OneLake access roles, item permissions, and sharing |
| `/onelake-file-api` | Generate OneLake REST or SDK code for file/directory operations |

## Agent

| Agent | Description |
|-------|-------------|
| **OneLake Reviewer** | Reviews OneLake configurations for shortcut health, hierarchy conventions, access control, ADLS Gen2 usage, and performance |

## Trigger Keywords

The skill activates automatically when conversations mention: `onelake`, `fabric data lake`, `fabric shortcuts`, `onelake file`, `adls gen2 fabric`, `onelake api`, `lakehouse files`, `fabric file explorer`, `onelake shortcut`, `onelake storage`, `fabric unified lake`, `onelake endpoint`.

## Author

Markus Ahling
