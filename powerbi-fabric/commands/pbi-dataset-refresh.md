---
name: pbi-dataset-refresh
description: Generate TypeScript code to trigger a Power BI dataset refresh and poll for completion status via the REST API.
argument-hint: "<dataset-id> [--workspace <workspace-id>] [--timeout <minutes>] [--notify]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Generate Dataset Refresh Code

Generate TypeScript code to trigger and monitor a Power BI dataset refresh.

## Instructions

1. Parse the dataset ID from the user's input.
2. If `--workspace` is provided, use that workspace ID; otherwise, prompt the user or use a placeholder.
3. If `--timeout` is provided, set the polling timeout (default: 30 minutes).
4. If `--notify` flag is present, use `MailOnFailure` notification; otherwise use `NoNotification`.
5. Read the API reference at `skills/powerbi-analytics/references/pbi-rest-api.md` for endpoint details.
6. Read examples at `skills/powerbi-analytics/examples/workspace-management.md` for code templates.

## Output Format

Generate a complete TypeScript file that:

1. Authenticates using a service principal.
2. Triggers a dataset refresh via `POST /groups/{groupId}/datasets/{datasetId}/refreshes`.
3. Polls refresh status via `GET /groups/{groupId}/datasets/{datasetId}/refreshes?$top=1`.
4. Logs progress with elapsed time.
5. Exits with success or failure status.
6. Handles errors: 429 (rate limit), 401 (token expired), refresh already in progress.

## Guidelines

- Use environment variables for `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`.
- Poll interval: 10 seconds (configurable).
- Log elapsed time during polling.
- If the refresh fails, output the `serviceExceptionJson` for debugging.
- Handle the case where a refresh is already in progress (HTTP 400 with specific error code).
- Power BI limits refresh operations to approximately 8 per day for Pro and 48 per day for Premium.
- Include TypeScript interfaces for `RefreshEntry` and related types.
