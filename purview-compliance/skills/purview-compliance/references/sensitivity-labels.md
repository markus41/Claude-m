# Sensitivity Labels — Microsoft Purview Reference

Sensitivity labels classify and protect content across Microsoft 365 — email, files, Teams, Groups, Sites, Power BI, and meetings. Labels can apply encryption, content marking (headers, footers, watermarks), and protection settings for containers (Teams, Groups, SharePoint sites).

---

## REST API Endpoints (Microsoft Graph)

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| GET | `/security/informationProtection/sensitivityLabels` | `InformationProtectionPolicy.Read` | `$expand=sublabels` | Lists labels visible to the calling user |
| GET | `/security/informationProtection/sensitivityLabels/{labelId}` | `InformationProtectionPolicy.Read` | — | Single label details |
| GET | `/security/informationProtection/sensitivityLabels/{id}/sublabels` | `InformationProtectionPolicy.Read` | — | Child labels of a parent |
| POST | `/security/informationProtection/sensitivityLabels/evaluateApplication` | `InformationProtectionPolicy.Read` | Body: contentInfo + labelActions | Evaluate auto-labeling rules |
| POST | `/security/informationProtection/sensitivityLabels/evaluateClassificationResults` | `InformationProtectionPolicy.Read` | Body: contentInfo + classificationResults | Evaluate SIT-based label recommendation |
| GET | `/beta/security/informationProtection/labelPolicies` | `InformationProtectionPolicy.Read` | — | List label publishing policies (beta) |

> **Primary management:** Use Security & Compliance PowerShell for label creation and policy publishing. The Graph API is primarily for reading labels and evaluating auto-labeling logic.

---

## PowerShell Cmdlets (Security & Compliance)

| Cmdlet | Purpose | Key Parameters |
|--------|---------|----------------|
| `Connect-IPPSSession` | Connect to S&C PowerShell | `-UserPrincipalName`, `-AppId`, `-CertificateThumbprint` |
| `Get-Label` | List sensitivity labels | `-Identity`, `-IncludeDetailedLabelActions` |
| `New-Label` | Create sensitivity label | `-Name`, `-DisplayName`, `-Tooltip`, `-ContentType`, `-EncryptionEnabled`, `-SiteAndGroupProtectionEnabled` |
| `Set-Label` | Update label settings | `-Identity`, `-EncryptionEnabled`, `-ContentMarkingEnabled` |
| `Remove-Label` | Delete label | `-Identity`, `-Confirm:$false` |
| `Get-LabelPolicy` | List label publishing policies | `-Identity` |
| `New-LabelPolicy` | Create label publishing policy | `-Name`, `-Labels`, `-ExchangeLocation`, `-SharePointLocation` |
| `Set-LabelPolicy` | Update policy scope or default label | `-Identity`, `-AddLabel`, `-RemoveLabel`, `-AdvancedSettings` |
| `Remove-LabelPolicy` | Delete publishing policy | `-Identity`, `-Confirm:$false` |
| `Get-AutoSensitivityLabelPolicy` | List auto-labeling policies | `-Identity` |
| `New-AutoSensitivityLabelPolicy` | Create auto-labeling policy | `-Name`, `-Mode`, `-ExchangeLocation`, `-SharePointLocation` |
| `New-AutoSensitivityLabelRule` | Add rule to auto-labeling policy | `-Name`, `-Policy`, `-ContentContainsSensitiveInformation`, `-ApplySensitivityLabel` |

---

## Label Taxonomy (Recommended Hierarchy)

