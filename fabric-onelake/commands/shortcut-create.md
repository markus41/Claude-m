---
name: shortcut-create
description: "Create a OneLake shortcut to ADLS Gen2, Amazon S3, Google Cloud Storage, Dataverse, or another OneLake item"
argument-hint: "<adls|s3|gcs|dataverse|onelake> --workspace <name> --item <name> --name <shortcut-name>"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Create a OneLake Shortcut

Create a shortcut in a Fabric lakehouse that references external or internal data without copying it.

## Instructions

### 1. Validate Inputs

- `<type>` — One of: `adls`, `s3`, `gcs`, `dataverse`, `onelake`. Ask if not provided.
- `--workspace` — Target workspace name or GUID. Ask if not provided.
- `--item` — Target lakehouse or warehouse name. Ask if not provided.
- `--name` — Name for the shortcut (appears as a folder). Ask if not provided.
- `--path` — Parent path in the item where the shortcut is created (default: `Files/`).

### 2. Gather Source Details

**For `adls` (Azure Data Lake Storage Gen2)**:
- Storage account name
- Container name
- Path within the container (optional, defaults to root)
- Connection: organizational identity or service principal

**For `s3` (Amazon S3)**:
- S3 bucket name
- Region
- Path prefix (optional)
- Connection: IAM role ARN or access key (stored as Fabric connection)

**For `gcs` (Google Cloud Storage)**:
- GCS bucket name
- Path prefix (optional)
- Connection: service account JSON key (stored as Fabric connection)

**For `dataverse` (Microsoft Dataverse)**:
- Dataverse environment URL (e.g., `https://orgname.crm.dynamics.com`)
- Table name or names to link

**For `onelake` (another OneLake item)**:
- Source workspace name or GUID
- Source item name (lakehouse/warehouse)
- Source path within the item

### 3. Create the Shortcut via REST API

Use the Fabric REST API to create the shortcut:

```bash
TOKEN=$(az account get-access-token --resource https://api.fabric.microsoft.com --query accessToken -o tsv)

curl -X POST \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items/<item-id>/shortcuts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "<shortcut-name>",
    "path": "<parent-path>",
    "target": {
      "<targetType>": {
        ...target-specific-properties...
      }
    }
  }'
```

**ADLS Gen2 target payload**:
```json
{
  "target": {
    "adlsGen2": {
      "location": "https://<account>.dfs.core.windows.net",
      "subpath": "<container>/<path>",
      "connectionId": "<connection-guid>"
    }
  }
}
```

**S3 target payload**:
```json
{
  "target": {
    "amazonS3": {
      "location": "https://<bucket>.s3.<region>.amazonaws.com",
      "subpath": "<path-prefix>",
      "connectionId": "<connection-guid>"
    }
  }
}
```

**GCS target payload**:
```json
{
  "target": {
    "googleCloudStorage": {
      "location": "https://<bucket>.storage.googleapis.com",
      "subpath": "<path-prefix>",
      "connectionId": "<connection-guid>"
    }
  }
}
```

**OneLake target payload**:
```json
{
  "target": {
    "oneLake": {
      "workspaceId": "<source-workspace-guid>",
      "itemId": "<source-item-guid>",
      "path": "<source-path>"
    }
  }
}
```

### 4. Verify the Shortcut

After creation, verify the shortcut appears:

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items/<item-id>/shortcuts" \
  | python -m json.tool
```

Also verify data is readable through the shortcut:

```bash
STORAGE_TOKEN=$(az account get-access-token --resource https://storage.azure.com/ --query accessToken -o tsv)

curl -s -H "Authorization: Bearer $STORAGE_TOKEN" \
  "https://onelake.dfs.fabric.microsoft.com/<workspace>/<item>/Files/<shortcut-name>?resource=filesystem&recursive=false"
```

### 5. Display Summary

Show the user:
- Shortcut name and location in OneLake hierarchy
- Source target details
- Read-only warning for external shortcuts (ADLS, S3, GCS)
- How to use the shortcut in Spark: `abfss://<workspace>@onelake.dfs.fabric.microsoft.com/<item>/Files/<shortcut-name>/`
- Reminder that shortcut data is not copied — it remains at the source
