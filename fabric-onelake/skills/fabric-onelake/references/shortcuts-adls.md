# Shortcuts and ADLS Gen2

## Overview

OneLake shortcuts virtualize data from external storage sources (ADLS Gen2, Amazon S3, Google Cloud Storage, Dataverse, and other OneLake workspaces) as folders within a Fabric Lakehouse — without copying data. This reference covers the OneLake Shortcut REST API, ADLS Gen2 shortcut creation, S3 shortcuts, Dataverse shortcuts, shortcut path patterns, permission requirements, and shortcut refresh behavior.

---

## Shortcuts REST API

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| POST | `/v1/workspaces/{workspaceId}/items/{itemId}/shortcuts` | Workspace Contributor | `name`, `path`, `target` | Creates a shortcut in a lakehouse |
| GET | `/v1/workspaces/{workspaceId}/items/{itemId}/shortcuts` | Workspace Viewer | — | Lists all shortcuts for an item |
| GET | `/v1/workspaces/{workspaceId}/items/{itemId}/shortcuts/{shortcutName}?path={path}` | Workspace Viewer | — | Gets a specific shortcut |
| DELETE | `/v1/workspaces/{workspaceId}/items/{itemId}/shortcuts/{shortcutName}?path={path}` | Workspace Contributor | — | Deletes a shortcut |

**Base URL**: `https://api.fabric.microsoft.com`
**Auth scope for API**: `https://api.fabric.microsoft.com/.default`

---

## ADLS Gen2 Shortcut Creation

### Prerequisites

1. A Fabric Connection to the ADLS Gen2 account (created in Workspace Settings > Connections).
2. The connection credential must have at least **Storage Blob Data Reader** on the target path.
3. The shortcut creator must have Workspace Contributor (or higher) on the lakehouse.

### Create ADLS Gen2 Shortcut via REST API

```bash
TOKEN=$(az account get-access-token --resource https://api.fabric.microsoft.com --query accessToken -o tsv)

curl -X POST \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items/<lakehouse-id>/shortcuts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "raw-sales-adls",
    "path": "Files",
    "target": {
      "adlsGen2": {
        "location":     "https://mydatalake.dfs.core.windows.net",
        "subpath":      "/raw-data/sales/2025",
        "connectionId": "<fabric-connection-guid>"
      }
    }
  }'
```

### Create ADLS Gen2 Shortcut Targeting a Delta Table

To make an external Delta table appear in the `Tables/` section:

```bash
curl -X POST \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items/<lakehouse-id>/shortcuts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "external-orders-delta",
    "path": "Tables",
    "target": {
      "adlsGen2": {
        "location":     "https://mydatalake.dfs.core.windows.net",
        "subpath":      "/curated/orders",
        "connectionId": "<fabric-connection-guid>"
      }
    }
  }'
```

The target path must contain valid Delta format (`_delta_log/` + Parquet files) for the table to be queryable via the SQL endpoint.

### Create ADLS Connection (Prerequisite)

```bash
# Create a Fabric connection to ADLS Gen2 using Service Principal
curl -X POST \
  "https://api.fabric.microsoft.com/v1/connections" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName":  "adls-raw-data-prod",
    "connectionDetails": {
      "type":     "AzureDataLakeStorageGen2",
      "parameters": {
        "server":   "mydatalake.dfs.core.windows.net",
        "path":     "/"
      }
    },
    "privacyLevel":  "Organizational",
    "credentialDetails": {
      "credentialType": "ServicePrincipal",
      "credentials": {
        "tenantId":     "<tenant-id>",
        "clientId":     "<client-id>",
        "clientSecret": "<client-secret>"
      }
    }
  }'
```

---

## Amazon S3 Shortcut

```bash
curl -X POST \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items/<lakehouse-id>/shortcuts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "partner-data-s3",
    "path": "Files",
    "target": {
      "s3": {
        "location":     "https://s3.amazonaws.com",
        "bucket":       "my-partner-data-bucket",
        "subpath":      "/exports/2025",
        "connectionId": "<fabric-s3-connection-guid>"
      }
    }
  }'
```

### S3 Connection Prerequisites

- Create a Fabric connection with IAM access key credentials (or IAM role ARN if cross-account).
- The IAM user/role must have `s3:GetObject`, `s3:ListBucket` permissions on the target bucket.
- S3 shortcuts are read-only from Fabric.

---

## Google Cloud Storage Shortcut

