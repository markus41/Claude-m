# Lighthouse Tenant Health Scorecard

Multi-tenant health dashboard for MSPs/CSPs using Microsoft 365 Lighthouse. Provides green/yellow/red scoring for security, MFA, stale accounts, backup posture, and licensing.

## What this plugin helps with
- Run health scans across managed customer tenants
- Green/yellow/red scorecard for security posture, MFA coverage, stale accounts, licensing anomalies
- One-click remediation plan generation from scorecard findings
- GDAP-aware multi-tenant operations

## Integration Context Contract
- Canonical contract: [`docs/integration-context.md`](../docs/integration-context.md)

| Command family | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Lighthouse health and remediation | required (partner + customer context) | optional | `AzureCloud`\* | `delegated-user` | `DelegatedAdminRelationship.Read.All`, `Directory.Read.All`, `AuditLog.Read.All` |

\* Use sovereign cloud values from the contract when applicable.

Commands must fail fast if tenant chain context is incomplete, before scanning managed tenants.
Outputs must redact partner/customer tenant and object identifiers per contract.

## Included commands
- `/lighthouse-setup` — Configure Lighthouse access and GDAP relationships
- `/lighthouse-health-scan` — Scan tenants and produce health scorecard
- `/lighthouse-remediation` — Generate remediation plan from scan findings

## Skill
- `skills/lighthouse-health/SKILL.md` — Lighthouse API and health scoring knowledge

## Agent
- `agents/lighthouse-health-reviewer.md` — Reviews multi-tenant operations for GDAP compliance and safety
