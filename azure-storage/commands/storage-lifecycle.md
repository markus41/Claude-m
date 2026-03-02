---
name: storage-lifecycle
description: "Create lifecycle management policies for automatic blob tiering, deletion, and immutability"
argument-hint: "<create-policy|list-policies|delete-policy|immutability> [--account <name>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Storage Lifecycle Management

Manage Azure Blob Storage lifecycle policies for automatic tiering, deletion, and immutability.

## Instructions

### 1. Parse the Request

- `<action>` -- One of: `create-policy`, `list-policies`, `delete-policy`, `immutability`. Ask if not provided.
- `--account` -- Storage account name. Ask if not provided.
- `--resource-group` -- Resource group name. Ask if not provided.

### 2. Create Lifecycle Policy

**Azure CLI**:
```bash
# Create a lifecycle policy from a JSON file
az storage account management-policy create \
  --account-name <storage-name> \
  --resource-group <rg-name> \
  --policy @lifecycle-policy.json
```

**Example policy** -- tier to Cool after 30 days, Archive after 90, delete after 365:

```json
{
  "rules": [
    {
      "enabled": true,
      "name": "auto-tier-and-delete",
      "type": "Lifecycle",
      "definition": {
        "actions": {
          "baseBlob": {
            "tierToCool": { "daysAfterModificationGreaterThan": 30 },
            "tierToArchive": { "daysAfterModificationGreaterThan": 90 },
            "delete": { "daysAfterModificationGreaterThan": 365 }
          },
          "snapshot": {
            "delete": { "daysAfterCreationGreaterThan": 90 }
          },
          "version": {
            "delete": { "daysAfterCreationGreaterThan": 90 }
          }
        },
        "filters": {
          "blobTypes": ["blockBlob"],
          "prefixMatch": ["logs/", "temp/"]
        }
      }
    }
  ]
}
```

**Example policy** -- move to Cold tier based on last access time:

```json
{
  "rules": [
    {
      "enabled": true,
      "name": "access-time-tiering",
      "type": "Lifecycle",
      "definition": {
        "actions": {
          "baseBlob": {
            "tierToCool": { "daysAfterLastAccessTimeGreaterThan": 30 },
            "tierToCold": { "daysAfterLastAccessTimeGreaterThan": 90 },
            "tierToArchive": { "daysAfterLastAccessTimeGreaterThan": 180 },
            "enableAutoTierToHotFromCool": true
          }
        },
        "filters": {
          "blobTypes": ["blockBlob"]
        }
      }
    }
  ]
}
```

**Note**: Last access time tracking must be enabled:
```bash
az storage account blob-service-properties update \
  --account-name <storage-name> \
  --resource-group <rg-name> \
  --enable-last-access-tracking true
```

### 3. List Lifecycle Policies

```bash
az storage account management-policy show \
  --account-name <storage-name> \
  --resource-group <rg-name> \
  --output json
```

### 4. Delete Lifecycle Policy

```bash
az storage account management-policy delete \
  --account-name <storage-name> \
  --resource-group <rg-name>
```

### 5. Configure Immutability

**Time-based retention** (WORM -- Write Once, Read Many):

```bash
# Set a container-level immutability policy (e.g., 365 days)
az storage container immutability-policy create \
  --account-name <storage-name> \
  --container-name <container> \
  --period 365

# Lock the policy (IRREVERSIBLE -- cannot reduce retention after locking)
az storage container immutability-policy lock \
  --account-name <storage-name> \
  --container-name <container> \
  --if-match <etag>
```

**Legal hold** (holds data until explicitly removed):

```bash
# Set a legal hold
az storage container legal-hold set \
  --account-name <storage-name> \
  --container-name <container> \
  --tags "case-2024-001" "audit-hold"

# Clear a legal hold
az storage container legal-hold clear \
  --account-name <storage-name> \
  --container-name <container> \
  --tags "case-2024-001"
```

**Version-level immutability** (per-blob control):

```bash
# Enable version-level immutability support on the storage account
az storage account update \
  --name <storage-name> \
  --resource-group <rg-name> \
  --enable-immutability-policy true

# Set immutability on a specific blob version
az storage blob immutability-policy set \
  --account-name <storage-name> \
  --container-name <container> \
  --name <blob-name> \
  --expiry-time "2025-12-31T00:00:00Z" \
  --policy-mode Unlocked \
  --auth-mode login
```

### 6. Display Summary

Show the user:
- Policy created/listed/deleted
- Tiering schedule and estimated cost savings
- Immutability status and compliance implications
- Warning: locked immutability policies cannot be shortened or removed
