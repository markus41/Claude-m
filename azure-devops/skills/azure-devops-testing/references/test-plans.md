# Azure Test Plans — Test Management Reference

## Overview

Azure Test Plans provides manual and exploratory testing capabilities integrated with Azure Boards. It supports structured test management through plans, suites, test cases, configurations, and test points. Test cases are work items with specialized fields for steps, expected results, shared steps, and parameterized data. Test execution results feed into analytics for pass rate tracking, flaky test detection, and compliance reporting. This reference covers the complete Test Plans REST API, suite types, test case authoring, configuration management, and execution workflows.

---

## Test Plans REST API

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/_apis/testplan/plans?api-version=7.1` | Test Plans (Read) | `filterActivePlans`, `owner`, `continuationToken` | List test plans; paginated |
| POST | `/_apis/testplan/plans?api-version=7.1` | Test Plans (Read & Write) | Body: `name`, `areaPath`, `iteration`, `startDate`, `endDate` | Create test plan |
| GET | `/_apis/testplan/plans/{planId}?api-version=7.1` | Test Plans (Read) | — | Get plan details |
| PATCH | `/_apis/testplan/plans/{planId}?api-version=7.1` | Test Plans (Read & Write) | Body: partial plan object | Update plan |
| DELETE | `/_apis/testplan/plans/{planId}?api-version=7.1` | Test Plans (Read & Write) | — | Delete plan and all child suites |
| GET | `/_apis/testplan/plans/{planId}/suites?api-version=7.1` | Test Plans (Read) | `expand`, `continuationToken`, `asTreeView` | List suites in a plan |
| POST | `/_apis/testplan/plans/{planId}/suites?api-version=7.1` | Test Plans (Read & Write) | Body: `name`, `suiteType`, `parentSuite`, `requirementId`, `queryString` | Create suite |
| GET | `/_apis/testplan/plans/{planId}/suites/{suiteId}?api-version=7.1` | Test Plans (Read) | — | Get suite details |
| PATCH | `/_apis/testplan/plans/{planId}/suites/{suiteId}?api-version=7.1` | Test Plans (Read & Write) | Body: partial suite | Update suite |
| DELETE | `/_apis/testplan/plans/{planId}/suites/{suiteId}?api-version=7.1` | Test Plans (Read & Write) | — | Delete suite |
| GET | `/_apis/testplan/plans/{planId}/suites/{suiteId}/testcase?api-version=7.1` | Test Plans (Read) | `continuationToken` | List test cases in a suite |
| POST | `/_apis/testplan/plans/{planId}/suites/{suiteId}/testcase?api-version=7.1` | Test Plans (Read & Write) | Body: array of `{ workItem: { id } }` | Add existing test cases to suite |
| DELETE | `/_apis/testplan/plans/{planId}/suites/{suiteId}/testcase/{testCaseId}?api-version=7.1` | Test Plans (Read & Write) | — | Remove test case from suite |
| GET | `/_apis/testplan/plans/{planId}/suites/{suiteId}/testpoint?api-version=7.1` | Test Plans (Read) | `testPointIds`, `testCaseId`, `continuationToken` | List test points |
| PATCH | `/_apis/testplan/plans/{planId}/suites/{suiteId}/testpoint?api-version=7.1` | Test Plans (Read & Write) | Body: array of point updates | Update test point assignments |
| GET | `/_apis/testplan/configurations?api-version=7.1` | Test Plans (Read) | `continuationToken` | List test configurations |
| POST | `/_apis/testplan/configurations?api-version=7.1` | Test Plans (Read & Write) | Body: `name`, `values`, `isDefault` | Create configuration |
| PATCH | `/_apis/testplan/configurations/{configId}?api-version=7.1` | Test Plans (Read & Write) | Body: partial config | Update configuration |
| DELETE | `/_apis/testplan/configurations/{configId}?api-version=7.1` | Test Plans (Read & Write) | — | Delete configuration |

### Test Run and Result Endpoints

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/_apis/test/runs?api-version=7.1` | Test Results (Read) | `minLastUpdatedDate`, `maxLastUpdatedDate`, `state`, `planId` | List test runs |
| POST | `/_apis/test/runs?api-version=7.1` | Test Results (Read & Write) | Body: `name`, `plan`, `pointIds` | Create a test run |
| GET | `/_apis/test/runs/{runId}?api-version=7.1` | Test Results (Read) | `includeDetails` | Get run details |
| PATCH | `/_apis/test/runs/{runId}?api-version=7.1` | Test Results (Read & Write) | Body: `state`, `comment` | Update run (complete, abort) |
| GET | `/_apis/test/runs/{runId}/results?api-version=7.1` | Test Results (Read) | `$top`, `$skip`, `outcomes` | List results in a run |
| POST | `/_apis/test/runs/{runId}/results?api-version=7.1` | Test Results (Read & Write) | Body: array of test results | Add/update results |
| GET | `/_apis/test/runs/{runId}/results/{resultId}/attachments?api-version=7.1` | Test Results (Read) | — | List result attachments |
| POST | `/_apis/test/runs/{runId}/results/{resultId}/attachments?api-version=7.1` | Test Results (Read & Write) | Body: `stream` (base64), `fileName` | Add attachment to result |

