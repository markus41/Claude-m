---
name: defender-alert-investigate
description: Investigate a Microsoft Defender XDR alert — pivot on device, user, process tree, and network connections; correlate with advanced hunting; suggest response actions
argument-hint: "<alert-id> [--take-action] [--isolate-device] [--disable-user]"
allowed-tools:
  - Bash
  - Read
  - Write
---

# Defender XDR Alert Investigation

Fetches a Defender XDR alert with all evidence, pivots on device timeline, user activity, and process tree. Executes advanced hunting to find related activity, and suggests or performs response actions.

## Arguments

- `<alert-id>`: Defender XDR alert ID (from Graph Security API or Defender portal)
- `--take-action`: Prompt analyst and execute approved response actions
- `--isolate-device`: Immediately isolate the affected device (requires `--take-action`)
- `--disable-user`: Immediately disable the affected Entra ID user (requires `--take-action`)

## Integration Context Check

Require:
- `tenantId`
- Graph Security API access: `SecurityAlert.Read.All`, `ThreatHunting.Read.All`
- For actions: `Machine.Isolate` (MDE API), `User.ReadWrite.All` (Graph)

## Step 1: Fetch Alert with Evidence

```bash
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/security/alerts_v2/{alertId}?\$expand=evidence" \
  --query "{
    Id: id,
    Title: title,
    Severity: severity,
    Status: status,
    Category: category,
    ServiceSource: serviceSource,
    DetectionSource: detectionSource,
    Created: createdDateTime,
    FirstActivity: firstActivityDateTime,
    LastActivity: lastActivityDateTime,
    MITRE: mitreTechniques,
    IncidentId: incidentId
  }"
```

## Step 2: Parse and Categorize Evidence

Process the `evidence` array and group by type:

**Device evidence** (`deviceEvidence`):
- Extract: `deviceDnsName`, `osPlatform`, `riskScore`, `onboardingStatus`, `healthStatus`
- Note the `mdeDeviceId` for MDE API calls

**User evidence** (`userEvidence`):
- Extract: `userAccount.userPrincipalName`, `userAccount.azureAdUserId`, risk signals

**Process evidence** (`processEvidence`):
- Extract: `processCommandLine`, `fileName`, `processId`, parent process
- Flag encoded commands, living-off-the-land binaries (LOLBins)

**File evidence** (`fileEvidence`):
- Extract: `fileName`, `filePath`, `sha256`
- Check if SHA256 matches known malware families

**IP evidence** (`ipEvidence`):
- Extract: `ipAddress`, `countryLetterCode`
- Note Tor exit nodes, cloud hosting IPs, threat-intel matches

**Network evidence** (`urlEvidence`):
- Extract: URL, domain
- Note newly registered domains, DGA patterns

## Step 3: Device Timeline Investigation (if device evidence found)

Retrieve process and network activity around the alert timeframe:

```bash
# Fetch device timeline via MDE API
az rest --method GET \
  --uri "https://api.securitycenter.microsoft.com/api/machines/{mdeDeviceId}/alerts" \
  --query "[].{AlertId: id, Title: title, Severity: severity, Created: createdTime, Status: status}"

# Advanced hunting: process tree around alert time
az rest --method POST \
  --uri "https://graph.microsoft.com/v1.0/security/runHuntingQuery" \
  --body "{\"query\": \"DeviceProcessEvents | where Timestamp between(datetime('{alertTime}') - 1h .. datetime('{alertTime}') + 1h) | where DeviceName == '{deviceName}' | project Timestamp, FileName, ProcessCommandLine, ProcessId, InitiatingProcessFileName, InitiatingProcessId | order by Timestamp asc\"}"
```

**Advanced hunting: network connections around alert time:**

```bash
az rest --method POST \
  --uri "https://graph.microsoft.com/v1.0/security/runHuntingQuery" \
  --body "{\"query\": \"DeviceNetworkEvents | where Timestamp between(datetime('{alertTime}') - 30m .. datetime('{alertTime}') + 30m) | where DeviceName == '{deviceName}' | where ActionType in ('ConnectionSuccess', 'ConnectionFailed') | project Timestamp, RemoteIP, RemotePort, RemoteUrl, LocalIP, InitiatingProcessFileName | order by Timestamp asc\"}"
```

## Step 4: User Activity Investigation (if user evidence found)

**Recent Entra sign-ins:**

```bash
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/auditLogs/signIns?\$filter=userPrincipalName eq '{upn}' and createdDateTime ge {alertTime_minus_24h}&\$top=20&\$select=createdDateTime,ipAddress,location,resultType,appDisplayName,conditionalAccessStatus" \
  --output json
```

**Identity risk level:**

