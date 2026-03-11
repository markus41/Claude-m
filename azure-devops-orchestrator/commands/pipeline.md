---
name: azure-devops-orchestrator:pipeline
description: >
  Pipeline monitoring and debugging: check recent runs, analyze failures, detect flaky tests,
  suggest fixes. Provides deep diagnostics for Azure DevOps pipeline issues.
argument-hint: "<pipelineName|pipelineId> [--project <name>] [--last <N>] [--fix]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Task
---

# azure-devops-orchestrator:pipeline

Pipeline monitoring and debugging for Azure DevOps — failure analysis, flaky test detection, and fix suggestions.

## Arguments

- `<pipelineName|pipelineId>` — Pipeline name or numeric ID (required unless `--all` is used)
- `--project <name>` — Project name (default: auto-detect from current repo or default org)
- `--last <N>` — Number of recent runs to analyze (default: 10)
- `--fix` — Attempt to diagnose and suggest concrete fixes for failures
- `--all` — Show status of all pipelines in the project
- `--flaky` — Focus on flaky test detection across recent runs
- `--watch` — Show the latest run status (single snapshot, not continuous)

## Workflow

Invoke the **pipeline-orchestrator** agent to analyze pipeline health.

### Single Pipeline Mode

When a specific pipeline is provided:

1. **Fetch recent runs**:
   ```bash
   az pipelines runs list --pipeline-ids {pipelineId} --top {N} --project "{project}" --output json
   ```

2. **Analyze run results**:
   - Success/failure ratio over last N runs
   - Average duration and duration trend
   - Failure patterns (which stages/jobs fail most)
   - Failure streak detection (consecutive failures)

3. **For failed runs, fetch logs**:
   ```bash
   az pipelines runs show --id {runId} --project "{project}" --output json
   ```

4. **Identify failure root causes**:
   - Parse error messages from failed tasks
   - Categorize: build error, test failure, deployment failure, infrastructure issue, timeout
   - Check if failure is in user code or pipeline infrastructure

5. **Flaky test detection** (if `--flaky` or part of standard analysis):
   - Tests that pass/fail inconsistently across runs
   - Tests with high retry counts
   - Tests that fail only on specific agents or in parallel

### All Pipelines Mode

When `--all` is used:

1. List all pipelines: `az pipelines list --project "{project}" --output json`
2. For each, fetch last 3 runs
3. Produce a summary table with pass rates and last status

## Failure Categorization

| Category | Signals | Severity |
|----------|---------|----------|
| Build Error | Compilation failure, syntax error, missing dependency | High |
| Test Failure | Test assertion failed, test timeout | Medium |
| Deployment Failure | Environment unavailable, permission denied, resource conflict | High |
| Infrastructure | Agent offline, disk full, network timeout, Docker pull failure | Medium |
| Timeout | Job exceeded time limit | Medium |
| Flaky | Same test passes/fails across runs without code changes | Low |
| Configuration | Variable missing, secret expired, service connection invalid | High |

## Fix Suggestions (--fix)

When `--fix` is passed, analyze each failure and suggest fixes:

| Failure Type | Suggestion |
|-------------|-----------|
| Missing dependency | Show the package/import that is missing, suggest install command |
| Test assertion | Show expected vs. actual, point to the test file and line |
| Secret expired | Identify the service connection or variable, link to renewal steps |
| Agent issue | Suggest agent pool change or self-hosted agent diagnostics |
| Timeout | Suggest parallelization, caching, or timeout increase |
| Flaky test | Suggest quarantine, retry policy, or test stabilization |

## Output

### Single Pipeline

```
## Pipeline Report — {pipelineName}

**Project**: {project}
**Pipeline ID**: {id}
**Analyzed**: last {N} runs

### Summary
| Metric | Value |
|--------|-------|
| Pass Rate | {pct}% ({passed}/{total}) |
| Avg Duration | {min}m |
| Duration Trend | {increasing/stable/decreasing} |
| Current Streak | {n} {successes/failures} |
| Last Run | {status} — {date} |

### Recent Runs
| # | Run ID | Branch | Status | Duration | Trigger |
|---|--------|--------|--------|----------|---------|
| 1 | #{id}  | main   | Succeeded | 4m 32s | CI |

### Failure Analysis (if failures exist)
| Run | Stage | Error Category | Root Cause |
|-----|-------|---------------|------------|
| #{id} | Build | Build Error | Missing package '@azure/identity' |

### Flaky Tests (if detected)
| Test | Pass Rate | Runs Analyzed | Pattern |
|------|-----------|---------------|---------|
| test_auth_flow | 60% | 10 | Fails on parallel runs |

### Fix Suggestions (if --fix)
1. **#{runId} — Build Error**: Install missing dependency
   ```bash
   npm install @azure/identity
   ```
2. **Flaky: test_auth_flow**: Add retry or isolate from parallel execution
   ```yaml
   - task: VSTest@2
     inputs:
       rerunFailedTests: true
       rerunMaxAttempts: 2
   ```
```

### All Pipelines

```
## Pipeline Fleet Status — {project}

| Pipeline | Last Run | Pass Rate (10) | Avg Duration | Status |
|----------|----------|----------------|-------------|--------|
| CI-Build | Succeeded | 90% | 5m | OK |
| Deploy-Staging | Failed | 70% | 12m | Needs Attention |
| Nightly-Tests | Succeeded | 100% | 45m | OK |

### Pipelines Needing Attention
- **Deploy-Staging**: 3 failures in last 10 runs — service connection may need renewal
```

## Examples

```bash
# Check a specific pipeline
/azure-devops-orchestrator:pipeline "CI-Build" --project platform-api

# Analyze last 20 runs with fix suggestions
/azure-devops-orchestrator:pipeline 42 --last 20 --fix

# Show all pipelines in a project
/azure-devops-orchestrator:pipeline --all --project platform-api

# Focus on flaky tests
/azure-devops-orchestrator:pipeline "CI-Build" --flaky

# Quick status of latest run
/azure-devops-orchestrator:pipeline "CI-Build" --watch
```

## Tips

- Use `--fix` when you have consecutive failures and need actionable next steps
- `--flaky` is useful before release to identify unreliable tests that might block deployment
- Pair with `/azure-devops-orchestrator:status --scope pipelines` for a higher-level overview
- For deployment pipeline issues, check service connections and environment approvals first