| Label Name | Display Order | Protection Level | Encryption | Marking |
|-----------|--------------|-----------------|------------|---------|
| Public | 1 | None — already public | No | Footer: "Public" |
| General | 2 | Internal use only | No | Footer: "Internal" |
| Confidential | 3 | Business-sensitive | Optional (co-author) | Header: "CONFIDENTIAL" |
| Confidential \ All Employees | 3.1 | All employees can read | Yes (org-wide) | Header: "CONFIDENTIAL — All Employees" |
| Confidential \ Specific People | 3.2 | Specified users only | Yes (user-defined) | Header: "CONFIDENTIAL" |
| Highly Confidential | 4 | Restricted — executives, legal | Yes (explicit list) | Header + Watermark: "HIGHLY CONFIDENTIAL" |
| Highly Confidential \ Finance | 4.1 | Finance team only | Yes | Header + Watermark: "HIGHLY CONFIDENTIAL — Finance" |
| Highly Confidential \ Legal | 4.2 | Legal team only | Yes | Header + Watermark: "HIGHLY CONFIDENTIAL — Legal" |

---

## Label Creation Examples (PowerShell)

### Create "Confidential — All Employees" Label

```powershell
Connect-IPPSSession -UserPrincipalName "admin@contoso.com"

New-Label `
    -Name "Confidential_AllEmployees" `
    -DisplayName "Confidential \ All Employees" `
    -Tooltip "Business-sensitive data for all employees. Do not share externally." `
    -ContentType "File,Email" `
    -EncryptionEnabled $true `
    -EncryptionEncryptOnly $false `
    -EncryptionProtectionType "Template" `
    -EncryptionTemplateId "00000000-0000-0000-0000-000000000000" `
    -EncryptionRightsDefinitions "AllStaff-7184AB3F-CCD1-46F3-8233-3E09E9CF0E66:VIEW,VIEWRIGHTSDATA,DOCEDIT,EDIT,PRINT,EXTRACT,REPLY,REPLYALL,FORWARD,OBJMODEL" `
    -ContentMarkingEnabled $true `
    -ContentMarkingHeaderEnabled $true `
    -ContentMarkingHeaderText "CONFIDENTIAL — All Employees" `
    -ContentMarkingHeaderFontSize 12 `
    -ContentMarkingHeaderFontColor "#FF0000" `
    -ContentMarkingHeaderAlignment "Center" `
    -ParentId "Confidential" `
    -Priority 2
```

### Create "Highly Confidential" Parent Label

```powershell
New-Label `
    -Name "HighlyConfidential" `
    -DisplayName "Highly Confidential" `
    -Tooltip "Restricted content. Legal or executive access only." `
    -ContentType "File,Email,Site,UnifiedGroup" `
    -EncryptionEnabled $true `
    -EncryptionProtectionType "UserDefined" `
    -SiteAndGroupProtectionEnabled $true `
    -SiteAndGroupProtectionPrivacy "Private" `
    -SiteAndGroupProtectionAllowEmailFromGuestUsers $false `
    -SiteAndGroupProtectionAllowAccessFromUnmanagedDevices "BlockAccess" `
    -ContentMarkingEnabled $true `
    -ContentMarkingHeaderEnabled $true `
    -ContentMarkingHeaderText "HIGHLY CONFIDENTIAL" `
    -ContentMarkingWatermarkEnabled $true `
    -ContentMarkingWatermarkText "HIGHLY CONFIDENTIAL — Do Not Distribute" `
    -ContentMarkingWatermarkFontSize 36 `
    -ContentMarkingWatermarkLayout "Diagonal"
```

---

## Publish Labels via Label Policy

```powershell
# Publish selected labels to all users
New-LabelPolicy `
    -Name "Contoso Default Label Policy" `
    -Labels "Public","General","Confidential_AllEmployees","HighlyConfidential" `
    -ExchangeLocation All `
    -SharePointLocation All `
    -OneDriveLocation All

# Set a default label for users (optional — use sparingly)
Set-LabelPolicy `
    -Identity "Contoso Default Label Policy" `
    -AdvancedSettings @{
        DefaultLabelId = "00000000-label-guid-here-000000000000"
    }
