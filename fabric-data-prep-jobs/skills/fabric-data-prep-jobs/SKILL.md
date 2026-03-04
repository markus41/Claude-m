---
name: fabric-data-prep-jobs
description: Microsoft Fabric data preparation jobs - Dataflow Gen1, Apache Airflow jobs, mounted Azure Data Factory pipelines, and dbt job governance for deterministic prep workflows.
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
triggers:
  - fabric data prep
  - prep jobs
  - airflow fabric job
  - mounted adf pipeline
  - dataflow gen1 governance
  - dbt governance
---

# fabric-data-prep-jobs

Use this skill when the user asks to establish or govern deterministic Microsoft Fabric data preparation job workflows across Dataflow Gen1, Apache Airflow, mounted Azure Data Factory pipelines, or dbt jobs.

## Integration Context Contract

- Canonical contract: `docs/integration-context.md`

| Command family | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Setup and discovery | required | optional | required | delegated-user or service-principal | `Fabric.Read.All` (or workspace read role) |
| Operational updates (Airflow, ADF mount, Dataflow Gen1) | required | optional | required | delegated-user or service-principal | `Fabric.ReadWrite.All` + workspace Contributor/Admin |
| dbt governance updates | required | optional | required | delegated-user or service-principal | `Fabric.ReadWrite.All` + workspace Contributor/Admin + artifact write |

Fail-fast statement: if required context, cloud compatibility, or grants are missing, stop and return a contract error before making API calls.

Redaction statement: redact tenant/workspace/item identifiers and never reveal secrets, bearer tokens, client secrets, or certificate material.

## Preview Caveat

dbt job orchestration/governance can be preview-only in some tenants. Confirm feature availability before write operations and avoid assuming backward compatibility.

## Execution Pattern

1. Validate integration context and identity grants.
2. Read current item state and policy guardrails.
3. Propose deterministic change plan (inputs, retries, concurrency, lineage, ownership).
4. Apply minimal update.
5. Re-read state and report redacted diff plus next verification action.

## Command Map

- `/prep-setup`
- `/airflow-job-manage`
- `/adf-mount-manage`
- `/dataflow-gen1-manage`
- `/dbt-job-manage`

## References

- API patterns: `skills/fabric-data-prep-jobs/references/api-patterns.md`
