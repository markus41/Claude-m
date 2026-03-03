# Sentinel Analytics Rules — Reference

Microsoft Sentinel analytics rules are the core detection engine. They query Log Analytics tables on a schedule and generate alerts that become incidents. Rule quality directly determines SOC signal-to-noise ratio.

---

## REST API Endpoints (Sentinel ARM)

**Base path:** `https://management.azure.com/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.OperationalInsights/workspaces/{ws}/providers/Microsoft.SecurityInsights`

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| GET | `/alertRules?api-version=2023-02-01` | `Microsoft Sentinel Reader` | `$filter` | List all rules |
| GET | `/alertRules/{ruleId}?api-version=2023-02-01` | `Microsoft Sentinel Reader` | — | Single rule |
| PUT | `/alertRules/{ruleId}?api-version=2023-02-01` | `Microsoft Sentinel Contributor` | Body: rule object | Create or replace rule |
| PATCH | `/alertRules/{ruleId}?api-version=2023-02-01` | `Microsoft Sentinel Contributor` | Partial body | Update enabled state, severity |
| DELETE | `/alertRules/{ruleId}?api-version=2023-02-01` | `Microsoft Sentinel Contributor` | — | Delete rule |
| GET | `/alertRuleTemplates?api-version=2023-02-01` | `Microsoft Sentinel Reader` | — | List Microsoft-provided templates |
| GET | `/alertRuleTemplates/{templateId}?api-version=2023-02-01` | `Microsoft Sentinel Reader` | — | Single template |
| POST | `/alertRules/{id}/triggerRuleRun?api-version=2023-02-01` | `Microsoft Sentinel Contributor` | No body | Manually trigger rule run |

---

## Rule Types

| Kind | Description | Trigger | Use Case |
|------|-------------|---------|----------|
| `Scheduled` | Runs KQL query on schedule | Cron (min 5 min) | Most custom detections |
| `NRT` (Near Real Time) | Triggers within ~3 min of log ingestion | Log ingestion | High-fidelity critical alerts |
| `Fusion` | ML-based multi-stage correlation | Microsoft ML engine | APT kill-chain detection |
| `MicrosoftSecurityIncidentCreation` | Wraps Defender/MDI/MDO product alerts | Product alert | Promote product alerts to incidents |
| `MLBehaviorAnalytics` | Microsoft's built-in ML rules | Microsoft ML engine | UEBA anomaly detection |
| `ThreatIntelligence` | Matches TI indicators against logs | New TI import | IOC-based detection |

---

## Scheduled Rule ARM Schema (Full)

```json
{
  "kind": "Scheduled",
  "properties": {
    "displayName": "Suspicious Encoded PowerShell Execution",
    "description": "Detects base64-encoded PowerShell commands indicative of obfuscation or LOLBin abuse.",
    "severity": "Medium",
    "enabled": true,
    "query": "SecurityEvent\n| where EventID == 4688\n| where CommandLine has '-EncodedCommand' or CommandLine has '-enc ' or CommandLine has '-e '\n| extend DecodedArg = base64_decode_tostring(extract(@'(?:-[Ee][Nn][Cc][Oo][Dd][Ee][Dd][Cc][Oo][Mm][Mm][Aa][Nn][Dd]?|\\-[Ee]\\s+|\\-[Ee][Nn][Cc]\\s+)([A-Za-z0-9+/=]+)', 1, CommandLine))\n| project TimeGenerated, Computer, Account, CommandLine, DecodedArg, NewProcessName",
    "queryFrequency": "PT15M",
    "queryPeriod": "PT1H",
    "triggerOperator": "GreaterThan",
    "triggerThreshold": 0,
    "suppressionEnabled": true,
    "suppressionDuration": "PT1H",
    "tactics": ["Execution", "DefenseEvasion"],
    "techniques": ["T1059.001", "T1027"],
    "entityMappings": [
      {
        "entityType": "Account",
        "fieldMappings": [
          { "identifier": "FullName", "columnName": "Account" }
        ]
      },
      {
        "entityType": "Host",
        "fieldMappings": [
          { "identifier": "HostName", "columnName": "Computer" }
        ]
      },
      {
        "entityType": "Process",
        "fieldMappings": [
          { "identifier": "CommandLine", "columnName": "CommandLine" }
        ]
      }
    ],
    "incidentConfiguration": {
      "createIncident": true,
      "groupingConfiguration": {
        "enabled": true,
        "reopenClosedIncident": false,
        "lookbackDuration": "PT5H",
        "matchingMethod": "Selected",
        "groupByEntities": ["Account", "Host"],
        "groupByAlertDetails": [],
        "groupByCustomDetails": []
      }
    },
    "alertDetailsOverride": {
      "alertDisplayNameFormat": "Encoded PowerShell on {{Computer}} by {{Account}}",
      "alertDescriptionFormat": "Suspicious encoded command detected: {{DecodedArg}}"
    },
    "customDetails": {
      "DecodedCommand": "DecodedArg",
      "ProcessPath": "NewProcessName"
    },
    "eventGroupingSettings": {
      "aggregationKind": "AlertPerResult"
    }
  }
}
```

