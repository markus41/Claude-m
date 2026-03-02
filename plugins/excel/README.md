# Microsoft Excel MCP Plugin

Connect Claude to Microsoft Excel via the Model Context Protocol (MCP). This plugin provides deep expertise in the Microsoft Graph Excel REST API v1.0 — session management, worksheet/range/table/chart operations, workbook functions, formatting, and error handling.

## Installation

### From Claude Code Marketplace

```bash
/plugin marketplace add markus41/Claude-m
/plugin install "Microsoft Excel MCP"
```

### Manual Configuration

Add to your `.claude/settings.json`:

```json
{
  "mcpServers": {
    "microsoft-excel": {
      "command": "node",
      "args": ["/path/to/Claude-m/dist/index.js"],
      "env": {
        "MICROSOFT_CLIENT_ID": "your-client-id",
        "MICROSOFT_CLIENT_SECRET": "your-client-secret",
        "MICROSOFT_TENANT_ID": "your-tenant-id",
        "MICROSOFT_ACCESS_TOKEN": "your-access-token"
      }
    }
  }
}
```

## Available MCP Tools

### `excel_list_worksheets`

Lists all worksheets in an Excel workbook stored in OneDrive.

**Arguments:**
- `driveItemId` (string, required): OneDrive drive-item ID of the workbook

### `excel_read_range`

Reads a cell range from an Excel workbook.

**Arguments:**
- `driveItemId` (string, required): OneDrive drive-item ID
- `worksheet` (string, required): Worksheet name
- `range` (string, required): A1 notation range, e.g. `A1:D10`

### `excel_write_range`

Writes values to a cell range in an Excel workbook.

**Arguments:**
- `driveItemId` (string, required): OneDrive drive-item ID
- `worksheet` (string, required): Worksheet name
- `range` (string, required): A1 notation range
- `values` (array, required): 2-D array of values to write

### `excel_create_table`

Creates a named table in an Excel workbook.

**Arguments:**
- `driveItemId` (string, required): OneDrive drive-item ID
- `worksheet` (string, required): Worksheet name
- `range` (string, required): A1 notation range for the table
- `hasHeaders` (boolean, optional): Whether the first row contains headers (default: `true`)

## Base URL & Drive Item Paths

All Excel Graph API endpoints are relative to `https://graph.microsoft.com/v1.0`. The workbook is accessed via its Drive item path:

```
/me/drive/items/{item-id}/workbook
/me/drive/root:/{filename.xlsx}:/workbook
/drives/{drive-id}/items/{item-id}/workbook
/sites/{site-id}/drive/items/{item-id}/workbook
/groups/{group-id}/drive/items/{item-id}/workbook
```

**Supported format:** Office Open XML (`.xlsx`) only. Legacy `.xls` is not supported.

**Supported storage:** OneDrive for Business, SharePoint sites, Group drives. OneDrive Consumer is not supported for most operations.

## Required Permissions

| Scope | Type | Use Case |
|-------|------|----------|
| `Files.Read` | Delegated | Read-only workbook operations |
| `Files.ReadWrite` | Delegated | Read and write workbook data (standard minimum) |
| `Files.ReadWrite.All` | Delegated | Access files shared with the user |
| `Sites.ReadWrite.All` | Delegated/Application | SharePoint-hosted workbooks; required for app-only |
| `Sites.Read.All` | Application | Named items (application permission) |

**Note:** Application (app-only) permissions are not supported for most Excel operations. `Files.ReadWrite` delegated permission is the standard minimum for write operations.

## Session Management

Sessions improve performance by batching changes and reducing per-call file writes.

### Session Modes

| Mode | Description | Persistence |
|------|-------------|-------------|
| Persistent session | `persistChanges: true` — changes saved to file | Yes |
| Non-persistent session | `persistChanges: false` — temp copy, changes lost on expiry | No |
| Sessionless | No session header — each call writes independently | Yes (inefficient) |

**Timeouts:** Persistent sessions expire after ~5 minutes of inactivity. Non-persistent sessions expire after ~7 minutes. Expired sessions return `404`.

### Create Session

```json
POST /me/drive/items/{id}/workbook/createSession
Content-Type: application/json

{ "persistChanges": true }
```

**Response (201 Created):**

```json
{
  "id": "{session-id}",
  "persistChanges": true
}
```

For large workbooks, add `Prefer: respond-async` to get a `202 Accepted` with a `Location` header. Poll the status URL (~30 seconds intervals, max 4 minutes) until `succeeded`, then fetch session info from `resourceLocation`.

### Close Session

