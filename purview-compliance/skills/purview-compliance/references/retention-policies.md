# Retention Policies — Microsoft Purview Reference

Microsoft Purview retention policies and retention labels control how long content is kept and what happens when the retention period expires. They apply across Exchange, SharePoint, OneDrive, Teams, and Yammer.

---

## REST API Endpoints (Microsoft Graph Beta)

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| GET | `https://graph.microsoft.com/beta/security/dataSecurityAndGovernance/retentionPolicies` | `RecordsManagement.Read.All` | `$top`, `$filter` | Beta only |
| GET | `https://graph.microsoft.com/beta/security/dataSecurityAndGovernance/retentionPolicies/{id}` | `RecordsManagement.Read.All` | — | Single policy |
| POST | `https://graph.microsoft.com/beta/security/dataSecurityAndGovernance/retentionPolicies` | `RecordsManagement.ReadWrite.All` | Body: policy object | Create policy |
| PATCH | `https://graph.microsoft.com/beta/security/dataSecurityAndGovernance/retentionPolicies/{id}` | `RecordsManagement.ReadWrite.All` | Partial update | Modify policy |
| DELETE | `https://graph.microsoft.com/beta/security/dataSecurityAndGovernance/retentionPolicies/{id}` | `RecordsManagement.ReadWrite.All` | — | Deletes policy |
| GET | `https://graph.microsoft.com/beta/security/dataSecurityAndGovernance/retentionLabels` | `RecordsManagement.Read.All` | `$top`, `$filter` | List retention labels |
| POST | `https://graph.microsoft.com/beta/security/dataSecurityAndGovernance/retentionLabels` | `RecordsManagement.ReadWrite.All` | Body: label object | Create label |
| GET | `https://graph.microsoft.com/beta/security/dataSecurityAndGovernance/retentionLabels/{id}/descriptors` | `RecordsManagement.Read.All` | — | Label metadata |

> **Primary management:** Security & Compliance PowerShell remains the most feature-complete interface. The Graph beta endpoints are useful for automated reporting and auditing.

---

## PowerShell Cmdlets (Security & Compliance)

| Cmdlet | Purpose | Key Parameters |
|--------|---------|----------------|
| `Get-ComplianceTag` | List retention labels | `-Identity`, `-IncludeDeleted` |
| `New-ComplianceTag` | Create retention label | `-Name`, `-RetentionAction`, `-RetentionDuration`, `-RetentionType`, `-IsRecordLabel`, `-IsRegulatoryLabel` |
| `Set-ComplianceTag` | Update label | `-Identity`, `-RetentionAction`, `-RetentionDuration` |
| `Remove-ComplianceTag` | Delete label | `-Identity`, `-Confirm:$false` |
| `Get-RetentionCompliancePolicy` | List retention policies | `-Identity`, `-DistributionDetail` |
| `New-RetentionCompliancePolicy` | Create retention policy | `-Name`, `-ExchangeLocation`, `-SharePointLocation`, `-RetainCloudAttachment` |
| `Set-RetentionCompliancePolicy` | Update policy | `-Identity`, `-AddExchangeLocation`, `-RemoveSharePointLocation` |
| `Remove-RetentionCompliancePolicy` | Delete policy | `-Identity`, `-ForceDeletion`, `-Confirm:$false` |
| `Get-RetentionComplianceRule` | List policy rules | `-Policy` |
| `New-RetentionComplianceRule` | Add rule to policy | `-Name`, `-Policy`, `-RetentionComplianceAction`, `-RetentionDuration` |
| `Set-RetentionComplianceRule` | Update rule | `-Identity`, `-RetentionDuration`, `-RetentionComplianceAction` |
| `Get-AppRetentionCompliancePolicy` | Teams/Yammer policies | — |
| `New-AppRetentionCompliancePolicy` | Create app-specific policy | `-Name`, `-AppGroups` |

---

## Retention Action Values

| Action | Description | Regulatory Use Case |
|--------|-------------|---------------------|
| `Keep` | Retain content indefinitely — never delete | Litigation hold, permanent records |
| `Delete` | Delete content after period — no forced retention before | Ephemeral data cleanup |
| `KeepAndDelete` | Retain for period, then delete | Standard records lifecycle (e.g., 7-year tax records) |

---

## Retention Type Values

| RetentionType | Timer Starts From | Use Case |
|--------------|------------------|----------|
| `CreationAgeInDays` | File/email creation date | Fixed-cycle documents |
| `ModificationAgeInDays` | Last modification date | Working documents |
| `EventAgeInDays` | A specific event date (event-based retention) | HR records, contracts |
| `TaggedAgeInDays` | When the retention label was applied | Manual label workflows |

---

## Policy Location Parameters

| Parameter | Workload | Value Examples |
|-----------|---------|----------------|
| `-ExchangeLocation` | Exchange mailboxes | `"All"`, specific UPN, distribution group |
| `-ExchangeLocationException` | Exclude from Exchange | Specific UPN to exclude |
| `-SharePointLocation` | SharePoint sites | `"All"`, specific site URL |
| `-OneDriveLocation` | OneDrive accounts | `"All"`, specific UPN |
| `-TeamsChannelLocation` | Teams channel messages | `"All"`, specific team |
| `-TeamsChatLocation` | Teams 1:1 and group chat | `"All"`, specific user |
| `-ModernGroupLocation` | M365 Groups | `"All"`, specific group |
| `-SkypeLocation` | Skype for Business | `"All"`, specific user |

