---
name: m365-admin
description: Deep expertise in Microsoft 365 tenant administration via Microsoft Graph API — managing users, groups, licenses, Exchange Online, SharePoint, and bulk operations with proper auth, rate limiting, and audit trails.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
triggers:
  - m365 admin
  - user management
  - license management
  - entra id
  - exchange online
  - sharepoint admin
  - bulk onboarding
  - offboarding
  - graph api admin
  - distribution list
  - security group
  - sign-in logs
  - audit log
  - onboarding concierge
  - new employee wizard
  - lighthouse onboarding
  - offboarding wizard
  - access cleanup
  - lighthouse offboarding
---

# Microsoft 365 Administration via Microsoft Graph API

This skill provides comprehensive knowledge for administering a Microsoft 365 tenant through the Microsoft Graph API. It covers user lifecycle management, license assignment, group administration, Exchange Online mailbox operations, SharePoint site management, and bulk processing patterns. All operations use delegated authentication with least-privilege scopes and produce structured reports.

## Microsoft Graph Admin API Overview

The Microsoft Graph API is the unified gateway to data and intelligence in Microsoft 365. All admin operations target the base URL:

```
https://graph.microsoft.com/v1.0/
```

Use the `beta` endpoint only when a feature is not yet available in v1.0 (e.g., certain Entra ID Governance features). Production admin scripts should target v1.0 for stability.

### Key Admin Endpoints

| Endpoint | Purpose |
|---|---|
| `/users` | Create, read, update, delete users |
| `/groups` | Security groups, M365 groups, membership |
| `/subscribedSkus` | Tenant license inventory (SKU list) |
| `/users/{id}/assignLicense` | License assignment per user |
| `/auditLogs/signIns` | Sign-in activity logs |
| `/auditLogs/directoryAudits` | Directory change audit trail |
| `/users/{id}/mailboxSettings` | Exchange mailbox settings via Graph |
| `/users/{id}/mailFolders` | Mail folder listing |
| `/sites` | SharePoint site collections |
| `/sites/{id}/permissions` | Site-level permissions |
| `/sites/{id}/drives` | Document libraries on a site |
| `/$batch` | Batch up to 20 requests in a single call |

## Authentication and Authorization

All operations use **delegated authentication** with interactive user login. The signed-in user must have the appropriate admin roles (Global Administrator, User Administrator, Exchange Administrator, SharePoint Administrator, etc.).

### Required Scopes by Operation Area

Request scopes dynamically based on the operation to follow the principle of least privilege:

| Operation Area | Scopes |
|---|---|
| User CRUD | `User.ReadWrite.All` |
| Directory and roles | `Directory.ReadWrite.All` |
| Group management | `Group.ReadWrite.All` |
| License management | `User.ReadWrite.All`, `Directory.Read.All` |
| Mail / Mailbox | `Mail.ReadWrite`, `MailboxSettings.ReadWrite` |
| SharePoint | `Sites.FullControl.All` |
| Audit logs | `AuditLog.Read.All` |
| Calendar | `Calendars.ReadWrite` |

### Auth Pattern (MSAL with Interactive Login)

```typescript
import { PublicClientApplication, InteractiveBrowserCredential } from "@azure/identity";
import { Client } from "@microsoft/microsoft-graph-client";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials";

const credential = new InteractiveBrowserCredential({
  clientId: process.env.AZURE_CLIENT_ID!,
  tenantId: process.env.AZURE_TENANT_ID!,
});

const authProvider = new TokenCredentialAuthenticationProvider(credential, {
  scopes: ["https://graph.microsoft.com/User.ReadWrite.All"],
});

const graphClient = Client.initWithMiddleware({ authProvider });
```

Never hardcode client secrets or tokens. Use environment variables or Azure Key Vault. For delegated flows, the interactive browser credential prompts the user and caches tokens. Token caching persists across sessions to avoid repeated login prompts.

### App Registration Prerequisites

Before using the Graph API, register an application in Entra ID:

1. Navigate to Azure Portal > Entra ID > App registrations > New registration
2. Set the redirect URI to `http://localhost` for local development
3. Under API permissions, add Microsoft Graph delegated permissions for the required scopes
4. Grant admin consent for the tenant (required for `User.ReadWrite.All`, `Directory.ReadWrite.All`, etc.)
5. Note the Application (client) ID and Directory (tenant) ID for use in the auth provider

For multi-tenant scenarios, use `common` as the tenant ID. For single-tenant admin tools, use the specific tenant GUID.

### Error Response Format

Graph API errors follow a consistent format that all operations should handle:

```typescript
interface GraphErrorResponse {
  error: {
    code: string;          // e.g., "Request_ResourceNotFound", "Authorization_RequestDenied"
    message: string;       // Human-readable error description
    innerError: {
      "request-id": string;
      date: string;
      "client-request-id": string;
    };
  };
}
```

Common error codes: `Request_ResourceNotFound` (404), `Authorization_RequestDenied` (403), `Request_BadRequest` (400), `TooManyRequests` (429), `ServiceNotAvailable` (503).

## User Lifecycle

