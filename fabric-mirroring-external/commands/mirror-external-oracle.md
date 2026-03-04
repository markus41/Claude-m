---
name: mirror-external-oracle
description: Onboard Oracle mirroring with preview caveat controls and source-readiness validation.
argument-hint: "[service-name] [schema-allowlist]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Mirror External Oracle

## Preview Caveat

Oracle mirroring is treated as preview-sensitive in this plugin. Availability, limits, and connector behavior can change by tenant, region, and release ring; validate support and keep a fallback ingestion pattern before production rollout.

## Prerequisites and Permissions

- Validate integration context using [`docs/integration-context.md`](../../docs/integration-context.md).
- Fabric workspace role: `Contributor` or higher.
- Oracle principal with required metadata and table read/CDC access for selected schemas.
- Approved schema allowlist and tested fallback pattern.

## Deterministic Steps

1. Validate context and explicit Oracle service/schema scope.
2. Validate preview-support assumptions for tenant and region.
3. Run read-only schema/table discovery for selected schemas.
4. Validate source principal grants and redo/archive prerequisites.
5. Create mirroring mapping for approved schema/table scope.
6. Start mirroring and verify first replication checkpoint.
7. Return redacted status with fallback readiness confirmation.

## Fail-Fast Rules

- Stop when preview support cannot be confirmed for environment.
- Stop when fallback ingestion path is not defined.
- Stop when required Oracle prerequisites or grants are missing.

## Redaction Requirements

- Redact source handles, tenant IDs, and principal IDs.
- Never output passwords, wallet secrets, tokens, or connection strings.

## Example Redacted Output

```json
{
  "source": "oracle",
  "serviceHandle": "orcl-pr...7d2a",
  "schemasMirrored": 4,
  "status": "SnapshotInProgress"
}
```