---

## Retention Label and Policy Creation (PowerShell)

### Create 7-Year Financial Records Label

```powershell
Connect-IPPSSession -UserPrincipalName "admin@contoso.com"

# Create label: retain 7 years, then delete
New-ComplianceTag `
    -Name "Financial Records - 7 Year" `
    -Comment "Retain financial records for 7 years per SOX requirements." `
    -RetentionAction KeepAndDelete `
    -RetentionDuration 2555 `
    -RetentionType ModificationAgeInDays `
    -Notes "SOX Section 802 — financial records retention"
```

### Create Regulatory Record Label (Immutable)

```powershell
# Regulatory records: immutable — content cannot be deleted or modified during retention
New-ComplianceTag `
    -Name "Regulatory Record - 10 Year" `
    -RetentionAction KeepAndDelete `
    -RetentionDuration 3650 `
    -RetentionType CreationAgeInDays `
    -IsRegulatoryLabel $true `
    -Notes "SEC 17a-4 compliant — content is immutable"
```

> **Warning:** Regulatory labels are irreversible. Once applied to content, they cannot be removed. Require sign-off from Records Management and Legal before deploying.

### Create Legal Hold Label

```powershell
New-ComplianceTag `
    -Name "Legal Hold - Indefinite" `
    -RetentionAction Keep `
    -RetentionDuration Unlimited `
    -RetentionType CreationAgeInDays `
    -IsRecordLabel $false `
    -Notes "Applied by legal team for litigation hold"
```

---

## Retention Policy with Adaptive Scope

Adaptive scopes dynamically target content based on user/site attributes without requiring manual updates.

### Create Adaptive Scope

```powershell
# Create a scope targeting executive users (by department)
New-AdaptiveScopePolicy `
    -Name "Executive Users Scope" `
    -AdaptiveScopeType "User" `
    -AdaptiveScopeUserFilter "Department -eq 'Executive'"

# Create a scope targeting SharePoint sites with specific sensitivity label
New-AdaptiveScopePolicy `
    -Name "Confidential Sites Scope" `
    -AdaptiveScopeType "Site" `
    -AdaptiveScopeSiteFilter "SensitivityLabel -eq 'Highly Confidential'"
```

### Create Policy Using Adaptive Scope

```powershell
New-RetentionCompliancePolicy `
    -Name "Executive 10-Year Retention" `
    -AdaptiveScopeLocation "Executive Users Scope" `
    -Comment "Retain executive communications for 10 years"

New-RetentionComplianceRule `
    -Name "Executive Retention Rule" `
    -Policy "Executive 10-Year Retention" `
    -RetentionComplianceAction Keep `
    -RetentionDuration 3650
```

---

## Event-Based Retention

Event-based retention starts the retention clock when a specified event occurs (employee departure, contract end, etc.).

```powershell
# Step 1: Create event type
New-ComplianceRetentionEventType `
    -Name "Employee Departure" `
    -Description "Retention clock starts when an employee leaves the organization"

# Step 2: Create label linked to event type
New-ComplianceTag `
    -Name "Employee Records - Post Departure 7 Year" `
    -RetentionAction KeepAndDelete `
    -RetentionDuration 2555 `
    -RetentionType EventAgeInDays `
    -EventType "Employee Departure"

# Step 3: When event occurs, create event to start retention clock
New-ComplianceRetentionEvent `
    -Name "John Smith Departure 2026-03-01" `
    -EventType "Employee Departure" `
    -EventDateTime "2026-03-01T00:00:00Z" `
    -AssetLinkedEntities @(
        @{ ComplianceAssetId = "EMP-001234"; Workload = "Exchange"; ObjectId = "jsmith@contoso.com" }
    )
```

---

## Disposition Review

```powershell
# Create label with disposition review instead of auto-delete
New-ComplianceTag `
    -Name "Contracts - 5 Year With Review" `
    -RetentionAction KeepAndDelete `
    -RetentionDuration 1825 `
    -RetentionType CreationAgeInDays `
    -IsRecordLabel $false `
    -ReviewerEmail "records-manager@contoso.com","legal@contoso.com"

# List items pending disposition
Get-ComplianceSearch -Case "Disposition Review" | Where Status -eq "Completed"
```

---

## Preservation Lock

Preservation lock makes a retention policy immutable — it cannot be deleted or weakened.

```powershell
# IRREVERSIBLE — Requires explicit legal/compliance approval before running
# Lock a retention policy so it cannot be deleted or weakened
Set-RetentionCompliancePolicy -Identity "Financial Records Policy" -RestrictiveRetention $true

# Confirm lock status
Get-RetentionCompliancePolicy -Identity "Financial Records Policy" |
    Select Name, RestrictiveRetention
```

> **Warning:** Preservation lock is permanent and cannot be undone. Only apply after formal legal review.

