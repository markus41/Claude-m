# Pipeline Monitoring and Analysis Reference

Pipeline status queries, build failure analysis, flaky test detection, deployment
frequency calculations, and YAML templates for Azure DevOps CI/CD pipelines.

## Pipeline Status Taxonomy

### Build Result Values

| Result | Description | Action |
|--------|-------------|--------|
| `succeeded` | All stages completed successfully | No action needed |
| `partiallySucceeded` | Some stages failed but build continued | Review failed stages |
| `failed` | Build terminated due to error | Investigate root cause |
| `canceled` | Build was manually or automatically canceled | Check who/why |

### Build Status Values

| Status | Description |
|--------|-------------|
| `completed` | Run finished (check result for outcome) |
| `inProgress` | Run is currently executing |
| `notStarted` | Run queued but not yet started |
| `cancelling` | Cancellation in progress |

### Failure Categories

| Category | Indicators | Severity | Remediation |
|----------|-----------|----------|-------------|
| **Compilation** | MSBuild/dotnet build errors, syntax errors | High | Fix code errors, restore packages |
| **Test** | Test runner reports failures, assertion errors | High | Fix failing tests or mark as known |
| **Infrastructure** | Agent offline, timeout, resource limits | High | Check agent pool, increase resources |
| **Dependency** | NuGet/npm restore failures, feed auth errors | Medium | Fix feed access, update packages |
| **Configuration** | Missing variables, invalid YAML, bad service connections | Medium | Fix pipeline YAML, update variables |
| **Flaky** | Intermittent failures, passes on re-run | Medium | Quarantine test, investigate race condition |
| **Security Scan** | Vulnerability scanner found issues | High-Critical | Fix vulnerabilities, update dependencies |
| **Deployment** | Target unavailable, permission denied | High | Check target, fix permissions |

## az CLI Commands

### List Pipelines

```bash
# List all pipelines in a project
az pipelines list \
  --org {org} --project {project} --output table

# List with folder filter
az pipelines list \
  --folder-path "\CI" \
  --org {org} --project {project} --output table
```

### Pipeline Runs

```bash
# List recent runs for a pipeline
az pipelines runs list \
  --pipeline-id {pipelineId} \
  --top 20 \
  --org {org} --project {project} --output table

# List only failed runs
az pipelines runs list \
  --pipeline-id {pipelineId} \
  --result failed \
  --top 10 \
  --org {org} --project {project} --output table

# Runs for a specific branch
az pipelines runs list \
  --pipeline-id {pipelineId} \
  --branch refs/heads/main \
  --top 10 \
  --org {org} --project {project} --output json

# Get details of a specific run
az pipelines runs show \
  --id {runId} \
  --org {org} --project {project} --output json
```

### Run a Pipeline

```bash
# Trigger a pipeline run
az pipelines run \
  --id {pipelineId} \
  --branch main \
  --org {org} --project {project}

# Trigger with variables
az pipelines run \
  --id {pipelineId} \
  --branch main \
  --variables "configuration=Release" "runTests=true" \
  --org {org} --project {project}

# Trigger with parameters (YAML pipelines)
az pipelines run \
  --id {pipelineId} \
  --parameters "environment=staging" "skipTests=false" \
  --org {org} --project {project}
```

### Pipeline Variables and Variable Groups

```bash
# List pipeline variables
az pipelines variable list \
  --pipeline-id {pipelineId} \
  --org {org} --project {project} --output table

# List variable groups
az pipelines variable-group list \
  --org {org} --project {project} --output table

# Show variable group details
az pipelines variable-group show \
  --id {groupId} \
  --org {org} --project {project} --output json
```

## Build Failure Analysis

### Extracting Failure Details

```bash
# Get build timeline to find failed tasks
GET {org}/{project}/_apis/build/builds/{buildId}/timeline?api-version=7.1

# Response structure:
# records[] -> each record has:
#   name: task name
#   type: "Stage", "Job", "Task"
#   state: "completed"
#   result: "succeeded" | "failed" | "skipped"
#   issues[]: error/warning messages
#   log: { id, url } -> fetch log content

# Via az CLI
az rest --method GET \
  --uri "https://dev.azure.com/{org}/{project}/_apis/build/builds/{buildId}/timeline?api-version=7.1"
```

### Getting Build Logs

