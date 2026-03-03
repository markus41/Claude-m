# Dataflow Gen2

## Overview

Dataflow Gen2 is the Power Query Online-based transformation service in Microsoft Fabric. It uses Power Query M language for code transformations and has native connectors for 150+ data sources. Dataflows can load data into Fabric Lakehouse, Warehouse, or other supported destinations with incremental refresh support. This reference covers the Dataflow Gen2 REST API, Power Query M patterns, refresh scheduling, incremental refresh, Gateway connections, and staging lakehouse configuration.

---

## Dataflow Gen2 REST API

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| POST | `/v1/workspaces/{workspaceId}/items` | Workspace Contributor | `type=Dataflow`, `displayName` | Creates Dataflow Gen2 item |
| GET | `/v1/workspaces/{workspaceId}/items?type=Dataflow` | Workspace Viewer | — | Lists dataflows |
| GET | `/v1/workspaces/{workspaceId}/dataflows/{dataflowId}` | Workspace Viewer | — | Gets dataflow metadata |
| POST | `/v1/workspaces/{workspaceId}/items/{dataflowId}/jobs/instances` | Workspace Contributor | `jobType=Dataflow` | Triggers refresh |
| GET | `/v1/workspaces/{workspaceId}/items/{dataflowId}/jobs/instances/{jobInstanceId}` | Workspace Viewer | — | Polls refresh status |
| GET | `/v1/workspaces/{workspaceId}/items/{dataflowId}/jobs/instances` | Workspace Viewer | `maxResults` | Lists refresh history |

**Base URL**: `https://api.fabric.microsoft.com`

### Trigger a Dataflow Refresh

```bash
TOKEN=$(az account get-access-token --resource https://api.fabric.microsoft.com --query accessToken -o tsv)

curl -X POST \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items/<dataflow-id>/jobs/instances" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jobType": "Dataflow"
  }'
```

### Poll Refresh Status

```python
import time, requests

def wait_for_dataflow(token, workspace_id, dataflow_id, job_instance_id, poll_interval=30):
    url = (f"https://api.fabric.microsoft.com/v1/workspaces/{workspace_id}"
           f"/items/{dataflow_id}/jobs/instances/{job_instance_id}")
    headers = {"Authorization": f"Bearer {token}"}
    while True:
        resp = requests.get(url, headers=headers)
        resp.raise_for_status()
        status = resp.json().get("status")
        print(f"Dataflow status: {status}")
        if status in ("Completed", "Failed", "Cancelled"):
            return status
        time.sleep(poll_interval)
```

---

## Power Query M Language Patterns

Power Query M is the functional language used in Dataflow Gen2 transformations. All UI operations generate M code.

### Basic Query Structure

```powerquery
let
    Source       = Sql.Database("myserver.database.windows.net", "mydb"),
    RawOrders    = Source{[Schema="dbo", Item="orders"]}[Data],
    Filtered     = Table.SelectRows(RawOrders, each [order_date] >= Date.From(DateTime.LocalNow() - #duration(30, 0, 0, 0))),
    TypedColumns = Table.TransformColumnTypes(Filtered, {
                       {"order_id",    type text},
                       {"order_date",  type date},
                       {"customer_id", type text},
                       {"amount",      type number}
                   }),
    Renamed      = Table.RenameColumns(TypedColumns, {
                       {"order_id",    "OrderID"},
                       {"customer_id", "CustomerID"},
                       {"amount",      "TotalAmount"}
                   })
in
    Renamed
```

### Common M Transformations

```powerquery
// Filter rows
Table.SelectRows(Source, each [Status] = "Active")
Table.SelectRows(Source, each [Amount] > 0 and [Amount] < 100000)

// Remove nulls in required columns
Table.SelectRows(Source, each [CustomerID] <> null and [CustomerID] <> "")

// Add a calculated column
Table.AddColumn(Source, "FullName", each [FirstName] & " " & [LastName], type text)
Table.AddColumn(Source, "TaxAmount", each [Subtotal] * 0.1, type number)
Table.AddColumn(Source, "LoadDate", each Date.From(DateTime.LocalNow()), type date)

// Type conversion
Table.TransformColumnTypes(Source, {
    {"Amount",    type number},
    {"OrderDate", type date},
    {"IsActive",  type logical}
})

// Merge queries (JOIN)
Table.NestedJoin(Orders, {"CustomerID"}, Customers, {"ID"}, "CustomerData", JoinKind.Left)

// Expand a joined table
Table.ExpandTableColumn(Joined, "CustomerData", {"Name", "Segment"}, {"CustomerName", "CustomerSegment"})

// Group by (aggregate)
Table.Group(Source, {"Region", "ProductCategory"}, {
    {"TotalRevenue", each List.Sum([Revenue]),  type number},
    {"OrderCount",   each Table.RowCount(_),   type number}
})

// Unpivot columns
Table.UnpivotOtherColumns(Source, {"ID", "Name"}, "Attribute", "Value")

// Pivot column values into columns
Table.Pivot(Source, List.Distinct(Source[Month]), "Month", "Value", List.Sum)

// Replace value
Table.ReplaceValue(Source, null, "Unknown", Replacer.ReplaceValue, {"Status"})

// Deduplicate
Table.Distinct(Source, {"OrderID"})
```

