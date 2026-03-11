# Timeline Construction Reference

Forensic timeline construction methodology for Microsoft 365 user investigations. Covers unified event schema, data collection workflows, timestamp normalization, cross-source correlation, anomaly detection algorithms, and output formats.

---

## 1. Unified Event Schema

All events from every data source must be normalized to this canonical schema before merging into the timeline. Consistency is critical for accurate chronological sorting and anomaly detection.

### Core Schema

```json
{
  "timestamp": "2024-01-15T14:32:00Z",
  "source": "signIn",
  "eventType": "UserSignIn",
  "actor": "user@contoso.com",
  "actorObjectId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "target": "Microsoft Teams",
  "targetId": "00000003-0000-0ff1-ce00-000000000000",
  "ipAddress": "203.0.113.42",
  "location": {
    "city": "Berlin",
    "countryOrRegion": "DE",
    "state": "Berlin",
    "latitude": 52.52,
    "longitude": 13.405
  },
  "riskIndicator": true,
  "riskReason": "New country — first sign-in from DE in 30-day baseline",
  "severity": "medium",
  "rawEventId": "aabbccdd-1234-5678-abcd-reference-id",
  "metadata": {
    "clientAppUsed": "Browser",
    "conditionalAccessStatus": "success",
    "deviceIsCompliant": true,
    "deviceTrustType": "AzureAD",
    "sessionId": "session-correlation-id",
    "operationResult": "success"
  }
}
```

### Field Definitions

| Field | Type | Required | Description |
|---|---|---|---|
| `timestamp` | string (ISO 8601 UTC) | Yes | Event time in UTC — primary sort key |
| `source` | enum | Yes | Data source identifier (see values below) |
| `eventType` | string | Yes | Human-readable event classification |
| `actor` | string | Yes | UPN or system identity performing the action |
| `actorObjectId` | string (GUID) | Recommended | Object ID for cross-source correlation |
| `target` | string | Yes | Resource or object affected by the event |
| `targetId` | string | Recommended | Object ID or URL of the target |
| `ipAddress` | string | When available | IPv4 or IPv6 source address |
| `location` | object | When available | Geographic location from IP geolocation |
| `riskIndicator` | boolean | Yes | True if this event is anomalous |
| `riskReason` | string | When riskIndicator=true | Explanation of why this is flagged |
| `severity` | enum | Yes | none, low, medium, high, critical |
| `rawEventId` | string | Yes | ID to look up the original event in source system |
| `metadata` | object | Recommended | Source-specific additional fields |

### Source Values

| Source Value | Description | Primary API |
|---|---|---|
| `signIn` | Azure AD / Entra sign-in events | GET /auditLogs/signIns |
| `directoryAudit` | Azure AD directory operations | GET /auditLogs/directoryAudits |
| `mailboxAudit` | Exchange mailbox item operations | Search-UnifiedAuditLog RecordType=ExchangeItem |
| `sharepointAudit` | SharePoint file operations | Search-UnifiedAuditLog RecordType=SharePoint |
| `onedriveAudit` | OneDrive file operations | Search-UnifiedAuditLog RecordType=OneDrive |
| `teamsAudit` | Teams messages, meetings, calls | Search-UnifiedAuditLog RecordType=MicrosoftTeams |
| `deviceAudit` | Device management events | GET /deviceManagement/managedDevices |
| `riskDetection` | Identity Protection risk events | GET /identityProtection/riskDetections |
| `inboxRuleChange` | Inbox rule creation/modification | directoryAudit + UAL |
| `oauthConsent` | OAuth consent grants | directoryAudit activityDisplayName=Consent |
| `printAudit` | Print job events | MDE device timeline |
| `usbAudit` | USB device connection events | MDE device timeline |

### Severity Classification

| Severity | Criteria |
|---|---|
| `critical` | Confirmed compromise indicator: external forwarding rule, mass deletion, credential theft |
| `high` | Strong anomaly: new country sign-in, bulk file download, suspicious OAuth consent |
| `medium` | Moderate anomaly: off-hours access, legacy auth, new device |
| `low` | Weak signal: slightly unusual timing, minor deviation from baseline |
| `none` | Normal activity — included for completeness |

