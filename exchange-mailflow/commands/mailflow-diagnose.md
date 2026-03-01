---
name: mailflow-diagnose
description: Guided "email not received" diagnosis — step-by-step checks for message trace, transport rules, quarantine, connectors, and SPF/DKIM/DMARC.
argument-hint: "<sender-email> <recipient-email> [--days <1-10>] [--verbose]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Diagnose "Email Not Received"

Guided troubleshooting for mail delivery issues. Walks through each diagnostic step and narrows down the root cause.

## Diagnostic Steps

### Step 1: Gather Details
Ask the user:
- "Who sent the email?" (sender address)
- "Who should have received it?" (recipient address)
- "When was it sent?" (approximate date/time)
- "Is this a one-time issue or ongoing?"

### Step 2: Run Message Trace
```powershell
Get-MessageTrace -SenderAddress "{sender}" -RecipientAddress "{recipient}" -StartDate {date} -EndDate {now}
```

**Possible outcomes:**
- **Message found — Delivered**: Check recipient's junk/spam folder, Focused Inbox, or inbox rules
- **Message found — Quarantined**: Go to Step 3
- **Message found — Failed**: Check StatusDetail for the error, go to Step 4
- **Message not found**: Exchange never received it — go to Step 5

### Step 3: Check Quarantine
```powershell
Get-QuarantineMessage -SenderAddress "{sender}" -RecipientAddress "{recipient}"
```

If quarantined:
- Show the quarantine reason (spam, malware, phish, policy)
- Offer to release the message
- Recommend sender-side fixes if the quarantine was a false positive

### Step 4: Check Transport Rules & Connectors
```powershell
Get-TransportRule | Where-Object { $_.State -eq 'Enabled' } | Select-Object Name, Priority, Description
Get-InboundConnector | Select-Object Name, Enabled, SenderDomains
```

Look for rules that:
- Redirect messages matching the sender/recipient
- Silently drop or delete messages
- Modify headers in ways that affect delivery

### Step 5: Check DNS Authentication
```bash
dig TXT {sender-domain} +short       # SPF
dig TXT selector1._domainkey.{sender-domain} +short  # DKIM
dig TXT _dmarc.{sender-domain} +short  # DMARC
```

Report:
- SPF record validity
- DKIM signing status
- DMARC policy and alignment

### Step 6: Check Recipient Mailbox
- Is the mailbox enabled?
- Is there a mail forwarding rule?
- Is the mailbox full?
- Are there inbox rules that delete or move messages?

### Step 7: Generate Diagnosis Report

```markdown
# Mail Flow Diagnosis Report

## Issue
Email from sender@external.com to user@contoso.com not received

## Investigation
| Check | Result | Status |
|---|---|---|
| Message trace | Message found — quarantined | ⚠ |
| Quarantine reason | High confidence phish | Found |
| Transport rules | No blocking rules | OK |
| SPF | Valid record | OK |
| DKIM | Not configured | ⚠ |
| DMARC | p=none (monitor only) | ⚠ |

## Root Cause
Message was quarantined as high-confidence phishing due to missing DKIM signing on the sender's domain.

## Recommended Actions
1. Release the quarantined message (if safe)
2. Ask the sender to enable DKIM signing
3. Recommend the sender upgrade DMARC policy from p=none to p=quarantine
```

## Arguments

- `<sender-email>`: Email address of the sender
- `<recipient-email>`: Email address of the intended recipient
- `--days <1-10>`: Number of days to search back (default: 7)
- `--verbose`: Show full message trace details

## Important Notes

- Message trace covers the last 10 days. For older messages, use historical search (up to 90 days).
- DNS checks examine the sending domain's records, not the recipient's
- Quarantined messages are retained for 30 days by default
- Reference: `skills/exchange-mailflow/SKILL.md` for diagnostic patterns
