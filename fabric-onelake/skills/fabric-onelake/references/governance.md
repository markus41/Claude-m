# OneLake Governance

## Overview

OneLake governance covers data access roles (folder-level security), sensitivity labels for files and Delta tables, audit logs for file access, data residency considerations, Microsoft Purview integration, and retention policies. This reference provides the API endpoints, configuration patterns, and production recommendations for governing data in OneLake.

---

## OneLake Data Access Roles

Data access roles provide fine-grained, folder-level security within a lakehouse — independent of workspace roles. A Workspace Viewer can see all items but data access roles restrict which tables and files they can read.

### Data Access Role API

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/v1/workspaces/{workspaceId}/items/{itemId}/dataAccessRoles` | Workspace Contributor | — | Lists all data access roles |
| GET | `/v1/workspaces/{workspaceId}/items/{itemId}/dataAccessRoles/{roleName}` | Workspace Contributor | — | Gets a specific role |
| PUT | `/v1/workspaces/{workspaceId}/items/{itemId}/dataAccessRoles/{roleName}` | Workspace Admin | `members`, `decisionRules` | Creates or replaces a role |
| DELETE | `/v1/workspaces/{workspaceId}/items/{itemId}/dataAccessRoles/{roleName}` | Workspace Admin | — | Deletes a role |

**Base URL**: `https://api.fabric.microsoft.com`

### Create a Data Access Role (Restrict to Specific Tables)

```bash
TOKEN=$(az account get-access-token --resource https://api.fabric.microsoft.com --query accessToken -o tsv)

curl -X PUT \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items/<lakehouse-id>/dataAccessRoles/AnalystReadRole" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "members": [
      { "principalId": "<analyst-group-object-id>", "principalType": "Group" },
      { "principalId": "<individual-user-object-id>", "principalType": "User" }
    ],
    "decisionRules": [
      {
        "effect": "Permit",
        "permission": [
          {
            "attributeName": "Path",
            "attributeValueIncludedIn": [
              "Tables/dim_customers/*",
              "Tables/dim_products/*",
              "Tables/fact_sales/*",
              "Files/exports/*"
            ]
          }
        ]
      }
    ]
  }'
```

### Deny Access to Sensitive Tables

```bash
# Deny access to PII table (explicit deny for a specific group)
curl -X PUT \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items/<lakehouse-id>/dataAccessRoles/PIIAccessDeny" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "members": [
      { "principalId": "<restricted-group-id>", "principalType": "Group" }
    ],
    "decisionRules": [
      {
        "effect": "Deny",
        "permission": [
          {
            "attributeName": "Path",
            "attributeValueIncludedIn": [
              "Tables/employee_pii/*",
              "Tables/customer_contacts/*",
              "Files/sensitive/*"
            ]
          }
        ]
      }
    ]
  }'
```

### List and Audit Data Access Roles

```bash
# List all roles for a lakehouse
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items/<lakehouse-id>/dataAccessRoles" \
  | python -m json.tool
```

```python
import requests

def audit_data_access_roles(token, workspace_id, lakehouse_id):
    url = (f"https://api.fabric.microsoft.com/v1/workspaces/{workspace_id}"
           f"/items/{lakehouse_id}/dataAccessRoles")
    resp = requests.get(url, headers={"Authorization": f"Bearer {token}"})
    resp.raise_for_status()
    roles = resp.json().get("value", [])

    print(f"Data access roles for lakehouse ({lakehouse_id}):")
    for role in roles:
        print(f"\n  Role: {role['name']}")
        for member in role.get("members", []):
            print(f"    Member: {member['principalId']} ({member['principalType']})")
        for rule in role.get("decisionRules", []):
            effect = rule.get("effect")
            paths  = rule.get("permission", [{}])[0].get("attributeValueIncludedIn", [])
            print(f"    Effect: {effect}")
            for p in paths:
                print(f"      Path: {p}")
    return roles
```

---

## Sensitivity Labels

Microsoft Purview sensitivity labels classify data by sensitivity (e.g., Public, Internal, Confidential, Highly Confidential). Labels can be applied to Fabric items and propagate to downstream consumers.

### Apply Sensitivity Label via Fabric Portal

1. Open the lakehouse or warehouse item.
2. Click the **...** menu > **Settings** > **Sensitivity label**.
3. Select the appropriate label from the dropdown.
4. Click **Save**.

### Apply Sensitivity Label via REST API

```bash
# Get available sensitivity labels
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.fabric.microsoft.com/v1/admin/labels" \
  | python -m json.tool

# Apply a label to a workspace item
curl -X PATCH \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items/<item-id>/label" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "labelId": "<sensitivity-label-guid>"
  }'
```

### Label Inheritance and Propagation

| Behavior | Description |
|----------|-------------|
| Label on lakehouse | All files and Delta tables in the lakehouse inherit the label |
| Label on warehouse | Warehouse and its default semantic model inherit |
| Label on semantic model | Power BI reports connected to the model inherit |
| Override | More restrictive labels can be applied to individual items; less restrictive are blocked |