---

## Compliance Search for Retained Items

```powershell
# Find content with a specific retention label applied
New-ComplianceSearch `
    -Name "Retained Financial Records Audit" `
    -ExchangeLocation All `
    -SharePointLocation All `
    -ContentMatchQuery "ComplianceTag:'Financial Records - 7 Year'"

Start-ComplianceSearch -Identity "Retained Financial Records Audit"

# Wait for completion
$search = Get-ComplianceSearch -Identity "Retained Financial Records Audit"
while ($search.Status -ne "Completed") {
    Start-Sleep 10
    $search = Get-ComplianceSearch -Identity "Retained Financial Records Audit"
}

Get-ComplianceSearch -Identity "Retained Financial Records Audit" |
    Select Name, Items, Size, Status
```

---

## Audit Events for Retention

```typescript
// Query retention-related audit events
const auditQuery = await client.api('/security/auditLog/queries').post({
  displayName: 'Retention Label Activity',
  filterStartDateTime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  filterEndDateTime: new Date().toISOString(),
  operationFilters: [
    'ApplyRetentionLabel',
    'RemoveRetentionLabel',
    'LabelDispositionReview',
    'LabelPolicyCreated',
    'LabelPolicyDeleted'
  ]
});
```

---

## Error Codes

| Code | Meaning | Remediation |
|------|---------|-------------|
| 400 `InvalidRetentionDuration` | Duration outside allowed range | Use days (integer); "Unlimited" for indefinite keep |
| 400 `PolicyScopeConflict` | Adaptive scope conflicts with static location | Use either adaptive or static locations, not both |
| 403 `Forbidden` | Missing Compliance Admin or Records Management role | Assign appropriate role in M365 admin center |
| 403 `PreservationLockViolation` | Attempt to weaken a preservation-locked policy | Preservation lock is permanent — cannot be modified |
| 404 `PolicyNotFound` | Policy identity not found | Verify exact policy name; use `Get-RetentionCompliancePolicy` |
| 409 `ContentOnLegalHold` | Cannot delete content under legal hold | Check for active legal holds on the mailbox/site |
| `LabelPublishPending` | Label created but not yet published to users | Wait 24-48 hours for propagation |
| `AdaptiveScopePending` | Adaptive scope not yet resolved | Scopes can take 1-3 days to evaluate all members |

---

## Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Retention policies per tenant | 10,000 | Includes all workload-specific policies |
| Retention labels per tenant | 1,000 | Labels are tenant-wide |
| Static policy locations | 1,000 per location type | Sites or mailboxes per policy |
| Adaptive scopes per tenant | 100 | Each scope queries dynamically |
| Retention label policies | 100 | Publishing policies for labels |
| Event types | 25 | For event-based retention |
| Disposition reviewers per label | 5 | Email addresses |
| Max retention duration | 36,500 days (100 years) | "Unlimited" option available |
| Min retention duration | 1 day | — |
| Audit log query date range | 180 days | Per query; chain queries for longer ranges |

---

## Common Patterns and Gotchas

1. **Retain wins over delete** — When multiple policies apply to the same item, the longest retention period wins. A 1-year delete policy is overridden by a 7-year keep policy on the same mailbox. Plan scope carefully.

2. **Teams messages and channel messages are separate** — Teams 1:1 chat (stored in user mailboxes) and channel messages (stored in group mailboxes) require separate location parameters in retention policies. Missing one means the other is not covered.

3. **SharePoint versioning** — Retention policies on SharePoint preserve all versions within the retention period, not just the latest. This can consume significant storage. Monitor with `Get-SPOSiteStorageQuota`.

4. **Deleted user mailboxes** — When a user is deleted from Entra ID, their mailbox enters a 30-day soft-deleted state. Retention policies continue to apply during this period. After 30 days, the mailbox is purged unless explicitly put on litigation hold.

5. **Cloud attachment retention** — Teams messages with file attachments in SharePoint/OneDrive are retained via cloud attachment tracking. Enable `-RetainCloudAttachment $true` on Exchange retention policies to include attachment versions.

6. **Adaptive scope lag** — Adaptive scopes dynamically resolve membership daily. New sites or users added to scope criteria will not be covered for up to 24 hours. Do not rely on adaptive scopes for immediate legal hold scenarios — use explicit static locations for urgent holds.

7. **Regulatory labels block relabeling** — Once a regulatory label is applied to an item, users cannot apply a different label (even a higher-priority one) without admin override. Test regulatory labels thoroughly before deploying.

8. **Disposition review email delays** — Disposition review notification emails are sent once daily. Reviewers should expect up to 24 hours between expiry and notification.

9. **Labels vs policies precedence** — A retention label applied directly to an item always takes precedence over a retention policy applied to the location. Users can manually apply labels that override auto-apply policies.

10. **Litigation hold vs retention policy** — Litigation hold (per-mailbox In-Place Hold) is a legacy mechanism. Microsoft recommends migration to Purview retention policies. Litigation hold from EXO commands (`Set-Mailbox -LitigationHoldEnabled $true`) still works but creates InPlaceHolds that are not visible in the Purview compliance center.
