---
name: Fabric Security Governance
description: >
  Advanced Fabric security and governance guidance for workspace RBAC, RLS/OLS design, sensitivity labeling, lineage controls, and audit readiness.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - fabric rbac
  - fabric rls
  - fabric ols
  - sensitivity labels fabric
  - fabric lineage governance
  - fabric audit readiness
  - least privilege fabric
  - data access policy fabric
---

# Fabric Security Governance

## 1. Overview

Microsoft Fabric Security Governance covers the controls that protect data across the entire Fabric platform — from workspace access and item-level permissions, through sensitivity labels and data classification, to audit logs and compliance reporting. This skill provides production-ready patterns for organizations that need to demonstrate least-privilege access, regulatory compliance, and data lineage traceability across their Fabric estate.

**Security layers in Fabric**:
| Layer | Controls | Managed Via |
|-------|----------|-------------|
| Workspace RBAC | Admin / Member / Contributor / Viewer roles | Fabric portal, REST API, PowerShell |
| Item-level permissions | Share individual items with specific permissions | Fabric portal, REST API |
| Semantic model security | RLS (row-level), OLS (object-level) | Power BI Desktop, Tabular Editor, XMLA |
| OneLake data access | ADLS Gen2 ACLs, Fabric OneLake shortcuts | Azure portal, REST API |
| Sensitivity labels | Microsoft Purview MIP labels applied to items | Fabric portal, Purview portal, REST API |
| Audit logs | Microsoft 365 Unified Audit Log | Microsoft 365 compliance center, REST API |
| Data lineage | Fabric lineage view, Microsoft Purview Data Map | Fabric portal, Purview portal |

---

## 2. Quick Start

### Assess a Workspace for Least-Privilege Compliance

```bash
# 1. List workspace role assignments
curl "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/roleAssignments" \
  -H "Authorization: Bearer ${TOKEN}"

# 2. Identify over-privileged users (Admin role with no admin need)
# 3. Identify orphaned access (former employees, dissolved groups)
# 4. Apply principle of least privilege: reduce Admin → Member or Contributor where appropriate
```

### Apply a Sensitivity Label to a Fabric Item

```bash
# Apply "Confidential" label to a Lakehouse
curl -X PATCH "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/items/${ITEM_ID}/sensitivityLabel" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"sensitivityLabelId": "<label-guid>"}'
```

---

## 3. Workspace RBAC

### Role Definitions

| Role | Capabilities | When to Assign |
|------|-------------|----------------|
| Admin | Full control: manage access, delete workspace, manage all items, configure capacity | Workspace owners, platform team only |
| Member | Edit all items, publish content, create deployment pipelines, share items | Data engineers, senior analysts building production content |
| Contributor | Edit all items, cannot share items, cannot manage access | Data scientists, analysts iterating on development |
| Viewer | Read all published content (reports, dashboards), cannot edit items | Report consumers, business users |

**Principle of least privilege**:
- Assign Viewer for pure consumers.
- Assign Contributor for developers who should not be able to share data externally.
- Assign Member for lead engineers who publish and share content.
- Reserve Admin for 1-2 platform owners per workspace.

### Role Assignment API

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/workspaces/{workspaceId}/roleAssignments` | Workspace Admin | — | Lists all role assignments |
| POST | `/workspaces/{workspaceId}/roleAssignments` | Workspace Admin | `principal`, `role` | Add user/group to role |
| PATCH | `/workspaces/{workspaceId}/roleAssignments/{assignmentId}` | Workspace Admin | `role` | Change role |
| DELETE | `/workspaces/{workspaceId}/roleAssignments/{assignmentId}` | Workspace Admin | — | Remove access |

```bash
# Add a security group as Contributor
curl -X POST "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/roleAssignments" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "principal": {
      "id": "<group-object-id>",
      "type": "Group"
    },
    "role": "Contributor"
  }'

# Change a user from Member to Viewer
curl -X PATCH "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/roleAssignments/${ASSIGNMENT_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"role": "Viewer"}'

# Remove access
curl -X DELETE "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/roleAssignments/${ASSIGNMENT_ID}" \
  -H "Authorization: Bearer ${TOKEN}"
