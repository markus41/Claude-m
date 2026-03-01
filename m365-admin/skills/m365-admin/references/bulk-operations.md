# Bulk Operations for Microsoft 365 Administration

This reference covers patterns for performing bulk M365 admin operations from CSV files, including validation, dry-run, execution with rate limiting, error handling, and report generation.

## Pipeline Overview

Every bulk operation follows a consistent five-stage pipeline:

```
CSV Input --> Validate --> Dry-Run --> Execute --> Report
```

1. **CSV Input**: Read and parse the CSV, normalize headers, handle encoding
2. **Validate**: Check every row for correctness before any API calls
3. **Dry-Run**: Preview what would happen in a markdown table (no side effects)
4. **Execute**: Process rows with rate limiting, concurrency control, and error capture
5. **Report**: Generate a markdown summary with per-row status

## CSV Format Conventions

### General Rules

- **Encoding**: UTF-8 with BOM (`\xEF\xBB\xBF`) for Excel compatibility
- **Delimiter**: Comma by default; support semicolon for European locales
- **Headers**: First row is always headers; normalize by trimming whitespace and converting to camelCase
- **Empty rows**: Skip rows where all fields are empty
- **Comments**: Lines starting with `#` are ignored (optional convention)

### User Onboarding CSV

| Column | Required | Format | Example |
|---|---|---|---|
| `displayName` | Yes | Text | John Smith |
| `givenName` | Yes | Text | John |
| `surname` | Yes | Text | Smith |
| `userPrincipalName` | Yes | email@domain.com | john.smith@contoso.com |
| `mailNickname` | Yes | No spaces | john.smith |
| `department` | No | Text | Engineering |
| `jobTitle` | No | Text | Software Engineer |
| `usageLocation` | Yes | ISO 3166 alpha-2 | US |
| `password` | No | Text (min 8 chars) | Auto-generated if empty |
| `licenseSkuId` | No | GUID | 6fd2c87f-b296-42f0-b197-1e91e994b900 |
| `groups` | No | Semicolon-separated IDs | id1;id2;id3 |

### License Assignment CSV

| Column | Required | Format | Example |
|---|---|---|---|
| `userPrincipalName` | Yes | email@domain.com | john@contoso.com |
| `addSkuId` | No | GUID | 6fd2c87f-... |
| `removeSkuId` | No | GUID | 18181a46-... |
| `disabledPlans` | No | Semicolon-separated GUIDs | id1;id2 |

### Group Membership CSV

| Column | Required | Format | Example |
|---|---|---|---|
| `userPrincipalName` | Yes | email@domain.com | john@contoso.com |
| `groupId` | Yes | GUID | a1b2c3d4-... |
| `action` | Yes | "add" or "remove" | add |

## Validation Phase

Run all validations before executing any operations. Fail fast with a complete error report.

```typescript
interface ValidationResult {
  row: number;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface ValidationReport {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  results: ValidationResult[];
}
```

### Validation Checks

**User creation**:
- `displayName` is non-empty
- `userPrincipalName` matches email format (`/^[^@]+@[^@]+\.[^@]+$/`)
- `userPrincipalName` domain is a verified domain in the tenant
- `mailNickname` contains no spaces or special characters (`/^[a-zA-Z0-9._-]+$/`)
- `usageLocation` is a valid ISO 3166-1 alpha-2 code (required for license assignment)
- `password` meets complexity requirements (if provided)
- `licenseSkuId` exists in tenant and has available units
- No duplicate `userPrincipalName` within the CSV
- `userPrincipalName` does not already exist in the directory

**License assignment**:
- User exists in the directory
- User has `usageLocation` set
- SKU ID is valid and exists in tenant
- Sufficient available licenses (`prepaidUnits.enabled - consumedUnits > 0`)
- `disabledPlans` are valid service plan IDs within the SKU

**Group membership**:
- User exists in the directory
- Group exists in the directory
- Action is "add" or "remove"
- For "add": user is not already a member
- For "remove": user is currently a member

### Pre-flight Checks

Before processing the CSV, verify tenant-level prerequisites:

