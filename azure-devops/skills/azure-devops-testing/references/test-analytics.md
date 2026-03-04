# Azure Test Plans — Test Analytics Reference

## Overview

Azure DevOps provides test analytics through the Analytics OData service and the Test Results REST API. Pipeline-published test results flow into analytics entity sets for trend analysis, pass rate tracking, flaky test identification, and duration monitoring. This reference covers the OData entity sets for test data, aggregation query patterns, pipeline integration via the `PublishTestResults` task, Power BI connectivity, and REST API access for test runs and results.

---

## Analytics OData Endpoint

```
https://analytics.dev.azure.com/{org}/{project}/_odata/v4.0-preview/
```

Authentication: PAT with **Analytics (Read)** permission, or Azure AD token with `user_impersonation` scope.

---

## Test Entity Sets

| Entity Set | Description | Key Fields |
|-----------|-------------|------------|
| `TestRuns` | Individual test run executions | `TestRunId`, `Title`, `StartedDate`, `CompletedDate`, `State`, `TotalTests`, `PassedTests`, `FailedTests`, `NotExecutedTests` |
| `TestResults` | Individual test case results within a run | `TestResultId`, `TestRun`, `TestCaseTitle`, `Outcome`, `DurationSeconds`, `FailureType`, `ErrorMessage`, `StackTrace` |
| `TestResultsDaily` | Pre-aggregated daily test result snapshots | `DateSK`, `TestSK`, `Outcome`, `ResultCount`, `ResultDurationSeconds` |
| `TestPointHistorySnapshot` | Historical test point status over time | `DateSK`, `TestPointId`, `Outcome`, `TestCaseId`, `ConfigurationId` |

---

## Common OData Queries

### Pass Rate by Pipeline (Last 30 Days)

```
https://analytics.dev.azure.com/myorg/myproject/_odata/v4.0-preview/TestResultsDaily?
  $apply=filter(DateSK ge 20260202)
    /groupby(
      (Pipeline/PipelineName),
      aggregate(
        ResultCount with sum as TotalTests,
        ResultPassCount with sum as PassedTests
      )
    )
  &$orderby=TotalTests desc
```

### Failed Tests by Test Case (Last 7 Days)

```
https://analytics.dev.azure.com/myorg/myproject/_odata/v4.0-preview/TestResults?
  $filter=CompletedDate ge 2026-02-25Z and Outcome eq 'Failed'
  &$select=TestCaseTitle,Outcome,DurationSeconds,ErrorMessage
  &$orderby=CompletedDate desc
  &$top=100
```

### Test Duration Trend (Daily Average)

```
https://analytics.dev.azure.com/myorg/myproject/_odata/v4.0-preview/TestResultsDaily?
  $apply=filter(DateSK ge 20260101)
    /groupby(
      (DateSK),
      aggregate(
        ResultDurationSeconds with sum as TotalDuration,
        ResultCount with sum as TotalTests
      )
    )
  &$orderby=DateSK asc
```

### Tests by Outcome Type

```
https://analytics.dev.azure.com/myorg/myproject/_odata/v4.0-preview/TestResultsDaily?
  $apply=filter(DateSK ge 20260201)
    /groupby(
      (Outcome),
      aggregate(ResultCount with sum as Total)
    )
```

---

## Test Outcome Types

| Outcome | Meaning |
|---------|---------|
| `Passed` | Test completed successfully |
| `Failed` | Test did not meet expectations |
| `Inconclusive` | Result could not be determined |
| `Aborted` | Execution was cancelled |
| `NotExecuted` | Test was skipped or not run |
| `Error` | System/infrastructure error during execution |
| `Warning` | Passed with warnings |
| `NotApplicable` | Test not relevant for this run |
| `Blocked` | Could not execute due to dependencies |

---

## Pipeline Test Results Integration

### PublishTestResults Task

Publish test results from CI/CD pipelines into Analytics:

```yaml
# YAML pipeline step
- task: PublishTestResults@2
  inputs:
    testResultsFormat: 'JUnit'        # JUnit, NUnit, VSTest, XUnit, CTest
    testResultsFiles: '**/TEST-*.xml'
    searchFolder: '$(System.DefaultWorkingDirectory)'
    mergeTestResults: true
    testRunTitle: 'Unit Tests - $(Build.BuildNumber)'
    failTaskOnFailedTests: true
    publishRunAttachments: true
```

### Supported Test Result Formats

| Format | File Pattern | Framework |
|--------|-------------|-----------|
| JUnit | `TEST-*.xml` | Java/Maven, pytest, Jest |
| NUnit | `*.xml` | .NET NUnit |
| VSTest | `*.trx` | .NET MSTest, VSTest |
| XUnit | `*.xml` | .NET xUnit |
| CTest | `Test.xml` | CMake CTest |

### Pipeline Code Coverage

```yaml
- task: PublishCodeCoverageResults@2
  inputs:
    summaryFileLocation: '$(System.DefaultWorkingDirectory)/**/coverage.cobertura.xml'
    failIfCoverageEmpty: true
```

---

## Flaky Test Detection

### Identifying Flaky Tests via OData

A flaky test alternates between pass and fail across consecutive runs without code changes. Query for tests with mixed outcomes:

```
https://analytics.dev.azure.com/myorg/myproject/_odata/v4.0-preview/TestResultsDaily?
  $apply=filter(DateSK ge 20260201)
    /groupby(
      (Test/TestCaseReferenceId, Test/TestName),
      aggregate(
        ResultPassCount with sum as Passes,
        ResultFailCount with sum as Failures,
        ResultCount with sum as Total
      )
    )
    /filter(Passes gt 0 and Failures gt 0)
  &$orderby=Failures desc
  &$top=50
```