---

## Creating a Test Plan

```json
POST https://dev.azure.com/myorg/myproject/_apis/testplan/plans?api-version=7.1
Content-Type: application/json

{
  "name": "Release 4.2 Test Plan",
  "areaPath": "MyProject\\QA",
  "iteration": "MyProject\\Sprint 14",
  "startDate": "2026-03-09T00:00:00Z",
  "endDate": "2026-03-22T00:00:00Z",
  "description": "End-to-end validation for release 4.2"
}
```

Each plan contains a **root suite** automatically created with the plan. All other suites are children of this root.

---

## Test Suite Types

### Static Test Suite

Manual grouping — you explicitly add test cases:

```json
POST https://dev.azure.com/myorg/myproject/_apis/testplan/plans/{planId}/suites?api-version=7.1
Content-Type: application/json

{
  "name": "Smoke Tests",
  "suiteType": "staticTestSuite",
  "parentSuite": {
    "id": 1
  }
}
```

### Requirement-Based Test Suite

Linked to a user story or requirement work item. Test cases are associated through the `Tests` link type:

```json
{
  "name": "Login Story Tests",
  "suiteType": "requirementTestSuite",
  "requirementId": 42,
  "parentSuite": {
    "id": 1
  }
}
```

When the requirement work item gains new `Tests` links, the suite automatically includes those test cases.

### Query-Based Test Suite

Dynamically populated from a WIQL query:

```json
{
  "name": "P1 Bug Regression",
  "suiteType": "dynamicTestSuite",
  "queryString": "SELECT [System.Id] FROM WorkItems WHERE [System.WorkItemType] = 'Test Case' AND [System.Tags] CONTAINS 'regression' AND [Microsoft.VSTS.Common.Priority] = 1",
  "parentSuite": {
    "id": 1
  }
}
```

**Gotcha**: Query-based suites cannot have test cases manually added or removed. The query controls membership entirely.

---

## Test Case Creation

Test cases are work items of type "Test Case" with specialized fields:

```json
POST https://dev.azure.com/myorg/myproject/_apis/wit/workitems/$Test%20Case?api-version=7.1
Content-Type: application/json-patch+json

[
  {
    "op": "add",
    "path": "/fields/System.Title",
    "value": "Verify login with valid credentials"
  },
  {
    "op": "add",
    "path": "/fields/System.AreaPath",
    "value": "MyProject\\QA"
  },
  {
    "op": "add",
    "path": "/fields/Microsoft.VSTS.Common.Priority",
    "value": 1
  },
  {
    "op": "add",
    "path": "/fields/Microsoft.VSTS.TCM.Steps",
    "value": "<steps id=\"0\"><step id=\"1\" type=\"ActionStep\"><parameterizedString isformatted=\"true\">Navigate to the login page</parameterizedString><parameterizedString isformatted=\"true\">Login page loads with email and password fields</parameterizedString></step><step id=\"2\" type=\"ActionStep\"><parameterizedString isformatted=\"true\">Enter valid email: @email</parameterizedString><parameterizedString isformatted=\"true\">Email accepted</parameterizedString></step><step id=\"3\" type=\"ActionStep\"><parameterizedString isformatted=\"true\">Enter valid password: @password</parameterizedString><parameterizedString isformatted=\"true\">Password masked</parameterizedString></step><step id=\"4\" type=\"ActionStep\"><parameterizedString isformatted=\"true\">Click Sign In</parameterizedString><parameterizedString isformatted=\"true\">User redirected to dashboard</parameterizedString></step></steps>"
  },
  {
    "op": "add",
    "path": "/fields/Microsoft.VSTS.TCM.Parameters",
    "value": "<parameters><param name=\"email\" bind=\"default\" /><param name=\"password\" bind=\"default\" /></parameters>"
  },
  {
    "op": "add",
    "path": "/fields/Microsoft.VSTS.TCM.LocalDataSource",
    "value": "<NewDataSet><xs:schema id=\"NewDataSet\" xmlns:xs=\"http://www.w3.org/2001/XMLSchema\"><xs:element name=\"NewDataSet\"><xs:complexType><xs:choice minOccurs=\"0\" maxOccurs=\"unbounded\"><xs:element name=\"Table1\"><xs:complexType><xs:sequence><xs:element name=\"email\" type=\"xs:string\" minOccurs=\"0\" /><xs:element name=\"password\" type=\"xs:string\" minOccurs=\"0\" /></xs:sequence></xs:complexType></xs:element></xs:choice></xs:complexType></xs:element></xs:schema><Table1><email>admin@company.com</email><password>ValidPass1!</password></Table1><Table1><email>user@company.com</email><password>ValidPass2!</password></Table1></NewDataSet>"
  },
  {
    "op": "add",
    "path": "/fields/System.Tags",
    "value": "login; smoke; regression"
  }
]
```

### Test Case Fields

| Field Reference | Description | Format |
|----------------|-------------|--------|
| `Microsoft.VSTS.TCM.Steps` | Test steps with actions and expected results | XML (steps > step elements) |
| `Microsoft.VSTS.TCM.Parameters` | Parameter definitions for parameterized tests | XML |
| `Microsoft.VSTS.TCM.LocalDataSource` | Parameter data rows | XML DataSet |
| `Microsoft.VSTS.TCM.AutomatedTestName` | Fully qualified test method name | String (e.g., `MyApp.Tests.LoginTests.ValidLogin`) |
| `Microsoft.VSTS.TCM.AutomatedTestStorage` | Test assembly name | String (e.g., `MyApp.Tests.dll`) |
| `Microsoft.VSTS.TCM.AutomatedTestId` | GUID for automation association | GUID |
| `Microsoft.VSTS.TCM.AutomatedTestType` | Test framework type | String |

### Steps XML Format

Each `<step>` contains two `<parameterizedString>` elements:
1. **Action** (what the tester does)
2. **Expected result** (what should happen)

Step types:
- `ActionStep` — a normal test step
- `ValidateStep` — a validation-only step (no action, only expected result)

---

## Shared Steps

Shared Steps are reusable step sequences stored as separate work items:

```json
POST https://dev.azure.com/myorg/myproject/_apis/wit/workitems/$Shared%20Steps?api-version=7.1
Content-Type: application/json-patch+json

[
  {
    "op": "add",
    "path": "/fields/System.Title",
    "value": "Standard Login Flow"
  },
  {
    "op": "add",
    "path": "/fields/Microsoft.VSTS.TCM.Steps",
    "value": "<steps id=\"0\"><step id=\"1\" type=\"ActionStep\"><parameterizedString isformatted=\"true\">Navigate to login page</parameterizedString><parameterizedString isformatted=\"true\">Login page displayed</parameterizedString></step><step id=\"2\" type=\"ActionStep\"><parameterizedString isformatted=\"true\">Enter credentials</parameterizedString><parameterizedString isformatted=\"true\">Fields accept input</parameterizedString></step><step id=\"3\" type=\"ActionStep\"><parameterizedString isformatted=\"true\">Click Sign In</parameterizedString><parameterizedString isformatted=\"true\">Authenticated and redirected</parameterizedString></step></steps>"
  }
]
```