```

### Bulk Access Audit (PowerShell)

```powershell
# Install required modules
Install-Module MicrosoftPowerBIMgmt -Force
Connect-PowerBIServiceAccount

# Get all workspaces
$workspaces = Get-PowerBIWorkspace -All

# Build a report of all role assignments
$assignments = @()
foreach ($ws in $workspaces) {
    $users = Get-PowerBIWorkspaceUser -WorkspaceId $ws.Id
    foreach ($user in $users) {
        $assignments += [PSCustomObject]@{
            WorkspaceName = $ws.Name
            WorkspaceId   = $ws.Id
            UserUPN       = $user.UserPrincipalName
            DisplayName   = $user.DisplayName
            Role          = $user.AccessRight
            PrincipalType = $user.PrincipalType
        }
    }
}

# Export to CSV for review
$assignments | Export-Csv "workspace-access-audit.csv" -NoTypeInformation

# Find all Admin assignments
$assignments | Where-Object { $_.Role -eq "Admin" } | Format-Table
```

---

## 4. Item-Level Permissions

Items (Lakehouses, Warehouses, Notebooks, Pipelines, Reports, Semantic Models) can be shared individually below workspace-level access.

### Share an Item

```bash
# Share a Lakehouse with read permission
curl -X POST "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/items/${ITEM_ID}/permissions" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": {
      "objectId": "<user-or-group-object-id>",
      "principalType": "User"
    },
    "permissions": ["Read"]
  }'
```

### Lakehouse-Specific Permissions

| Permission | Description |
|-----------|-------------|
| `Read` | Query data in the Lakehouse via SQL endpoint |
| `Write` | Write data to the Lakehouse |
| `Reshare` | Share the item with others |
| `Execute` | Run notebooks connected to the Lakehouse |

### OneLake Data Access Roles (Preview)

OneLake data access roles provide finer-grained control at the folder/table level within a Lakehouse:

```bash
# Create a data access role restricting to specific tables
curl -X POST "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/items/${LAKEHOUSE_ID}/dataAccessRoles" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "SalesTeamAccess",
    "decisionRules": [
      {
        "effect": "Permit",
        "permission": [
          {
            "attributeName": "Path",
            "attributeValueIncludedIn": [
              "Tables/FactSales",
              "Tables/DimProduct",
              "Tables/DimCustomer"
            ]
          }
        ]
      }
    ],
    "members": {
      "fabricItemMembers": [],
      "entraMembers": [
        {
          "objectId": "<group-object-id>",
          "tenantId": "<tenant-id>"
        }
      ]
    }
  }'
```

---

## 5. Sensitivity Labels

### Label Taxonomy Best Practices

| Label | Description | Typical Fabric Items |
|-------|-------------|---------------------|
| Public | Freely shareable externally | Public reports, marketing data |
| General | Internal, not classified | Internal operational reports |
| Confidential | Business-sensitive, restricted access | Revenue data, HR analytics |
| Highly Confidential | Regulatory data (PII, PHI, PCI) | Customer PII, health records, financial statements |

**Label inheritance**: When a Lakehouse table has a Confidential label, semantic models and reports built on top of it automatically inherit the Confidential label (if the label has inheritance configured in Purview).

### Sensitivity Label REST API

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/workspaces/{wId}/items/{itemId}/sensitivityLabel` | Workspace Viewer | — | Returns current label |
| PATCH | `/workspaces/{wId}/items/{itemId}/sensitivityLabel` | Workspace Contributor + Label User | `sensitivityLabelId` | Apply or change label |
| DELETE | `/workspaces/{wId}/items/{itemId}/sensitivityLabel` | Workspace Admin | — | Remove label |
| GET | `/sensitivityLabels` | Global Admin or equivalent | — | Lists available labels in tenant |

