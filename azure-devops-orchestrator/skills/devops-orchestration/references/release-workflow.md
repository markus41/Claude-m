# Release Coordination Reference

End-to-end release coordination for Azure DevOps -- gate validation, environment promotion,
release notes generation, rollback management, and release health scoring.

---

## Gate Types and Validation Checks

### Gate 1: Build Success

```bash
# Check latest build status
az pipelines runs list \
  --pipeline-id {buildPipelineId} \
  --branch "{releaseBranch}" \
  --top 1 \
  --result succeeded \
  --org {org} --project {project} --output json

# Verify build artifact exists
az pipelines runs artifact list \
  --run-id {buildRunId} \
  --org {org} --project {project} --output json
```

**Pass**: Latest build succeeded and artifacts are available.
**Fail**: Build failed or no artifacts. Show build errors and block promotion.

### Gate 2: Test Pass Rate

```bash
# Get test results for the build
GET {org}/{project}/_apis/test/runs?buildUri={buildUri}&api-version=7.1

# For each test run, get detailed results
GET {org}/{project}/_apis/test/runs/{runId}/results?api-version=7.1
```

Aggregate and compare:

| Target | QA Gate | Staging Gate | Production Gate |
|--------|---------|-------------|----------------|
| Pass rate | >= 95% | >= 98% | >= 99% |
| P1 failures | 0 | 0 | 0 |
| P2 failures | <= 3 | 0 | 0 |

### Gate 3: Code Coverage

```bash
GET {org}/{project}/_apis/test/codecoverage?buildId={buildId}&api-version=7.1
```

| Metric | Minimum | Target |
|--------|---------|--------|
| Line coverage | 70% | 80%+ |
| Branch coverage | 60% | 75%+ |
| No regression | Coverage must not decrease from previous release | |

### Gate 4: Security Scan

Check security scan results from pipeline artifacts:

```bash
# Check for security scan task results in build timeline
GET {org}/{project}/_apis/build/builds/{buildId}/timeline?api-version=7.1

# Look for tasks: SecurityAnalysis, SdtReport, dependency-check, container-scan
```

| Severity | QA Gate | Staging Gate | Production Gate |
|----------|---------|-------------|----------------|
| Critical | Block | Block | Block |
| High | Warn | Block | Block |
| Medium | Pass | Warn | Warn |
| Low | Pass | Pass | Pass |

### Gate 5: Change Approval

```bash
# Check environment approvals
GET {org}/{project}/_apis/pipelines/approvals?api-version=7.1-preview

# Or check via environment checks
GET {org}/{project}/_apis/pipelines/checks/configurations?resourceType=environment&resourceId={envId}&api-version=7.1-preview
```

Required approvals for production:
- Tech lead sign-off
- QA sign-off (test pass confirmation)
- Product owner sign-off (feature acceptance)

### Gate 6: Work Item Validation

All work items linked to the release must be in Resolved or Closed state:

```bash
# Get work items linked to the build
GET {org}/{project}/_apis/build/builds/{buildId}/workitems?api-version=7.1

# For each work item, verify state
az boards work-item show --id {id} --output json
# Check: fields.System.State in ["Resolved", "Closed"]
```

If any linked work item is not resolved, flag it and list the unresolved items.

---

## Gate Validation Report Format

```
## Release Gate Validation -- v{version} -> {targetStage}

| Gate | Status | Details |
|------|--------|---------|
| Build Success | PASS/FAIL | Build #{buildId} {status} |
| Test Pass Rate | PASS/FAIL | {passRate}% ({passed}/{total}) |
| Code Coverage | PASS/FAIL | Line: {linePct}%, Branch: {branchPct}% |
| Security Scan | PASS/FAIL/WARN | {critical} critical, {high} high |
| Change Approval | PASS/FAIL/PENDING | {n}/{required} approvals |
| Work Items | PASS/FAIL | {resolved}/{total} resolved |

### Overall: {PASS/FAIL}
{summary message}

### Blocking Issues
{list of gates that failed with details and remediation}
```

---

## Environment Promotion Flow

### Standard Flow