```typescript
async function preflight(graphClient: Client): Promise<PreflightResult> {
  const skus = await graphClient.api("/subscribedSkus").get();
  const verifiedDomains = await graphClient.api("/organization").select("verifiedDomains").get();

  return {
    availableSkus: new Map(skus.value.map((s: SubscribedSku) => [
      s.skuId,
      { partNumber: s.skuPartNumber, available: s.prepaidUnits.enabled - s.consumedUnits }
    ])),
    verifiedDomains: new Set(
      verifiedDomains.value[0].verifiedDomains.map((d: { name: string }) => d.name)
    ),
  };
}
```

## Dry-Run Mode

Dry-run produces a markdown table showing exactly what would happen for each row, without making any API calls.

```typescript
function generateDryRunReport(rows: ParsedRow[], validationResults: ValidationReport): string {
  const lines: string[] = [];
  lines.push("# Dry-Run Report");
  lines.push("");
  lines.push(`**Date**: ${new Date().toISOString()}`);
  lines.push(`**Total rows**: ${validationResults.totalRows}`);
  lines.push(`**Valid**: ${validationResults.validRows}`);
  lines.push(`**Invalid**: ${validationResults.invalidRows}`);
  lines.push("");
  lines.push("| Row | User | Action | Status | Notes |");
  lines.push("|-----|------|--------|--------|-------|");

  for (const result of validationResults.results) {
    const row = rows[result.row];
    const status = result.valid ? "WOULD EXECUTE" : "BLOCKED";
    const notes = result.errors.length > 0
      ? result.errors.join("; ")
      : result.warnings.length > 0
        ? result.warnings.join("; ")
        : "OK";
    lines.push(`| ${result.row + 1} | ${row.userPrincipalName} | Create | ${status} | ${notes} |`);
  }

  lines.push("");
  if (validationResults.invalidRows > 0) {
    lines.push(`> **${validationResults.invalidRows} rows have errors and will not be processed.**`);
  }

  return lines.join("\n");
}
```

## Execution Patterns

### Sequential Execution

Process one row at a time. Simplest pattern, suitable for small batches (under 50 rows).

```typescript
interface ExecutionResult {
  row: number;
  success: boolean;
  id?: string;
  error?: string;
  duration: number;
}

async function executeSequential(
  rows: ParsedRow[],
  operation: (row: ParsedRow) => Promise<string>,
): Promise<ExecutionResult[]> {
  const results: ExecutionResult[] = [];

  for (let i = 0; i < rows.length; i++) {
    const start = Date.now();
    try {
      const id = await operation(rows[i]);
      results.push({ row: i, success: true, id, duration: Date.now() - start });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ row: i, success: false, error: message, duration: Date.now() - start });
    }
  }

  return results;
}
```

### Batched Parallel Execution

Process rows in parallel batches with concurrency control. Suitable for medium batches (50-500 rows).

```typescript
async function executeBatchedParallel(
  rows: ParsedRow[],
  operation: (row: ParsedRow) => Promise<string>,
  batchSize: number = 10,
): Promise<ExecutionResult[]> {
  const results: ExecutionResult[] = [];

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map(async (row, idx) => {
        const globalIdx = i + idx;
        const start = Date.now();
        try {
          const id = await graphRequestWithRetry(() => operation(row));
          return { row: globalIdx, success: true, id, duration: Date.now() - start } as ExecutionResult;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return { row: globalIdx, success: false, error: message, duration: Date.now() - start } as ExecutionResult;
        }
      }),
    );

    for (const result of batchResults) {
      results.push(result.status === "fulfilled" ? result.value : {
        row: -1, success: false, error: "Unexpected rejection", duration: 0,
      });
    }
  }

  return results;
}
```

### Graph $batch Execution

Use the Graph `$batch` endpoint for maximum efficiency. Sends up to 20 individual requests in a single HTTP call.

**Endpoint**: `POST https://graph.microsoft.com/v1.0/$batch`

```typescript
interface BatchRequest {
  id: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  url: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}

interface BatchResponse {
  id: string;
  status: number;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

interface BatchPayload {
  requests: BatchRequest[];
}

interface BatchResult {
  responses: BatchResponse[];
}
```

**Building batch requests**:

```typescript
function buildUserCreationBatch(users: CreateUserRequest[], startId: number): BatchPayload {
  return {
    requests: users.map((user, idx) => ({
      id: String(startId + idx),
      method: "POST" as const,
      url: "/users",
      body: user,
      headers: { "Content-Type": "application/json" },
    })),
  };
}
```