Reference shared steps from a test case using a `SharedStepReference` step type:

```xml
<steps id="0">
  <compref id="1" ref="12345" />
  <step id="2" type="ActionStep">
    <parameterizedString isformatted="true">Verify dashboard loads</parameterizedString>
    <parameterizedString isformatted="true">Dashboard shows user name</parameterizedString>
  </step>
</steps>
```

The `ref="12345"` is the work item ID of the Shared Steps item.

---

## Test Configurations

Configurations define the environments a test case must be validated against (browser, OS, device combinations):

```json
POST https://dev.azure.com/myorg/myproject/_apis/testplan/configurations?api-version=7.1
Content-Type: application/json

{
  "name": "Chrome on Windows 11",
  "description": "Desktop Chrome latest on Windows 11",
  "isDefault": false,
  "values": [
    { "name": "Operating System", "value": "Windows 11" },
    { "name": "Browser", "value": "Chrome" },
    { "name": "Browser Version", "value": "Latest" }
  ]
}
```

### Default Configuration

One configuration can be marked as `isDefault: true`. New test points automatically use the default configuration.

### Assigning Configurations to Suites

```json
PATCH https://dev.azure.com/myorg/myproject/_apis/testplan/plans/{planId}/suites/{suiteId}?api-version=7.1
Content-Type: application/json

{
  "defaultConfigurations": [
    { "id": 1 },
    { "id": 2 },
    { "id": 3 }
  ]
}
```

---

## Test Points

A test point is the intersection of a test case + configuration + tester assignment. For a test case with 3 configurations, there are 3 test points.

### Listing Test Points

```json
GET https://dev.azure.com/myorg/myproject/_apis/testplan/plans/{planId}/suites/{suiteId}/testpoint?api-version=7.1

// Response:
{
  "count": 3,
  "value": [
    {
      "id": 1,
      "testCaseReference": { "id": 42, "name": "Verify login" },
      "configuration": { "id": 1, "name": "Chrome on Windows 11" },
      "tester": { "displayName": "Jane Smith", "id": "..." },
      "results": { "outcome": "passed", "lastResultState": "Completed" },
      "isActive": true
    }
  ]
}
```

### Assigning Testers to Test Points

```json
PATCH https://dev.azure.com/myorg/myproject/_apis/testplan/plans/{planId}/suites/{suiteId}/testpoint?api-version=7.1
Content-Type: application/json

[
  {
    "id": 1,
    "tester": { "id": "<user-guid>" }
  },
  {
    "id": 2,
    "tester": { "id": "<user-guid>" }
  }
]
```

---

## Manual Test Execution

### Creating a Test Run

```json
POST https://dev.azure.com/myorg/myproject/_apis/test/runs?api-version=7.1
Content-Type: application/json

{
  "name": "Sprint 14 Smoke Run",
  "plan": { "id": 100 },
  "pointIds": [1, 2, 3, 4, 5],
  "automated": false,
  "comment": "Manual execution of smoke test suite"
}
```

### Recording Results

```json
POST https://dev.azure.com/myorg/myproject/_apis/test/runs/{runId}/results?api-version=7.1
Content-Type: application/json

[
  {
    "testPoint": { "id": 1 },
    "outcome": "Passed",
    "state": "Completed",
    "durationInMs": 45000,
    "comment": "Login flow verified successfully"
  },
  {
    "testPoint": { "id": 2 },
    "outcome": "Failed",
    "state": "Completed",
    "durationInMs": 30000,
    "comment": "Password field accepts input beyond 128 chars — see bug #789",
    "errorMessage": "Validation not triggered for long passwords",
    "associatedBugs": [
      {
        "id": 789,
        "url": "https://dev.azure.com/myorg/myproject/_apis/wit/workitems/789"
      }
    ]
  }
]
```

### Test Outcome Values

