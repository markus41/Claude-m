# Pipeline Monitoring and Analysis Reference

Comprehensive reference for pipeline health monitoring, failure analysis, flaky test detection,
performance regression detection, and quality gate definitions.

---

## Build Status Taxonomy

### Status Values

| Status | Description | Action |
|--------|-------------|--------|
| `succeeded` | All stages completed successfully | No action needed |
| `partiallySucceeded` | Some stages failed but build continued | Review failed stages |
| `failed` | Build terminated due to error | Investigate root cause |
| `canceled` | Build was manually or automatically canceled | Check who/why |
| `notStarted` | Build queued but not yet running | Monitor queue |
| `inProgress` | Build currently executing | Monitor |

### Failure Categories

| Category | Log Indicators | Severity | Remediation |
|----------|---------------|----------|-------------|
| **Compilation** | `error CS`, `error TS`, `BUILD FAILED`, MSBuild errors, syntax errors | High | Fix code errors, restore packages |
| **Test** | `FAIL`, `Tests failed`, assertion errors, non-zero test runner exit | Medium | Fix failing tests or quarantine known failures |
| **Infrastructure** | `Agent offline`, timeout, resource limits, disk space, container crash | High | Check agent pool, increase resources, retry |
| **Dependency** | `Could not resolve`, `Package not found`, NuGet/npm restore failure | Medium | Fix feed access, clear cache, pin versions |
| **Configuration** | Missing variables, invalid YAML, bad service connections, file not found | Medium | Fix pipeline YAML, update variable groups |
| **Flaky** | Intermittent failures, same test passes on re-run, non-deterministic | Low | Quarantine test, investigate race conditions |
| **Security Scan** | Vulnerability scanner found critical/high issues, license violations | High | Fix vulnerabilities, update dependencies |
| **Deployment** | Target unavailable, slot swap failed, permission denied to environment | High | Check target, fix permissions, verify env config |
| **Permission** | `403 Forbidden`, `Access denied`, `Unauthorized`, expired token | High | Re-auth service connection, verify PAT scope |
| **Timeout** | Build duration > 2x average, `TimeoutExceeded` in result | Medium | Increase timeout, optimize pipeline, parallelize |

---

## az CLI Commands

### List Pipelines

```bash
# List all pipelines
az pipelines list \
  --project {project} \
  --output table

# List with folder filter
az pipelines list \
  --project {project} \
  --folder-path "\CI" \
  --output table
```

### Pipeline Runs

```bash
# List recent runs for a pipeline
az pipelines runs list \
  --pipeline-id {pipelineId} \
  --project {project} \
  --top 20 \
  --output table

# List only failed runs
az pipelines runs list \
  --pipeline-id {pipelineId} \
  --project {project} \
  --result failed \
  --top 10 \
  --output table

# List runs for a specific branch
az pipelines runs list \
  --pipeline-id {pipelineId} \
  --project {project} \
  --branch "refs/heads/main" \
  --top 10 \
  --output json

# Get details of a specific run
az pipelines runs show \
  --id {runId} \
  --project {project} \
  --output json
```

### Build Details and Logs

```bash
# List builds with status filter
az pipelines build list \
  --project {project} \
  --result failed \
  --top 20 \
  --output table

# Get build details
az pipelines build show \
  --id {buildId} \
  --project {project} \
  --output json

# Get build timeline (stages, jobs, tasks with status)
az rest --method GET \
  --uri "https://dev.azure.com/{org}/{project}/_apis/build/builds/{buildId}/timeline?api-version=7.1"

# List build log containers
az rest --method GET \
  --uri "https://dev.azure.com/{org}/{project}/_apis/build/builds/{buildId}/logs?api-version=7.1"

# Get specific log content (plain text)
az rest --method GET \
  --uri "https://dev.azure.com/{org}/{project}/_apis/build/builds/{buildId}/logs/{logId}?api-version=7.1"

# Get work items linked to a build
az rest --method GET \
  --uri "https://dev.azure.com/{org}/{project}/_apis/build/builds/{buildId}/workitems?api-version=7.1"
```

### Run a Pipeline

```bash
# Trigger a pipeline run
az pipelines run \
  --id {pipelineId} \
  --project {project} \
  --branch main

# Trigger with variables
az pipelines run \
  --id {pipelineId} \
  --project {project} \
  --branch main \
  --variables "configuration=Release" "runTests=true"

# Trigger with parameters (YAML pipelines)
az pipelines run \
  --id {pipelineId} \
  --project {project} \
  --parameters "environment=staging" "skipTests=false"
```

