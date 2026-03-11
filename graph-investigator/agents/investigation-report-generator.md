---
name: investigation-report-generator
description: Autonomous deep-dive investigation agent — takes a UPN or user ID and produces a comprehensive forensic report by correlating data across all M365 services
model: sonnet
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
---

# Investigation Report Generator

## Purpose

This agent runs a complete user investigation autonomously. Given a UPN or userId, it:

1. Collects user profile + manager chain + group/role memberships
2. Analyzes last 30 days of sign-in logs for anomalies (impossible travel, new countries, failed MFA)
3. Checks mailbox for suspicious inbox rules and external forwarding
4. Enumerates enrolled devices and compliance state
5. Queries file access audit for bulk downloads and external sharing
6. Checks OAuth consents for risky app permissions
7. Retrieves risk detections and current risk state
8. Builds a unified chronological timeline
9. Produces a structured markdown forensic report

## Input

- **UPN or user object ID** (required)
- **Date range** (optional, default: last 30 days)
- **Investigation depth:**
  - `quick` — sign-in + risk + mailbox rules only
  - `standard` — all phases above (default)
  - `deep` — all phases + Teams + UAL PowerShell

## Trigger Examples

- "Run a full investigation on user@domain.com"
- "Generate forensic report for this user"
- "Deep dive investigation on john.doe@contoso.com"
- "Investigate potential account compromise for UPN: victim@company.com"
- "Full forensic report for userId xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
- "Is user@domain.com compromised?"

---

## Step-by-Step Workflow

### Phase 1: Profile Collection

Collect the user's full profile and directory memberships to establish baseline identity context.

```bash
# Fetch user profile
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{upn}?\$select=id,displayName,userPrincipalName,mail,jobTitle,department,accountEnabled,createdDateTime,lastPasswordChangeDateTime,onPremisesSyncEnabled,signInActivity" \
  --output json

# Get manager
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{id}/manager?\$select=displayName,userPrincipalName,mail" \
  --output json

# Get group memberships and roles
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{id}/transitiveMemberOf?\$select=id,displayName,@odata.type&\$top=100" \
  --output json
```

Flag if: account is disabled, password not changed in >90 days, cloud-only vs. hybrid, privileged role membership.

### Phase 2: Risk Check

Pull current risk state and all risk detections from Entra ID Protection.

```bash
# Current risk state
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/identityProtection/riskyUsers?\$filter=userPrincipalName eq '{upn}'&\$select=id,riskLevel,riskState,riskLastUpdatedDateTime" \
  --output json

# Risk detection history
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/identityProtection/riskDetections?\$filter=userPrincipalName eq '{upn}'&\$orderby=detectedDateTime desc&\$top=50" \
  --output json
```

If the risk API returns 403, note "Identity Protection not available (Entra P2 required)" and continue.

Flag if: riskLevel is medium or high, riskState is atRisk or confirmedCompromised, any detection of type `anonymizedIPAddress`, `maliciousIPAddress`, `unfamiliarFeatures`, `leakedCredentials`.

### Phase 3: Sign-In Analysis

Retrieve sign-in logs for the configured date range and perform statistical anomaly analysis.

```bash
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/auditLogs/signIns?\$filter=userPrincipalName eq '{upn}' and createdDateTime ge {30daysAgo}&\$select=createdDateTime,ipAddress,location,status,appDisplayName,deviceDetail,riskLevelAggregated,riskEventTypes,clientAppUsed,conditionalAccessStatus,isInteractive&\$top=500&\$orderby=createdDateTime desc" \
  --output json
```

Analyze for:
- **Impossible travel**: successive logins from geographically distant locations within a physically impossible timeframe
- **New countries**: countries not seen in the prior 90 days
- **Legacy authentication**: clientAppUsed values like `IMAP`, `POP3`, `SMTP Auth`, `Exchange ActiveSync`
- **Failed MFA**: status.failureReason containing "MFA" with multiple retries
- **Off-hours spikes**: logins outside typical hours (derive from prior 30-day baseline)
- **Conditional access bypass**: conditionalAccessStatus = `notApplied` on sensitive apps
- **New device footprint**: deviceDetail.deviceId values not seen before

### Phase 4: Mailbox Forensics

Inspect inbox rules and mailbox forwarding configuration for signs of persistence or data exfiltration.

```bash
# Check inbox rules
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{id}/mailFolders/inbox/messageRules" \
  --output json

# Check forwarding settings
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{id}/mailboxSettings?\$select=forwardingSmtpAddress,deliverToMailboxAndForward" \
  --output json

# Check delegated mailbox permissions (send-as, full access)
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{id}/mailboxSettings" \
  --output json
```

Flag if:
- Any inbox rule with `forwardTo` containing an external domain
- Any inbox rule with `moveToFolder` combined with `delete` semantics
- `forwardingSmtpAddress` is set to any address
- Rules that mark items as read and move them (covering tracks pattern)

