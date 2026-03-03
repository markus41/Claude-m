---
name: deployment-pipeline-release
description: Execute Fabric deployment pipeline promotions with preflight checks, evidence capture, and post-release validation.
argument-hint: "<from-stage> <to-stage> [--dry-run] [--change-ticket <id>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Deployment Pipeline Release

Promote Fabric artifacts between stages using reproducible release controls.

## Prerequisites

- Fabric workspaces for dev/test/prod with deployment pipeline access.
- Git repository with protected branches and pull request workflow.
- Service principal or user identity authorized for promotion automation.
- Artifact ownership model across notebooks, pipelines, models, and reports.

## Steps

1. Run preflight checks for source health and target readiness.
2. Review artifact diff and classify breaking versus additive changes.
3. Execute promotion with approval evidence and release notes.
4. Run post-release smoke checks for core artifact types.

## Output

- Release summary with promoted artifacts and validation status.
- Failure recovery and rollback actions when gates fail.