### Pipeline Variables and Variable Groups

```bash
# List pipeline variables
az pipelines variable list \
  --pipeline-id {pipelineId} \
  --project {project} \
  --output table

# List variable groups
az pipelines variable-group list \
  --project {project} \
  --output table

# Show variable group details
az pipelines variable-group show \
  --id {groupId} \
  --project {project} \
  --output json
```

### Test Results

```bash
# Get test runs for a build
az rest --method GET \
  --uri "https://dev.azure.com/{org}/{project}/_apis/test/runs?buildIds={buildId}&api-version=7.1"

# Get test results for a specific run
az rest --method GET \
  --uri "https://dev.azure.com/{org}/{project}/_apis/test/runs/{runId}/results?api-version=7.1"

# Get only failed test results
az rest --method GET \
  --uri "https://dev.azure.com/{org}/{project}/_apis/test/runs/{runId}/results?outcomes=Failed&api-version=7.1"

# Get code coverage for a build
az rest --method GET \
  --uri "https://dev.azure.com/{org}/{project}/_apis/test/codecoverage?buildId={buildId}&api-version=7.1"
```

---

## Flaky Test Detection Algorithm

### Definition

A test is **flaky** if it exhibits non-deterministic behavior -- sometimes passing, sometimes
failing -- without code changes between runs.

### Detection Steps

1. **Collect test results** from the last N pipeline runs (default: 10):
   ```bash
   # Get last 10 builds for the pipeline
   az pipelines build list \
     --definition-ids {pipelineId} \
     --top 10 \
     --result succeeded,failed,partiallySucceeded \
     --project {project} --output json

   # For each build, get test runs
   az rest --method GET \
     --uri "https://dev.azure.com/{org}/{project}/_apis/test/runs?buildIds={buildId}&api-version=7.1"

   # For each test run, get results
   az rest --method GET \
     --uri "https://dev.azure.com/{org}/{project}/_apis/test/runs/{runId}/results?api-version=7.1"
   ```

2. **Aggregate test outcomes** by unique test name (testCaseTitle + automatedTestName):
   ```
   For each unique test:
     outcomes = [Pass, Pass, Fail, Pass, Pass, Fail, Pass, Pass, Pass, Fail]
   ```

3. **Apply flakiness detection**:
   ```
   For each unique test:
     pass_count = count(outcome == 'Passed')
     fail_count = count(outcome == 'Failed')
     total = pass_count + fail_count

     If fail_count >= 2 AND pass_count >= 1:
       flaky_score = min(pass_count, fail_count) / total
       If flaky_score > 0.10:  # More than 10% flip rate
         Mark as FLAKY
   ```

4. **Rank flaky tests** by:
   - Flip frequency (higher = more disruptive)
   - Recent trend (getting worse vs. improving)
   - Impact (blocks other tests, causes full pipeline failure)

### Flaky Test Output

```
## Flaky Test Report -- {project}

**Period**: Last {N} pipeline runs | **Pipeline**: {pipelineName}

| Test Name | Class | Pass | Fail | Flaky Score | Trend | Last Failure |
|-----------|-------|------|------|-------------|-------|-------------|
| TestAuthTokenRefresh | AuthTests | 7 | 3 | 0.30 | Worsening | 2h ago |
| TestDatabaseConnection | DbTests | 8 | 2 | 0.20 | Stable | 1d ago |

### Recommendations
- **Quarantine**: TestAuthTokenRefresh -- investigate race condition in token cache
- **Monitor**: TestDatabaseConnection -- may be connection pool timeout
- **Auto-created bug**: #{bugId} for TestAuthTokenRefresh
```

### Auto-Created Bug Template

```bash
az boards work-item create --type Bug \
  --title "Flaky test: {testName}" \
  --description "<p>Test <b>{testName}</b> in class <b>{testClass}</b> is flaky.</p>
    <p>Failed {failCount}/{totalRuns} recent runs. Flakiness rate: {pct}%.</p>
    <p>Pipeline: {pipelineName}</p>
    <p>Last failure: {lastFailureDate} in build #{buildId}</p>
    <p>Error message: {lastErrorMessage}</p>" \
  --fields "System.Tags=flaky-test; auto-detected; {pipelineName}" \
    "Microsoft.VSTS.Common.Priority=3" \
    "System.AreaPath={project}\\{inferredAreaPath}" \
  --org {org} --project {project}
```