```

---

## Auto-Labeling Policies

Auto-labeling automatically applies labels to content in SharePoint, OneDrive, and Exchange without user interaction.

### Create Auto-Labeling Policy

```powershell
# Create auto-labeling policy in simulation mode (always start here)
New-AutoSensitivityLabelPolicy `
    -Name "Auto-Label Credit Card Data" `
    -Mode TestWithoutNotifications `
    -ExchangeLocation All `
    -SharePointLocation All `
    -OneDriveLocation All `
    -Comment "Auto-apply Confidential to credit card content"

# Add detection rule
New-AutoSensitivityLabelRule `
    -Name "Detect Credit Card Numbers" `
    -Policy "Auto-Label Credit Card Data" `
    -ContentContainsSensitiveInformation @(
        @{ Name = "Credit Card Number"; minCount = 1; minConfidence = 85 }
    ) `
    -ApplySensitivityLabel "Confidential_AllEmployees" `
    -ReportSeverityLevel Medium
```

### Auto-Labeling Simulation Results

```powershell
# Check how many items would be labeled (simulation mode only)
Get-AutoSensitivityLabelPolicy -Identity "Auto-Label Credit Card Data" |
    Select -ExpandProperty Results

# After reviewing simulation results, promote to enforcement
Set-AutoSensitivityLabelPolicy -Identity "Auto-Label Credit Card Data" -Mode Enable
```

**Important:** Auto-labeling for existing content can take **7-14 days** to complete for large tenants. New content is labeled within 1-2 hours.

---

## Label Scopes

| Scope | `-ContentType` Value | What It Labels |
|-------|---------------------|----------------|
| Files & emails | `File,Email` | Office files, PDFs, emails |
| Meetings | `MeetingInvitation` | Teams and Outlook meeting invitations |
| Teams/Groups/Sites | `Site,UnifiedGroup` | Teams, M365 Groups, SharePoint sites |
| Power BI | `PurviewAssets` | Power BI reports and workspaces |
| Schematized assets | `SchematizedData` | SQL, Azure Purview data assets |

---

## Encryption Settings Reference

| Setting | Description | Recommended Value |
|---------|-------------|------------------|
| `EncryptionEnabled` | Enable encryption | `$true` for Confidential+ |
| `EncryptionProtectionType "Template"` | Use a predefined RMS template | Use for org-wide labels |
| `EncryptionProtectionType "UserDefined"` | User specifies recipients at apply time | Use for "Specific People" labels |
| `EncryptionProtectionType "RemoveProtection"` | Strip protection | Use only for "Public" declassification |
| `EncryptionDoNotForward $true` | Prevent forward/reply/copy | Use for executive comms |
| `EncryptionOfflineAccessDays` | Days content works offline | 30 days recommended |
| `EncryptionContentExpiredOnDateInDaysOrNever "Never"` | Content expiry | "Never" for most; set date for temp projects |

---

## Sites and Groups Protection Settings

| Setting | Value Options | Description |
|---------|--------------|-------------|
| `SiteAndGroupProtectionPrivacy` | `Public`, `Private` | Team/group visibility |
| `SiteAndGroupProtectionAllowAccessFromUnmanagedDevices` | `AllowFullAccess`, `AllowLimitedAccess`, `BlockAccess` | Unmanaged device policy |
| `SiteAndGroupProtectionAllowEmailFromGuestUsers` | `$true`, `$false` | Guest email to group |
| `SiteAndGroupProtectionAllowGuestUsers` | `$true`, `$false` | Allow guest access to site |
| `SiteAndGroupExternalSharingControlType` | `ExternalUserAndGuestSharing`, `ExistingExternalUserSharingOnly`, `ExternalUserSharingOnly`, `Disabled` | Site-level sharing limit |

---

## Label Analytics API (Graph Beta)