---

## Audit Logs for File Access

Fabric writes audit logs to Microsoft 365 Unified Audit Log and optionally to Azure Monitor.

### Enable Audit Logging

**Via Microsoft Purview Compliance Portal**:
1. Go to `https://compliance.microsoft.com`.
2. Navigate to **Audit** > **Audit search**.
3. Fabric activities are logged automatically — no explicit enablement needed.

**Enable diagnostic logs to Azure Monitor**:
1. Azure Portal > Fabric Capacity resource.
2. **Diagnostic settings** > **+ Add diagnostic setting**.
3. Select log categories including `OneLakeFileAccess`.
4. Route to a Log Analytics workspace.

### Query OneLake Access Audit Logs (Log Analytics)

```kql
// File access events from OneLake
FabricOneLakeFileAccess
| where TimeGenerated > ago(24h)
| project TimeGenerated, UserPrincipalName, OperationType, FilePath, ItemName, WorkspaceName
| order by TimeGenerated desc

// Who accessed PII tables
FabricOneLakeFileAccess
| where FilePath has "employee_pii" or FilePath has "customer_contacts"
| where TimeGenerated > ago(7d)
| summarize AccessCount = count() by UserPrincipalName, OperationType, FilePath
| order by AccessCount desc

// Unusual access outside business hours (UTC 18:00 - 07:00)
FabricOneLakeFileAccess
| where TimeGenerated > ago(7d)
| extend Hour = datetime_part("Hour", TimeGenerated)
| where Hour >= 18 or Hour <= 7
| project TimeGenerated, UserPrincipalName, OperationType, FilePath
| order by TimeGenerated desc

// Access volume by user (data exfiltration detection)
FabricOneLakeFileAccess
| where OperationType == "ReadFile" or OperationType == "DownloadFile"
| where TimeGenerated > ago(24h)
| summarize
    FilesRead    = count(),
    BytesRead    = sum(tolong(FileSizeBytes))
  by UserPrincipalName
| order by BytesRead desc
| where FilesRead > 1000 or BytesRead > 10737418240  -- Alert if > 1000 files or > 10 GB

// Failed access attempts
FabricOneLakeFileAccess
| where ResultStatus == "Failed" or ResultStatus == "Unauthorized"
| where TimeGenerated > ago(24h)
| project TimeGenerated, UserPrincipalName, OperationType, FilePath, ResultStatus
| order by TimeGenerated desc
```

### Microsoft 365 Unified Audit Log (Purview)

```bash
# Query audit log via Purview API (requires Exchange Online Management module)
# Operations: FabricGetLakehouse, FabricCreateShortcut, FabricDeleteShortcut, FabricReadTable
Search-UnifiedAuditLog \
  -StartDate (Get-Date).AddDays(-7) \
  -EndDate (Get-Date) \
  -RecordType PowerBIAudit \
  -Operations "FabricGetLakehouse", "FabricCreateShortcut" \
  | Export-Csv audit_log.csv
```

---

## Data Residency Considerations

OneLake stores data in the region of the Fabric capacity. Data residency requirements must be aligned with capacity region assignment.

### Region Assignment Rules

| Aspect | Behavior |
|--------|---------|
| Default data region | Fabric capacity region (configured at capacity creation) |
| Multi-region | Not supported for OneLake — single region per capacity |
| Data in transit | Always TLS 1.2+ encrypted |
| Data at rest | AES-256 encrypted, Microsoft-managed keys by default |
| Customer-managed keys | Available via Fabric Admin > Security — requires Azure Key Vault |

### Check Workspace Region

```bash
# Get workspace details including capacity ID
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>" \
  | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('capacityId'))"

# Get capacity details including region
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.fabric.microsoft.com/v1/capacities/<capacity-id>" \
  | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('region'))"
```

### Data Residency Compliance Pattern

```
GDPR (EU) workloads:
└── Assign workspace to Fabric capacity in EU region (West Europe, North Europe)
└── Do NOT create shortcuts to non-EU storage (S3 in us-east-1, etc.)
└── Apply "Confidential" sensitivity label
└── Enable audit logging with 90-day retention minimum

US workloads (HIPAA/FedRAMP):
└── Assign workspace to Fabric capacity in US region (East US, West US)
└── Enable customer-managed keys (CMK) for HIPAA-covered data
└── Apply "Highly Confidential" label to PHI tables
```

---

## Purview Integration

Microsoft Purview provides data catalog, classification, and lineage for OneLake data.

### Register OneLake in Purview

1. In Purview Studio, go to **Data Map** > **Data sources**.
2. Click **+ New** > **Microsoft OneLake**.
3. Authenticate with the same Entra ID tenant.
4. Select the Fabric workspaces to scan.
5. Configure a scan: select lakehouses/warehouses, scan rules, sensitivity labels.

### Purview Scan Results

After scanning:
- Delta tables appear as assets in the Purview catalog.
- Column-level classification (e.g., email, SSN, credit card) is applied automatically.
- Lineage from pipeline activities is captured.
- Sensitivity labels applied in Fabric appear on Purview assets.

