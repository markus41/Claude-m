---
name: pbi-dataflow
description: Scaffold a Fabric Dataflow Gen2 Power Query M definition for common source types with publishing guidance
argument-hint: "<description> [--source sql|sharepoint|rest|csv]"
allowed-tools:
  - Read
  - Write
  - Bash
---

# Dataflow Gen2 Scaffolder

Scaffold a complete Microsoft Fabric Dataflow Gen2 Power Query M definition for the specified source type, including publishing guidance via the Fabric REST API and best practice configuration patterns.

## Part 1: Dataflow Gen2 Overview

**Dataflow Gen2** is the next-generation data preparation service in Microsoft Fabric. It is distinct from classic Power BI Dataflows (Gen1) in several important ways:

| Feature | Gen1 (Power BI) | Gen2 (Fabric) |
|---|---|---|
| Output | Enhanced computed entities in CDM | Delta tables in OneLake (default) |
| Authoring | Power BI portal | Fabric portal / Power Query Online |
| Capacity | Power BI Premium | Fabric capacity required |
| DirectQuery | Not supported | Supported over OneLake outputs |
| Destinations | Internal only | SQL, Lakehouse, Warehouse, ADLS |
| Staging | Implicit | Explicit staging lakehouse |

Key architectural points:
- Dataflow Gen2 uses Power Query Online as its authoring environment
- Each dataflow query becomes a Delta table in the workspace's default lakehouse (unless a custom destination is set)
- The staging lakehouse (auto-created per workspace) handles intermediate computation
- Dataflow Gen2 outputs support Direct Lake semantic models, eliminating import latency
- Schedule refresh supports up to 48 refreshes per day on Fabric capacity

---

## Part 2: Power Query M Templates by Source

Select the appropriate template based on the `--source` flag. If no `--source` is specified, default to `sql`.

### SQL Database (--source sql)

Connects to Azure SQL, SQL Server, or any ODBC-compatible relational database. Includes timeout configuration, predicate pushdown (query folding via native query), type-setting, and column removal.

```m
let
    Source = Sql.Database("<server>", "<database>", [
        Query = "SELECT * FROM dbo.<table> WHERE [ModifiedDate] >= #datetime(2024, 1, 1, 0, 0, 0)",
        ConnectionTimeout = #duration(0, 0, 5, 0),
        CommandTimeout = #duration(0, 0, 10, 0)
    ]),
    #"Filtered Rows" = Table.SelectRows(Source, each [IsActive] = true),
    #"Set Types" = Table.TransformColumnTypes(#"Filtered Rows", {
        {"Id", Int64.Type},
        {"Name", type text},
        {"ModifiedDate", type datetime},
        {"IsActive", type logical}
    }),
    #"Removed Columns" = Table.RemoveColumns(#"Set Types", {"InternalColumn"})
in
    #"Removed Columns"
```

Notes:
- The `Query` parameter sends a native SQL query — this enables query folding at the source level
- `ConnectionTimeout` and `CommandTimeout` use `#duration(days, hours, minutes, seconds)` — adjust for slow sources
- Replace `#datetime(2024, 1, 1, 0, 0, 0)` with `RangeStart` parameter for incremental refresh
- For Azure SQL with managed identity, use `Sql.Database` with `[CredentialConnectionString = "Authentication=ActiveDirectoryMsi"]`

### SharePoint Files (--source sharepoint)

Reads the latest Excel or CSV file from a SharePoint document library. Handles temporary lock files (`~$` prefix), sorts by modified date to get the most recent file, and parses its content.

```m
let
    Source = SharePoint.Files(
        "https://<tenant>.sharepoint.com/sites/<site>",
        [ApiVersion = 15]
    ),
    #"Filtered Files" = Table.SelectRows(
        Source,
        each [Folder Path] = "/sites/<site>/Shared Documents/<folder>/"
            and not Text.StartsWith([Name], "~$")
    ),
    #"Latest File" = Table.FirstN(
        Table.Sort(#"Filtered Files", {{"Date modified", Order.Descending}}),
        1
    ),
    FileContent = #"Latest File"{0}[Content],
    ParsedExcel = Excel.Workbook(FileContent, null, true),
    Sheet1 = ParsedExcel{[Item = "Sheet1", Kind = "Sheet"]}[Data],
    PromotedHeaders = Table.PromoteHeaders(Sheet1, [PromoteAllScalars = true]),
    #"Set Types" = Table.TransformColumnTypes(PromotedHeaders, {
        {"Date", type date},
        {"Value", type number},
        {"Category", type text}
    })
in
    #"Set Types"
```