```bash
# List all logs for a build
GET {org}/{project}/_apis/build/builds/{buildId}/logs?api-version=7.1

# Get specific log content
GET {org}/{project}/_apis/build/builds/{buildId}/logs/{logId}?api-version=7.1

# Via az CLI
az rest --method GET \
  --uri "https://dev.azure.com/{org}/{project}/_apis/build/builds/{buildId}/logs/{logId}?api-version=7.1"
```

### Failure Classification Patterns

Analyze the failed task name and error messages to classify:

| Failed Task / Error Pattern | Classification | Severity |
|----------------------------|---------------|----------|
| `NuGetCommand` / "Unable to resolve" | Dependency resolution | Medium |
| `Npm` / "npm ERR!" | Dependency resolution | Medium |
| `DotNetCoreCLI` / "Build FAILED" | Compilation error | High |
| `VSBuild` / "error CS" or "error MSB" | Compilation error | High |
| `DotNetCoreCLI` / "Failed!" (test task) | Test failure | High |
| `VSTest` / "Failed" | Test failure | High |
| `Jest` / "Tests:.*failed" | Test failure | High |
| `Docker` / "error during connect" | Infrastructure | Medium |
| `AzureResourceManagerTemplateDeployment` / "Conflict" | Deployment conflict | High |
| Timeout / "The job running on agent exceeded" | Infrastructure/perf | Medium |
| `PublishBuildArtifacts` / "disk space" | Infrastructure | High |
| `CredScan` / "credentials detected" | Security gate | Critical |
| `BinSkim` / "vulnerabilities found" | Security gate | High |
| Agent offline / "No agent found" | Infrastructure | High |
| Approval timeout / "Approval timed out" | Process | Low |

### Failure Trend Analysis

Query the last N builds to detect patterns:

```bash
# Get last 20 runs for a pipeline
az pipelines runs list \
  --pipeline-id {pipelineId} \
  --top 20 \
  --org {org} --project {project} --output json
```

For each failed run, get timeline to identify failing stage/task. Build a failure frequency map.

Patterns to detect:
- **Recurring failure**: Same task fails 3+ times in last 10 runs
- **Intermittent failure**: Task fails then passes then fails (flaky)
- **New failure**: Task that previously always passed now fails
- **Cascading failure**: One failure causes downstream failures

## Flaky Test Detection

### Gathering Test Results

```bash
# Get test runs for a build
GET {org}/{project}/_apis/test/runs?buildUri=vstfs:///Build/Build/{buildId}&api-version=7.1

# Get test results for a specific test run
GET {org}/{project}/_apis/test/runs/{testRunId}/results?api-version=7.1

# Filter to failed tests only
GET {org}/{project}/_apis/test/runs/{testRunId}/results?outcomes=Failed&api-version=7.1
```

### Test Result Fields

| Field | Description |
|-------|-------------|
| `testCaseTitle` | Full test name |
| `automatedTestName` | Fully qualified test method name |
| `outcome` | Passed, Failed, NotExecuted, Inconclusive |
| `durationInMs` | Execution time |
| `errorMessage` | Failure message |
| `stackTrace` | Stack trace on failure |
| `testRun.name` | Test run name |
| `build.id` | Associated build ID |

### Flaky Test Identification Algorithm

```
1. Gather test results from last 20 builds of the pipeline
2. Group results by automatedTestName
3. For each test:
   a. pass_count = count(outcome == 'Passed')
   b. fail_count = count(outcome == 'Failed')
   c. total = pass_count + fail_count
   d. pass_rate = pass_count / total

   If fail_count >= 2 AND pass_count >= 1:
     flaky_score = min(pass_count, fail_count) / total
     If flaky_score > 0.10 → FLAKY

4. Rank by impact: failure_count x avg_build_duration_wasted
```

### Flaky Test Report Format

```
## Flaky Test Report — {Pipeline Name}

**Analysis window**: Last {N} builds ({startDate} to {endDate})
**Total unique tests**: {totalTests}
**Flaky tests detected**: {flakyCount}

### Flaky Tests (sorted by impact)

| Test Name | Pass Rate | Failures | Pattern | Suggested Action |
|-----------|-----------|----------|---------|-----------------|
| {testName} | {rate}% | {count}/{total} | Timeout | Increase timeout, add retry |
| {testName} | {rate}% | {count}/{total} | Race condition | Add wait/sync, review async |
| {testName} | {rate}% | {count}/{total} | Data dependency | Isolate test data |

### Estimated Build Time Wasted
{totalMinutes} minutes across {flakyBuildCount} builds

### Recommended Actions
1. Quarantine {testName} — {rate}% pass rate, wasting ~{min} per build
2. Fix {testName} — timing issue, add explicit wait
3. Review {testName} — inconsistent assertion, possible data leak
```

