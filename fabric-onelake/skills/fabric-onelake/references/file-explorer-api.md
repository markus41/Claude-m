# File Explorer and API

## Overview

OneLake exposes a fully compatible ADLS Gen2 DFS (Data Lake Storage) REST API at `https://onelake.dfs.fabric.microsoft.com`. This enables any tool that speaks ADLS Gen2 to access OneLake data. This reference covers the DFS API for listing, reading, writing, and managing files; the ABFSS URI scheme; SAS token patterns; and Azure Storage Explorer connection setup.

---

## DFS API Reference

| Method | Endpoint | Description | Key Parameters |
|--------|----------|-------------|----------------|
| PUT | `/{filesystem}/{path}?resource=filesystem` | Create a filesystem (workspace-level, auto-created) | — |
| PUT | `/{filesystem}/{path}?resource=directory` | Create a directory | — |
| PUT | `/{filesystem}/{path}?resource=file` | Create an empty file resource | — |
| PATCH | `/{filesystem}/{path}?action=append&position={n}` | Append content to a file | `Content-Type: application/octet-stream` |
| PATCH | `/{filesystem}/{path}?action=flush&position={n}` | Finalize (flush) a file | `position` = total bytes written |
| GET | `/{filesystem}/{path}` | Download a file | Optional `Range` header |
| HEAD | `/{filesystem}/{path}` | Get file properties (size, last-modified, ETag) | — |
| GET | `/{filesystem}/{path}?resource=filesystem&recursive={bool}` | List directory contents | `recursive`, `maxResults`, `continuation` |
| DELETE | `/{filesystem}/{path}?recursive={bool}` | Delete file or directory | `recursive=true` for directories |
| PUT | `/{filesystem}/{path}` with `x-ms-rename-source` header | Rename or move a file/directory | Header: source path |
| GET | `/{filesystem}/{path}?action=getStatus` | Get path properties (type, size) | — |
| PUT | `/{filesystem}/{path}?action=setAccessControl` | Set POSIX ACLs | Body: `x-ms-acl` header |
| GET | `/{filesystem}/{path}?action=getAccessControl` | Get POSIX ACLs | — |

**Base URL**: `https://onelake.dfs.fabric.microsoft.com`
**API Version header**: `x-ms-version: 2023-08-03` (or latest supported)
**Auth scope**: `https://storage.azure.com/.default`

---

## Authentication

OneLake supports Entra ID authentication only. No storage keys or SAS tokens (storage-level).

```bash
# Azure CLI — user identity
TOKEN=$(az account get-access-token --resource https://storage.azure.com/ --query accessToken -o tsv)

# Service principal
az login --service-principal -u <client-id> -p <client-secret> --tenant <tenant-id>
TOKEN=$(az account get-access-token --resource https://storage.azure.com/ --query accessToken -o tsv)

# Python — DefaultAzureCredential
from azure.identity import DefaultAzureCredential
import requests

cred  = DefaultAzureCredential()
token = cred.get_token("https://storage.azure.com/.default").token
headers = {"Authorization": f"Bearer {token}"}
```

---

## List Directory Contents

```bash
# List top-level items (workspaces)
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://onelake.dfs.fabric.microsoft.com/?resource=account"

# List items in a workspace (top-level)
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://onelake.dfs.fabric.microsoft.com/my-workspace?resource=filesystem"

# List Files/ folder contents (non-recursive)
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://onelake.dfs.fabric.microsoft.com/my-workspace/my-lakehouse.Lakehouse/Files?resource=filesystem&recursive=false"

# List Files/ folder recursively with pagination
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://onelake.dfs.fabric.microsoft.com/my-workspace/my-lakehouse.Lakehouse/Files?resource=filesystem&recursive=true&maxResults=100"
```

**Response format (JSON)**:
```json
{
  "paths": [
    {
      "name":            "my-lakehouse.Lakehouse/Files/data/orders.parquet",
      "isDirectory":     false,
      "contentLength":   "104857600",
      "lastModified":    "Tue, 01 Mar 2025 06:00:00 GMT",
      "etag":            "\"0x8D1234567890ABC\"",
      "owner":           "$superuser",
      "group":           "$superuser",
      "permissions":     "rw-r--r--"
    }
  ]
}
```

