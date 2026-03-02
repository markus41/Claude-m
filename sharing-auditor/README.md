# SharePoint/OneDrive External Sharing Auditor

Find overshared links, anonymous access, and stale guest users across SharePoint and OneDrive. Generate approval tasks for safe revocation instead of immediate hard deletes.

## What this plugin helps with
- Scan for overshared and anonymous sharing links
- Identify stale guest users who haven't signed in recently
- Audit external sharing policies across site collections
- Generate approval-based revocation tasks (no accidental hard deletes)

## Integration Context Contract
- Canonical contract: [`docs/integration-context.md`](../docs/integration-context.md)

| Command family | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Sharing scans and remediation plans | required | optional | `AzureCloud`\* | `delegated-user` | `Sites.Read.All`, `Sites.FullControl.All`, `User.Read.All`, `AuditLog.Read.All` |

\* Use sovereign cloud values from the contract when applicable.

Commands must fail fast before Graph/SharePoint calls when required context fields are missing.
Results must redact sensitive IDs according to the shared redaction rules.

## Included commands
- `/sharing-setup` — Configure SharePoint admin and Graph access
- `/sharing-scan` — Scan for overshared links, anonymous access, and stale guests
- `/sharing-remediate` — Generate approval tasks for link revocation

## Skill
- `skills/sharing-auditor/SKILL.md` — Sharing links API and external access auditing

## Agent
- `agents/sharing-auditor-reviewer.md` — Reviews remediation actions for safety
