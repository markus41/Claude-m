# Compliance Reporting — Audit Logs, Access Reviews, Label Coverage, and Regulatory Patterns

This reference covers generating compliance reports for Microsoft Fabric deployments: audit log queries, periodic access reviews, sensitivity label coverage tracking, and patterns for regulatory frameworks (GDPR, HIPAA, SOC 2).

---

## Unified Audit Log for Fabric

All Fabric user and admin activities are logged in the Microsoft 365 Unified Audit Log under the `PowerBI` record type.

### Access Audit Logs

**Requirements**: Global Administrator, Compliance Administrator, or Audit Reader role in Microsoft 365.

```powershell
# Connect to Security & Compliance PowerShell
Connect-IPPSSession -UserPrincipalName "admin@contoso.com"

# Or use certificate-based auth (for automation)
Connect-IPPSSession -AppId $APP_ID -CertificateThumbprint $CERT_THUMBPRINT -Organization "contoso.com"
```

### High-Risk Event Search

```powershell
# Search for data export events (last 30 days)
$exports = Search-UnifiedAuditLog `
  -StartDate (Get-Date).AddDays(-30) `
  -EndDate (Get-Date) `
  -RecordType PowerBI `
  -Operations "ExportReport,ExportDataflow,ExportTile,ExportArtifact" `
  -ResultSize 5000

$exports | ForEach-Object {
    $data = $_.AuditData | ConvertFrom-Json
    [PSCustomObject]@{
        Timestamp     = $_.CreationDate
        UserEmail     = $_.UserIds
        Operation     = $_.Operations
        WorkspaceId   = $data.WorkSpaceId
        WorkspaceName = $data.WorkSpaceName
        ArtifactName  = $data.ArtifactName
        ExportFormat  = $data.ExportEventActivityTypeParameter
    }
} | Export-Csv "data-export-audit.csv" -NoTypeInformation

# Search for workspace access changes (additions and removals)
$accessChanges = Search-UnifiedAuditLog `
  -StartDate (Get-Date).AddDays(-90) `
  -EndDate (Get-Date) `
  -RecordType PowerBI `
  -Operations "AddWorkspaceUser,DeleteWorkspaceUser,UpdateWorkspaceUser" `
  -ResultSize 5000

# Search for external sharing events
$sharing = Search-UnifiedAuditLog `
  -StartDate (Get-Date).AddDays(-30) `
  -EndDate (Get-Date) `
  -RecordType PowerBI `
  -Operations "ShareReport,ShareDashboard,ShareDataset,CreateShareLink" `
  -ResultSize 5000

# Search for admin operations (capacity, tenant settings)
$adminOps = Search-UnifiedAuditLog `
  -StartDate (Get-Date).AddDays(-90) `
  -EndDate (Get-Date) `
  -RecordType PowerBI `
  -Operations "PatchCapacityInformation,ChangeCapacityState,CreateFabricCapacity" `
  -ResultSize 5000
```

### Key Audit Operations for Compliance

| Category | Operations | Compliance Relevance |
|----------|-----------|---------------------|
| Data export | `ExportReport`, `ExportDataflow` | GDPR data subject requests; data exfiltration detection |
| Access changes | `AddWorkspaceUser`, `DeleteWorkspaceUser` | Access review evidence; offboarding verification |
| External sharing | `ShareReport`, `CreateShareLink` | Data residency; third-party data sharing controls |
| Capacity changes | `ChangeCapacityState`, `PatchCapacityInformation` | Change management; cost control |
| Admin settings | `UpdatedAdminFeatureSwitch` | Tenant configuration changes; security policy drift |
| Item operations | `CreateLakehouse`, `DeleteWorkspace` | Asset inventory; data deletion records |
| Authentication | `SignInWithDeviceCredential` | Anomalous sign-in detection |
| Label changes | `SensitivityLabelApplied`, `SensitivityLabelChanged` | Classification audit trail |

### Audit Log Streaming to Log Analytics

