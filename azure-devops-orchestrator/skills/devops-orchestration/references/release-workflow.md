# Release Workflow Reference

The release workflow orchestrates a code release from build through production deployment,
validating gates at each stage, generating release notes, and preparing rollback plans.

## Release Pipeline Stages

```
Build → Dev → QA → Staging → Production
         ↓       ↓       ↓           ↓
     Auto-deploy  Gate  Gate    Gate + Approval
```

Each stage transition requires gate validation. Production additionally requires
human approval (validated via Azure DevOps environment approvals or manual confirmation).

## Stage Definition

| Stage | Purpose | Deployment | Gates |
|-------|---------|-----------|-------|
| **Build** | Compile, unit test, create artifacts | Automatic on merge | Build success, unit tests pass |
| **Dev** | Integration testing, developer smoke tests | Auto on build success | Build artifact exists |
| **QA** | Functional testing, regression testing | Manual or scheduled | Test pass rate >= 95%, no P1 bugs |
| **Staging** | Pre-production validation, performance testing | Gate-controlled | Code coverage >= 80%, security scan clean, load test pass |
| **Production** | Live deployment | Approval + gate-controlled | All prior gates + change approval + rollback plan ready |

## Gate Validation Protocol

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

# Calculate pass rate
# For each test run:
GET {org}/{project}/_apis/test/runs/{runId}/results?api-version=7.1
```

Aggregate:
```
Total tests = sum of all test results
Passed = count where outcome = "Passed"
Pass rate = Passed / Total × 100%
```

| Target | QA Gate | Staging Gate | Production Gate |
|--------|---------|-------------|----------------|
| Pass rate | >= 95% | >= 98% | >= 99% |
| P1 failures | 0 | 0 | 0 |
| P2 failures | <= 3 | 0 | 0 |

### Gate 3: Code Coverage

Extract code coverage from build artifacts:

```bash
# Get code coverage for build
GET {org}/{project}/_apis/test/codecoverage?buildId={buildId}&api-version=7.1
```

| Metric | Minimum | Target |
|--------|---------|--------|
| Line coverage | 70% | 80%+ |
| Branch coverage | 60% | 75%+ |
| No regression | Coverage must not decrease from previous release | |

### Gate 4: Security Scan

Check security scan results (if integrated in pipeline):

```bash
# Check for security scan task results in build timeline
GET {org}/{project}/_apis/build/builds/{buildId}/timeline?api-version=7.1

# Look for tasks like:
# - "SecurityAnalysis"
# - "SdtReport"
# - "dependency-check"
# - "container-scan"
```

| Severity | QA Gate | Staging Gate | Production Gate |
|----------|---------|-------------|----------------|
| Critical | Block | Block | Block |
| High | Warn | Block | Block |
| Medium | Pass | Warn | Warn |
| Low | Pass | Pass | Pass |

### Gate 5: Change Approval

For production deployments, verify approvals:

```bash
# Check environment approvals
GET {org}/{project}/_apis/pipelines/approvals?api-version=7.1

# Or check via environment
GET {org}/{project}/_apis/distributedtask/environments/{envId}/environmentdeploymentrecords?api-version=7.1
```

Required approvals:
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

## Gate Validation Report

```
## Release Gate Validation — v{version} → {targetStage}

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
{list of gates that failed with details}
```

## Release Notes Generation

### Source Data Collection

```bash
# Get commits between previous and current release
git log {previousTag}..{currentTag} --oneline --format="%H %s"

# Extract work item IDs from commit messages
# Patterns: AB#1234, #1234, WI-1234
# For each ID, fetch work item details

# Or get work items associated with builds in the release
GET {org}/{project}/_apis/build/builds/{buildId}/workitems?api-version=7.1
```

### Release Notes Template

```markdown
## Release {version} — {date}

### Highlights
{1-3 sentence summary of the most important changes}

### New Features
{User Stories resolved in this release}
- #{id}: {title} (@{assignee})