---

## NRT Rule Schema

```json
{
  "kind": "NRT",
  "properties": {
    "displayName": "Global Admin Role Assigned",
    "description": "Fires within 3 minutes when a Global Administrator role is assigned.",
    "severity": "High",
    "enabled": true,
    "query": "AuditLogs\n| where OperationName == 'Add member to role'\n| extend RoleName = tostring(TargetResources[0].displayName)\n| extend AssignedTo = tostring(TargetResources[1].userPrincipalName)\n| extend AssignedBy = tostring(InitiatedBy.user.userPrincipalName)\n| where RoleName == 'Global Administrator'\n| project TimeGenerated, AssignedBy, AssignedTo, RoleName",
    "tactics": ["PrivilegeEscalation"],
    "techniques": ["T1078.004"],
    "entityMappings": [
      {
        "entityType": "Account",
        "fieldMappings": [
          { "identifier": "UPNSuffix", "columnName": "AssignedTo" }
        ]
      }
    ],
    "incidentConfiguration": {
      "createIncident": true,
      "groupingConfiguration": {
        "enabled": false
      }
    }
  }
}
```

---

## MicrosoftSecurityIncidentCreation Rule

```json
{
  "kind": "MicrosoftSecurityIncidentCreation",
  "properties": {
    "displayName": "Create Sentinel incidents from Defender for Endpoint High alerts",
    "description": "Promotes MDE High and Medium severity alerts to Sentinel incidents.",
    "enabled": true,
    "productFilter": "Microsoft Defender Advanced Threat Protection",
    "severitiesFilter": ["High", "Medium"],
    "displayNamesFilter": [],
    "displayNamesExcludeFilter": ["Test Alert - Ignore"]
  }
}
```

---

## Entity Mapping Reference

| Entity Type | Supported Identifiers | Example Column |
|-------------|----------------------|----------------|
| `Account` | `Name`, `UPNSuffix`, `FullName`, `ObjectGuid`, `NTDomain`, `DisplayName`, `AadUserId` | `Account`, `UserPrincipalName` |
| `Host` | `HostName`, `FullName`, `NTDomain`, `DnsDomain`, `AzureID`, `OMSAgentID` | `Computer`, `DeviceName` |
| `IP` | `Address` | `IPAddress`, `RemoteIP` |
| `URL` | `Url` | `FileOriginUrl`, `RemoteUrl` |
| `FileHash` | `Algorithm`, `Value` | `SHA256`, `MD5` |
| `File` | `Name`, `Directory` | `FileName`, `FolderPath` |
| `Process` | `ProcessId`, `CommandLine`, `ElevationToken`, `CreationTimeUtc` | `ProcessCommandLine` |
| `RegistryKey` | `Hive`, `Key` | `RegistryKey` |
| `RegistryValue` | `Name`, `Value`, `ValueType` | `RegistryValueName` |
| `SecurityGroup` | `DistinguishedName`, `SID`, `ObjectGuid` | `TargetGroupName` |
| `MailCluster` | `NetworkMessageIds`, `CountByDeliveryStatus`, `Source` | — |
| `MailMessage` | `RecipientEmailAddress`, `SenderFromAddress`, `MessageId` | — |
| `Malware` | `Name`, `Category` | — |
| `AzureResource` | `ResourceId` | `ResourceId` |

