# Pipeline Monitoring and Analysis Reference

## Pipeline Status Taxonomy

### Build Status Values

| Status | Description | Action |
|--------|-------------|--------|
| `succeeded` | All stages completed successfully | No action needed |
| `partiallySucceeded` | Some stages failed but build continued | Review failed stages |
| `failed` | Build terminated due to error | Investigate root cause |
| `canceled` | Build was manually or automatically canceled | Check who/why |
| `notStarted` | Build queued but not yet running | Monitor queue |
| `inProgress` | Build currently executing | Monitor |

### Failure Categories

| Category | Indicators | Remediation |
|----------|-----------|-------------|
| **Compilation** | MSBuild/dotnet build errors, syntax errors, missing imports | Fix code errors, restore packages |
| **Test** | Test runner reports failures, assertion errors | Fix failing tests or mark as known failures |
| **Infrastructure** | Agent offline, timeout, resource limits, disk space | Check agent pool, increase resources |
| **Dependency** | NuGet/npm restore failures, feed auth errors | Fix feed access, update packages |
| **Configuration** | Missing variables, invalid YAML, bad service connections | Fix pipeline YAML, update variables |
| **Flaky** | Intermittent failures, same test passes on re-run | Quarantine flaky test, investigate race conditions |
| **Security Scan** | Vulnerability scanner found issues, license violations | Fix vulnerabilities, update dependencies |
| **Deployment** | Deployment target unavailable, permission denied | Check target, fix permissions |

## az CLI Commands

### List Pipelines

```bash
# List all pipelines in a project
az pipelines list \
  --project MyProject \
  --output table

# List with folder filter
az pipelines list \
  --project MyProject \
  --folder-path "\CI" \
  --output table
```

### Pipeline Runs

```bash
# List recent runs for a pipeline
az pipelines runs list \
  --pipeline-id {pipelineId} \
  --project MyProject \
  --top 20 \
  --output table

# List only failed runs
az pipelines runs list \
  --pipeline-id {pipelineId} \
  --project MyProject \
  --result failed \
  --top 10 \
  --output table

# Get details of a specific run
az pipelines runs show \
  --id {runId} \
  --project MyProject \
  --output json
```

### Build Details

```bash
# List builds with status filter
az pipelines build list \
  --project MyProject \
  --result failed \
  --top 20 \
  --output table

# Get build details
az pipelines build show \
  --id {buildId} \
  --project MyProject \
  --output json

# Get build timeline (stages, jobs, tasks)
az rest --method GET \
  --uri "https://dev.azure.com/{org}/{project}/_apis/build/builds/{buildId}/timeline?api-version=7.1"

# Get build logs
az rest --method GET \
  --uri "https://dev.azure.com/{org}/{project}/_apis/build/builds/{buildId}/logs?api-version=7.1"

# Get specific log content
az rest --method GET \
  --uri "https://dev.azure.com/{org}/{project}/_apis/build/builds/{buildId}/logs/{logId}?api-version=7.1"
```

### Run a Pipeline

```bash
# Trigger a pipeline run
az pipelines run \
  --id {pipelineId} \
  --project MyProject \
  --branch main

# Trigger with variables
az pipelines run \
  --id {pipelineId} \
  --project MyProject \
  --branch main \
  --variables "configuration=Release" "runTests=true"

# Trigger with parameters (YAML pipelines)
az pipelines run \
  --id {pipelineId} \
  --project MyProject \
  --parameters "environment=staging" "skipTests=false"
```

### Pipeline Variables and Variable Groups

```bash
# List pipeline variables
az pipelines variable list \
  --pipeline-id {pipelineId} \
  --project MyProject \
  --output table

# List variable groups
az pipelines variable-group list \
  --project MyProject \
  --output table

# Show variable group details
az pipelines variable-group show \
  --id {groupId} \
  --project MyProject \
  --output json
```

## Flaky Test Detection Algorithm

### Definition

A test is **flaky** if it exhibits non-deterministic behavior — sometimes passing, sometimes failing — without code changes.

### Detection Steps

1. **Collect test results** from the last N pipeline runs (default: 10):
   ```bash
   az rest --method GET \
     --uri "https://dev.azure.com/{org}/{project}/_apis/test/runs?buildIds={id1},{id2},...&api-version=7.1"
   ```

2. **Get test results per run**:
   ```bash
   az rest --method GET \
     --uri "https://dev.azure.com/{org}/{project}/_apis/test/runs/{runId}/results?api-version=7.1"
   ```

