---
name: pbi-workspace-create
description: Generate TypeScript code to create and configure a Power BI workspace using the REST API, including user role assignments and capacity configuration.
argument-hint: "<workspace-name> [--users <email:role,...>] [--capacity <capacity-id>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Generate Power BI Workspace Creation Code

Generate TypeScript code to create a Power BI workspace via the REST API.

## Instructions

1. Parse the workspace name from the user's input.
2. If `--users` is provided, parse the comma-separated list of `email:role` pairs. Valid roles: `Admin`, `Member`, `Contributor`, `Viewer`.
3. If `--capacity` is provided, include capacity assignment step.
4. Read the API reference at `skills/powerbi-analytics/references/pbi-rest-api.md` for endpoint details.
5. Read examples at `skills/powerbi-analytics/examples/workspace-management.md` for code templates.

## Output Format

Generate a complete, runnable TypeScript file that:

1. Authenticates using a service principal (MSAL `@azure/msal-node`).
2. Creates the workspace via `POST /groups`.
3. Assigns to capacity if specified via `POST /groups/{id}/AssignToCapacity`.
4. Adds users with specified roles via `POST /groups/{id}/users`.
5. Outputs the workspace ID and URL on success.

## Guidelines

- Use environment variables for sensitive values: `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`.
- Include proper error handling with descriptive error messages.
- Include TypeScript interfaces for API response types.
- Use `async/await` throughout.
- Default to service principal (client credentials) authentication flow.
- Log each step to the console for visibility.
- If a user email ends with `@tenant-id`, treat it as a service principal (principalType: "App").
- If a user value looks like a security group name (contains "group" or "@" with no dot), set principalType: "Group".
