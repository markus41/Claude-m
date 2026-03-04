---
name: Azure DevOps Pipelines
description: >
  Deep expertise in Azure Pipelines — YAML CI/CD pipelines, classic releases, deployment
  environments with approval gates, agent pools, variable groups, service connections,
  and deployment strategies across any language and platform.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - yaml pipeline
  - azure pipeline
  - ado pipeline
  - release pipeline
  - classic release
  - deployment environment
  - approval gate
  - agent pool
  - self-hosted agent
  - variable group
  - service connection
  - deployment strategy
  - pipeline trigger
---

# Azure DevOps Pipelines

## Shared Workflow Routing
- Use the shared workflow spec for deterministic multi-plugin routing: [`workflows/multi-plugin-workflows.md`](../../../workflows/multi-plugin-workflows.md#incident-triage-azure-monitor--azure-functions--azure-devops).

## Overview

Azure Pipelines provides CI/CD for any language, platform, and cloud. YAML pipelines are the recommended approach — version-controlled, code-reviewed, and template-extensible. Classic release pipelines remain supported for existing deployments but should be migrated to YAML multi-stage pipelines for new projects.

Key concepts: **stages** group jobs, **jobs** run on agents, **steps** execute tasks/scripts. Deployment environments provide approval gates, audit history, and resource targeting. Service connections authenticate to external services using Workload Identity Federation (WIF), managed identity, or service principals.

## REST API — Pipelines

| Method | Endpoint | Required Permissions | Key Parameters |
|--------|----------|---------------------|----------------|
| GET | `/_apis/pipelines?api-version=7.1` | Build (Read) | `$top`, `orderBy` |
| GET | `/_apis/pipelines/{pipelineId}?api-version=7.1` | Build (Read) | `pipelineVersion` |
| POST | `/_apis/pipelines?api-version=7.1` | Build (Read & Write) | Body: `name`, `folder`, `configuration` |
| POST | `/_apis/pipelines/{pipelineId}/runs?api-version=7.1` | Build (Read & Execute) | Body: `resources`, `variables`, `stagesToSkip` |
| GET | `/_apis/pipelines/{pipelineId}/runs?api-version=7.1` | Build (Read) | `$top` |
| GET | `/_apis/pipelines/{pipelineId}/runs/{runId}?api-version=7.1` | Build (Read) | — |

## REST API — Builds (Classic)

| Method | Endpoint | Key Parameters |
|--------|----------|----------------|
| POST | `/_apis/build/builds?api-version=7.1` | Body: `definition`, `sourceBranch` |
| GET | `/_apis/build/builds/{buildId}?api-version=7.1` | — |
| GET | `/_apis/build/builds?api-version=7.1` | `definitions`, `branchName`, `statusFilter` |
| GET | `/_apis/build/builds/{buildId}/logs/{logId}?api-version=7.1` | `startLine`, `endLine` |

## REST API — Releases (Classic)

| Method | Endpoint | Key Parameters |
|--------|----------|----------------|
| GET | `/_apis/release/definitions?api-version=7.1` | `$top`, `searchText` |
| POST | `/_apis/release/releases?api-version=7.1` | Body: `definitionId`, `artifacts` |
| GET | `/_apis/release/releases/{releaseId}?api-version=7.1` | `$expand` |
| PATCH | `/_apis/release/releases/{releaseId}/environments/{envId}?api-version=7.1` | Body: `status`, `comment` |

Note: Release API uses `vsrm.dev.azure.com` base URL.

## REST API — Environments

| Method | Endpoint | Key Parameters |
|--------|----------|----------------|
| GET | `/_apis/distributedtask/environments?api-version=7.1` | `name`, `$top` |
| POST | `/_apis/distributedtask/environments?api-version=7.1` | Body: `name`, `description` |
| DELETE | `/_apis/distributedtask/environments/{envId}?api-version=7.1` | — |
| GET | `/_apis/pipelines/checks/configurations?api-version=7.1-preview` | `resourceType`, `resourceId` |
| POST | `/_apis/pipelines/checks/configurations?api-version=7.1-preview` | Body: check configuration |

## REST API — Agent Pools

| Method | Endpoint | Key Parameters |
|--------|----------|----------------|
| GET | `/_apis/distributedtask/pools?api-version=7.1` | `poolName`, `poolType` |
| GET | `/_apis/distributedtask/pools/{poolId}/agents?api-version=7.1` | `includeCapabilities` |

## YAML Pipeline Structure

```yaml
trigger:
  branches:
    include: [main]
  paths:
    include: [src/**]

pool:
  vmImage: 'ubuntu-latest'

stages:
  - stage: Build
    jobs:
      - job: BuildJob
        steps:
          - script: npm ci && npm test
  - stage: Deploy
    dependsOn: Build
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: DeployProd
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - script: echo "Deploying"
```

## Key Concepts

- **Triggers**: CI (branch), PR, scheduled (`cron`), pipeline completion, manual.
- **Templates**: `extends` for mandatory org standards, `template` for reusable steps/jobs/stages.
- **Environments**: Named targets with approval gates, exclusive locks, and deployment history.
- **Service connections**: Authenticated endpoints (Azure, Docker, K8s) — prefer WIF over SP+secret.
- **Variable groups**: Shared variables linked to Key Vault; authorize per-pipeline.
- **Deployment strategies**: `runOnce`, `rolling`, `canary` with lifecycle hooks.
- **Agent pools**: Microsoft-hosted (ubuntu/windows/macos-latest) or self-hosted with custom capabilities.

## Best Practices

- Use YAML pipelines over Classic for version control, code review, and template reuse.
- Use `extends` templates to enforce organization-wide security and compliance.
- Store secrets in variable groups linked to Azure Key Vault — never in YAML.
- Use Workload Identity Federation for service connections — eliminates secret rotation.
- Configure environments with approval checks for production deployments.
- Use path-based triggers to avoid unnecessary pipeline runs.
- Pin task versions (`@2` not `@latest`) to avoid breaking changes.
- Use `condition:` to skip stages/jobs based on branch, variables, or previous results.

## Progressive Disclosure — Reference Files

| Topic | File |
|---|---|
| YAML schema, triggers, templates, expressions, deployment strategies | [`references/pipelines-yaml.md`](./references/pipelines-yaml.md) |
| Classic release definitions, stages, gates, migration to YAML | [`references/classic-releases.md`](./references/classic-releases.md) |
| Deployment environments, approval checks, gates, exclusive locks | [`references/environments-approvals.md`](./references/environments-approvals.md) |
| Agent pools, self-hosted setup, capabilities/demands, scale sets | [`references/agent-pools.md`](./references/agent-pools.md) |
| Variable groups, Key Vault linking, secure files, secret management | [`references/variable-groups-library.md`](./references/variable-groups-library.md) |
| Service connections — WIF, managed identity, SP, ARM, Docker, K8s | [`references/service-connections.md`](./references/service-connections.md) |
