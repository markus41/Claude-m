---
name: inv-timeline
description: Build unified cross-service activity timeline — combines sign-ins, audit logs, mailbox events, file access, Teams activity
argument-hint: "<upn> [--days <number>] [--start-date <YYYY-MM-DD>] [--end-date <YYYY-MM-DD>] [--sources <all|signin,audit,mailbox,files,teams>] [--format <markdown|json|csv>]"
allowed-tools:
  - Bash
  - Read
  - Write
---

# Graph Investigator — Unified Activity Timeline

Constructs a chronological timeline of all user activity across Microsoft 365 services. Normalizes events from sign-in logs, directory audit logs, Exchange, SharePoint, and Teams into a single ordered view. Flags anomalies including impossible travel, off-hours spikes, bulk file operations, new country sign-ins, and first-time app consents.

## Arguments

| Argument | Description |
|---|---|
| `<upn>` | **Required.** User Principal Name to investigate |
| `--days <number>` | Number of days of history to collect (default: 14) |
| `--start-date <YYYY-MM-DD>` | Explicit start date (overrides --days) |
| `--end-date <YYYY-MM-DD>` | Explicit end date (default: now) |
| `--sources <...>` | Comma-separated sources: `signin`, `audit`, `mailbox`, `files`, `teams`, or `all` (default: `all`) |
| `--format <markdown\|json\|csv>` | Output format — defaults to `markdown` |

## Integration Context Check

Required scopes:
- `AuditLog.Read.All` — sign-in logs and directory audit events
- `User.Read.All` — resolve UPN to object ID

Recommended additional scopes for full coverage:
- `Mail.Read` — mailbox events (received/sent mail for timeline context)
- `Sites.Read.All` — SharePoint/OneDrive file events
- `Chat.Read.All` — Teams chat activity timestamps
- `IdentityRiskyUser.Read.All` — risk event timestamps (P2)

Sources that are unavailable due to missing scopes will be omitted from the timeline with a warning displayed at the top of the output.

## Step 1: Collect Sign-In Events

```bash
UPN="<upn>"
START_DATE="<ISO-8601-datetime>"
END_DATE="<ISO-8601-datetime>"

az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/auditLogs/signIns?\$filter=userPrincipalName eq '${UPN}' and createdDateTime ge ${START_DATE} and createdDateTime le ${END_DATE}&\$select=id,createdDateTime,appDisplayName,ipAddress,location,status,riskLevelAggregated,riskEventTypes,deviceDetail,clientAppUsed,conditionalAccessStatus,authenticationRequirement,isInteractive,resourceDisplayName&\$top=1000&\$orderby=createdDateTime asc" \
  --output json
```

Map each record to the unified event schema (see Step 5).

## Step 2: Collect Directory Audit Events

```bash
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/auditLogs/directoryAudits?\$filter=initiatedBy/user/userPrincipalName eq '${UPN}' and activityDateTime ge ${START_DATE} and activityDateTime le ${END_DATE}&\$select=id,activityDateTime,activityDisplayName,category,result,targetResources,loggedByService&\$top=500&\$orderby=activityDateTime asc" \
  --output json
```

Also collect admin operations targeting this user (where the user is the `targetResource`).

## Step 3: Collect Exchange Mailbox Events (PowerShell)

Provide the PowerShell command for Exchange audit events to add to the timeline:

```powershell
$startDate = "<start-date>"
$endDate = "<end-date>"

$exchangeEvents = Search-UnifiedAuditLog `
  -StartDate $startDate `
  -EndDate $endDate `
  -UserIds "<upn>" `
  -RecordType ExchangeItem,ExchangeItemAggregated `
  -Operations "Send","SoftDelete","HardDelete","UpdateInboxRules","New-InboxRule","AddFolderPermissions","SendAs" `
  -ResultSize 5000

$exchangeEvents | ConvertTo-Json | Out-File "exchange-events.json"
```

## Step 4: Collect File Access Events (PowerShell)

```powershell
$fileEvents = Search-UnifiedAuditLog `
  -StartDate $startDate `
  -EndDate $endDate `
  -UserIds "<upn>" `
  -RecordType SharePoint,SharePointFileOperation,OneDrive `
  -Operations "FileAccessed","FileDownloaded","FileCopied","FileMoved","FileDeleted","SharingSet","AnonymousLinkCreated" `
  -ResultSize 5000

$fileEvents | ConvertTo-Json | Out-File "file-events.json"
```

## Step 5: Normalize Events to Unified Schema

Normalize all collected events into a consistent structure before sorting:

