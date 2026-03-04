---
name: anomaly-detector-manage
description: Manage Fabric anomaly detector workflows with deterministic checks and preview guardrails.
argument-hint: "<create|update|list|delete|validate> [options]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Anomaly Detector Manage

Create, update, validate, list, or retire anomaly detector workflow configurations.

## Preview Caveat

Anomaly detector surfaces are in preview. Detection schema, thresholds, and run behaviors may change across releases.

## Prerequisites And Permissions

- Run `/ai-agents-setup` first for baseline validation.
- Workspace read/write access for anomaly-related items.
- Integration context fields and minimum permissions defined in [`docs/integration-context.md`](../../docs/integration-context.md).
- Explicit confirmation required before delete or destructive update operations.

## Deterministic Steps

1. Validate command intent (`create|update|list|delete|validate`) and required identifiers.
2. Pull current detector state and checkpoint baseline configuration.
3. Apply the requested change or run validation-only checks.
4. Re-read detector configuration and execution status to verify expected state.
5. Return a redacted diff summary with any rollback recommendation.

## Fail-Fast And Redaction

- Fail immediately when required context, permissions, or target IDs are missing.
- Block destructive actions unless explicit user confirmation is present.
- Redact all identifiers and operational handles in shared output.

## Output

- Operation result and post-check verification status.
- Configuration diff (redacted) and compatibility notes.
- If failed: exact blocking reason and deterministic next step.
