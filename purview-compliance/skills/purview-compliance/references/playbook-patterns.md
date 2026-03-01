# Purview Compliance Playbook Patterns

API patterns and PowerShell commands for compliance playbook automation.

## Retention Labels & Policies

### Create Retention Label (PowerShell)
```powershell
# Connect to Security & Compliance
Connect-IPPSSession -UserPrincipalName admin@contoso.com

# Create retention label: 7-year retain then delete
New-ComplianceTag -Name "HR-7Year-Delete" `
  -RetentionAction Delete `
  -RetentionDuration 2555 `
  -RetentionType CreationAgeInDays `
  -Comment "HR document retention per policy"
```

### Publish Retention Label Policy
```powershell
New-RetentionCompliancePolicy -Name "HR Retention Policy" `
  -SharePointLocation "https://contoso.sharepoint.com/sites/HR" `
  -ExchangeLocation "All"

New-RetentionComplianceRule -Policy "HR Retention Policy" `
  -PublishComplianceTag "HR-7Year-Delete"
```

### Graph Beta — Retention Labels
```
POST https://graph.microsoft.com/beta/security/labels/retentionLabels
{
  "displayName": "HR-7Year-Delete",
  "descriptionForAdmins": "Retain HR documents for 7 years then auto-delete",
  "retentionDuration": { "days": 2555 },
  "actionAfterRetentionPeriod": "delete",
  "behaviorDuringRetentionPeriod": "retain"
}
```

## DLP Policies

### Create DLP Policy (PowerShell)
```powershell
# Create DLP policy for credit card detection
New-DlpCompliancePolicy -Name "Block External CC Sharing" `
  -ExchangeLocation All `
  -SharePointLocation All `
  -OneDriveLocation All `
  -TeamsLocation All `
  -Mode TestWithNotifications  # Start in test mode

New-DlpComplianceRule -Policy "Block External CC Sharing" `
  -Name "Credit Card Rule" `
  -ContentContainsSensitiveInformation @{Name="Credit Card Number"; minCount="1"} `
  -BlockAccess $true `
  -BlockAccessScope NotInOrganization `
  -NotifyUser Owner `
  -GenerateIncidentReport SiteAdmin
```

### Promote to Enforcement
```powershell
Set-DlpCompliancePolicy -Identity "Block External CC Sharing" -Mode Enable
```

## Sensitivity Labels

### Create Sensitivity Label (PowerShell)
```powershell
New-Label -DisplayName "Confidential - Project" `
  -Name "Confidential-Project" `
  -Tooltip "Apply to confidential project documents" `
  -ContentType "File, Email" `
  -EncryptionEnabled $true `
  -EncryptionProtectionType "Template" `
  -EncryptionRightsDefinitions "user1@contoso.com:VIEW,EDIT;group@contoso.com:VIEW"

# Publish via label policy
New-LabelPolicy -Name "Confidential Project Policy" `
  -Labels "Confidential-Project" `
  -ExchangeLocation All `
  -ModernGroupLocation All
```

## eDiscovery

### Create Case & Add Custodians (Graph)
```
POST https://graph.microsoft.com/v1.0/security/cases/ediscoveryCases
{
  "displayName": "Investigation 2026-001",
  "description": "Internal review"
}

POST https://graph.microsoft.com/v1.0/security/cases/ediscoveryCases/{caseId}/custodians
{
  "email": "user@contoso.com"
}
```

### Place Hold
```
POST https://graph.microsoft.com/v1.0/security/cases/ediscoveryCases/{caseId}/legalHolds
{
  "displayName": "Hold - Investigation 2026-001",
  "isEnabled": true,
  "contentQuery": "date:2025-01-01..2026-03-01"
}
```

## Required Permissions

| Operation | Permission / Role |
|---|---|
| Retention labels | Compliance Administrator or Records Management role |
| DLP policies | Compliance Administrator or DLP Compliance Management role |
| Sensitivity labels | Compliance Administrator or Information Protection role |
| eDiscovery | eDiscovery Manager or eDiscovery Administrator role |
| Graph beta labels API | `RecordsManagement.ReadWrite.All` (application) |
| eDiscovery Graph API | `eDiscovery.ReadWrite.All` (application) |