---

## Sentinel Log Analytics Schema Tables

| Table | Data Source | Common Use Cases |
|-------|-------------|-----------------|
| `SecurityEvent` | Windows Security Event Log (MMA/AMA) | Process creation (4688), logon (4624/4625), privilege use |
| `SecurityAlert` | All connected products | Cross-source alert correlation |
| `SigninLogs` | Entra ID | Sign-in anomaly detection |
| `AuditLogs` | Entra ID | Directory change tracking |
| `IdentityLogonEvents` | Defender for Identity | On-prem and Azure AD logons |
| `IdentityQueryEvents` | Defender for Identity | LDAP, Kerberos queries |
| `DeviceProcessEvents` | Defender for Endpoint | Process execution on devices |
| `DeviceNetworkEvents` | Defender for Endpoint | Network connections from devices |
| `DeviceFileEvents` | Defender for Endpoint | File system changes on devices |
| `DeviceLogonEvents` | Defender for Endpoint | User logons on managed devices |
| `DeviceRegistryEvents` | Defender for Endpoint | Registry changes |
| `CloudAppEvents` | Defender for Cloud Apps (MCAS) | SaaS app activity |
| `EmailEvents` | Defender for Office 365 | Email delivery and click events |
| `EmailAttachmentInfo` | Defender for Office 365 | Attachment metadata |
| `EmailUrlInfo` | Defender for Office 365 | URLs in email |
| `ThreatIntelligenceIndicator` | Threat Intelligence | IOC matching |
| `Watchlist` | Sentinel Watchlists | Reference data lookup |

---

## MITRE ATT&CK Mapping Reference

| Sentinel `tactics` Value | MITRE Tactic | Common Techniques |
|--------------------------|-------------|-------------------|
| `InitialAccess` | TA0001 | T1566 Phishing, T1190 Exploit Public App |
| `Execution` | TA0002 | T1059 Script Interpreter, T1203 Exploit Client |
| `Persistence` | TA0003 | T1078 Valid Accounts, T1053 Scheduled Task |
| `PrivilegeEscalation` | TA0004 | T1548 Abuse Elevation, T1078 Valid Accounts |
| `DefenseEvasion` | TA0005 | T1027 Obfuscation, T1562 Impair Defenses |
| `CredentialAccess` | TA0006 | T1003 Credential Dumping, T1110 Brute Force |
| `Discovery` | TA0007 | T1087 Account Discovery, T1046 Network Scan |
| `LateralMovement` | TA0008 | T1021 Remote Services, T1550 Use Alternate Auth |
| `Collection` | TA0009 | T1074 Data Staged, T1114 Email Collection |
| `Exfiltration` | TA0010 | T1041 Exfil Over C2, T1048 Non-Standard Port |
| `CommandAndControl` | TA0011 | T1071 App Layer Protocol, T1132 Data Encoding |
| `Impact` | TA0040 | T1486 Data Encrypted, T1490 Inhibit Recovery |
| `PreAttack` | TA0043 | T1595 Active Scanning, T1589 Gather Identity Info |

---

## Create Rule from Template (PowerShell)

```powershell
# Install Az.SecurityInsights module
Install-Module -Name Az.SecurityInsights -Force

Connect-AzAccount
$sub = "your-subscription-id"
$rg = "your-resource-group"
$ws = "your-workspace-name"

# List templates
$templates = Get-AzSentinelAlertRuleTemplate -ResourceGroupName $rg -WorkspaceName $ws
$templates | Where-Object Kind -eq "Scheduled" |
    Select-Object Name, DisplayName, Severity, Tactics | Format-Table

# Create rule from a template
$template = $templates | Where-Object DisplayName -like "*Encoded PowerShell*" | Select-Object -First 1

New-AzSentinelScheduledAlertRule `
    -ResourceGroupName $rg `
    -WorkspaceName $ws `
    -AlertRuleTemplateName $template.Name `
    -DisplayName $template.DisplayName `
    -Enabled $true `
    -Severity $template.DefaultSeverity `
    -Query $template.Query `
    -QueryFrequency $template.QueryFrequency `
    -QueryPeriod $template.QueryPeriod `
    -TriggerOperator $template.TriggerOperator `
    -TriggerThreshold $template.TriggerThreshold