### Incremental Load Pattern in M

```powerquery
let
    // Use parameters for date range — Fabric injects these for incremental refresh
    StartDate    = #date(RangeStart[Year], RangeStart[Month], RangeStart[Day]),
    EndDate      = #date(RangeEnd[Year],   RangeEnd[Month],   RangeEnd[Day]),

    Source       = Sql.Database("myserver.database.windows.net", "mydb", [Query =
        "SELECT * FROM dbo.orders WHERE order_date >= '" & Date.ToText(StartDate) & "'
         AND order_date < '" & Date.ToText(EndDate) & "'"
    ]),
    TypedCols    = Table.TransformColumnTypes(Source, {
                       {"order_date", type date},
                       {"amount",     type number}
                   })
in
    TypedCols
```

### Using Parameters in M

```powerquery
// Define a parameter (set in Manage Parameters dialog)
// SourceEnvironment = "prod"

let
    Source = if SourceEnvironment = "prod" then
                 Sql.Database("prod-server.database.windows.net", "proddb")
             else
                 Sql.Database("dev-server.database.windows.net",  "devdb"),
    RawData = Source{[Schema="dbo", Item="orders"]}[Data]
in
    RawData
```

### Data Source Functions

```powerquery
// SQL database
Sql.Database("server.database.windows.net", "database")
Sql.Database("server.database.windows.net", "database", [Query="SELECT * FROM dbo.tbl"])

// Azure Data Lake Storage
AzureStorage.DataLake("https://account.dfs.core.windows.net/container/path")

// SharePoint list
SharePoint.Tables("https://contoso.sharepoint.com/sites/MySite", [ApiVersion=15])

// REST API with pagination
let
    GetPage = (url) =>
        let
            Response = Web.Contents(url, [Headers=["Authorization"="Bearer " & ApiToken]]),
            Json     = Json.Document(Response)
        in Json,
    FirstPage = GetPage("https://api.example.com/orders?page=1&pageSize=100"),
    AllData   = List.Generate(
        () => [Page=FirstPage, Url="https://api.example.com/orders?page=1"],
        each [Page][data] <> null and List.Count([Page][data]) > 0,
        each [Page=GetPage([Page][next_url]), Url=[Page][next_url]],
        each [Page][data]
    )
in
    Table.FromList(List.Combine(AllData), Splitter.SplitByNothing())
```

---

## Refresh Scheduling

Dataflows can be refreshed on a schedule without a pipeline.

### Configure Schedule via Fabric Portal

1. Open the Dataflow Gen2 item.
2. Click **Settings** (gear icon).
3. Under **Scheduled refresh**, toggle on.
4. Set frequency: hourly (every 30 min or 1–12 hrs), daily, or weekly.
5. Set time zone and specific refresh times.
6. Save.

### Schedule Configuration via API

```bash
# Dataflow schedule is configured via the item properties
curl -X PATCH \
  "https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/items/<dataflow-id>" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "orders-daily-refresh",
    "description": "Refreshes at 06:00 UTC daily"
  }'
```

**Note**: Refresh schedule time settings are configured via the Fabric portal UI. The API supports triggering on-demand refreshes.

---

## Incremental Refresh

Incremental refresh loads only new/changed rows based on a date column, reducing refresh time and CU consumption.

### Incremental Refresh Setup

1. In the Dataflow Gen2 editor, define `RangeStart` and `RangeEnd` parameters (DateTime type).
2. Filter your source query on these parameters.
3. Right-click the query in the Queries pane > **Incremental refresh**.
4. Configure:
   - **Store rows in last**: N years/months/days (archive window)
   - **Refresh rows in last**: N days/hours (refresh window)
   - **Only refresh complete periods**: Enable for daily/monthly facts

### M Code for Incremental Refresh

```powerquery
let
    // RangeStart and RangeEnd are DateTime parameters
    Source = Sql.Database("server.db.windows.net", "db", [
        Query = "SELECT * FROM dbo.orders
                 WHERE order_date >= '" &
                 DateTime.ToText(RangeStart, "yyyy-MM-dd HH:mm:ss") & "'
                 AND order_date < '"  &
                 DateTime.ToText(RangeEnd,   "yyyy-MM-dd HH:mm:ss") & "'"
    ]),
    TypeCast = Table.TransformColumnTypes(Source, {{"order_date", type datetime}})
in
    TypeCast
```

### Incremental Refresh vs Full Refresh

| Aspect | Full Refresh | Incremental Refresh |
|--------|-------------|---------------------|
| Data loaded | Entire table | Only the refresh window |
| CU consumption | High (scales with table size) | Low (scales with refresh window) |
| Latency | All rows | Near-real-time for recent data |
| Complexity | Simple M query | Requires RangeStart/RangeEnd parameters |
| Best for | Small tables, dimension tables | Large fact tables with time-based partitioning |