### Remediation Suggestions by Pattern

| Flaky Pattern | Detection Signal | Suggested Fix |
|--------------|-----------------|---------------|
| Timeout | `durationInMs` varies widely; timeout error | Increase timeout, optimize test, check blocking calls |
| Race condition | Different assertion errors across runs | Add synchronization, explicit waits, avoid shared state |
| Data dependency | Fails in parallel, passes alone | Isolate test data, use unique identifiers, clean up in teardown |
| External dependency | Connection/HTTP errors | Mock external services, add retry with backoff |
| Resource leak | Passes alone, fails in suite | Add proper disposal, check leaked connections/handles |
| Clock sensitivity | Fails near midnight/DST | Use fixed clock in tests, avoid `DateTime.Now` |

## Deployment Frequency Calculation

### Data Collection

```bash
# Get production pipeline runs (successful deployments)
az pipelines runs list \
  --pipeline-id {prodPipelineId} \
  --result succeeded \
  --top 100 \
  --org {org} --project {project} --output json

# Parse: extract finishTime from each run
# Calculate deployments per time period
```

### Calculation

```
Period: last 30 days (configurable)

deployment_count = count of succeeded runs to production environment
deployment_frequency = deployment_count / days_in_period

DORA Band:
  Elite:  >= 1 per day (on-demand)
  High:   1/week to 1/month
  Medium: 1/month to 1/6months
  Low:    < 1/6months
```

### Lead Time for Changes

```bash
# Get commits associated with a build
GET {org}/{project}/_apis/build/builds/{buildId}/changes?api-version=7.1

# For each production deployment:
# 1. Get the build that produced the deployment artifact
# 2. Get the commits in that build
# 3. Find the earliest commit timestamp
# 4. Lead time = deployment_finish_time - earliest_commit_time

# Average lead time = mean(lead_times)
```

### Mean Time to Recovery (MTTR)

```
For each production incident (failed deployment followed by fix):
  1. Find the failed deployment timestamp
  2. Find the next successful deployment timestamp
  3. Recovery time = success_time - failure_time

MTTR = mean(recovery_times)
```

### Change Failure Rate

```
total_deployments = count of all production deployments in period
failed_deployments = count with result = "failed"
  OR deployments followed by a rollback within 24 hours

change_failure_rate = failed_deployments / total_deployments x 100%
```

## Performance Regression Detection

### Algorithm

1. **Collect pipeline duration** for last N runs
2. **Compute baseline**: Average duration of successful runs 11-20 (older)
3. **Compare recent**: Average duration of successful runs 1-10 (recent)
4. **Flag regression** if: `(recent_avg - baseline_avg) / baseline_avg > 0.20` (>20% slower)
5. **Drill down** by stage/job to locate the bottleneck

### Performance Report Format

```
## Pipeline Performance — {pipelineName}

| Metric | Baseline (runs 11-20) | Recent (runs 1-10) | Change |
|--------|----------------------|--------------------|---------|
| Total Duration | 12m 30s | 16m 45s | +34% REGRESSION |
| Build Stage | 4m 15s | 4m 20s | +2% (OK) |
| Test Stage | 5m 10s | 9m 25s | +82% REGRESSION |
| Deploy Stage | 3m 05s | 3m 00s | -3% (OK) |

### Root Cause
Test stage regression: TestSuite.Integration tests taking 4x longer since run #{runId}
```

## Pipeline YAML Templates

### Standard CI Pipeline

```yaml
trigger:
  branches:
    include: [main, feature/*, bugfix/*, hotfix/*]

pool:
  vmImage: 'ubuntu-latest'

stages:
- stage: Build
  jobs:
  - job: BuildAndTest
    steps:
    - task: UseDotNet@2
      inputs:
        version: '8.x'
    - script: dotnet build --configuration Release
      displayName: 'Build'
    - script: dotnet test --configuration Release --logger trx --collect "Code coverage"
      displayName: 'Test'
    - task: PublishTestResults@2
      inputs:
        testResultsFormat: 'VSTest'
        testResultsFiles: '**/*.trx'
    - task: PublishCodeCoverageResults@2
      inputs:
        summaryFileLocation: '**/coverage.cobertura.xml'
```

### Multi-Stage CI/CD Pipeline