### Flaky Test Heuristics

A test is likely flaky when:
- **Flip rate > 20%**: passes and fails in more than 20% of runs without associated code changes
- **Same build, different outcomes**: rerunning the same pipeline produces different results
- **Short failure streaks**: fails for 1-2 runs then passes again (vs. persistent failures which indicate real bugs)

### Built-in Flaky Test Management

Azure DevOps has built-in flaky test detection in pipeline settings:

1. Navigate to **Project Settings > Pipelines > Test Management**
2. Enable **Flaky test detection** with the "System detected" option
3. Flaky tests are automatically flagged and can be excluded from pass rate calculations

---

## REST API for Test Runs and Results

### Listing Test Runs with Filters

```bash
curl -u ":$PAT" \
  "https://dev.azure.com/myorg/myproject/_apis/test/runs?minLastUpdatedDate=2026-02-01&maxLastUpdatedDate=2026-03-04&api-version=7.1"
```

### Getting Results for a Run

```bash
curl -u ":$PAT" \
  "https://dev.azure.com/myorg/myproject/_apis/test/runs/{runId}/results?api-version=7.1&\$top=200&outcomes=Failed"
```

### Test Run Statistics

```bash
curl -u ":$PAT" \
  "https://dev.azure.com/myorg/myproject/_apis/test/runs/{runId}?includeDetails=true&api-version=7.1"
```

Response includes:

```json
{
  "id": 456,
  "name": "Unit Tests - 20260304.1",
  "state": "Completed",
  "totalTests": 1200,
  "passedTests": 1185,
  "failedTests": 10,
  "incompleteTests": 5,
  "notApplicableTests": 0,
  "runStatistics": [
    { "state": "Completed", "outcome": "Passed", "count": 1185 },
    { "state": "Completed", "outcome": "Failed", "count": 10 },
    { "state": "Completed", "outcome": "NotExecuted", "count": 5 }
  ],
  "startedDate": "2026-03-04T10:00:00Z",
  "completedDate": "2026-03-04T10:05:32Z"
}
```

---

## Power BI Integration

### Connecting Power BI to Test Analytics

1. Open Power BI Desktop > **Get Data** > **OData Feed**
2. Enter the OData URL: `https://analytics.dev.azure.com/{org}/{project}/_odata/v4.0-preview/TestResultsDaily`
3. Authenticate with **Organizational account** (Azure AD) or **Basic** (PAT)
4. Select entity sets and build visuals

### Sample Power BI Measures

```dax
Pass Rate =
DIVIDE(
    SUM(TestResultsDaily[ResultPassCount]),
    SUM(TestResultsDaily[ResultCount]),
    0
)

Avg Duration (sec) =
DIVIDE(
    SUM(TestResultsDaily[ResultDurationSeconds]),
    SUM(TestResultsDaily[ResultCount]),
    0
)

Flaky Test Count =
COUNTROWS(
    FILTER(
        SUMMARIZE(
            TestResultsDaily,
            TestResultsDaily[TestName],
            "Passes", SUM(TestResultsDaily[ResultPassCount]),
            "Failures", SUM(TestResultsDaily[ResultFailCount])
        ),
        [Passes] > 0 && [Failures] > 0
    )
)
```

---

## Aggregation Patterns

### Group by Pipeline and Date

```
$apply=groupby(
  (DateSK, Pipeline/PipelineName),
  aggregate(
    ResultCount with sum as Total,
    ResultPassCount with sum as Passed,
    ResultFailCount with sum as Failed
  )
)
```

### Group by Test Suite

```
$apply=groupby(
  (TestSuite/TestSuiteName),
  aggregate(
    ResultCount with sum as Total,
    ResultPassCount with sum as Passed,
    ResultFailCount with sum as Failed,
    ResultDurationSeconds with average as AvgDuration
  )
)
```

### Cycle Time Analysis (First Run to Pass)

```
$apply=filter(Outcome eq 'Passed')
  /groupby(
    (Test/TestName),
    aggregate(CompletedDateSK with min as FirstPassDate)
  )
```

---

## Performance Tips

- **Narrow date ranges**: always include a `DateSK` filter. Unbounded queries are throttled or fail on large organizations.
- **Use `$select`**: request only fields you need. Entity sets have many columns, and full projections are slow.
- **Prefer `TestResultsDaily`**: pre-aggregated daily snapshots are orders of magnitude faster than querying raw `TestResults`.
- **Batch requests**: OData has a 10,000-row response limit. Use `$top` and `$skip` or continuation tokens for large datasets.
- **Cache analytics views**: for dashboards, create an Analytics View in Azure DevOps and connect Power BI to that view instead of raw OData.
- **Avoid `$expand` on large sets**: expanding navigation properties (e.g., `TestRun/Pipeline`) multiplies response size. Use `$select` on expanded properties.

---

## Limits and Gotchas

- **Analytics latency**: test results appear in Analytics within 1-5 minutes of pipeline completion. Do not query immediately after a run finishes.
- **OData row limit**: max 10,000 rows per response. Use server-side paging for larger datasets.
- **Historical data retention**: Analytics retains data for the lifetime of the organization. However, deleted test runs are purged and not recoverable.
- **Cross-project queries**: OData queries are scoped to a single project unless using the organization-level endpoint (`/_odata/v4.0-preview/` without the project segment).
- **Permissions**: Analytics (Read) permission is required. This is separate from Test Plans (Read).
- **Preview API version**: `v4.0-preview` is the current stable version. Earlier versions may have different entity structures.
