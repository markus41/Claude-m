---
name: create-m365-client
description: Generate TypeScript client code for Dataverse Web API and/or Microsoft Graph with shared Azure Identity auth
argument-hint: "Description of what the client code should do (e.g., 'query accounts and send email summary')"
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
  - Skill
---

# Create M365 Client Code

Generate production-ready TypeScript code that uses Dataverse Web API and/or Microsoft Graph with shared Azure Identity authentication.

## Instructions

1. Load the `m365-clients` skill for reference on client patterns, auth setup, and API surfaces.

2. Analyze the user's description to determine:
   - Which services are needed (Dataverse only, Graph only, or both)
   - What operations are required (CRUD, queries, Teams, SharePoint, Mail, etc.)
   - Whether this is a one-off script or a reusable module
   - Auth requirements (local dev, CI/CD, Azure-hosted)

3. Generate the code following these patterns:

   **Auth setup**: Use `DefaultAzureCredential` unless the user specifies otherwise. Import from `@azure/identity`.

   **Dataverse operations**: Use the `DataverseClient` class pattern from the skill reference. Include:
   - Proper OData query strings with `$filter`, `$select`, `$expand`, `$orderby`
   - Lookup binding with `@odata.bind` for relationships
   - Typed response interfaces

   **Graph operations**: Use the `GraphService` class pattern from the skill reference. Include:
   - Typed method calls (getUser, listTeamChannels, createSharePointFolder, etc.)
   - Proper error handling for Graph API responses

   **Combined workflows**: When both services are needed:
   - Single shared credential instance
   - Parallel operations with `Promise.all` where independent
   - Sequential operations where data dependencies exist
   - Write-back pattern (create in Dataverse → provision in Graph → patch IDs back)

4. Write the generated code to a `.ts` file at the location the user specifies, or default to the current directory.

5. Explain what the code does and list any environment variables or Azure permissions required.

## Pre-output checklist

Before presenting the code, verify:

- [ ] Uses `DefaultAzureCredential` or user-specified credential
- [ ] All imports reference `@azure/identity` and client modules
- [ ] Dataverse queries use proper OData syntax
- [ ] Graph calls use typed service methods
- [ ] Response types are defined as interfaces (no `any`)
- [ ] Error handling is present for API calls
- [ ] Environment variables are documented
- [ ] Lookup bindings use correct `@odata.bind` format
- [ ] Parallel operations use `Promise.all` or `Promise.allSettled`
- [ ] Code includes a runnable entry point or export
