---
name: adf-mount-manage
description: Register, inspect, update, or remove mounted Azure Data Factory pipelines in Fabric prep workflows.
argument-hint: "<register|inspect|update|remove> [options]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# adf-mount-manage

Govern mounted ADF pipelines while preserving lineage and deterministic triggers.

## Prerequisites and Permissions

- Completed `/prep-setup`.
- Source ADF pipeline identity and Fabric workspace target known.
- Contributor/Admin rights in target Fabric workspace.

## Deterministic Steps

1. Resolve source ADF pipeline identity and validate unique mapping.
2. Read existing mount record if present.
3. Validate trigger mode (`manual`, `schedule`, `event`) and ownership metadata.
4. Apply minimal create/update/remove action with explicit lineage fields.
5. Re-read mount state and output redacted result with action evidence.

## Fail-Fast Contract

- Fail if source pipeline identity cannot be validated.
- Fail if trigger mode is implicit or unsupported.
- Fail if action would orphan lineage metadata.

## Redaction

- Redact tenant, subscription, workspace, and pipeline identifiers.
- Never include linked secrets or connection strings in response.