```bash
curl -X POST \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items/<lakehouse-id>/shortcuts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "gcs-analytics-data",
    "path": "Files",
    "target": {
      "googleCloudStorage": {
        "location":     "https://storage.googleapis.com",
        "bucket":       "analytics-bucket",
        "subpath":      "/processed/events",
        "connectionId": "<fabric-gcs-connection-guid>"
      }
    }
  }'
```

---

## Dataverse Shortcut

Dataverse shortcuts expose Dataverse tables as virtual Delta tables in a Fabric Lakehouse.

```bash
curl -X POST \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items/<lakehouse-id>/shortcuts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "crm-accounts-dv",
    "path": "Tables",
    "target": {
      "dataverse": {
        "environmentDomain": "https://myorg.crm.dynamics.com",
        "deltaLakeFolderPath": "/account",
        "connectionId": "<fabric-dataverse-connection-guid>"
      }
    }
  }'
```

**Dataverse shortcut behavior**:
- Appears as a read-only Delta table in the `Tables/` section.
- Data synced via Dataverse-managed Azure Synapse Link (requires Synapse Link enabled in Power Platform).
- Not all Dataverse tables are exportable via shortcuts — check table-level sync settings.

---

## OneLake-to-OneLake Shortcut

```bash
# Create shortcut from consumer lakehouse pointing to source in another workspace
curl -X POST \
  "https://api.fabric.microsoft.com/v1/workspaces/<consumer-workspace-id>/items/<consumer-lakehouse-id>/shortcuts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "shared-dim-customers",
    "path": "Tables",
    "target": {
      "oneLake": {
        "workspaceId": "<source-workspace-id>",
        "itemId":      "<source-lakehouse-id>",
        "path":        "Tables/dim_customers"
      }
    }
  }'
```

Cross-workspace OneLake shortcuts support both read and write (if the consumer workspace identity has Contributor on the source item).

---

## Shortcut Path Patterns

| Placement | Path | Use Case |
|-----------|------|---------|
| `Files` | Under `Files/` folder | Raw files, CSV, JSON, images — not SQL queryable |
| `Tables` | Under `Tables/` folder | Must be valid Delta format — queryable via SQL endpoint |
| `Files/subdir` | Nested under Files | Organize by source or date |
| `Tables` (ADLS Delta) | External Delta path | External curated data queryable as local table |

### Full Shortcut Path Structure

```
OneLake path:
<workspace-name>/<lakehouse-name>.Lakehouse/Tables/<shortcut-name>/  ← Delta table in Tables/
<workspace-name>/<lakehouse-name>.Lakehouse/Files/<shortcut-name>/   ← Files folder

abfss:// equivalent:
abfss://<workspace-name>@onelake.dfs.fabric.microsoft.com/<lakehouse>.Lakehouse/Tables/<shortcut>/
```

---

## List and Manage Shortcuts

```bash
# List all shortcuts for a lakehouse
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items/<lakehouse-id>/shortcuts" \
  | python -m json.tool

# Get a specific shortcut
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items/<lakehouse-id>/shortcuts/raw-sales-adls?path=Files" \
  | python -m json.tool

# Delete a shortcut
curl -X DELETE \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items/<lakehouse-id>/shortcuts/raw-sales-adls?path=Files" \
  -H "Authorization: Bearer $TOKEN"
```

### Python — List and Validate Shortcuts

```python
import requests

def list_shortcuts(token, workspace_id, lakehouse_id):
    url = (f"https://api.fabric.microsoft.com/v1/workspaces/{workspace_id}"
           f"/items/{lakehouse_id}/shortcuts")
    resp = requests.get(url, headers={"Authorization": f"Bearer {token}"})
    resp.raise_for_status()
    shortcuts = resp.json().get("value", [])
    for sc in shortcuts:
        print(f"Name: {sc['name']}, Path: {sc['path']}, Target: {list(sc['target'].keys())[0]}")
    return shortcuts

def test_shortcut_readable(token, workspace_name, lakehouse_name, shortcut_name, placement="Files"):
    """Test that a shortcut is readable via the DFS API."""
    url = (f"https://onelake.dfs.fabric.microsoft.com/{workspace_name}"
           f"/{lakehouse_name}.Lakehouse/{placement}/{shortcut_name}"
           f"?resource=filesystem&recursive=false")
    resp = requests.get(url, headers={"Authorization": f"Bearer {token}"})
    if resp.status_code == 200:
        print(f"Shortcut '{shortcut_name}' is readable.")
        return True
    else:
        print(f"Shortcut '{shortcut_name}' FAILED: {resp.status_code} — {resp.text[:200]}")
        return False
```

---

## Permissions for Shortcuts

### ADLS Gen2 Shortcut

