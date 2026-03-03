---
name: Azure DevOps
description: >
  Deep expertise in Azure DevOps REST API — manage repositories, branches, pull requests,
  build and release pipelines (YAML and Classic), work items, boards, sprints, and
  artifact feeds across Azure DevOps organizations and projects.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - azure devops
  - ado
  - devops pipeline
  - work item
  - pull request
  - azure repos
  - yaml pipeline
  - build pipeline
  - release pipeline
  - sprint board
  - devops board
  - artifact feed
  - incident triage workflow
---

# Azure DevOps

## Shared Workflow Routing
- Use the shared workflow spec for deterministic multi-plugin routing: [`workflows/multi-plugin-workflows.md`](../../../workflows/multi-plugin-workflows.md#incident-triage-azure-monitor--azure-functions--azure-devops).
- Apply the trigger phrases, handoff contracts, auth prerequisites, validation checkpoints, and stop conditions before escalating to the next plugin.


## Azure DevOps Overview

Azure DevOps is Microsoft's integrated DevOps platform providing five core services:

1. **Azure Repos** — Git repositories with branch policies, pull requests, and code review.
2. **Azure Pipelines** — CI/CD pipelines (YAML-based or Classic designer) supporting any language and platform.
3. **Azure Boards** — Agile project management with work items, boards, backlogs, and sprints.
4. **Azure Artifacts** — Package feeds for NuGet, npm, Maven, Python, and Universal Packages.
5. **Azure Test Plans** — Manual and exploratory testing tools.

## REST API Overview

Base URL: `https://dev.azure.com/{organization}/{project}/_apis`

API version is specified via the `api-version` query parameter. Current stable version: `7.1`.

Authentication: Personal Access Token (PAT) via Basic auth header:
```
Authorization: Basic base64(:<PAT>)
```

Or OAuth 2.0 with Azure AD tokens using scope `499b84ac-1321-427f-aa17-267ca6975798/.default`.

## Repositories

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List repos | GET | `/_apis/git/repositories?api-version=7.1` |
| Get repo | GET | `/_apis/git/repositories/{repoId}?api-version=7.1` |
| Create repo | POST | `/_apis/git/repositories?api-version=7.1` |
| Delete repo | DELETE | `/_apis/git/repositories/{repoId}?api-version=7.1` |
| List branches | GET | `/_apis/git/repositories/{repoId}/refs?filter=heads/&api-version=7.1` |
| Get items (files) | GET | `/_apis/git/repositories/{repoId}/items?path=/&api-version=7.1` |

### Branch Policies

Branch policies enforce code quality gates on pull requests:

| Policy Type | Description |
|------------|-------------|
| Minimum reviewers | Require N approvals before merge |
| Build validation | Require a successful build pipeline run |
| Comment resolution | All PR comments must be resolved |
| Work item linking | Require linked work items |
| Merge strategy | Enforce squash merge, rebase, etc. |

```
POST /_apis/policy/configurations?api-version=7.1
{
  "isEnabled": true,
  "isBlocking": true,
  "type": { "id": "<policy-type-guid>" },
  "settings": {
    "minimumApproverCount": 2,
    "scope": [{
      "repositoryId": "<repo-id>",
      "refName": "refs/heads/main",
      "matchKind": "exact"
    }]
  }
}
```

## Pull Requests

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List PRs | GET | `/_apis/git/repositories/{repoId}/pullrequests?api-version=7.1` |
| Create PR | POST | `/_apis/git/repositories/{repoId}/pullrequests?api-version=7.1` |
| Get PR | GET | `/_apis/git/repositories/{repoId}/pullrequests/{prId}?api-version=7.1` |
| Update PR | PATCH | `/_apis/git/repositories/{repoId}/pullrequests/{prId}?api-version=7.1` |
| Complete PR | PATCH | Update with `status: "completed"` and `lastMergeSourceCommit` |
| List PR threads | GET | `/_apis/git/repositories/{repoId}/pullrequests/{prId}/threads?api-version=7.1` |
| Add PR comment | POST | `/_apis/git/repositories/{repoId}/pullrequests/{prId}/threads?api-version=7.1` |

**Create PR body**:
```json
{
  "sourceRefName": "refs/heads/feature/auth",
  "targetRefName": "refs/heads/main",
  "title": "Add OAuth 2.0 PKCE authentication",
  "description": "Implements the PKCE flow for SPA clients.\n\nCloses #1234",
  "reviewers": [
    { "id": "<reviewer-user-id>" }
  ]
}
```

## Pipelines (YAML)

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List pipelines | GET | `/_apis/pipelines?api-version=7.1` |
| Get pipeline | GET | `/_apis/pipelines/{pipelineId}?api-version=7.1` |
| Run pipeline | POST | `/_apis/pipelines/{pipelineId}/runs?api-version=7.1` |
| List runs | GET | `/_apis/pipelines/{pipelineId}/runs?api-version=7.1` |
| Get run | GET | `/_apis/pipelines/{pipelineId}/runs/{runId}?api-version=7.1` |

### YAML Pipeline Structure

```yaml
trigger:
  branches:
    include:
      - main
  paths:
    include:
      - src/**

pool:
  vmImage: 'ubuntu-latest'

variables:
  buildConfiguration: 'Release'

stages:
  - stage: Build
    jobs:
      - job: BuildJob
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '20.x'
          - script: npm ci
            displayName: 'Install dependencies'
          - script: npm run build
            displayName: 'Build'
          - script: npm test
            displayName: 'Run tests'
          - task: PublishTestResults@2
            inputs:
              testResultsFormat: 'JUnit'
              testResultsFiles: '**/test-results.xml'

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
                - script: echo "Deploying to production"
```

### Key Pipeline Concepts

- **Triggers**: branch triggers, PR triggers, scheduled triggers, pipeline completion triggers.
- **Stages**: logical groupings of jobs (Build, Test, Deploy). Stages run sequentially by default.
- **Jobs**: run on an agent. Multiple jobs in a stage run in parallel by default.
- **Steps**: individual tasks or scripts within a job.
- **Templates**: reusable YAML fragments. Extend pipelines with `extends` or include with `template`.
- **Environments**: deployment targets with approval gates, checks, and audit history.
- **Service connections**: authenticated connections to Azure, Docker Hub, Kubernetes, etc.
- **Variable groups**: shared variable sets linked from Azure Key Vault or defined manually.

## Build API (Classic)

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Queue build | POST | `/_apis/build/builds?api-version=7.1` |
| Get build | GET | `/_apis/build/builds/{buildId}?api-version=7.1` |
| List builds | GET | `/_apis/build/builds?api-version=7.1` |
| Get build log | GET | `/_apis/build/builds/{buildId}/logs/{logId}?api-version=7.1` |
| List definitions | GET | `/_apis/build/definitions?api-version=7.1` |

## Work Items

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Get work item | GET | `/_apis/wit/workitems/{id}?api-version=7.1` |
| Create work item | POST | `/_apis/wit/workitems/$Task?api-version=7.1` |
| Update work item | PATCH | `/_apis/wit/workitems/{id}?api-version=7.1` |
| Delete work item | DELETE | `/_apis/wit/workitems/{id}?api-version=7.1` |
| Run WIQL query | POST | `/_apis/wit/wiql?api-version=7.1` |

**Create work item** (JSON Patch format):
```json
[
  { "op": "add", "path": "/fields/System.Title", "value": "Implement login page" },
  { "op": "add", "path": "/fields/System.WorkItemType", "value": "User Story" },
  { "op": "add", "path": "/fields/System.AssignedTo", "value": "user@company.com" },
  { "op": "add", "path": "/fields/Microsoft.VSTS.Common.Priority", "value": 2 },
  { "op": "add", "path": "/fields/System.IterationPath", "value": "MyProject\\Sprint 12" },
  { "op": "add", "path": "/fields/System.AreaPath", "value": "MyProject\\Frontend" }
]
```

Content-Type for work item create/update: `application/json-patch+json`.

**Work item types**: Epic, Feature, User Story, Task, Bug, Issue, Test Case.

### WIQL (Work Item Query Language)

```sql
SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo]
FROM WorkItems
WHERE [System.TeamProject] = @project
  AND [System.WorkItemType] = 'Bug'
  AND [System.State] <> 'Closed'
  AND [System.AssignedTo] = @me
ORDER BY [Microsoft.VSTS.Common.Priority] ASC, [System.CreatedDate] DESC
```

## Artifacts

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List feeds | GET | `/_apis/packaging/feeds?api-version=7.1` |
| Create feed | POST | `/_apis/packaging/feeds?api-version=7.1` |
| List packages | GET | `/_apis/packaging/feeds/{feedId}/packages?api-version=7.1` |
| Get package versions | GET | `/_apis/packaging/feeds/{feedId}/packages/{packageId}/versions?api-version=7.1` |

## Authentication & Scopes

**Personal Access Token** scopes: `Code (Read & Write)`, `Build (Read & Execute)`, `Work Items (Read & Write)`, `Packaging (Read & Write)`, `Release (Read, Write & Execute)`.

**OAuth scopes** (Azure AD): `499b84ac-1321-427f-aa17-267ca6975798/.default` (full Azure DevOps access).

## Best Practices

- Use YAML pipelines over Classic for version control, code review, and template reuse.
- Use pipeline templates and extends to enforce organizational standards.
- Set branch policies on main/release branches: minimum 2 reviewers, build validation, comment resolution.
- Use environments with approval gates for production deployments.
- Link work items to PRs and commits for full traceability.
- Use WIQL for complex work item queries rather than the UI query builder.
- Store secrets in variable groups linked to Azure Key Vault, never in YAML files.
- Use path-based triggers to avoid unnecessary pipeline runs.

## Reference Files

| Reference | Path | Content |
|-----------|------|---------|
| REST API | `references/ado-rest-api.md` | Complete endpoint reference for repos, pipelines, work items |
| YAML Pipeline | `references/yaml-pipeline.md` | Pipeline syntax, triggers, templates, expressions |
| WIQL | `references/wiql.md` | Work Item Query Language syntax and examples |
| Branch Policies | `references/branch-policies.md` | Policy types, configuration, and enforcement |

## Example Files

| Example | Path | Content |
|---------|------|---------|
| CI/CD Pipeline | `examples/cicd-pipeline.md` | Multi-stage YAML pipeline with build, test, deploy |
| PR Automation | `examples/pr-automation.md` | Create PRs, add reviewers, auto-complete |
| Sprint Setup | `examples/sprint-setup.md` | Create iteration paths, work items, and board configuration |
| Artifact Publishing | `examples/artifact-publishing.md` | Publish and consume npm/NuGet packages |

## Knowledge references

- `references/operational-knowledge.md` — compact API surface map, prerequisite matrix, deterministic failure remediation, limits/quotas and pagination/throttling guidance, and safe-default read-first/apply-second pattern.

## Progressive Disclosure — Reference Files

| Topic | File |
|---|---|
| Operational knowledge (API surface, failure modes, limits) | [`references/operational-knowledge.md`](./references/operational-knowledge.md) |
| YAML pipeline schema, strategies, templates, secrets, approvals | [`references/pipelines-yaml.md`](./references/pipelines-yaml.md) |
| Git repositories, pull requests, branch policies, code search | [`references/repos-prs.md`](./references/repos-prs.md) |
| Work items, WIQL, boards, sprints, area/iteration paths | [`references/work-items-boards.md`](./references/work-items-boards.md) |
| Artifact feeds, package types, upstreams, retention, symbols | [`references/artifact-feeds.md`](./references/artifact-feeds.md) |
