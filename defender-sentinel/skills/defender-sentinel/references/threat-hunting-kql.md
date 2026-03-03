# Threat Hunting KQL — Microsoft Sentinel Reference

KQL (Kusto Query Language) is the query language for Microsoft Sentinel Log Analytics and Defender XDR Advanced Hunting. Effective threat hunting requires understanding the data schema, writing efficient queries, and systematically exploring hypotheses.

---

## Advanced Hunting API (Microsoft Graph)

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| POST | `/security/runHuntingQuery` | `ThreatHunting.Read.All` | Body: `{ "query": "..." }` | Run KQL query in Defender XDR |
| POST | `https://api.loganalytics.io/v1/workspaces/{workspaceId}/query` | Log Analytics Reader | Body: `{ "query": "...", "timespan": "P7D" }` | Run KQL in Sentinel workspace |

**Base URL for Graph:** `https://graph.microsoft.com/v1.0`

---

## KQL Hunting Queries by Threat Scenario

### 1. Credential Dumping (LSASS Access)

```kql
// Detect LSASS memory access — common with Mimikatz, ProcDump
DeviceProcessEvents
| where Timestamp > ago(7d)
| where FileName =~ "lsass.exe"
| where ProcessTokenElevation != "NonElevatedToken"
| project Timestamp, DeviceName, InitiatingProcessFileName,
    InitiatingProcessCommandLine, AccountName, ProcessId
| order by Timestamp desc
```

### 2. Pass-the-Hash / Pass-the-Ticket

```kql
// Logon type 3 (Network) with NTLM from a non-standard source
SecurityEvent
| where TimeGenerated > ago(7d)
| where EventID == 4624
| where LogonType == 3
| where AuthenticationPackageName =~ "NTLM"
| where WorkstationName != Computer  // Lateral movement indicator
| where AccountName !endswith "$"   // Exclude computer accounts
| project TimeGenerated, Computer, AccountName, WorkstationName, IPAddress = IpAddress, LogonProcessName
| summarize Count=count() by Computer, AccountName, WorkstationName
| where Count > 10
| order by Count desc
```

### 3. Kerberoasting Detection

```kql
// TGS requests for service accounts (RC4 encryption = Kerberoasting indicator)
SecurityEvent
| where TimeGenerated > ago(24h)
| where EventID == 4769  // Kerberos TGS request
| where TicketEncryptionType == "0x17"  // RC4-HMAC (weak — target of Kerberoasting)
| where ServiceName !endswith "$"  // Exclude computer accounts
| where ServiceName !startswith "krbtgt"
| project TimeGenerated, Computer, AccountName, ServiceName, ClientAddress = IpAddress
| summarize RequestCount=count() by AccountName, ClientAddress, bin(TimeGenerated, 1h)
| where RequestCount > 5
| order by RequestCount desc
```

### 4. Golden Ticket Detection

```kql
// Forged TGT — lifetime unusually long or account doesn't exist
SecurityEvent
| where TimeGenerated > ago(24h)
| where EventID == 4768  // Kerberos TGT request
| where TicketOptions has "0x40810010"  // Forwardable, proxiable, renewable
| extend LifetimeMins = datetime_diff('minute', TicketExpirationTime, TicketCreationTime)
| where LifetimeMins > 600  // Standard max is 600 minutes (10 hours)
| project TimeGenerated, Computer, AccountName, ClientAddress = IpAddress, LifetimeMins, TicketOptions
| order by LifetimeMins desc
```

### 5. Impossible Travel

```kql
let lookback = 7d;
let speed_limit_kmh = 900.0;
SigninLogs
| where TimeGenerated > ago(lookback)
| where ResultType == 0
| where isnotempty(tostring(LocationDetails.geoCoordinates.latitude))
| project TimeGenerated, UserPrincipalName, IPAddress,
    City = tostring(LocationDetails.city),
    Country = tostring(LocationDetails.countryOrRegion),
    Lat = todouble(LocationDetails.geoCoordinates.latitude),
    Lon = todouble(LocationDetails.geoCoordinates.longitude)
| sort by UserPrincipalName asc, TimeGenerated asc
| serialize
| extend PrevTime = prev(TimeGenerated), PrevLat = prev(Lat), PrevLon = prev(Lon),
    PrevUser = prev(UserPrincipalName), PrevCity = prev(City), PrevCountry = prev(Country)
| where UserPrincipalName == PrevUser
| extend TimeDeltaHours = datetime_diff('second', TimeGenerated, PrevTime) / 3600.0
| extend DistanceKm = geo_distance_2points(PrevLon, PrevLat, Lon, Lat) / 1000.0
| extend SpeedKmh = iff(TimeDeltaHours > 0.0, DistanceKm / TimeDeltaHours, real(0.0))
| where SpeedKmh > speed_limit_kmh and TimeDeltaHours < 24.0
| project TimeGenerated, UserPrincipalName, PrevCity, PrevCountry, City, Country,
    IPAddress, DistanceKm = round(DistanceKm, 0), SpeedKmh = round(SpeedKmh, 0), TimeDeltaHours = round(TimeDeltaHours, 2)
```

