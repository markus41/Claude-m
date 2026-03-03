# DLP Policies — Microsoft Purview Reference

Data Loss Prevention (DLP) policies in Microsoft Purview protect sensitive information across Exchange Online, SharePoint, OneDrive, Teams, Endpoint devices, and Power BI. Policies match content against sensitive information types (SITs) and apply protective actions.

---

## REST API Endpoints (Security & Compliance — Graph Beta)

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| GET | `https://graph.microsoft.com/beta/security/dataSecurityAndGovernance/dlpPolicies` | `SecurityEvents.Read.All` | `$top`, `$filter` | Beta endpoint; returns policy summaries |
| GET | `https://graph.microsoft.com/beta/security/dataSecurityAndGovernance/dlpPolicies/{policyId}` | `SecurityEvents.Read.All` | — | Full policy detail |
| POST | `https://graph.microsoft.com/beta/security/dataSecurityAndGovernance/dlpPolicies` | `SecurityEvents.ReadWrite.All` | Body: policy object | Create policy |
| PATCH | `https://graph.microsoft.com/beta/security/dataSecurityAndGovernance/dlpPolicies/{policyId}` | `SecurityEvents.ReadWrite.All` | Partial update body | Update policy mode or name |
| DELETE | `https://graph.microsoft.com/beta/security/dataSecurityAndGovernance/dlpPolicies/{policyId}` | `SecurityEvents.ReadWrite.All` | — | Permanently deletes policy |

> **Production note:** The primary management surface for DLP policies is Security & Compliance PowerShell (`Connect-IPPSSession`). The Graph beta endpoint is read-heavy. Use PowerShell for full policy authoring.

---

## PowerShell Cmdlets (Security & Compliance)

| Cmdlet | Purpose | Key Parameters |
|--------|---------|----------------|
| `Connect-IPPSSession` | Connect to S&C PowerShell | `-UserPrincipalName`, `-AppId`, `-CertificateThumbprint` |
| `Get-DlpCompliancePolicy` | List all DLP policies | `-Identity` (optional filter) |
| `New-DlpCompliancePolicy` | Create new DLP policy | `-Name`, `-Mode`, `-ExchangeLocation`, `-SharePointLocation`, `-TeamsLocation`, `-EndpointDlpLocation` |
| `Set-DlpCompliancePolicy` | Update existing policy | `-Identity`, `-Mode`, `-AddExchangeLocation`, `-RemoveSharePointLocation` |
| `Remove-DlpCompliancePolicy` | Delete policy | `-Identity`, `-Confirm:$false` |
| `Get-DlpComplianceRule` | List rules within a policy | `-Policy` |
| `New-DlpComplianceRule` | Add rule to policy | `-Name`, `-Policy`, `-ContentContainsSensitiveInformation`, `-BlockAccess`, `-NotifyUser` |
| `Set-DlpComplianceRule` | Update rule conditions/actions | `-Identity`, `-ContentContainsSensitiveInformation`, `-BlockAccess` |
| `Remove-DlpComplianceRule` | Delete a rule | `-Identity`, `-Confirm:$false` |
| `Get-DlpSensitiveInformationType` | List available SITs | `-Identity` (optional) |
| `Get-DlpSensitiveInformationTypeRulePackage` | List custom SIT packages | — |
| `New-DlpSensitiveInformationTypeRulePackage` | Import custom SIT XML | `-FileData` |
| `Get-DlpDetailReport` | DLP incident details | `-StartDate`, `-EndDate`, `-Action`, `-DlpCompliancePolicy` |
| `Get-DlpIncidentDetailReport` | Extended incident report | `-StartDate`, `-EndDate` |
| `Export-ActivityExplorerData` | Export DLP activity | `-StartTime`, `-EndTime`, `-OutputFormat` |

---

## Policy Mode Values

| Mode | Enforcement Behavior | Use Case |
|------|---------------------|----------|
| `Disable` | Policy is off, no detection | Draft state |
| `TestWithoutNotifications` | Detects matches, logs silently | Initial baseline measurement |
| `TestWithNotifications` | Detects matches, shows policy tips | User education phase |
| `Enable` | Full enforcement — blocks, notifies, restricts | Production enforcement |

**Recommended rollout:** `TestWithoutNotifications` → 1 week → `TestWithNotifications` → 2-4 weeks → `Enable`

---

## Policy Location Parameters

