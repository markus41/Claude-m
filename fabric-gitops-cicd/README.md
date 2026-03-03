# Fabric GitOps CI/CD Plugin

`fabric-gitops-cicd` is an advanced Microsoft Fabric knowledge plugin for version-controlled Fabric delivery with controlled promotions across development rings.

## What This Plugin Provides

This is a **knowledge plugin**. It provides implementation guidance, deterministic command workflows, and reviewer checks. It does not include runtime binaries or MCP servers.

Install with:

```bash
/plugin install fabric-gitops-cicd@claude-m-microsoft-marketplace
```

## Prerequisites

- Fabric workspaces for dev/test/prod with deployment pipeline access.
- Git repository with protected branches and pull request workflow.
- Service principal or user identity authorized for promotion automation.
- Artifact ownership model across notebooks, pipelines, models, and reports.

## Setup

Run `/gitops-setup` first to baseline environment, permissions, and rollout constraints.

## Commands

| Command | Description |
|---|---|
| `/gitops-setup` | Set up Fabric GitOps foundations: repository model, branch controls, promotion policy, and environment ownership. |
| `/workspace-git-connect` | Connect Fabric workspaces to Git with deterministic branch mapping and conflict-safe synchronization. |
| `/deployment-pipeline-release` | Execute Fabric deployment pipeline promotions with preflight checks, evidence capture, and post-release validation. |
| `/promotion-checklist` | Generate a production promotion checklist covering data readiness, dependency safety, and rollback controls. |

## Agent

| Agent | Description |
|---|---|
| **GitOps Reviewer** | Reviews Fabric GitOps delivery for branch controls, promotion safety, deployment evidence, and rollback readiness. |

## Trigger Keywords

The skill activates when conversations mention: `fabric git integration`, `fabric deployment pipeline`, `fabric cicd`, `artifact promotion fabric`, `workspace branch strategy`, `release validation fabric`, `fabric rollback`, `fabric dev test prod`.

## Author

Markus Ahling
