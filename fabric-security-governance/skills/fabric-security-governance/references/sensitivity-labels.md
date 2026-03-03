# Sensitivity Labels — Taxonomy, REST API, Purview Integration, and Mandatory Labeling

This reference covers sensitivity label configuration, the Fabric REST API for label management, Microsoft Purview integration patterns, and mandatory labeling enforcement for Microsoft Fabric items.

---

## Sensitivity Label Architecture in Fabric

Fabric uses Microsoft Purview Information Protection (MIP) sensitivity labels — the same labels used across Microsoft 365 (Word, Excel, Teams, SharePoint). When a label is applied to a Fabric item:

1. The label metadata is stored with the item.
2. If the label has encryption settings, downstream exports (Power BI Desktop, Excel) inherit encryption.
3. If the label has visual markings (header/footer), exported reports include them.
4. The label appears in audit logs for compliance reporting.
5. Microsoft Purview DLP policies can block actions on items with specific labels.

**Label scope for Fabric**:
Labels must be scoped to "Items" (formerly "Azure Purview assets") in the label configuration to be available in Fabric. Labels scoped only to "Files and emails" do not appear in Fabric.

---

## Recommended Label Taxonomy

| Label Name | Internal Scope | External Sharing | Fabric Item Types | Protection Settings |
|-----------|---------------|-----------------|------------------|---------------------|
| Public | Approved for public | Yes | Reports, dashboards | None |
| General | Internal default | No by default | All items | Header: "Internal use only" |
| Confidential \ Anyone | Sensitive business data | With partner tenants | Reports, models | Encryption (authenticated users) |
| Confidential \ Recipients Only | Restricted business data | Restricted list | Models, lakehouses | Encryption + auditing |
| Highly Confidential \ All Employees | PII / regulated data | No | Lakehouses, warehouses, models | Encryption + expiry |
| Highly Confidential \ Specific People | Most sensitive | No | Source lakehouses, raw data | Encryption + specific user list |

**Inheritance chain**:
```
Raw Lakehouse (Highly Confidential)
    → Silver Lakehouse (inherits → Highly Confidential)
    → Gold Lakehouse (inherits → Confidential)
    → Semantic Model (inherits → Confidential)
    → Report (inherits → Confidential)
```
Configure inheritance in Purview to flow the highest label from source to downstream items.

---

## Sensitivity Label REST API

