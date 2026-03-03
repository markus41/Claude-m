---
name: Fabric OneLake
description: >
  Deep expertise in Microsoft Fabric OneLake — the unified data lake for the entire Fabric tenant.
  Covers OneLake architecture and hierarchical namespace, ADLS Gen2 API compatibility, shortcut
  creation and management (ADLS, S3, GCS, Dataverse, cross-workspace), file upload/download
  operations via DFS REST API and Azure SDK, OneLake data access roles and folder-level security,
  cross-workspace data sharing and data mesh patterns, V-Order optimization, caching, and
  monitoring. Targets data engineers and platform teams building lakehouse architectures on Fabric.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - onelake
  - fabric data lake
  - fabric shortcuts
  - onelake file
  - adls gen2 fabric
  - onelake api
  - lakehouse files
  - fabric file explorer
  - onelake shortcut
  - onelake storage
  - fabric unified lake
  - onelake endpoint
---

# Fabric OneLake

## 1. OneLake Overview

Microsoft Fabric OneLake is the single, unified data lake for an entire Fabric tenant. Every Fabric workspace automatically provisions storage in OneLake — there is no separate storage account to create or manage.

**Key principles**:
- **One copy**: Data is stored once and referenced everywhere. No duplication across lakehouses, warehouses, or Power BI datasets.
- **Tenant-wide**: One OneLake per tenant. All workspaces share the same underlying storage layer.
- **Automatic provisioning**: Creating a lakehouse or warehouse automatically creates the corresponding OneLake storage. No manual storage setup.
- **Open format**: All tabular data is stored as **Delta Parquet** by default. Files can be any format (CSV, JSON, images, etc.) under the `Files/` folder.
- **ADLS Gen2 compatible**: OneLake exposes a full DFS (Data Lake Storage) API endpoint, making it compatible with any tool that speaks ADLS Gen2.

**OneLake vs traditional ADLS Gen2**:
| Aspect | OneLake | ADLS Gen2 (standalone) |
|--------|---------|----------------------|
| Provisioning | Automatic with Fabric workspace | Manual storage account creation |
| Namespace | Workspace > Item > Folders | Storage account > Container > Folders |
| Authentication | Azure AD / Entra ID only | Azure AD, SAS, storage keys |
| Governance | Fabric workspace roles + item permissions | Azure RBAC + ACLs |
| Compute coupling | Tight integration with Spark, SQL, Power BI | Bring your own compute |
| Endpoint | `onelake.dfs.fabric.microsoft.com` | `<account>.dfs.core.windows.net` |
| Shortcuts | Native cross-source virtualization | N/A (use linked services) |
| Cost | Included in Fabric capacity | Separate storage billing |

**When to use OneLake directly**:
- Storing raw files (CSV, JSON, images, PDFs) in lakehouse `Files/` folder
- Accessing Delta tables produced by Spark or Dataflow Gen2
- Creating shortcuts to virtualize external data
- Building cross-workspace data sharing with the one-copy principle
- Programmatic file operations via REST API or SDK

## 2. OneLake Architecture

OneLake organizes data in a hierarchical namespace that mirrors the Fabric workspace structure.

**Hierarchy**:
```
Tenant (one OneLake)
└── Workspace (maps to a DFS filesystem)
    └── Item (lakehouse, warehouse, KQL database, etc.)
        ├── Tables/          (managed Delta tables)
        │   ├── sales/       (Delta table with _delta_log/)
        │   ├── customers/
        │   └── products/
        └── Files/           (unmanaged files, any format)
            ├── raw/
            │   ├── 2024-01-01.csv
            │   └── 2024-01-02.csv
            ├── images/
            └── exports/
```

**Key concepts**:

- **Workspace = Filesystem**: Each workspace appears as a top-level filesystem on the OneLake DFS endpoint. The workspace name or GUID is the filesystem identifier.
- **Item = Top-level directory**: Each Fabric item (lakehouse, warehouse, KQL database) is a directory within the workspace filesystem. Items are suffixed with their type: `<item-name>.Lakehouse`, `<item-name>.Warehouse`.
- **Tables/ folder**: Contains managed Delta tables. Spark and Dataflow Gen2 write here. Each subfolder is a Delta table with `_delta_log/` and Parquet data files.
- **Files/ folder**: Contains unmanaged files in any format. Upload CSVs, JSONs, images, or any binary files here. These are not automatically indexed as tables.

