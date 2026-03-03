# Microsoft Defender XDR Reference

## API Endpoints

### Microsoft Graph Security API (unified)

```
https://graph.microsoft.com/v1.0/security/
```

Required permission scopes (application):

| Scope | Purpose |
|---|---|
| `SecurityIncident.Read.All` | Read incidents and alerts |
| `SecurityIncident.ReadWrite.All` | Update incidents |
| `ThreatHunting.Read.All` | Run advanced hunting queries |
| `SecurityAlert.Read.All` | Read alerts |
| `SecurityAlert.ReadWrite.All` | Update alerts |

### Defender for Endpoint API (direct)

```
https://api.securitycenter.microsoft.com/api/
```

Authentication scope: `https://api.securitycenter.microsoft.com/.default`

### Defender for Office 365 (Threat Explorer)

```
https://api.security.microsoft.com/api/
```

## Incidents (Graph Security)

### Incident Schema

```typescript
interface SecurityIncident {
  id: string;
  incidentWebUrl: string;
  tenantId: string;
  displayName: string;
  createdDateTime: string;
  lastUpdateDateTime: string;
  assignedTo: string | null;
  classification: "unknown" | "falsePositive" | "truePositive" | "informationalExpectedActivity";
  determination: "unknown" | "apt" | "malware" | "securityPersonnel" | "securityTesting" | "unwantedSoftware" | "other" | "multiStagedAttack" | "compromisedUser" | "phishing" | "maliciousUserActivity" | "notMalicious" | "notEnoughDataToValidate" | "confirmedUserActivity" | "lineOfBusinessApplication";
  severity: "unknown" | "informational" | "low" | "medium" | "high";
  status: "active" | "resolved" | "inProgress" | "redirected";
  tags: string[];
  comments: IncidentComment[];
  alerts?: Alert[];
}
```

### List Incidents

```http
GET https://graph.microsoft.com/v1.0/security/incidents
  ?$filter=status eq 'active' and severity eq 'high'
  &$orderby=createdDateTime desc
  &$top=25
  &$expand=alerts($select=id,title,severity,createdDateTime,category)
```

### Update Incident

```http
PATCH https://graph.microsoft.com/v1.0/security/incidents/{incidentId}
{
  "assignedTo": "analyst@contoso.com",
  "classification": "truePositive",
  "determination": "malware",
  "status": "inProgress",
  "tags": ["Ransomware", "LateralMovement"]
}
```

## Alerts (Graph Security v2)

### Alert Schema (key fields)

```typescript
interface Alert {
  id: string;
  title: string;
  description: string;
  severity: "unknown" | "informational" | "low" | "medium" | "high";
  status: "new" | "inProgress" | "resolved";
  classification: string;
  category: string;          // e.g., "Malware", "Phishing", "CredentialTheft"
  serviceSource: string;     // e.g., "microsoftDefenderForEndpoint"
  detectionSource: string;
  createdDateTime: string;
  lastUpdateDateTime: string;
  firstActivityDateTime: string;
  lastActivityDateTime: string;
  tenantId: string;
  incidentId: string;
  mitreTechniques: string[]; // ["T1059.001", "T1027"]
  evidence?: AlertEvidence[];
}
```

`serviceSource` values: `"azureAdIdentityProtection"`, `"microsoftAppGovernance"`, `"microsoftCloudAppSecurity"`, `"microsoftDefenderForEndpoint"`, `"microsoftDefenderForIdentity"`, `"microsoftDefenderForOffice365"`, `"microsoft365Defender"`, `"azureSentinel"`

### Get Alert with Evidence

```http
GET https://graph.microsoft.com/v1.0/security/alerts_v2/{alertId}?$expand=evidence
```

### Evidence Types and Key Fields

**Device evidence (`@odata.type: "#microsoft.graph.security.deviceEvidence"`):**

```json
{
  "@odata.type": "#microsoft.graph.security.deviceEvidence",
  "deviceDnsName": "WIN-ABC12345.contoso.com",
  "osPlatform": "Windows10",
  "onboardingStatus": "onboarded",
  "defenderAvStatus": "updated",
  "healthStatus": "active",
  "riskScore": "high",
  "rbacGroupName": "Windows Devices"
}
```

**User evidence (`@odata.type: "#microsoft.graph.security.userEvidence"`):**

```json
{
  "@odata.type": "#microsoft.graph.security.userEvidence",
  "userAccount": {
    "accountName": "jsmith",
    "domainName": "CONTOSO",
    "userPrincipalName": "jsmith@contoso.com",
    "azureAdUserId": "{entra-object-id}"
  }
}
```