| Location Parameter | Workload Covered | Value |
|-------------------|-----------------|-------|
| `-ExchangeLocation` | Exchange Online email | `"All"` or specific UPN/group |
| `-SharePointLocation` | SharePoint sites | `"All"` or specific site URL |
| `-OneDriveLocation` | OneDrive for Business | `"All"` or specific UPN |
| `-TeamsLocation` | Teams chat/channel messages | `"All"` or specific user/group |
| `-EndpointDlpLocation` | Endpoint (Intune-managed devices) | `"All"` or specific user/group |
| `-PowerBIDlpLocation` | Power BI workspaces | `"All"` or specific workspace |
| `-ThirdPartyAppDlpLocation` | Connected non-Microsoft apps (MDCA) | `"All"` |

---

## Sensitive Information Type Conditions

### ContentContainsSensitiveInformation Parameter Format

```powershell
$sensitiveTypes = @(
    @{
        Name = "Credit Card Number"
        minCount = 1
        maxCount = $null
        minConfidence = 85
        maxConfidence = 100
    },
    @{
        Name = "U.S. Social Security Number (SSN)"
        minCount = 1
        maxCount = $null
        minConfidence = 75
        maxConfidence = 100
    }
)

New-DlpComplianceRule `
    -Name "Block High-Confidence PII" `
    -Policy "PII Protection Policy" `
    -ContentContainsSensitiveInformation $sensitiveTypes `
    -BlockAccess $true `
    -NotifyUser "SiteAdmin","LastModifier" `
    -GenerateIncidentReport "SiteAdmin" `
    -IncidentReportContent "All"
```

### Confidence Level Reference

| Confidence Level | Range | Pattern Match Strength | Recommended Action |
|-----------------|-------|------------------------|-------------------|
| Low | 65-74% | Partial pattern, keyword context | Log only |
| Medium | 75-84% | Good pattern match with some context | Notify user |
| High | 85-100% | Strong pattern + corroborating evidence | Block or encrypt |

---

## DLP Rule Actions

| Action Parameter | Description | Works In |
|-----------------|-------------|----------|
| `-BlockAccess $true` | Prevent access to content | SharePoint, OneDrive |
| `-BlockAccessScope "PerUser"` | Block specific users | SharePoint, OneDrive |
| `-NotifyUser "LastModifier","SiteAdmin"` | Send policy tip to users | Exchange, SharePoint, Teams |
| `-NotifyUserType "NotifyOnly"` | Tip only, no block | All |
| `-NotifyUserType "BlockAccess"` | Block + tip | All |
| `-NotifyUserType "BlockWithOverride"` | Block but allow business justification | All |
| `-NotifyEmailMessage "Custom tip text"` | Custom policy tip message | All |
| `-GenerateIncidentReport "SiteAdmin"` | Send incident report email | All |
| `-IncidentReportContent "All"` | Include full content in report | All |
| `-SetHeader` | Add email header | Exchange only |
| `-RemoveHeader` | Strip email header | Exchange only |
| `-ApplyHtmlDisclaimer` | Append disclaimer to email | Exchange only |
| `-EncryptRMSTemplate` | Apply RMS encryption | Exchange only |
| `-EndpointDlpRestrictions` | Endpoint DLP restrictions | Endpoint only |

---

## Endpoint DLP Restrictions

```powershell
$endpointRestrictions = @(
    @{ Setting = "Print"; Value = "Block" },
    @{ Setting = "CopyToClipboard"; Value = "Block" },
    @{ Setting = "ScreenCapture"; Value = "Block" },
    @{ Setting = "RemovableMedia"; Value = "Block" },
    @{ Setting = "NetworkShare"; Value = "Audit" },
    @{ Setting = "CloudEgress"; Value = "Block" }
)

New-DlpComplianceRule `
    -Name "Endpoint - Block Sensitive Exfiltration" `
    -Policy "Endpoint DLP Policy" `
    -ContentContainsSensitiveInformation $sensitiveTypes `
    -EndpointDlpRestrictions $endpointRestrictions
```

---

## Teams DLP

```powershell
# Create Teams DLP policy
New-DlpCompliancePolicy `
    -Name "Teams PII Protection" `
    -Mode TestWithNotifications `
    -TeamsLocation "All" `
    -TeamsLocationException @("IT-Admin-Channel@contoso.com")

