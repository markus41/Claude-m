---
name: org-app-permission-model
description: Define and verify a least-privilege Fabric org app permission model with deterministic approval and validation flow.
argument-hint: "[--app <name>] [--audience <group>] [--mode <draft|enforce>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# org-app-permission-model

## Preview Caveat

Org app permission surfaces for Fabric distribution are preview. Validate role mappings and assignment behavior in a non-production scope first.

## Prerequisites and Permissions

- Integration context is valid per [`docs/integration-context.md`](../../docs/integration-context.md).
- Caller has tenant-level app permission governance rights.
- Audience group inventory and owner approvals are available.

## Deterministic Steps

1. Validate integration context, role grants, and target app identity.
2. Collect current permission and audience assignments with read-only queries.
3. Map personas to required app capabilities and define least-privilege assignments.
4. Validate proposed grants against policy constraints and separation-of-duties checks.
5. Apply permission model changes in explicit batches with change evidence.
6. Re-query assignments and return a redacted before/after permission summary.

## Fail-Fast and Redaction

- Stop on missing context, unresolved owner approvals, or policy violations.
- Require explicit confirmation for broad audience or tenant-wide grants.
- Redact tenant, group, and principal identifiers in outputs.