```
                    +----------+
                    |  Build   |
                    |  (CI)    |
                    +----+-----+
                         |
                    Auto-deploy on merge
                         |
                    +----v-----+
                    |   Dev    |
                    +----+-----+
                         |
                    Quality Gate: >90% pass
                         |
              +----------v-----------+
              |      Staging         |
              +----------+-----------+
                         |
              +--- Quality Gate: >95% pass
              +--- Security Gate: 0 critical/high
              +--- Approval Gate: QA lead
                         |
              +----------v-----------+
              |     Production       |
              +----------+-----------+
                         |
              +--- Approval Gate: Release mgr + PO
              +--- Change Window Gate
              +--- Deployment Gate: staging healthy
              +--- Work Items Gate: all resolved
                         |
              +----------v-----------+
              | Post-Deploy Verify   |
              +----------+-----------+
                         |
                    Smoke tests
                    Error rate check
                    Health endpoint
                         |
              +----+-----+-----+----+
              |                     |
         Pass |                     | Fail
              v                     v
         +----+-----+        +-----+------+
         | Complete |        | Rollback   |
         +----------+        +------------+
```

### Promotion Commands

```bash
# Trigger deployment to staging
az pipelines run --id {pipelineId} \
  --branch main \
  --variables "deployEnvironment=staging" \
  --org {org} --project {project}

# Trigger deployment to production
az pipelines run --id {pipelineId} \
  --branch main \
  --variables "deployEnvironment=production" \
  --org {org} --project {project}

# Approve a pending environment check
az rest --method patch \
  --uri "https://dev.azure.com/{org}/{project}/_apis/pipelines/approvals/{approvalId}?api-version=7.1-preview" \
  --body '{"status": "approved", "comment": "Staging smoke tests verified."}'

# Reject a pending approval
az rest --method patch \
  --uri "https://dev.azure.com/{org}/{project}/_apis/pipelines/approvals/{approvalId}?api-version=7.1-preview" \
  --body '{"status": "rejected", "comment": "Test pass rate below threshold."}'
```

---

## Release Notes Auto-Generation

### Data Collection

```bash
# Step 1: Get the last successful production build
az pipelines build list \
  --definition-ids {pipelineId} \
  --result succeeded \
  --top 1 \
  --query-order finishTimeDescending \
  --org {org} --project {project}

# Step 2: Get work items between two builds
GET {org}/{project}/_apis/build/builds/{buildId}/workitems?api-version=7.1

# Step 3: Fetch each work item's details
az boards work-item show --id {id} --output json

# Alternative: Get commits between tags and extract work item IDs
git log {previousTag}..{currentTag} --oneline --format="%H %s"
# Extract AB#1234 or #1234 patterns from commit messages
```

### Grouping Rules

| Work Item Type | Release Notes Section |
|---|---|
| Feature | Features |
| User Story | Features |
| Bug | Bug Fixes |
| Task (tag: improvement) | Improvements |
| Task (tag: performance) | Performance |
| Task (tag: security) | Security |
| Task (default) | Other Changes |
| Epic | (omit -- too high level) |

### Release Notes Template

```markdown
# Release {version} -- {date}

## Highlights
{Top 1-3 most significant changes, written as user-facing descriptions}

## Features
- **#{id}**: {title} -- {one-line description} (@{assignee})

## Bug Fixes
- **#{id}**: {title} -- {root cause summary} (@{assignee})

## Improvements
- **#{id}**: {title} (@{assignee})

## Performance
- **#{id}**: {title} (@{assignee})

## Security
- **#{id}**: {title} (@{assignee})

## Breaking Changes
{List any changes that require action from consumers}
- {description} -- Migration: {steps}

## Known Issues
- #{id}: {description} -- Workaround: {workaround}

## Deployment Notes
- **Environment**: {environment}
- **Pipeline**: {pipelineName} Run #{runId}
- **Build**: {buildNumber}
- **Commits**: {fromCommit}..{toCommit} ({commitCount} commits)
- **Approved by**: {approverList}
- **Deployed at**: {timestamp}

## Contributors
{List of unique assignees from all work items in this release}
```

### Version Number Strategy

If the project follows semantic versioning:
```
Major: Any work item tagged "breaking-change"
Minor: Any Feature or User Story
Patch: Only Bugs, Tasks, Improvements

Previous version: 2.3.1
Work items: 2 Features, 3 Bugs
New version: 2.5.0 (minor bump for features, reset patch)
```

---

## Rollback Decision Matrix

| Signal | Threshold | Action | Urgency |
|---|---|---|---|
| Smoke tests fail | Any critical test fails | Immediate rollback | P1 |
| Error rate spike | > baseline + 5% for 5 min | Rollback recommended | P1 |
| Error rate elevated | > baseline + 2% for 15 min | Monitor, prepare rollback | P2 |
| Health check failing | Non-200 for > 3 min | Immediate rollback | P1 |
| CPU/memory spike | > 90% sustained 10 min | Investigate, prepare rollback | P2 |
| User reports | > 3 reports same issue | Investigate, consider rollback | P2 |
| Deployment timeout | Deployment exceeds 3x average | Cancel and rollback | P1 |
| No anomalies | All metrics normal for 30 min | Release confirmed | -- |