```

---

## Alert Grouping Strategies

| `matchingMethod` | Behavior | Best For |
|-----------------|----------|----------|
| `AllEntities` | Group alerts sharing all mapped entities | Noisy detections (reduce incident volume) |
| `Selected` | Group by specific entities (Account, Host, IP) | Targeted grouping |
| `AnyAlert` | Group all alerts from this rule | Very noisy rules needing consolidation |

**Alert grouping lookback:** Up to 5 days. Alerts outside the window create new incidents.

---

## Error Codes

| Code | Meaning | Remediation |
|------|---------|-------------|
| 400 `InvalidQuery` | KQL syntax error | Test query in Log Analytics before deploying |
| 400 `FrequencyTooShort` | Query frequency below 5 minutes | Set `queryFrequency` to `PT5M` or longer |
| 403 `Forbidden` | Missing Sentinel Contributor role | Assign role on the Log Analytics workspace |
| 404 `WorkspaceNotFound` | Workspace name/RG mismatch | Verify workspace resource path |
| 409 `RuleAlreadyExists` | Duplicate rule ID | Use a different rule ID GUID |
| 429 `TooManyRequests` | ARM throttled | Wait and retry with exponential backoff |
| `TableNotFound` (KQL) | Schema table not connected | Verify data connector is active |

---

## Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Scheduled rules per workspace | 512 | Includes disabled rules |
| NRT rules per workspace | 20 | NRT has strict limits |
| Query frequency (scheduled) | Min 5 minutes | Log delay makes sub-5-min impractical |
| Query period (lookback) | Max 14 days | Longer periods slow performance |
| Rule query result size | 10,000 rows | Truncated — design queries to return fewer rows |
| Alert grouping lookback | 5 days max | Alerts older than window create new incidents |
| Entity mappings per rule | 5 entity types | Each entity type can have multiple fields |
| Custom detail fields | 20 per rule | — |
| Rule name length | 256 characters | — |

---

## Common Patterns and Gotchas

1. **Always test KQL before deploying** — Run the query in Log Analytics Logs with a representative time range. A query returning 10,000 rows on every run will create a massive alert flood and hit the row limit.

2. **NRT rules have strict limits** — NRT rules are processed within 3 minutes of log ingestion but consume more compute. Reserve NRT for truly time-sensitive detections (admin role assignment, account lockout). Use Scheduled for everything else.

3. **Suppression vs grouping** — Suppression prevents duplicate alerts for the same trigger; grouping merges alerts into one incident. They serve different purposes. Use grouping to reduce incident volume; use suppression only to silence known-good patterns.

4. **QueryPeriod >= QueryFrequency** — The lookback period should always be equal to or longer than the frequency. A 15-minute frequency with a 5-minute lookback will miss events between runs.

5. **Entity mapping enables pivot** — Map all available entities from your query. Un-mapped entities cannot be used for entity page drill-down, enrichment, or automated playbook actions.

6. **Template updates** — When Microsoft updates a template, existing rules based on that template are NOT automatically updated. Monitor template updates and refresh rules manually.

7. **Custom details for context** — Use `customDetails` to surface key fields directly on the incident card without requiring analysts to open the raw query results. Limit to 5-8 most actionable fields.

8. **Tactics/techniques are metadata** — MITRE mappings do not affect detection logic — they are used for reporting, coverage analysis, and workbook visualization. Always populate them for governance.

9. **Data connector latency** — Some connectors (Office 365 audit, Entra Sign-ins) have 5-20 minute ingestion delays. Account for this in `queryPeriod`. A 15-minute frequency needs at least a 30-minute lookback to avoid gaps.

10. **Rule ID is permanent** — Once deployed, a rule's ARM resource ID (GUID) is permanent. If you delete and recreate a rule with the same name, it gets a new ID and loses history. Preserve IDs in your deployment templates.
