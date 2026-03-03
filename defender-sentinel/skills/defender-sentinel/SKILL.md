---
name: defender-sentinel
description: Deep expertise in Microsoft Sentinel SIEM/SOAR and Microsoft Defender XDR — triaging incidents, writing KQL threat hunting queries, authoring and tuning analytics rules, configuring SOAR playbooks, and performing advanced hunting across device, identity, email, and cloud app signals.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
triggers:
  - sentinel
  - microsoft sentinel
  - defender xdr
  - defender for endpoint
  - defender for identity
  - defender for office
  - defender for cloud apps
  - siem
  - soar
  - incident triage
  - security incident
  - alert investigation
  - threat hunting
  - kql hunting
  - hunting query
  - analytics rule
  - detection rule
  - scheduled rule
  - NRT rule
  - fusion rule
  - playbook
  - logic app
  - soar automation
  - incident enrichment
  - watchlist
  - threat intelligence
  - advanced hunting
  - security operations center
  - SOC
  - MSSP security
  - security alert
  - entity mapping
  - MITRE ATT&CK
  - TTPs
  - indicator of compromise
  - IOC
---

# Microsoft Sentinel and Defender XDR — Security Operations

This skill provides comprehensive knowledge for operating Microsoft Sentinel SIEM/SOAR and the Microsoft Defender XDR unified incident queue. It covers incident lifecycle management, KQL analytics and threat hunting, detection rule authoring, SOAR automation via Logic Apps, and cross-signal advanced hunting across the full Defender XDR signal set.

## Integration Context Contract

- Canonical contract: [`docs/integration-context.md`](../../../docs/integration-context.md)

| Workflow | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Sentinel incident and alert workflows | required | required | `AzureCloud`* | `service-principal` | `Microsoft Sentinel Responder` (read + update incidents) |
| Sentinel analytics rule authoring | required | required | `AzureCloud`* | `service-principal` | `Microsoft Sentinel Contributor` |
| Sentinel full admin (watchlists, connectors) | required | required | `AzureCloud`* | `service-principal` | `Microsoft Sentinel Contributor` |
| Defender XDR incidents and alerts | required | — | `AzureCloud`* | `service-principal` | `SecurityReader` (read) / `SecurityOperator` (update) |
| Defender XDR advanced hunting | required | — | `AzureCloud`* | `service-principal` | `ThreatHunting.Read.All` (Graph) |
| SOAR playbook (Logic App) management | required | required | `AzureCloud`* | `service-principal` | `Logic App Contributor` + `Microsoft Sentinel Contributor` |

\* Use sovereign cloud values from the canonical contract when applicable.

Fail fast before any API call when required context is missing. Redact tenant/subscription/workspace identifiers in outputs.

## Architecture Overview

```
Microsoft Sentinel (SIEM/SOAR)
  └─ Log Analytics Workspace
       ├─ Data Connectors (MDE, MDI, MDO, MDCA, Azure Activity, M365 Defender)
       ├─ Analytics Rules  ──► Incidents ──► Playbooks (Logic Apps)
       ├─ Watchlists
       ├─ Hunting Queries
       └─ Workbooks

Microsoft Defender XDR (Unified Portal)
  ├─ Microsoft Defender for Endpoint (MDE)
  ├─ Microsoft Defender for Identity (MDI)
  ├─ Microsoft Defender for Office 365 (MDO)
  ├─ Microsoft Defender for Cloud Apps (MDCA)
  └─ Unified Incidents Queue ──► Advanced Hunting (KQL)
```

## Sentinel REST API

### Base URLs

```
Sentinel ARM control plane:
  https://management.azure.com/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.OperationalInsights/workspaces/{workspaceName}/providers/Microsoft.SecurityInsights/

Log Analytics query (data plane):
  https://api.loganalytics.io/v1/workspaces/{workspaceId}/query
```

### Key Sentinel Resource Types

| Resource | ARM path suffix | Purpose |
|---|---|---|
| Incidents | `/incidents` | Security incidents (GET, PATCH, DELETE) |
| Incident comments | `/incidents/{id}/comments` | Add analyst notes |
| Incident entities | `/incidents/{id}/entities` | Get enriched entities |
| Incident alerts | `/incidents/{id}/alerts` | Get alerts linked to an incident |
| Analytics rules | `/alertRules` | Scheduled, NRT, Fusion, ML rules |
| Alert rule templates | `/alertRuleTemplates` | Microsoft-provided rule templates |
| Watchlists | `/watchlists` | Reference data for correlation |
| Watchlist items | `/watchlists/{alias}/watchlistItems` | Individual watchlist rows |
| Hunting queries | `/savedSearches` (Log Analytics) | Stored KQL hunting queries |
| Bookmarks | `/bookmarks` | Saved investigation pivot points |
| Automation rules | `/automationRules` | Trigger playbooks on incidents |
| Playbooks | Azure Logic Apps (`Microsoft.Logic/workflows`) | SOAR response actions |