New-DlpComplianceRule `
    -Name "Teams - Flag PII Sharing" `
    -Policy "Teams PII Protection" `
    -ContentContainsSensitiveInformation @(
        @{ Name = "Credit Card Number"; minCount = 1; minConfidence = 75 }
    ) `
    -NotifyUser "SiteAdmin" `
    -BlockAccess $false
```

---

## Full Policy Creation Example (PowerShell)

```powershell
# Step 1: Connect
Connect-IPPSSession -UserPrincipalName "admin@contoso.com"

# Step 2: Create policy in test mode
New-DlpCompliancePolicy `
    -Name "GDPR Data Protection Policy" `
    -Mode TestWithNotifications `
    -ExchangeLocation All `
    -SharePointLocation All `
    -OneDriveLocation All `
    -TeamsLocation All `
    -Comment "GDPR compliance - PII/financial data detection"

# Step 3: Add rule for high-confidence PII
New-DlpComplianceRule `
    -Name "GDPR - Block High-Confidence PII Externally" `
    -Policy "GDPR Data Protection Policy" `
    -ContentContainsSensitiveInformation @(
        @{ Name = "EU Passport Number"; minCount = 1; minConfidence = 85 },
        @{ Name = "EU National Identification Number"; minCount = 1; minConfidence = 85 },
        @{ Name = "Credit Card Number"; minCount = 1; minConfidence = 85 }
    ) `
    -SentToScope NotInOrganization `
    -BlockAccess $true `
    -NotifyUser "SiteAdmin","LastModifier" `
    -NotifyUserType BlockWithOverride `
    -NotifyUserAllowOverride WithJustification `
    -GenerateIncidentReport "compliance@contoso.com" `
    -IncidentReportContent "All,DocumentAuthor,DocumentLastModifier,MatchedItem,RulesMatched,Severity,Service,Severity,Title"

# Step 4: Monitor for 2 weeks, then promote
# Set-DlpCompliancePolicy -Identity "GDPR Data Protection Policy" -Mode Enable
```

---

## Custom Sensitive Information Types

```powershell
# List existing SITs
Get-DlpSensitiveInformationType | Select Name, Publisher, Description | Sort Name

# Export SIT definition to review
$sit = Get-DlpSensitiveInformationType -Identity "Credit Card Number"
$sit | Format-List *

# Create custom SIT from XML (requires rule package XML file)
# Save the following to custom-sit.xml then import:
New-DlpSensitiveInformationTypeRulePackage -FileData (Get-Content ".\custom-sit.xml" -Encoding Byte -ReadCount 0)
```

### Custom SIT XML Template

```xml
<?xml version="1.0" encoding="utf-8"?>
<RulePackage xmlns="http://schemas.microsoft.com/office/2011/mce">
  <RulePack id="00000000-1234-5678-abcd-000000000001">
    <Version major="1" minor="0" build="0" revision="0"/>
    <Publisher id="00000000-1234-5678-abcd-000000000002"/>
    <Details defaultLangCode="en-us">
      <LocalizedDetails langcode="en-us">
        <PublisherName>Contoso IT</PublisherName>
        <Name>Contoso Custom SITs</Name>
        <Description>Internal employee badge number pattern</Description>
      </LocalizedDetails>
    </Details>
  </RulePack>
  <Rules>
    <Entity id="00000000-1234-5678-abcd-000000000003" patternsProximity="300" recommendedConfidence="75">
      <Pattern confidenceLevel="75">
        <IdMatch idRef="Regex_contoso_badge"/>
        <Match idRef="Keyword_contoso_badge"/>
      </Pattern>
    </Entity>
    <Regex id="Regex_contoso_badge">CBG-\d{6}</Regex>
    <Keyword id="Keyword_contoso_badge">
      <Group matchStyle="word">
        <Term caseSensitive="false">badge</Term>
        <Term caseSensitive="false">employee id</Term>
      </Group>
    </Keyword>
    <LocalizedStrings>
      <Resource idRef="00000000-1234-5678-abcd-000000000003">
        <Name default="true" langcode="en-us">Contoso Badge Number</Name>
        <Description default="true" langcode="en-us">Internal Contoso employee badge ID</Description>
      </Resource>
    </LocalizedStrings>
  </Rules>
