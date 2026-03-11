---
name: inv-risk
description: Risk assessment and compromise indicator analysis — risk detections, impossible travel, mailbox rule changes, automated compromise score
argument-hint: "<upn> [--confirm-compromised] [--dismiss-risk] [--remediate] [--include-history]"
allowed-tools:
  - Bash
  - Read
  - Write
---

# Graph Investigator — Risk Assessment

Aggregates all available risk signals for a user into a composite compromise score. Queries Entra Identity Protection for current risk state and detection history, checks for BEC indicators (inbox forwarding rules), analyzes recent sign-in anomalies, and produces a risk verdict with recommended response actions.

## Arguments

| Argument | Description |
|---|---|
| `<upn>` | **Required.** User Principal Name to investigate |
| `--confirm-compromised` | **Destructive action**: Confirm the user as compromised in Identity Protection and revoke all active sessions. Requires confirmation prompt before executing. |
| `--dismiss-risk` | Dismiss the current risk state in Identity Protection (use when investigation confirms false positive) |
| `--remediate` | Guide through a full remediation workflow: confirm compromised + revoke sessions + disable account + reset password |
| `--include-history` | Include full risk detection history (last 90 days) |

## Integration Context Check

Required scopes:
- `IdentityRiskyUser.Read.All` — current risk state (requires Azure AD P2 or M365 E5)
- `IdentityRiskEvent.Read.All` — risk detections (requires Azure AD P2 or M365 E5)
- `AuditLog.Read.All` — sign-in logs for anomaly analysis
- `User.Read.All` — resolve UPN and fetch profile

Optional scopes for remediation actions:
- `IdentityRiskyUser.ReadWrite.All` — confirm compromised or dismiss risk
- `User.ReadWrite.All` — disable account or require password reset

**P2 License Required**: If the tenant does not have Azure AD P2 or M365 E5, Steps 1–4 will return `403 Forbidden`. In this case, fall back to sign-in anomaly analysis only (Steps 5–6) and note the limitation.

## Step 1: Current Risk State

```bash
UPN="<upn>"

az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/identityProtection/riskyUsers?\$filter=userPrincipalName eq '${UPN}'&\$select=id,userPrincipalName,riskLevel,riskState,riskDetail,riskLastUpdatedDateTime,isDeleted,isProcessing,history" \
  --output json
```

`riskState` values:
- `atRisk` — currently at risk, not confirmed or dismissed
- `confirmedCompromised` — admin has confirmed the account is compromised
- `remediated` — risk was remediated (password reset, MFA re-enrollment)
- `dismissed` — admin dismissed the risk
- `none` — no risk detected

`riskLevel` values: `none`, `low`, `medium`, `high`

`riskDetail` provides additional context, e.g.: `userPassedMFADrivenByRiskBasedPolicy`, `adminConfirmedUserCompromised`, `userPerformedSecuredPasswordChange`.

## Step 2: Active Risk Detections

```bash
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/identityProtection/riskDetections?\$filter=userPrincipalName eq '${UPN}' and riskState eq 'atRisk'&\$select=id,riskEventType,riskLevel,riskState,detectionTimingType,activity,activityDateTime,ipAddress,location,detectedDateTime,lastUpdatedDateTime,source,additionalInfo,tokenIssuerType,correlatedEventTypes&\$orderby=detectedDateTime desc&\$top=100" \
  --output json
```

Common `riskEventType` values and their meanings:

| Risk Event Type | Description | Severity |
|---|---|---|
| `unfamiliarFeatures` | Sign-in properties differ from user's baseline | Medium |
| `anonymizedIPAddress` | Sign-in from Tor or anonymizing proxy | High |
| `maliciousIPAddress` | Sign-in from a known malicious IP | High |
| `impossibleTravel` | Geographic travel physically impossible | High |
| `leakedCredentials` | Credentials found in dark web breach | High |
| `passwordSpray` | Account targeted in password spray attack | High |
| `adminConfirmedUserCompromised` | Admin-confirmed compromise signal | Critical |
| `investigationsThreatIntelligence` | Microsoft threat intelligence signal | High |
| `riskyIPAddress` | IP associated with many failed logins | Medium |
| `newCountry` | Sign-in from a country never seen for this user | Medium |
| `suspiciousInboxForwarding` | Inbox rule forwards to external address | High |