```json
{
  "timestamp": "2024-01-15T14:22:31Z",
  "source": "signin | audit | exchange | sharepoint | teams",
  "eventType": "Authentication | AdminAction | MailOperation | FileOperation | TeamsActivity",
  "action": "Human-readable action description",
  "result": "success | failure | unknown",
  "ip": "1.2.3.4",
  "location": "New York, US",
  "app": "Azure Portal",
  "target": "target resource or recipient",
  "riskLevel": "none | low | medium | high | critical",
  "anomalyFlags": ["impossible_travel", "off_hours", "new_country", "bulk_operation", "legacy_auth"],
  "rawEventId": "original-event-id"
}
```

## Step 6: Sort Chronologically

Sort all normalized events ascending by `timestamp`. If two events share the same timestamp, order by `source` priority: signin > audit > exchange > sharepoint > teams.

## Step 7: Anomaly Detection

After sorting, scan the full timeline for the following anomalies. Tag each matching event with the appropriate flag in `anomalyFlags`.

### Impossible Travel
Compare consecutive sign-in events from different locations. Flag any pair where the geographic distance divided by elapsed hours exceeds 900 km/h.

### Off-Hours Activity
Flag events outside 06:00–22:00 in the user's typical time zone (infer from the most common sign-in location). Group off-hours events: single late event is LOW, sustained activity cluster is HIGH.

### Bulk File Operations
Count `FileDownloaded` or `FileAccessed` events within any rolling 60-minute window. Flag if count exceeds 50 in one hour (🔴 HIGH) or 20 in one hour (🟡 MEDIUM).

### New Country Sign-In
Compare sign-in countries in the investigation window to countries seen in the 30 days before `--start-date`. A country with no prior history in the baseline is flagged as new.

### First-Time App Consent
An OAuth app consent event (`Add delegation to service principal`) from a service principal not seen in prior audit logs.

### Credential Stuffing Pattern
More than 10 failed sign-ins from different IPs within 1 hour.

### Persistence Indicators
`New-InboxRule` or `UpdateInboxRules` events — BEC persistence. `MFA method registered` during an active investigation period — attacker may be registering their own auth method.

## Step 8: Generate Timeline Output

Format the normalized and annotated timeline for the requested output format.

### Markdown Format (default)

```markdown
## Activity Timeline — jsmith@contoso.com
**Period**: 2024-01-01 to 2024-01-15 | **Sources**: signin, audit, exchange, sharepoint | **Total Events**: 342

### Daily Activity Summary
2024-01-15 ████████████░░░░ 48 events (8 flagged ⚠️)
2024-01-14 ████████░░░░░░░░ 31 events (3 flagged ⚠️)
2024-01-13 ███░░░░░░░░░░░░░ 14 events (0 flagged)
2024-01-12 ██░░░░░░░░░░░░░░  8 events (0 flagged)

Scale: each █ = 3 events

### Anomaly Summary
| Anomaly | Count | Severity |
|---|---|---|
| Impossible travel | 1 | 🔴 HIGH |
| Off-hours activity cluster | 2 | 🟡 MEDIUM |
| Bulk file download (>20 in 1h) | 1 | 🟡 MEDIUM |
| New country sign-in | 1 | 🟡 MEDIUM |

### Detailed Timeline

| Timestamp (UTC) | Source | Action | Location/IP | App/Target | Risk | Flags |
|---|---|---|---|---|---|---|
| 2024-01-15 02:14 | signin | Sign-in SUCCESS | Berlin, DE / 5.6.7.8 | Azure Portal | 🔴 High | ⚠️ impossible_travel, off_hours, new_country |
| 2024-01-15 02:31 | exchange | New-InboxRule: forward to gmail.com | — | Mailbox | 🔴 High | ⚠️ persistence |
| 2024-01-15 03:05–03:48 | sharepoint | 67× FileDownloaded | — | /Finance/** | 🔴 High | ⚠️ bulk_operation |
| 2024-01-14 09:17 | signin | Sign-in SUCCESS | New York, US / 1.2.3.4 | Teams | 🟢 None | — |
| 2024-01-14 09:22 | teams | MeetingAttended | — | Weekly Standup | 🟢 None | — |

⚠️ IMPOSSIBLE TRAVEL:
  2024-01-14 18:45 UTC — New York, US (1.2.3.4)
  2024-01-15 02:14 UTC — Berlin, DE (5.6.7.8)
  Distance: ~6,300 km | Time: 7h 29m | Required speed: 841 km/h — PHYSICALLY IMPOSSIBLE (near flight speed, no travel on calendar)
```

### JSON Format (--format json)

Emit a JSON object:
```json
{
  "user": "jsmith@contoso.com",
  "period": { "start": "...", "end": "..." },
  "totalEvents": 342,
  "anomalies": [...],
  "events": [{ "timestamp": "...", "source": "...", ... }]
}
```

### CSV Format (--format csv)

Emit a flat CSV with columns: `timestamp,source,eventType,action,result,ip,location,app,target,riskLevel,anomalyFlags`

CSV is suitable for import into SIEM platforms or Excel for further analysis.