**Logical vs physical storage**:
OneLake presents a logical view. Physically, data may be distributed across Microsoft-managed storage infrastructure. Users never interact with the physical storage layer — all access is through the logical hierarchy.

**OneLake endpoints**:
| Endpoint | Purpose |
|----------|---------|
| `https://onelake.dfs.fabric.microsoft.com` | DFS API (file/directory CRUD, compatible with ADLS Gen2 tooling) |
| `https://onelake.blob.fabric.microsoft.com` | Blob API (legacy compatibility, limited operations) |
| `https://api.fabric.microsoft.com` | Fabric REST API (shortcuts, permissions, item management) |

**Workspace identity**:
A workspace identity is a managed identity automatically associated with a Fabric workspace. It enables:
- Cross-workspace data access without user delegation
- Service-to-service authentication for shortcuts
- Spark jobs accessing data in other workspaces

Enable workspace identity:
```
Workspace Settings > OneLake > Workspace identity > Enable
```

## 3. ADLS Gen2 Compatibility

OneLake exposes a fully compatible ADLS Gen2 DFS API endpoint. Any tool, SDK, or script that works with ADLS Gen2 can connect to OneLake by changing the endpoint URL.

**Endpoint mapping**:
| Traditional ADLS Gen2 | OneLake equivalent |
|-----------------------|-------------------|
| `https://<account>.dfs.core.windows.net` | `https://onelake.dfs.fabric.microsoft.com` |
| `<container>` | `<workspace-name>` (or workspace GUID) |
| `<path>` | `<item-name>.<item-type>/<path>` |

**abfss:// URL format**:
```
abfss://<workspace-name>@onelake.dfs.fabric.microsoft.com/<item-name>.<item-type>/<path>
```

Examples:
```
abfss://sales-workspace@onelake.dfs.fabric.microsoft.com/bronze-lakehouse.Lakehouse/Tables/raw_orders/
abfss://analytics-ws@onelake.dfs.fabric.microsoft.com/gold-lakehouse.Lakehouse/Files/exports/report.csv
```

**Authentication**:
OneLake supports Azure AD (Entra ID) authentication only. It does NOT support:
- Storage account keys (there is no storage account)
- Shared Access Signatures (SAS tokens)
- Anonymous access

Supported identity types:
| Identity | Use case |
|----------|----------|
| User identity (interactive) | Portal, Azure Storage Explorer, ad-hoc scripts |
| Service principal | CI/CD pipelines, automated jobs |
| Managed identity | Azure-hosted services (VMs, Functions, AKS) |
| Workspace identity | Cross-workspace Fabric operations |

**Token acquisition**:
```bash
# Azure CLI
az account get-access-token --resource https://storage.azure.com/ --query accessToken -o tsv

# MSAL / DefaultAzureCredential targets the same resource
# Scope: https://storage.azure.com/.default
```

**Node.js SDK (`@azure/storage-file-datalake`)**:
```typescript
import { DataLakeServiceClient } from "@azure/storage-file-datalake";
import { DefaultAzureCredential } from "@azure/identity";

const serviceClient = new DataLakeServiceClient(
  "https://onelake.dfs.fabric.microsoft.com",
  new DefaultAzureCredential()
);

// Workspace = filesystem
const fsClient = serviceClient.getFileSystemClient("my-workspace");

// List items in the workspace
for await (const item of fsClient.listPaths()) {
  console.log(item.name);
}
```

**Python SDK (`azure-storage-file-datalake`)**:
```python
from azure.storage.filedatalake import DataLakeServiceClient
from azure.identity import DefaultAzureCredential

service_client = DataLakeServiceClient(
    account_url="https://onelake.dfs.fabric.microsoft.com",
    credential=DefaultAzureCredential()
)

fs_client = service_client.get_file_system_client("my-workspace")
paths = fs_client.get_paths(path="my-lakehouse.Lakehouse/Files")
for path in paths:
    print(path.name)
```

**REST API (direct HTTP)**:
```bash
TOKEN=$(az account get-access-token --resource https://storage.azure.com/ --query accessToken -o tsv)

# List files
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://onelake.dfs.fabric.microsoft.com/my-workspace/my-lakehouse.Lakehouse/Files?resource=filesystem&recursive=false"
```