## Step 3: Risk Detection History (--include-history)

```bash
RISKY_USER_ID="<identity-protection-user-id>"

az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/identityProtection/riskyUsers/${RISKY_USER_ID}/history?\$select=id,initiatedBy,userDisplayName,riskLevel,riskState,riskDetail,activity,activityDateTime&\$orderby=activityDateTime desc" \
  --output json
```

This shows the full state transition history: when risk was raised, when it was dismissed or remediated, and which admin took action.

## Step 4: Mailbox Rule Forensics

Inbox forwarding rules are a primary Business Email Compromise (BEC) persistence mechanism. Check for rules that forward email externally:

```bash
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/${UPN}/mailFolders/inbox/messageRules?\$select=id,displayName,isEnabled,isReadOnly,actions,conditions,exceptions" \
  --output json
```

For each rule, inspect `actions`:
- `forwardTo` — list of email addresses to forward to
- `forwardAsAttachmentTo` — forward as attachment to external address
- `redirectTo` — redirect (original not delivered to user's inbox)
- `moveToFolder` — moves to a folder (could hide from user)
- `delete` — permanently deletes matching messages (evidence destruction)
- `permanentDelete` — cannot be recovered from trash

Flag any rule where:
- `forwardTo` or `redirectTo` contains an address outside the organization's verified domains
- `delete` or `permanentDelete` is `true` (auto-deleting inbound emails)
- `moveToFolder` targets a folder name like "Archive", "RSS", or an unusual custom folder
- `conditions` is minimal (few conditions = broad scope)

Also check via PowerShell for more detailed rule inspection:

```powershell
# Requires Exchange Online PowerShell
Get-InboxRule -Mailbox "<upn>" | Select-Object Name,Enabled,ForwardTo,ForwardAsAttachmentTo,RedirectTo,DeleteMessage,MoveToFolder,StopProcessingRules | Format-List
```

## Step 5: Sign-In Anomaly Analysis (Last 7 Days)

Perform a focused anomaly check regardless of P2 availability:

```bash
WEEK_AGO=$(date -d "7 days ago" --utc +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || python3 -c "from datetime import datetime,timedelta; print((datetime.utcnow()-timedelta(days=7)).strftime('%Y-%m-%dT%H:%M:%SZ'))")

az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/auditLogs/signIns?\$filter=userPrincipalName eq '${UPN}' and createdDateTime ge ${WEEK_AGO}&\$select=createdDateTime,ipAddress,location,status,riskLevelAggregated,riskEventTypes,clientAppUsed,authenticationDetails,deviceDetail,authenticationRequirement&\$top=500&\$orderby=createdDateTime asc" \
  --output json
```

Check for:
- Impossible travel (speed > 900 km/h between consecutive sign-ins)
- New country (country not seen before this investigation window)
- Failed MFA attempts (`authenticationDetails[].authenticationStepResultDetail` contains "MFA failed")
- Legacy authentication (`clientAppUsed` = SMTP, IMAP, EWS, MAPI, EAS)
- Sign-ins from unmanaged devices (`deviceDetail.isManaged = false`)

## Step 6: Compromise Scoring Algorithm

Calculate a composite risk score based on all signals gathered:

| Signal | Points |
|---|---|
| Identity Protection riskLevel = low | +20 |
| Identity Protection riskLevel = medium | +50 |
| Identity Protection riskLevel = high | +100 |
| Each active risk detection | +10 per detection |
| riskState = confirmedCompromised | +100 (immediate Critical) |
| Impossible travel detected (last 7 days) | +40 |
| External inbox forwarding rule present | +50 |
| Auto-delete inbox rule present | +40 |
| Failed MFA in last 7 days | +20 |
| New country sign-in (last 7 days) | +15 |
| Legacy authentication sign-in (last 7 days) | +25 |
| Non-compliant device used (last 7 days) | +20 |
| Mass file download (>20 files in 1h, last 7 days) | +30 |
| First-time high-privilege role assignment (last 30 days) | +35 |
| New MFA method registered (last 7 days) | +30 |

**Score interpretation**:

| Score | Verdict | Recommended Action |
|---|---|---|
| 0–30 | 🟢 LOW RISK | Continue monitoring; no immediate action |
| 31–60 | 🟡 MEDIUM RISK | Review with security team; consider MFA re-enrollment |
| 61–100 | 🔴 HIGH RISK | Escalate; consider session revocation and forced password reset |
| 100+ | 🚨 CRITICAL — LIKELY COMPROMISED | Immediate response: confirm compromised + revoke sessions + disable account |

## Step 7: Response Actions

### Confirm Compromised (--confirm-compromised)

**Before executing**: Display a confirmation prompt and require explicit user approval.

```bash
# Step 1: Confirm compromised in Identity Protection
az rest --method POST \
  --uri "https://graph.microsoft.com/v1.0/identityProtection/riskyUsers/confirmCompromised" \
  --body "{\"userIds\": [\"${RISKY_USER_ID}\"]}" \
  --headers "Content-Type=application/json"

# Step 2: Revoke all active sign-in sessions and refresh tokens
az rest --method POST \
  --uri "https://graph.microsoft.com/v1.0/users/${USER_ID}/revokeSignInSessions"
```

### Dismiss Risk (--dismiss-risk)

Use when investigation confirms a false positive:

```bash
az rest --method POST \
  --uri "https://graph.microsoft.com/v1.0/identityProtection/riskyUsers/dismiss" \
  --body "{\"userIds\": [\"${RISKY_USER_ID}\"]}" \
  --headers "Content-Type=application/json"
```

### Full Remediation (--remediate)

Guide through the complete remediation workflow with confirmation at each step:

1. Confirm compromised (Step 7 above)
2. Revoke sign-in sessions (Step 7 above)
3. Disable account temporarily:
```bash
az rest --method PATCH \
  --uri "https://graph.microsoft.com/v1.0/users/${USER_ID}" \
  --body "{\"accountEnabled\": false}" \
  --headers "Content-Type=application/json"
```
4. Remove suspicious inbox rules (manually review each before deletion)
5. Force password reset at next sign-in:
```bash
az rest --method PATCH \
  --uri "https://graph.microsoft.com/v1.0/users/${USER_ID}" \
  --body "{\"passwordProfile\": {\"forceChangePasswordNextSignIn\": true}}" \
  --headers "Content-Type=application/json"
```
6. Re-enable account after password reset
7. Review and remove any unauthorized OAuth app consents (see `inv-apps`)

## Output Format

```markdown
## Risk Assessment — jsmith@contoso.com

### Compromise Score: 155 — 🚨 CRITICAL: LIKELY COMPROMISED

| Signal | Points | Detail |
|---|---|---|
| Identity Protection riskLevel = high | +100 | riskState: atRisk |
| Active risk detections (3) | +30 | impossibleTravel, anonymizedIPAddress, leakedCredentials |
| Impossible travel (7 days) | +40 | NY→Berlin in 1h 43m |
| External inbox forwarding rule | +50 | Forward all email to attacker@gmail.com |
| **Total** | **220** | |

### Current Identity Protection State
| Field | Value |
|---|---|
| Risk Level | 🔴 High |
| Risk State | atRisk |
| Risk Last Updated | 2024-01-15 02:18 UTC |

### Active Risk Detections (3)
| Type | Level | Detected | IP | Location |
|---|---|---|---|---|
| impossibleTravel | High | 2024-01-15 02:14 | 5.6.7.8 | Berlin, DE |
| anonymizedIPAddress | High | 2024-01-15 02:14 | 5.6.7.8 | Tor exit node |
| leakedCredentials | High | 2024-01-14 23:45 | — | Dark web |

### Mailbox Rule Forensics
🔴 **CRITICAL BEC INDICATOR FOUND**:
- Rule name: "Archive" (misleading name)
- Status: Enabled
- Action: ForwardTo → attacker@gmail.com
- Condition: All messages (no conditions — all email forwarded)
- Created: 2024-01-15 02:31 UTC (immediately after suspicious sign-in)

### Recommended Immediate Actions
1. 🚨 Run `inv-risk jsmith@contoso.com --confirm-compromised` to confirm compromise and revoke sessions
2. 🚨 Delete inbox forwarding rule immediately (Rule ID: AAMkAGI...)
3. 🔴 Run `inv-apps jsmith@contoso.com` to check for unauthorized OAuth consents
4. 🔴 Run `inv-files jsmith@contoso.com --days 7` to assess what data was accessed
5. 🟡 Notify user's manager and CISO per incident response playbook
6. 🟡 Preserve evidence: export audit logs before revoking sessions
```
