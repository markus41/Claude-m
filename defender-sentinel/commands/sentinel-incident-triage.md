---
name: sentinel-incident-triage
description: Triage open Microsoft Sentinel incidents — list by severity, enrich with entity context, suggest triage actions, and update incident status or assignment
argument-hint: "[--severity <High|Medium|Low>] [--status <New|Active>] [--incident-id <id>] [--assign-to <email>]"
allowed-tools:
  - Bash
  - Read
  - Write
---

# Sentinel Incident Triage

Retrieves open Microsoft Sentinel incidents filtered by severity and status, enriches each with entity context (accounts, hosts, IPs), and provides structured triage recommendations. Optionally updates incident status, assignment, and adds analyst comments.

## Arguments

- `--severity`: Filter by severity (`High`, `Medium`, `Low`, `Informational`). Default: `High`
- `--status`: Filter by status (`New`, `Active`). Default: `New`
- `--incident-id`: Triage a single specific incident by ID (skips list step)
- `--assign-to`: Email address of the analyst to assign matched incidents to

## Integration Context Check

Load and validate:
- `tenantId`
- `subscriptionId`
- `SENTINEL_WORKSPACE_RESOURCE_ID` (ARM path to workspace)
- `SENTINEL_WORKSPACE_ID` (workspace GUID for Log Analytics queries)

Fail fast if missing. Redact identifiers in output.

## Step 1: List Incidents

Retrieve incidents matching the severity and status filters. Default: New, High severity.

```bash
az rest --method GET \
  --uri "https://management.azure.com${SENTINEL_WORKSPACE_RESOURCE_ID}/providers/Microsoft.SecurityInsights/incidents?api-version=2023-02-01&\$filter=properties/severity eq '{severity}' and properties/status eq '{status}'&\$orderby=properties/createdTimeUtc desc&\$top=20" \
  --query "value[].{
    Number: properties.incidentNumber,
    Title: properties.title,
    Severity: properties.severity,
    Status: properties.status,
    Created: properties.createdTimeUtc,
    AssignedTo: properties.assignee.email,
    AlertCount: properties.additionalData.alertsCount
  }" -o table
```

If `--incident-id` is provided, skip to Step 2 with that single incident.

If no incidents are returned, report: "No `{severity}` severity `{status}` incidents found. Consider broadening the filter."

## Step 2: Enrich Each Incident with Entities

For each incident (or the single specified incident), retrieve enriched entities:

```bash
az rest --method POST \
  --uri "https://management.azure.com${SENTINEL_WORKSPACE_RESOURCE_ID}/providers/Microsoft.SecurityInsights/incidents/{incidentId}/entities?api-version=2023-02-01" \
  --query "entities[].{Kind: kind, Name: properties.friendlyName}" -o table
```

Extract and group entities by type:
- **Accounts**: `userPrincipalName`, domain, display name
- **Hosts**: hostname, OS, Azure VM (if applicable)
- **IPs**: address, geolocation
- **URLs / Domains**: for phishing or C2 indicators
- **Files**: filename, SHA256

## Step 3: Run Entity-Based KQL Enrichment

For extracted accounts and IPs, run targeted KQL queries to add context.

**Account: recent failed sign-ins:**

```bash
az monitor log-analytics query --workspace ${SENTINEL_WORKSPACE_ID} \
  --analytics-query "SigninLogs | where TimeGenerated > ago(24h) | where UserPrincipalName == '{upn}' | summarize FailedCount = countif(ResultType != 0), SuccessCount = countif(ResultType == 0), Countries = make_set(Location), IPs = make_set(IPAddress) | limit 1" \
  --output json
```

**Host: recent process events (if MDE connected):**

```bash
az monitor log-analytics query --workspace ${SENTINEL_WORKSPACE_ID} \
  --analytics-query "DeviceProcessEvents | where TimeGenerated > ago(1h) | where DeviceName has '{hostname}' | where InitiatingProcessFileName !in ('svchost.exe', 'explorer.exe', 'taskhostw.exe') | project TimeGenerated, FileName, ProcessCommandLine | limit 20" \
  --output json
```

**IP: threat intelligence lookup:**

```bash
az monitor log-analytics query --workspace ${SENTINEL_WORKSPACE_ID} \
  --analytics-query "ThreatIntelligenceIndicator | where NetworkIP == '{ip}' or EmailSourceIpAddress == '{ip}' | project TimeGenerated, ThreatType, ConfidenceScore, Description | limit 5" \
  --output json
```

## Step 4: Generate Triage Recommendations

Based on entities and alert category, produce structured recommendations:

**Triage recommendation matrix:**

| Scenario | Indicators | Recommended action |
|---|---|---|
| Compromised account | High sign-in risk + anomalous IP | Disable account, revoke sessions, force MFA re-enrollment |
| Malware on endpoint | Process anomaly + suspicious file | Isolate device, run AV scan, collect investigation package |
| Phishing delivery | Email events + malicious URL | Block URL in MDO, investigate recipients, reset affected users |
| Lateral movement | Multiple hosts + remote service calls | Isolate origin device, check privileged account usage |
| Credential dumping | LSASS access + privileged account | Immediately isolate, check for privilege escalation |
| C2 communication | Unusual outbound to suspicious IP | Block IP via indicator, isolate device, check persistence |

## Step 5: Update Incident (if --assign-to or action taken)

Set incident to Active and optionally assign:

```bash
az rest --method PATCH \
  --uri "https://management.azure.com${SENTINEL_WORKSPACE_RESOURCE_ID}/providers/Microsoft.SecurityInsights/incidents/{incidentId}?api-version=2023-02-01" \
  --body '{
    "properties": {
      "status": "Active",
      "assignee": {
        "email": "{assignTo}",
        "name": "{analystName}"
      }
    }
  }'
```

## Step 6: Add Triage Comment

Document findings as a comment on the incident:

```bash
az rest --method PUT \
  --uri "https://management.azure.com${SENTINEL_WORKSPACE_RESOURCE_ID}/providers/Microsoft.SecurityInsights/incidents/{incidentId}/comments/{commentId}?api-version=2023-02-01" \
  --body '{
    "properties": {
      "message": "**Automated Triage — {timestamp}**\n\n**Entities:** {entitySummary}\n\n**Context:** {contextSummary}\n\n**Recommended actions:** {recommendations}"
    }
  }'
```

## Output Format

```markdown
# Sentinel Incident Triage Report
**Timestamp:** {timestamp} | **Filter:** {severity} / {status}

## Incidents Found: {N}

### INC-{number}: {title}
- **Severity:** {severity} | **Status:** {status}
- **Created:** {created} | **Alerts:** {alertCount}
- **Assigned to:** {assignee}

#### Entities
| Type | Name | Additional Context |
|---|---|---|
| Account | user@contoso.com | 12 failed logins last 24h, 3 countries |
| Host | WIN-ABC12345 | Suspicious process: powershell.exe -enc |
| IP | 185.220.101.x | Known Tor exit node (TI match) |

#### Triage Recommendation
**Priority:** Immediate response required

**Actions:**
1. Disable account user@contoso.com
2. Isolate device WIN-ABC12345
3. Block IP 185.220.101.x via Defender indicator

**Rationale:** Account accessed from known Tor exit node with 12 prior failures. Subsequent successful login followed by PowerShell execution with encoded command. Consistent with credential stuffing → initial access → execution pattern.
```
