---
name: dbt-job-manage
description: Govern dbt job definitions in Fabric, including pinned refs, test gates, retries, and artifact retention.
argument-hint: "<create|inspect|update|run|retire> [options]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# dbt-job-manage

Manage dbt job governance with deterministic execution contracts.

## Preview Caveat

dbt job capabilities can be preview-only by tenant or region. Confirm feature availability before attempting create/update/run actions.

## Prerequisites and Permissions

- Completed `/prep-setup`.
- dbt project source and immutable release reference (`gitSha` or tag) available.
- Workspace Contributor/Admin plus dbt artifact write permission.

## Deterministic Steps

1. Resolve target job identity (or confirm non-existence for create).
2. Validate preview feature access in the tenant/workspace.
3. Read current/pending contract fields: project ref, target profile, retries, and test severity gate.
4. Apply minimal change with pinned project reference and explicit run policy.
5. Re-read definition and return redacted governance diff plus run readiness.

## Fail-Fast Contract

- Fail if preview capability is unavailable.
- Fail if project reference is mutable (branch-only) instead of pinned immutable ref.
- Fail if retries, timeout, or test gate is omitted on write operations.

## Redaction

- Redact tenant/workspace/job identifiers.
- Never output repository secrets, tokens, connection secrets, or private key material.