For real-time alerting and longer retention:

```powershell
# Configure via Microsoft 365 Compliance Center:
# Settings > Audit > Audit log retention policies > Create policy
# OR use Microsoft Sentinel connector to stream audit logs

# Query audit logs from Log Analytics (after connector setup)
# KQL query in Log Analytics:
# OfficeActivity
# | where OfficeWorkload == "PowerBI"
# | where Operation in ("ExportReport", "ShareDataset")
# | where TimeGenerated > ago(7d)
# | project TimeGenerated, UserId, Operation, OfficeObjectId, ClientIP
# | order by TimeGenerated desc
```

---

## Access Review Process

### Quarterly Access Review Script

```python
import requests
import pandas as pd
from datetime import datetime, timedelta

def generate_access_review_report(
    workspace_ids: list,
    admin_token: str,
    output_file: str
) -> pd.DataFrame:
    """
    Generate quarterly access review report.
    Returns DataFrame with all role assignments flagged for review.
    """
    headers = {"Authorization": f"Bearer {admin_token}"}
    base = "https://api.powerbi.com/v1.0/myorg/admin"

    records = []
    for ws_id in workspace_ids:
        # Get workspace info
        ws_info = requests.get(f"{base}/groups/{ws_id}", headers=headers).json()

        # Get all users
        users = requests.get(f"{base}/groups/{ws_id}/users", headers=headers).json().get("value", [])

        for user in users:
            role = user.get("groupUserAccessRight")
            principal_type = user.get("principalType")

            # Flag items for review
            flags = []
            if role == "Admin" and principal_type == "User":
                flags.append("REVIEW: Personal Admin (prefer group assignment)")
            if role == "Admin":
                flags.append("REVIEW: Admin role — confirm business justification")
            if principal_type == "User" and not user.get("emailAddress", "").endswith("@contoso.com"):
                flags.append("REVIEW: External user — verify ongoing need")

            records.append({
                "ReviewDate": datetime.now().strftime("%Y-%m-%d"),
                "WorkspaceName": ws_info.get("name"),
                "WorkspaceId": ws_id,
                "CapacityId": ws_info.get("capacityId", "None"),
                "UserDisplayName": user.get("displayName"),
                "UserEmail": user.get("emailAddress"),
                "PrincipalType": principal_type,
                "Role": role,
                "ReviewFlags": "; ".join(flags) if flags else "OK",
                "RequiresReview": "YES" if flags else "NO",
                "ReviewedBy": "",        # To be filled by reviewer
                "ReviewDecision": "",    # Retain / Remove / Downgrade
                "ReviewComment": ""
            })

    df = pd.DataFrame(records)
    df.to_excel(output_file, index=False, sheet_name="Access Review")
    return df

# Run quarterly review
df = generate_access_review_report(
    workspace_ids=ALL_WORKSPACE_IDS,
    admin_token=ADMIN_TOKEN,
    output_file=f"access-review-{datetime.now().strftime('%Y-Q%m')}.xlsx"
)

print(f"Total assignments: {len(df)}")
print(f"Requiring review: {len(df[df['RequiresReview'] == 'YES'])}")
```

### Revoke Access Post-Review

```python
def revoke_access_from_review(review_df: pd.DataFrame, token: str, dry_run: bool = True):
    """Remove access for assignments marked as 'Remove' in review."""
    headers = {"Authorization": f"Bearer {token}"}
    base_pbi = "https://api.powerbi.com/v1.0/myorg/admin/groups"

    removals = review_df[review_df["ReviewDecision"] == "Remove"]
    print(f"{'[DRY RUN] ' if dry_run else ''}Removing {len(removals)} access assignments...")

    for _, row in removals.iterrows():
        if not dry_run:
            resp = requests.delete(
                f"{base_pbi}/{row['WorkspaceId']}/users/{row['UserEmail']}",
                headers=headers
            )
            status = resp.status_code
        else:
            status = "DRY_RUN"
        print(f"{status}: Remove {row['UserEmail']} ({row['Role']}) from {row['WorkspaceName']}")
```

