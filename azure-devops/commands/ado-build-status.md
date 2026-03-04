---
name: ado-build-status
description: Check the status of recent pipeline builds with failure analysis and log inspection
argument-hint: "[--pipeline <pipeline-id>] [--top <count>] [--branch <branch>] [--result failed|succeeded|canceled] [--retry <build-id>]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# Check Build Status

List recent pipeline runs, inspect failed build logs, categorize failures, and optionally retry builds.

## Prerequisites

- Authenticated to Azure DevOps (run `/ado-setup` first)
- `View builds` permission on the project

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `--pipeline` | No | Filter by pipeline definition ID or name |
| `--top` | No | Number of builds to return (default: 10) |
| `--branch` | No | Filter by branch name |
| `--result` | No | Filter by result: `failed`, `succeeded`, `canceled`, `partiallySucceeded` |
| `--date-range` | No | Filter by date range: `today`, `7d`, `30d`, or `YYYY-MM-DD..YYYY-MM-DD` |
| `--retry` | No | Retry/requeue a specific build by ID |
| `--logs` | No | Show detailed logs for a specific build ID |

## Instructions

1. **List builds** — call `GET /_apis/build/builds?api-version=7.1` with query parameters:
   - `definitions={pipeline-id}` if `--pipeline` specified
   - `branchName=refs/heads/{branch}` if `--branch` specified
   - `resultFilter={result}` if `--result` specified
   - `minTime` / `maxTime` for `--date-range`
   - `$top={count}` for `--top`

   CLI: `az pipelines runs list --pipeline-ids {id} --branch {branch} --result {result} --top {count}`

2. **Display results table**:
   | Build ID | Pipeline | Branch | Status | Result | Duration | Queued By | Finished |
   Highlight failed builds. Calculate duration from `startTime` and `finishTime`.

3. **Failure analysis** — for failed builds, categorize the failure:
   - **Build error**: compilation failures, missing dependencies
   - **Test failure**: test task failed, test results show failures
   - **Infrastructure**: agent offline, pool capacity, timeout
   - **Policy**: branch policy check failed

4. **Log inspection** — if `--logs` is specified or a build failed:
   - Get timeline: `GET /_apis/build/builds/{buildId}/timeline?api-version=7.1`
   - Find failed records (tasks/jobs with `result: "failed"`)
   - Fetch specific log: `GET /_apis/build/builds/{buildId}/logs/{logId}?api-version=7.1`
   - Extract and display error lines (lines containing `error`, `Error`, `FAILED`, `##vso[task.logissue]`)
   - Show stage/job/task durations from timeline entries

5. **Retry build** — if `--retry` is specified:
   - Call `PATCH /_apis/build/builds/{buildId}?api-version=7.1&retry=true`
   - CLI: `az pipelines build queue --definition-id {defId} --branch {branch}`
   - Display the new build ID and link

6. **Summary** — show aggregate stats: total runs, pass rate, average duration, most common failure reason.

## Examples

```bash
/ado-build-status --pipeline 42 --top 5
/ado-build-status --result failed --date-range 7d
/ado-build-status --logs 12345
/ado-build-status --retry 12345
```

## Error Handling

- **Pipeline not found**: List available pipelines with `GET /_apis/build/definitions` and prompt user.
- **No builds found**: Widen the filter or confirm the pipeline has been run.
- **Log unavailable**: Build may still be in progress or logs may have been purged by retention policy.
