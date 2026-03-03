---
name: workspace-git-connect
description: Connect Fabric workspaces to Git with deterministic branch mapping and conflict-safe synchronization.
argument-hint: "<workspace> <branch> [--mode <connect|reconnect|validate>]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Workspace Git Connect

Connect or validate workspace-to-repo mappings without introducing artifact drift.

## Prerequisites

- Fabric workspaces for dev/test/prod with deployment pipeline access.
- Git repository with protected branches and pull request workflow.
- Service principal or user identity authorized for promotion automation.
- Artifact ownership model across notebooks, pipelines, models, and reports.

## Steps

1. Validate repository permissions, branch protection, and workspace access.
2. Map workspace artifacts to branch paths and naming conventions.
3. Run initial sync with conflict checks and documented handling.
4. Record synchronization status and unresolved merge actions.

## Output

- Workspace Git mapping status report.
- Conflict remediation list with owner and resolution plan.