```json
POST /me/drive/items/{id}/workbook/closeSession
workbook-session-id: {session-id}

{}
```

**Response:** `204 No Content`

### Refresh Session

```json
POST /me/drive/items/{id}/workbook/refreshSession
workbook-session-id: {session-id}

{}
```

### Session Header

All subsequent requests include: `workbook-session-id: {session-id}`

## API Endpoints

### Worksheet Operations

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/workbook/worksheets` | List all worksheets |
| GET | `/workbook/worksheets/{name-or-id}` | Get specific worksheet |
| POST | `/workbook/worksheets` | Add worksheet |
| PATCH | `/workbook/worksheets/{name-or-id}` | Update worksheet (rename/reposition) |
| DELETE | `/workbook/worksheets/{name-or-id}` | Delete worksheet |
| GET | `/workbook/worksheets/{name}/usedRange` | Get used range |
| GET | `/workbook/worksheets/{name}/cell(row=0,column=0)` | Get single cell (0-indexed) |
| GET | `/workbook/worksheets/{name}/range(address='A1:B2')` | Get range by address |

**Add worksheet:**

```json
POST /me/drive/items/{id}/workbook/worksheets

{ "name": "NewSheet" }
```

**Update worksheet (rename/reposition):**

```json
PATCH /me/drive/items/{id}/workbook/worksheets/{name}

{ "name": "RenamedSheet", "position": 3 }
```

**Note:** Worksheet IDs contain `{` and `}` characters and must be URL-encoded (e.g., `%7B75A18F35...%7D`).

### Range Operations

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/worksheets/{name}/range(address='A1:B2')` | Get range values, formulas, formats |
| PATCH | `/worksheets/{name}/range(address='A1:B2')` | Update values, formulas, numberFormat |
| POST | `/worksheets/{name}/range(address='A1:A5')/insert` | Insert cells (shift down/right) |
| POST | `/worksheets/{name}/range(address='A1:A5')/delete` | Delete cells (shift up/left) |
| POST | `/worksheets/{name}/range(address='A1:B10')/clear` | Clear contents, formats, or all |
| POST | `/worksheets/{name}/range(address='A1:C1')/merge` | Merge cells |
| POST | `/worksheets/{name}/range(address='A1:C1')/unmerge` | Unmerge cells |
| POST | `/worksheets/{name}/range(address='A1:D100')/sort/apply` | Sort range |

**Update range (write values, formulas, number formats):**

```json
PATCH /me/drive/items/{id}/workbook/worksheets/{name}/range(address='A1:B2')
workbook-session-id: {session-id}

{
  "values": [["Test", "Value"], ["For", "Update"]],
  "numberFormat": [[null, null], [null, "m/d/yyyy;@"]],
  "formulas": [["=SUM(C1:C10)", null], [null, null]]
}
```

**Null semantics:** `null` in a 2D array skips that cell (preserves existing value). Empty string `""` clears cell content. `""` for numberFormat resets to `General`.

**Single-value broadcast** (writes same value to entire range):

```json
{ "values": "Sample text" }
```

**Insert cells:**

```json
POST .../range(address='A1:A5')/insert

{ "shift": "Down" }
```

`shift` values: `"Down"`, `"Right"`

**Clear range:**

```json
POST .../range(address='A1:B10')/clear

{ "applyTo": "All" }
```

`applyTo` values: `"All"`, `"Formats"`, `"Contents"`

**Sort range:**

```json
POST .../range(address='A1:D100')/sort/apply

{
  "fields": [
    { "key": 0, "ascending": true, "sortOn": "Value", "dataOption": "Normal" }
  ],
  "matchCase": false,
  "hasHeaders": true,
  "orientation": "Rows"
}
```

### Range Format Operations

| Method | Endpoint | Purpose |
|--------|----------|---------|
| PATCH | `.../range(address='A1')/format` | Set alignment, dimensions, wrap |
| PATCH | `.../range(address='A1')/format/font` | Set font bold, italic, size, color |
| PATCH | `.../range(address='A1')/format/fill` | Set background color |
| PATCH | `.../range(address='A1:D5')/format/borders/EdgeBottom` | Set border style |

**Set alignment and dimensions:**

```json
PATCH .../range(address='$A$1')/format

{
  "columnWidth": 135,
  "rowHeight": 49,
  "horizontalAlignment": "Center",
  "verticalAlignment": "Top",
  "wrapText": false
}
```

`horizontalAlignment`: `"General"`, `"Left"`, `"Center"`, `"Right"`, `"Fill"`, `"Justify"`, `"CenterAcrossSelection"`, `"Distributed"`

