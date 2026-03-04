---
name: ontology-manage
description: Manage Fabric ontology assets and mappings with deterministic validation and preview guardrails.
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

# Ontology Manage

Manage ontology entities, relationship mappings, and version compatibility checks.

## Preview Caveat

Ontology capabilities referenced here are preview-heavy and may have evolving schema and validation behavior.

## Prerequisites And Permissions

- `/ai-agents-setup` executed for baseline validation.
- Workspace read/write access for ontology items.
- Permission to read linked model dependencies.
- Integration context aligned to [`docs/integration-context.md`](../../docs/integration-context.md).

## Deterministic Steps

1. Validate action mode and required ontology/version identifiers.
2. Read current ontology model and dependent mapping references.
3. Apply requested model mutation or run compatibility validation.
4. Re-read ontology and dependency graph to detect drift.
5. Return a redacted compatibility report and migration notes.

## Fail-Fast And Redaction

- Stop immediately on missing IDs, invalid version inputs, or insufficient grants.
- Block destructive operations unless explicit confirmation is provided.
- Redact IDs and never reveal secret material or hidden connection details.

## Output

- Ontology action status and post-check results.
- Compatibility and dependency drift findings.
- Deterministic remediation or rollback steps.