---

## 2. Data Collection Steps

Collect from each source systematically before normalizing. Use the investigation window (typically 30 days; extend to 90 days if anomalies are found at window edges).

### Step 1: Sign-In Logs

```bash
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/auditLogs/signIns?\$filter=userPrincipalName eq '{upn}' and createdDateTime ge {startDate}T00:00:00Z and createdDateTime le {endDate}T23:59:59Z&\$orderby=createdDateTime asc&\$top=1000&\$select=id,createdDateTime,userPrincipalName,appDisplayName,ipAddress,location,deviceDetail,status,riskLevelAggregated,riskEventTypes,conditionalAccessStatus,clientAppUsed,isInteractive,resourceDisplayName,correlationId" \
  --output json
```

Paginate via `@odata.nextLink` until exhausted.

### Step 2: Directory Audits

```bash
# Actions performed BY the user
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/auditLogs/directoryAudits?\$filter=initiatedBy/user/userPrincipalName eq '{upn}' and activityDateTime ge {startDate}T00:00:00Z&\$orderby=activityDateTime asc&\$top=1000&\$select=id,activityDateTime,activityDisplayName,category,result,initiatedBy,targetResources" \
  --output json

# Actions taken ON the user
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/auditLogs/directoryAudits?\$filter=targetResources/any(t:t/userPrincipalName eq '{upn}') and activityDateTime ge {startDate}T00:00:00Z&\$orderby=activityDateTime asc&\$top=1000" \
  --output json
```

### Step 3: Risk Detections

```bash
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/identityProtection/riskDetections?\$filter=userPrincipalName eq '{upn}' and riskEventDateTime ge {startDate}T00:00:00Z&\$orderby=riskEventDateTime asc&\$top=1000&\$select=id,riskEventDateTime,riskType,riskLevel,riskState,ipAddress,location,detectionTimingType,additionalInfo" \
  --output json
```

### Step 4: Exchange Mailbox Audit

```powershell
$mailboxEvents = Search-UnifiedAuditLog `
  -StartDate "{startDate}" -EndDate "{endDate}" `
  -UserIds "{upn}" `
  -RecordType ExchangeItemAggregated `
  -Operations "HardDelete","SoftDelete","MoveToDeletedItems","Send","SendAs","SendOnBehalf","UpdateInboxRules","AddFolderPermissions","MailboxLogin" `
  -ResultSize 5000
```

### Step 5: SharePoint and OneDrive Audit

```powershell
$fileEvents = Search-UnifiedAuditLog `
  -StartDate "{startDate}" -EndDate "{endDate}" `
  -UserIds "{upn}" `
  -RecordType SharePoint,OneDrive `
  -Operations "FileAccessed","FileModified","FileDeleted","FileCopied","FileDownloaded","FileMoved","SharingSet","SharingInvitationCreated","AnonymousLinkCreated" `
  -ResultSize 5000
```

### Step 6: Teams Audit

```powershell
$teamsEvents = Search-UnifiedAuditLog `
  -StartDate "{startDate}" -EndDate "{endDate}" `
  -UserIds "{upn}" `
  -RecordType MicrosoftTeams `
  -ResultSize 5000
```

### Step 7: Inbox Rule Events

```powershell
$ruleEvents = Search-UnifiedAuditLog `
  -StartDate "{startDate}" -EndDate "{endDate}" `
  -UserIds "{upn}" `
  -Operations "New-InboxRule","Set-InboxRule","Enable-InboxRule","Disable-InboxRule","Remove-InboxRule" `
  -ResultSize 5000
```

### Step 8: OAuth Consent Events

```bash
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/auditLogs/directoryAudits?\$filter=activityDisplayName eq 'Consent to application' and initiatedBy/user/userPrincipalName eq '{upn}' and activityDateTime ge {startDate}T00:00:00Z&\$orderby=activityDateTime asc&\$top=100" \
  --output json
```

---

## 3. Timestamp Alignment

All timestamps must be UTC before merging into the timeline. The following table maps each source to its timestamp field and format.