### 6. Living Off the Land (LOLBIN) Abuse

```kql
// LOLBins commonly abused for lateral movement, execution, evasion
let lolbins = dynamic([
    "mshta.exe", "regsvr32.exe", "certutil.exe", "bitsadmin.exe",
    "wmic.exe", "cmstp.exe", "msiexec.exe", "odbcconf.exe",
    "ieexec.exe", "msconfig.exe", "appsyncpublishingtool.exe",
    "diskshadow.exe", "esentutl.exe", "expand.exe", "findstr.exe",
    "forfiles.exe", "mavinject.exe", "microsoft.workflow.compiler.exe",
    "msdeploy.exe", "msdt.exe", "runscripthelper.exe"
]);
DeviceProcessEvents
| where Timestamp > ago(7d)
| where FileName in~ (lolbins)
| where InitiatingProcessFileName !in~ ("explorer.exe", "services.exe", "svchost.exe")
| project Timestamp, DeviceName, AccountName, FileName, ProcessCommandLine,
    InitiatingProcessFileName, InitiatingProcessCommandLine
| order by Timestamp desc
```

### 7. Suspicious Email Forwarding Rule

```kql
// MCAS: Inbox forwarding rules created — common exfiltration technique
CloudAppEvents
| where Timestamp > ago(7d)
| where ActionType == "Set-Mailbox" or ActionType == "New-InboxRule" or ActionType == "Set-InboxRule"
| extend RuleDetails = tostring(RawEventData.Parameters)
| where RuleDetails has_any ("ForwardTo", "RedirectTo", "ForwardAsAttachmentTo")
| project Timestamp, AccountDisplayName, AccountObjectId, ActionType, RuleDetails,
    IPAddress = tostring(RawEventData.ClientIP)
| order by Timestamp desc
```

### 8. Azure Resource Deletion Spike

```kql
// Detect bulk deletion — possible ransomware or rogue admin
AzureActivity
| where TimeGenerated > ago(7d)
| where OperationNameValue has "delete" and ActivityStatusValue == "Success"
| summarize DeleteCount=count(), Resources=make_set(ResourceId, 20)
    by Caller, bin(TimeGenerated, 1h)
| where DeleteCount > 20
| order by DeleteCount desc
```

### 9. Suspicious Sign-In + Mailbox Data Access

```kql
// Correlate risky sign-in with mailbox access — potential BEC
let riskySignIns = SigninLogs
| where TimeGenerated > ago(7d)
| where RiskLevelAggregated in ("medium", "high")
| where ResultType == 0
| project UserPrincipalName, RiskySignInTime = TimeGenerated, RiskIP = IPAddress;
OfficeActivity
| where TimeGenerated > ago(7d)
| where Operation in ("MailItemsAccessed", "MessageSend", "Create")
| where RecordType == "ExchangeItem"
| join kind=inner riskySignIns on UserPrincipalName
| where TimeGenerated between (RiskySignInTime .. (RiskySignInTime + 2h))
| project TimeGenerated, UserPrincipalName, Operation, ClientIP, RiskIP, Folders
| order by TimeGenerated desc
```

### 10. Privileged Account Changes

```kql
// Track all changes to privileged Entra ID roles in last 24 hours
AuditLogs
| where TimeGenerated > ago(24h)
| where Category == "RoleManagement"
| where OperationName in ("Add member to role", "Remove member from role",
    "Add eligible member to role", "Remove eligible member from role")
| extend TargetUser = tostring(TargetResources[0].userPrincipalName)
| extend Role = tostring(TargetResources[1].displayName)
| extend InitiatedByUser = tostring(InitiatedBy.user.userPrincipalName)
| extend InitiatedByApp = tostring(InitiatedBy.app.displayName)
| where Role in ("Global Administrator", "Privileged Role Administrator",
    "Security Administrator", "User Administrator", "Exchange Administrator",
    "SharePoint Administrator", "Conditional Access Administrator")
| project TimeGenerated, OperationName, TargetUser, Role, InitiatedByUser, InitiatedByApp, Result
| order by TimeGenerated desc
```