**Processing batch responses**:

```typescript
async function executeBatch(
  graphClient: Client,
  rows: ParsedRow[],
  buildRequest: (row: ParsedRow, id: number) => BatchRequest,
  batchSize: number = 20,
): Promise<ExecutionResult[]> {
  const results: ExecutionResult[] = [];

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const payload: BatchPayload = {
      requests: batch.map((row, idx) => buildRequest(row, i + idx)),
    };

    const batchResult: BatchResult = await graphRequestWithRetry(() =>
      graphClient.api("/$batch").post(payload)
    );

    for (const response of batchResult.responses) {
      const rowIdx = parseInt(response.id, 10);
      if (response.status >= 200 && response.status < 300) {
        const id = (response.body as { id?: string }).id ?? "unknown";
        results.push({ row: rowIdx, success: true, id, duration: 0 });
      } else {
        const errorMsg = (response.body as { error?: { message?: string } }).error?.message ?? `HTTP ${response.status}`;
        results.push({ row: rowIdx, success: false, error: errorMsg, duration: 0 });
      }
    }
  }

  return results;
}
```

## Rate Limit Handling

Microsoft Graph enforces throttling at the application and tenant level.

### Throttling Response

When throttled, Graph returns HTTP 429 with a `Retry-After` header:

```
HTTP/1.1 429 Too Many Requests
Retry-After: 30
Content-Type: application/json

{
  "error": {
    "code": "TooManyRequests",
    "message": "Too many requests. Please retry after 30 seconds.",
    "innerError": {
      "request-id": "...",
      "date": "2025-01-15T10:30:00"
    }
  }
}
```

### Retry with Exponential Backoff

```typescript
interface GraphError extends Error {
  statusCode: number;
  headers?: Headers;
  code?: string;
}

async function graphRequestWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 5,
  baseDelay: number = 1000,
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      const graphError = error as GraphError;
      if (graphError.statusCode === 429 && attempt < maxRetries) {
        const retryAfterHeader = graphError.headers?.get?.("Retry-After");
        const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 1;
        const delay = Math.max(retryAfterSeconds * 1000, baseDelay * Math.pow(2, attempt));
        console.warn(`Throttled (attempt ${attempt + 1}/${maxRetries}). Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error(`Max retries (${maxRetries}) exceeded`);
}
```

### Throttling Limits Reference

| Resource | Limit |
|---|---|
| Per app, per tenant (most endpoints) | 10,000 requests per 10 minutes |
| Per mailbox (mail/calendar) | 10,000 requests per 10 minutes |
| Per app (directory writes) | 3 per second per tenant |
| SharePoint/OneDrive | Varies; typically 1,200 requests per minute |
| $batch requests | 20 individual requests per batch |
| $batch call rate | Same as individual endpoint limits |

## Error Handling

### Per-Row Error Capture

Always capture errors per row and continue processing remaining rows.

```typescript
interface RowError {
  row: number;
  userPrincipalName: string;
  operation: string;
  errorCode: string;
  errorMessage: string;
  retryable: boolean;
}

