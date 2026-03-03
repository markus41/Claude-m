---
name: sentinel-hunting-query
description: Generate and run KQL threat hunting queries in Microsoft Sentinel — by MITRE technique, threat type, or custom scenario; save results as bookmarks
argument-hint: "<scenario> [--technique <T-id>] [--lookback <duration>] [--save-bookmark] [--export-csv]"
allowed-tools:
  - Bash
  - Read
  - Write
---

# Sentinel Threat Hunting Query

Generates purpose-built KQL threat hunting queries for a specified scenario, threat type, or MITRE ATT&CK technique. Executes the query against the Sentinel Log Analytics workspace, formats results, and optionally saves significant findings as bookmarks.

## Arguments

- `<scenario>`: Free-text hunting scenario (e.g., "credential stuffing", "living off the land", "ransomware precursor", "supply chain compromise")
- `--technique <T-id>`: MITRE ATT&CK technique ID (e.g., `T1059.001`, `T1003`, `T1486`)
- `--lookback <duration>`: KQL duration string (default: `7d`). Examples: `1h`, `24h`, `7d`, `30d`
- `--save-bookmark`: Save results rows with high relevance as Sentinel bookmarks
- `--export-csv`: Output results as a CSV file

## Integration Context Check

Require:
- `SENTINEL_WORKSPACE_ID` (Log Analytics workspace GUID)
- `SENTINEL_WORKSPACE_RESOURCE_ID` (for bookmark creation)

## Step 1: Generate Hunting Query

Based on the scenario or MITRE technique, select and customize the appropriate KQL template.

### Query Template Library

**T1059.001 — PowerShell Execution (obfuscated):**

```kql
let lookback = {lookback};
SecurityEvent
| where TimeGenerated > ago(lookback)
| where EventID == 4688
| where CommandLine has_any ("-EncodedCommand", "-enc ", "-ec ", "IEX", "Invoke-Expression", "frombase64string", "-nop", "-noni", "bypass")
| extend DecodedAttempt = base64_decode_tostring(extract(@"(?i)-[Ee](?:nc(?:odedCommand)?|c)\s+([A-Za-z0-9+/=]{20,})", 1, CommandLine))
| project TimeGenerated, Computer, Account, CommandLine, DecodedAttempt, SubjectDomainName
| order by TimeGenerated desc
```

**T1003 — Credential Dumping (LSASS):**

```kql
let lookback = {lookback};
DeviceProcessEvents
| where Timestamp > ago(lookback)
| where (FileName =~ "procdump.exe" and ProcessCommandLine has "lsass")
    or (FileName =~ "taskmanager.exe" and InitiatingProcessCommandLine has "lsass")
    or (InitiatingProcessFileName =~ "mimikatz.exe")
    or ProcessCommandLine has_any ("sekurlsa::logonpasswords", "lsadump::sam", "lsadump::dcsync")
| project Timestamp, DeviceName, AccountName, FileName, ProcessCommandLine, InitiatingProcessFileName
| order by Timestamp desc
```

**T1021.001 — Lateral Movement via RDP:**

```kql
let lookback = {lookback};
DeviceLogonEvents
| where Timestamp > ago(lookback)
| where LogonType == "RemoteInteractive"
| where not(AccountDomain == DeviceName)
| summarize RDPConnections = count(), SourceDevices = make_set(RemoteDeviceName), SourceIPs = make_set(RemoteIP) by AccountName, AccountDomain, DeviceName
| where RDPConnections > 3
| order by RDPConnections desc
```

**T1486 — Ransomware Precursor (mass file rename/delete):**

```kql
let lookback = {lookback};
DeviceFileEvents
| where Timestamp > ago(lookback)
| where ActionType in ("FileCreated", "FileRenamed", "FileDeleted")
| where FileName has_any (".encrypted", ".locked", ".crypted", ".ransom", ".cry", ".enc", "_readme.txt", "HOW_TO_RECOVER", "DECRYPT")
| summarize FileEventCount = count(), AffectedPaths = make_set(FolderPath, 5) by DeviceName, AccountName, FileName
| where FileEventCount > 50
| order by FileEventCount desc
```

**T1566 — Phishing (malicious attachment delivery):**

```kql
let lookback = {lookback};
EmailAttachmentInfo
| where Timestamp > ago(lookback)
| where ThreatTypes has_any ("Malware", "Phish")
| join kind=inner EmailEvents on NetworkMessageId
| project Timestamp, SenderFromAddress, RecipientEmailAddress, Subject, FileName, FileType, ThreatTypes, DeliveryAction
| where DeliveryAction != "Blocked"
| order by Timestamp desc
```

