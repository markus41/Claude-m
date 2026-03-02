# Shared Multi-Plugin Workflow Specs

Use these specs when a request spans multiple plugins and needs deterministic handoffs.

## Incident triage (`azure-monitor` → `azure-functions` → `azure-devops`)

### Trigger phrases
- "Investigate this production incident and create a fix ticket."
- "Trace this Azure alert to function failures and open an Azure DevOps bug."
- "Do incident triage from monitoring signals through remediation backlog."
- "Correlate App Insights errors, isolate failing function code path, and track work item."

### Ordered plugin invocation sequence
1. `azure-monitor` — collect telemetry evidence and isolate blast radius.
2. `azure-functions` — map telemetry to function runtime/code-level root cause.
3. `azure-devops` — create and route actionable work item/PR tasks.

### Handoff contracts
| Stage | Required input | Produced output | Next plugin consumption |
|---|---|---|---|
| `azure-monitor` | Subscription ID, workspace/app insights IDs, incident time window, impacted service identifier | Incident evidence pack: alert IDs, correlated KQL results, failing operation names, error rates, impacted resources, severity score | `azure-functions` uses operation/function names, timestamps, exception signatures, and impacted function app resource IDs |
| `azure-functions` | Incident evidence pack + function app name/resource group + runtime version | Root-cause analysis pack: failing trigger/binding path, probable defect location, mitigation options, rollback/scale guidance, confidence level | `azure-devops` uses RCA summary, mitigation recommendation, owner suggestion, priority, and acceptance criteria |
| `azure-devops` | RCA pack + project/repo metadata + team ownership map | Tracked execution artifacts: bug/work item IDs, task breakdown, PR checklist, SLA due dates, assignment | Terminal output for user and optional follow-up automation |

### Required auth context
- Azure tenant ID and subscription scope with read access to Monitor/App Insights/Log Analytics.
- Access to Function App configuration/runtime diagnostics.
- Azure DevOps org/project access with work item create permissions.
- Correlation IDs or alert IDs when available.

### Validation checkpoints
- Checkpoint A (`azure-monitor`): at least one reproducible signal path exists (alert → query → impacted resource).
- Checkpoint B (`azure-functions`): root-cause hypothesis includes concrete trigger/binding/function evidence.
- Checkpoint C (`azure-devops`): work item contains reproduction steps, impact statement, and owner.

### Stop conditions
- Stop if telemetry is insufficient to identify impacted resource/function.
- Stop if function runtime/config access is denied.
- Stop if no writable Azure DevOps project is available.
- Stop if evidence confidence is below agreed threshold (default: "low").

## Identity/data risk review (`entra-id-security` → `purview-compliance` → `sharing-auditor`)

### Trigger phrases
- "Run an identity and data exposure risk review for this tenant."
- "Assess Entra sign-in risk, DLP posture, and overshared content."
- "Do a security sweep across identity controls and sharing risk."
- "Find risky users/apps, policy gaps, and external sharing exposure."

### Ordered plugin invocation sequence
1. `entra-id-security` — identify identity attack surface and risky principals.
2. `purview-compliance` — evaluate data protection policy coverage against identity findings.
3. `sharing-auditor` — quantify real-world sharing exposure and stale guest access.

### Handoff contracts
| Stage | Required input | Produced output | Next plugin consumption |
|---|---|---|---|
| `entra-id-security` | Tenant ID, risk window, target apps/users/groups, conditional access scope | Identity risk profile: risky users/SPNs/apps, CA gaps, high-risk sign-ins, privilege findings, risk-ranked entities | `purview-compliance` maps high-risk identities/data owners to DLP, retention, and labeling controls |
| `purview-compliance` | Identity risk profile + compliance boundary (business units/workloads) + policy inventory | Control coverage matrix: where DLP/retention/sensitivity controls are missing, weak, or bypass-prone | `sharing-auditor` prioritizes sites/files/guests tied to uncovered or high-risk areas |
| `sharing-auditor` | Coverage matrix + target repositories (SharePoint/OneDrive/Teams) + external sharing policy | Exposure report: overshared links, stale external users, critical data exposure hotspots, remediation queue | Terminal output for user and optional governance runbook input |

### Required auth context
- Entra/Graph scopes for sign-in logs, conditional access, identity protection, applications/service principals.
- Purview/compliance permissions to inspect DLP/retention/sensitivity labels and policy state.
- SharePoint/OneDrive/Teams sharing audit access with guest and link visibility.
- Tenant-level policy boundaries and data classification baseline.

### Validation checkpoints
- Checkpoint A (`entra-id-security`): risk entities are ranked with evidence and timestamps.
- Checkpoint B (`purview-compliance`): each high-risk identity scenario maps to explicit control status (covered/gap/partial).
- Checkpoint C (`sharing-auditor`): top exposures include owner, sharing mechanism, and remediation action.

### Stop conditions
- Stop if tenant-wide identity logs are unavailable.
- Stop if Purview policy inventory is inaccessible or incomplete.
- Stop if sharing telemetry cannot be resolved to owners/resources.
- Stop if no remediation owner can be assigned for critical findings.

## Cost + policy optimization (`azure-cost-governance` → `azure-policy-security` → `microsoft-azure-mcp`)

### Trigger phrases
- "Optimize Azure spend and tighten policy guardrails."
- "Find cost waste, validate policy drift, and prioritize platform actions."
- "Run a FinOps plus compliance optimization pass."
- "Identify idle spend and map it to policy enforcement opportunities."

### Ordered plugin invocation sequence
1. `azure-cost-governance` — detect waste patterns and savings opportunities.
2. `azure-policy-security` — evaluate whether policy controls can prevent repeated waste/risk.
3. `microsoft-azure-mcp` — execute subscription/resource inventory actions and implementation planning.

### Handoff contracts
| Stage | Required input | Produced output | Next plugin consumption |
|---|---|---|---|
| `azure-cost-governance` | Subscription set, analysis period, budget/forecast constraints, tagging baseline | Savings opportunity register: idle/overprovisioned resources, anomaly drivers, estimated savings bands | `azure-policy-security` maps each savings item to enforceable policy/initiative options |
| `azure-policy-security` | Savings register + target governance scope + current assignments/exemptions | Policy optimization plan: policy gaps, assignment changes, exemption cleanup, expected compliance impact | `microsoft-azure-mcp` consumes concrete scopes/resource IDs and change priorities |
| `microsoft-azure-mcp` | Policy optimization plan + execution boundaries (allowed actions) + ownership model | Actionable implementation backlog: subscription/resource changes, rollout waves, verification commands, owners | Terminal output for user and operational handoff |

### Required auth context
- Billing/Cost Management read scope across target subscriptions.
- Azure Policy read/write (or read-only for recommendation mode) at required scopes.
- Azure Resource Manager inventory/control permissions for `microsoft-azure-mcp` actions.
- Defined change policy (recommend-only vs apply-changes).

### Validation checkpoints
- Checkpoint A (`azure-cost-governance`): every top cost item has quantified impact and scope.
- Checkpoint B (`azure-policy-security`): each recommended policy change ties to at least one cost/risk driver.
- Checkpoint C (`microsoft-azure-mcp`): execution backlog includes validation command and rollback note per high-impact change.

### Stop conditions
- Stop if cost dataset is stale or missing key subscriptions.
- Stop if policy scope/permissions do not allow reliable drift assessment.
- Stop if execution boundaries are undefined (cannot distinguish recommend vs apply).
- Stop if projected risk of change exceeds approved guardrails.