```bash
# List available sensitivity labels in the tenant
curl "https://api.fabric.microsoft.com/v1/sensitivityLabels" \
  -H "Authorization: Bearer ${TOKEN}"

# Apply Confidential label to a Semantic Model
curl -X PATCH \
  "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/items/${DATASET_ID}/sensitivityLabel" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"sensitivityLabelId": "<confidential-label-guid>"}'

# Bulk label all items in a workspace (PowerShell)
$items = Invoke-FabricRestMethod -Uri "workspaces/${WORKSPACE_ID}/items"
foreach ($item in $items.value) {
    Invoke-FabricRestMethod -Uri "workspaces/${WORKSPACE_ID}/items/$($item.id)/sensitivityLabel" `
      -Method PATCH `
      -Body @{ sensitivityLabelId = $CONFIDENTIAL_LABEL_ID }
}
```

### Mandatory Label Policy

In Microsoft Purview, configure mandatory labeling policies to require users to apply a label when creating or editing Fabric items. This prevents unlabeled items from existing in the tenant.

```
Purview portal > Information protection > Label policies > Create policy
- Scope: Microsoft Fabric items
- Require users to apply a label: Yes
- Default label: General
```

---

## 6. Data Lineage

### View Lineage in Fabric Portal

1. Open a Fabric workspace.
2. Click the **Lineage** view icon (graph icon in the top-right toolbar).
3. The lineage view shows:
   - Data sources → Lakehouses/Warehouses → Notebooks/Pipelines → Semantic Models → Reports
   - Click any item to see its upstream and downstream connections.

### Lineage for Compliance Reporting

```python
# Extract lineage using Power BI Scanner API
import requests

# Get workspace info with lineage
scanner_url = "https://api.powerbi.com/v1.0/myorg/admin/workspaces/getInfo"
scan_request = requests.post(
    scanner_url,
    headers={"Authorization": f"Bearer {ADMIN_TOKEN}", "Content-Type": "application/json"},
    json={
        "workspaces": [WORKSPACE_ID],
        "datasetSchemas": True,
        "datasetExpressions": True,
        "lineage": True
    }
)
scan_id = scan_request.json()["id"]

# Poll for scan completion
import time
while True:
    status_resp = requests.get(
        f"https://api.powerbi.com/v1.0/myorg/admin/workspaces/scanStatus/{scan_id}",
        headers={"Authorization": f"Bearer {ADMIN_TOKEN}"}
    )
    if status_resp.json()["status"] == "Succeeded":
        break
    time.sleep(10)

# Get results
result_resp = requests.get(
    f"https://api.powerbi.com/v1.0/myorg/admin/workspaces/scanResult/{scan_id}",
    headers={"Authorization": f"Bearer {ADMIN_TOKEN}"}
)
lineage_data = result_resp.json()
```

### Microsoft Purview Integration

Connect Fabric to Microsoft Purview Data Map for enterprise-wide lineage and data catalog:

1. In the Fabric admin portal: **Tenant settings** > **Microsoft Purview hub**.
2. Connect the Fabric tenant to a Purview account.
3. Fabric items (Lakehouses, Warehouses, Semantic Models) automatically appear in the Purview Data Catalog.
4. Lineage flows from Fabric sources to downstream consumption.

---

## 7. Audit Logs

### Access Fabric Audit Events

Fabric activities are logged in the Microsoft 365 Unified Audit Log under the `PowerBI` and `Fabric` categories.

```powershell
# Connect to M365 compliance PowerShell
Connect-IPPSSession -UserPrincipalName admin@contoso.com

# Search Fabric audit events for a date range
$startDate = (Get-Date).AddDays(-7)
$endDate = Get-Date

$auditResults = Search-UnifiedAuditLog `
  -StartDate $startDate `
  -EndDate $endDate `
  -RecordType PowerBI `
  -Operations "ViewReport,ExportReport,CreateLakehouse,DeleteWorkspace,ShareDataset" `
  -ResultSize 5000