**T1078 — Valid Accounts (off-hours privileged access):**

```kql
let lookback = {lookback};
let businessHoursStart = 8;
let businessHoursEnd = 18;
let privilegedRoles = dynamic(["Global Administrator", "Privileged Role Administrator", "Security Administrator", "Exchange Administrator"]);
AuditLogs
| where TimeGenerated > ago(lookback)
| where OperationName == "Add member to role"
| where TargetResources[0].displayName in (privilegedRoles)
| extend HourOfDay = hourofday(TimeGenerated)
| where HourOfDay < businessHoursStart or HourOfDay >= businessHoursEnd
| extend Actor = tostring(InitiatedBy.user.userPrincipalName)
| extend Target = tostring(TargetResources[1].userPrincipalName)
| project TimeGenerated, Actor, Target, OperationName, TargetResources[0].displayName, HourOfDay
```

**Impossible Travel:**

```kql
let lookback = {lookback};
let speed_kmh = 900;
SigninLogs
| where TimeGenerated > ago(lookback)
| where ResultType == 0
| project TimeGenerated, UserPrincipalName, IPAddress, Location, Lat = todouble(LocationDetails.geoCoordinates.latitude), Lon = todouble(LocationDetails.geoCoordinates.longitude)
| sort by UserPrincipalName, TimeGenerated
| serialize
| extend PrevTime = prev(TimeGenerated), PrevLat = prev(Lat), PrevLon = prev(Lon), PrevUser = prev(UserPrincipalName)
| where UserPrincipalName == PrevUser and isnotnull(PrevLat)
| extend Hours = datetime_diff('second', TimeGenerated, PrevTime) / 3600.0
| extend DistanceKm = geo_distance_2points(PrevLon, PrevLat, Lon, Lat) / 1000.0
| extend SpeedKmh = iff(Hours > 0, DistanceKm / Hours, real(0))
| where SpeedKmh > speed_kmh
| project TimeGenerated, UserPrincipalName, IPAddress, Location, DistanceKm, SpeedKmh
```

## Step 2: Execute Query

```bash
az monitor log-analytics query \
  --workspace ${SENTINEL_WORKSPACE_ID} \
  --analytics-query "{kql_query}" \
  --timespan "P{lookback}" \
  --output json
```

Handle empty results gracefully: "No results matching this hunting query in the specified timeframe. This may indicate clean environment or that telemetry is not connected."

## Step 3: Analyze Results

For each result row:
- Flag rows with high-value targets (privileged accounts, critical servers)
- Cross-reference IPs against known threat intel (ThreatIntelligenceIndicator table)
- Note first-seen vs repeated patterns

## Step 4: Save Bookmarks (if --save-bookmark)

For each significant result row, create a Sentinel bookmark:

```bash
az rest --method PUT \
  --uri "https://management.azure.com${SENTINEL_WORKSPACE_RESOURCE_ID}/providers/Microsoft.SecurityInsights/bookmarks/{bookmarkId}?api-version=2023-02-01" \
  --body '{
    "properties": {
      "displayName": "Hunt: {scenario} — {entity}",
      "query": "{escaped_kql_query}",
      "queryResult": "{row_as_json}",
      "eventTime": "{row_timestamp}",
      "notes": "Automated hunting query result. Technique: {technique}. Requires analyst review.",
      "labels": ["{technique}", "Hunting", "{scenario}"]
    }
  }'
```

## Output Format

```markdown
# Threat Hunting Report
**Scenario:** {scenario} | **Technique:** {technique}
**Lookback:** {lookback} | **Executed:** {timestamp}
**Results:** {N} rows returned

## Query Used
```kql
{query}
```

## Findings

| Timestamp | Entity | Activity | Severity Signal |
|---|---|---|---|
| 2026-03-01T03:14:00Z | user@contoso.com | Encoded PS from suspicious IP | HIGH |
| 2026-03-01T03:15:00Z | WIN-FINANCE01 | LSASS memory read | HIGH |

## Analysis

{threat_analysis_narrative}

## Recommended Next Steps

1. Escalate to SOC Tier 2 for accounts: {list}
2. Isolate devices: {list}
3. Review related incidents in Sentinel for correlation
4. Create detection rule to alert on this pattern going forward

## Bookmarks Saved: {N}
```
