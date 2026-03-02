# Microsoft Purview Compliance

Compliance workflow guidance for Microsoft Purview — DLP, retention, sensitivity labels, eDiscovery, and guided compliance playbooks.

## What this plugin helps with
- DLP policy review and gap analysis
- Retention and records policy planning
- Sensitivity labeling strategy checks
- eDiscovery case workflow preparation
- **Guided compliance playbooks** with audit-ready change logs and owner sign-off

## Integration Context Contract
- Canonical contract: [`docs/integration-context.md`](../docs/integration-context.md)

| Command family | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| DLP/retention/ediscovery/playbooks | required | optional (required only for Azure-linked evidence sources) | `AzureCloud`\* | `delegated-user` | `Compliance.Read.All`, `SecurityEvents.Read.All`, `AuditLog.Read.All` |

\* Use sovereign cloud values from the contract when applicable.

Commands must validate context first and fail fast with shared error codes when prerequisites are missing.
Sample outputs must redact tenant and principal identifiers per contract.

## Included commands
- `/purview-setup` — Configure regulatory context, tenant scope, and PowerShell connectivity
- `/dlp-review` — Review DLP policy coverage and false-positive hotspots
- `/retention-review` — Evaluate retention coverage across workloads
- `/ediscovery-plan` — Create an eDiscovery readiness plan with custodians and holds
- `/compliance-playbook` — Run guided compliance automation (retention, DLP, labels, legal hold)

## Skill
- `skills/purview-compliance/SKILL.md` — Purview compliance knowledge base

## Agent
- `agents/compliance-reviewer.md` — Reviews compliance configurations for correctness and regulatory alignment