### Incident Management

**List open incidents (severity filter):**

```http
GET https://management.azure.com/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.OperationalInsights/workspaces/{ws}/providers/Microsoft.SecurityInsights/incidents?api-version=2023-02-01&$filter=properties/status eq 'New' and properties/severity eq 'High'&$orderby=properties/createdTimeUtc desc&$top=50
Authorization: Bearer {token}
```

**Update incident status and assign:**

```http
PATCH https://management.azure.com/.../incidents/{incidentId}?api-version=2023-02-01
Content-Type: application/json

{
  "properties": {
    "status": "Active",
    "severity": "High",
    "assignee": {
      "objectId": "{analyst-object-id}",
      "email": "analyst@contoso.com",
      "name": "Analyst Name"
    },
    "classification": null,
    "classificationComment": null
  }
}
```

**Close an incident:**

```http
PATCH .../incidents/{incidentId}
{
  "properties": {
    "status": "Closed",
    "classification": "TruePositive",
    "classificationReason": "SuspiciousActivity",
    "classificationComment": "Confirmed malicious. Endpoint isolated."
  }
}
```

**Add comment:**

```http
POST .../incidents/{incidentId}/comments
{
  "properties": {
    "message": "Analyst note: investigated lateral movement from device WIN-XYZ. Confirmed breach. Isolating host."
  }
}
```

### Incident Severity and Status Values

| Field | Allowed values |
|---|---|
| `severity` | `High`, `Medium`, `Low`, `Informational` |
| `status` | `New`, `Active`, `Closed` |
| `classification` | `Undetermined`, `TruePositive`, `FalsePositive`, `BenignPositive` |
| `classificationReason` | `SuspiciousActivity`, `SuspiciousButExpected`, `IncorrectAlertLogic`, `InaccurateData` |

## KQL Analytics and Hunting

### Analytics Rule Types

| Rule kind | Trigger | Latency | Best for |
|---|---|---|---|
| `Scheduled` | Runs on a cron schedule (min 5 min) | Medium | Custom detections, threshold-based alerts |
| `NRT` (Near Real Time) | Triggered on log ingestion (< 5 min lag) | Very low | High-fidelity alerts needing fast response |
| `Fusion` | ML-based correlation across signals | Variable | Multi-stage attack chains |
| `MicrosoftSecurityIncidentCreation` | Wraps Defender/MDI/Purview alerts | Low | Promote product alerts to Sentinel incidents |

### Scheduled Rule Schema

```json
{
  "kind": "Scheduled",
  "properties": {
    "displayName": "Suspicious PowerShell encoded command",
    "description": "Detects base64-encoded PowerShell commands which may indicate obfuscation.",
    "severity": "Medium",
    "enabled": true,
    "query": "SecurityEvent\n| where EventID == 4688\n| where CommandLine contains \"-EncodedCommand\"\n| extend DecodedCmd = base64_decode_tostring(extract(@\"-[Ee]n[Cc].*?\\s+(\\S+)\", 1, CommandLine))\n| project TimeGenerated, Computer, Account, CommandLine, DecodedCmd",
    "queryFrequency": "PT5M",
    "queryPeriod": "PT1H",
    "triggerOperator": "GreaterThan",
    "triggerThreshold": 0,
    "suppressionDuration": "PT1H",
    "suppressionEnabled": false,
    "tactics": ["Execution", "DefenseEvasion"],
    "techniques": ["T1059.001", "T1027"],
    "entityMappings": [
      {
        "entityType": "Account",
        "fieldMappings": [{ "identifier": "Name", "columnName": "Account" }]
      },
      {
        "entityType": "Host",
        "fieldMappings": [{ "identifier": "HostName", "columnName": "Computer" }]
      }
    ],
    "incidentConfiguration": {
      "createIncident": true,
      "groupingConfiguration": {
        "enabled": true,
        "reopenClosedIncident": false,
        "lookbackDuration": "PT5H",
        "matchingMethod": "Selected",
        "groupByEntities": ["Account"]
      }
    }
  }
}
```

### KQL Hunting Query Patterns

**Impossible travel detection:**