---

## Sensitivity Label Coverage Dashboard

### Label Coverage KPIs

```python
def calculate_label_coverage(workspace_ids: list, token: str) -> dict:
    """Calculate sensitivity label coverage metrics across workspaces."""
    base = "https://api.fabric.microsoft.com/v1"
    headers = {"Authorization": f"Bearer {token}"}

    stats = {
        "total_items": 0,
        "labeled_items": 0,
        "by_label": {},
        "by_type": {},
        "unlabeled_high_risk": []  # Lakehouses and Warehouses without labels
    }

    for ws_id in workspace_ids:
        items = requests.get(f"{base}/workspaces/{ws_id}/items", headers=headers).json().get("value", [])

        for item in items:
            stats["total_items"] += 1
            item_type = item.get("type")

            # Get label
            label_resp = requests.get(
                f"{base}/workspaces/{ws_id}/items/{item['id']}/sensitivityLabel",
                headers=headers
            )
            label_name = None
            if label_resp.status_code == 200:
                label_data = label_resp.json()
                label_name = label_data.get("sensitivityLabelDisplayName")

            if label_name:
                stats["labeled_items"] += 1
                stats["by_label"][label_name] = stats["by_label"].get(label_name, 0) + 1
            else:
                # Flag unlabeled high-risk items
                if item_type in ("Lakehouse", "Warehouse", "SemanticModel"):
                    stats["unlabeled_high_risk"].append({
                        "workspaceId": ws_id,
                        "itemId": item["id"],
                        "itemName": item["displayName"],
                        "itemType": item_type
                    })

            stats["by_type"][item_type] = stats["by_type"].get(item_type, {"total": 0, "labeled": 0})
            stats["by_type"][item_type]["total"] += 1
            if label_name:
                stats["by_type"][item_type]["labeled"] += 1

    stats["coverage_pct"] = round(stats["labeled_items"] / max(stats["total_items"], 1) * 100, 1)
    return stats
```

---

## Regulatory Compliance Patterns

### GDPR Compliance Checklist

```
Article 5 (Data minimization):
  [ ] Lakehouses containing personal data have documented data minimization policies
  [ ] PII tables are scoped to minimum required columns (use OLS to restrict)
  [ ] Retention policies set on Lakehouses containing personal data
  [ ] Delta table vacuum scheduled to remove deleted records

Article 13/14 (Transparency):
  [ ] Sensitivity labels applied to all items containing personal data
  [ ] Data catalog (Purview) documents processing purposes for all Fabric items
  [ ] Lineage documented from data subjects to all downstream consumers

Article 17 (Right to erasure):
  [ ] Process documented for removing a specific individual's data from Delta tables
  [ ] GDPR delete runbook tested and can complete within 30-day SLA
  [ ] Soft-delete strategy: use Delta CDC to propagate deletes to all downstream tables

Article 25 (Data protection by design):
  [ ] RLS applied on all semantic models exposing personal data
  [ ] OLS applied to hide sensitive columns from non-authorized roles
  [ ] OneLake data access roles restrict table-level access in shared Lakehouses
  [ ] Service principal accounts used for automation (not personal accounts)

Article 30 (Records of processing):
  [ ] Purview Data Catalog documents all Fabric items processing personal data
  [ ] Scanner API results exported monthly and retained for 3 years
  [ ] Access review records retained for 3 years
```

### HIPAA Compliance Checklist

```
Technical safeguards (§164.312):
  [ ] Access controls: workspace RBAC + OneLake data access roles implemented
  [ ] Audit controls: M365 audit logs enabled with 1-year retention
  [ ] Integrity controls: Delta table ACID transactions ensure data integrity
  [ ] Transmission security: all Fabric data in transit uses TLS 1.2+
  [ ] Encryption at rest: Fabric uses AES-256; keys managed by Microsoft (or BYOK)

Physical safeguards (§164.310):
  [ ] Fabric capacity deployed in HIPAA-compliant Azure region
  [ ] Business Associate Agreement (BAA) signed with Microsoft

Administrative safeguards (§164.308):
  [ ] Quarterly access reviews documented
  [ ] Sensitivity label "Highly Confidential - PHI" applied to all PHI data
  [ ] Incident response runbook documented for PHI data breaches
  [ ] Workforce training records maintained
  [ ] Minimum necessary access principle enforced (Viewer for consumers)
```

