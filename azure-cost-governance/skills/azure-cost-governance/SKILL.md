# Azure Cost Governance Skill

## Purpose
Provide practical FinOps guidance with high-confidence savings actions, business impact (monthly + annualized), and explicit rollback risk notes.

## Trigger phrases (natural prompts → command)
Use these mappings to route user requests predictably:
- "show Azure spend by resource group/service/tag" → `azure-cost-query`
- "build a cost query for last 30 days" → `azure-cost-query`
- "check budget overrun risk this month" → `azure-budget-check`
- "forecast whether we will exceed budget" → `azure-budget-check`
- "find idle Azure resources and savings" → `azure-idle-resources`
- "identify shutdown/deallocation candidates" → `azure-idle-resources`
- "set up cost governance context first" → `setup`

## Prerequisites
- Tenant role: reader-level visibility to billing/cost data for target scope; contributor/owner only if user asks for execution actions.
- Permissions: access to Cost Management data and budgets at subscription/management group/tenant billing scope.
- Subscription scope: explicit scope path is required (for example `/subscriptions/<id>`).
- Tooling: Azure CLI authenticated (`az login`) and access to cost/budget telemetry sources used by this plugin.
- Governance context: timeframe, currency, and analysis dimensions agreed before running optimization recommendations.

## Expected inputs
- `scope`: subscription, resource group, or management group path.
- `timeframe`: preset (`MTD`, `QTD`, `last-30-days`, etc.) or explicit `start/end` dates.
- `focus`: budget health, spend breakdown, or idle-resource optimization objective.
- Optional constraints: resource types, savings floor, alert thresholds, forecast horizon.

## Promised output structure
Always return deterministic, command-aligned sections:
1. Short executive summary (3-6 bullets).
2. Primary result table/JSON schema required by selected command.
3. Prioritized actions with estimated savings range and owner suggestion.
4. Assumptions, telemetry gaps, and confidence/risk notes.

## Decision tree (which command to run)
1. Need to initialize scope/timeframe/currency/dimensions before analysis? → `setup`
2. Need spend breakdowns, groupings, filters, or reproducible query JSON? → `azure-cost-query`
3. Need budget utilization + forecast breach risk + interventions? → `azure-budget-check`
4. Need underutilization detection and reversible optimization actions? → `azure-idle-resources`
5. Request combines multiple goals? Run in order: `setup` → `azure-cost-query`/`azure-budget-check` → `azure-idle-resources` as needed.

## Minimal references
- `azure-cost-governance/commands/setup.md`
- `azure-cost-governance/commands/azure-cost-query.md`
- `azure-cost-governance/commands/azure-budget-check.md`
- `azure-cost-governance/commands/azure-idle-resources.md`
- `azure-cost-governance/README.md`