Notes:
- `ApiVersion = 15` targets SharePoint REST v1 — required for on-premises SharePoint; optional for SharePoint Online
- Filtering by exact `Folder Path` avoids scanning the entire site collection
- `~$` prefix files are temporary lock files created by Office apps — always exclude them
- For CSV files on SharePoint, replace `Excel.Workbook(...)` with `Csv.Document(...)`
- Credentials: use "Organizational Account" (OAuth) in Power Query Online

### REST API with Pagination (--source rest)

Connects to any HTTP JSON API with OAuth bearer token authentication. Implements `List.Generate` for automatic pagination following `@odata.nextLink` (OData style). Handles rate-limit (429) and server error (500) status codes gracefully.

```m
let
    BaseUrl = "https://api.example.com/v1",
    GetToken = () =>
        let
            TokenResponse = Web.Contents(
                "https://login.microsoftonline.com/<tenant-id>/oauth2/v2.0/token",
                [
                    Content = Text.ToBinary(
                        "grant_type=client_credentials"
                        & "&client_id=<client-id>"
                        & "&client_secret=<client-secret>"
                        & "&scope=https://api.example.com/.default"
                    ),
                    Headers = [#"Content-Type" = "application/x-www-form-urlencoded"]
                ]
            ),
            Parsed = Json.Document(TokenResponse)
        in
            Parsed[access_token],
    GetPage = (url as text) =>
        let
            Response = Web.Contents(url, [
                Headers = [
                    #"Authorization" = "Bearer " & GetToken(),
                    #"Content-Type" = "application/json"
                ],
                ManualStatusHandling = {429, 500}
            ]),
            Json = Json.Document(Response),
            Items = Json[value],
            NextLink = if Record.HasFields(Json, "@odata.nextLink")
                       then Json[#"@odata.nextLink"]
                       else null
        in
            {Items, NextLink},
    AllPages = List.Generate(
        () => GetPage(BaseUrl & "/items"),
        each _ <> null,
        each if _{1} <> null then GetPage(_{1}) else null,
        each _{0}
    ),
    Combined = Table.FromList(List.Combine(AllPages), Splitter.SplitByNothing()),
    Expanded = Table.ExpandRecordColumn(
        Combined,
        "Column1",
        {"id", "name", "createdDate"},
        {"Id", "Name", "CreatedDate"}
    ),
    #"Set Types" = Table.TransformColumnTypes(Expanded, {
        {"Id", Int64.Type},
        {"Name", type text},
        {"CreatedDate", type datetime}
    })
in
    #"Set Types"
```

Notes:
- `ManualStatusHandling = {429, 500}` prevents Power Query from throwing on these status codes so you can inspect and retry
- For production use, wrap `GetToken()` in a parameter or store the secret in Azure Key Vault
- `List.Generate` signature: `(initial, condition, next, selector)` — the condition `each _ <> null` stops when `GetPage` returns null (no next link)
- Replace OData `@odata.nextLink` with `next_cursor`, `page_token`, or whatever your API uses

### CSV from Blob/URL (--source csv)

Reads a CSV file from Azure Blob Storage (public or SAS-authenticated) or any HTTPS URL. Sets delimiter, encoding, and promotes headers with explicit types.

```m
let
    Source = Csv.Document(
        Web.Contents(
            "https://storage.blob.core.windows.net/<container>/<file>.csv",
            [
                Headers = [
                    #"x-ms-blob-type" = "BlockBlob"
                ]
            ]
        ),
        [
            Delimiter = ",",
            Columns = 5,
            Encoding = 65001,
            QuoteStyle = QuoteStyle.Csv
        ]
    ),
    PromotedHeaders = Table.PromoteHeaders(Source, [PromoteAllScalars = true]),
    #"Set Types" = Table.TransformColumnTypes(PromotedHeaders, {
        {"Date", type date},
        {"Amount", type number},
        {"Category", type text},
        {"Region", type text},
        {"IsActive", type logical}
    }),
    #"Filtered Rows" = Table.SelectRows(#"Set Types", each [IsActive] = true)
in
    #"Filtered Rows"
```