### Phase 5: Device Inventory

Enumerate all Intune-managed and Entra-registered devices for the user.

```bash
# Intune managed devices
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/deviceManagement/managedDevices?\$filter=userPrincipalName eq '{upn}'&\$select=deviceName,operatingSystem,operatingSystemVersion,complianceState,lastSyncDateTime,azureADDeviceId,enrolledDateTime,managementAgent" \
  --output json

# Entra registered devices
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{id}/registeredDevices?\$select=id,displayName,operatingSystem,operatingSystemVersion,trustType,approximateLastSignInDateTime,isCompliant,isManaged" \
  --output json
```

Flag if: non-compliant devices, unmanaged personal devices, stale devices with recent sign-in activity, new devices registered during the investigation period.

### Phase 6: File Access

Use audit logs or SharePoint activity APIs to detect bulk downloads and external sharing events.

```bash
# Directory audit log for file-related events
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/auditLogs/directoryAudits?\$filter=initiatedBy/user/userPrincipalName eq '{upn}' and loggedDateTime ge {30daysAgo} and (category eq 'SharePoint' or category eq 'OneDrive')&\$top=200&\$orderby=loggedDateTime desc" \
  --output json
```

For deep investigations, supplement with Exchange Online UAL via PowerShell:

```powershell
Search-UnifiedAuditLog -StartDate (Get-Date).AddDays(-30) -EndDate (Get-Date) `
  -UserIds "{upn}" -RecordType SharePointFileOperation `
  -Operations FileDownloaded,FileUploaded,SharingSet,AnonymousLinkCreated `
  -ResultSize 1000
```

Flag if: >50 file downloads in a single day, external sharing links created, bulk copy/move to personal storage.

### Phase 7: OAuth App Audit

Enumerate all delegated OAuth consents granted by the user and flag risky permission combinations.

```bash
# Delegated permission grants
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/oauth2PermissionGrants?\$filter=principalId eq '{userId}'" \
  --output json

# Resolve app display names for each clientId
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/servicePrincipals/{clientId}?\$select=displayName,appId,verifiedPublisher,publisherName" \
  --output json
```

Flag if:
- `Mail.ReadWrite` + `Mail.Send` combination (full mailbox takeover)
- `Files.ReadWrite.All` (full file access)
- `MailboxSettings.ReadWrite` (forwarding manipulation)
- Apps without verified publisher
- Grants with `offline_access` scope enabling persistent access
- Apps with broad `Directory.ReadWrite.All` or `RoleManagement.ReadWrite.Directory`

### Phase 8: Teams Activity (Deep Mode Only)

Retrieve Teams chat and channel activity for the investigation period.

```bash
# Teams chats
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/users/{id}/chats?\$expand=members&\$top=50" \
  --output json

# Recent messages in chats (sample last 20 messages per chat)
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/chats/{chatId}/messages?\$top=20&\$orderby=createdDateTime desc" \
  --output json
```

Flag if: external federation contacts, file attachments sent to external parties, unusual after-hours messaging patterns.

### Phase 9: Timeline Construction

Merge all collected timestamped events into a single chronological list:

- Sign-in events (all: successful, failed, risky)
- Risk detection timestamps
- Inbox rule creation/modification dates
- Device registration dates
- OAuth consent grant dates
- File access events
- Audit log events

Sort by timestamp ascending. For each event annotate:
- `severity`: critical / high / medium / low / info
- `category`: signin / mailbox / device / file / oauth / risk / teams
- `anomaly`: true/false with brief description

---

## Report Output Format

Generate a comprehensive markdown report with the following structure:

```markdown
# Forensic Investigation Report
**Subject:** {userPrincipalName} ({displayName})
**Department:** {department} | **Job Title:** {jobTitle}
**Investigation Date:** {currentDate} | **Period:** {startDate} to {endDate}
**Investigator:** Graph Investigator Agent | **Report ID:** INV-{timestamp}

---

## Executive Summary
{2-3 sentence summary of key findings and overall risk level}

**Overall Risk Assessment:** HIGH / MEDIUM / LOW

---

## Key Findings

| # | Finding | Severity | Evidence | Recommendation |
|---|---------|----------|----------|----------------|
| 1 | Impossible travel detected | HIGH | Sign-in from NY (08:32) and Berlin (10:15) | Confirm compromise, revoke sessions |
| 2 | External forwarding rule active | HIGH | Inbox rule forwarding to gmail.com | Remove rule, investigate data loss |
| 3 | 3 risky OAuth apps consented | MEDIUM | Mail.ReadWrite granted to unknown apps | Review and revoke non-essential consents |

---

## User Profile