function classifyError(error: GraphError): { code: string; retryable: boolean } {
  switch (error.statusCode) {
    case 400: return { code: "BadRequest", retryable: false };
    case 401: return { code: "Unauthorized", retryable: false };
    case 403: return { code: "Forbidden", retryable: false };
    case 404: return { code: "NotFound", retryable: false };
    case 409: return { code: "Conflict", retryable: false };
    case 429: return { code: "TooManyRequests", retryable: true };
    case 500: return { code: "InternalServerError", retryable: true };
    case 502: return { code: "BadGateway", retryable: true };
    case 503: return { code: "ServiceUnavailable", retryable: true };
    case 504: return { code: "GatewayTimeout", retryable: true };
    default: return { code: `HTTP${error.statusCode}`, retryable: false };
  }
}
```

### Rollback Guidance

For operations that partially complete:
- **User creation**: Delete any users that were created if the batch should be atomic
- **License assignment**: Collect the list of assigned licenses so they can be removed if needed
- **Group membership**: Track added members for potential removal
- Generate a rollback CSV with the IDs of created/modified resources

## Report Generation

Every bulk operation produces a markdown report.

```typescript
function generateReport(
  operationName: string,
  results: ExecutionResult[],
  rows: ParsedRow[],
): string {
  const succeeded = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  const lines: string[] = [];
  lines.push(`# ${operationName} Report`);
  lines.push("");
  lines.push(`**Timestamp**: ${new Date().toISOString()}`);
  lines.push(`**Total processed**: ${results.length}`);
  lines.push(`**Succeeded**: ${succeeded.length}`);
  lines.push(`**Failed**: ${failed.length}`);
  lines.push(`**Duration**: ${(totalDuration / 1000).toFixed(1)}s`);
  lines.push("");

  lines.push("## Results");
  lines.push("");
  lines.push("| Row | User | Status | ID / Error |");
  lines.push("|-----|------|--------|------------|");

  for (const result of results) {
    const row = rows[result.row];
    const upn = row?.userPrincipalName ?? `Row ${result.row + 1}`;
    const status = result.success ? "SUCCESS" : "FAILED";
    const detail = result.success ? result.id : result.error;
    lines.push(`| ${result.row + 1} | ${upn} | ${status} | ${detail} |`);
  }

  if (failed.length > 0) {
    lines.push("");
    lines.push("## Errors");
    lines.push("");
    for (const f of failed) {
      const row = rows[f.row];
      lines.push(`- **Row ${f.row + 1}** (${row?.userPrincipalName ?? "unknown"}): ${f.error}`);
    }
  }

  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- ${succeeded.length} of ${results.length} operations completed successfully`);
  if (failed.length > 0) {
    lines.push(`- ${failed.length} operations failed — review errors above`);
    lines.push("- Failed rows can be extracted and retried with a corrected CSV");
  }

  return lines.join("\n");
}
```

## Complete Example: Bulk User Creation

```typescript
import { Client } from "@microsoft/microsoft-graph-client";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";

interface UserRow {
  displayName: string;
  givenName: string;
  surname: string;
  userPrincipalName: string;
  mailNickname: string;
  department: string;
  jobTitle: string;
  usageLocation: string;
  password: string;
  licenseSkuId: string;
}

async function bulkCreateUsers(
  graphClient: Client,
  csvPath: string,
  dryRun: boolean = false,
): Promise<string> {
  // 1. Parse CSV
  const csvContent = readFileSync(csvPath, "utf-8");
  const rows: UserRow[] = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true });

  // 2. Pre-flight
  const { availableSkus, verifiedDomains } = await preflight(graphClient);

  // 3. Validate
  const validation = validateUserRows(rows, availableSkus, verifiedDomains);

  if (dryRun) {
    return generateDryRunReport(rows, validation);
  }

  if (validation.invalidRows > 0) {
    return generateDryRunReport(rows, validation) + "\n\n> Execution blocked due to validation errors.";
  }

  // 4. Execute via $batch
  const validRows = rows.filter((_, i) => validation.results[i].valid);
  const results = await executeBatch(
    graphClient,
    validRows,
    (row, id) => ({
      id: String(id),
      method: "POST",
      url: "/users",
      body: {
        accountEnabled: true,
        displayName: row.displayName,
        givenName: row.givenName,
        surname: row.surname,
        userPrincipalName: row.userPrincipalName,
        mailNickname: row.mailNickname,
        department: row.department || undefined,
        jobTitle: row.jobTitle || undefined,
        usageLocation: row.usageLocation,
        passwordProfile: {
          forceChangePasswordNextSignIn: true,
          password: row.password || generateSecurePassword(),
        },
      },
      headers: { "Content-Type": "application/json" },
    }),
    20,
  );

  // 5. Assign licenses for successfully created users
  const createdUsers = results.filter(r => r.success);
  if (createdUsers.length > 0) {
    for (const result of createdUsers) {
      const row = validRows[result.row];
      if (row.licenseSkuId) {
        await graphRequestWithRetry(() =>
          graphClient.api(`/users/${result.id}/assignLicense`).post({
            addLicenses: [{ skuId: row.licenseSkuId }],
            removeLicenses: [],
          })
        );
      }
    }
  }

  // 6. Generate report
  return generateReport("Bulk User Creation", results, validRows);
}

function generateSecurePassword(): string {
  const chars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*";
  let password = "";
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
```
