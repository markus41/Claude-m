# Power BI Troubleshooting Reference

Problem-cause-fix reference for common Power BI, Fabric, and REST API issues. Organized by category for fast diagnosis.

## DAX Errors

### BLANK Propagation

**Problem**: A measure returns BLANK unexpectedly for some filter combinations.

**Cause**: When any arithmetic operand is BLANK, the result is BLANK. Division returns BLANK (not an error) for a zero denominator when using `DIVIDE()`. Measures evaluated against rows with no matching data return BLANK because the underlying aggregation has nothing to aggregate.

**Fix**: Convert BLANK to zero explicitly:

```dax
-- Option 1: IF/ISBLANK guard
Safe Measure =
IF(ISBLANK([Revenue]), 0, [Revenue])

-- Option 2: Add zero (BLANK + 0 = 0)
Safe Measure = [Revenue] + 0

-- Option 3: Use DIVIDE third argument as alternate result
Margin % = DIVIDE([Profit], [Revenue], 0)
```

Choose Option 1 when you need to distinguish "no data" from "zero value" in downstream logic. Options 2 and 3 are concise but lose that distinction.

---

### Circular Dependency

**Problem**: Model processing fails with a "Circular dependency" error during deployment or refresh.

**Cause**: A calculated column or calculated table references another calculated column or table that directly or indirectly references it back. Alternatively, a measure references itself without a base-case termination. The VertiPaq engine detects these cycles during model processing and rejects them.

**Fix**:

1. Open the model in DAX Studio and navigate to VertiPaq Analyzer > Dependencies view.
2. Trace the dependency chain to identify the cycle.
3. Break the cycle by replacing the calculated column with a measure (measures are evaluated lazily, not materialized), or restructure the DAX to use base column values instead of referencing other calculated columns.

```dax
-- BEFORE: Circular — CalcCol_A references CalcCol_B which references CalcCol_A
-- AFTER:  Replace CalcCol_B with a measure that reads the base column
Revenue Measure = SUM(Sales[Amount])
```

---

### Context Transition Mistakes

**Problem**: `SUMX` over a table returns wrong totals -- the inner expression ignores the outer row context, or double-counts values.

**Cause**: Inside an iterator like `SUMX`, calling a measure triggers context transition: the current row context is converted to an equivalent filter context via an implicit `CALCULATE`. If the inner measure itself uses `CALCULATE` or aggregates a table that overlaps the iterator, the result can be double-counting or incorrect aggregation.

**Fix**: Inside iterators, reference columns directly rather than calling measures that internally use `CALCULATE`:

```dax
-- WRONG: Calls a measure inside SUMX — context transition may double-count
Wrong Total =
SUMX(Orders, [Order Revenue])

-- CORRECT: Reference columns directly inside the iterator
Correct Total =
SUMX(Orders, Orders[Qty] * Orders[UnitPrice])
```

If context transition is intentionally needed, wrap explicitly with `CALCULATE` and document the intent:

```dax
-- Intentional context transition — calculates [Revenue] in each customer's filter context
Revenue Per Customer =
AVERAGEX(
    Customer,
    CALCULATE([Revenue])   -- deliberate context transition
)
```

---

### Time Intelligence Returning BLANK

**Problem**: `TOTALYTD`, `SAMEPERIODLASTYEAR`, `DATEADD`, or other time intelligence functions return BLANK for all or some periods.

**Cause 1**: No date table is marked with `dataCategory: Time`. Time intelligence functions require a dedicated, marked date table.

**Cause 2**: The date table has non-contiguous dates (gaps). Functions like `DATESYTD` assume a continuous calendar; gaps break the date range logic.

**Cause 3**: The relationship between the fact table date column and the date table is inactive or missing entirely.

**Fix**:

1. Create a complete, contiguous calendar table spanning January 1 of the earliest year through December 31 of the latest year (no gaps).
2. Mark it as the date table: right-click the table in Power BI Desktop > "Mark as date table" > select the date column.
3. Verify an active relationship exists between the fact table date column and the date table date column.

