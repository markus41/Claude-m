# Azure Policy & Security Skill

## Purpose
Report Azure governance posture with actionable remediations, explicit blast radius/urgency, and separation of quick wins vs structural fixes.

## Trigger phrases (natural prompts → command)
- "measure policy coverage against CIS/NIST" → `policy-coverage`
- "show policy guardrail gaps by category" → `policy-coverage`
- "find compliance drift since last month" → `drift-analysis`
- "analyze policy regressions and aging exemptions" → `drift-analysis`
- "turn findings into an execution plan" → `remediation-plan`
- "build remediation waves with owners and due dates" → `remediation-plan`
- "set baseline, scope, and ownership model first" → `setup`

## Prerequisites
- Tenant role: security reader/policy insights reader for assessment; policy contributor/owner only when asked to implement changes.
- Permissions: read access to policy definitions, initiatives, assignments, compliance states, and exemption metadata.
- Subscription scope: explicit management group/subscription/resource group scope path.
- Tooling: authenticated Azure context (`az login`) with policy insight visibility.
- Governance prerequisites: selected baseline (`cis`, `nist`, or documented custom), severity model, and remediation owner mapping.

## Expected inputs
- `scope`: management group/subscription/resource group.
- `baseline`: control framework or named baseline.
- `time boundary`: `since` date for drift analysis when requested.
- Optional execution constraints: owners mapping, remediation window, max parallel work.

## Promised output structure
1. Posture summary with explicit coverage/drift metrics.
2. Prioritized findings tables (severity + evidence + scope).
3. Sequenced remediation actions with owners, success criteria, and timeline cues.
4. Assumptions/exemptions notes and verification guidance.

## Decision tree (which command to run)
1. Need to establish scope, baseline, severity model, or ownership before analysis? → `setup`
2. Need baseline adherence/guardrail completeness metrics? → `policy-coverage`
3. Need changes/regressions over time, including exemption aging? → `drift-analysis`
4. Need execution roadmap from existing coverage/drift findings? → `remediation-plan`
5. Full posture-to-execution workflow? Run in order: `setup` → `policy-coverage` and/or `drift-analysis` → `remediation-plan`.

## Minimal references
- `azure-policy-security/commands/setup.md`
- `azure-policy-security/commands/policy-coverage.md`
- `azure-policy-security/commands/drift-analysis.md`
- `azure-policy-security/commands/remediation-plan.md`
- `azure-policy-security/README.md`