**Set font:**

```json
PATCH .../range(address='$A$1')/format/font

{
  "bold": true,
  "italic": false,
  "underline": "Single",
  "color": "#4B180E",
  "size": 26,
  "name": "Calibri"
}
```

**Set fill color:**

```json
PATCH .../range(address='$A$1')/format/fill

{ "color": "#FF0000" }
```

Clear fill: `{ "color": "" }`

**Set border:**

```json
PATCH .../range(address='A1:D5')/format/borders/EdgeBottom

{
  "style": "Continuous",
  "color": "#000000",
  "weight": "Thin"
}
```

Border positions: `EdgeTop`, `EdgeBottom`, `EdgeLeft`, `EdgeRight`, `InsideVertical`, `InsideHorizontal`, `DiagonalDown`, `DiagonalUp`

### Table Operations

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/workbook/tables` | List tables (workbook-level) |
| GET | `/workbook/worksheets/{name}/tables` | List tables (worksheet-level) |
| POST | `/workbook/tables/add` | Create table from range |
| GET | `/workbook/tables/{id\|name}` | Get table |
| PATCH | `/workbook/tables/{id\|name}` | Update table properties |
| DELETE | `/workbook/tables/{id\|name}` | Delete table |
| GET | `/workbook/tables/{id}/rows` | List rows |
| POST | `/workbook/tables/{id}/rows` | Add row(s) |
| POST | `/workbook/tables/{id}/rows/add` | Bulk add rows |
| DELETE | `/workbook/tables/{id}/rows/$/itemAt(index=6)` | Delete row by index |
| GET | `/workbook/tables/{id}/columns` | List columns |
| POST | `/workbook/tables/{id}/columns` | Add column |
| DELETE | `/workbook/tables/{id}/columns/{id\|name}` | Delete column |
| POST | `/workbook/tables/{id}/convertToRange` | Convert table to range |
| GET | `/workbook/tables/{id}/dataBodyRange` | Get data rows range |
| GET | `/workbook/tables/{id}/headerRowRange` | Get header row range |
| GET | `/workbook/tables/{id}/range` | Get full table range |
| POST | `.../tables/{id}/sort/apply` | Sort table |
| POST | `.../columns(id='2')/filter/apply` | Apply column filter |
| POST | `.../columns(id='2')/filter/clear` | Clear column filter |
| POST | `/workbook/tables/{id}/clearFilters` | Clear all filters |
| POST | `/workbook/tables/{id}/reapplyFilters` | Reapply all filters |

**Create table from range:**

```json
POST /me/drive/items/{id}/workbook/tables/add
workbook-session-id: {session-id}

{
  "address": "Sheet1!A1:D10",
  "hasHeaders": true
}
```

**Add rows (append):**

```json
POST /me/drive/items/{id}/workbook/tables/{id}/rows
workbook-session-id: {session-id}

{
  "values": [["Jan-15-2016", 49, 37]],
  "index": null
}
```

**Bulk add rows:**

```json
POST /me/drive/items/{id}/workbook/tables/{id}/rows/add
workbook-session-id: {session-id}

{
  "values": [
    ["east", "pear", 4],
    ["west", "apple", 12]
  ]
}
```

**Add column:**

```json
POST /me/drive/items/{id}/workbook/tables/{id}/columns
workbook-session-id: {session-id}

{
  "values": [["Status"], ["Open"], ["Closed"]],
  "index": 2
}
```

**Update table properties:**

```json
PATCH /me/drive/items/{id}/workbook/tables/{id}
workbook-session-id: {session-id}

{
  "name": "NewTableName",
  "showHeaders": true,
  "showTotals": false,
  "style": "TableStyleMedium4",
  "showBandedRows": true,
  "showFilterButton": true
}
```

**Apply column filter:**

```json
POST .../tables/{id}/columns(id='2')/filter/apply
workbook-session-id: {session-id}

{
  "criteria": {
    "filterOn": "custom",
    "criterion1": ">15",
    "operator": "and",
    "criterion2": "<50"
  }
}
```

`filterOn` values: `"BottomItems"`, `"BottomPercent"`, `"CellColor"`, `"Dynamic"`, `"FontColor"`, `"Values"`, `"TopItems"`, `"TopPercent"`, `"Icon"`, `"custom"`

### Chart Operations

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/worksheets/{name}/charts` | List charts |
| GET | `/worksheets/{name}/charts/{id}` | Get chart |
| POST | `/worksheets/{name}/charts/add` | Create chart |
| PATCH | `/worksheets/{name}/charts/{id}` | Update chart (name, size, position) |
| DELETE | `/worksheets/{name}/charts/{id}` | Delete chart |
| GET | `/worksheets/{name}/charts/{id}/image(width=0,height=0,fittingMode='fit')` | Get chart as base64 PNG |
| POST | `/worksheets/{name}/charts/{id}/setData` | Reset chart data source |
| POST | `/worksheets/{name}/charts/{id}/setPosition` | Set chart position by cell range |

