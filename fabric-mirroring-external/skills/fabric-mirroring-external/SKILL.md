---
name: Fabric Mirroring External
description: >
  Microsoft Fabric mirroring workflows for external sources with deterministic
  setup, source-specific onboarding checks, preview caveats, fail-fast validation,
  and redacted output.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - fabric mirroring external
  - mirror generic database
  - mirror bigquery
  - mirror oracle
  - mirror sap
  - mirror snowflake
  - mirror sql server
---

# Fabric Mirroring External

## Preview Caveat (BigQuery and Oracle)

Treat BigQuery and Oracle mirroring workflows as preview-sensitive. Validate current tenant/region support and enforce a rollback or fallback ingestion path before production use.

## Integration Context Contract
- Canonical contract: [`docs/integration-context.md`](../../../docs/integration-context.md)

| Workflow | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| External mirroring setup | required | optional | `AzureCloud`* | delegated-user or service-principal | `Fabric Workspace Contributor` |
| Generic DB workflow | required | optional | `AzureCloud`* | delegated-user or service-principal | Fabric workspace grants + source read permissions |
| BigQuery/Oracle workflow (preview) | required | optional | `AzureCloud`* | delegated-user or service-principal | Fabric workspace grants + source preview connector permissions |
| SAP/Snowflake/SQL Server workflow | required | optional | `AzureCloud`* | delegated-user or service-principal | Fabric workspace grants + source-specific permissions |

* Use sovereign cloud values from the canonical contract when applicable.

Fail fast before API calls when required fields, grants, or connector prerequisites are missing. Redact tenant identifiers, source identifiers, and all secrets in outputs.

## Command Surface

| Command | Purpose |
|---|---|
| `mirror-external-setup` | Baseline workspace, context, and connector prerequisites. |
| `mirror-external-generic-database` | Configure and validate mirroring for generic external databases. |
| `mirror-external-bigquery` | Configure and validate mirroring for BigQuery with preview caveat gates. |
| `mirror-external-oracle` | Configure and validate mirroring for Oracle with preview caveat gates. |
| `mirror-external-sap` | Configure and validate mirroring for SAP sources. |
| `mirror-external-snowflake` | Configure and validate mirroring for Snowflake sources. |
| `mirror-external-sql-server` | Configure and validate mirroring for SQL Server sources. |

## Guardrails

1. Validate integration context before any network/API call.
2. Enforce explicit source scope and reject ambiguous wildcard onboarding.
3. Treat BigQuery and Oracle as preview-sensitive and require fallback plans.
4. Verify post-onboarding table status and latency, then emit redacted output.
5. Stop on permission gaps, unsupported objects, or schema incompatibilities.

## Progressive Disclosure - Reference Files

| Topic | File |
|---|---|
| API and onboarding patterns | [`references/api-patterns.md`](./references/api-patterns.md) |
