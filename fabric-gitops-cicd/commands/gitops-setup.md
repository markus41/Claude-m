---
name: gitops-setup
description: Set up Fabric GitOps foundations: repository model, branch controls, promotion policy, and environment ownership.
argument-hint: "[--repo <url>] [--branch-model <trunk|gitflow>] [--minimal]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# GitOps Setup

Create a deterministic Fabric delivery baseline before connecting workspaces and pipeline stages.

## Prerequisites

- Fabric workspaces for dev/test/prod with deployment pipeline access.
- Git repository with protected branches and pull request workflow.
- Service principal or user identity authorized for promotion automation.
- Artifact ownership model across notebooks, pipelines, models, and reports.

## Steps

1. Define environment boundaries and map each workspace to a deployment stage.
2. Select branch strategy and required pull request checks.
3. Define promotion policy including approvers and rollback responsibilities.
4. Document release evidence requirements for each stage transition.

## Output

- GitOps baseline document for Fabric artifacts.
- Gap list for missing controls before automated release.