**Create chart:**

```json
POST /me/drive/items/{id}/workbook/worksheets/{name}/charts/add
workbook-session-id: {session-id}

{
  "type": "ColumnClustered",
  "sourceData": "A1:C4",
  "seriesBy": "Auto"
}
```

**Common chart types:** `"ColumnClustered"`, `"ColumnStacked"`, `"BarClustered"`, `"Line"`, `"LineMarkers"`, `"Pie"`, `"Doughnut"`, `"XYScatter"`, `"Area"`, `"Radar"`, `"Surface"`

**Get chart as image:**

```
GET .../charts/{id}/image(width=0,height=0,fittingMode='fit')
```

Response: `{ "value": "{base64-encoded-png}" }`

### Named Item Operations

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/workbook/names` | List named items (workbook-scoped) |
| GET | `/workbook/worksheets/{name}/names` | List named items (worksheet-scoped) |
| GET | `/workbook/names/{name}` | Get named item |
| POST | `/workbook/names/add` | Add named item |
| GET | `/workbook/names/{name}/range` | Get range for named item |

**Add named item:**

```json
POST /me/drive/items/{id}/workbook/names/add
workbook-session-id: {session-id}

{
  "name": "SalesData",
  "reference": "=Sheet1!$A$1:$D$100",
  "comment": "Sales data range"
}
```

### PivotTable Operations

PivotTable support is limited to list, get, and refresh. Creation/modification is not supported via the API.

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/worksheets/{id}/pivotTables` | List pivot tables |
| GET | `/worksheets/{id}/pivotTables/{id}` | Get pivot table |
| POST | `/worksheets/{id}/pivotTables/{id}/refresh` | Refresh pivot table |
| POST | `/worksheets/{id}/pivotTables/refreshAll` | Refresh all pivot tables |

### Workbook Functions

Over 300 Excel worksheet functions are available as POST endpoints:

```json
POST /me/drive/items/{id}/workbook/functions/vlookup
workbook-session-id: {session-id}

{
  "lookupValue": "Temperature",
  "tableArray": { "Address": "Sheet1!E1:G5" },
  "colIndexNum": 2,
  "rangeLookup": false
}
```

**Response:**

```json
{
  "error": null,
  "value": "28.3"
}
```

**Key rules:**
- Range arguments use `{ "Address": "Sheet1!A1:B10" }` (not plain address strings)
- Function index parameters are 1-based (unlike 0-based API elsewhere)
- Non-null `error` indicates Excel-level error (`#N/A`, `#VALUE!`, etc.)

**Common functions:** `sum`, `average`, `vlookup`, `countIf`, `sumIf`, `averageIf`, `index`, `match`, `left`, `right`, `mid`, `len`, `trim`, `concatenate`, `text`, `dateValue`, `now`, `today`, `round`, `abs`, `max`, `min`, `if`, `iferror`, `median`, `pmt`

### Workbook Operations

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/workbook/createSession` | Create workbook session |
| POST | `/workbook/closeSession` | Close session |
| POST | `/workbook/refreshSession` | Refresh session |
| POST | `/workbook/application/calculate` | Recalculate workbook |

**Calculate workbook:**

```json
POST /me/drive/items/{id}/workbook/application/calculate