```dax
-- Verify date table completeness
Date Gap Check =
VAR _dateCount = COUNTROWS('Date')
VAR _expectedCount = DATEDIFF(MIN('Date'[Date]), MAX('Date'[Date]), DAY) + 1
RETURN
    IF(_dateCount = _expectedCount, "OK", "GAPS DETECTED: " & _expectedCount - _dateCount & " missing days")
```

---

### Ambiguous Relationship Path

**Problem**: DAX query or visual shows "Ambiguous paths" error or returns unexpected results when two tables are connected through multiple relationship paths.

**Cause**: Multiple active relationship paths exist between two tables (for example, an Orders table connected to a Date table via both OrderDate and ShipDate). The engine cannot determine which path to use automatically.

**Fix**: Keep only one relationship active between any two tables. For the inactive relationships, use `USERELATIONSHIP` inside `CALCULATE` to activate them for specific calculations:

```dax
-- Default: Uses the active relationship (OrderDate -> Date)
Revenue by Order Date = SUM(Orders[Amount])

-- Override: Uses the inactive ShipDate relationship
Revenue by Ship Date =
CALCULATE(
    SUM(Orders[Amount]),
    USERELATIONSHIP(Orders[ShipDate], 'Date'[Date])
)
```

---

## Dataset Refresh Failures

### Missing Credentials After Publish

**Problem**: Refresh fails immediately after publishing from Desktop to Service with a credential error such as "Data source credentials are missing."

**Cause**: Power BI Desktop stores data source credentials locally on the machine. The Power BI Service requires separate credential configuration for each data source and does not inherit Desktop credentials.

**Fix**: In the Power BI Service, navigate to dataset Settings > Data source credentials > click "Edit credentials" for each data source and provide the appropriate credentials. For on-premises sources, also bind the dataset to the correct gateway.

---

### Privacy Level / Formula.Firewall Conflict

**Problem**: Refresh fails with "Formula.Firewall: Query references other queries or steps, so it may not directly access a data source."

**Cause**: Power Query's privacy firewall detects that the query combines data from two different privacy levels (for example, a Public web source with a Private database) without explicit privacy level declarations. The engine blocks the query to prevent data leakage.

**Fix**:

- **Option A** (recommended for fully trusted organizational data): In Power BI Desktop, go to File > Options > Privacy > select "Ignore the Privacy Levels and potentially improve performance." In Service, set all sources to "Organizational" privacy level.
- **Option B** (granular control): In Power Query data source settings, set explicit privacy levels on each data source. Match levels so that combined sources are compatible (for example, both set to "Organizational").

---

### Gateway Offline or Timeout

**Problem**: Refresh fails with "The data source is inaccessible" or times out during the gateway connection phase.

**Cause**: The on-premises data gateway service is offline, unreachable from the Power BI Service, or the gateway credentials have expired.

**Fix**:

1. On the gateway machine, verify the gateway Windows service is running (`PBIEgwService`).
2. In Power BI Service, go to Settings > Manage gateways and check the gateway status shows "Online."
3. Re-bind the dataset to the correct gateway cluster and update the data source credentials.
4. If the gateway is behind a firewall, verify outbound HTTPS to `*.servicebus.windows.net` and `*.frontend.clouddatahub.net` is allowed.

---

### HTTP 409 Refresh in Progress

**Problem**: A programmatic refresh via the REST API returns HTTP 409 Conflict.

**Cause**: Only one full refresh operation can run on a dataset at a time. A second trigger while the first is still running is rejected with 409.

**Fix**: Before triggering a new refresh, check if one is already in progress:

```typescript
const refreshes = await pbiRequest(
  `/groups/${groupId}/datasets/${datasetId}/refreshes?$top=1`
) as { value: Array<{ status: string }> };

if (refreshes.value[0]?.status === "Unknown") {
  // "Unknown" status means refresh is in progress
  console.log("Refresh already in progress. Skipping.");
} else {
  await pbiRequest(
    `/groups/${groupId}/datasets/${datasetId}/refreshes`,
    "POST",
    { notifyOption: "MailOnFailure" }
  );
}
```