The standard user lifecycle in M365 administration follows a predictable sequence:

1. **Create** -- POST to `/users` with required properties (displayName, mailNickname, userPrincipalName, passwordProfile)
2. **Set usageLocation** -- Required before license assignment (ISO 3166-1 alpha-2 country code)
3. **Assign license** -- POST to `/users/{id}/assignLicense` with skuId
4. **Add to groups** -- POST to `/groups/{id}/members/$ref` for security groups, M365 groups
5. **Configure mailbox** -- Set auto-reply, calendar permissions, delegates via Graph or PowerShell
6. **Ongoing management** -- Update properties, reassign licenses, change group memberships
7. **Offboard** -- Disable account, revoke licenses, remove from groups, set OOF, convert mailbox to shared, transfer OneDrive ownership
8. **Delete** -- Soft delete (30-day recycle bin), then permanent purge

### Critical Ordering Rules

- `usageLocation` must be set before any license can be assigned. If you attempt to assign a license to a user without `usageLocation`, Graph returns a 400 error with code `Request_BadRequest`.
- Account must be disabled before revoking sign-in sessions during offboarding. Disabling the account prevents new sign-ins, while `revokeSignInSessions` invalidates existing tokens.
- Licenses should be revoked before deleting a user to free up license capacity immediately.
- Group membership removal should happen before account deletion, as some group types may block removal of deleted members.
- Mailbox conversion to shared (via Exchange Online PowerShell) should happen before license removal, as the conversion process may fail if the mailbox is already deprovisioned.

### Pagination for User Queries

When listing users or group members, Graph returns paginated results. Always follow `@odata.nextLink` to retrieve all pages:

```typescript
interface PagedResponse<T> {
  value: T[];
  "@odata.nextLink"?: string;
  "@odata.count"?: number;
}

async function getAllPages<T>(graphClient: Client, initialUrl: string): Promise<T[]> {
  let all: T[] = [];
  let nextLink: string | null = initialUrl;

  while (nextLink) {
    const response: PagedResponse<T> = await graphClient.api(nextLink).get();
    all = all.concat(response.value);
    nextLink = response["@odata.nextLink"] ?? null;
  }

  return all;
}
```

Default page size is 100 for most endpoints. Use `$top` to control page size (max 999 for `/users`).

## Bulk Operations Pattern

All bulk operations follow a consistent pipeline:

```
CSV Input --> Validate All Rows --> Dry-Run Preview --> Execute with Rate Limiting --> Generate Report
```

- **CSV format**: UTF-8 with headers, required columns documented per operation
- **Validation**: Check every row before executing any (email format, UPN uniqueness, SKU availability, group existence)
- **Dry-run**: Output a markdown table showing what would happen, with no API calls
- **Execution**: Batch using Graph `$batch` (up to 20 per request) or sequential with concurrency control
- **Rate limiting**: Handle HTTP 429 with `Retry-After` header, exponential backoff starting at 1 second
- **Reporting**: Markdown table with per-row status (success/failure/skipped), error messages, and summary counts

### Graph $batch Requests

The `$batch` endpoint accepts up to 20 individual requests in a single HTTP POST:

```
POST https://graph.microsoft.com/v1.0/$batch
Content-Type: application/json

{
  "requests": [
    { "id": "1", "method": "POST", "url": "/users", "body": {...}, "headers": {"Content-Type": "application/json"} },
    { "id": "2", "method": "PATCH", "url": "/users/{id}", "body": {...}, "headers": {"Content-Type": "application/json"} }
  ]
}
```

Each response in the batch includes its own status code. Process each individually and capture per-request errors.

### Rate Limiting

Microsoft Graph enforces throttling at multiple levels:

- **Per-app, per-tenant**: varies by endpoint (typically 10,000 requests per 10 minutes for most endpoints)
- **Per-mailbox**: 10,000 requests per 10 minutes for mail/calendar operations
- **Response**: HTTP 429 with `Retry-After` header (value in seconds)

Handling pattern:

```typescript
async function graphRequestWithRetry<T>(fn: () => Promise<T>, maxRetries = 5): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      if (error instanceof GraphError && error.statusCode === 429 && attempt < maxRetries) {
        const retryAfter = parseInt(error.headers?.get("Retry-After") ?? "1", 10);
        const delay = retryAfter * 1000 * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error("Max retries exceeded");
}
```

## Exchange Online via Graph

Graph covers a subset of Exchange administration:

- **Mailbox settings**: GET/PATCH `/users/{id}/mailboxSettings` (auto-replies, time zone, language)
- **Mail folders**: GET `/users/{id}/mailFolders`
- **Calendar permissions**: GET/POST `/users/{id}/calendar/calendarPermissions`
- **Send mail**: POST `/users/{id}/sendMail` (with application or delegated permissions)

Operations **not** available via Graph (require Exchange Online PowerShell):

- Shared mailbox creation (`New-Mailbox -Shared`)
- Distribution list management (`New-DistributionGroup`, `Add-DistributionGroupMember`)
- Mail flow / transport rules (`New-TransportRule`)
- Full mailbox delegation: Full Access, Send-As, Send-on-Behalf (`Add-MailboxPermission`, `Add-RecipientPermission`)
- Mailbox type conversion (`Set-Mailbox -Type Shared`)
- Message trace (`Get-MessageTrace`)