### Bug Fixes
{Bugs resolved in this release}
- #{id}: {title} (@{assignee})

### Improvements
{Tasks/enhancements resolved in this release}
- #{id}: {title} (@{assignee})

### Breaking Changes
{Any breaking changes — API contract changes, config changes, migration required}
- {description} — Migration: {steps}

### Known Issues
{Known issues not addressed in this release}
- #{id}: {title} — Workaround: {workaround}

### Contributors
{Unique assignees from all work items}

### Deployment Notes
- **Pipeline**: {pipelineName} #{buildNumber}
- **Artifact**: {artifactName}
- **Previous version**: {previousVersion}
- **Database migrations**: {yes/no} — {migration details}
- **Config changes**: {yes/no} — {config details}
```

## Deployment Patterns

### Canary Deployment

```yaml
# Azure DevOps pipeline YAML pattern
stages:
- stage: Production_Canary
  jobs:
  - deployment: canary
    environment: production
    strategy:
      canary:
        increments: [10, 50]
        deploy:
          steps:
          - task: AzureWebApp@1
            inputs:
              appName: $(appName)
        on:
          failure:
            steps:
            - script: echo "Canary failed — rolling back"
          success:
            steps:
            - script: echo "Canary healthy — promoting to {increment}%"
```

Monitor canary health:
- Error rate comparison (canary vs. baseline)
- Latency comparison (p50, p95, p99)
- Health endpoint checks
- Application Insights anomaly detection

### Blue-Green Deployment

```bash
# Azure App Service slot swap
az webapp deployment slot swap \
  --resource-group {rg} \
  --name {appName} \
  --slot staging \
  --target-slot production

# Verify health after swap
curl -sf https://{appName}.azurewebsites.net/health || az webapp deployment slot swap --resource-group {rg} --name {appName} --slot production --target-slot staging
```

### Ring-Based Deployment

1. **Ring 0**: Internal team (canary)
2. **Ring 1**: Early adopters (10% traffic)
3. **Ring 2**: Broader audience (50% traffic)
4. **Ring 3**: Full deployment (100% traffic)

Each ring validates for a minimum soak time before progressing.

## Rollback Procedures

### Pre-Deployment Rollback Checklist

Before promoting to production, verify:

- [ ] Previous deployment artifact is available and tagged
- [ ] Rollback pipeline exists and was tested in lower environment
- [ ] Database rollback script exists (if migrations included)
- [ ] Feature flags can disable new features independently
- [ ] Rollback time estimate is documented (target < 15 minutes)

### Rollback Execution

```bash
# Option 1: Redeploy previous version
az pipelines run \
  --id {rollbackPipelineId} \
  --parameters "version={previousVersion}" \
  --org {org} --project {project}

# Option 2: App Service slot swap (fastest)
az webapp deployment slot swap \
  --resource-group {rg} \
  --name {appName} \
  --slot production \
  --target-slot staging

# Option 3: Feature flag disable
# Toggle feature flags to disable new functionality without redeployment
```

### Database Rollback

If the release includes database migrations:
```
1. Identify migration scripts applied in this release
2. Execute reverse migration scripts in reverse order
3. Verify data integrity after rollback
4. Update migration tracking table
```

### Rollback Decision Criteria

| Metric | Threshold | Action |
|--------|-----------|--------|
| Error rate increase | > 5% above baseline | Investigate, prepare rollback |
| Error rate increase | > 15% above baseline | Immediate rollback |
| P99 latency increase | > 2x baseline | Investigate |
| P99 latency increase | > 5x baseline | Immediate rollback |
| Health check failures | > 3 consecutive | Immediate rollback |
| Customer-facing outage | Any | Immediate rollback |

## Tag and Version Management

### Semantic Versioning

```
{major}.{minor}.{patch}[-{prerelease}]

major = breaking changes
minor = new features (backward compatible)
patch = bug fixes (backward compatible)
prerelease = alpha, beta, rc (e.g., 2.5.0-rc.1)
```

### Tagging

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

### Environment Promotion Tracking

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