---

## Performance Regression Detection

### Algorithm

1. **Collect pipeline durations** for last 20 successful runs:
   ```bash
   az pipelines runs list \
     --pipeline-id {pipelineId} \
     --result succeeded \
     --top 20 \
     --project {project} --output json
   ```

2. **Split into baseline and recent**:
   - Baseline: runs 11-20 (older runs)
   - Recent: runs 1-10 (latest runs)

3. **Compute averages**:
   ```
   baseline_avg = mean(baseline durations)
   recent_avg = mean(recent durations)
   change_pct = (recent_avg - baseline_avg) / baseline_avg * 100
   ```

4. **Flag regression** if: `change_pct > 20%` (>20% slower)

5. **Drill down by stage/job** to locate the bottleneck:
   ```bash
   # Get timeline for a slow run
   az rest --method GET \
     --uri "https://dev.azure.com/{org}/{project}/_apis/build/builds/{buildId}/timeline?api-version=7.1"

   # Compare stage durations:
   # For each stage/job in the timeline, compare duration against baseline
   ```

### Performance Output

```
## Pipeline Performance -- {pipelineName}

**Period**: Last 20 runs

| Metric | Baseline (runs 11-20) | Recent (runs 1-10) | Change |
|--------|----------------------|--------------------|---------|
| Total Duration | 12m 30s | 16m 45s | +34% REGRESSION |
| Build Stage | 4m 15s | 4m 20s | +2% (OK) |
| Test Stage | 5m 10s | 9m 25s | +82% REGRESSION |
| Deploy Stage | 3m 05s | 3m 00s | -3% (OK) |

### Root Cause
Test stage regression: TestSuite.Integration tests taking 4x longer since run #{runId}.
Likely cause: database seeding added in commit {commitHash}.

### Recommendations
1. Profile TestSuite.Integration to identify slow tests
2. Consider parallel test execution
3. Review database seeding in commit {commitHash}
```

---

## Quality Gate Definitions

### Standard Quality Gates

| Gate | Check | Threshold | Fail Action |
|------|-------|-----------|-------------|
| Unit Tests | All unit tests pass | 100% pass rate | Block merge/deploy |
| Code Coverage | Coverage meets minimum | >= 80% line coverage | Warn or block |
| Coverage Regression | Coverage does not decrease | no decrease from baseline | Warn |
| Security Scan | No critical/high vulnerabilities | 0 critical, 0 high | Block deployment |
| License Check | No prohibited licenses | 0 violations | Block deployment |
| Performance | No regression detected | < 20% duration increase | Warn |
| Integration Tests | Integration tests pass | 100% pass rate | Block deployment |
| Smoke Tests | Post-deployment smoke tests | 100% pass rate | Rollback |
| Flaky Test Check | No new flaky tests introduced | 0 new flaky tests | Warn |

### Gate Check via CLI

```bash
# Test results for quality gate
az rest --method GET \
  --uri "https://dev.azure.com/{org}/{project}/_apis/test/runs?buildIds={buildId}&api-version=7.1"

# Code coverage for quality gate
az rest --method GET \
  --uri "https://dev.azure.com/{org}/{project}/_apis/test/codecoverage?buildId={buildId}&api-version=7.1"

# Pipeline approval/check status
az rest --method GET \
  --uri "https://dev.azure.com/{org}/{project}/_apis/pipelines/checks/runs?api-version=7.1-preview"

# Environment checks
az rest --method GET \
  --uri "https://dev.azure.com/{org}/{project}/_apis/pipelines/checks/configurations?resourceType=environment&resourceId={envId}&api-version=7.1-preview"
```

### Gate Evaluation Logic

```
For each gate:
  1. Fetch the relevant data (test results, coverage, scan)
  2. Compare against threshold
  3. Classify as: PASS, WARN, FAIL
  4. If any gate is FAIL: block promotion, show details
  5. If any gate is WARN: allow promotion but highlight in report
  6. Log all gate results to the release session file
```

---

## Multi-Stage Pipeline YAML Patterns

### Standard CI/CD Structure

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
          - task: PublishTestResults@2
            inputs:
              testResultsFormat: 'VSTest'
              testResultsFiles: '**/*.trx'
          - task: PublishCodeCoverageResults@2
            inputs:
              summaryFileLocation: '**/coverage.cobertura.xml'

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
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
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

### Pipeline with Quality Gates as Tasks