**Process evidence:**

```json
{
  "@odata.type": "#microsoft.graph.security.processEvidence",
  "processId": 4892,
  "processCommandLine": "powershell.exe -EncodedCommand ...",
  "imageFile": { "fileName": "powershell.exe", "filePath": "C:\\Windows\\System32" },
  "parentProcessId": 1024
}
```

## Advanced Hunting

### Run Query

```http
POST https://graph.microsoft.com/v1.0/security/runHuntingQuery
Content-Type: application/json

{
  "query": "YOUR KQL QUERY HERE"
}
```

**Limits:** Max query duration 10 min; result set 10,000 rows; 10 API calls per minute per tenant.

### Advanced Hunting Tables

**Device tables (MDE):**

| Table | Key columns |
|---|---|
| `DeviceProcessEvents` | Timestamp, DeviceId, DeviceName, InitiatingProcessAccountName, FileName, ProcessCommandLine, SHA256 |
| `DeviceNetworkEvents` | Timestamp, DeviceId, DeviceName, RemoteIP, RemotePort, RemoteUrl, LocalIP, InitiatingProcessFileName |
| `DeviceFileEvents` | Timestamp, DeviceId, DeviceName, FileName, FolderPath, SHA256, ActionType, InitiatingProcessFileName |
| `DeviceLogonEvents` | Timestamp, DeviceId, DeviceName, AccountName, AccountDomain, LogonType, RemoteIP |
| `DeviceRegistryEvents` | Timestamp, DeviceId, DeviceName, RegistryKey, RegistryValueData, ActionType |
| `DeviceImageLoadEvents` | Timestamp, DeviceId, FileName, FolderPath, SHA256, InitiatingProcessFileName |
| `DeviceEvents` | Generic device event table (ASR, exploit guard, etc.) |

**Identity tables (MDI):**

| Table | Key columns |
|---|---|
| `IdentityLogonEvents` | Timestamp, AccountUpn, AccountObjectId, IPAddress, Protocol, ActionType |
| `IdentityQueryEvents` | Timestamp, AccountUpn, QueryType, QueryTarget, Protocol |
| `IdentityDirectoryEvents` | Timestamp, AccountUpn, ActionType, TargetAccountUpn, AdditionalFields |

**Email tables (MDO):**

| Table | Key columns |
|---|---|
| `EmailEvents` | Timestamp, NetworkMessageId, SenderFromAddress, RecipientEmailAddress, Subject, ThreatTypes, DeliveryAction |
| `EmailAttachmentInfo` | Timestamp, NetworkMessageId, FileName, FileType, SHA256, ThreatTypes |
| `EmailUrlInfo` | Timestamp, NetworkMessageId, Url, UrlDomain |
| `EmailPostDeliveryEvents` | Timestamp, NetworkMessageId, ActionType, ActionTrigger |

**Cloud app tables (MDCA):**

| Table | Key columns |
|---|---|
| `CloudAppEvents` | Timestamp, AccountObjectId, AccountDisplayName, ApplicationId, ApplicationName, ActionType, IPAddress, RawEventData |

**Alert and correlation tables:**

| Table | Key columns |
|---|---|
| `AlertEvidence` | Timestamp, AlertId, EntityType, EvidenceDirection, RemoteIP, AccountName, DeviceName, FileName, ProcessCommandLine |
| `AlertInfo` | Timestamp, AlertId, Title, Category, Severity, ServiceSource, DetectionSource, AttackTechniques |

### Sample Advanced Hunting Queries

**Detect lateral movement via PsExec/remote services:**

```kql
DeviceProcessEvents
| where Timestamp > ago(24h)
| where FileName in~ ("psexec.exe", "psexec64.exe")
    or (FileName =~ "services.exe" and InitiatingProcessFileName =~ "psexec.exe")
| project Timestamp, DeviceName, AccountName, FileName, ProcessCommandLine, RemoteDeviceName = tostring(parse_json(AdditionalFields).RemoteMachineId)
```

**Credential dumping via LSASS memory access:**

```kql
DeviceEvents
| where Timestamp > ago(24h)
| where ActionType == "ProcessMemoryRead"
| where FileName =~ "lsass.exe"
| project Timestamp, DeviceName, AccountName, InitiatingProcessFileName, InitiatingProcessCommandLine
| where InitiatingProcessFileName !in~ ("MsMpEng.exe", "SenseIR.exe", "SecurityHealthSystray.exe")
```