| Role | Required On | Notes |
|------|-------------|-------|
| Storage Blob Data Reader | Container or path in ADLS | Minimum for read-only shortcut |
| Storage Blob Data Contributor | Container or path | Required for write-through (not applicable — ADLS shortcuts are read-only from Fabric) |

### S3 Shortcut IAM Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:GetObjectVersion"],
      "Resource": "arn:aws:s3:::my-bucket/exports/*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::my-bucket",
      "Condition": { "StringLike": { "s3:prefix": ["exports/*"] } }
    }
  ]
}
```

---

## Shortcut Refresh Behavior

| Shortcut Type | Refresh Behavior | Latency |
|--------------|-----------------|---------|
| ADLS Gen2 | Read-through at query time; no scheduled refresh | Near real-time |
| Amazon S3 | Read-through at query time | Near real-time |
| GCS | Read-through at query time | Near real-time |
| Dataverse | Async sync via Synapse Link; not real-time | 15–60 minute lag typical |
| OneLake (same tenant) | Direct read; no copy | Near real-time |

OneLake caches shortcut file listings to reduce metadata overhead. The listing cache is refreshed periodically (typically every few minutes). Newly added files may take a few minutes to appear.

---

## Error Codes Table

| Error | Meaning | Remediation |
|-------|---------|-------------|
| HTTP 403 on shortcut API | Workspace role insufficient | Requires Workspace Contributor or higher |
| HTTP 409 Conflict | Shortcut with same name already exists at path | Use a unique name or delete the existing shortcut |
| `Shortcut: Connection not found` | `connectionId` in request is invalid | Verify connection GUID via `GET /connections` |
| `Shortcut: Access denied to target` | Connection credentials lack Storage Blob Data Reader | Add the role to the SPN/user on the ADLS account |
| `Shortcut: Target path not found` | ADLS path or S3 prefix does not exist | Verify path exists in the source storage |
| `Shortcut: Invalid Delta format` | Tables/ shortcut target is not a valid Delta table | Ensure target path has `_delta_log/` subdirectory |
| `DFS 404 on shortcut path` | Shortcut deleted or target renamed | Re-create the shortcut with the correct path |
| `Dataverse shortcut: Synapse Link not enabled` | Synapse Link not configured for the Dataverse table | Enable Azure Synapse Link in Power Platform Admin Center |

---

## Throttling / Limits Table

| Resource | Limit | Notes |
|----------|-------|-------|
| Shortcuts per lakehouse | No documented hard limit | Large numbers of shortcuts increase metadata overhead |
| Shortcut nesting | 1 level only | A shortcut cannot point to another shortcut |
| ADLS Gen2 shortcut paths | One path per shortcut | Cannot create a shortcut spanning multiple paths |
| S3 shortcut regions | Must match Fabric capacity region for optimal performance | Cross-region shortcuts have higher latency |
| Dataverse sync lag | 15–60 minutes | Not suitable for real-time analytics |
| Shortcut listing cache TTL | A few minutes | Newly added files take up to 5 min to appear |
| OneLake shortcut write | Only for OneLake-to-OneLake shortcuts | External shortcuts (ADLS/S3/GCS) are always read-only |

---

## Common Patterns and Gotchas

### Gotcha: External Shortcuts Are Always Read-Only

ADLS Gen2, S3, and GCS shortcuts are read-only from Fabric. Any attempt to write through a shortcut fails. Write-back patterns must go directly to the source storage using the storage SDK, not via OneLake.

### Gotcha: Tables/ Shortcut Requires Valid Delta Format

If the ADLS path does not have a `_delta_log/` directory, the shortcut will appear in `Files/` behavior even if placed in `Tables/`. The SQL endpoint will not expose it as a queryable table.

### Pattern: Shortcut Health Check Script

```python
import requests, json

shortcuts = list_shortcuts(TOKEN, WORKSPACE_ID, LAKEHOUSE_ID)
print(f"Total shortcuts: {len(shortcuts)}")
healthy, broken = [], []

for sc in shortcuts:
    name = sc["name"]
    path = sc["path"]
    readable = test_shortcut_readable(TOKEN, WORKSPACE_NAME, LAKEHOUSE_NAME, name, path)
    (healthy if readable else broken).append(name)

print(f"Healthy: {len(healthy)}, Broken: {len(broken)}")
if broken:
    print(f"Broken shortcuts: {broken}")
```

### Gotcha: Workspace Identity Required for Cross-Workspace Shortcuts

If workspace identity is not enabled on the source workspace, cross-workspace shortcuts fail with a 403 error. Enable workspace identity via: Workspace Settings > OneLake > Workspace identity > Enable.