### Python List Function

```python
import requests
from azure.identity import DefaultAzureCredential

def list_onelake_files(workspace, item_path, recursive=False, max_results=1000):
    """List files in a OneLake path using the DFS API."""
    cred    = DefaultAzureCredential()
    token   = cred.get_token("https://storage.azure.com/.default").token
    headers = {"Authorization": f"Bearer {token}"}

    url = (f"https://onelake.dfs.fabric.microsoft.com/{workspace}/{item_path}"
           f"?resource=filesystem&recursive={str(recursive).lower()}&maxResults={max_results}")
    resp = requests.get(url, headers=headers)
    resp.raise_for_status()

    paths = resp.json().get("paths", [])
    continuation = resp.json().get("continuation")
    while continuation:
        resp2 = requests.get(url + f"&continuation={continuation}", headers=headers)
        resp2.raise_for_status()
        paths.extend(resp2.json().get("paths", []))
        continuation = resp2.json().get("continuation")

    return paths

files = list_onelake_files(
    workspace="sales-workspace",
    item_path="bronze-lakehouse.Lakehouse/Files/raw",
    recursive=True
)
for f in files[:10]:
    size_mb = int(f.get("contentLength", 0)) / (1024 * 1024)
    print(f"{f['name']} — {size_mb:.1f} MB")
```

---

## Upload Files (Three-Step Process)

The ADLS Gen2 upload model requires three API calls: create, append, flush.

```bash
FILE_PATH="my-workspace/my-lakehouse.Lakehouse/Files/landing/data.csv"
LOCAL_FILE="data.csv"
FILE_SIZE=$(wc -c < "$LOCAL_FILE")

# Step 1: Create the file resource
curl -X PUT \
  "https://onelake.dfs.fabric.microsoft.com/$FILE_PATH?resource=file" \
  -H "Authorization: Bearer $TOKEN"

# Step 2: Append content
curl -X PATCH \
  "https://onelake.dfs.fabric.microsoft.com/$FILE_PATH?action=append&position=0" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/octet-stream" \
  --data-binary "@$LOCAL_FILE"

# Step 3: Flush (finalize)
curl -X PATCH \
  "https://onelake.dfs.fabric.microsoft.com/$FILE_PATH?action=flush&position=$FILE_SIZE" \
  -H "Authorization: Bearer $TOKEN"

echo "Uploaded: $LOCAL_FILE ($FILE_SIZE bytes)"
```

### Python Upload with SDK (Recommended)

```python
from azure.storage.filedatalake import DataLakeServiceClient
from azure.identity import DefaultAzureCredential
import os

def upload_file_to_onelake(workspace_name, item_name, target_path, local_file_path, overwrite=True):
    """Upload a local file to OneLake using the ADLS Gen2 SDK."""
    service = DataLakeServiceClient(
        account_url="https://onelake.dfs.fabric.microsoft.com",
        credential=DefaultAzureCredential()
    )
    fs     = service.get_file_system_client(workspace_name)
    full_path = f"{item_name}.Lakehouse/{target_path}"
    file_c = fs.get_file_client(full_path)

    with open(local_file_path, "rb") as data:
        file_c.upload_data(data, overwrite=overwrite)
    print(f"Uploaded: {local_file_path} → {full_path}")

# Upload a single file
upload_file_to_onelake(
    workspace_name="sales-workspace",
    item_name="bronze-lakehouse",
    target_path="Files/landing/orders_2025-03-01.csv",
    local_file_path="/tmp/orders_2025-03-01.csv"
)

# Bulk upload a directory
def upload_directory(workspace, item_name, target_dir, local_dir):
    for filename in os.listdir(local_dir):
        if filename.endswith((".csv", ".parquet", ".json")):
            upload_file_to_onelake(workspace, item_name, f"{target_dir}/{filename}",
                                   os.path.join(local_dir, filename))

upload_directory("sales-workspace", "bronze-lakehouse", "Files/batch/2025-03-01", "/data/export/2025-03-01")
```