```kql
let lookback = 7d;
let speed_threshold_kmh = 900; // max realistic flight speed
SigninLogs
| where TimeGenerated > ago(lookback)
| where ResultType == 0  // success
| project TimeGenerated, UserPrincipalName, IPAddress, Location, LocationDetails
| extend City = tostring(LocationDetails.city), Country = tostring(LocationDetails.countryOrRegion)
| extend Lat = todouble(LocationDetails.geoCoordinates.latitude), Lon = todouble(LocationDetails.geoCoordinates.longitude)
| sort by UserPrincipalName asc, TimeGenerated asc
| serialize
| extend PrevTime = prev(TimeGenerated), PrevLat = prev(Lat), PrevLon = prev(Lon), PrevUser = prev(UserPrincipalName)
| where UserPrincipalName == PrevUser
| extend TimeDeltaHours = datetime_diff('second', TimeGenerated, PrevTime) / 3600.0
| extend DistanceKm = geo_distance_2points(PrevLon, PrevLat, Lon, Lat) / 1000.0
| extend SpeedKmh = iff(TimeDeltaHours > 0, DistanceKm / TimeDeltaHours, real(0))
| where SpeedKmh > speed_threshold_kmh
| project TimeGenerated, UserPrincipalName, IPAddress, City, Country, PrevTime, DistanceKm, SpeedKmh
```

**Privileged role assignment spike:**

```kql
AuditLogs
| where TimeGenerated > ago(24h)
| where OperationName == "Add member to role"
| extend Role = tostring(TargetResources[0].displayName)
| extend Actor = tostring(InitiatedBy.user.userPrincipalName)
| extend Target = tostring(TargetResources[1].userPrincipalName)
| where Role in ("Global Administrator", "Privileged Role Administrator", "Security Administrator", "Exchange Administrator")
| summarize Count = count() by bin(TimeGenerated, 1h), Actor, Role
| where Count > 3
| order by Count desc
```

**New device registered by high-risk user:**

```kql
let risky_users = RiskyUsers
| where RiskLevel in ("high", "medium")
| project UserPrincipalName;
AuditLogs
| where TimeGenerated > ago(7d)
| where OperationName == "Register device"
| extend RegisteredBy = tostring(InitiatedBy.user.userPrincipalName)
| where RegisteredBy in (risky_users)
| project TimeGenerated, RegisteredBy, DeviceName = tostring(TargetResources[0].displayName)
```

### Log Analytics Query API

Run KQL queries programmatically:

```http
POST https://api.loganalytics.io/v1/workspaces/{workspaceId}/query
Authorization: Bearer {token}
Content-Type: application/json

{
  "query": "SecurityAlert | where TimeGenerated > ago(24h) | summarize count() by AlertName | order by count_ desc | limit 20",
  "timespan": "P1D"
}
```

Response structure:

```json
{
  "tables": [{
    "name": "PrimaryResult",
    "columns": [
      {"name": "AlertName", "type": "string"},
      {"name": "count_", "type": "long"}
    ],
    "rows": [["Suspicious PowerShell", 42], ...]
  }]
}
```

## Defender XDR API (Microsoft Graph Security)

### Incidents

**List incidents (Graph Security API):**

```http
GET https://graph.microsoft.com/v1.0/security/incidents?$filter=status eq 'active'&$orderby=createdDateTime desc&$top=25
Authorization: Bearer {token}
```

**Get incident with alerts:**

```http
GET https://graph.microsoft.com/v1.0/security/incidents/{incidentId}?$expand=alerts
```

**Update incident:**

```http
PATCH https://graph.microsoft.com/v1.0/security/incidents/{incidentId}
Content-Type: application/json

{
  "status": "inProgress",
  "assignedTo": "analyst@contoso.com",
  "determination": "malware",
  "classification": "truePositive"
}
```

### Alert Investigation

**Get alert with evidence:**

```http
GET https://graph.microsoft.com/v1.0/security/alerts_v2/{alertId}?$expand=evidence
```

Alert evidence types: `deviceEvidence`, `userEvidence`, `fileEvidence`, `processEvidence`, `ipEvidence`, `urlEvidence`, `mailboxEvidence`, `mailClusterEvidence`

**Device action — Isolate:**

```http
POST https://api.securitycenter.microsoft.com/api/machines/{machineId}/isolate
Content-Type: application/json

{
  "Comment": "Isolating device due to active compromise — Sentinel incident INC-12345",
  "IsolationType": "Full"
}
```

### Advanced Hunting (Graph)

```http
POST https://graph.microsoft.com/v1.0/security/runHuntingQuery
Content-Type: application/json

{
  "query": "DeviceProcessEvents | where Timestamp > ago(1h) | where ProcessCommandLine contains 'mimikatz' | project Timestamp, DeviceName, AccountName, ProcessCommandLine | limit 100"
}
```

