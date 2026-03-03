---
name: semantic-setup
description: Prepare Fabric semantic modeling by validating workspace, XMLA endpoint, model source tables, and release boundaries.
argument-hint: "[--workspace <name>] [--model <name>] [--minimal]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Semantic Setup

Prepare a stable baseline before building or modifying a Fabric semantic model.

## Prerequisites

- Fabric workspace with Contributor or Admin permissions.
- XMLA endpoint access for deployment and model operations.
- Access to lakehouse or warehouse source tables used by semantic models.
- Power BI Desktop, Tabular Editor, or equivalent model authoring tooling.

## Steps

1. Confirm workspace, environment ring, and semantic model ownership.
2. Validate XMLA endpoint mode, permissions, and authentication path.
3. Confirm source object readiness and refresh dependencies.
4. Record versioning and rollback expectations before model changes.

## Output

- Setup summary with validated prerequisites and gaps.
- Action list for unresolved access, source, or environment issues.
