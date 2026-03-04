---
name: dataflow-gen1-manage
description: Create, inspect, update, schedule, or retire Dataflow Gen1 jobs with deterministic policy controls.
argument-hint: "<create|inspect|update|schedule|retire> [options]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# dataflow-gen1-manage

Operate Dataflow Gen1 artifacts with explicit refresh and governance controls.

## Prerequisites and Permissions

- Completed `/prep-setup`.
- Workspace access to target Dataflow Gen1 item.
- Contributor/Admin permission for create/update/schedule/retire operations.

## Deterministic Steps

1. Resolve target dataflow by immutable item ID.
2. Read current schema fingerprint, refresh policy, and ownership fields.
3. Validate requested operation and required deterministic fields.
4. Apply minimal write with explicit schedule/retry/timeout settings.
5. Re-read final definition and return redacted compliance summary.

## Fail-Fast Contract

- Fail on missing schema fingerprint for write operations.
- Fail when refresh schedule or retry policy is partially specified.
- Fail when permissions are insufficient for the requested action.

## Redaction

- Redact tenant/workspace/dataflow IDs.
- Suppress all credentials and secret-bearing connection properties.