**Base URL**: `https://api.fabric.microsoft.com/v1`

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/sensitivityLabels` | Any authenticated user | — | Lists all labels available in tenant |
| GET | `/workspaces/{wId}/items/{itemId}/sensitivityLabel` | Workspace Viewer | — | Returns current label on item |
| PATCH | `/workspaces/{wId}/items/{itemId}/sensitivityLabel` | Workspace Contributor + Label User | `sensitivityLabelId` | Apply or change label |
| DELETE | `/workspaces/{wId}/items/{itemId}/sensitivityLabel` | Workspace Admin | — | Remove label (downgrade) |

```bash
TOKEN=$(az account get-access-token --resource https://api.fabric.microsoft.com --query accessToken -o tsv)

# Get available sensitivity labels
curl "https://api.fabric.microsoft.com/v1/sensitivityLabels" \
  -H "Authorization: Bearer ${TOKEN}"

# Response:
# {
#   "value": [
#     { "id": "...", "name": "Public", "description": "...", "color": "#00ff00" },
#     { "id": "...", "name": "General", ... },
#     { "id": "...", "name": "Confidential", ... },
#     { "id": "...", "name": "Highly Confidential", ... }
#   ]
# }

# Get current label on a Lakehouse
curl "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/items/${LAKEHOUSE_ID}/sensitivityLabel" \
  -H "Authorization: Bearer ${TOKEN}"

# Apply "Confidential" label to a Lakehouse
CONFIDENTIAL_LABEL_ID="your-confidential-label-guid"
curl -X PATCH \
  "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/items/${LAKEHOUSE_ID}/sensitivityLabel" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"sensitivityLabelId\": \"${CONFIDENTIAL_LABEL_ID}\"}"

# Remove a label (downgrades to unlabeled — requires justification in some orgs)
curl -X DELETE \
  "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/items/${ITEM_ID}/sensitivityLabel" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## Bulk Label Management

### Apply Label to All Items in a Workspace

```python
import requests

def apply_label_to_workspace(workspace_id: str, label_id: str, token: str,
                              item_types: list = None):
    """Apply a sensitivity label to all items in a workspace."""
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    base = "https://api.fabric.microsoft.com/v1"

    # Get all items
    items_resp = requests.get(f"{base}/workspaces/{workspace_id}/items", headers=headers)
    items = items_resp.json().get("value", [])

    results = {"success": [], "failed": [], "skipped": []}

    for item in items:
        # Filter by item type if specified
        if item_types and item["type"] not in item_types:
            results["skipped"].append(item["displayName"])
            continue

        # Apply label
        resp = requests.patch(
            f"{base}/workspaces/{workspace_id}/items/{item['id']}/sensitivityLabel",
            headers=headers,
            json={"sensitivityLabelId": label_id}
        )

        if resp.status_code in (200, 204):
            results["success"].append(item["displayName"])
        else:
            results["failed"].append({
                "name": item["displayName"],
                "error": resp.text
            })

    return results

# Apply "General" label to all items (Lakehouses, Warehouses only)
results = apply_label_to_workspace(
    workspace_id=WORKSPACE_ID,
    label_id=GENERAL_LABEL_ID,
    token=TOKEN,
    item_types=["Lakehouse", "Warehouse", "SemanticModel", "Report"]
)
print(f"Labeled: {len(results['success'])}, Failed: {len(results['failed'])}, Skipped: {len(results['skipped'])}")
```

### Label Coverage Report (PowerShell)

```powershell
# Requires Power BI Admin token
$adminToken = (az account get-access-token `
  --resource "https://analysis.windows.net/powerbi/api" `
  --query accessToken -o tsv)

$headers = @{ "Authorization" = "Bearer $adminToken" }

# Get all workspaces
$workspaces = Invoke-RestMethod `
  -Uri "https://api.powerbi.com/v1.0/myorg/admin/groups?`$top=1000" `
  -Headers $headers

$labelReport = @()
foreach ($ws in $workspaces.value) {
    # Get items with sensitivity labels via Scanner API (requires full scan)
    $items = Invoke-RestMethod `
      -Uri "https://api.powerbi.com/v1.0/myorg/admin/groups/$($ws.id)/artifacts" `
      -Headers $headers

    foreach ($item in $items.value) {
        $labelReport += [PSCustomObject]@{
            WorkspaceName    = $ws.name
            WorkspaceId      = $ws.id
            ItemName         = $item.displayName
            ItemType         = $item.type
            SensitivityLabel = if ($item.sensitivityLabel) { $item.sensitivityLabel.name } else { "UNLABELED" }
            LabelId          = $item.sensitivityLabel.id
        }
    }
}

# Summary statistics
$total = $labelReport.Count
$labeled = ($labelReport | Where-Object { $_.SensitivityLabel -ne "UNLABELED" }).Count
$coverage = [math]::Round(($labeled / $total) * 100, 1)
Write-Host "Label coverage: $labeled / $total ($coverage%)"

# Export unlabeled items requiring attention
$labelReport | Where-Object { $_.SensitivityLabel -eq "UNLABELED" } |
  Export-Csv "unlabeled-items-$(Get-Date -Format 'yyyyMMdd').csv" -NoTypeInformation
```

---

## Microsoft Purview Integration

### Connect Fabric to Purview

1. In Power BI Admin portal (or Fabric admin portal): **Tenant settings** > **Microsoft Purview hub** > **Connect to a Microsoft Purview account**.
2. Select the Purview account in the same Azure tenant.
3. All Fabric items automatically appear in the Purview Data Catalog under the `Microsoft Power BI` data source.

### Purview DLP Policies for Fabric

Data Loss Prevention policies in Purview can block or warn when users attempt to share Fabric items with specific labels to external recipients:

```
Purview portal > Data loss prevention > Policies > Create policy:

Name: Block external sharing of Highly Confidential Fabric items
Scope: Microsoft Fabric items
Conditions: Label is "Highly Confidential"
Action: Block sharing with external users
User notification: Yes — show policy tip explaining why sharing is blocked
```

**Supported DLP actions for Fabric**:
| Action | Description |
|--------|-------------|
| Block | Prevent the operation (e.g., share, export) |
| Override with justification | User can proceed but must provide a business justification |
| Audit only | Log the event without blocking |
| Notify user | Display a policy tip to the user |

### Purview Sensitivity Label Policies

Label policies in Purview control which labels are available to which users:

```
Purview portal > Information protection > Label policies > Create policy:

Policy name: Fabric Data Classification Policy
Labels to publish: Public, General, Confidential, Highly Confidential
Users and groups: All employees (or target specific groups)
Settings:
  - Require users to apply a label: No (recommend Yes for regulated orgs)
  - Default label: General
  - Require justification to change a label to lower classification: Yes
```

---

## Mandatory Labeling

### Configure Mandatory Labels

```
Purview portal > Information protection > Label policies > [Your policy] > Settings:
- "Users must apply a label" = Yes
- Applies when: Creating a new Fabric item
```

When mandatory labeling is enabled:
- Users creating a new Lakehouse, Warehouse, or Semantic Model are prompted to select a label.
- If they dismiss the dialog, a default label is applied automatically.
- Unlabeled items created via API are flagged in the mandatory labeling report.

### Detect Unlabeled Items via API (Scheduled Compliance Check)

```python
import requests
from datetime import datetime

def find_unlabeled_fabric_items(workspace_ids: list, token: str) -> list:
    """Find all Fabric items that do not have a sensitivity label."""
    unlabeled = []
    base = "https://api.fabric.microsoft.com/v1"
    headers = {"Authorization": f"Bearer {token}"}

    for ws_id in workspace_ids:
        items_resp = requests.get(f"{base}/workspaces/{ws_id}/items", headers=headers)
        for item in items_resp.json().get("value", []):
            label_resp = requests.get(
                f"{base}/workspaces/{ws_id}/items/{item['id']}/sensitivityLabel",
                headers=headers
            )
            if label_resp.status_code == 200:
                label_data = label_resp.json()
                if not label_data.get("sensitivityLabelId"):
                    unlabeled.append({
                        "workspaceId": ws_id,
                        "itemId": item["id"],
                        "itemName": item["displayName"],
                        "itemType": item["type"],
                        "detectedAt": datetime.now().isoformat()
                    })

    return unlabeled
```

---

## Error Codes and Remediation

| Error | Meaning | Fix |
|-------|---------|-----|
| `403: User is not authorized to apply this label` | Caller not authorized for label (user policy restriction) | Check that the user's Purview label policy includes this label |
| `Label not found` | Label GUID is incorrect or label not scoped to Fabric | Verify label ID via GET /sensitivityLabels; check Purview label scope includes Items |
| `Cannot downgrade label without justification` | Label policy requires justification for downgrade | Provide justification parameter in the PATCH request body |
| `409: Label protected by DLP policy` | DLP policy blocks label removal | Override requires DLP admin; document as exception |
| `Label inheritance conflict` | Downstream item has higher label than parent | Resolve by relabeling the source or accept the higher classification |

---

## Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Sensitivity labels per tenant | 500 | |
| Sublabels per parent label | 500 | |
| Label policies per tenant | 100 | |
| DLP policies for Fabric | No documented limit | |
| Label audit log retention | Follows M365 audit retention policy | 90 days E3, 1 year E5 |
| Bulk label API calls | 200 per minute | Throttle with retry logic |
