---
name: exchange-mailflow
description: >
  Deep expertise in Exchange Online mail flow diagnostics — message trace, transport rules,
  quarantine, connectors, DNS authentication (SPF/DKIM/DMARC), NDR codes, reporting APIs,
  and client-safe reporting via Exchange PowerShell and Graph API.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
triggers:
  - mail flow
  - email not received
  - message trace
  - transport rule
  - quarantine
  - spf
  - dkim
  - dmarc
  - email deliverability
  - connector
  - mail routing
  - email bounced
---

# Exchange Mail Flow & Deliverability

This skill provides comprehensive diagnostic knowledge for troubleshooting Exchange Online mail delivery issues, managing transport rules, validating email authentication records, and generating client-safe reports.

## Diagnostic Approach

When a user reports "email not received", follow this investigation order:

1. **Message trace** — Did Exchange see the message?
2. **Transport rules** — Was the message redirected or blocked by a rule?
3. **Quarantine** — Was the message quarantined by anti-spam or anti-malware?
4. **Connectors** — Is there a connector misconfiguration for the sender's domain?
5. **DNS authentication** — Are SPF/DKIM/DMARC records correct for the sending domain?
6. **Recipient issues** — Is the mailbox full, disabled, or forwarding elsewhere?

## API Endpoints

### Reporting API (Graph)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/reports/getEmailActivityUserDetail(period='D30')` | Per-user email activity |
| GET | `/reports/getEmailActivityCounts(period='D30')` | Aggregate email counts |
| GET | `/reports/getEmailAppUsageUserDetail(period='D30')` | Email client app usage |
| GET | `/reports/getMailboxUsageDetail(period='D30')` | Mailbox size and quota |

### Message Trace (Exchange PowerShell)

| Cmdlet | Purpose |
|--------|---------|
| `Get-MessageTrace` | Trace messages (last 10 days) |
| `Start-HistoricalSearch` | Extended trace (10-90 days) |
| `Get-MessageTraceDetail` | Detailed event log for a message |
| `Get-HistoricalSearch` | Check status of extended trace |

### Message Trace Results — Status Values

| Status | Meaning |
|--------|---------|
| `Delivered` | Message reached the recipient's mailbox |
| `Failed` | Delivery failed (check StatusDetail for reason) |
| `Pending` | Message is in transit |
| `Quarantined` | Message was quarantined |
| `FilteredAsSpam` | Message was filtered as spam |
| `Expanded` | Message went to a distribution group |
| `None` | No record found — Exchange never received the message |

## Transport Rules

### PowerShell Commands

```powershell
# List all transport rules
Get-TransportRule | Select-Object Name, State, Priority, Description | Format-Table

# Get specific rule details
Get-TransportRule -Identity "Rule Name" | Format-List

# Create transport rule
New-TransportRule -Name "Block External Auto-Forward" `
  -FromScope InOrganization `
  -MessageTypeMatches AutoForward `
  -SentToScope NotInOrganization `
  -RejectMessageReasonText "External auto-forwarding is blocked by policy"
```

### Transport Rule Condition Parameters

| Parameter | Description | Example Value |
|-----------|-------------|---------------|
| `-From` | Specific sender | `"user@contoso.com"` |
| `-FromScope` | Sender scope | `InOrganization`, `NotInOrganization` |
| `-SentTo` | Specific recipient | `"ceo@contoso.com"` |
| `-SentToScope` | Recipient scope | `InOrganization`, `NotInOrganization` |
| `-SubjectContainsWords` | Subject keywords | `"Confidential","Secret"` |
| `-SubjectOrBodyContainsWords` | Subject/body keywords | `"password","credentials"` |
| `-HasClassification` | Message classification | Classification GUID |
| `-MessageTypeMatches` | Message type | `AutoForward`, `Calendaring`, `OOF` |
| `-AttachmentExtensionMatchesWords` | File extensions | `"exe","bat","ps1"` |
| `-AttachmentSizeOver` | Attachment size limit | `"10 MB"` |
| `-SCLOver` | Spam confidence level | `5` |
| `-HeaderContainsMessageHeader` | Custom header name | `"X-Custom-Header"` |