**OAuth consent grant phishing:**

```kql
CloudAppEvents
| where Timestamp > ago(7d)
| where ActionType == "Consent to application"
| extend ConsentedApp = tostring(parse_json(RawEventData).ApplicationName)
| extend GrantedScopes = tostring(parse_json(RawEventData).Scopes)
| where GrantedScopes has_any ("mail.read", "files.read.all", "offline_access")
| project Timestamp, AccountDisplayName, IPAddress, ConsentedApp, GrantedScopes
```

## Defender for Endpoint Actions

### Base URL

```
https://api.securitycenter.microsoft.com/api/
```

### Machine Actions

**Isolate device:**

```http
POST /machines/{machineId}/isolate
{ "Comment": "SOC isolation — incident INC-12345", "IsolationType": "Full" }
```

`IsolationType` values: `Full`, `Selective` (only blocks C2 traffic, allows MDM/AAD/MDE traffic).

**Release from isolation:**

```http
POST /machines/{machineId}/unisolate
{ "Comment": "Investigation complete — device cleared" }
```

**Trigger antivirus scan:**

```http
POST /machines/{machineId}/runAntiVirusScan
{ "Comment": "Post-incident AV scan", "ScanType": "Full" }
```

`ScanType` values: `Quick`, `Full`

**Collect investigation package:**

```http
POST /machines/{machineId}/collectInvestigationPackage
{ "Comment": "Forensic evidence collection for incident INC-12345" }
```

**Restrict app execution:**

```http
POST /machines/{machineId}/restrictCodeExecution
{ "Comment": "Blocking all non-Microsoft-signed binaries during investigation" }
```

**Stop and quarantine file:**

```http
POST /machines/{machineId}/stopAndQuarantineFile
{ "Comment": "Malware detected — quarantine", "Sha256": "{file-sha256}" }
```

**Add machine tag:**

```http
POST /machines/{machineId}/tags
{ "Value": "Compromised", "Action": "Add" }
```

### Indicators (Block/Allow)

**Block file hash across all devices:**

```http
POST /indicators
{
  "indicatorValue": "{sha256}",
  "indicatorType": "FileSha256",
  "action": "Block",
  "title": "Ransomware dropper — INC-12345",
  "description": "Confirmed malicious file observed in active incident",
  "severity": "High",
  "expirationTime": "2026-06-01T00:00:00Z"
}
```

`indicatorType` values: `FileSha1`, `FileSha256`, `FileMd5`, `IpAddress`, `Url`, `DomainName`
`action` values: `Alert`, `AlertAndBlock`, `Block`, `Allowed`

### Machine Vulnerability Assessment

```http
GET /machines/{machineId}/vulnerabilities
```

Returns CVEs affecting the device with CVSS scores and exploit availability.

## Defender for Identity Actions

**Disable compromised AD user (MDI):**

```http
POST https://graph.microsoft.com/v1.0/users/{userId}
PATCH { "accountEnabled": false }
```

(Executed via Graph API — MDI surfaces the alert, action is taken via Entra/AD)

## Alert Suppression Rules

Create suppression rules to reduce noise from known-good activity:

```http
POST https://api.securitycenter.microsoft.com/api/suppressionRules
{
  "name": "Known admin tool — Sysinternals ProcMon",
  "action": "Suppress",
  "triggeredBy": "AlertTitle",
  "indicatorType": "Alert",
  "title": "Suspicious use of Process Monitor",
  "description": "IT admin team uses ProcMon for diagnostics — suppress",
  "iocValue": "Suspicious use of Process Monitor",
  "machineGroups": [{ "id": "{admin-machine-group-id}" }]
}
```

## Secure Score (Microsoft)

**Get Microsoft Secure Score:**

```http
GET https://graph.microsoft.com/v1.0/security/secureScores?$top=1
```

**Get Secure Score Control Profiles:**

```http
GET https://graph.microsoft.com/v1.0/security/secureScoreControlProfiles
```

## Threat Intelligence (MDTI)

**Get threat intelligence indicators (Graph):**

```http
GET https://graph.microsoft.com/v1.0/security/threatIntelligence/indicators
  ?$filter=isActive eq true
  &$select=id,pattern,patternType,confidence,threatTypes
  &$top=100
```

Pattern types: `ipv4Addr`, `ipv6Addr`, `url`, `domain`, `emailAddr`, `file`
