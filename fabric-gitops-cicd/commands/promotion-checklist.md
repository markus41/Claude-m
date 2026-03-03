---
name: promotion-checklist
description: Generate a production promotion checklist covering data readiness, dependency safety, and rollback controls.
argument-hint: "[--target <test|prod>] [--strict]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Promotion Checklist

Create a release checklist that prevents hidden cross-workspace and data contract regressions.

## Prerequisites

- Fabric workspaces for dev/test/prod with deployment pipeline access.
- Git repository with protected branches and pull request workflow.
- Service principal or user identity authorized for promotion automation.
- Artifact ownership model across notebooks, pipelines, models, and reports.

## Steps

1. Inventory artifact dependencies including credentials and schedules.
2. Validate contract compatibility for schemas and measures.
3. Define verification tests and alert thresholds post-deployment.
4. Attach rollback checkpoints and ownership before approval.

## Output

- Environment-specific promotion checklist.
- Explicit go/no-go criteria for release approvers.
