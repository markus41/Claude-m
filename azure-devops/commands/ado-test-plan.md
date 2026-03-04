---
name: ado-test-plan
description: Create test plans, test suites, and manage test cases
argument-hint: "<plan-name> --action create-plan|create-suite|add-cases|list|assign [--suite-type static|requirement|query]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# Manage Test Plans

Create test plans, test suites (static, requirement-based, query-based), add test cases, manage configurations, and assign testers.

## Prerequisites

- Authenticated to Azure DevOps (run `/ado-setup` first)
- Azure Test Plans license or Basic + Test Plans access level
- `Manage test plans` and `Manage test suites` permissions

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `<plan-name>` | Yes | Test plan name |
| `--action` | No | `create-plan` (default), `create-suite`, `add-cases`, `list`, `assign`, `configurations` |
| `--suite-type` | No | Suite type: `static`, `requirement`, `query` |
| `--suite-name` | No | Name for the new suite |
| `--requirement-id` | No | Work item ID for requirement-based suite |
| `--query` | No | WIQL query for query-based suite |
| `--test-case-ids` | No | Comma-separated test case work item IDs |
| `--tester` | No | Tester email to assign |
| `--configuration` | No | Test configuration name (e.g., `Windows 11 + Chrome`) |
| `--iteration` | No | Iteration path for the plan |

## Instructions

1. **Create test plan** — call `POST /_apis/testplan/plans?api-version=7.1`:
   ```json
   {
     "name": "<plan-name>",
     "area": { "name": "<area-path>" },
     "iteration": "<iteration-path>",
     "state": "Active"
   }
   ```

2. **Create test suite** — `POST /_apis/testplan/plans/{planId}/suites?api-version=7.1`:
   - **Static**: `{ "suiteType": "staticTestSuite", "name": "<suite-name>" }`
   - **Requirement-based**: `{ "suiteType": "requirementTestSuite", "requirementId": <work-item-id> }`
   - **Query-based**: `{ "suiteType": "dynamicTestSuite", "name": "<suite-name>", "queryString": "<wiql>" }`

3. **Add test cases** — `POST /_apis/testplan/plans/{planId}/suites/{suiteId}/testcase?api-version=7.1`:
   ```json
   [{ "workItem": { "id": <testCaseId> } }]
   ```

4. **Manage configurations** — `POST /_apis/testplan/configurations?api-version=7.1`:
   ```json
   {
     "name": "Windows 11 + Chrome",
     "values": [
       { "name": "Operating System", "value": "Windows 11" },
       { "name": "Browser", "value": "Chrome" }
     ]
   }
   ```

5. **Assign testers** — `PATCH /_apis/testplan/plans/{planId}/suites/{suiteId}/testcase/{testCaseId}?api-version=7.1` with tester identity.

6. **List test plans** — `GET /_apis/testplan/plans?api-version=7.1`
   Display: Plan ID, Name, State, Area, Iteration, Suite count.

7. **List suites** — `GET /_apis/testplan/plans/{planId}/suites?api-version=7.1`
   Display: Suite ID, Name, Type, Test case count.

## Examples

```bash
/ado-test-plan "Release 2.0 Tests" --action create-plan --iteration "Project\\Sprint 5"
/ado-test-plan "Release 2.0 Tests" --action create-suite --suite-type requirement --requirement-id 200 --suite-name "Login Tests"
/ado-test-plan "Release 2.0 Tests" --action add-cases --suite-name "Login Tests" --test-case-ids 301,302,303
/ado-test-plan "Release 2.0 Tests" --action assign --suite-name "Login Tests" --tester qa@contoso.com
/ado-test-plan --action configurations --configuration "Windows 11 + Edge"
```

## Error Handling

- **Test Plans license required**: User needs Basic + Test Plans — advise contacting admin.
- **Test case not found**: Work item ID does not exist or is not a Test Case type.
- **Suite already exists**: Offer to add cases to existing suite instead.
