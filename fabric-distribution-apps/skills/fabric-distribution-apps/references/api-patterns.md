# Fabric Distribution Apps API Patterns

Use these patterns for predictable organizational app rollout operations in Fabric.

## Preview Caveat

Org app distribution is preview. Validate endpoint versions, role requirements, and rollout behavior in the active tenant before production execution.

## Prerequisites

- Confirm tenant has org app distribution features enabled.
- Confirm caller has app publisher permissions for target rollout scope.
- Confirm integration context against [`docs/integration-context.md`](../../../../docs/integration-context.md).

## Core Operation Pattern

1. Validate context and preview feature availability.
2. Run read-only discovery for package versions, audience mappings, and release channel state.
3. Create an explicit rollout plan with staged audiences and rollback rules.
4. Execute one rollout phase at a time with post-phase verification.
5. Publish a redacted report containing release evidence and adoption trends.

## Permission and Safety Controls

- Enforce least privilege for audience assignment and release actions.
- Require explicit confirmation for broad audience grants and production promotion.
- Fail fast on context/permission mismatch before mutation.
- Redact user, group, tenant, and app identifiers in outputs.

## Recommended Output Sections

- `Release Scope`
- `Validated Permissions`
- `Package and Channel State`
- `Audience Assignment Changes`
- `Adoption Signals`
- `Risks and Rollback Readiness`
