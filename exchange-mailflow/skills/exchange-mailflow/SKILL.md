---
name: exchange-mailflow
description: Deep expertise in Exchange Online mail flow diagnostics — message trace, transport rules, quarantine, connectors, DNS authentication (SPF/DKIM/DMARC), and client-safe reporting.
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

This skill provides diagnostic knowledge for troubleshooting Exchange Online mail delivery issues and validating email authentication records.

## Diagnostic Approach

When a user reports "email not received", follow this investigation order:

1. **Message trace** — Did Exchange see the message?
2. **Transport rules** — Was the message redirected or blocked by a rule?
3. **Quarantine** — Was the message quarantined by anti-spam or anti-malware?
4. **Connectors** — Is there a connector misconfiguration for the sender's domain?
5. **DNS authentication** — Are SPF/DKIM/DMARC records correct for the sending domain?
6. **Recipient issues** — Is the mailbox full, disabled, or forwarding elsewhere?

## Key PowerShell Commands

### Message Trace
```powershell
# Connect to Exchange Online
Connect-ExchangeOnline -UserPrincipalName admin@contoso.com

# Trace messages (last 10 days)
Get-MessageTrace -SenderAddress "sender@external.com" -RecipientAddress "user@contoso.com" -StartDate (Get-Date).AddDays(-10) -EndDate (Get-Date)

# Detailed trace (for messages older than 10 days, up to 90 days)
Start-HistoricalSearch -ReportTitle "Investigation" -SenderAddress "sender@external.com" -RecipientAddress "user@contoso.com" -StartDate (Get-Date).AddDays(-30) -EndDate (Get-Date) -ReportType MessageTrace
```

### Message Trace Results — Status Values
| Status | Meaning |
|---|---|
| Delivered | Message reached the recipient's mailbox |
| Failed | Delivery failed (check StatusDetail for reason) |
| Pending | Message is in transit |
| Quarantined | Message was quarantined |
| FilteredAsSpam | Message was filtered as spam |
| Expanded | Message went to a distribution group |
| None | No record found — Exchange never received the message |

### Transport Rules
```powershell
Get-TransportRule | Select-Object Name, State, Priority, Description | Format-Table
Get-TransportRule -Identity "Rule Name" | Format-List
```

### Quarantine
```powershell
Get-QuarantineMessage -SenderAddress "sender@external.com" -RecipientAddress "user@contoso.com" -StartDate (Get-Date).AddDays(-10) -EndDate (Get-Date)

# Release from quarantine
Release-QuarantineMessage -Identity <QuarantineMessageId> -ReleaseToAll
```

### Connectors
```powershell
Get-InboundConnector | Select-Object Name, Enabled, SenderDomains, ConnectorType
Get-OutboundConnector | Select-Object Name, Enabled, RecipientDomains, ConnectorType
```

## DNS Authentication Checks

### SPF
```bash
nslookup -type=txt contoso.com
# Or
dig TXT contoso.com +short
```

**Valid SPF example**: `v=spf1 include:spf.protection.outlook.com -all`

**Common issues**:
- Missing `include:spf.protection.outlook.com` for M365 tenants
- Using `~all` (softfail) instead of `-all` (hardfail)
- Too many DNS lookups (max 10)
- Missing SPF record entirely

### DKIM
```powershell
Get-DkimSigningConfig | Select-Object Domain, Enabled, Status
```

Enable DKIM:
```powershell
Set-DkimSigningConfig -Identity contoso.com -Enabled $true
```

### DMARC
```bash
nslookup -type=txt _dmarc.contoso.com
# Or
dig TXT _dmarc.contoso.com +short
```

**Recommended DMARC**: `v=DMARC1; p=reject; rua=mailto:dmarc-reports@contoso.com`

**Policy levels**: `p=none` (monitor), `p=quarantine` (flag), `p=reject` (block)

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

## Required Permissions

| Operation | Role / Permission |
|---|---|
| Message trace | Exchange Administrator or Compliance Management |
| Transport rules | Exchange Administrator |
| Quarantine management | Security Administrator or Quarantine Administrator |
| Connectors | Exchange Administrator |
| DKIM management | Exchange Administrator |