# Parse and export
$auditResults | ForEach-Object {
    $data = $_.AuditData | ConvertFrom-Json
    [PSCustomObject]@{
        Time        = $_.CreationDate
        User        = $_.UserIds
        Operation   = $_.Operations
        WorkspaceId = $data.WorkSpaceId
        ItemName    = $data.DatasetName -or $data.ReportName
        Details     = $data
    }
} | Export-Csv "fabric-audit.csv" -NoTypeInformation
```

### Key Fabric Audit Operations

| Operation | Description | Risk Level |
|-----------|-------------|------------|
| `CreateWorkspace` | New workspace created | Low |
| `DeleteWorkspace` | Workspace deleted | High |
| `AddWorkspaceUser` | User added to workspace | Medium |
| `DeleteWorkspaceUser` | User removed from workspace | Medium |
| `CreateLakehouse` | New Lakehouse created | Low |
| `ExportReport` | Report exported to file | Medium-High |
| `ExportDataflow` | Dataflow exported | Medium |
| `ShareDataset` | Semantic model shared externally | High |
| `ViewReport` | Report viewed by user | Low (volume indicator) |
| `DownloadReport` | Power BI Desktop download | High |
| `CreateFabricCapacity` | Capacity created | High |
| `ChangeCapacityState` | Capacity paused/resumed | High |

### Audit Log Retention

- Microsoft 365 Unified Audit Log retention: **90 days** (E3) or **1 year** (E5/Compliance add-on).
- For longer retention, export to Azure Storage or Log Analytics:

```powershell
# Stream audit logs to Log Analytics (requires Diagnostic settings in M365 compliance center)
# Or export programmatically:
$page = 1
do {
    $results = Search-UnifiedAuditLog `
      -StartDate $startDate -EndDate $endDate `
      -RecordType PowerBI `
      -SessionId "AuditExport" -SessionCommand ReturnLargeSet `
      -ResultSize 5000
    $results | Export-Csv "audit-page-$page.csv" -Append -NoTypeInformation
    $page++
} while ($results.Count -eq 5000)
```

---

## 8. Compliance Reporting

### Generate a Data Access Report

```python
import requests
import pandas as pd

def get_workspace_access_report(workspace_ids: list, admin_token: str) -> pd.DataFrame:
    """Generate a report of all role assignments across workspaces."""
    rows = []
    base = "https://api.powerbi.com/v1.0/myorg/admin"

    for ws_id in workspace_ids:
        users = requests.get(
            f"{base}/groups/{ws_id}/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        ).json().get("value", [])

        for user in users:
            rows.append({
                "WorkspaceId": ws_id,
                "UserEmail": user.get("emailAddress"),
                "DisplayName": user.get("displayName"),
                "Role": user.get("groupUserAccessRight"),
                "PrincipalType": user.get("principalType"),
                "Identifier": user.get("identifier")
            })

    return pd.DataFrame(rows)

# Usage
df = get_workspace_access_report(workspace_ids=["ws1", "ws2"], admin_token=TOKEN)

# Flag over-privileged users
admins = df[df["Role"] == "Admin"]
print(f"Total Admin assignments: {len(admins)}")
print(admins[["WorkspaceId", "UserEmail", "DisplayName"]])
```

### Sensitivity Label Coverage Report

```powershell
# Get all items and their sensitivity labels across all workspaces
$report = @()
$workspaces = Invoke-PowerBIRestMethod -Url "admin/groups?$top=1000&$skip=0" | ConvertFrom-Json

foreach ($ws in $workspaces.value) {
    $items = Invoke-PowerBIRestMethod -Url "admin/groups/$($ws.id)/items" | ConvertFrom-Json
    foreach ($item in $items.value) {
        $report += [PSCustomObject]@{
            WorkspaceName   = $ws.name
            ItemName        = $item.displayName
            ItemType        = $item.type
            SensitivityLabel = $item.sensitivityLabel.name ?? "Unlabeled"
            LabelId         = $item.sensitivityLabel.id
        }
    }
}

# Summary: unlabeled items
$unlabeled = $report | Where-Object { $_.SensitivityLabel -eq "Unlabeled" }
Write-Host "Unlabeled items: $($unlabeled.Count) of $($report.Count)"
$unlabeled | Export-Csv "unlabeled-items.csv" -NoTypeInformation
```

---

## 9. Common Workflows

### Workflow 1: Workspace Security Review

```
1. Export all role assignments using PowerShell (Section 3)
2. Identify:
   - Users with Admin role who do not need it → downgrade to Member
   - Former employees still in workspaces → remove access
   - Groups with overly broad access → replace with scoped groups
3. Review item-level shares for external recipients
4. Check sensitivity label coverage (target: 100% labeled)
5. Review audit log for ExportReport/ShareDataset operations in last 30 days
6. Document findings in access review record
7. Apply remediations via PATCH/DELETE role assignment API
```

### Workflow 2: Regulatory Compliance Onboarding (GDPR/HIPAA)

```
1. Identify all items containing PII or PHI (via Purview Data Catalog scan)
2. Apply "Highly Confidential" sensitivity label to all PII/PHI items
3. Configure Purview DLP policy to block sharing of Highly Confidential items externally
4. Implement RLS on all semantic models exposing PII (limit rows to user's authorized scope)
5. Apply OLS to hide PII columns from roles that don't require them
6. Enable audit logging for all access to Highly Confidential items
7. Configure 1-year audit log retention
8. Document data lineage from PII sources to all downstream consumers
9. Schedule quarterly access reviews
```

### Workflow 3: New Workspace Provisioning with Security Baseline

```bash
# 1. Create workspace
WORKSPACE_ID=$(curl -X POST "https://api.fabric.microsoft.com/v1/workspaces" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"displayName": "Analytics-ProjectX", "capacityId": "'${CAPACITY_ID}'"}' | jq -r '.id')

# 2. Assign capacity
curl -X POST "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/assignToCapacity" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"capacityId": "'${CAPACITY_ID}'"}'

# 3. Add role assignments
# Admins group
curl -X POST "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/roleAssignments" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"principal": {"id": "'${ADMIN_GROUP_ID}'", "type": "Group"}, "role": "Admin"}'
# Contributors group
curl -X POST "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/roleAssignments" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"principal": {"id": "'${DEV_GROUP_ID}'", "type": "Group"}, "role": "Contributor"}'
# Viewers group
curl -X POST "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/roleAssignments" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"principal": {"id": "'${VIEWER_GROUP_ID}'", "type": "Group"}, "role": "Viewer"}'

