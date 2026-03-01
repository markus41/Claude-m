# M365 Service Desk Auto-Runbooks

Convert common IT tickets into safe, guided workflows. Includes pre-checks, approval gates, and post-action verification text for end users.

## What this plugin helps with
- "Grant shared mailbox access" — guided workflow
- "Reset MFA" — guided workflow with pre-checks
- "Recover deleted file" — OneDrive/SharePoint recycle bin recovery
- "Reset password" — with compliance checks and secure delivery

## Included commands
- `/servicedesk-setup` — Configure Graph and Exchange access for ticket workflows
- `/runbook-shared-mailbox` — Grant shared mailbox access
- `/runbook-reset-mfa` — Reset MFA for a user
- `/runbook-recover-file` — Recover deleted files from recycle bin
- `/runbook-password-reset` — Reset password with compliance checks

## Skill
- `skills/servicedesk-runbooks/SKILL.md` — Common ticket patterns and safe workflow design

## Agent
- `agents/servicedesk-runbooks-reviewer.md` — Reviews runbook actions for safety and approval gates
