---
name: airflow-job-manage
description: Create, inspect, update, pause, or resume Apache Airflow jobs used in Fabric prep orchestration.
argument-hint: "<create|inspect|update|pause|resume> [options]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# airflow-job-manage

Manage Airflow job definitions with deterministic scheduling and retry behavior.

## Prerequisites and Permissions

- Completed `/prep-setup`.
- Target workspace and Airflow integration configured.
- Workspace Contributor/Admin and write scope for job updates.

## Deterministic Steps

1. Resolve target job by immutable item ID (never by name only).
2. Read current definition and execution policy.
3. Validate requested operation (`create`, `inspect`, `update`, `pause`, `resume`).
4. For write operations, apply a minimal patch with explicit cron, timezone, retries, and concurrency.
5. Re-read job state and return redacted before/after summary.

## Fail-Fast Contract

- Fail if job identity is ambiguous or missing.
- Fail if requested state transition is invalid (for example `resume` on already running job).
- Fail if deterministic policy fields are omitted in an update.

## Redaction

- Redact tenant/workspace/job IDs.
- Omit secret values in connection or token settings.