### Pre-Deployment Rollback Checklist

Before promoting to production, verify:
- [ ] Previous deployment artifact is available and tagged
- [ ] Rollback pipeline exists and was tested in lower environment
- [ ] Database rollback script exists (if migrations included)
- [ ] Feature flags can disable new features independently
- [ ] Rollback time estimate is documented (target < 15 minutes)

### Rollback Execution

```bash
# Option 1: Redeploy previous version (preferred)
az pipelines run --id {rollbackPipelineId} \
  --parameters "version={previousVersion}" \
  --org {org} --project {project}

# Option 2: App Service slot swap (fastest for web apps)
az webapp deployment slot swap \
  --resource-group {rg} \
  --name {appName} \
  --slot production \
  --target-slot staging

# Option 3: Revert the merge commit
git revert {mergeCommitHash} --no-edit
git push origin main
# CI will trigger, building the reverted code

# Option 4: Feature flag disable (no redeployment)
# Toggle feature flags to disable new functionality
```

### Database Rollback

If the release includes database migrations:
```
1. Identify migration scripts applied in this release
2. Execute reverse migration scripts in reverse order
3. Verify data integrity after rollback
4. Update migration tracking table
```

### Post-Rollback Actions

1. Create a Bug work item for the failed release:
   ```bash
   az boards work-item create --type Bug \
     --title "Release {version} rollback: {reason}" \
     --description "Release rolled back due to {detailed reason}. Build: {buildId}" \
     --fields "Microsoft.VSTS.Common.Priority=1" "System.Tags=release-rollback" \
     --org {org} --project {project}
   ```

2. Notify stakeholders (Teams + Outlook if available)
3. Update release session file with rollback details
4. Schedule post-mortem review

---

## Multi-Stage Pipeline YAML Patterns

### Standard CI/CD with Environment Gates

```yaml
trigger:
  branches:
    include: [main]

stages:
  - stage: Build
    jobs:
      - job: BuildAndTest
        pool:
          vmImage: 'ubuntu-latest'
        steps:
          - task: DotNetCoreCLI@2
            inputs: { command: 'build', arguments: '--configuration Release' }
          - task: DotNetCoreCLI@2
            inputs: { command: 'test', arguments: '--collect:"XPlat Code Coverage"' }
          - task: PublishTestResults@2
            inputs:
              testResultsFormat: 'VSTest'
              testResultsFiles: '**/*.trx'
          - task: PublishBuildArtifacts@1
            inputs:
              pathToPublish: '$(Build.ArtifactStagingDirectory)'
              artifactName: 'drop'

  - stage: DeployDev
    dependsOn: Build
    condition: succeeded()
    jobs:
      - deployment: DeployToDev
        environment: 'dev'
        strategy:
          runOnce:
            deploy:
              steps:
                - script: echo "Deploying to Dev"

  - stage: DeployStaging
    dependsOn: DeployDev
    condition: succeeded()
    jobs:
      - deployment: DeployToStaging
        environment: 'staging'
        strategy:
          runOnce:
            deploy:
              steps:
                - script: echo "Deploying to Staging"
            postRouteTraffic:
              steps:
                - script: ./run-smoke-tests.sh staging

  - stage: DeployProd
    dependsOn: DeployStaging
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: DeployToProduction
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - script: echo "Deploying to Production"
            on:
              failure:
                steps:
                  - script: echo "Deployment failed -- triggering rollback"
            postRouteTraffic:
              steps:
                - script: ./run-smoke-tests.sh production
```

### Canary Deployment Pattern

```yaml
  - stage: DeployProdCanary
    dependsOn: DeployStaging
    jobs:
      - deployment: CanaryDeploy
        environment: 'production'
        strategy:
          canary:
            increments: [10, 50]
            preDeploy:
              steps:
                - script: echo "Preparing canary deployment"
            deploy:
              steps:
                - script: echo "Deploying canary"
            routeTraffic:
              steps:
                - script: echo "Routing $(Strategy.Increment)% traffic to canary"
            postRouteTraffic:
              steps:
                - script: ./run-canary-validation.sh $(Strategy.Increment)
            on:
              failure:
                steps:
                  - script: echo "Canary failed -- rolling back"
              success:
                steps:
                  - script: echo "Canary succeeded -- promoting"
```