```typescript
// Get label usage analytics
const response = await client
  .api('/beta/security/informationProtection/labelPolicySyncRules')
  .get();

// Evaluate which label should apply to content
const evaluation = await client
  .api('/security/informationProtection/sensitivityLabels/evaluateApplication')
  .post({
    contentInfo: {
      '@odata.type': '#microsoft.graph.contentInfo',
      format: 'default',
      identifier: null,
      state: 'rest',
      metadata: [
        { name: 'MSIP_Label_abc123_Enabled', value: 'true' },
        { name: 'MSIP_Label_abc123_SiteId', value: 'tenant-id' },
        { name: 'MSIP_Label_abc123_Id', value: 'label-id' }
      ]
    },
    labelingOptions: {
      '@odata.type': '#microsoft.graph.labelingOptions',
      assignmentMethod: 'standard',
      downgradeJustification: null,
      extendedProperties: [],
      labelId: 'target-label-id'
    }
  });
```

---

## Error Codes

| Code | Meaning | Remediation |
|------|---------|-------------|
| 400 `LabelHierarchyViolation` | Sublabel assigned to non-parent or wrong parent | Verify parent label ID is correct |
| 400 `ContentTypeNotEnabled` | Label scope mismatch | Check `-ContentType` matches intended usage |
| 403 `Forbidden` | Not a Compliance Admin or Information Protection Admin | Assign role in M365 admin center |
| 404 `LabelNotFound` | Label GUID or name not found | Use `Get-Label` to list all labels and GUIDs |
| 409 `LabelAlreadyExists` | Duplicate label display name | Choose unique names; labels are tenant-wide |
| `SyncPending` | Label created but not propagated yet | Wait 15-30 minutes; re-run `Get-Label` |
| `EncryptionKeyConflict` | Multiple encryption settings conflict | Review label settings for contradictory options |

---

## Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Sensitivity labels per tenant | 500 | Across all policies |
| Parent labels | 25 | Sublabels count against the 500 limit |
| Sublabels per parent | 5 | UI limitation; API may accept more |
| Label policies per tenant | 25 | Each policy can include up to 500 labels |
| Auto-labeling policies | 100 | Separate from manual publishing policies |
| SITs per auto-labeling rule | 10 | Same as DLP rule limitation |
| Label propagation time (new content) | 1-2 hours | For Exchange and SharePoint new items |
| Label propagation time (existing content) | 7-14 days | Full crawl of SharePoint/OneDrive |
| Encryption offline access | 0-99 days | 0 = always requires online validation |

---

## Common Patterns and Gotchas

1. **Default label scope** — Labels created without `-ContentType` default to files only. Explicitly include `Site,UnifiedGroup` if you need container labeling for Teams and SharePoint.

2. **Sublabel ordering** — Within a parent, sublabels are ordered by `-Priority`. Lower number = higher priority (applies first in auto-labeling). Plan label order before deploying to avoid confusing users.

3. **Auto-labeling vs manual labeling** — Auto-labeling policies can be set to override existing labels (set `OverwriteLabel $true`). Use caution: this can downgrade manually applied labels.

4. **Encryption and co-authoring** — Encrypted files stored in SharePoint/OneDrive support co-authoring if "sensitivity label based encryption" uses Microsoft-managed keys (not customer-managed keys). CMK + co-authoring is not supported.

5. **Label persistence in email** — When an Outlook user replies to or forwards a labeled email, the label is inherited. If the user removes it, a justification is required (configure via `AdvancedSettings JustificationText`).

6. **Teams meeting labels** — Meeting labels are separate from message labels. A user can label a meeting invitation but the actual meeting chat messages use a different label scope.

7. **B2B guest access to encrypted content** — Guests from Azure AD tenants can access AES-256 encrypted content if their tenant trusts the label issuer. Anonymous guests cannot access encrypted content.

8. **Power BI labels** — Power BI labels require the dataset owner to have a Power BI Premium P1+ license. Labels on Power BI do not apply encryption to the underlying data — they provide classification only.

9. **Label removal audit** — Every label downgrade or removal is logged in the Purview audit log under `SensitivityLabelRemoved` event. Configure alert policies for unexpected label removals.

10. **Migration from AIP classic client** — The AIP unified labeling client reads sensitivity labels from the M365 compliance center. Remove the AIP classic client before deploying unified labeling to avoid conflicts.