```yaml
trigger:
  branches:
    include: [main, release/*]

stages:
- stage: Build
  jobs:
  - job: BuildAndTest
    pool: { vmImage: 'ubuntu-latest' }
    steps:
    - task: DotNetCoreCLI@2
      inputs: { command: 'build', arguments: '--configuration Release' }
    - task: DotNetCoreCLI@2
      inputs: { command: 'test', arguments: '--collect:"XPlat Code Coverage"' }
    - task: PublishBuildArtifacts@1
      inputs: { pathToPublish: '$(Build.ArtifactStagingDirectory)', artifactName: 'drop' }

- stage: DeployDev
  dependsOn: Build
  jobs:
  - deployment: DeployDev
    environment: 'development'
    strategy:
      runOnce:
        deploy:
          steps:
          - task: AzureWebApp@1
            inputs: { appName: '$(devAppName)', package: '$(Pipeline.Workspace)/drop/**/*.zip' }

- stage: DeployStaging
  dependsOn: DeployDev
  jobs:
  - deployment: DeployStaging
    environment: 'staging'
    strategy:
      runOnce:
        deploy:
          steps:
          - task: AzureWebApp@1
            inputs: { appName: '$(stagingAppName)', package: '$(Pipeline.Workspace)/drop/**/*.zip' }

- stage: DeployProd
  dependsOn: DeployStaging
  condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
  jobs:
  - deployment: DeployProd
    environment: 'production'
    strategy:
      runOnce:
        deploy:
          steps:
          - task: AzureWebApp@1
            inputs: { appName: '$(prodAppName)', package: '$(Pipeline.Workspace)/drop/**/*.zip' }
```

## Agent Pool Monitoring

### Check Agent Status

```bash
# List agent pools
GET {org}/_apis/distributedtask/pools?api-version=7.1

# List agents in a pool
GET {org}/_apis/distributedtask/pools/{poolId}/agents?api-version=7.1

# Via az CLI
az rest --method GET \
  --uri "https://dev.azure.com/{org}/_apis/distributedtask/pools?api-version=7.1"
```

### Agent Health Indicators

| Indicator | Check | Threshold |
|-----------|-------|-----------|
| Agent online | `agent.status == "online"` | All agents online |
| Queue depth | Pending jobs in pool | > 5 pending = congestion |
| Build time trend | Average duration over 10 runs | > 20% increase = investigate |
| Disk space | Agent system capabilities | < 10GB free = warning |
| Agent version | `agent.version` | Must match latest or N-1 |

### Pipeline Queue Wait Time

```bash
# For each recent run, calculate:
# queue_time = startTime - queueTime
# If queue_time > 5 minutes consistently, agents are congested

az pipelines runs list \
  --pipeline-id {pipelineId} \
  --top 20 \
  --org {org} --project {project} --output json

# Parse: queueTime, startTime from each run
# Calculate: mean and p95 queue wait time
```

## Environment Approvals

```bash
# List environments
GET {org}/{project}/_apis/pipelines/environments?api-version=7.1

# Get environment with checks/approvals
GET {org}/{project}/_apis/pipelines/environments/{envId}?expands=checks&api-version=7.1

# Check pipeline approval status
GET {org}/{project}/_apis/pipelines/checks/runs?api-version=7.1-preview
```

## Notification Triggers

| Event | Condition | Notification |
|-------|-----------|-------------|
| Build failure | `result == 'failed'` | Teams alert + assignee email |
| Flaky test detected | `flaky_score > 0.2` | Teams alert to test owners |
| Performance regression | `duration_increase > 20%` | Teams alert to pipeline owners |
| Deployment failure | Stage failed in prod pipeline | Teams alert + on-call page |
| Gate blocked | Approval pending > 4 hours | Email to approvers |
| Successful release | All stages succeeded | Teams celebration card |

## Auto-Remediation Suggestions

| Failure Type | Suggested Action | Automated Fix Possible |
|-------------|-----------------|----------------------|
| Flaky test | Quarantine with trait/annotation | Yes — add skip annotation |
| Build timeout | Increase pipeline timeout | Yes — update YAML |
| Agent offline | Alert and scale pool | Partial — alert; scaling needs admin |
| NuGet restore failure | Clear cache, retry | Yes — add cache clean step |
| npm install failure | Delete node_modules, retry | Yes — add clean step |
| Out of disk | Clean build artifacts | Yes — add cleanup task |
| Permission denied | Check service connection | No — needs manual PAT/SP fix |
| Docker build failure | Clear docker cache, retry | Yes — add docker system prune |
| Approval timeout | Notify approvers | Yes — send Teams notification |
| Security scan block | Generate exemption request | No — needs security review |