| Outcome | Description |
|---------|-------------|
| `Passed` | Test passed all validations |
| `Failed` | Test failed one or more steps |
| `Blocked` | Test could not be executed (environment issue, dependency) |
| `NotApplicable` | Test is not relevant for this configuration |
| `Paused` | Execution suspended mid-test |
| `InProgress` | Currently being executed |
| `NotExecuted` | Not yet run |
| `Inconclusive` | Result is uncertain |
| `Aborted` | Run was aborted |
| `Error` | System error during execution |
| `Warning` | Passed with warnings |

### Completing a Test Run

```json
PATCH https://dev.azure.com/myorg/myproject/_apis/test/runs/{runId}?api-version=7.1
Content-Type: application/json

{
  "state": "Completed",
  "comment": "Smoke run complete — 1 failure logged as bug #789"
}
```

---

## Attachments

### Adding a Screenshot to a Test Result

```json
POST https://dev.azure.com/myorg/myproject/_apis/test/runs/{runId}/results/{resultId}/attachments?api-version=7.1
Content-Type: application/json

{
  "stream": "<base64-encoded-image-data>",
  "fileName": "login-failure-screenshot.png",
  "comment": "Screenshot showing the validation error"
}
```

Supported attachment types: images (PNG, JPG), videos (MP4), logs (TXT, LOG), and documents (PDF, DOCX).

---

## Shared Parameters

Shared parameters are reusable data sets across multiple test cases:

```json
POST https://dev.azure.com/myorg/myproject/_apis/wit/workitems/$Shared%20Parameter?api-version=7.1
Content-Type: application/json-patch+json

[
  {
    "op": "add",
    "path": "/fields/System.Title",
    "value": "Login Credentials Dataset"
  },
  {
    "op": "add",
    "path": "/fields/Microsoft.VSTS.TCM.LocalDataSource",
    "value": "<NewDataSet><xs:schema id=\"NewDataSet\" xmlns:xs=\"http://www.w3.org/2001/XMLSchema\"><xs:element name=\"NewDataSet\"><xs:complexType><xs:choice minOccurs=\"0\" maxOccurs=\"unbounded\"><xs:element name=\"Table1\"><xs:complexType><xs:sequence><xs:element name=\"email\" type=\"xs:string\" minOccurs=\"0\" /><xs:element name=\"password\" type=\"xs:string\" minOccurs=\"0\" /><xs:element name=\"role\" type=\"xs:string\" minOccurs=\"0\" /></xs:sequence></xs:complexType></xs:element></xs:choice></xs:complexType></xs:element></xs:schema><Table1><email>admin@co.com</email><password>Pass1!</password><role>Admin</role></Table1><Table1><email>user@co.com</email><password>Pass2!</password><role>User</role></Table1><Table1><email>guest@co.com</email><password>Pass3!</password><role>Guest</role></Table1></NewDataSet>"
  }
]
```

---

## Limits and Gotchas

- **Test plan scope**: a test plan is scoped to a single area path. Test cases from other area paths can be added but inherit the plan's area for reporting.
- **Suite nesting depth**: suites can nest up to 14 levels deep.
- **Test case reuse**: a single test case can exist in multiple suites across multiple plans. Results are tracked per test point (suite + configuration), not per test case globally.
- **Query-based suite refresh**: dynamic suites re-evaluate their query when opened in the UI or when the API is called. They do not refresh in real time.
- **Parameterized tests**: each data row creates a separate test point. A test case with 5 configurations and 3 data rows = 15 test points.
- **Steps XML encoding**: the `Microsoft.VSTS.TCM.Steps` field uses a proprietary XML format. The XML must be well-formed or the API rejects the update.
- **Shared steps nesting**: shared steps cannot reference other shared steps (no recursive nesting).
- **Max results per run**: no hard limit, but batch result POST calls at 100 results per request for reliability.
- **Test attachments**: max 100 MB per attachment. Total attachment storage counts against organization limits.
- **Test case deletion**: deleting a test case work item removes it from all suites. Use the suite-level remove endpoint to decouple without deleting.