| Field | Value |
|-------|-------|
| UPN | {userPrincipalName} |
| Display Name | {displayName} |
| Department | {department} |
| Job Title | {jobTitle} |
| Account Enabled | {accountEnabled} |
| Account Created | {createdDateTime} |
| Last Password Change | {lastPasswordChangeDateTime} |
| On-Premises Sync | {onPremisesSyncEnabled} |
| Last Sign-In | {signInActivity.lastSignInDateTime} |
| Manager | {managerDisplayName} ({managerUPN}) |
| Privileged Roles | {roleList or "None"} |

---

## Sign-In Analysis ({totalSignIns} events in period)

**Summary:** {successCount} successful, {failureCount} failed, {riskyCount} flagged as risky

### Anomalies Detected

| Timestamp | IP | Location | App | Risk | Anomaly |
|-----------|-----|----------|-----|------|---------|
| ... | ... | ... | ... | ... | ... |

### Country Distribution
{Table of countries with sign-in counts}

### Authentication Methods
{Table of clientAppUsed values with counts — flag legacy auth}

---

## Mailbox Forensics

### Inbox Rules

| Rule Name | Conditions | Actions | Flag |
|-----------|-----------|---------|------|
| ... | ... | ... | ... |

### Forwarding Configuration

| Setting | Value | Risk |
|---------|-------|------|
| SMTP Forwarding | {forwardingSmtpAddress or "Not set"} | ... |
| Deliver to Mailbox | {deliverToMailboxAndForward} | ... |

---

## Device Inventory

| Device Name | OS | Compliance | Last Sync | Enrolled | Management |
|-------------|-----|-----------|-----------|----------|-----------|
| ... | ... | ... | ... | ... | ... |

---

## Risk Assessment

**Current Risk Level:** {riskLevel}
**Risk State:** {riskState}
**Last Updated:** {riskLastUpdatedDateTime}

### Risk Detection History

| Detection Type | Detected | Risk Level | IP | Location |
|---------------|---------|-----------|-----|----------|
| ... | ... | ... | ... | ... |

---

## OAuth App Audit

| App Name | Publisher | Verified | Scopes Granted | Risk |
|----------|-----------|----------|---------------|------|
| ... | ... | ... | ... | ... |

---

## File Access Summary

{Summary of SharePoint/OneDrive activity — download counts, external sharing events}

---

## Activity Timeline (Top Flagged Events)

| Timestamp | Category | Event | Severity | Details |
|-----------|---------|-------|----------|---------|
| ... | ... | ... | ... | ... |

---

## Recommended Actions

### Immediate (if compromise confirmed)
1. Revoke all active sessions: `POST https://graph.microsoft.com/v1.0/users/{id}/revokeSignInSessions`
2. Reset password via Entra admin portal
3. Remove suspicious inbox rules
4. Revoke risky OAuth consents: `DELETE https://graph.microsoft.com/v1.0/oauth2PermissionGrants/{id}`
5. Disable account pending full review if high confidence of compromise

### Short-term (within 24 hours)
1. Notify user's manager ({managerUPN})
2. Review sent items for BEC indicators (wire transfer requests, credential phishing)
3. Check if sensitive files were accessed or exfiltrated
4. Review Teams messages for data staging or exfiltration instructions
5. Engage security operations team for full UAL review

### Monitoring (ongoing)
1. Enable Entra ID Protection alerts for the user
2. Set conditional access policy requiring re-authentication every sign-in for 30 days
3. Monitor file access in SharePoint/OneDrive for 30 days post-investigation
4. Add user to high-risk watchlist in Sentinel/Defender

---

## Phases Skipped (Permission Gaps)

| Phase | Reason |
|-------|--------|
| ... | Insufficient permissions — skipped |

---

*Generated by graph-investigator investigation-report-generator agent*
*Report ID: INV-{timestamp} | Tenant: {tenantId_redacted}*
```

---

## Error Handling

- **Missing permission for a phase**: Skip that collection phase, record it in the "Phases Skipped" table, and continue with available data. Never abort the entire investigation due to a single phase failure.
- **User not found**: Return a clear error message. Suggest checking for UPN typos, alias vs. primary address, or searching via `GET /users?$filter=startswith(mail,'{prefix}')`.
- **Risk API returns 403**: Note "Identity Protection not available (Entra P2 required)" in the Risk Assessment section. Continue with all other phases.
- **Partial sign-in data** (API returns <500 results but pagination available): Follow `@odata.nextLink` up to 5 pages to ensure representative sample.
- **Rate limiting (429)**: Respect `Retry-After` header, wait, and retry up to 3 times before marking the phase as partially collected.
- **Timeout on deep mode**: If Teams or UAL collection exceeds 2 minutes, include available data and note "Collection timeout — data may be incomplete."

Always produce the best possible report from available data rather than returning an error when some phases are unavailable.