# 4. Apply default sensitivity label to workspace
curl -X PATCH "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/sensitivityLabel" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"sensitivityLabelId": "'${GENERAL_LABEL_ID}'"}'
```

---

## 10. Error Handling and Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| `403 on workspace API` | Caller lacks Admin role | Assign Workspace Admin role to the service principal |
| Sensitivity label not available | Label not enabled for Fabric in Purview policy | Enable label in Purview > Label policies > Scope > Microsoft Fabric |
| Audit log search returns no results | Wrong record type or operations filter | Use `PowerBI` record type; check activity names match documented values |
| OneLake data access role not taking effect | Preview feature not enabled in tenant | Enable "OneLake data access roles" in Fabric admin portal |
| User sees items they shouldn't | Shared via item-level permission not visible in workspace RBAC | Check item-level permissions separately from workspace role assignments |
| Lineage shows broken connections | Item was renamed or moved | Re-connect in Fabric portal; update data source references |

---

## 11. Performance and Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Workspaces per tenant | 1,000 (default) | Contact Microsoft to increase |
| Users per workspace | 1,000 | Use security groups to scale access |
| Item-level permission assignments | 1,000 per item | |
| Sensitivity labels in tenant | 500 | |
| Audit log search result size | 50,000 rows per search | Paginate using sessions |
| Audit log retention (E3) | 90 days | Extend with Compliance add-on or export |
| OneLake data access roles per lakehouse | 100 | Preview limit |
| Purview scan frequency | 1 per day | |

---

## Progressive Disclosure — Reference Files

| Topic | File |
|---|---|
| Workspace roles — role definitions, assignment API, bulk audit, service principal patterns | [`references/workspace-roles.md`](./references/workspace-roles.md) |
| Sensitivity labels — label taxonomy, REST API, Purview integration, mandatory labeling | [`references/sensitivity-labels.md`](./references/sensitivity-labels.md) |
| Data governance — lineage, Purview Data Map, Scanner API, OneLake access roles | [`references/data-governance.md`](./references/data-governance.md) |
| Compliance reporting — audit logs, access reviews, label coverage, regulatory patterns | [`references/compliance-reporting.md`](./references/compliance-reporting.md) |