### SOC 2 Type II Evidence Collection

```python
def collect_soc2_evidence(
    review_period_start: str,
    review_period_end: str,
    admin_token: str,
    output_dir: str
) -> None:
    """Collect SOC 2 Type II evidence for a review period."""
    import os
    os.makedirs(output_dir, exist_ok=True)

    # CC6.1 — Logical and Physical Access Controls
    # Evidence: Role assignments snapshot at start and end of period
    # (run access review script above and save output)

    # CC6.2 — Access provisioning/deprovisioning
    # Evidence: Audit log of AddWorkspaceUser/DeleteWorkspaceUser
    print("Collecting access change events...")
    # Export audit log via Search-UnifiedAuditLog (PowerShell)

    # CC6.3 — Multi-factor authentication
    # Evidence: Conditional Access policy requiring MFA for Fabric users
    # Export from Azure AD Conditional Access policies

    # CC7.1 — System monitoring
    # Evidence: Audit log enabled, retention policy configured, alerts on ExportReport
    print(f"SOC 2 evidence collected to {output_dir}")
```

---

## Compliance Report Templates

### Monthly Governance Summary

```markdown
# Fabric Governance Report — [Month Year]

## Executive Summary
- Total Fabric workspaces: [N]
- Label coverage: [X]% (Target: 95%)
- High-risk unlabeled items: [N] (Target: 0)
- Access reviews completed: Yes/No
- Audit log incidents detected: [N]

## Access Review Highlights
- Assignments reviewed: [N]
- Assignments removed (over-privilege): [N]
- External users with access: [N]
- Service principal accounts audited: [N]

## Sensitivity Label Status
| Label | Count | % of Total |
|-------|-------|-----------|
| Public | [N] | [X]% |
| General | [N] | [X]% |
| Confidential | [N] | [X]% |
| Highly Confidential | [N] | [X]% |
| Unlabeled | [N] | [X]% |

## High-Risk Events (Last 30 Days)
- Data exports: [N] events
- External sharing: [N] events
- Admin setting changes: [N] events
- Capacity changes: [N] events

## Remediation Actions
1. [Description of action taken]
2. [Description of action taken]

## Next Steps
- [ ] Quarterly access review due: [Date]
- [ ] Label policy review: [Date]
- [ ] Purview scan verification: [Date]
```

---

## Error Codes and Remediation

| Error | Meaning | Fix |
|-------|---------|-----|
| `Search-UnifiedAuditLog: access denied` | User lacks Compliance Administrator or Audit Reader role | Assign M365 Audit Reader role in M365 admin center |
| `Audit log not enabled` | Audit logging was not turned on for the tenant | Enable in M365 compliance center > Audit > Start recording |
| `Search returns 0 results` | Wrong record type or date range before enablement | Verify `PowerBI` record type; check audit log was enabled before the date range |
| `Scanner API quota exceeded` | Too many scan requests | Use incremental scans with `modifiedSince`; reduce scan frequency |
| `Label downgrade blocked` | Purview policy requires justification | Provide justification in request; document exception |

---

## Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Audit log search result size | 50,000 rows | Paginate using session commands |
| Audit log retention (default E3) | 90 days | Extend with E5 or Compliance add-on |
| Audit log retention (E5) | 1 year | Further extend via retention policy export |
| Unified audit log availability | Within 30 minutes | Some operations may appear later |
| Scanner API batch size | 100 workspaces | Split large tenants |
| Scanner API calls per hour | 10 | Use incremental approach |