```bash
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/identityProtection/riskyUsers/{userId}" \
  --query "{RiskLevel: riskLevel, RiskState: riskState, RiskLastUpdated: riskLastUpdatedDateTime}"
```

**Recent privileged role activity:**

```bash
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/auditLogs/directoryAudits?\$filter=initiatedBy/user/id eq '{userId}' and activityDisplayName eq 'Add member to role' and activityDateTime ge {alertTime_minus_7d}" \
  --output json
```

## Step 5: Threat Context Enrichment

**Check file SHA256 against TI:**

```bash
az rest --method POST \
  --uri "https://graph.microsoft.com/v1.0/security/runHuntingQuery" \
  --body "{\"query\": \"AlertEvidence | where Timestamp > ago(30d) | where SHA256 == '{sha256}' | summarize AlertCount = count(), AlertTypes = make_set(Title) by SHA256, FileName\"}"
```

**Check IP against TI:**

```bash
az rest --method POST \
  --uri "https://graph.microsoft.com/v1.0/security/runHuntingQuery" \
  --body "{\"query\": \"DeviceNetworkEvents | where Timestamp > ago(7d) | where RemoteIP == '{ip}' | summarize DeviceCount = dcount(DeviceName), ConnectionCount = count() by RemoteIP | order by ConnectionCount desc\"}"
```

## Step 6: Response Actions (if --take-action)

Present findings to analyst and offer actions:

### Device Isolation

```bash
az rest --method POST \
  --uri "https://api.securitycenter.microsoft.com/api/machines/{mdeDeviceId}/isolate" \
  --body '{"Comment": "Isolating due to active threat — Alert: {alertId}", "IsolationType": "Full"}'
```

Confirm isolation status:

```bash
az rest --method GET \
  --uri "https://api.securitycenter.microsoft.com/api/machines/{mdeDeviceId}" \
  --query "{IsolationStatus: isAadJoined, HealthStatus: healthStatus}"
```

### Disable Entra User

```bash
az rest --method PATCH \
  --uri "https://graph.microsoft.com/v1.0/users/{userId}" \
  --body '{"accountEnabled": false}'

# Revoke active sessions
az rest --method POST \
  --uri "https://graph.microsoft.com/v1.0/users/{userId}/revokeSignInSessions"
```

### Block File Hash (Defender Indicator)

```bash
az rest --method POST \
  --uri "https://api.securitycenter.microsoft.com/api/indicators" \
  --body "{
    \"indicatorValue\": \"{sha256}\",
    \"indicatorType\": \"FileSha256\",
    \"action\": \"Block\",
    \"title\": \"Malicious file — Alert {alertId}\",
    \"description\": \"File observed in active incident investigation\",
    \"severity\": \"High\",
    \"expirationTime\": \"{expiryDate}\"
  }"
```

## Output Format

```markdown
# Defender XDR Alert Investigation
**Alert:** {alertId} | **Severity:** {severity} | **Timestamp:** {timestamp}

## Alert Summary
- **Title:** {title}
- **Category:** {category}
- **Service:** {serviceSource}
- **MITRE Techniques:** {mitreTechniques}
- **Incident:** {incidentId}

## Evidence Summary

### Devices (1)
| Device | OS | Risk | Health | Onboarding |
|---|---|---|---|---|
| WIN-FINANCE01 | Windows10 | High | Active | Onboarded |

### Users (1)
| User | Risk Level | Risk State |
|---|---|---|
| jsmith@contoso.com | High | AtRisk |

### Process Activity (top 5)
| Time | Process | Command Line | Parent |
|---|---|---|---|
| 03:14:22 | powershell.exe | -enc JAB... | cmd.exe |
| 03:14:45 | net.exe | user /domain | powershell.exe |

### Network Connections
| Time | Remote IP | Port | Process |
|---|---|---|---|
| 03:15:01 | 185.220.101.x | 443 | powershell.exe |

## Context
- IP 185.220.101.x: Known Tor exit node — 47 tenant connections in last 7 days
- User jsmith@contoso.com: 3 failed logins from unknown location 30 min before alert
- No prior alerts for this device in 30 days

## Investigation Verdict
**CONFIRMED MALICIOUS** — Credential access via encoded PowerShell, followed by C2 connection from known Tor exit node.

## Response Actions Taken
- [x] Device WIN-FINANCE01 isolated
- [x] User jsmith@contoso.com disabled, sessions revoked
- [ ] File hash blocked (pending SHA256 confirmation)

## Recommended Next Steps
1. Review other devices that connected to 185.220.101.x
2. Check for lateral movement from WIN-FINANCE01 before isolation
3. Reset jsmith credentials after investigation
4. Add Tor exit node range to Named Location (conditional access block)
```
