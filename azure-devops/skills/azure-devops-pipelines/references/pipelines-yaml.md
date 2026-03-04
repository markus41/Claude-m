# Azure Pipelines YAML Reference

## Overview

Azure Pipelines supports fully declarative CI/CD through YAML pipeline definitions stored in source control. This reference covers the complete YAML schema, trigger types, template patterns, variable management, deployment strategies, and the most common production gotchas.

---

## REST API Endpoints

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/_apis/pipelines?api-version=7.1` | Build (Read) | `$top`, `continuationToken`, `orderBy` | Lists all YAML and Classic pipelines |
| GET | `/_apis/pipelines/{pipelineId}?api-version=7.1` | Build (Read) | `pipelineVersion` | Returns pipeline definition with YAML reference |
| POST | `/_apis/pipelines?api-version=7.1` | Build (Read & Write) | Body: `name`, `folder`, `configuration` | Creates a new pipeline pointing at a YAML file |
| POST | `/_apis/pipelines/{pipelineId}/runs?api-version=7.1` | Build (Read & Execute) | Body: `resources`, `variables`, `stagesToSkip` | Triggers a pipeline run |
| GET | `/_apis/pipelines/{pipelineId}/runs?api-version=7.1` | Build (Read) | `$top`, continuationToken | Lists runs for a pipeline |
| GET | `/_apis/pipelines/{pipelineId}/runs/{runId}?api-version=7.1` | Build (Read) | — | Gets run details, state, result |
| GET | `/_apis/build/builds/{buildId}/logs?api-version=7.1` | Build (Read) | — | Lists log containers for a build |
| GET | `/_apis/build/builds/{buildId}/logs/{logId}?api-version=7.1` | Build (Read) | `startLine`, `endLine` | Streams plain-text log |
| PATCH | `/_apis/build/builds/{buildId}?api-version=7.1` | Build (Read & Write) | Body: `keepForever`, `retainedByRelease` | Update retention on a specific build |
| GET | `/_apis/distributedtask/environments?api-version=7.1` | — | `name` | Lists deployment environments |
| POST | `/_apis/distributedtask/environments?api-version=7.1` | Project Admin | Body: `name`, `description` | Creates a deployment environment |

---

## YAML Schema Reference

### Top-Level Keys

```yaml
# Required for classic YAML pipelines
name: $(Date:yyyyMMdd)$(Rev:.r)         # Build number format
appendCommitMessageToRunName: true      # Appends commit message to run display name