| Source | Raw Timestamp Field | Format | Timezone | Notes |
|---|---|---|---|---|
| Sign-In logs | `createdDateTime` | ISO 8601 | UTC | Always UTC — no conversion needed |
| Directory audits | `activityDateTime` | ISO 8601 | UTC | Always UTC |
| UAL (PowerShell) | `CreationDate` | DateTime | UTC | PowerShell may display in local time — use `.ToUniversalTime()` |
| UAL AuditData.CreationTime | `CreationTime` | ISO 8601 | UTC | Inner JSON field — UTC |
| Risk detections | `riskEventDateTime` | ISO 8601 | UTC | Always UTC |
| Intune device | `lastSyncDateTime` | ISO 8601 | UTC | Always UTC |
| Intune device | `enrolledDateTime` | ISO 8601 | UTC | Always UTC |
| MDE device timeline | `Timestamp` | ISO 8601 | UTC | Always UTC |
| Exchange message | `receivedDateTime` | ISO 8601 | UTC | Always UTC |
| Exchange message | `sentDateTime` | ISO 8601 | UTC | Always UTC |

### PowerShell UTC Conversion

```powershell
# Ensure UAL CreationDate is treated as UTC
$results | ForEach-Object {
    $utcTime = [System.DateTime]::SpecifyKind($_.CreationDate, [System.DateTimeKind]::Utc)
    $utcTime.ToString("yyyy-MM-ddTHH:mm:ssZ")
}
```

### User Local Time Computation

For off-hours analysis, convert UTC events to the user's local timezone:

```powershell
# Get user's timezone from mailbox settings
$tz = (az rest --method GET --uri "https://graph.microsoft.com/v1.0/users/{userId}/mailboxSettings" |
       ConvertFrom-Json).timeZone

# Convert UTC event to user local time
$tzInfo = [System.TimeZoneInfo]::FindSystemTimeZoneById($tz)
$localTime = [System.TimeZoneInfo]::ConvertTimeFromUtc($utcEvent, $tzInfo)
```

Common timezone mappings:
- `"UTC"` → UTC+0
- `"Pacific Standard Time"` → UTC-8 (UTC-7 DST)
- `"Eastern Standard Time"` → UTC-5 (UTC-4 DST)
- `"Central European Standard Time"` → UTC+1 (UTC+2 DST)
- `"India Standard Time"` → UTC+5:30

---

## 4. Correlation Keys

Cross-source correlation is essential for connecting events that occurred in the same session or by the same actor using different systems.

### Primary Correlation Keys

| Key | Description | Sources |
|---|---|---|
| `userPrincipalName` | Primary identity key across all sources | All sources |
| `actorObjectId` | Object ID — more stable than UPN (UPN can change) | All Graph sources |
| `ipAddress` | Link sign-ins to file access and mailbox events from same session | Sign-in, SharePoint, Exchange UAL |
| `sessionId` / `correlationId` | Link multiple events within the same authentication session | Sign-in, directory audit |
| `deviceId` (AAD DeviceId) | Link device to sign-in and to Intune MDM record | Sign-in deviceDetail, Intune azureADDeviceId |
| `conversationId` | Link related Teams messages or email threads | Teams audit, Exchange messages |
| `requestId` | Link a sign-in to its risk detections | Sign-in, risk detections |

### Correlation Example: IP-Based Session Linking

```python
# Pseudocode: Group events by IP address within a time window
def correlate_by_ip(events, ip_address, window_hours=2):
    return [
        e for e in events
        if e['ipAddress'] == ip_address
        and abs((e['timestamp'] - reference_time).total_seconds()) <= window_hours * 3600
    ]
```

### Correlation Example: Device-Based Linking

The `azureADDeviceId` in Intune = `deviceId` in Entra = `deviceDetail.deviceId` in sign-in log.

```bash
# Step 1: Get azureADDeviceId from Intune
INTUNE_DEVICE=$(az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/deviceManagement/managedDevices?$filter=userPrincipalName eq '{upn}'&$select=azureADDeviceId,deviceName" \
  --output json)

# Step 2: Find all sign-ins using that device ID
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/auditLogs/signIns?\$filter=deviceDetail/deviceId eq '{azureADDeviceId}' and createdDateTime ge {startDate}T00:00:00Z&\$top=100" \
  --output json
```

