---
name: xmla-deploy
description: Plan and execute XMLA deployments for semantic models with diff review, rollback, and environment safety checks.
argument-hint: "<source-env> <target-env> [--what-if] [--rollback-tag <tag>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# XMLA Deploy

Deploy semantic model changes through XMLA with deterministic promotion and rollback planning.

## Prerequisites

- Fabric workspace with Contributor or Admin permissions.
- XMLA endpoint access for deployment and model operations.
- Access to lakehouse or warehouse source tables used by semantic models.
- Power BI Desktop, Tabular Editor, or equivalent model authoring tooling.

## Steps

1. Diff source and target model metadata before deployment.
2. Classify changes by risk and refresh impact.
3. Execute deployment with environment-specific parameter mapping.
4. Validate security roles and critical measures after release.

## Output

- Deployment record with change classification and validation results.
- Rollback-ready checklist and outstanding post-release tasks.
