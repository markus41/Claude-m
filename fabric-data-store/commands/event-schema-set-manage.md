---
name: event-schema-set-manage
description: Create, inspect, update, validate, or retire Fabric Event Schema Sets with compatibility governance.
argument-hint: "<create|inspect|update|validate|retire> [options]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# event-schema-set-manage

Govern Event Schema Sets to keep producer/consumer contracts deterministic.

## Preview Caveat

Event Schema Set capabilities may be preview. Schema compatibility rules and API fields can change by region/tenant.

## Prerequisites and Permissions

- Completed `/store-setup`.
- Workspace Contributor/Admin.
- Permission to manage schema governance artifacts.

## Deterministic Steps

1. Resolve Event Schema Set identity (or verify absence for create).
2. Verify preview feature availability in target workspace.
3. Read current version policy and compatibility mode.
4. Apply minimal create/update/validate/retire action with explicit version and ownership metadata.
5. Re-read resulting state and return redacted compatibility summary.

## Fail-Fast Contract

- Fail if preview feature is unavailable.
- Fail when compatibility mode or schema version is missing.
- Fail when ownership tags for producers/consumers are missing.

## Redaction

- Redact tenant/workspace/schema-set identifiers.
- Do not reveal secrets, tokens, or endpoint credentials.