trigger:                                # CI trigger (push-based)
  batch: true                           # Batch concurrent pushes
  branches:
    include: [main, release/*]
    exclude: [draft/*]
  paths:
    include: [src/**, tests/**]
    exclude: ['**/*.md']
  tags:
    include: ['v*']

pr:                                     # Pull request trigger
  branches:
    include: [main]
  paths:
    include: [src/**]
  drafts: false                         # Skip draft PRs

schedules:
  - cron: '0 3 * * 1-5'               # UTC, weekdays at 03:00
    displayName: Nightly build
    branches:
      include: [main]
    always: true                        # Run even if no code change

resources:
  repositories:
    - repository: templates             # Alias used in template references
      type: git
      name: MyProject/shared-templates
      ref: refs/heads/main
  pipelines:
    - pipeline: upstream               # Alias for pipeline resource
      project: MyProject
      source: 'Build Pipeline'
      trigger:
        branches: [main]

variables:
  - group: my-variable-group           # Variable group reference
  - name: buildConfiguration
    value: Release
  - name: isMain
    value: $[ eq(variables['Build.SourceBranch'], 'refs/heads/main') ]

pool:                                   # Default pool for all jobs
  vmImage: ubuntu-latest

stages:
  - stage: Build
    ...
```

### Stages, Jobs, and Steps

```yaml
stages:
  - stage: Build
    displayName: Build and Test
    dependsOn: []                       # Empty = no dependency (parallel-capable)
    condition: always()
    variables:
      stageVar: value
    jobs:
      - job: Compile
        displayName: Compile Application
        timeoutInMinutes: 30
        cancelTimeoutInMinutes: 5
        continueOnError: false
        workspace:
          clean: all                    # all | resources | outputs
        pool:
          vmImage: ubuntu-latest
        steps:
          - checkout: self
            clean: true
            fetchDepth: 1              # Shallow clone for speed
            lfs: false
          - task: UseNode@1
            inputs:
              version: '20.x'
          - script: npm ci
            displayName: Install dependencies
            env:
              NPM_TOKEN: $(npmToken)   # Map secret variable to env
          - script: npm run build
          - script: npm test -- --ci --reporters=default --reporters=jest-junit
          - task: PublishTestResults@2
            condition: succeededOrFailed()
            inputs:
              testResultsFormat: JUnit
              testResultsFiles: '**/junit.xml'
              mergeTestResults: true
          - task: PublishCodeCoverageResults@2
            inputs:
              summaryFileLocation: coverage/lcov.info
          - task: PublishPipelineArtifact@1
            inputs:
              targetPath: dist/
              artifact: drop
              publishLocation: pipeline

  - stage: Deploy_Staging
    dependsOn: Build
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: DeployStaging
        environment: staging            # References an Environment resource
        strategy:
          runOnce:
            deploy:
              steps:
                - task: DownloadPipelineArtifact@2
                  inputs:
                    artifact: drop
                    path: $(Pipeline.Workspace)/drop
                - script: ./deploy.sh staging

  - stage: Deploy_Prod
    dependsOn: Deploy_Staging
    condition: and(succeeded(), eq(variables.isMain, true))
    jobs:
      - deployment: DeployProd
        environment: production         # Approval gates defined in Environment
        strategy:
          runOnce:
            preDeploy:
              steps:
                - script: echo "Pre-deploy checks"
            deploy:
              steps:
                - script: ./deploy.sh production
            routeTraffic:
              steps:
                - script: echo "Traffic routing"
            postRouteTraffic:
              steps:
                - script: ./smoke-tests.sh
            on:
              success:
                steps:
                  - script: echo "Deployment succeeded"
              failure:
                steps:
                  - script: ./rollback.sh
```

### Deployment Strategies

```yaml
# runOnce — deploy to all targets in one pass
strategy:
  runOnce:
    deploy:
      steps: [...]

# rolling — update a percentage of targets at a time
strategy:
  rolling:
    maxParallel: 25%           # or integer
    preDeploy:
      steps: [...]
    deploy:
      steps: [...]
    routeTraffic:
      steps: [...]
    postRouteTraffic:
      steps: [...]
    on:
      success:
        steps: [...]
      failure:
        steps: [...]

# canary — gradual traffic shift
strategy:
  canary:
    increments: [10, 50]       # Percentage steps
    preDeploy:
      steps: [...]
    deploy:
      steps: [...]
    routeTraffic:
      steps: [...]
    postRouteTraffic:
      steps: [...]
    on:
      success:
        steps: [...]
      failure:
        steps: [...]
```

### Matrix Strategy

```yaml
jobs:
  - job: Test
    strategy:
      matrix:
        node18_linux:
          nodeVersion: '18.x'
          vmImage: 'ubuntu-latest'
        node20_linux:
          nodeVersion: '20.x'
          vmImage: 'ubuntu-latest'
        node20_windows:
          nodeVersion: '20.x'
          vmImage: 'windows-latest'
      maxParallel: 3
    pool:
      vmImage: $(vmImage)
    steps:
      - task: UseNode@1
        inputs:
          version: $(nodeVersion)
      - script: npm test
```

---

## Template References

### Extending a Template (enforce standards)

```yaml
# azure-pipelines.yml
extends:
  template: templates/security-baseline.yml@templates
  parameters:
    buildPool: ubuntu-latest
    runSecurityScan: true
```

```yaml
# templates/security-baseline.yml
parameters:
  - name: buildPool
    type: string
    default: ubuntu-latest
  - name: runSecurityScan
    type: boolean
    default: true

stages:
  - stage: Build
    pool:
      vmImage: ${{ parameters.buildPool }}
    jobs:
      - job: BuildJob
        steps:
          - ${{ if eq(parameters.runSecurityScan, true) }}:
            - task: CredScan@2
          - template: steps/compile.yml
```

### Step Template

```yaml
# templates/steps/run-tests.yml
parameters:
  - name: testProject
    type: string
  - name: coverageThreshold
    type: number
    default: 80

steps:
  - script: |
      dotnet test ${{ parameters.testProject }} \
        --collect:"XPlat Code Coverage" \
        --results-directory $(Agent.TempDirectory)
  - task: reportgenerator@5
    inputs:
      reports: '$(Agent.TempDirectory)/**/coverage.cobertura.xml'
      targetdir: coveragereport
```

---

## Variable Groups and Secrets

```yaml
# Reference a variable group (classic or Key Vault-linked)
variables:
  - group: Production-Secrets         # Contains Key Vault references
  - group: Build-Config
  - name: additionalVar
    value: overrideValue

# Use a secret in a step — never echo secrets
steps:
  - script: ./deploy.sh
    env:
      API_KEY: $(apiKey)             # $(apiKey) maps to the group variable
      CONNECTION_STRING: $(connectionString)
```

**Key Vault-linked variable group setup** (REST API):
```json
POST /_apis/distributedtask/variablegroups?api-version=7.1
{
  "name": "Production-Secrets",
  "type": "AzureKeyVault",
  "isShared": false,
  "variables": {},
  "providerData": {
    "serviceEndpointId": "<service-connection-id>",
    "vault": "my-keyvault-name",
    "lastRefreshedOn": "2026-01-01T00:00:00Z"
  }
}
```

---

## Environments and Approval Gates

```yaml
# Reference an environment in a deployment job
- deployment: DeployProd
  environment:
    name: production
    resourceType: VirtualMachine    # or Kubernetes, or none
    tags: role:web                  # Target only matching VMs
```

**Approval gate via REST** (configure on the environment, not in YAML):
```
POST /_apis/pipelines/checks/configurations?api-version=7.1
{
  "type": { "id": "8c6f20a7-a545-4486-9777-f762fafe0d4d" },  // Approvals and Checks
  "settings": {
    "approvers": [{ "id": "<user-or-group-id>" }],
    "requiredApproverCount": 1,
    "allowApproversToApproveSelfBuilds": false,
    "instructions": "Please verify the staging smoke tests passed."
  },
  "resource": {
    "type": "environment",
    "id": "<environment-id>"
  },
  "timeout": 43200   // 12 hours in minutes
}
```

---

## Service Connections in Pipelines

```yaml
# Azure Resource Manager service connection
- task: AzureCLI@2
  inputs:
    azureSubscription: 'MyAzureServiceConnection'
    scriptType: bash
    scriptLocation: inlineScript
    inlineScript: |
      az group list --output table

# Docker registry service connection
- task: Docker@2
  inputs:
    containerRegistry: 'MyACRConnection'
    repository: myapp
    command: buildAndPush
    tags: $(Build.BuildId)
```

---

## Pipeline Artifact Publish and Download

```yaml
# Publish (within a pipeline)
- task: PublishPipelineArtifact@1
  inputs:
    targetPath: $(Build.ArtifactStagingDirectory)
    artifact: webapp
    publishLocation: pipeline

# Download in subsequent stage/job
- task: DownloadPipelineArtifact@2
  inputs:
    buildType: current
    artifact: webapp
    targetPath: $(Pipeline.Workspace)/webapp
```

---

## Expressions and Conditions

```yaml
# Condition syntax
condition: and(succeeded(), eq(variables['Build.Reason'], 'PullRequest'))
condition: or(failed(), canceled())
condition: eq(variables.isMain, true)
condition: startsWith(variables['Build.SourceBranch'], 'refs/heads/release/')

# Runtime expression (evaluated at run time, not queue time)
variables:
  isRelease: $[ startsWith(variables['Build.SourceBranch'], 'refs/tags/') ]

# Compile-time expression (evaluated when pipeline is compiled)
steps:
  - ${{ if eq(parameters.environment, 'prod') }}:
    - script: echo "Production step"
  - ${{ each item in parameters.services }}:
    - script: deploy ${{ item }}
```

---

## Error Codes and Failure Modes

| Code / Error | Meaning | Remediation |
|---|---|---|
| `TF400813` | User not authorized for the resource | Check PAT scopes and project permissions |
| `TF400856` | Pipeline does not have access to service connection | Grant pipeline access to service connection in the connection settings |
| `YAML compile error` | Template reference not found or invalid schema | Validate YAML with `/_apis/pipelines?validateOnly=true` endpoint |
| `No hosted agents available` | Parallel job limit reached | Wait, or purchase additional parallel jobs |
| `Pool does not exist` | Agent pool name mismatch | Verify pool name in Organization settings > Agent pools |
| `##[error]The directory does not exist` | Artifact download path missing | Ensure publish step ran in prior stage and artifact name matches |
| Agent disconnect mid-job | Agent machine lost connectivity | Check self-hosted agent machine health; retry with hosted agent |
| `Timeout` on approval | Approval gate expired before approval | Increase timeout value on environment check, or re-run pipeline |
| Key Vault variable group refresh failed | Service connection expired or RBAC removed | Re-authorize service connection; verify Key Vault access policy |

---

## Limits

| Resource | Limit | Notes |
|---|---|---|
| YAML pipeline file size | 1 MB | Split into templates for large pipelines |
| Template nesting depth | 50 levels | Rarely hit in practice |
| Variables per pipeline | 500 | Includes all variable groups |
| Variable value length | 32,768 characters | Truncated if exceeded |
| Free hosted agents (public) | Unlimited (10 parallel) | Microsoft-hosted Linux/Windows/macOS |
| Free hosted agents (private org) | 1 free parallel job | Purchase additional for concurrent builds |
| Self-hosted agents | Unlimited registrations | Capacity limited by machine resources |
| Retention: free tier | 30 days / 1 GB artifacts | Configure retention policies per project |
| Max pipeline run duration | 60 minutes (hosted, free) / 360 minutes (paid) | Self-hosted agents: no limit by default |
| Matrix combinations | 256 per job | Combine with `maxParallel` to throttle |
| Stages per pipeline | No hard limit | Recommend < 50 for UI usability |
| Artifact size per publish | 10 GB | Universal Packages support larger sizes |

---

## Common Patterns and Gotchas

**1. Secrets are masked but never use `echo`**
Pipeline secrets are masked in logs (`***`), but environment variables printed with `echo $SECRET` still leak if the value appears in a command result. Always use task inputs with secret mapping, not inline `echo`.

**2. `always()` vs `succeededOrFailed()`**
`always()` runs even when the pipeline is canceled. `succeededOrFailed()` does not run on cancellation. Use `succeededOrFailed()` for cleanup steps; use `always()` only when cancellation cleanup is required.

**3. `dependsOn: []` makes a stage parallel**
Omitting `dependsOn` causes Azure Pipelines to infer sequential dependencies. Set `dependsOn: []` explicitly to enable parallel stage execution.

**4. Queue-time vs. runtime variables**
Variables marked `settable at queue time` can be overridden when manually triggering. Runtime expressions `$[...]` are evaluated per run; compile-time expressions `${{...}}` are evaluated when the YAML is parsed. Mixing them in the same pipeline requires care.

**5. Protected resources require pipeline authorization**
Service connections, variable groups, and agent pools marked as protected require explicit pipeline authorization. Failing to grant access causes a paused run waiting for user confirmation—not an error.

**6. Shallow clone can break semantic versioning tools**
`fetchDepth: 1` speeds up checkout but breaks tools that count commits (GitVersion, nbgv). Set `fetchDepth: 0` for release pipelines.

**7. Use `PublishPipelineArtifact` not `PublishBuildArtifacts`**
`PublishBuildArtifacts` (v1) is the older task using Azure Artifacts storage. `PublishPipelineArtifact` (v1) uses the newer pipeline artifact storage with faster upload/download and better retention controls. Use the newer task for all new pipelines.

**8. `extends` templates cannot be overridden by the consuming pipeline**
If a step in an `extends` template is marked as a required step, the consuming pipeline cannot remove or reorder it. This is the recommended pattern for corporate security baselines.

**9. Multi-repo checkouts change the working directory**
When checking out multiple repositories, the primary repo is no longer at `$(System.DefaultWorkingDirectory)` — each repo goes into a subdirectory. Use `$(Build.SourcesDirectory)/<alias>` to reference files.

**10. Variable group changes do not apply to in-flight runs**
Variable group values are captured at run queue time. Updating a Key Vault secret or variable group value does not affect already-running pipelines. Re-run the pipeline to pick up new values.