For PowerShell operations, use the Exchange Online Management module:

```powershell
Install-Module -Name ExchangeOnlineManagement -Force
Connect-ExchangeOnline -UserPrincipalName admin@contoso.com
```

## SharePoint Administration via Graph

Graph provides site and drive access:

- **Search sites**: GET `/sites?search={query}`
- **Get site by path**: GET `/sites/{hostname}:{serverRelativePath}`
- **Site permissions**: GET/POST `/sites/{id}/permissions`
- **Document libraries**: GET `/sites/{id}/drives`
- **Drive items**: GET `/sites/{id}/drives/{driveId}/root/children`

Operations requiring SharePoint Admin REST or PnP PowerShell:

- Site collection creation (SharePoint Admin REST `/_api/SPSiteManager/create`)
- Storage quota management
- Hub site registration and association
- Site designs and templates
- Sharing policy configuration at the site level

PnP PowerShell is recommended for SharePoint-specific admin:

```powershell
Install-Module -Name PnP.PowerShell -Force
Connect-PnPOnline -Url https://contoso-admin.sharepoint.com -Interactive
```

### SharePoint URL Patterns

Understanding SharePoint URL structure is essential for site operations:

- **Root site**: `https://{tenant}.sharepoint.com`
- **Admin center**: `https://{tenant}-admin.sharepoint.com`
- **Site collection**: `https://{tenant}.sharepoint.com/sites/{sitename}`
- **OneDrive for Business**: `https://{tenant}-my.sharepoint.com/personal/{username_domain_com}`
- **Graph site ID format**: `{hostname},{siteCollectionId},{siteId}` -- three comma-separated values

When using Graph to access sites by path, the colon syntax is required: `/sites/{hostname}:{path}`. For the root site, use `/sites/{hostname}:` with a trailing colon.

## Audit and Compliance

Graph provides access to audit data:

- **Sign-in logs**: GET `/auditLogs/signIns` -- filter by user, app, status, date, IP
- **Directory audit logs**: GET `/auditLogs/directoryAudits` -- all directory changes (user creation, role assignment, group changes)

Both support OData `$filter`, `$select`, `$top`, and `$orderby`. The `AuditLog.Read.All` scope is required and the signed-in user needs at minimum the Reports Reader role.

### Filtering Examples

```
GET /auditLogs/signIns?$filter=userPrincipalName eq 'user@contoso.com' and createdDateTime ge 2025-01-01T00:00:00Z
GET /auditLogs/directoryAudits?$filter=activityDisplayName eq 'Add member to group' and activityDateTime ge 2025-01-01T00:00:00Z
```

### Data Retention

Audit log retention depends on the tenant license:

| License Tier | Sign-In Logs | Directory Audits |
|---|---|---|
| Azure AD Free | 7 days | 7 days |
| Azure AD Premium P1 | 30 days | 30 days |
| Azure AD Premium P2 | 30 days | 30 days |
| With Log Analytics export | Custom (years) | Custom (years) |

For long-term retention, export audit data to Azure Log Analytics workspace or Azure Storage using diagnostic settings. This allows queries beyond the default retention period.

### Compliance Considerations

When building admin scripts, ensure compliance with organizational policy:

- **Audit trail**: Log every administrative action with who, what, when, and from where
- **Approval workflows**: High-impact operations (bulk license changes, mass offboarding) should require approval
- **Change management**: Document changes in a change management system before execution
- **Data residency**: Be aware of data residency requirements when accessing audit logs and user data
- **GDPR**: User deletion must be handled in compliance with data protection regulations; use the 30-day soft delete period to ensure recoverability before permanent deletion

## Output Convention

Every operation produces a structured markdown report containing:

1. **Header**: operation name, timestamp, executed by
2. **Summary**: total processed, succeeded, failed, skipped
3. **Details table**: per-item status with relevant identifiers
4. **Errors section**: detailed error messages for failed items
5. **Recommendations**: next steps or warnings

## Reference Files

| Reference | Path | Topics |
|---|---|---|
| Entra ID | `references/entra-id.md` | User CRUD, licenses, groups, roles, sign-in audit |
| Exchange Online | `references/exchange-online.md` | Mailboxes, DLs, mail flow rules, shared mailboxes, auto-replies |
| SharePoint Admin | `references/sharepoint-admin.md` | Site collections, storage, sharing, hub sites, permissions |
| Bulk Operations | `references/bulk-operations.md` | CSV processing, dry-run, retry, rate limits, reports |

## Example Files

| Examples | Path | Scenarios |
|---|---|---|
| User Management | `examples/user-management.md` | Create, update, disable, offboard users |
| License Management | `examples/license-management.md` | Assign, revoke, reassign with SKU handling |
| Exchange Operations | `examples/exchange-operations.md` | Mailbox management, DLs, rules, calendar |
| SharePoint Operations | `examples/sharepoint-operations.md` | Site CRUD, permissions, sharing, hubs |
