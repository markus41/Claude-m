# Azure Policy & Security Posture

Azure policy and security posture review workflows.

## What this plugin helps with
- Audit policy assignment coverage and exemptions
- Detect drift against baseline guardrails
- Prioritize remediation actions by risk and blast radius
- Track compliance posture over time

## Integration Context Contract
- Canonical contract: [`docs/integration-context.md`](../docs/integration-context.md)

| Command family | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Policy coverage, drift, remediation | required | required | `AzureCloud`\* | `delegated-user` or `service-principal` | `PolicyInsights.Read`, `Policy.Read.All`, Azure `Reader` |

\* Use sovereign cloud values from the contract when applicable.

All commands must fail fast with `MissingIntegrationContext`, `InvalidIntegrationContext`, `ContextCloudMismatch`, or `InsufficientScopesOrRoles` before API calls.
Outputs and reviewer notes must redact sensitive IDs using the contract rules.

## Included commands
- `commands/setup.md`
- `commands/policy-coverage.md`
- `commands/drift-analysis.md`
- `commands/remediation-plan.md`

## Skill
- `skills/azure-policy-security/SKILL.md`

## Plugin structure
- `.claude-plugin/plugin.json`
- `skills/azure-policy-security/SKILL.md`
- `commands/setup.md`
- `commands/policy-coverage.md`
- `commands/drift-analysis.md`
- `commands/remediation-plan.md`
- `agents/azure-policy-security-reviewer.md`