---

## Security Event Table Key Event IDs

| EventID | Description | Hunting Use Case |
|---------|-------------|-----------------|
| 4624 | Successful logon | Lateral movement, pass-the-hash |
| 4625 | Failed logon | Brute force, password spray |
| 4648 | Logon with explicit credentials | PTH, PTT, Kerberos abuse |
| 4663 | File object access | Data staging, exfiltration |
| 4672 | Privileged logon (admin) | Admin account usage |
| 4688 | New process created | Execution, LOLBin, malware |
| 4697 | Service installed | Persistence |
| 4698 | Scheduled task created | Persistence |
| 4719 | System audit policy changed | Defense evasion |
| 4720 | User account created | Persistence, insider threat |
| 4732 | Member added to local admin group | Privilege escalation |
| 4756 | Member added to universal group | Privilege escalation |
| 4769 | Kerberos TGS request | Kerberoasting |
| 4771 | Kerberos pre-auth failed | Brute force, account lockout |
| 4776 | DC tried to validate credentials | NTLM auth (pass-the-hash target) |
| 7045 | New service installed (System log) | Persistence |

---

## Hunting Bookmarks API

```typescript
// Save a hunting bookmark for a pivoting lead
const bookmark = await fetch(
  `${sentinelBase}/bookmarks/{bookmarkId}?api-version=2023-02-01`,
  {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      properties: {
        displayName: 'Suspicious LSASS access — WIN-XYZ — 2026-03-01',
        query: 'DeviceProcessEvents | where FileName =~ "lsass.exe" | where DeviceName == "WIN-XYZ"',
        queryStartTime: '2026-03-01T00:00:00Z',
        queryEndTime: '2026-03-02T00:00:00Z',
        notes: 'Possible credential dumping. Correlate with later lateral movement.',
        labels: ['credential-access', 'investigation-2026-001'],
        entityMappings: [
          { entityType: 'Host', fieldMappings: [{ identifier: 'HostName', columnName: 'DeviceName' }] }
        ]
      }
    })
  }
);
```

---

## Livestream Hunting

Sentinel Livestream runs a hunting query in near-real-time and alerts when new results arrive.

```json
{
  "properties": {
    "displayName": "Live: New LSASS Access",
    "query": "DeviceProcessEvents | where FileName =~ 'lsass.exe' | project Timestamp, DeviceName, InitiatingProcessFileName",
    "queryFrequency": "PT5M",
    "eventGroupingSettings": { "aggregationKind": "SingleAlert" }
  }
}
```

---

## KQL Performance Best Practices

| Pattern | Good | Bad |
|---------|------|-----|
| Time filter | First operator: `| where Timestamp > ago(7d)` | Without time filter — scans all data |
| Column selection | `| project` only needed columns | `| project *` |
| Filter before join | Apply `where` on both tables before `join` | Join first, filter after |
| Avoid `contains` | Use `has` or `has_any` (token-based, faster) | `| where Field contains "value"` |
| Summarize early | Reduce rows before complex operations | Summarize at end on large datasets |
| Use `let` for reuse | `let table = ...;` for multi-use subqueries | Repeat the same subquery multiple times |
| `in~` for case-insensitive | `| where Field in~ ("a", "b")` | `| where tolower(Field) in ("a", "b")` |

---

## Error Codes

| Code | Meaning | Remediation |
|------|---------|-------------|
| 400 `SyntaxError` | KQL syntax invalid | Test query in Log Analytics UI first |
| 400 `SemanticError` | KQL semantic issue (wrong type, missing column) | Check column names match table schema |
| 403 `Forbidden` | Missing ThreatHunting.Read.All or Log Analytics Reader | Consent permission / assign IAM role |
| 404 `WorkspaceNotFound` | Workspace ID invalid | Verify workspace ID from Azure portal |
| 429 `TooManyRequests` | Log Analytics query throttled | Reduce query frequency; paginate results |
| `PartialError` | Query returned partial results (timeout) | Narrow time range; add more filters |

---

## Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Log Analytics query timeout | 10 minutes | Queries exceeding timeout return partial results |
| Advanced Hunting result rows | 10,000 | Add `limit 10000` explicitly |
| Advanced Hunting query period | 30 days | Defender XDR scope |
| Log Analytics lookback | Workspace retention (90-730 days) | Custom tables: up to 12 years |
| Concurrent queries per workspace | 5 | Queue additional queries |
| Bookmarks per workspace | 500 | — |
| Query string length | 64 KB | — |
| `join` result limit | 100,000 rows | Use `summarize` to reduce before joining |
