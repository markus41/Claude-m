---
name: rt-dashboard-create
description: "Create a Real-Time Dashboard with KQL-powered tiles, parameters, and auto-refresh"
argument-hint: "<dashboard-name> --database <db-name> [--tiles <count>] [--refresh <30s|1m|5m>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Create a Real-Time Dashboard

Design and configure a Fabric Real-Time Dashboard with KQL-powered tiles, interactive parameters, and auto-refresh.

## Instructions

### 1. Validate Inputs

- `<dashboard-name>` — Name for the Real-Time Dashboard. Ask if not provided.
- `--database` — KQL database to connect as the data source. Ask if not provided.
- `--tiles` — Number of tiles to generate. Default: 4.
- `--refresh` — Auto-refresh interval: `30s`, `1m`, `5m`, `15m`, `30m`, `1h`. Default: `1m`.

### 2. Discover Available Data

Query the KQL database to understand available tables and columns:

```kql
.show tables

.show table <TableName> schema as json
```

Ask the user what metrics or insights they want to visualize. Suggest tile layouts based on the data:
- Time-series data --> time chart tiles
- Categorical data --> bar chart or pie chart tiles
- Single KPI values --> stat or multi-stat tiles
- Location data --> map tiles
- Detail/log data --> table tiles

### 3. Create the Dashboard Item

```bash
az rest --method POST \
  --url "https://api.fabric.microsoft.com/v1/workspaces/${FABRIC_WORKSPACE_ID}/items" \
  --headers "Content-Type=application/json" \
  --body '{
    "type": "RTDashboard",
    "displayName": "<dashboard-name>",
    "description": "<description>"
  }'
```

### 4. Design Dashboard Layout

Recommend a layout based on the number of tiles:

**4-tile layout** (standard operational dashboard):
| Position | Tile type | Purpose |
|----------|-----------|---------|
| Top-left | Stat | Primary KPI (e.g., active count, total revenue) |
| Top-right | Stat | Secondary KPI (e.g., error rate, avg latency) |
| Bottom-left | Time chart | Trend over time (main metric) |
| Bottom-right | Bar chart or table | Breakdown by category or recent events |

**6-tile layout** (detailed operational dashboard):
| Position | Tile type | Purpose |
|----------|-----------|---------|
| Row 1, Col 1 | Stat | KPI 1 |
| Row 1, Col 2 | Stat | KPI 2 |
| Row 1, Col 3 | Stat | KPI 3 |
| Row 2, Col 1-2 | Time chart | Primary trend |
| Row 2, Col 3 | Pie chart | Distribution |
| Row 3, Col 1-3 | Table | Recent events / details |

### 5. Generate Tile Queries

For each tile, generate an appropriate KQL query.

**Stat tile** (single value):
```kql
<Table>
| where Timestamp > ago(5m)
| summarize <AggregateFunction>(<Column>)
```

**Time chart tile**:
```kql
<Table>
| where Timestamp > ago(24h)
| summarize <Aggregate> = <Function>(<Column>) by bin(Timestamp, 15m) [, GroupColumn]
| render timechart
```

**Bar chart tile**:
```kql
<Table>
| where Timestamp > ago(1h)
| summarize <Aggregate> = <Function>(<Column>) by <Category>
| sort by <Aggregate> desc
| render barchart
```

**Table tile**:
```kql
<Table>
| where Timestamp > ago(1h)
| project <Column1>, <Column2>, <Column3>
| sort by Timestamp desc
| take 50
```

**Map tile** (if location data exists):
```kql
<Table>
| summarize arg_max(Timestamp, *) by <EntityId>
| extend lat = todouble(<LatColumn>), lon = todouble(<LonColumn>)
| project <EntityId>, lat, lon, <MetricColumn>
```

### 6. Configure Parameters

Create dashboard parameters for interactive filtering:

**Time range parameter**:
- Name: `_timeRange`
- Type: Timespan
- Default: `24h`
- Options: `1h`, `6h`, `24h`, `7d`, `30d`

**Entity filter parameter** (e.g., DeviceId, StoreId):
- Name: `_selectedEntity`
- Type: String
- Default: empty (show all)
- Source query:
```kql
<Table> | distinct <EntityColumn> | sort by <EntityColumn> asc
```

Update all tile queries to reference parameters:
```kql
<Table>
| where Timestamp > ago(todynamic(_timeRange))
| where <EntityColumn> == _selectedEntity or isempty(_selectedEntity)
```

### 7. Configure Auto-Refresh

Set the auto-refresh interval based on the `--refresh` flag:
- **30s**: High-frequency operational monitoring (IoT, infrastructure).
- **1m**: Standard real-time dashboards (default).
- **5m**: Summary/reporting dashboards.
- **15m+**: Low-priority or cost-sensitive scenarios.

Recommend materialized views for dashboards with refresh intervals under 1 minute to reduce query load.

### 8. Display Summary

Show the user:
- Dashboard name and link
- Data source (KQL database)
- Tile layout with query for each tile
- Parameters configured
- Auto-refresh interval
- Tips for cross-filtering and drill-through setup
- Next steps: share the dashboard, add more tiles, or set up alerts (`/data-activator-trigger`)
