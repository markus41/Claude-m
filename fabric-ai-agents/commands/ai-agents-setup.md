---
name: ai-agents-setup
description: Validate and initialize Fabric AI agent workflow prerequisites with preview guardrails.
argument-hint: "[--workspace <id>] [--cloud <AzureCloud>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Ai Agents Setup

Validate prerequisites and integration context for Fabric AI and operations agent workflows.

## Preview Caveat

This workflow targets preview-heavy Fabric capabilities. APIs, item contracts, and permissions may change; verify current behavior in the target tenant before applying mutations.

## Prerequisites And Permissions

- Integration context contract available: [`docs/integration-context.md`](../../docs/integration-context.md).
- Required context: `tenantId`, `environmentCloud`, `principalType`, `scopesOrRoles`.
- Target workspace access with read permission (write permission if creating setup artifacts).
- Any linked Azure resource permissions if external dependencies are validated.

## Deterministic Steps

1. Validate required integration context fields and reject missing or malformed values.
2. Resolve target workspace and confirm minimum read permissions.
3. Inventory existing agent-related items and capture a read-only baseline.
4. Validate preview prerequisites (supported item types, required bindings, expected feature toggles).
5. Produce a setup readiness report with blocking gaps and exact remediation actions.

## Fail-Fast And Redaction

- Fail fast before any network call on missing context or insufficient permissions.
- Redact tenant, workspace, subscription, and principal identifiers in output.
- Never print secrets, token material, or full credential payloads.

## Output

- Readiness status: `ready` or `blocked`.
- Baseline inventory summary (redacted IDs).
- Ordered remediation actions for any blocking gaps.