3. **Identify flaky tests** using this algorithm:
   ```
   For each unique test:
     pass_count = count(result == 'Passed')
     fail_count = count(result == 'Failed')
     total = pass_count + fail_count

     If fail_count >= 2 AND pass_count >= 1:
       flaky_score = min(pass_count, fail_count) / total
       If flaky_score > 0.1:  # More than 10% flip rate
         Mark as FLAKY
   ```

4. **Rank flaky tests** by:
   - Flip frequency (higher = more disruptive)
   - Recent trend (getting worse vs improving)
   - Impact (blocks other tests, causes full pipeline failure)

### Flaky Test Output

```
## Flaky Test Report — {project}

| Test Name | Pass | Fail | Flaky Score | Trend | Last Failure |
|-----------|------|------|-------------|-------|-------------|
| TestAuthTokenRefresh | 7 | 3 | 0.30 | Worsening | 2h ago |
| TestDatabaseConnection | 8 | 2 | 0.20 | Stable | 1d ago |

### Recommendations
- **Quarantine**: TestAuthTokenRefresh — investigate race condition in token cache
- **Monitor**: TestDatabaseConnection — may be connection pool timeout
```

## Performance Regression Detection

### Algorithm

1. **Collect pipeline duration** for last N runs:
   ```bash
   az pipelines runs list --pipeline-id {id} --top 20 --output json \
     | jq '[.[] | {id: .id, duration: (.finishTime | fromdate) - (.startTime | fromdate), result: .result}]'
   ```

2. **Compute baseline**: Average duration of successful runs 11-20 (older runs)
3. **Compare recent**: Average duration of successful runs 1-10 (recent runs)
4. **Flag regression** if: `(recent_avg - baseline_avg) / baseline_avg > 0.20` (>20% slower)

5. **Drill down** by stage/job to locate the bottleneck:
   - Get timeline for recent slow runs
   - Compare stage durations against baseline
   - Identify which stage/job introduced the regression

### Performance Output

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

## Quality Gate Definitions

### Standard Quality Gates

| Gate | Check | Threshold | Fail Action |
|------|-------|-----------|-------------|
| Unit Tests | All unit tests pass | 100% pass rate | Block merge |
| Code Coverage | Coverage meets minimum | ≥80% line coverage | Warn or block |
| Security Scan | No critical/high vulnerabilities | 0 critical, 0 high | Block deployment |
| License Check | No prohibited licenses | 0 violations | Block deployment |
| Performance | No regression detected | <20% duration increase | Warn |
| Integration Tests | Integration tests pass | 100% pass rate | Block deployment |
| Smoke Tests | Post-deployment smoke tests pass | 100% pass rate | Rollback |

### Gate Check via CLI

```bash
# Get test results for a build
az rest --method GET \
  --uri "https://dev.azure.com/{org}/{project}/_apis/test/runs?buildIds={buildId}&api-version=7.1"

# Get code coverage
az rest --method GET \
  --uri "https://dev.azure.com/{org}/{project}/_apis/test/codecoverage?buildId={buildId}&api-version=7.1"

# Check pipeline approval status
az rest --method GET \
  --uri "https://dev.azure.com/{org}/{project}/_apis/pipelines/checks/runs?api-version=7.1-preview"
```

## Multi-Stage Pipeline Patterns

### Standard CI/CD Pipeline Structure

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
            inputs: { command: 'build' }
          - task: DotNetCoreCLI@2
            inputs: { command: 'test', arguments: '--collect:"XPlat Code Coverage"' }

  - stage: DeployStaging
    dependsOn: Build
    condition: succeeded()
    jobs:
      - deployment: DeployToStaging
        environment: 'staging'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureWebApp@1
                  inputs: { appName: 'my-app-staging' }

  - stage: DeployProduction
    dependsOn: DeployStaging
    condition: succeeded()
    jobs:
      - deployment: DeployToProduction
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureWebApp@1
                  inputs: { appName: 'my-app-prod' }
```

### Environment Approvals

```bash
# List environments
az rest --method GET \
  --uri "https://dev.azure.com/{org}/{project}/_apis/pipelines/environments?api-version=7.1"

# Get environment details with checks
az rest --method GET \
  --uri "https://dev.azure.com/{org}/{project}/_apis/pipelines/environments/{envId}?expands=checks&api-version=7.1"
```

## Notification Triggers

| Event | Condition | Notification |
|-------|-----------|-------------|
| Build failure | `result == 'failed'` | Teams alert + assignee email |
| Flaky test detected | `flaky_score > 0.2` | Teams alert to test owners |
| Performance regression | `duration_increase > 20%` | Teams alert to pipeline owners |
| Deployment failure | Stage failed in prod pipeline | Teams alert + on-call page |
| Gate blocked | Approval pending > 4 hours | Email to approvers |
| Successful release | All stages succeeded in release pipeline | Teams celebration card |
