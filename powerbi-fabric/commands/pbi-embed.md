---
name: pbi-embed
description: >
  Generate Power BI Embedded integration code — server-side embed token generation
  (App Owns Data with service principal, or User Owns Data with delegated token) and
  client-side embedding using the powerbi-client JavaScript SDK. Optional React component wrapper.
argument-hint: "<report-id> [--mode app-owns-data|user-owns-data] [--rls <role>] [--workspace <id>] [--react]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Power BI Embed Code Generator

Generate complete Power BI Embedded integration code based on the provided report ID and options.

## Parsing Arguments

Parse the following from `$ARGUMENTS`:
- `report-id` (required): The Power BI report GUID
- `--mode`: `app-owns-data` (default) or `user-owns-data`
- `--rls <role>`: Optional RLS role name for Row-Level Security
- `--workspace <id>`: Optional workspace (group) GUID; required for scoped embed token
- `--react`: If present, wrap the client embed in a React functional component

If `--workspace` is not provided but `--mode app-owns-data` is used, note that the workspace ID is required for the GenerateToken API call and prompt the user to provide it.

## App Owns Data Mode (Default)

Generate TypeScript code for server-side embed token generation using MSAL ConfidentialClientApplication.

### Output 1: Environment Variables

Generate a `.env` file listing:
```
AZURE_TENANT_ID=<your-tenant-id>
AZURE_CLIENT_ID=<your-client-id>
AZURE_CLIENT_SECRET=<your-client-secret>
PBI_WORKSPACE_ID=<workspace-id-from-argument>
PBI_REPORT_ID=<report-id-from-argument>
```

### Output 2: Server-side TypeScript Token Service

Generate a complete TypeScript file `pbi-token-service.ts`:

1. Import `ConfidentialClientApplication` from `@azure/msal-node`
2. Configure MSAL with tenant ID, client ID, client secret from environment variables
3. Acquire token for scope `https://analysis.windows.net/powerbi/api/.default`
4. Call Power BI REST API to generate embed token:
   - Single report: `POST https://api.powerbi.com/v1.0/myorg/groups/{workspaceId}/reports/{reportId}/GenerateToken`
   - Request body: `{ "accessLevel": "View" }`
   - If `--rls <role>` is provided, include in request body:
     ```json
     {
       "accessLevel": "View",
       "identities": [
         {
           "username": "user@domain.com",
           "roles": ["<role>"],
           "datasets": ["<datasetId>"]
         }
       ]
     }
     ```
     Note: the `datasetId` is the dataset bound to the report -- add a comment that the caller must supply the datasetId
5. Return `{ embedUrl, embedToken, tokenExpiry }` to the client
6. Include error handling with typed error responses

### Output 3: Client-side JavaScript Embed

Generate a `pbi-embed-client.js` file:

1. Load `powerbi-client` via CDN or npm import
2. Create the `IEmbedConfiguration` object:
   ```typescript
   const config: pbi.IEmbedConfiguration = {
     type: 'report',
     tokenType: models.TokenType.Embed,
     accessToken: embedToken,
     embedUrl: embedUrl,
     id: reportId,
     settings: {
       navContentPaneEnabled: false,
       filterPaneEnabled: true
     }
   };
   ```
3. Get the container div and call `powerbi.embed(container, config)`
4. Add event listeners: `report.on('loaded', ...)`, `report.on('error', ...)`
5. Implement `tokenExpired` event handler for proactive token refresh:
   ```typescript
   report.on('tokenExpired', async () => {
     const newToken = await fetchFreshEmbedToken(); // call your server endpoint
     report.setAccessToken(newToken.embedToken);
   });
   ```

If `--react` flag is provided, wrap the embed in a React functional component:
- Use `useRef` for the container div
- Use `useEffect` for initialization (runs once on mount with `[embedUrl, embedToken]` deps)
- Export the component as `PowerBIEmbed`
- Accept props: `embedUrl: string`, `embedToken: string`, `reportId: string`
- Cleanup in useEffect return: call `powerbi.reset(containerRef.current)` on unmount

## User Owns Data Mode

Generate client-side MSAL `PublicClientApplication` code using `@azure/msal-browser`:

1. Configure MSAL with tenant ID and client ID (no secret -- client-side)
2. Acquire token interactively or silently for scope `Report.Read.All`
3. Use the AAD token directly in the embed config with `tokenType: models.TokenType.Aad`
4. Note: User Owns Data requires the user to have a Power BI Pro license and workspace access

## Reference

Read `skills/powerbi-analytics/references/pbi-rest-api.md` Embedding section for GenerateToken endpoint details and request body structure.

## Lifecycle Note

Always include a comment block explaining the embed token lifecycle:
```
// Token Lifecycle:
// - Default embed token expiry: 1 hour
// - Implement the 'tokenExpired' event to refresh proactively
// - For long-lived sessions, refresh the token 5 minutes before expiry
// - Use the 'tokenExpiry' field from GenerateToken response to schedule refresh
```
