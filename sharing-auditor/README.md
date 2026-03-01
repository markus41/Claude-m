# SharePoint/OneDrive External Sharing Auditor

Find overshared links, anonymous access, and stale guest users across SharePoint and OneDrive. Generate approval tasks for safe revocation instead of immediate hard deletes.

## What this plugin helps with
- Scan for overshared and anonymous sharing links
- Identify stale guest users who haven't signed in recently
- Audit external sharing policies across site collections
- Generate approval-based revocation tasks (no accidental hard deletes)

## Included commands
- `/sharing-setup` — Configure SharePoint admin and Graph access
- `/sharing-scan` — Scan for overshared links, anonymous access, and stale guests
- `/sharing-remediate` — Generate approval tasks for link revocation

## Skill
- `skills/sharing-auditor/SKILL.md` — Sharing links API and external access auditing

## Agent
- `agents/sharing-auditor-reviewer.md` — Reviews remediation actions for safety