**Azure Storage Explorer**:
Azure Storage Explorer can connect to OneLake:
1. Open Storage Explorer > Connect > ADLS Gen2 container or directory
2. Use the DFS URL: `https://onelake.dfs.fabric.microsoft.com`
3. Authenticate with Azure AD
4. Browse workspace > item > folders as if it were a regular ADLS account

## 4. Shortcuts

Shortcuts are OneLake's mechanism for **virtualizing data without copying it**. A shortcut is a pointer that makes external (or other OneLake) data appear as a folder in your lakehouse.

**Key characteristics**:
- Shortcuts appear as regular folders in the OneLake hierarchy
- Data is read at query time from the source — no data movement
- External shortcuts (ADLS, S3, GCS) are **read-only** from Fabric
- OneLake-to-OneLake shortcuts support read and write (if permissions allow)
- Shortcuts inherit the security context of the connection or workspace identity

**Supported shortcut targets**:
| Target | Protocol | Authentication | Read/Write |
|--------|----------|---------------|------------|
| ADLS Gen2 | DFS API | Org identity, SPN, or connection | Read-only |
| Amazon S3 | S3 API | IAM role ARN or access key | Read-only |
| Google Cloud Storage | GCS API | Service account key | Read-only |
| Dataverse | Dataverse API | Org identity | Read-only |
| OneLake (same tenant) | Internal | Workspace identity or user | Read + Write |
| OneLake (cross-tenant) | Internal | B2B identity | Read-only |

**Creating shortcuts via Fabric REST API**:
```bash
TOKEN=$(az account get-access-token --resource https://api.fabric.microsoft.com --query accessToken -o tsv)

# Create an ADLS Gen2 shortcut
curl -X POST \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items/<item-id>/shortcuts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "external-sales-data",
    "path": "Files",
    "target": {
      "adlsGen2": {
        "location": "https://mystorage.dfs.core.windows.net",
        "subpath": "raw-data/sales/2024",
        "connectionId": "<fabric-connection-guid>"
      }
    }
  }'
```

**Creating shortcuts via portal**:
1. Open a lakehouse in Fabric portal
2. Right-click on `Files/` or `Tables/`
3. Select **New shortcut**
4. Choose the source: OneLake, Azure Data Lake Storage Gen2, Amazon S3, Google Cloud Storage, or Dataverse
5. Provide connection details and source path
6. Name the shortcut and confirm