---

## 5. Anomaly Detection Algorithms

### 1. Impossible Travel Detection

Two sign-ins from locations more than 500 km apart within a 2-hour window.

```python
import math
from datetime import datetime, timedelta

def haversine_km(lat1, lon1, lat2, lon2):
    """Calculate distance between two lat/lon coordinates in km."""
    R = 6371  # Earth radius in km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return 2 * R * math.asin(math.sqrt(a))

def detect_impossible_travel(sign_ins, max_speed_kmh=900, window_hours=2):
    """
    Detect sign-in pairs that would require faster-than-possible travel.
    max_speed_kmh: 900 km/h ≈ commercial aircraft speed
    """
    flags = []
    sorted_ins = sorted(sign_ins, key=lambda x: x['timestamp'])

    for i, signin_a in enumerate(sorted_ins):
        for signin_b in sorted_ins[i+1:]:
            time_diff_hours = (signin_b['timestamp'] - signin_a['timestamp']).total_seconds() / 3600
            if time_diff_hours > window_hours:
                break
            if time_diff_hours == 0:
                continue

            loc_a = signin_a.get('location', {})
            loc_b = signin_b.get('location', {})
            if not all([loc_a.get('latitude'), loc_a.get('longitude'),
                        loc_b.get('latitude'), loc_b.get('longitude')]):
                continue

            distance_km = haversine_km(
                loc_a['latitude'], loc_a['longitude'],
                loc_b['latitude'], loc_b['longitude']
            )
            speed_kmh = distance_km / time_diff_hours

            if speed_kmh > max_speed_kmh:
                flags.append({
                    'type': 'impossible_travel',
                    'signin_a': signin_a['rawEventId'],
                    'signin_b': signin_b['rawEventId'],
                    'distance_km': round(distance_km, 1),
                    'time_hours': round(time_diff_hours, 2),
                    'implied_speed_kmh': round(speed_kmh, 0)
                })
    return flags
```

### 2. New Geography Detection

Flag sign-ins from a country not seen in the prior 30-day baseline.

```python
from datetime import datetime, timedelta

def detect_new_geography(sign_ins, investigation_start, baseline_days=30):
    """
    Returns sign-ins from countries not seen in the baseline period.
    """
    baseline_end = investigation_start
    baseline_start = investigation_start - timedelta(days=baseline_days)

    baseline_countries = set(
        s['location']['countryOrRegion']
        for s in sign_ins
        if baseline_start <= s['timestamp'] < baseline_end
        and s.get('location', {}).get('countryOrRegion')
    )

    return [
        s for s in sign_ins
        if s['timestamp'] >= investigation_start
        and s.get('location', {}).get('countryOrRegion') not in baseline_countries
        and s.get('location', {}).get('countryOrRegion') is not None
    ]
```

### 3. Off-Hours Access Detection

Flag access between 22:00–06:00 in the user's local timezone.

```python
def detect_off_hours(events, user_timezone_offset_hours, start_hour=22, end_hour=6):
    """
    Flag events occurring during off-hours in the user's local timezone.
    start_hour and end_hour define the off-hours window (e.g., 22:00-06:00).
    """
    flags = []
    for event in events:
        local_hour = (event['timestamp'].hour + user_timezone_offset_hours) % 24
        if local_hour >= start_hour or local_hour < end_hour:
            flags.append({
                **event,
                'riskIndicator': True,
                'riskReason': f'Off-hours access at {local_hour:02d}:00 local time'
            })
    return flags
```

### 4. Bulk Operations Detection

Flag users performing > 50 file operations in any 1-hour window.

```python
from collections import defaultdict

def detect_bulk_operations(file_events, threshold=50, window_hours=1):
    """
    Group file events into 1-hour buckets and flag hours exceeding the threshold.
    """
    buckets = defaultdict(list)
    for event in file_events:
        bucket_key = event['timestamp'].strftime('%Y-%m-%d %H')
        buckets[bucket_key].append(event)

    return {
        hour: events
        for hour, events in buckets.items()
        if len(events) >= threshold
    }
```

### 5. Mass Deletion Detection

