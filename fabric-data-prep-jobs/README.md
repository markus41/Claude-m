# fabric-data-prep-jobs

Microsoft Fabric data preparation jobs - Dataflow Gen1, Apache Airflow jobs, mounted Azure Data Factory pipelines, and dbt job governance for deterministic prep workflows.

## Category

`analytics`

## Commands

| Command | Purpose |
|---|---|
| `/prep-setup` | Validate tenant/workspace context and baseline permissions for prep orchestration |
| `/airflow-job-manage` | Create, update, pause, resume, or inspect Apache Airflow jobs used by Fabric prep flows |
| `/adf-mount-manage` | Register and govern mounted Azure Data Factory pipelines for Fabric execution |
| `/dataflow-gen1-manage` | Govern Dataflow Gen1 job definitions, schedules, and lineage guardrails |
| `/dbt-job-manage` | Govern dbt job execution contracts, retries, and artifact retention |

## Agent

| Agent | Purpose |
|---|---|
| `fabric-data-prep-jobs-reviewer` | Reviews prep job definitions for determinism, safety, and governance drift |

## Integration Context Contract

- Canonical contract: `docs/integration-context.md`

| Command family | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Setup + read-only discovery | required | optional | required | delegated-user or service-principal | `Fabric.Read.All` (or equivalent workspace read role) |
| Airflow/Dataflow/ADF mount write ops | required | optional | required | delegated-user or service-principal | `Fabric.ReadWrite.All` and workspace Contributor/Admin |
| dbt governance ops | required | optional | required | delegated-user or service-principal | `Fabric.ReadWrite.All`, workspace Contributor/Admin, artifact write permission |

Fail-fast statement: commands stop before API calls when required integration context or permissions are missing.

Redaction statement: command output and review output redact tenant/workspace/job identifiers to short forms (for example `72f988...db47`) and never print tokens or secrets.

## Preview Caveat

`dbt-job-manage` may target preview Fabric capabilities depending on tenant region and feature flags. Expect schema, API shape, and availability changes.
