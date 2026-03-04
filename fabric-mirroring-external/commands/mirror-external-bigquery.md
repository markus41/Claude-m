---
name: mirror-external-bigquery
description: Onboard BigQuery mirroring with preview caveat controls and deterministic validation.
argument-hint: "[project-id] [dataset] [table-allowlist]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Mirror External BigQuery

## Preview Caveat

BigQuery mirroring is treated as preview-sensitive in this plugin. Availability, limits, and connector behavior can change by tenant, region, and release ring; validate support and keep a fallback ingestion pattern before production rollout.

## Prerequisites and Permissions

- Validate integration context using [`docs/integration-context.md`](../../docs/integration-context.md).
- Fabric workspace role: `Contributor` or higher.
- BigQuery principal with dataset metadata and table read access.
- Approved table allowlist and tested fallback pattern.

## Deterministic Steps

1. Validate context and explicit project/dataset inputs.
2. Validate preview-support assumptions for tenant and region.
3. Run read-only discovery for dataset/table scope.
4. Validate source principal grants for selected tables.
5. Create mirroring mapping for allowlisted tables only.
6. Start mirroring and monitor first snapshot checkpoint.
7. Publish a redacted onboarding result with fallback readiness status.

## Fail-Fast Rules

- Stop when preview support cannot be confirmed for environment.
- Stop when fallback ingestion path is not defined.
- Stop when table allowlist or source grants are incomplete.

## Redaction Requirements

- Redact workspace IDs, project IDs where sensitive, and principal IDs.
- Never output service account secrets, private keys, or tokens.

## Example Redacted Output

```json
{
  "source": "bigquery",
  "project": "analytics...prod",
  "tablesMirrored": 9,
  "status": "Replicating"
}
```