Flag HardDelete count > 100 in a 24-hour window.

```python
def detect_mass_deletion(mailbox_events, threshold=100, window_hours=24):
    """
    Identify bulk hard-deletion events.
    """
    deletion_events = [
        e for e in mailbox_events
        if e.get('eventType') in ('HardDelete', 'SoftDelete', 'MoveToDeletedItems')
    ]
    return detect_bulk_operations(deletion_events, threshold=threshold, window_hours=window_hours)
```

### 6. First-Time App Access Detection

Flag OAuth consent for an application not previously seen in the baseline period.

```python
def detect_new_app_consent(consent_events, investigation_start, baseline_days=90):
    """
    Flag consent grants for apps not previously consented to.
    """
    baseline_end = investigation_start
    baseline_start = investigation_start - timedelta(days=baseline_days)

    baseline_app_ids = set(
        e.get('metadata', {}).get('appId')
        for e in consent_events
        if baseline_start <= e['timestamp'] < baseline_end
    )

    return [
        e for e in consent_events
        if e['timestamp'] >= investigation_start
        and e.get('metadata', {}).get('appId') not in baseline_app_ids
    ]
```

---

## 6. Gap Detection

Suspicious gaps in activity patterns can indicate account dormancy, handover, or a period of low-profile attacker activity.

### Normal Pattern Establishment

1. Build a histogram of daily event counts for the baseline period (30 days prior to investigation window)
2. Calculate mean and standard deviation of daily activity
3. Flag any gap > 5 consecutive business days in an otherwise active account
4. Flag any return from a gap that is immediately followed by high-risk activity

### Gap Detection Algorithm

```python
def detect_activity_gaps(events, gap_days=5):
    """
    Find periods of complete inactivity exceeding gap_days business days.
    """
    if not events:
        return []

    sorted_events = sorted(events, key=lambda x: x['timestamp'])
    gaps = []

    for i in range(1, len(sorted_events)):
        prev = sorted_events[i-1]['timestamp']
        curr = sorted_events[i]['timestamp']
        diff_days = (curr - prev).days

        # Count business days (rough estimate — adjust for holidays)
        business_days = sum(
            1 for d in range(diff_days)
            if (prev + timedelta(days=d)).weekday() < 5
        )

        if business_days >= gap_days:
            gaps.append({
                'gap_start': prev.isoformat(),
                'gap_end': curr.isoformat(),
                'calendar_days': diff_days,
                'business_days': business_days,
                'post_gap_event': sorted_events[i]
            })
    return gaps
```

---

## 7. Output Formats

### Markdown Table Format (Investigation Report)

Suitable for inclusion in investigation reports and shared with stakeholders.

```markdown
## Forensic Timeline — {upn}
**Investigation Period**: {startDate} to {endDate} UTC
**Data Sources**: Sign-In Logs, Directory Audits, Exchange UAL, SharePoint UAL, Teams UAL, Risk Detections
**Generated**: {generatedAt}
**Investigator**: {investigatorName}

### Key Events (Anomalies Only — {anomalyCount} of {totalCount} events)

| # | Timestamp (UTC) | Source | Event Type | Target | IP Address | Location | Severity | Risk Reason |
|---|---|---|---|---|---|---|---|---|
| 1 | 2024-01-15 14:32:00 | Sign-In | UserSignIn | Teams | 203.0.113.42 | Berlin, DE | HIGH | New country — baseline: US only |
| 2 | 2024-01-15 14:35:00 | SharePoint | FileDownloaded | Finance_Q4.xlsx | 203.0.113.42 | Berlin, DE | HIGH | Bulk download (1 of 23) |
| 3 | 2024-01-15 14:41:00 | Exchange | UpdateInboxRules | Inbox | 203.0.113.42 | Berlin, DE | CRITICAL | External forward rule created |
| 4 | 2024-01-15 14:43:00 | Exchange | Send | external@gmail.com | 203.0.113.42 | Berlin, DE | CRITICAL | Email sent to personal address |
```

### JSON Array Format (Programmatic Processing / SIEM Import)