---

## Download Files

```bash
# Download a single file
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://onelake.dfs.fabric.microsoft.com/my-workspace/my-lakehouse.Lakehouse/Files/exports/report.csv" \
  -o report.csv

# Download with Range header (partial download for large files)
curl -s -H "Authorization: Bearer $TOKEN" \
  -H "Range: bytes=0-10485759" \
  "https://onelake.dfs.fabric.microsoft.com/my-workspace/my-lakehouse.Lakehouse/Files/data/large.parquet" \
  -o large_part1.parquet
```

```python
def download_file_from_onelake(workspace_name, item_name, file_path, local_output_path):
    service = DataLakeServiceClient(
        account_url="https://onelake.dfs.fabric.microsoft.com",
        credential=DefaultAzureCredential()
    )
    fs       = service.get_file_system_client(workspace_name)
    full_path = f"{item_name}.Lakehouse/{file_path}"
    file_c   = fs.get_file_client(full_path)

    with open(local_output_path, "wb") as f:
        download = file_c.download_file()
        f.write(download.readall())
    print(f"Downloaded: {full_path} → {local_output_path}")

download_file_from_onelake("sales-workspace", "bronze-lakehouse",
                            "Files/exports/report.csv", "/tmp/report.csv")
```

---

## File Operations: Rename, Delete, Create Directory

```bash
# Create a directory
curl -X PUT \
  "https://onelake.dfs.fabric.microsoft.com/my-workspace/my-lakehouse.Lakehouse/Files/new-folder?resource=directory" \
  -H "Authorization: Bearer $TOKEN"

# Rename / move a file
curl -X PUT \
  "https://onelake.dfs.fabric.microsoft.com/my-workspace/my-lakehouse.Lakehouse/Files/archive/data.csv" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-ms-rename-source: /my-workspace/my-lakehouse.Lakehouse/Files/landing/data.csv"

# Delete a single file
curl -X DELETE \
  "https://onelake.dfs.fabric.microsoft.com/my-workspace/my-lakehouse.Lakehouse/Files/temp/data.csv" \
  -H "Authorization: Bearer $TOKEN"

# Delete a directory recursively
curl -X DELETE \
  "https://onelake.dfs.fabric.microsoft.com/my-workspace/my-lakehouse.Lakehouse/Files/old-batch?recursive=true" \
  -H "Authorization: Bearer $TOKEN"

# Get file properties (headers only — no body)
curl -I -H "Authorization: Bearer $TOKEN" \
  "https://onelake.dfs.fabric.microsoft.com/my-workspace/my-lakehouse.Lakehouse/Files/data.csv"
```

---

## ABFSS URI Scheme

The ABFSS (Azure Blob File System Secure) URI scheme is used in PySpark, ADLS SDKs, and Azure tooling.

```
abfss://<filesystem>@<account>.dfs.<endpoint>/<path>
```

For OneLake:
```
abfss://<workspace-name>@onelake.dfs.fabric.microsoft.com/<item-name>.<item-type>/<path>
```

### Examples

```python
# Read a Delta table from another workspace in PySpark
df = spark.read.format("delta").load(
    "abfss://analytics-workspace@onelake.dfs.fabric.microsoft.com/gold-lakehouse.Lakehouse/Tables/fact_sales"
)

# Read a CSV file
df = spark.read.option("header", "true").csv(
    "abfss://etl-workspace@onelake.dfs.fabric.microsoft.com/bronze-lakehouse.Lakehouse/Files/raw/orders.csv"
)

# Write a Delta table to a specific path
df.write.format("delta").mode("overwrite").save(
    "abfss://etl-workspace@onelake.dfs.fabric.microsoft.com/silver-lakehouse.Lakehouse/Tables/cleaned_orders"
)

# Read using workspace GUID (preferred for automation — avoids name change issues)
df = spark.read.format("delta").load(
    "abfss://<workspace-guid>@onelake.dfs.fabric.microsoft.com/<lakehouse-guid>/Tables/orders"
)
```