```yaml
stages:
  - stage: Build
    jobs:
      - job: BuildTestCoverage
        steps:
          - script: dotnet build
          - script: dotnet test --collect:"XPlat Code Coverage"
          - task: PublishTestResults@2
            inputs: { testResultsFormat: 'VSTest', testResultsFiles: '**/*.trx' }
          - task: PublishCodeCoverageResults@2
            inputs: { summaryFileLocation: '**/coverage.cobertura.xml' }

      - job: SecurityScan
        steps:
          - task: AdvancedSecurity-Codeql-Init@1
          - task: AdvancedSecurity-Codeql-Analyze@1
          - task: AdvancedSecurity-Publish@1

  - stage: ValidateGates
    dependsOn: Build
    jobs:
      - job: CheckGates
        steps:
          - script: |
              # Check test pass rate
              # Check code coverage
              # Check security scan results
              echo "All gates passed"
```

### Template-Based Pipeline

```yaml
# azure-pipelines.yml
trigger: [main]

extends:
  template: templates/standard-pipeline.yml@shared-templates
  parameters:
    buildConfiguration: 'Release'
    runIntegrationTests: true
    deployEnvironments:
      - dev
      - staging
      - production

resources:
  repositories:
    - repository: shared-templates
      type: git
      name: SharedProject/pipeline-templates
      ref: refs/heads/main
```

---

## Notification Triggers for Pipeline Events

| Event | Condition | Notification Type | Recipients |
|-------|-----------|-------------------|------------|
| Build failure | `result == 'failed'` | Teams alert card + email | Build requestor, pipeline owners |
| Flaky test detected | `flaky_score > 0.20` | Teams alert card | Test owners, QA team |
| Performance regression | `duration_increase > 20%` | Teams alert card | Pipeline owners |
| Deployment failure | Stage failed in prod pipeline | Teams alert + email | On-call, release manager |
| Gate blocked | Approval pending > 4 hours | Email reminder | Approvers |
| Successful release | All stages succeeded in release pipeline | Teams celebration card | Team channel |
| Coverage regression | `coverage < previous_coverage` | Teams warning | Code owners |
| Security vulnerability | Critical/high found in scan | Teams alert + email | Security team, pipeline owners |

### Notification Priority

```
P1 (Immediate): Production deployment failure, critical security vulnerability
P2 (Within 1h): Build failure on main branch, gate blocked > 4h
P3 (Daily digest): Flaky tests, performance regression, coverage regression
P4 (Weekly report): Pipeline health trends, DORA metrics updates
```

---

## Pipeline Health Report Template

```
## Pipeline Health Report -- {Project}

**Period**: {start} to {end} | **Pipelines Monitored**: {count}

### Pipeline Summary
| Pipeline | Runs | Pass | Fail | Partial | Pass Rate | Avg Duration | Trend |
|----------|------|------|------|---------|-----------|--------------|-------|
| CI-Main  | 45   | 40   | 3    | 2       | 88.9%     | 12m 30s      | UP    |
| CI-PR    | 120  | 115  | 5    | 0       | 95.8%     | 8m 15s       | STABLE|

### Failure Breakdown
| Category | Count | % of Failures | Top Offender | Action |
|----------|-------|---------------|--------------|--------|
| Test     | 3     | 37.5%         | LoginTests   | Fix or quarantine |
| Infra    | 2     | 25.0%         | Agent pool 3 | Investigate pool |
| Flaky    | 2     | 25.0%         | AuthRefresh  | Auto-bug created |
| Config   | 1     | 12.5%         | Missing var  | Fix YAML |

### Flaky Tests
| Test Name | Pipeline | Flaky Score | Last Failure | Bug # |
|-----------|----------|-------------|--------------|-------|
| TestAuthTokenRefresh | CI-Main | 0.30 | 2h ago | #5678 |

### Performance
| Pipeline | Baseline | Recent Avg | Change | Status |
|----------|----------|------------|--------|--------|
| CI-Main  | 12m 30s  | 16m 45s   | +34%   | REGRESSION |
| CI-PR    | 8m 15s   | 8m 20s    | +1%    | OK |

### Recommended Actions
1. Quarantine TestAuthTokenRefresh -- 30% flakiness rate, auto-bug #5678 created
2. Investigate Agent Pool 3 -- 2 infrastructure failures this week
3. Profile CI-Main test stage -- 82% duration increase detected
4. Fix missing variable in CI-Config pipeline
```