</RulePackage>
```

---

## DLP Activity Explorer (Graph API)

```typescript
// Query DLP events via Audit Log API
const response = await client.api('/security/auditLog/queries').post({
  displayName: 'DLP Matches Last 7 Days',
  filterStartDateTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  filterEndDateTime: new Date().toISOString(),
  operationFilters: ['DlpRuleMatch', 'DlpRuleUndo', 'DlpInfo'],
  recordTypeFilters: [
    'complianceDLPSharePoint',
    'complianceDLPExchange',
    'complianceDLPSharePointClassification'
  ]
});

// Poll until status = 'succeeded'
const queryId = response.id;
let status = response.status;
while (status !== 'succeeded' && status !== 'failed') {
  await new Promise(r => setTimeout(r, 5000));
  const poll = await client.api(`/security/auditLog/queries/${queryId}`).get();
  status = poll.status;
}

// Fetch records (paginate with @odata.nextLink)
let recordsUrl = `/security/auditLog/queries/${queryId}/records`;
const allRecords = [];
while (recordsUrl) {
  const page = await client.api(recordsUrl).get();
  allRecords.push(...page.value);
  recordsUrl = page['@odata.nextLink'] || null;
}
```

---

## Error Codes

| Code | Meaning | Remediation |
|------|---------|-------------|
| 400 `InvalidParameter` | Invalid SIT name or misconfigured condition | Run `Get-DlpSensitiveInformationType` to get exact name |
| 400 `PolicyAlreadyExists` | Duplicate policy name | Choose unique name or update existing policy |
| 403 `Forbidden` | Missing Compliance Administrator role | Assign Compliance Admin role in M365 admin center |
| 404 `NotFound` | Policy or rule not found | Verify identity string; policies may take minutes to propagate |
| 409 `Conflict` | Rule name already exists in policy | Use unique rule names within each policy |
| 429 `TooManyRequests` | PowerShell session throttled | Add `Start-Sleep 5` between bulk operations |
| `SyncFailed` | Policy deployed but propagation failed | Wait 15-30 min; check `Get-DlpCompliancePolicy` Status field |

---

## Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| DLP policies per tenant | 10,000 | Soft limit; contact support for increase |
| Rules per policy | 100 | Exceeding causes degraded performance |
| SIT types per rule | 10 | Use grouping for more types |
| Custom SIT rule packages | 10 per tenant | Each package can contain multiple SITs |
| Policy tip text length | 1,000 characters | Truncated in UI if exceeded |
| Report recipient list | 200 addresses | Per policy |
| Audit log retention | 90 days (standard) / 1 year (E5) / 10 years (add-on) | Query via `auditLog/queries` endpoint |
| Audit query date range | 180 days per query | Split large ranges into multiple queries |
| Endpoint DLP supported OS | Windows 10 1809+ | macOS 10.15+ with preview agent |

---

## Common Patterns and Gotchas

1. **Test mode does not generate incidents** — `TestWithoutNotifications` still fires audit events but no emails. Use `Get-DlpDetailReport` to measure match volume before enforcing.

2. **Policy tip delay** — New policies and changes take 24-48 hours to propagate to all Exchange transport rules. SharePoint crawl-based detection can lag up to 24 hours for existing content.

3. **Existing content vs new content** — DLP policies apply to new content immediately. Existing SharePoint content is only re-scanned when a user opens or modifies the file, or when SharePoint's crawl cycle processes it.

4. **False-positive rate by SIT** — Some SITs like "U.S. Individual Taxpayer Identification Number" have high false-positive rates at Low confidence. Always use High confidence (85+) for blocking actions and run test mode first.

5. **Override logging** — When `NotifyUserAllowOverride WithJustification` is set, user justifications are captured in the DLP audit log. Review `DlpRuleUndo` events regularly.

6. **Endpoint DLP requires Intune enrollment** — Devices must be enrolled in Microsoft Intune or onboarded to Microsoft Defender for Endpoint. DLP policies do not apply to unmanaged devices.

7. **Teams DLP latency** — Teams DLP applies to messages at send time. If a message is already sent before policy deployment, it is not re-evaluated retroactively.

8. **Priority ordering** — Multiple policies can match the same content. The highest-severity action across all matching rules is applied. Use `-Priority` parameter to control evaluation order.

9. **Service principal authentication** — `Connect-IPPSSession` supports certificate-based auth for automation: `-AppId`, `-CertificateThumbprint`, `-Organization`. Required for unattended pipelines.

10. **Power Platform DLP is separate** — Power Platform DLP (connector policies) is managed through the Power Platform admin center, not Purview compliance center. Do not confuse with M365 DLP.
