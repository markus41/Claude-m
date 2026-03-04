---
name: Azure DevOps Testing
description: >
  Deep expertise in Azure Test Plans — test plan creation, test suite management
  (static, requirement-based, query-based), test case authoring, test runs and results,
  test configurations, and test analytics via OData.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - test plan
  - test case
  - test suite
  - test run
  - ado testing
  - azure test plans
  - test analytics
  - manual testing
  - test configuration
---

# Azure DevOps Testing

## Shared Workflow Routing
- Use the shared workflow spec for deterministic multi-plugin routing: [`workflows/multi-plugin-workflows.md`](../../../workflows/multi-plugin-workflows.md#incident-triage-azure-monitor--azure-functions--azure-devops).

## Overview

Azure Test Plans provides manual and exploratory testing integrated with Azure Boards and Pipelines. Test plans organize test suites (static, requirement-based, query-based), which contain test cases with defined steps and expected results. Test configurations define the matrix of OS/browser/environment combinations. Test runs record pass/fail results with screenshots and attachments.

Pipeline test results published via `PublishTestResults@2` feed into Analytics for trend reporting, flaky test detection, and test impact analysis.

## REST API — Test Plans

| Method | Endpoint | Required Permissions | Key Parameters |
|--------|----------|---------------------|----------------|
| GET | `/_apis/testplan/plans?api-version=7.1` | Test Plans (Read) | `$top`, `continuationToken` |
| POST | `/_apis/testplan/plans?api-version=7.1` | Test Plans (Write) | Body: `name`, `areaPath`, `iteration` |
| GET | `/_apis/testplan/plans/{planId}?api-version=7.1` | Test Plans (Read) | — |
| PATCH | `/_apis/testplan/plans/{planId}?api-version=7.1` | Test Plans (Write) | Body: fields to update |
| DELETE | `/_apis/testplan/plans/{planId}?api-version=7.1` | Test Plans (Write) | — |

## REST API — Test Suites

| Method | Endpoint | Key Parameters |
|--------|----------|----------------|
| GET | `/_apis/testplan/plans/{planId}/suites?api-version=7.1` | `$top`, `asTreeView` |
| POST | `/_apis/testplan/plans/{planId}/suites?api-version=7.1` | Body: `name`, `suiteType`, `parentSuite` |
| GET | `/_apis/testplan/plans/{planId}/suites/{suiteId}?api-version=7.1` | — |
| DELETE | `/_apis/testplan/plans/{planId}/suites/{suiteId}?api-version=7.1` | — |

### Suite Types

| Type | `suiteType` Value | Description |
|------|-------------------|-------------|
| Static | `staticTestSuite` | Manually grouped test cases |
| Requirement-based | `requirementTestSuite` | Auto-linked from requirement work item |
| Query-based | `dynamicTestSuite` | Populated by WIQL query |

## REST API — Test Cases & Points

| Method | Endpoint | Key Parameters |
|--------|----------|----------------|
| POST | `/_apis/testplan/plans/{planId}/suites/{suiteId}/testcase?api-version=7.1` | Body: `[{ workItem: { id } }]` |
| GET | `/_apis/testplan/plans/{planId}/suites/{suiteId}/testpoint?api-version=7.1` | `testCaseId`, `configurationId` |
| PATCH | `/_apis/testplan/plans/{planId}/suites/{suiteId}/testpoint?api-version=7.1` | Body: `[{ id, results: { outcome } }]` |

## REST API — Test Runs & Results

| Method | Endpoint | Key Parameters |
|--------|----------|----------------|
| GET | `/_apis/test/runs?api-version=7.1` | `minLastUpdatedDate`, `maxLastUpdatedDate` |
| POST | `/_apis/test/runs?api-version=7.1` | Body: `name`, `plan`, `pointIds` |
| GET | `/_apis/test/runs/{runId}?api-version=7.1` | — |
| PATCH | `/_apis/test/runs/{runId}?api-version=7.1` | Body: `state` (Completed, Aborted) |
| GET | `/_apis/test/runs/{runId}/results?api-version=7.1` | `$top`, `outcomes` |
| POST | `/_apis/test/runs/{runId}/results?api-version=7.1` | Body: `[{ testCaseTitle, outcome, comment }]` |

### Test Outcomes

| Outcome | Value | Description |
|---------|-------|-------------|
| Passed | `Passed` | Test passed all steps |
| Failed | `Failed` | One or more steps failed |
| Blocked | `Blocked` | Cannot execute (dependency/environment) |
| Not Applicable | `NotApplicable` | Test not relevant for this config |
| Not Executed | `NotExecuted` | Not yet run |

## REST API — Test Configurations

| Method | Endpoint | Key Parameters |
|--------|----------|----------------|
| GET | `/_apis/testplan/configurations?api-version=7.1` | `$top` |
| POST | `/_apis/testplan/configurations?api-version=7.1` | Body: `name`, `values` |

### Configuration Example
```json
{
  "name": "Windows 11 + Chrome",
  "values": [
    { "name": "Operating System", "value": "Windows 11" },
    { "name": "Browser", "value": "Chrome" }
  ]
}
```

## Test Analytics via OData

Endpoint: `https://analytics.dev.azure.com/{org}/{project}/_odata/v4.0-preview/`

| Entity Set | Key Fields |
|------------|------------|
| `TestRuns` | `TestRunId`, `Title`, `StartedDate`, `CompletedDate`, `State`, `TotalTests`, `PassedTests` |
| `TestResults` | `TestCaseReferenceId`, `Outcome`, `DurationSeconds`, `CompletedDate` |
| `TestResultsDaily` | Aggregated daily pass/fail counts |

### Flaky Test Query
```
TestResults?$filter=Outcome eq 'Failed' and CompletedDate ge 2024-01-01Z
  &$apply=groupby((TestCaseReferenceId, TestCaseTitle),
    aggregate(ResultCount with sum as TotalRuns,
              FailedCount with sum as TotalFails))
  &$orderby=TotalFails desc
  &$top=20
```

## Best Practices

- Use requirement-based suites to auto-link test coverage to user stories.
- Define configurations for cross-platform test matrices.
- Publish pipeline test results with `PublishTestResults@2` for Analytics integration.
- Use test impact analysis to run only tests affected by code changes.
- Track flaky tests via Analytics OData aggregation queries.
- Use shared steps for common preconditions across test cases.

## Progressive Disclosure — Reference Files

| Topic | File |
|---|---|
| Test plans, suites, cases, configurations, manual testing workflow | [`references/test-plans.md`](./references/test-plans.md) |
| Test analytics, OData queries, flaky detection, trends | [`references/test-analytics.md`](./references/test-analytics.md) |
