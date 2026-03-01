# Power Automate Skill

## Purpose
Design, troubleshoot, and release cloud flows with idempotent patterns, minimal connector sprawl, and explicit error handling.

## Trigger phrases (natural prompts → command)
- "help me design a new cloud flow" → `flow-design`
- "draft a reliable approval flow" → `flow-design`
- "debug failed flow run" / "why did this run fail" → `flow-debug`
- "triage intermittent connector errors" → `flow-debug`
- "is this flow ready for prod deployment" → `flow-deploy-check`
- "run release gate checks for this flow" → `flow-deploy-check`
- "set environment/connectors/SLA context first" → `setup`

## Prerequisites
- Tenant role: environment maker or equivalent flow author role; admin role required for cross-environment diagnostics/deployment governance.
- Permissions: access to target flow run history, connectors used by the flow, and source/target environments.
- Subscription/environment scope: explicit Power Platform environment and (if used) solution boundary.
- Tooling: authenticated access to Power Automate admin/runtime surfaces and connector metadata.
- Operational context: defined SLA, trigger volume, owner/on-call model, and rollback expectations.

## Expected inputs
- `flow-name-or-id` or business goal (for new design).
- Environment context: source/target environment, solution name (if solution-aware).
- Runtime context: failing run ID or time window for diagnostics.
- Non-functional constraints: SLA, throughput volume, compliance/approval constraints.

## Promised output structure
1. Clear command-specific artifact (blueprint, incident analysis, or readiness report).
2. Evidence-backed tables with status/severity/confidence.
3. Actionable remediation or deployment recommendations with owner and rollback notes.
4. Preventive improvements and validation checks.

## Decision tree (which command to run)
1. Need to capture environment boundaries, connectors, SLA, and failure expectations first? → `setup`
2. Need architecture for a new/refactored flow (trigger, branches, retries, idempotency)? → `flow-design`
3. Need root-cause hypotheses for failed/timed-out/intermittent runs? → `flow-debug`
4. Need go/no-go readiness before promoting flow across environments? → `flow-deploy-check`
5. End-to-end request? Run in order: `setup` → `flow-design` → `flow-deploy-check`; use `flow-debug` whenever incident evidence is present.

## Minimal references
- `power-automate/commands/setup.md`
- `power-automate/commands/flow-design.md`
- `power-automate/commands/flow-debug.md`
- `power-automate/commands/flow-deploy-check.md`
- `power-automate/README.md`
