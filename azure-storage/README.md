# Azure Storage Plugin

Azure Storage services — manage Blob containers, Queue messaging, Table NoSQL data, and Azure Files SMB/NFS shares. Includes lifecycle management, SAS token generation, RBAC access control, static website hosting, Data Lake Storage Gen2, and monitoring with Azure Monitor.

## What This Plugin Provides

This is a **knowledge plugin** — it gives Claude deep expertise in Azure Storage so it can provision storage accounts, manage blobs and containers, send and receive queue messages, query table entities, configure security (SAS, RBAC, firewalls, private endpoints), set up lifecycle policies, host static websites, and work with Data Lake Storage Gen2. It does not contain runtime code, MCP servers, or executable scripts.

## Setup

Run `/setup` to install Azure CLI, create a storage account, and configure network rules:

```
/setup              # Full guided setup
/setup --minimal    # Dependencies only
```

Requires an Azure subscription and the Azure CLI.

## Commands

| Command | Description |
|---------|-------------|
| `/setup` | Install Azure CLI, create storage account, configure network rules and managed identity |
| `/blob-manage` | Upload, download, list, delete blobs; configure container access |
| `/queue-manage` | Create queues, send/receive messages, configure poison message handling |
| `/storage-security` | Generate SAS tokens, audit access, configure RBAC and firewall rules |
| `/storage-lifecycle` | Create lifecycle policies for automatic tiering and deletion |
| `/storage-static-website` | Enable static website hosting, deploy content, configure CDN |

## Agent

| Agent | Description |
|-------|-------------|
| **Storage Reviewer** | Reviews storage configurations for security, data protection, performance, cost optimization, and connectivity patterns |

## Trigger Keywords

The skill activates automatically when conversations mention: `azure storage`, `blob storage`, `azure blob`, `storage account`, `azure queue`, `azure table`, `azure files`, `sas token`, `storage lifecycle`, `data lake`, `adls`, `blob container`, `storage firewall`.

## Author

Markus Ahling