### Transport Rule Action Parameters

| Parameter | Description | Example Value |
|-----------|-------------|---------------|
| `-RejectMessageReasonText` | Reject with NDR | `"Blocked by policy"` |
| `-RedirectMessageTo` | Redirect to address | `"compliance@contoso.com"` |
| `-BlindCopyTo` | BCC copy | `"audit@contoso.com"` |
| `-AddToRecipients` | Add recipient | `"manager@contoso.com"` |
| `-ApplyClassification` | Apply classification | Classification GUID |
| `-SetHeaderName` / `-SetHeaderValue` | Set custom header | `"X-Reviewed"` / `"True"` |
| `-ModifyMessageSubject` | Prepend/append subject | `"[EXTERNAL] "` |
| `-Quarantine` | Quarantine message | `$true` |
| `-DeleteMessage` | Silently delete | `$true` |

### Transport Rule Body Example

```powershell
New-TransportRule -Name "Encrypt External PII" `
  -FromScope InOrganization `
  -SentToScope NotInOrganization `
  -SubjectOrBodyContainsWords "SSN","Social Security","tax ID" `
  -ApplyRightsProtectionTemplate "Encrypt" `
  -SetHeaderName "X-DLP-Rule" `
  -SetHeaderValue "PII-External-Encrypt" `
  -Priority 0 `
  -Mode Enforce
```

### Message Trace API Request (Graph — Beta)

```json
POST https://graph.microsoft.com/beta/reports/getMailflowStatusSummary
{
  "StartDate": "2026-02-01T00:00:00Z",
  "EndDate": "2026-03-01T00:00:00Z",
  "SenderAddress": "sender@external.com",
  "RecipientAddress": "user@contoso.com",
  "Direction": "Inbound"
}
```

## Quarantine Management

```powershell
# List quarantined messages
Get-QuarantineMessage -SenderAddress "sender@external.com" -RecipientAddress "user@contoso.com" -StartDate (Get-Date).AddDays(-10) -EndDate (Get-Date)

# Release from quarantine
Release-QuarantineMessage -Identity <QuarantineMessageId> -ReleaseToAll

# Preview quarantined message
Preview-QuarantineMessage -Identity <QuarantineMessageId>

# Delete from quarantine
Delete-QuarantineMessage -Identity <QuarantineMessageId>
```

## Connectors

### PowerShell Commands

```powershell
# List inbound connectors
Get-InboundConnector | Select-Object Name, Enabled, SenderDomains, ConnectorType, RequireTls

# List outbound connectors
Get-OutboundConnector | Select-Object Name, Enabled, RecipientDomains, ConnectorType, UseMXRecord
```

### Connector Configuration Reference

| Setting | Inbound | Outbound | Description |
|---------|---------|----------|-------------|
| `ConnectorType` | `Partner` or `OnPremises` | `Partner` or `OnPremises` | Source/destination type |
| `SenderDomains` | Domain list | — | Domains this connector handles |
| `RecipientDomains` | — | Domain list | Destination domains |
| `RequireTls` | Boolean | — | Require TLS encryption |
| `TlsSenderCertificateName` | Certificate CN | — | Validate sender certificate |
| `UseMXRecord` | — | Boolean | Use MX record vs smart host |
| `SmartHosts` | — | Host list | Smart host addresses |

## DNS Authentication

### SPF (Sender Policy Framework)

```bash
nslookup -type=txt contoso.com
# Or: dig TXT contoso.com +short
```

**Valid SPF example:** `v=spf1 include:spf.protection.outlook.com -all`

#### SPF Mechanism Reference

