---
name: ado-test-run
description: Create test runs, record results, and view test analytics
argument-hint: "--plan <plan-id> --suite <suite-id> --action create|record|analytics [--result pass|fail|block]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# Manage Test Runs

Create and manage test runs, record test results (pass, fail, block), add comments and attachments, and view test analytics and trends.

## Prerequisites

- Authenticated to Azure DevOps (run `/ado-setup` first)
- Test plan and suite created (run `/ado-test-plan` first)
- `Manage test runs` permission

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `--plan` | Yes | Test plan ID |
| `--suite` | No | Test suite ID (creates run from suite) |
| `--action` | No | `create` (default), `record`, `analytics`, `list` |
| `--run-id` | No | Existing test run ID (for recording results) |
| `--result` | No | Test result: `pass`, `fail`, `block`, `not-applicable` |
| `--test-case-id` | No | Specific test case to record result for |
| `--comment` | No | Comment to add to test result |
| `--attachment` | No | File path to attach to result |
| `--date-range` | No | Date range for analytics: `7d`, `30d`, `90d` |

## Instructions

1. **Create test run** — `POST /_apis/test/runs?api-version=7.1`:
   ```json
   {
     "name": "Sprint 5 Test Run",
     "plan": { "id": <planId> },
     "pointIds": [<testPointId1>, <testPointId2>],
     "automated": false,
     "state": "InProgress"
   }
   ```
   Get test points: `GET /_apis/testplan/plans/{planId}/suites/{suiteId}/testpoint?api-version=7.1`.

2. **Record test results** — `PATCH /_apis/test/runs/{runId}/results?api-version=7.1`:
   ```json
   [
     {
       "id": <resultId>,
       "outcome": "Passed",
       "state": "Completed",
       "comment": "Verified login works with SSO",
       "durationInMs": 30000
     }
   ]
   ```
   Valid outcomes: `Passed`, `Failed`, `Blocked`, `NotApplicable`, `NotExecuted`.

3. **Add attachments** — `POST /_apis/test/runs/{runId}/results/{resultId}/attachments?api-version=7.1` with base64 file content.

4. **Complete test run** — `PATCH /_apis/test/runs/{runId}?api-version=7.1`:
   ```json
   { "state": "Completed" }
   ```

5. **List test runs** — `GET /_apis/test/runs?api-version=7.1&includeRunDetails=true`
   Display: Run ID, Name, State, Total Tests, Passed, Failed, Date.

6. **View analytics** — query test result trends:
   - `GET /_apis/test/resultsummarybybuild?api-version=7.1` for build-correlated results
   - Calculate pass rate, failure trends, flaky tests
   - Display: Total runs, pass rate %, most-failing tests, average duration

## Examples

```bash
/ado-test-run --plan 10 --suite 20 --action create
/ado-test-run --run-id 100 --action record --test-case-id 301 --result pass --comment "Verified on Chrome"
/ado-test-run --run-id 100 --action record --test-case-id 302 --result fail --comment "Null ref on submit" --attachment ./screenshot.png
/ado-test-run --action analytics --plan 10 --date-range 30d
/ado-test-run --action list --plan 10
```

## Error Handling

- **Run not found**: Verify run ID exists with `GET /_apis/test/runs/{runId}`.
- **Test point not found**: Ensure test cases are added to the suite and configuration matches.
- **Run already completed**: Cannot record results for completed runs — create a new run.
- **Attachment too large**: Max file size is 100 MB — compress or split the file.