Notes:
- `Encoding = 65001` is UTF-8; use `1252` for Windows-1252 (common in European CSV exports)
- For SAS-authenticated Blob, append the SAS token to the URL or use `[RelativePath = "..." , Query = [sv = "...", sig = "..."]]`
- For private Blob with managed identity, use the Azure Blob Storage connector instead of `Web.Contents`

---

## Part 3: Publishing a Dataflow Gen2 via Fabric REST API

Dataflows can be created programmatically using the Fabric REST API. The M code must be base64-encoded and submitted as part of the definition payload.

```
POST https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}/dataflows
Authorization: Bearer <token>
Content-Type: application/json

{
  "displayName": "<dataflow-name>",
  "description": "<description>",
  "definition": {
    "parts": [
      {
        "path": "mashup/Package/Formulas/Section1.m",
        "payload": "<base64-encoded M code>",
        "payloadType": "InlineBase64"
      }
    ]
  }
}
```

To base64-encode the M code in PowerShell:
```powershell
$mCode = Get-Content ".\Section1.m" -Raw
$encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($mCode))
```

To base64-encode in Bash:
```bash
base64 -w 0 Section1.m
```

Authentication requirements:
- Auth scope: `https://api.fabric.microsoft.com/.default`
- Token acquisition: client credentials flow or delegated (user) flow
- The calling identity needs at least **Contributor** access to the target workspace
- Fabric workspace must be assigned to a **Fabric capacity** (F-SKU or P-SKU with Fabric enabled) — Dataflow Gen2 is not available on shared capacity or Power BI Premium Per User

Checking workspace capacity via API:
```
GET https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}
```
Look for `"capacityId"` in the response — if null, the workspace is on shared capacity and Dataflow Gen2 is unavailable.

---

## Part 4: Configuring Output Destinations

By default, Dataflow Gen2 writes each query to a Delta table in the workspace's staging lakehouse. To configure a custom destination:

1. In Power Query Online, right-click a query → "Add data destination"
2. Supported destinations:
   - **Lakehouse**: Write to a specific lakehouse table (recommended for Fabric-native workflows)
   - **Warehouse**: Write to a Fabric Warehouse table (for SQL-queryable outputs)
   - **Azure SQL Database**: Write to an external Azure SQL table
   - **Azure Data Lake Storage Gen2**: Write as Parquet or CSV files

For CI/CD pipelines, destination settings are stored in the dataflow definition and can be managed via Fabric deployment pipelines.

DirectQuery consideration: Semantic models can use Direct Lake mode over OneLake Delta outputs from Dataflow Gen2, providing near-real-time data without import refresh overhead.

---

## Part 5: Best Practices

**Use parameters for environment-specific values**: Define M parameters (`RangeStart`, `RangeEnd`, `ServerName`, `DatabaseName`) so the same dataflow definition works across dev/test/prod environments. Parameters are managed via the "Manage Parameters" dialog in Power Query Online.

**Enable incremental refresh**: For large tables, use `DateTime.LocalNow()` with `RangeStart` and `RangeEnd` parameters. Configure incremental refresh settings in the Fabric portal under the dataflow's refresh settings. This dramatically reduces refresh times and API load.

```m
// Incremental refresh pattern
let
    RangeStart = #datetime(2024, 1, 1, 0, 0, 0),  // replace with RangeStart parameter
    RangeEnd = #datetime(2024, 12, 31, 23, 59, 59), // replace with RangeEnd parameter
    Source = Sql.Database("<server>", "<db>"),
    Filtered = Table.SelectRows(Source, each [ModifiedDate] >= RangeStart and [ModifiedDate] < RangeEnd)
in
    Filtered
```

**Name steps meaningfully**: Power Query Online auto-generates names like "Changed Type2" and "Filtered Rows3". Rename steps to describe their purpose: `#"Filtered Active Records"`, `#"Set Column Data Types"`, `#"Removed Audit Columns"`. This is critical for maintainability and reviewer comprehension.

**Verify query folding**: Right-click a step in Power Query Online. If "View native query" is available and shows SQL, the step folds. Steps that break folding (like custom functions, `List.Contains`, certain `Table.AddColumn` patterns) should be moved to after the filtering/folding steps.

**Avoid Table.Buffer**: Do not use `Table.Buffer` in Dataflow Gen2 — it forces evaluation into memory, defeats incremental evaluation, and increases memory pressure. The Fabric engine handles caching automatically.

**Test locally before publishing**: Use Power BI Desktop or the Power Query diagnostics tool to validate M queries against real data before deploying to Fabric. This catches credential, schema, and folding issues early.