---

## Gateway Connections

For on-premises or private network data sources, Fabric uses **On-premises data gateway** or **VNet data gateway**.

### Gateway Connection Types

| Gateway Type | Use Case | Setup |
|-------------|---------|-------|
| On-premises data gateway | On-prem SQL Server, Oracle, file shares | Install on on-prem server; register with Fabric |
| On-premises gateway (personal mode) | Single user; dev/test only | Not for production |
| VNet data gateway | Private endpoints, VNet-connected resources | Provisioned in Azure VNet; managed by Microsoft |

### Configure Gateway Connection in Dataflow

1. In Dataflow Gen2, add a data source (e.g., SQL Server on-prem).
2. In the source dialog, select **Use on-premises data gateway**.
3. Choose the registered gateway from the dropdown.
4. Enter credentials (stored in the Fabric connection).

### Test Gateway via API

```bash
# List gateways available to the user
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.fabric.microsoft.com/v1/gateways" \
  | python -m json.tool

# List gateway datasources
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.fabric.microsoft.com/v1/gateways/<gateway-id>/datasources"
```

---

## Staging Lakehouse

Dataflow Gen2 uses a staging lakehouse to buffer intermediate results during transformation. This improves performance and reliability for complex multi-step queries.

### Configure Staging Lakehouse

1. In the Dataflow Gen2 editor, click the gear icon (Settings).
2. Under **Staging settings**, toggle on.
3. Select or create a lakehouse in the current workspace.
4. The staging lakehouse stores intermediate Parquet files during refresh.

**Staging lakehouse is required** when:
- The dataflow has multiple queries that reference each other
- Total data volume per refresh > 1 GB
- Source connector does not support query folding (M transformations run client-side)

### Staging Lakehouse Storage Estimate

```
Staging size ≈ source data size × 1.5 (expansion factor for intermediate results)
```

Staging files are cleaned up automatically after a successful refresh. Failed refreshes may leave orphan files — clean them via the lakehouse file explorer.

---

## Output Destinations

Dataflow Gen2 supports multiple output destinations per query.

```
Query "CleanedOrders" → Fabric Lakehouse (append to "Tables/cleaned_orders")
Query "DimCustomers"  → Fabric Warehouse (replace "dim.Customer")
Query "SummaryReport" → Azure SQL Database (append to "dbo.DailySummary")
```

### Destination Configuration (Portal)

1. Click the **+** icon next to the query name.
2. Select **Add data destination**.
3. Choose: Lakehouse, Warehouse, Azure SQL Database, or Fabric Eventhouse.
4. Set:
   - **Update method**: Append or Replace.
   - **Table name**: Target table (auto-created if "auto" is selected).
   - **Column mapping**: Map query columns to table columns.

---

## Error Codes Table

| Error | Meaning | Remediation |
|-------|---------|-------------|
| `Refresh failed: Gateway unreachable` | On-prem gateway not running | Start the gateway service; check gateway health in Fabric Admin |
| `Refresh failed: Credentials expired` | Stored connection credentials invalid | Update credentials in the Fabric connection settings |
| `FormulaFirewallException: Data source privacy levels` | Privacy level conflict between sources | Set privacy level to Organizational or None for trusted sources |
| `EvaluationAborted: Timeout` | Query evaluation exceeded time limit | Simplify M query; push filtering to source; reduce data volume |
| `Staging lakehouse not accessible` | Staging lakehouse deleted or permissions changed | Reconfigure staging lakehouse in Dataflow settings |
| `Type conversion failed` | Incompatible type mapping between M and destination | Add explicit type casts in M; update column mapping |
| `Destination table locked` | Another refresh is writing to the same table | Check for concurrent refreshes; schedule non-overlapping |
| `Gateway: SSL certificate error` | On-prem source certificate not trusted by gateway | Install trusted CA certificate on gateway machine |
| `Query folding disabled` | Transform runs client-side (slow for large data) | Restructure M to use native query folding patterns |

---

## Throttling / Limits Table

| Resource | Limit | Notes |
|----------|-------|-------|
| Concurrent Dataflow refreshes per workspace | 8 | Additional refreshes queue |
| Dataflow output rows per refresh | 1 billion | For larger volumes, use Spark notebooks |
| Incremental refresh window min granularity | 1 day | Sub-daily incremental not supported in Gen2 (use Spark for hourly) |
| Max M query steps | Recommended < 100 | Very long M scripts are hard to debug; split into sub-queries |
| Staging lakehouse size | Governed by workspace OneLake quota | Large staging consumes workspace storage |
| Gateway throughput | Depends on gateway machine resources | Scale up gateway server for high-volume on-prem loads |
| Scheduled refresh max frequency | Every 30 minutes | For near-real-time, use streaming or Spark notebooks |
| REST API pagination | Connector-dependent | Build pagination logic in M using `List.Generate` |