{ "calculationType": "Recalculate" }
```

`calculationType` values: `"Recalculate"`, `"Full"`, `"FullRebuild"`

## Number Format Reference

| Format String | Rendering | Use Case |
|--------------|-----------|----------|
| `"General"` | Default | Auto-detect |
| `"0.00"` | `123.46` | Decimal |
| `"#,##0"` | `1,234` | Integer with thousands separator |
| `"#,##0.00"` | `1,234.56` | Currency-like |
| `"$#,##0.00"` | `$1,234.56` | US currency |
| `"0.00%"` | `12.34%` | Percentage |
| `"0.00E+00"` | `1.23E+03` | Scientific |
| `"m/d/yyyy"` | `3/1/2026` | Date (US) |
| `"yyyy-mm-dd"` | `2026-03-01` | Date (ISO) |
| `"h:mm:ss AM/PM"` | `2:30:00 PM` | Time (12-hour) |
| `"@"` | Text as-is | Force text |

## Error Handling

### HTTP Status Codes

| Status | Error Code | Description |
|--------|-----------|-------------|
| 400 | `badRequest` | Malformed request or invalid parameters |
| 401 | `unauthorized` | Missing or invalid authentication |
| 403 | `forbidden` | Insufficient permissions |
| 404 | `notFound` | Resource not found or session expired |
| 405 | `methodNotAllowed` | HTTP method not supported |
| 409 | `conflict` | State conflict (e.g., concurrent edit) |
| 413 | `payloadTooLarge` | Request exceeds size limit |
| 429 | `tooManyRequests` | Throttled — check `Retry-After` header |
| 500 | `internalServerError` | Server-side error |
| 502 | `badGateway` | Temporary gateway error |
| 503 | `serviceUnavailable` | Service temporarily unavailable |

### Error Response Structure

```json
{
  "error": {
    "code": "ItemAlreadyExists",
    "message": "A resource with the same name or identifier already exists.",
    "innerError": {
      "code": "itemAlreadyExists",
      "request-id": "214ca7ea-9ea4-442e-9c67-71fdda0a559c",
      "date": "2026-03-01T12:00:00"
    }
  }
}
```

### Session-Specific Error Codes (innerError)

| Code | Meaning | Action |
|------|---------|--------|
| `accessConflict` | Another client has workbook locked | Wait for lock release |
| `invalidSessionReCreatable` | Session expired or transient error | Recreate session and resume |
| `invalidSessionAuthentication` | Auth error invalidated session | Fix auth, create new session |
| `invalidSessionNotFound` | Workbook cannot be found | Check file path, do not recreate |
| `invalidSessionUnsupportedWorkbook` | Unsupported features or too large | Cannot proceed |
| `unsupportedWorkbook` | File format or features unsupported | Use `.xlsx` format |
| `rangeExceedsLimit` | Cell count exceeds maximum (5M cells) | Split into smaller range operations |
| `requestAborted` | Aborted due to long calculation | Reduce formula complexity |
| `transientFailure` | Transient error | Wait and retry |

### Throttling (429) Handling

1. Read the `Retry-After` header value (seconds)
2. Wait the specified duration before any follow-up requests
3. Do not parallelize write requests to the same workbook
4. Use sessions with sequential requests per workbook

### Session Recovery for 502/503

For sessionful requests that receive `502` or `503`:
- If a known innerError code is found, follow its instructions
- Otherwise, recreate the session (do not retry with old session ID)

## Constraints & Limits

| Constraint | Limit |
|-----------|-------|
| Maximum cells per range operation | 5,000,000 |
| Supported file format | `.xlsx` only (not `.xls`, `.xlsb`, `.csv`) |
| Unbounded ranges (`A:A`, `1:1`) | Read-only; cannot write |
| Persistent session timeout | ~5 minutes inactivity |
| Non-persistent session timeout | ~7 minutes inactivity |
| Concurrent write requests | 1 per workbook (serialize writes) |

## Common Patterns

### Pattern 1: Read-Modify-Write with Session

1. `POST /workbook/createSession` with `persistChanges: true`
2. `GET /worksheets/{name}/usedRange` to discover data extent
3. `PATCH /worksheets/{name}/range(address='...')` to update values
4. `POST /workbook/closeSession` to save and release

### Pattern 2: Bulk Data Import

1. Create session
2. `POST /workbook/tables/add` to create table from header range
3. `POST /workbook/tables/{id}/rows/add` with multi-row `values` array
4. Repeat in batches if data exceeds practical limits
5. Close session

### Pattern 3: Report Generation with Charts

1. Create session
2. Write data to worksheet range
3. `POST /worksheets/{name}/charts/add` with data range and chart type
4. `PATCH /worksheets/{name}/charts/{id}` to set size and position
5. Optionally `GET .../charts/{id}/image(...)` to export as PNG
6. Close session

### Pattern 4: Workbook Function Evaluation

1. Write input data to a range
2. `POST /workbook/functions/vlookup` (or any function) with range references
3. Use returned `value` in subsequent operations
4. Combine multiple function calls for complex calculations

### Pattern 5: Table Filtering and Export

1. `GET /workbook/tables/{id}/columns` to discover column IDs
2. `POST .../columns(id='{col}')/filter/apply` with criteria
3. `GET /workbook/tables/{id}/dataBodyRange` to read filtered results
4. `POST /workbook/tables/{id}/clearFilters` to reset

## License

ISC
