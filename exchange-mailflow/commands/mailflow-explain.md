---
name: mailflow-explain
description: Convert technical mail flow findings into a client-safe explanation with plain-language cause, next actions, and timeline.
argument-hint: "[--findings <report-path>] [--audience <client|internal>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Mail Flow Explanation Generator

Convert technical diagnostic findings into a clear, non-technical explanation suitable for end users or clients.

## Explanation Format

### For Clients (Non-Technical)

```markdown
## What Happened
An email from [sender] to [recipient] on [date] was not delivered to the inbox.

## Why
[Plain-language explanation — avoid technical jargon]

Examples:
- "The email was flagged as suspicious by our security system because the sender's email server isn't properly verified."
- "A mail routing rule redirected the message to a different mailbox."
- "The sender's email domain is missing a security verification record, causing our system to treat it as potentially unsafe."

## What We're Doing About It
1. [Action 1 in plain language]
2. [Action 2 in plain language]

## What You Can Do
- [Any user-side actions]

## Timeline
- [When to expect resolution]
```

### For Internal IT (Technical)

```markdown
## Summary
[Concise technical summary]

## Root Cause
[Technical root cause with evidence]

## Evidence
| Check | Result | Impact |
|---|---|---|

## Remediation
1. [Specific technical steps]

## Prevention
- [Steps to prevent recurrence]
```

## Common Translations

| Technical Finding | Client-Safe Explanation |
|---|---|
| SPF failure | "The sender's email server isn't listed as an authorized sender for their domain" |
| DKIM not configured | "The sender's email doesn't have a digital signature that verifies it's genuine" |
| DMARC fail | "The email failed the sender's domain security checks" |
| Quarantined — high confidence phish | "Our security system flagged this email as a potential phishing attempt" |
| Transport rule redirect | "An email routing rule in your organization redirected this message" |
| Mailbox full | "The recipient's mailbox has reached its storage limit" |
| Connector misconfiguration | "The email routing between your organization and the sender's system needs adjustment" |

## Arguments

- `--findings <report-path>`: Path to a diagnosis report to translate
- `--audience <client|internal>`: Target audience (default: client)

## Important Notes

- Never share internal transport rule names or details with external clients
- Never expose quarantine message IDs or internal system names
- Focus on actionable next steps, not blame
- Reference: `skills/exchange-mailflow/SKILL.md`
