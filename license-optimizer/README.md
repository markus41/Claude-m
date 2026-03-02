# M365 License Optimizer

License optimization for MSPs/CSPs — find waste, recommend downgrades/upgrades, and estimate monthly savings across customer tenants.

## What this plugin helps with
- Identify inactive and underused licenses
- Map candidate downgrades (e.g., E5 → E3) and upgrades
- Estimate monthly cost savings
- Multi-tenant Lighthouse reports for customer review meetings
- CSP/Partner Center billing context

## Integration Context Contract
- Canonical contract: [`docs/integration-context.md`](../docs/integration-context.md)

| Command family | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| License scan and reporting | required | optional | `AzureCloud`\* | `delegated-user` | `Directory.Read.All`, `User.Read.All`, `Reports.Read.All` |

\* Use sovereign cloud values from the contract when applicable.

Commands must fail fast when integration context is missing and return standard context error codes.
Reports must redact sensitive tenant/user identifiers per the shared contract.

## Included commands
- `/license-setup` — Configure Graph access for license reporting
- `/license-scan` — Scan for inactive/underused licenses and savings opportunities
- `/license-report` — Generate customer-facing report for review meetings

## Skill
- `skills/license-optimizer/SKILL.md` — License SKU knowledge and optimization patterns

## Agent
- `agents/license-optimizer-reviewer.md` — Reviews recommendations for accuracy and dependency checks