### Ring-Based Deployment

```
Ring 0: Internal team (canary)     -- auto-deploy, 1h soak
Ring 1: Early adopters (10%)       -- manual trigger, 4h soak
Ring 2: Broader audience (50%)     -- manual trigger, 24h soak
Ring 3: Full deployment (100%)     -- manual trigger after all rings pass
```

---

## Release Health Scoring

### Metric Collection

For each release, collect:

```
1. Gate results:
   - How many gates passed on first attempt
   - How many required retries
   - How many failed

2. Deployment metrics:
   - Duration (time from trigger to completion)
   - Baseline duration (average of last 10 successful deployments)

3. Post-deployment metrics:
   - Error rate in the first 30 minutes vs. baseline
   - Number of rollbacks

4. Approval metrics:
   - Time from approval request to approval granted
   - Number of rejections before approval
```

### Scoring Formula

```
Gate_Score:
  All gates passed first try:           100
  1 gate required retry:                 70
  Any gate failed (manual override):     30
  Gate bypassed without approval:         0

Duration_Score:
  duration <= baseline:                  100
  duration <= 1.5x baseline:              75
  duration <= 2x baseline:                50
  duration > 2x baseline:                 25

ErrorRate_Score:
  error_rate <= baseline:                100
  error_rate <= baseline + 2%:            75
  error_rate <= baseline + 5%:            50
  error_rate > baseline + 5%:             25

Rollback_Score:
  0 rollbacks:                           100
  0 rollbacks (close call, manual check): 75
  1+ rollbacks:                            0

Release_Health = (Gate_Score * 0.30) + (Duration_Score * 0.20)
               + (ErrorRate_Score * 0.30) + (Rollback_Score * 0.20)
```

### Release Health Report

```
## Release Health -- v{version}

**Score**: {score}/100 ({rating})
**Date**: {date} | **Pipeline**: {name} | **Run**: #{runId}

### Gate Results
| Gate | Environment | Result | Duration |
|------|-------------|--------|----------|
| Quality | Staging | PASS (97.2%) | instant |
| Security | Staging | PASS (0 critical) | instant |
| Approval | Staging | PASS | 45 min |
| Approval | Production | PASS | 2h 15m |
| Change Window | Production | PASS | in-window |

### Deployment Metrics
| Metric | Value | Baseline | Status |
|--------|-------|----------|--------|
| Duration | 8m 30s | 7m 45s | OK |
| Error Rate (30m) | 0.12% | 0.10% | OK |
| Rollbacks | 0 | -- | OK |

### Scoring Breakdown
| Component | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Gates | 100 | 30% | 30 |
| Duration | 75 | 20% | 15 |
| Error Rate | 100 | 30% | 30 |
| Rollbacks | 100 | 20% | 20 |
| **Total** | | | **95** |
```

---

## Environment Promotion State Tracking

Maintain a release state file at `sessions/release/{version}/state.json`:

```json
{
  "version": "2.5.0",
  "state": "QA_VALIDATED",
  "buildId": 12345,
  "artifactName": "drop",
  "stages": {
    "build": { "status": "passed", "at": "2026-03-11T08:00:00Z" },
    "dev": { "status": "passed", "at": "2026-03-11T08:15:00Z" },
    "qa": { "status": "passed", "at": "2026-03-11T10:00:00Z" },
    "staging": { "status": "pending" },
    "production": { "status": "pending" }
  },
  "gates": {
    "testPassRate": { "value": 99.2, "threshold": 95, "status": "passed" },
    "codeCoverage": { "value": 82.1, "threshold": 80, "status": "passed" },
    "securityScan": { "critical": 0, "high": 0, "status": "passed" },
    "approvals": { "received": 2, "required": 3, "status": "pending" },
    "workItems": { "resolved": 12, "total": 12, "status": "passed" }
  },
  "workItems": [4521, 4522, 4523, 4530, 4531],
  "rollbackPlan": "sessions/release/2.5.0/rollback.md"
}
```

---

## Tagging and Version Management

```bash
# Create annotated tag
git tag -a "v{version}" -m "Release v{version}: {summary}"
git push origin "v{version}"

# Tag the Azure DevOps build
az pipelines runs tag add \
  --run-id {buildRunId} \
  --tag "v{version}" \
  --org {org} --project {project}
```
