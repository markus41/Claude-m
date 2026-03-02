# Azure Cost Governance

Azure cost governance workflows for Claude Code teams.

## What this plugin helps with
- Analyze spend trends and cost anomalies
- Review budget thresholds and forecast risk
- Identify idle or underutilized resources
- Produce optimization recommendations with expected savings

## Integration Context Contract
- Canonical contract: [`docs/integration-context.md`](../docs/integration-context.md)

| Command family | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Cost query, budgets, idle resources | required | required | `AzureCloud`\* | `delegated-user` or `service-principal` | `CostManagement.Read`, `Consumption.Read`, Azure `Reader` |

\* Use sovereign cloud values from the contract when applicable.

Commands must fail fast on missing/invalid context before Azure API calls and return contract error codes.
All outputs must redact tenant/subscription identifiers using the shared policy.

## Included commands
- `commands/setup.md`
- `commands/azure-cost-query.md`
- `commands/azure-budget-check.md`
- `commands/azure-idle-resources.md`

## Skill
- `skills/azure-cost-governance/SKILL.md`

## Plugin structure
- `.claude-plugin/plugin.json`
- `skills/azure-cost-governance/SKILL.md`
- `commands/setup.md`
- `commands/azure-cost-query.md`
- `commands/azure-budget-check.md`
- `commands/azure-idle-resources.md`
- `agents/azure-cost-governance-reviewer.md`