```json
[
  {
    "timestamp": "2024-01-15T14:32:00Z",
    "source": "signIn",
    "eventType": "UserSignIn",
    "actor": "user@contoso.com",
    "actorObjectId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "target": "Microsoft Teams",
    "targetId": "00000003-0000-0ff1-ce00-000000000000",
    "ipAddress": "203.0.113.42",
    "location": {"city": "Berlin", "countryOrRegion": "DE", "state": "Berlin"},
    "riskIndicator": true,
    "riskReason": "New country — first sign-in from DE in 30-day baseline",
    "severity": "high",
    "rawEventId": "aabbccdd-1234-5678-abcd-001",
    "metadata": {"clientAppUsed": "Browser", "conditionalAccessStatus": "success"}
  }
]
```

### CSV Format (Excel / SIEM Import)

```
timestamp,source,eventType,actor,target,ipAddress,countryOrRegion,severity,riskIndicator,riskReason,rawEventId
2024-01-15T14:32:00Z,signIn,UserSignIn,user@contoso.com,Microsoft Teams,203.0.113.42,DE,high,true,"New country",aabbccdd-001
2024-01-15T14:35:00Z,sharepointAudit,FileDownloaded,user@contoso.com,Finance_Q4.xlsx,203.0.113.42,DE,high,true,"Bulk download",aabbccdd-002
```

---

## 8. Timeline Visualization Patterns

### ASCII Timeline (Terminal Output)

```
FORENSIC TIMELINE — user@contoso.com
Period: 2024-01-10 to 2024-01-17 UTC
============================================================

2024-01-15 (TUESDAY) — INCIDENT DAY
───────────────────────────────────────────────────────────
  12:01  [NORMAL  ] Sign-In: Outlook — Seattle, US (routine)
  14:32  [HIGH    ] Sign-In: Teams — Berlin, DE *** NEW COUNTRY ***
  14:35  [HIGH    ] FILE: Downloaded Finance_Q4.xlsx (SharePoint/Finance)
  14:36  [HIGH    ] FILE: Downloaded Budget_2024.xlsx (SharePoint/Finance)
  14:37  [HIGH    ] FILE: Downloaded HR_Salaries.xlsx (SharePoint/HR)
           ^^^^ BULK DOWNLOAD: 3 sensitive files in 2 minutes
  14:41  [CRITICAL] MAIL: UpdateInboxRules — Created forward to external@gmail.com
  14:43  [CRITICAL] MAIL: 3 messages auto-forwarded to external@gmail.com
  14:55  [HIGH    ] OAUTH: Consented to "File Sync Pro" (appId: aabbccdd)
  15:02  [NORMAL  ] Sign-Out (session duration: 30 min)

2024-01-16 (WEDNESDAY) — FOLLOW-UP ACTIVITY
───────────────────────────────────────────────────────────
  02:14  [MEDIUM  ] Sign-In: Exchange — Berlin, DE (off-hours: 02:14 UTC = 03:14 CET)
  02:16  [CRITICAL] MAIL: 47 messages HardDeleted (evidence destruction)
  02:23  [MEDIUM  ] Sign-Out (session duration: 9 min)

SUMMARY:
  Total events analyzed: 847
  Flagged events: 9
  Critical: 3 | High: 4 | Medium: 2
  Attack chain: External access → Data exfiltration → Forwarding rule → Evidence destruction
```

### Heat Map Pattern (by Hour of Day)

```
Hour  Mon  Tue  Wed  Thu  Fri  Sat  Sun
00:00  .    .    ██   .    .    .    .
01:00  .    .    ██   .    .    .    .
02:00  .    .    ████  .    .    .    .   ← Suspicious off-hours (Wed 02:14)
03:00  .    .    .    .    .    .    .
...
09:00  ██   ██   .    ██   ██   .    .
10:00  ████ ████ .    ████ ████ .    .   ← Normal business hours pattern
11:00  ████ ████ .    ████ ████ .    .
12:00  ██   ██   .    ██   ██   .    .
...
14:00  .    ████ .    .    .    .    .   ← Incident: Tue 14:32 sign-in from DE
15:00  .    ██   .    .    .    .    .

Legend: . = 0 events, ██ = 1-5 events, ████ = 6+ events
```