**Shortcut in Tables/ vs Files/**:
- **Tables/ shortcuts**: Point to Delta table data. The shortcut target must contain valid Delta format (`_delta_log/` + Parquet files). The table appears in the lakehouse SQL endpoint.
- **Files/ shortcuts**: Point to any file structure. No format requirements. Files are accessible via the Files section but not automatically queryable via SQL.

**Cross-workspace shortcuts**:
To create a shortcut from workspace A to data in workspace B:
1. Enable **workspace identity** on workspace B (the source)
2. Grant workspace A's identity at least Viewer access on the source item
3. Create a OneLake shortcut in workspace A pointing to workspace B's item

```json
{
  "name": "shared-dimensions",
  "path": "Tables",
  "target": {
    "oneLake": {
      "workspaceId": "<source-workspace-guid>",
      "itemId": "<source-lakehouse-guid>",
      "path": "Tables/dim_customers"
    }
  }
}
```

**Limitations**:
- External shortcuts (ADLS, S3, GCS) are read-only — you cannot write through them
- Shortcuts do not support partial folder references (you get the entire target path)
- Nested shortcuts (shortcut pointing to another shortcut) are not supported
- Shortcut target credentials are stored in Fabric connections — manage them centrally
- Maximum shortcut depth from the item root is limited to avoid performance issues
- S3 and GCS shortcuts require a Fabric connection with stored credentials

**Listing shortcuts**:
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items/<item-id>/shortcuts" \
  | python -m json.tool
```

**Deleting a shortcut**:
```bash
curl -X DELETE \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items/<item-id>/shortcuts/<shortcut-name>?path=<parent-path>" \
  -H "Authorization: Bearer $TOKEN"
```

## 5. File Operations

OneLake supports full CRUD operations on files and directories through the ADLS Gen2 DFS API.

**File path conventions**:
```
<workspace>/<item>.<item-type>/Tables/<table-name>/       # Managed Delta tables
<workspace>/<item>.<item-type>/Files/<path>/               # Unmanaged files
```

Do not manually write files into `Tables/` — use Spark or Dataflow Gen2 to manage Delta tables. Direct file writes to `Tables/` can corrupt the Delta log.

**Create a directory**:
```bash
curl -X PUT \
  "https://onelake.dfs.fabric.microsoft.com/<workspace>/<item>.Lakehouse/Files/new-folder?resource=directory" \
  -H "Authorization: Bearer $TOKEN"
```

**Upload a file** (three-step process):

Step 1 — Create the file resource:
```bash
curl -X PUT \
  "https://onelake.dfs.fabric.microsoft.com/<workspace>/<item>.Lakehouse/Files/data.csv?resource=file" \
  -H "Authorization: Bearer $TOKEN"
```

Step 2 — Append content:
```bash
curl -X PATCH \
  "https://onelake.dfs.fabric.microsoft.com/<workspace>/<item>.Lakehouse/Files/data.csv?action=append&position=0" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @data.csv
```

Step 3 — Flush (finalize):
```bash
curl -X PATCH \
  "https://onelake.dfs.fabric.microsoft.com/<workspace>/<item>.Lakehouse/Files/data.csv?action=flush&position=<file-size-in-bytes>" \
  -H "Authorization: Bearer $TOKEN"
```

**Download a file**:
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://onelake.dfs.fabric.microsoft.com/<workspace>/<item>.Lakehouse/Files/data.csv" \
  -o data.csv
```

**List directory contents**:
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://onelake.dfs.fabric.microsoft.com/<workspace>/<item>.Lakehouse/Files?resource=filesystem&recursive=false"
```

Response includes `paths[]` with `name`, `isDirectory`, `contentLength`, `lastModified`.

**Delete a file or directory**:
```bash
# File
curl -X DELETE \
  "https://onelake.dfs.fabric.microsoft.com/<workspace>/<item>.Lakehouse/Files/data.csv" \
  -H "Authorization: Bearer $TOKEN"

# Directory (recursive)
curl -X DELETE \
  "https://onelake.dfs.fabric.microsoft.com/<workspace>/<item>.Lakehouse/Files/old-folder?recursive=true" \
  -H "Authorization: Bearer $TOKEN"
```

**Rename / move a file**:
```bash
curl -X PUT \
  "https://onelake.dfs.fabric.microsoft.com/<workspace>/<item>.Lakehouse/Files/new-name.csv" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-ms-rename-source: /<workspace>/<item>.Lakehouse/Files/old-name.csv"
```

**Get file properties**:
```bash
curl -I -H "Authorization: Bearer $TOKEN" \
  "https://onelake.dfs.fabric.microsoft.com/<workspace>/<item>.Lakehouse/Files/data.csv"
```

Returns headers: `Content-Length`, `Last-Modified`, `Content-Type`, `ETag`, `x-ms-resource-type`.

**OneLake file explorer** (portal):
The Fabric portal provides a built-in file explorer for each lakehouse:
1. Open the lakehouse in the portal
2. The left pane shows `Tables` and `Files` sections
3. Right-click for upload, download, rename, delete, new folder, and new shortcut
4. Drag and drop files from the local machine into the Files section

## 6. OneLake REST API

Beyond the DFS API for file operations, the Fabric REST API provides management operations for OneLake items, shortcuts, and permissions.

**Base URL**: `https://api.fabric.microsoft.com/v1`

**Authentication**: Bearer token with scope `https://api.fabric.microsoft.com/.default`

```bash
TOKEN=$(az account get-access-token --resource https://api.fabric.microsoft.com --query accessToken -o tsv)
```

**Workspace operations**:
```bash
# List workspaces
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.fabric.microsoft.com/v1/workspaces"

# Get workspace details
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>"
```

**Item operations**:
```bash
# List items in a workspace
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items"

# Get item details
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items/<item-id>"

# Create a lakehouse
curl -X POST \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "Lakehouse", "displayName": "my-lakehouse"}'
```

**Shortcut operations**:
```bash
# List shortcuts for an item
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items/<item-id>/shortcuts"

# Get a specific shortcut
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items/<item-id>/shortcuts/<shortcut-name>?path=<parent-path>"

# Create a shortcut (see Section 4 for payloads)
curl -X POST \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items/<item-id>/shortcuts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ ... }'

# Delete a shortcut
curl -X DELETE \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items/<item-id>/shortcuts/<shortcut-name>?path=<parent-path>" \
  -H "Authorization: Bearer $TOKEN"
```

**Permission operations**:
```bash
# List role assignments
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/roleAssignments"

# Add a role assignment
curl -X POST \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/roleAssignments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "principal": { "id": "<user-or-group-guid>", "type": "User" },
    "role": "Contributor"
  }'
```

**API versioning**:
The Fabric REST API uses URL-based versioning (`/v1/`). The DFS API uses the `x-ms-version` header (e.g., `2023-08-03`). Always check Microsoft documentation for the latest supported version.

## 7. Data Access Patterns

OneLake data can be accessed from multiple compute engines and tools, each with its own access pattern.

**Spark access (Fabric notebooks)**:
```python
# Default lakehouse (current notebook's attached lakehouse)
df = spark.read.format("delta").load("Tables/sales")

# Explicit OneLake path (cross-workspace)
df = spark.read.format("delta").load(
    "abfss://other-workspace@onelake.dfs.fabric.microsoft.com/gold-lakehouse.Lakehouse/Tables/dim_customers"
)

# Read files from Files/ folder
df = spark.read.csv(
    "abfss://my-workspace@onelake.dfs.fabric.microsoft.com/my-lakehouse.Lakehouse/Files/raw/data.csv",
    header=True
)

# Write a Delta table
df.write.format("delta").mode("overwrite").save("Tables/curated_sales")
```

**Python SDK access** (outside Fabric):
```python
from azure.storage.filedatalake import DataLakeServiceClient
from azure.identity import DefaultAzureCredential

service = DataLakeServiceClient(
    "https://onelake.dfs.fabric.microsoft.com",
    credential=DefaultAzureCredential()
)
fs = service.get_file_system_client("my-workspace")
file_client = fs.get_file_client("my-lakehouse.Lakehouse/Files/report.csv")
download = file_client.download_file()
data = download.readall()
```

**Azure Storage Explorer**:
Connect to `https://onelake.dfs.fabric.microsoft.com` with Azure AD. Browse workspaces as filesystems. Upload, download, and manage files with a graphical interface.

**Power BI DirectLake**:
Power BI datasets in Direct Lake mode read Parquet files directly from OneLake — no data import or caching. The semantic model references Delta tables in a lakehouse and reads column chunks on demand.

Requirements for Direct Lake:
- Data must be in Delta Parquet format in a lakehouse or warehouse
- The dataset must be in the same workspace (or use cross-workspace shortcuts)
- V-Order optimization is strongly recommended for optimal read performance

**External tool access via ADLS endpoint**:
Any tool that supports ADLS Gen2 can connect to OneLake:
- Apache Spark (Databricks, Synapse, HDInsight) — use `abfss://` with OneLake endpoint
- dbt — configure ADLS Gen2 profile with OneLake URL
- Azure Data Factory — use ADLS Gen2 linked service with OneLake endpoint
- Custom applications — use `@azure/storage-file-datalake` or REST API

**OneLake file explorer** (Windows):
Microsoft provides a OneLake file explorer application for Windows that mounts OneLake as a drive:
1. Install from Microsoft Store or download from Microsoft
2. Sign in with Azure AD
3. OneLake appears as a mounted drive with workspace > item > folder hierarchy
4. Drag and drop files, use standard file operations

## 8. Security & Access Control

OneLake security operates at multiple levels: workspace, item, and folder.

**Workspace roles**:
| Role | Data Access | Management |
|------|------------|------------|
| Admin | Full read/write all items | Manage workspace settings, roles, capacity |
| Member | Full read/write all items | Create/delete items, share items |
| Contributor | Full read/write all items | Create/delete own items |
| Viewer | Read all items (unless restricted by data access roles) | View items only |

**Item-level permissions**:
Items can be shared directly with users or groups, granting specific permissions:
| Permission | Description |
|-----------|-------------|
| Read | View item metadata |
| ReadAll | Read all data in the item (tables and files) |
| ReadData | Query data via SQL endpoint (respects RLS) |
| Write | Modify item content |
| Reshare | Share the item with others |

**OneLake data access roles** (folder-level security):
Data access roles restrict which folders a user can access within a lakehouse. This provides fine-grained control beyond workspace roles.

Configure via Fabric REST API:
```bash
# Get data access roles
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items/<item-id>/dataAccessRoles"

# Create a data access role
curl -X PUT \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items/<item-id>/dataAccessRoles/<role-name>" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "members": [
      { "principalId": "<user-guid>", "principalType": "User" }
    ],
    "decisionRules": [
      {
        "effect": "Permit",
        "permission": [{ "attributeName": "Path", "attributeValueIncludedIn": ["Tables/sales/*", "Tables/products/*"] }]
      }
    ]
  }'
```

**Row-level security (RLS)**:
RLS applies at the semantic model / SQL endpoint level, not at the OneLake file level. Users with direct OneLake file access (ReadAll) bypass RLS. Use data access roles to restrict file-level access for sensitive data.

**Security best practices**:
- Use workspace roles for broad access control; use data access roles for fine-grained restrictions
- Assign Viewer role by default; grant Contributor/Member only when needed
- Enable workspace identity for cross-workspace access instead of sharing individual items
- Do not grant ReadAll to broad audiences if RLS is expected to protect data
- Use Fabric connections (centrally managed) for external shortcut credentials
- Audit access regularly with the `/onelake-access-audit` command
- Separate PII/sensitive data into dedicated lakehouses with restricted data access roles

## 9. Cross-Workspace Data Sharing

OneLake enables data sharing across workspaces without duplicating data, supporting data mesh and domain-based architectures.

**Sharing via shortcuts**:
The primary mechanism for cross-workspace sharing is OneLake shortcuts:
1. Source workspace publishes curated data in a gold lakehouse
2. Consumer workspace creates a OneLake shortcut pointing to the source
3. Data appears locally in the consumer's lakehouse without copying

**Prerequisites**:
- Source workspace must have workspace identity enabled
- Consumer workspace identity (or user) must have access to the source item
- Source item must grant at least Read + ReadAll permissions

**Domain-based organization**:
Fabric domains group workspaces by business domain:
```
Finance domain
├── finance-bronze-ws      (raw ingestion)
├── finance-silver-ws      (cleaned/conformed)
└── finance-gold-ws        (curated, published to consumers)

Sales domain
├── sales-bronze-ws
├── sales-silver-ws
└── sales-gold-ws
    └── sales-lakehouse
        └── Tables/
            └── dim_customers  ← shortcut from finance-gold-ws
```

**Data mesh patterns**:
- **Domain ownership**: Each domain team owns their workspace and publishes curated datasets
- **Self-serve consumption**: Consumer teams create shortcuts to published datasets
- **Federated governance**: Central platform team manages capacity, policies, and domains
- **Discoverable products**: Use Purview or Fabric endorsement to mark datasets as "Certified"

**Governance considerations**:
- Shortcuts create dependency chains — document them
- Source workspace changes (renames, deletes) break consumer shortcuts
- Cross-workspace access bypasses item-level sharing — workspace identity access is broader
- Audit cross-workspace shortcuts regularly to detect stale or unauthorized references

## 10. Caching & Performance

OneLake includes caching and optimization features that improve query performance.

**OneLake caching**:
Fabric caches frequently accessed data from OneLake close to compute. This is especially beneficial for:
- External shortcut data (ADLS, S3, GCS) — reduces cross-cloud latency
- Cross-region access — caches data in the compute region
- Frequently scanned tables — hot data stays in cache

Caching is enabled by default for lakehouse items. It can be configured at the item level in workspace settings.

**V-Order optimization**:
V-Order is a Parquet optimization applied by default in Fabric. It reorders data within Parquet row groups for optimal compression and read performance, especially for Power BI Direct Lake.

Key points:
- V-Order is applied automatically by Fabric Spark and Dataflow Gen2
- Custom Spark writes may bypass V-Order — add `.option("parquet.vorder.enabled", "true")` to write operations
- V-Order improves Direct Lake query performance by 10-50%
- V-Order Parquet files are fully standard Parquet — readable by any tool

```python
# Force V-Order on custom Spark writes
df.write.format("delta") \
  .option("parquet.vorder.enabled", "true") \
  .mode("overwrite") \
  .save("Tables/optimized_sales")
```

**File size recommendations**:
| Metric | Recommended | Concern |
|--------|------------|---------|
| Individual Parquet file size | 128 MB - 512 MB | < 32 MB (too many small files), > 1 GB (too large) |
| Number of files per table | < 10,000 | > 10,000 slows metadata operations |
| Partition count | < 10,000 | > 10,000 causes "small file problem" |
| Partition size | > 128 MB | < 32 MB per partition is too granular |

**Compaction**:
Small files accumulate from streaming ingestion or frequent small writes. Compact with:
```python
# OPTIMIZE compacts small files into larger ones
spark.sql("OPTIMIZE my_lakehouse.sales")

# VACUUM removes old file versions beyond retention
spark.sql("VACUUM my_lakehouse.sales RETAIN 168 HOURS")
```

**Partition design**:
- Partition by columns used in WHERE clauses (e.g., date, region)
- Avoid high-cardinality partition keys (e.g., user_id with millions of values)
- Use `ZORDER BY` for secondary sort columns within partitions
- For small tables (< 1 GB), partitioning may not be beneficial

## 11. Monitoring

Monitor OneLake usage, storage, and shortcut health to maintain a healthy data lake.

**Storage metrics**:
Fabric Admin Portal provides storage metrics per workspace:
1. Admin Portal > Workspaces > select workspace > Storage
2. View total storage used, storage by item, growth trends
3. Identify large items that consume disproportionate capacity

**Capacity metrics app**:
Install the Microsoft Fabric Capacity Metrics app from AppSource:
- OneLake storage consumption over time
- Read/write operations per workspace
- Throttling events due to capacity limits
- Top consumers by workspace/item

**Monitoring shortcut health**:
Shortcuts can break if:
- Source storage is deleted or renamed
- Connection credentials expire or are revoked
- Source permissions change
- Network connectivity issues (for external sources)

Check shortcut health:
```bash
# List shortcuts and check for error status
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items/<item-id>/shortcuts"
```

Test shortcut readability by listing files through the shortcut path:
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://onelake.dfs.fabric.microsoft.com/<workspace>/<item>.Lakehouse/Files/<shortcut-name>?resource=filesystem&recursive=false"
```

**Access pattern monitoring**:
Use Azure Monitor diagnostic logs (when enabled on Fabric capacity):
- Track which users/SPNs access which items
- Identify unused items or shortcuts
- Detect unusual access patterns (data exfiltration risk)

**Alerts**:
Configure alerts for:
- Storage approaching capacity limits (80%+ of capacity)
- Shortcut errors (failed reads from external sources)
- Unusual write volumes (potential misconfigured pipeline)
- Permission changes on sensitive workspaces

## 12. Common Patterns

### Pattern 1: External Data Virtualization with ADLS/S3 Shortcuts

**Scenario**: Your organization has existing data in ADLS Gen2 and S3. You want to query it from Fabric without migrating.

**Architecture**:
```
External ADLS Gen2 (raw data)          External S3 (partner data)
         |                                      |
    [ADLS shortcut]                       [S3 shortcut]
         |                                      |
    bronze-lakehouse (Fabric)
    ├── Files/
    │   ├── adls-raw-data/  ← shortcut to ADLS
    │   └── s3-partner/     ← shortcut to S3
    └── Tables/
        └── unified_raw/    ← Spark job reads shortcuts, writes Delta
```

**Implementation**:
1. Create Fabric connections for ADLS Gen2 and S3 credentials
2. Create shortcuts in the bronze lakehouse pointing to external sources
3. Run a Spark notebook that reads from shortcuts and writes unified Delta tables
4. Downstream silver/gold lakehouses reference the bronze Delta tables

**Benefits**: No data copying for exploration; selective materialization into Delta for performance.

### Pattern 2: Cross-Workspace Data Mesh with Shortcuts

**Scenario**: Multiple domain teams need to share curated datasets without centralizing all data.

**Architecture**:
```
Sales Domain (sales-gold-ws)           Finance Domain (finance-gold-ws)
├── sales-lakehouse                    ├── finance-lakehouse
│   └── Tables/                        │   └── Tables/
│       ├── fact_orders                │       ├── fact_revenue
│       └── dim_products               │       └── dim_cost_centers
│                                      │
└── shared-dimensions-lakehouse        └── shared-dimensions-lakehouse
    └── Tables/                            └── Tables/
        └── dim_customers ← shortcut       └── dim_customers ← shortcut
            (from central-dimensions-ws)        (from central-dimensions-ws)

Central Dimensions (central-dimensions-ws)
└── dimensions-lakehouse
    └── Tables/
        └── dim_customers  (source of truth)
```

**Implementation**:
1. Central team publishes `dim_customers` in a dedicated workspace
2. Enable workspace identity on the central workspace
3. Grant domain workspace identities Viewer access + ReadAll on the dimensions lakehouse
4. Each domain creates a OneLake shortcut to `dim_customers`
5. All domains see the same data — zero copies, single source of truth

### Pattern 3: Bulk File Upload Pipeline

**Scenario**: A nightly batch process uploads thousands of CSV files from an on-premises system to OneLake.

**Implementation**:
```python
import os
from azure.storage.filedatalake import DataLakeServiceClient
from azure.identity import ClientSecretCredential

credential = ClientSecretCredential(
    tenant_id=os.environ["AZURE_TENANT_ID"],
    client_id=os.environ["AZURE_CLIENT_ID"],
    client_secret=os.environ["AZURE_CLIENT_SECRET"]
)

service = DataLakeServiceClient(
    "https://onelake.dfs.fabric.microsoft.com",
    credential=credential
)

fs = service.get_file_system_client("etl-workspace")
dir_client = fs.get_directory_client("bronze-lakehouse.Lakehouse/Files/daily-upload/2024-01-15")
dir_client.create_directory()

local_dir = "/data/export/2024-01-15"
for filename in os.listdir(local_dir):
    file_client = dir_client.get_file_client(filename)
    with open(os.path.join(local_dir, filename), "rb") as f:
        file_client.upload_data(f, overwrite=True)
    print(f"Uploaded {filename}")
```

**Best practices**:
- Upload to `Files/` first, then convert to Delta with Spark
- Use date-based directory structure for organization and partition alignment
- Run file compaction after upload to avoid small file issues
- Set up a Spark notebook or data pipeline to process uploaded files into `Tables/`

### Pattern 4: OneLake as Shared Medallion Architecture Foundation

**Scenario**: Build a bronze-silver-gold medallion architecture with OneLake as the shared storage layer.

**Architecture**:
```
ingestion-workspace
└── bronze-lakehouse
    ├── Files/
    │   └── raw/            ← raw files from sources
    └── Tables/
        ├── raw_orders/     ← Delta from streaming/batch
        └── raw_customers/

transformation-workspace
└── silver-lakehouse
    ├── Tables/
    │   ├── cleaned_orders/     ← deduped, validated
    │   └── conformed_customers/ ← standardized schema
    └── Shortcuts/
        └── bronze_orders  ← shortcut to bronze-lakehouse/Tables/raw_orders

analytics-workspace
└── gold-lakehouse
    ├── Tables/
    │   ├── fact_sales/         ← aggregated, business-ready
    │   └── dim_customers/      ← SCD Type 2
    └── Shortcuts/
        └── silver_orders  ← shortcut to silver-lakehouse/Tables/cleaned_orders
```

**Implementation**:
1. **Bronze**: Ingest raw data via Data Factory, Dataflow Gen2, or custom pipelines into `Tables/` (Delta) or `Files/` (raw files)
2. **Silver**: Spark notebooks read from bronze (via shortcut or direct path), clean/transform, write to silver `Tables/`
3. **Gold**: Spark notebooks read from silver (via shortcut), aggregate, apply business logic, write to gold `Tables/`
4. **Consumption**: Power BI Direct Lake datasets point to gold Delta tables

**Benefits**:
- Clear separation of concerns across workspaces
- Each layer has its own access control and workspace roles
- Shortcuts minimize data copies between layers
- Direct Lake on gold tables provides fast Power BI queries without import
- V-Order on all Delta writes ensures optimal read performance

## Progressive Disclosure — Reference Files

| Topic | File |
|---|---|
| Shortcuts REST API, ADLS Gen2/S3/GCS/Dataverse/OneLake shortcut patterns, permissions, refresh behavior | [`references/shortcuts-adls.md`](./references/shortcuts-adls.md) |
| DFS API reference, authentication, list/upload/download/delete files, ABFSS URI scheme, Storage Explorer | [`references/file-explorer-api.md`](./references/file-explorer-api.md) |
| Workspace identity, cross-workspace shortcut creation, access control layers, lineage across workspaces | [`references/cross-workspace-access.md`](./references/cross-workspace-access.md) |
| Data access roles, sensitivity labels, audit logs (KQL), data residency, Purview integration, retention | [`references/governance.md`](./references/governance.md) |