### Workspace/Item GUID vs Name

| Use Case | Use Name | Use GUID |
|---------|---------|---------|
| Interactive/ad-hoc development | Yes (readable) | No |
| Production pipelines | Risky (breaks on rename) | Yes (stable) |
| CI/CD configs | Avoid | Yes |

Get GUIDs via the Fabric REST API:
```bash
# Get workspace GUID
curl -s -H "Authorization: Bearer $TOKEN" "https://api.fabric.microsoft.com/v1/workspaces" | python -m json.tool

# Get item GUID
curl -s -H "Authorization: Bearer $TOKEN" "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items?type=Lakehouse" | python -m json.tool
```

---

## SAS Token Generation for OneLake

OneLake does not support storage-level SAS tokens (there is no storage account key). The equivalent is a **short-lived Entra ID token**.

```python
from azure.identity import ClientSecretCredential
from datetime import datetime, timedelta

def get_onelake_token(tenant_id, client_id, client_secret, expiry_minutes=60):
    """Get a time-limited Entra ID token for OneLake access."""
    cred  = ClientSecretCredential(tenant_id=tenant_id, client_id=client_id, client_secret=client_secret)
    token = cred.get_token("https://storage.azure.com/.default")
    expires_at = datetime.utcfromtimestamp(token.expires_on)
    print(f"Token valid until: {expires_at.isoformat()} UTC")
    return token.token

token = get_onelake_token(TENANT_ID, CLIENT_ID, CLIENT_SECRET)
```

For **third-party tool access** requiring SAS-like URLs, create a **Fabric API token** (personal access token) via the Fabric portal:
1. Go to Fabric Portal > Settings > Developer Settings > Generate token.
2. This token can be used in Authorization headers.

---

## Azure Storage Explorer Connection

1. Open Azure Storage Explorer.
2. Click **Connect** (plug icon in left sidebar).
3. Select **Azure Data Lake Storage Gen2 container or directory**.
4. Choose **Sign in using OAuth (Microsoft Entra ID)** — no storage key needed.
5. Set the URL to: `https://onelake.dfs.fabric.microsoft.com/<workspace-name>`
6. Sign in with your Entra ID account.
7. OneLake workspaces appear as containers. Drill into items and their `Tables/` and `Files/` folders.

---

## Error Codes Table

| HTTP Status | Error | Meaning | Remediation |
|------------|-------|---------|-------------|
| 401 | AuthenticationFailed | Invalid or expired token | Re-acquire token; check Entra ID app permissions |
| 403 | AuthorizationPermissionMismatch | Identity lacks permission on the path | Add Workspace Viewer + ReadAll or use data access roles |
| 404 | PathNotFound | File or directory path does not exist | Verify workspace/item names and path spelling |
| 404 | FilesystemNotFound | Workspace name does not exist | Verify workspace name (case-sensitive) |
| 409 | PathAlreadyExists | File already exists at the target path | Use `overwrite=true` parameter |
| 412 | ConditionNotMet | ETag mismatch in conditional write | Remove If-Match condition or update ETag |
| 413 | ContentTooLarge | Append chunk too large | Use 4 MB max chunk sizes for append |
| 429 | TooManyRequests | Rate limit exceeded | Implement exponential backoff |
| 500 | InternalServerError | Transient OneLake error | Retry with exponential backoff |

---

## Throttling / Limits Table

| Resource | Limit | Notes |
|----------|-------|-------|
| DFS API rate limit | 20,000 requests/min per user | Use SDK batching; avoid per-file API calls for bulk uploads |
| Upload chunk size | 4 MB max per PATCH append | Use SDK for automatic chunking |
| Max file size | No hard limit documented | Files > 10 GB should use the SDK with parallel upload |
| Directory listing maxResults | 5,000 per page | Use `continuation` token for pagination |
| Concurrent uploads per session | No hard limit | SDK manages connection pool; set reasonable concurrency (10–20) |
| Rename source path | Same workspace only | Cannot rename across workspaces |
| Delete latency | Near-instant for files | Recursive directory delete may take seconds for large trees |