| Mechanism | Description | Example |
|-----------|-------------|---------|
| `include:` | Authorize another domain's SPF | `include:spf.protection.outlook.com` |
| `ip4:` | Authorize specific IPv4 | `ip4:203.0.113.0/24` |
| `ip6:` | Authorize specific IPv6 | `ip6:2001:db8::/32` |
| `a` | Authorize domain's A record | `a:mail.contoso.com` |
| `mx` | Authorize domain's MX record | `mx` |
| `-all` | Hard fail (reject unauthorized) | Recommended for M365 |
| `~all` | Soft fail (mark but deliver) | Testing only |
| `?all` | Neutral (no policy) | Not recommended |

**Common SPF issues:**
- Missing `include:spf.protection.outlook.com` for M365 tenants
- Using `~all` (softfail) instead of `-all` (hardfail)
- Too many DNS lookups (max 10 `include`/`a`/`mx` mechanisms)
- Missing SPF record entirely
- Duplicate SPF records (only one allowed per domain)

### DKIM (DomainKeys Identified Mail)

```powershell
# Check DKIM status
Get-DkimSigningConfig | Select-Object Domain, Enabled, Status

# Enable DKIM
Set-DkimSigningConfig -Identity contoso.com -Enabled $true

# Rotate DKIM keys
Rotate-DkimSigningConfig -KeySize 2048 -Identity contoso.com
```

**DKIM key rotation procedure:**
1. `Get-DkimSigningConfig` — verify current status and selector
2. `Rotate-DkimSigningConfig -KeySize 2048` — generate new key pair
3. Update DNS CNAME records for selector1 and selector2
4. Wait for DNS propagation (up to 48 hours)
5. Verify with `nslookup -type=cname selector1._domainkey.contoso.com`

### DMARC (Domain-based Message Authentication)

```bash
nslookup -type=txt _dmarc.contoso.com
# Or: dig TXT _dmarc.contoso.com +short
```

**Recommended DMARC:** `v=DMARC1; p=reject; rua=mailto:dmarc-reports@contoso.com; ruf=mailto:dmarc-forensic@contoso.com`

#### DMARC Policy Parameter Reference

| Parameter | Values | Description |
|-----------|--------|-------------|
| `p=` | `none`, `quarantine`, `reject` | Policy for the domain |
| `sp=` | `none`, `quarantine`, `reject` | Policy for subdomains |
| `rua=` | `mailto:` URI | Aggregate report recipients |
| `ruf=` | `mailto:` URI | Forensic report recipients |
| `pct=` | 1-100 | Percentage of messages to apply policy |
| `adkim=` | `r` (relaxed), `s` (strict) | DKIM alignment mode |
| `aspf=` | `r` (relaxed), `s` (strict) | SPF alignment mode |
| `fo=` | `0`, `1`, `d`, `s` | Forensic report options |

**DMARC rollout path:** `p=none` (monitor 2-4 weeks) → `p=quarantine; pct=25` → `pct=50` → `pct=100` → `p=reject`

## NDR (Non-Delivery Report) Code Reference

| NDR Code | Meaning | Common Fix |
|----------|---------|------------|
| `5.1.1` | Recipient not found | Verify recipient address |
| `5.1.10` | Recipient not found (address validation) | Check for typos, disabled mailbox |
| `5.2.2` | Mailbox full | Increase quota or ask user to clean up |
| `5.4.1` | Relay denied | Check accepted domains and connectors |
| `5.7.1` | Sender not authorized | Check transport rules, group restrictions |
| `5.7.23` | Sender rejected by DMARC | Fix SPF/DKIM/DMARC alignment |
| `5.7.57` | Sender needs authentication | Enable SMTP AUTH or use modern auth |
| `5.7.606` | Too many recipients | Reduce batch size |
| `5.7.708` | Access denied (policy) | Check anti-spam or transport rule blocking |
| `4.4.1` | Connection timeout | Remote server issue, retry |
| `4.7.0` | TLS negotiation failed | Check TLS certificate on connector |

