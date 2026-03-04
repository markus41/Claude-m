---
name: exploration-manage
description: Manage Fabric graph and geospatial exploration workflows with deterministic validation and preview guardrails.
argument-hint: "<create|update|list|delete|validate|run> [options]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Exploration Manage

Manage exploration workflows that combine graph traversal and geospatial analysis patterns.

## Preview Caveat

Exploration workflow surfaces are preview-heavy. Runtime semantics and orchestration options can change between releases.

## Prerequisites And Permissions

- `/graph-geo-setup` baseline and readiness completed.
- Workspace read/write access for exploration artifacts.
- Permissions to execute underlying graph querysets and map assets.
- Integration context requirements in [`docs/integration-context.md`](../../docs/integration-context.md).

## Deterministic Steps

1. Validate requested exploration action and required identifiers.
2. Capture baseline definitions for linked graph and map dependencies.
3. Apply requested create/update/delete/validate/run operation.
4. Perform deterministic post-run verification on linked dependencies.
5. Return redacted summary with drift, failure, and remediation details.

## Fail-Fast And Redaction

- Fail immediately on missing context, missing linked dependencies, or insufficient grants.
- Require explicit user confirmation for destructive operations.
- Redact all sensitive identifiers and omit secrets from logs and output.

## Output

- Exploration workflow action status.
- Linked dependency validation results.
- Redacted remediation plan if verification fails.
