---
name: workspace-rbac-design
description: Design Fabric workspace role assignments using least-privilege access and separation of duties.
argument-hint: "<workspace> [--persona-map <file>] [--strict]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Workspace RBAC Design

Design RBAC patterns that minimize privilege while preserving delivery velocity.

## Prerequisites

- Fabric admin or security governance permissions for target workspaces.
- Documented data classification policy and sensitivity label taxonomy.
- Identity groups mapped to business roles for access control.
- Audit and compliance stakeholders for policy review and sign-off.

## Steps

1. Map personas to required actions and remove unnecessary elevated roles.
2. Separate authoring, release, and administration responsibilities.
3. Define group-based assignment strategy and exception handling.
4. Plan periodic access review cadence with accountable owners.

## Output

- Role assignment matrix by persona and workspace.
- Exception register for temporary elevated access.