Advanced hunting tables available: `DeviceProcessEvents`, `DeviceNetworkEvents`, `DeviceFileEvents`, `DeviceLogonEvents`, `DeviceRegistryEvents`, `IdentityLogonEvents`, `IdentityQueryEvents`, `EmailEvents`, `EmailAttachmentInfo`, `CloudAppEvents`, `AlertEvidence`, `AlertInfo`

## SOAR Playbooks (Logic Apps)

### Playbook Trigger Pattern

Sentinel playbooks are Azure Logic Apps triggered by the **Microsoft Sentinel incident trigger** or **alert trigger**:

```json
{
  "triggers": {
    "Microsoft_Sentinel_incident": {
      "type": "ApiConnectionWebhook",
      "inputs": {
        "host": { "connection": { "name": "@parameters('$connections')['azuresentinel']['connectionId']" } },
        "body": { "callback_url": "@{listCallbackUrl()}" },
        "path": "/incident-creation"
      }
    }
  }
}
```

### Common Playbook Actions

| Action | Purpose |
|---|---|
| Get incident entities | Enumerate accounts, hosts, IPs, URLs linked to incident |
| Add incident comment | Document automated findings |
| Change incident severity | Escalate based on enrichment |
| Assign incident | Route to correct team |
| Send Teams notification | Alert SOC channel |
| Block IP (firewall) | Call Azure Firewall / NSG / Defender for Endpoint |
| Isolate device | POST to MDE isolate endpoint |
| Disable Entra user | PATCH `accountEnabled: false` via Graph |
| Lookup IP in threat intel | Call VirusTotal, MDTI, or custom TI source |

## MITRE ATT&CK Coverage

When authoring detection rules, always annotate with MITRE tactics and techniques:

| Tactic | Example techniques | Sentinel `tactics` value |
|---|---|---|
| Initial Access | T1566 Phishing, T1190 Exploit Public-Facing App | `InitialAccess` |
| Execution | T1059 Command and Scripting Interpreter | `Execution` |
| Persistence | T1078 Valid Accounts, T1053 Scheduled Task | `Persistence` |
| Privilege Escalation | T1548 Abuse Elevation, T1134 Token Manipulation | `PrivilegeEscalation` |
| Defense Evasion | T1027 Obfuscated Files, T1562 Impair Defenses | `DefenseEvasion` |
| Credential Access | T1003 OS Credential Dumping, T1110 Brute Force | `CredentialAccess` |
| Discovery | T1018 Remote System Discovery | `Discovery` |
| Lateral Movement | T1021 Remote Services | `LateralMovement` |
| Collection | T1074 Data Staged | `Collection` |
| Exfiltration | T1041 Exfiltration Over C2 Channel | `Exfiltration` |
| Command & Control | T1071 Application Layer Protocol | `CommandAndControl` |
| Impact | T1486 Data Encrypted for Impact (ransomware) | `Impact` |

## Output Convention

Every operation produces a structured markdown report:

1. **Header**: operation name, timestamp, workspace/tenant
2. **Incident/alert summary**: ID, severity, status, entity count
3. **KQL results table**: columns and rows from query
4. **Actions taken**: list of automated or manual actions
5. **Recommendations**: next investigation steps, rule tuning notes

## Reference Files

| Reference | Path | Topics |
|---|---|---|
| Sentinel API Reference | `references/sentinel-reference.md` | Incidents, analytics rules, watchlists, bookmarks, connectors, automation rules, ARM schemas |
| Defender XDR Reference | `references/defender-xdr-reference.md` | Incidents API, alerts, advanced hunting tables, device actions, identity actions, email actions |

## Progressive Disclosure — Reference Files

| Topic | File |
|---|---|
| Analytics rule ARM/REST API, rule types (Scheduled/NRT/Fusion), KQL detection, entity mapping, MITRE ATT&CK, alert grouping | [`references/sentinel-analytics-rules.md`](./references/sentinel-analytics-rules.md) |
| Incident REST API, status/classification values, automation rules, playbook triggers, SIEM connector, incident metrics KQL | [`references/incident-management.md`](./references/incident-management.md) |
| KQL hunting queries for 10+ threat scenarios, SecurityEvent event IDs, hunting bookmarks API, Livestream, performance best practices | [`references/threat-hunting-kql.md`](./references/threat-hunting-kql.md) |
| Sentinel workbook gallery, ARM workbook templates, SOAR playbook creation, automation rules, watchlists, TI indicators | [`references/workbooks-automation.md`](./references/workbooks-automation.md) |
| Sentinel REST API — incidents, rules, watchlists, connectors | [`references/sentinel-reference.md`](./references/sentinel-reference.md) |
| Defender XDR incidents, alerts, advanced hunting tables, device/identity/email actions | [`references/defender-xdr-reference.md`](./references/defender-xdr-reference.md) |