### Purview REST API — Search OneLake Assets

```python
import requests

def search_purview_catalog(purview_account, token, query, limit=20):
    url = f"https://{purview_account}.purview.azure.com/catalog/api/search/query"
    payload = {
        "keywords": query,
        "limit":    limit,
        "filter": {
            "and": [
                {"assetType": "Azure Data Lake Storage Gen2"},
                {"classification": "Microsoft.System.DataResidency"}
            ]
        }
    }
    resp = requests.post(url, json=payload,
                         headers={"Authorization": f"Bearer {token}"})
    resp.raise_for_status()
    return resp.json().get("value", [])

# Search for PII-classified assets in OneLake
assets = search_purview_catalog(PURVIEW_ACCOUNT, TOKEN, "dim_customers")
for asset in assets:
    print(f"{asset['qualifiedName']} — classifications: {asset.get('classification', [])}")
```

---

## Retention Policies

OneLake does not have built-in retention policies for files. Implement retention via:

1. **Pipeline-based cleanup**: Schedule a pipeline to delete old files based on date criteria.
2. **Delta VACUUM**: Controls Delta log/file retention (default 7 days).
3. **Microsoft Purview retention labels** (for compliance-driven retention of M365 data).

### Automated File Retention Script

```python
from azure.storage.filedatalake import DataLakeServiceClient
from azure.identity import DefaultAzureCredential
from datetime import datetime, timedelta, timezone

def delete_old_files(workspace_name, lakehouse_name, folder_path, retention_days=30):
    """Delete files older than retention_days from a Files/ folder."""
    service = DataLakeServiceClient(
        account_url="https://onelake.dfs.fabric.microsoft.com",
        credential=DefaultAzureCredential()
    )
    fs       = service.get_file_system_client(workspace_name)
    full_dir = f"{lakehouse_name}.Lakehouse/{folder_path}"
    cutoff   = datetime.now(timezone.utc) - timedelta(days=retention_days)

    deleted_count = 0
    for path in fs.get_paths(path=full_dir, recursive=True):
        if not path.is_directory and path.last_modified < cutoff:
            file_c = fs.get_file_client(path.name)
            file_c.delete_file()
            deleted_count += 1
            print(f"Deleted: {path.name} (modified: {path.last_modified})")

    print(f"Retention cleanup completed. Deleted {deleted_count} files from {full_dir}.")

# Delete landing files older than 30 days
delete_old_files(
    workspace_name="etl-workspace",
    lakehouse_name="bronze-lakehouse",
    folder_path="Files/landing",
    retention_days=30
)
```

### Delta Table Retention (VACUUM)

```python
# Set Delta log retention
spark.sql("""
    ALTER TABLE silver_lakehouse.cleaned_orders SET TBLPROPERTIES (
        'delta.logRetentionDuration'         = 'interval 30 days',
        'delta.deletedFileRetentionDuration' = 'interval 7 days'
    )
""")

# Schedule weekly VACUUM
spark.sql("VACUUM silver_lakehouse.cleaned_orders RETAIN 168 HOURS")
```

---

## Error Codes Table

| Error | Meaning | Remediation |
|-------|---------|-------------|
| HTTP 403 on data access role PUT | Calling identity is not workspace Admin | Elevate to Admin or ask Admin to create the role |
| `Data access role: invalid path format` | Path in `attributeValueIncludedIn` is malformed | Use `Tables/<tableName>/*` or `Files/<folder>/*` format |
| `Sensitivity label: label not found` | Label GUID is wrong or not in tenant | Verify label IDs via `GET /v1/admin/labels` |
| `Sensitivity label: override blocked` | Applying a less restrictive label on more restrictive item | Less restrictive labels cannot override more restrictive ones |
| `Audit log: no data` | Audit retention period expired or logs not enabled | Check retention settings in Purview Compliance Portal |
| `Purview scan: 403 on OneLake` | Purview MSI not granted access to workspace | Grant Purview managed identity Viewer role on the workspace |
| `VACUUM below minimum retention` | Retention check fails | Set `retentionDurationCheck.enabled=false` only in non-production |

---

## Throttling / Limits Table

| Resource | Limit | Notes |
|----------|-------|-------|
| Data access roles per lakehouse | No documented limit | Complex role sets (> 50) may slow permission evaluation |
| Members per data access role | No documented limit | Use Entra groups for scalability |
| Sensitivity label types | Governed by Purview tenant config | Labels from M365 Purview are shared across all Fabric items |
| Audit log retention | 90 days (M365 E3), 1 year (E5) | Export to Log Analytics for longer retention |
| Purview scan frequency | Minimum 1 hour between scans | Full scans on very large lakehouses may take hours |
| Retention policy enforcement | Manual (pipeline/VACUUM based) | No native automated OneLake retention |
| Customer-managed key rotation | At least annually (recommended) | Rotation requires re-encryption of all OneLake data |