---

### Refresh Quota Exceeded

**Problem**: Refresh fails with a quota error. Power BI Pro allows 8 refreshes per day; Premium allows 48 per day.

**Cause**: Too many scheduled or API-triggered refreshes have exceeded the daily quota for the dataset's capacity tier.

**Fix**:

- Move the dataset to a Premium or Fabric capacity to increase the quota to 48/day.
- Consolidate refresh schedules to reduce frequency.
- Use incremental refresh to process only changed partitions, reducing the need for frequent full refreshes.
- Use the `notifyOption: "MailOnFailure"` option in scheduled refreshes to get alerts before quota issues cascade.

---

### Partition Refresh Failure Diagnosis

**Problem**: Refresh history shows failure but the error message in the UI is vague (for example, "Internal Service Error").

**Cause**: The failure occurred in a specific partition within a large dataset. The UI only surfaces a summary error.

**Fix**: Use the REST API to get detailed error information:

```typescript
const refreshes = await pbiRequest(
  `/groups/${groupId}/datasets/${datasetId}/refreshes?$top=5`
) as { value: Array<{ status: string; serviceExceptionJson?: string }> };

const failed = refreshes.value.find(r => r.status === "Failed");
if (failed?.serviceExceptionJson) {
  const details = JSON.parse(failed.serviceExceptionJson);
  console.log("Failed partition:", details);
  // Contains partition name, specific error code, and detailed message
}
```

---

## Direct Lake Issues

### Framing Failed (Concurrent Spark Writes)

**Problem**: Direct Lake model shows "Framing failed" error or reports display stale data.

**Cause**: A Spark job was actively writing to the Delta table at the same moment Power BI attempted to frame the table (load the Delta snapshot into the VertiPaq columnar store). The Delta transaction log was in an intermediate state.

**Fix**:

1. Schedule Spark notebook jobs to complete before peak report usage hours.
2. Run `OPTIMIZE` on the Delta table after Spark jobs finish to compact small files and stabilize the snapshot.
3. If framing is automated via semantic model refresh, add retry logic with a 30-second delay between attempts.

---

### Fallback to DirectQuery

**Problem**: Queries are slower than expected. Fabric Capacity Metrics shows DirectQuery operations on a model configured as Direct Lake.

**Cause A**: One or more columns have a data type not supported for framing (GUID/uniqueidentifier, binary, complex nested types). The engine falls back to DirectQuery for those columns.

**Cause B**: The total data volume exceeds the memory framing limit for the Fabric capacity SKU (for example, F2 has a lower framing limit than F64).

**Fix A**: In the Lakehouse, change GUID columns to `string` or `long` in the Delta schema. Update the semantic model `sourceColumn` mappings to match.

**Fix B**: Upgrade the Fabric capacity tier, or create aggregation tables that serve most queries from smaller pre-aggregated Import data, with Direct Lake as the detail-level fallback.

---

### sourceColumn Case-Sensitivity

**Problem**: Direct Lake model fails to load a column with "Column not found" even though the column exists in the Delta table.

**Cause**: Delta table column names are case-sensitive. The semantic model's `sourceColumn` property must match the Delta table column name exactly, including case.

**Fix**: Open the semantic model TMDL files, locate the `sourceColumn` property for the affected column, and match it exactly to the Delta table column name. Use the Lakehouse SQL endpoint to verify the exact column name:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'your_table'
```

---

### Schema Drift After Spark ALTER TABLE

**Problem**: After a Spark pipeline adds, removes, or renames a column in the Delta table, the Direct Lake model shows errors or missing data.

**Cause**: The semantic model schema is a snapshot taken at creation or last sync time. It does not auto-update when the underlying Delta schema changes.

**Fix**:

1. In the Fabric workspace, open the semantic model.
2. Use "Refresh schema" or re-sync from the Lakehouse to pull in the updated Delta schema.
3. Update any DAX measures or calculated columns that referenced the old column name.
4. For automated pipelines, add a post-deployment step that triggers schema sync via the XMLA endpoint or Fabric REST API.

---

## Power Query M Errors

### Excel #N/A Error Propagation

**Problem**: An Excel source imports `#N/A`, `#REF!`, or `#VALUE!` cells as Power Query error values that propagate through downstream transforms.