## Required Permissions

| Operation | Role / Permission |
|-----------|-------------------|
| Message trace | Exchange Administrator or Compliance Management |
| Transport rules | Exchange Administrator |
| Quarantine management | Security Administrator or Quarantine Administrator |
| Connectors | Exchange Administrator |
| DKIM management | Exchange Administrator |
| Reporting API (Graph) | `Reports.Read.All` |
| Mailbox usage | Exchange Administrator or `Reports.Read.All` |

## Error Handling

| Status Code | Meaning | Common Cause |
|-------------|---------|--------------|
| 400 Bad Request | Malformed request | Invalid date range, malformed filter |
| 401 Unauthorized | Authentication failure | Expired PowerShell session, missing Graph token |
| 403 Forbidden | Insufficient permissions | Missing Exchange Administrator role |
| 404 Not Found | Resource not found | Invalid message trace ID |
| 429 Too Many Requests | Throttled | Too many message trace requests — implement backoff |

### Message Trace Limits

- `Get-MessageTrace`: last 10 days only, max 1000 results per query
- `Start-HistoricalSearch`: 10-90 days, asynchronous — poll `Get-HistoricalSearch` for completion
- Maximum 250 historical search requests in a 24-hour period

## OData Filter Examples (Reporting API)

```
# Email activity for specific user
/reports/getEmailActivityUserDetail(period='D30')?$filter=userPrincipalName eq 'user@contoso.com'

# Mailbox usage over quota
/reports/getMailboxUsageDetail(period='D30')?$filter=storageUsedInBytes ge 50000000000
```

## Common Diagnostic Patterns

### Pattern 1: Missing Email Investigation

1. `Get-MessageTrace -SenderAddress "sender@external.com" -RecipientAddress "user@contoso.com" -StartDate (Get-Date).AddDays(-10)` — check if Exchange received it
2. If `None`: DNS check — `nslookup -type=mx contoso.com` — verify MX points to M365
3. If `Quarantined`: `Get-QuarantineMessage` — review and release if safe
4. If `Failed`: `Get-MessageTraceDetail` — get NDR code and resolve
5. If `FilteredAsSpam`: check anti-spam policy, add sender to safe senders list
6. If `Delivered` but user says missing: check Junk folder, Outlook rules, mobile sync

### Pattern 2: Transport Rule Audit

1. `Get-TransportRule | Sort Priority` — list all rules in priority order
2. For each enabled rule: check conditions and actions for unintended blocking
3. `Get-MessageTraceDetail -MessageTraceId {id}` — verify which rules fired on a specific message
4. Test with `New-TransportRule -Mode Audit` before promoting to `Enforce`
5. Document all active rules with business justification

### Pattern 3: DNS Authentication Validation

1. Check SPF: `nslookup -type=txt contoso.com` — verify `include:spf.protection.outlook.com` and `-all`
2. Check DKIM: `Get-DkimSigningConfig` — verify enabled for all custom domains
3. Check DMARC: `nslookup -type=txt _dmarc.contoso.com` — verify policy level
4. Produce traffic-light report: Green (all pass), Yellow (soft fail), Red (missing/failing)
5. Provide step-by-step DNS record updates for any failures

### Pattern 4: Connector Troubleshooting

1. `Get-InboundConnector` — list inbound connectors and their TLS requirements
2. `Get-OutboundConnector` — list outbound connectors and smart host config
3. `Test-InboundConnector` — validate inbound connector settings
4. Check for certificate expiration on TLS-required connectors
5. Verify MX records align with connector configuration

## Client-Safe Explanation Template

When reporting findings to a non-technical user:

```markdown
## What happened
[1-2 sentence plain-language explanation]

## Why it happened
[Simple cause — avoid jargon]

## What we're doing about it
[Specific next steps in numbered list]

## What you can do
[Any user actions needed]

## Timeline
[When they should expect resolution]
```