**Cause**: Excel cells containing formula errors are imported as Power Query `error` type values, not nulls. Any transform applied to an error row produces another error.

**Fix**:

```powerquery-m
// Option 1: Replace errors with null per column
= Table.ReplaceErrorValues(Source, {{"Column1", null}, {"Column2", null}})

// Option 2: try/otherwise on individual column access
= Table.TransformColumns(Source, {{"Amount", each try _ otherwise null}})

// Option 3: Remove all error rows
= Table.RemoveRowsWithErrors(Source, {"Column1", "Column2"})
```

---

### Type Mismatch in TransformColumnTypes

**Problem**: `Table.TransformColumnTypes` fails or produces errors on some rows.

**Cause**: The column contains mixed types (for example, text "N/A" mixed with numbers) or locale-specific date/number formats that do not match Power Query's expected format.

**Fix**: Specify the locale explicitly, and handle mixed values with a `try` pattern:

```powerquery-m
// Specify locale for date parsing
= Table.TransformColumnTypes(Source, {{"Date", type date}}, "en-US")

// Handle mixed-type columns safely
= Table.TransformColumns(Source, {
    {"Amount", each try Number.From(_) otherwise null, type nullable number}
})
```

---

### Query Folding Broken Silently

**Problem**: An M query produces correct results but runs slowly because all data is pulled into memory before filtering.

**Cause**: A step that breaks query folding (`Table.Buffer`, `Table.AddColumn` with complex logic, custom functions, `Table.Combine` across different sources) appears before the filtering steps. All subsequent steps run in the Power Query engine instead of being pushed to the data source.

**Fix**:

1. Right-click each step in the Applied Steps pane and check "View Native Query." If it is grayed out, folding is broken at or before that step.
2. Reorder steps so all `Table.SelectRows` and `Table.SelectColumns` operations appear before any non-foldable steps.
3. Remove or defer `Table.Buffer` calls unless they are strictly necessary for performance.

---

### Web.Contents Timeout

**Problem**: Power Query refresh fails with a timeout error when fetching from a web API.

**Cause**: The default timeout is too short for slow APIs, or the API is rate-limiting requests and the response takes longer than expected.

**Fix**:

```powerquery-m
// Set explicit 30-second timeout
= Web.Contents(url, [Timeout=#duration(0, 0, 30, 0)])

// For paginated APIs, also consider breaking requests into smaller pages
// to avoid long single-request wait times
```

---

### SharePoint ~$ Temp File Filter

**Problem**: `SharePoint.Files` source includes temporary lock files (names starting with `~$`) that cause type errors or duplicate rows.

**Cause**: Office applications create temporary lock files with a `~$` prefix whenever a file is open for editing. These are included by the default folder query.

**Fix**: Add a filter step immediately after the `SharePoint.Files` source:

```powerquery-m
= Table.SelectRows(Source, each not Text.StartsWith([Name], "~$"))
```

---

## REST API Errors

### 401 Token Expiry

**Problem**: REST API calls return 401 Unauthorized after initially working in a long-running script.

**Cause**: Azure AD tokens expire after 1 hour by default. Scripts that cache the token and run for extended periods will encounter 401 errors once the token expires.

**Fix**: Use MSAL token caching with silent acquisition and automatic refresh:

```typescript
async function getAccessToken(): Promise<string> {
  try {
    // Try silent (cached) acquisition first
    const result = await cca.acquireTokenByClientCredential({
      scopes: ["https://analysis.windows.net/powerbi/api/.default"],
    });
    if (!result?.accessToken) throw new Error("No token returned");
    return result.accessToken;
  } catch (error) {
    // MSAL handles token refresh internally for client credentials
    // If this fails, check client secret expiry in Azure AD app registration
    throw error;
  }
}
```

Call `getAccessToken()` before every API request rather than caching the token string in a variable. MSAL manages the cache and refresh internally.

---

### 403 Service Principal Not Authorized

**Problem**: Service principal calls return 403 Forbidden even with correct credentials and a valid token.

**Cause**: Two conditions must both be met for service principal access:

1. The Power BI Admin portal must have "Allow service principals to use Power BI APIs" enabled for the security group containing the service principal.
2. The service principal must have a workspace role (Admin, Member, or Contributor) in the target workspace.

**Fix**:

1. Power BI Admin portal > Tenant Settings > Developer Settings > "Allow service principals to use Power BI APIs" > Enable for the specific security group.
2. Add the service principal to the workspace:

```typescript
await pbiRequest(`/groups/${groupId}/users`, "POST", {
  identifier: servicePrincipalObjectId,
  groupUserAccessRight: "Contributor",
  principalType: "App",
});
```

---

### 429 Rate Limiting

**Problem**: API calls return 429 Too Many Requests during bulk automation scripts.

**Cause**: The Power BI REST API enforces rate limits. Bulk operations (listing all datasets across many workspaces, triggering multiple refreshes) can exceed these limits.

**Fix**: Read the `Retry-After` header and implement exponential backoff:

```typescript
if (response.status === 429) {
  const retryAfter = parseInt(response.headers.get("Retry-After") || "30", 10);
  console.warn(`Rate limited. Retrying after ${retryAfter} seconds.`);
  await new Promise(r => setTimeout(r, retryAfter * 1000));
  // Retry the request
}
```

For bulk operations, add deliberate delays between workspace iterations (for example, 500ms between each workspace call).

---

### Export Stuck at "Running"

**Problem**: `POST /reports/{id}/ExportTo` returns 202 Accepted but polling shows status "Running" indefinitely.

**Cause**: The report exceeds export limits (default 30 pages max for PDF), the report uses a live connection to Analysis Services (not supported for export), or the export timed out server-side (typically 10-15 minutes for large reports).

**Fix**:

1. Check per-page export limits: PDF supports a maximum of 30 pages by default.
2. For reports with live connections to Analysis Services, use paginated reports (`.rdl`) instead.
3. Implement a client-side timeout in the polling loop:

```typescript
const MAX_POLL_MINUTES = 20;
const startTime = Date.now();

while (true) {
  const elapsed = (Date.now() - startTime) / 60000;
  if (elapsed > MAX_POLL_MINUTES) {
    throw new Error(`Export timed out after ${MAX_POLL_MINUTES} minutes. Export ID: ${exportId}`);
  }
  // ... poll status ...
  await new Promise(r => setTimeout(r, 5000));
}
```

---

### PBIX Import 415 Unsupported Media Type

**Problem**: `POST /groups/{groupId}/imports` returns 415 Unsupported Media Type.

**Cause**: The request body is not using `multipart/form-data` content type with the `.pbix` file as a binary stream. Sending the file as JSON, base64-encoded, or with the wrong content type triggers 415.

**Fix**: Use `multipart/form-data` with a proper boundary and binary file attachment:

```typescript
import FormData from "form-data";
import * as fs from "fs";

const form = new FormData();
form.append("file", fs.createReadStream("report.pbix"));

const response = await fetch(
  `${PBI_BASE}/groups/${groupId}/imports?datasetDisplayName=MyReport&nameConflict=CreateOrOverwrite`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      ...form.getHeaders(),  // Sets Content-Type: multipart/form-data with boundary
    },
    body: form,
  }
);
```

Do not manually set `Content-Type: multipart/form-data` without the boundary parameter -- let the form library generate the header.
