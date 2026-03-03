# Real-Time Dashboards — Design, Tiles, Auto-Refresh, and Embedding

Fabric Real-Time Dashboards are KQL-powered live dashboards with automatic refresh intervals as low as 30 seconds. They are optimized for operational monitoring of streaming data and differ from Power BI dashboards in that every tile executes a KQL query against a KQL database. This reference covers tile types, parameters, auto-refresh, sharing, and the REST API.

---

## Fabric REST API — Real-Time Dashboards

**Base URL**: `https://api.fabric.microsoft.com/v1`

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/workspaces/{workspaceId}/kqlDashboards` | Workspace Viewer | — | Lists all Real-Time Dashboards |
| GET | `/workspaces/{workspaceId}/kqlDashboards/{dashboardId}` | Workspace Viewer | — | Returns dashboard metadata |
| POST | `/workspaces/{workspaceId}/kqlDashboards` | Workspace Contributor | `displayName` | Creates new dashboard |
| PATCH | `/workspaces/{workspaceId}/kqlDashboards/{dashboardId}` | Workspace Contributor | `displayName`, `description` | Update display name |
| DELETE | `/workspaces/{workspaceId}/kqlDashboards/{dashboardId}` | Workspace Admin | — | Permanent deletion |

```bash
# Create a Real-Time Dashboard
curl -X POST "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/kqlDashboards" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "Factory Operations Dashboard",
    "description": "Live monitoring of production line metrics"
  }'
```

---

## Dashboard Data Source Configuration

Each dashboard must have at least one data source (KQL database connection).

**Data source setup in the portal**:
1. Open the dashboard in edit mode.
2. Click **Data sources** in the toolbar.
3. Click **+ Add data source**.
4. Select **KQL Database** and choose the workspace and database.
5. Name the data source (e.g., `iot-telemetry-db`) — this name is used in tile queries.

**Multiple data sources**: A single dashboard can query multiple KQL databases. Tiles reference a specific data source by name.

**Data source update**: When a KQL database is renamed or moved, update the data source reference in the dashboard. Queries referencing the old data source name will fail with "data source not found."

---

## Tile Types

### Time Chart

Best for time-series trends. Automatically uses the first `datetime` column as the X axis.

```kql
// Temperature trend by device — last 6 hours
DeviceTelemetry
| where Timestamp > ago(6h)
| summarize AvgTemp = avg(Temperature) by DeviceId, bin(Timestamp, 5m)
| render timechart
```

**Visual properties**:
| Property | Description | Typical Value |
|----------|-------------|--------------|
| Y axis min/max | Pin the axis to avoid misleading scaling | Set to 0-100 for percentages |
| Legend | Show/hide legend | Show for < 10 series |
| Multiple Y axes | Different scales for different series | Use when units differ (e.g., temp + pressure) |

### Table

Grid display for event lists, leaderboards, or detail views.

```kql
// Latest 100 events per device
DeviceTelemetry
| where Timestamp > ago(1h)
| top 100 by Timestamp desc
| project Timestamp, DeviceId, Temperature, Status
```

**Conditional formatting**: Color-code cells based on value thresholds. Configure in Visual Formatting > Conditional formatting. Useful for status columns.

### Bar Chart / Column Chart

```kql
// Top 10 machines by average temperature today
DeviceTelemetry
| where Timestamp > startofday(now())
| summarize AvgTemp = avg(Temperature) by DeviceId
| top 10 by AvgTemp desc
| render barchart
```

### Stat (Single Value / KPI Card)

Displays a single aggregated value prominently with optional trend indicator.

```kql
// Total events in last hour
DeviceTelemetry
| where Timestamp > ago(1h)
| count
```

For KPI cards, return a single-row, single-column result. The dashboard renders it as a large number.

### Pie Chart / Donut

```kql
// Distribution of machine statuses
DeviceTelemetry
| where Timestamp > ago(15m)
| summarize Count = count() by Status
| render piechart
```

### Area Chart

Area charts emphasize volume and are useful for showing cumulative throughput.

```kql
// Ingestion volume over time
DeviceTelemetry
| where Timestamp > ago(24h)
| summarize EventCount = count() by bin(Timestamp, 10m)
| render areachart
```

### Multi-Stat

Displays multiple KPI values in a grid layout. Return multiple columns and the dashboard maps each column to a separate stat card.

```kql
// Multiple KPIs in one tile
DeviceTelemetry
| where Timestamp > ago(1h)
| summarize
    TotalEvents = count(),
    UniqueDevices = dcount(DeviceId),
    AvgTemperature = round(avg(Temperature), 1),
    MaxTemperature = max(Temperature)
```

---

## Dashboard Parameters

Parameters make dashboards interactive. Users can filter the entire dashboard or specific tiles by selecting parameter values.

### Parameter Types

| Type | Description | Example |
|------|-------------|---------|
| Free text | User types any string | Device ID filter |
| Single select | Dropdown with predefined values | Region selector |
| Multi select | Multiple values selectable | Product category filter |
| Time range picker | Built-in relative/absolute time range | Last 1h, Last 24h, Custom |
| Duration | Time span selection | Window size for aggregations |

### Create a Parameter

1. In dashboard edit mode, click **Parameters** > **+ Add parameter**.
2. Set:
   - **Variable name**: Used in queries as `_varName` (e.g., `_deviceId`)
   - **Label**: Display name shown to users
   - **Type**: Text, Select, Time range
   - **Default value**: Applied when user has not changed the parameter
3. Reference in tile queries using `_varName`.

### Using Parameters in KQL Queries

```kql
// Time range parameter (_startTime, _endTime — auto-injected by time range picker)
DeviceTelemetry
| where Timestamp between (_startTime .. _endTime)
| summarize AvgTemp = avg(Temperature) by DeviceId, bin(Timestamp, 5m)

// Text parameter (_deviceFilter)
DeviceTelemetry
| where DeviceId has _deviceFilter
| where Timestamp > ago(1h)
| summarize AvgTemp = avg(Temperature) by bin(Timestamp, 1m)

// Multi-select parameter (_selectedStatuses — type: multi-select)
DeviceTelemetry
| where Status in (_selectedStatuses)
| where Timestamp > ago(1h)
| summarize count() by Status
```

**Time range parameter auto-injection**: When you add a Time range picker parameter and name the variables `_startTime` / `_endTime`, the dashboard injects them automatically into all tile queries that reference them. Tiles without these variables are not affected.

### Parameter Query — Dynamic Dropdown

Populate a dropdown from KQL query results (dynamic values from live data):

```kql
// Parameter query for device list
DeviceTelemetry
| where Timestamp > ago(24h)
| summarize by DeviceId
| project value = DeviceId, label = DeviceId
| order by label asc
```

The query must return `value` and `label` columns.

---

## Auto-Refresh Configuration

### Refresh Rates

| Refresh Interval | Use Case | Fabric SKU Requirement |
|-----------------|----------|----------------------|
| 30 seconds | Critical real-time monitoring | F64+ recommended |
| 1 minute | Operational dashboards | F16+ |
| 5 minutes | Business KPI dashboards | Any SKU |
| 10 minutes | Reporting dashboards | Any SKU |
| 30 minutes | Weekly trend dashboards | Any SKU |
| Manual only | Static dashboards, ad-hoc | Any SKU |

**Configure auto-refresh**:
1. In dashboard edit mode, click the **Auto refresh** toggle.
2. Set the minimum refresh rate.
3. Users can override refresh rates between the minimum and a maximum in view mode.

**Performance impact**: Each tile executes its KQL query on every refresh. For 10 tiles at 30-second refresh, the database receives 20 queries per minute from this dashboard alone. Use materialized views for heavy aggregation queries to reduce compute cost.

### Tile-Level Refresh Override

Individual tiles can have a different refresh interval than the dashboard default:
1. Edit the tile.
2. Go to **Advanced** settings.
3. Set a tile-specific refresh interval.

Use tile-level overrides to reduce load: set summary tiles (heavy queries) to refresh every 5 minutes while event list tiles (light queries) refresh every 30 seconds.

---

## Dashboard Layout and Design

### Grid Layout

- Dashboards use a 12-column grid.
- Tiles can span 1–12 columns and any number of rows.
- Recommended layout for operational dashboards:
  - Row 1: 3–4 KPI stat tiles (full width)
  - Row 2: 1 large time chart (8 cols) + 1 table (4 cols)
  - Row 3: Additional charts or tables

### Tile Titles and Descriptions

```
// Use descriptive tile titles that include the time range
"Average Temperature by Device — Last 6 Hours"
"Ingestion Rate (events/min) — Real-Time"
"Top 10 Highest-Temp Machines — Today"
```

Avoid generic titles like "Chart 1" or "KQL Query."

### Color Themes

Real-Time Dashboards support light and dark themes. Design with dark mode in mind for operations center use (NOC/SOC).

---

## Sharing and Access Control

### Share a Dashboard

| Access Level | Capabilities |
|-------------|--------------|
| Workspace Viewer | Can view and interact with the dashboard |
| Workspace Contributor | Can edit tiles and queries |
| Workspace Admin | Can manage sharing and permissions |

**Share externally**: Real-Time Dashboards do not support anonymous/public access. All viewers must be Fabric workspace members. For external sharing, embed in a web application with Azure AD authentication.

### Embedding

Real-Time Dashboards can be embedded in web applications using the Fabric embedding API:

```typescript
// Embed a Real-Time Dashboard using the Power BI JavaScript SDK
import * as pbi from 'powerbi-client';

const config: pbi.IDashboardEmbedConfiguration = {
  type: 'report',
  id: '<dashboard-id>',
  embedUrl: 'https://app.fabric.microsoft.com/embed/...',
  accessToken: '<azure-ad-token>',
  tokenType: pbi.models.TokenType.Aad,
};

const container = document.getElementById('dashboard-container') as HTMLElement;
const powerbi = new pbi.service.Service(
  pbi.factories.hpmFactory,
  pbi.factories.wpmpFactory,
  pbi.factories.routerFactory
);
powerbi.embed(container, config);
```

**Note**: Embedded dashboards require the viewer to have a Fabric license and workspace access. For license-free embedding, use Power BI Embedded with A SKU and an embed token.

---

## Dashboard-as-Code (JSON Definition)

Real-Time Dashboards can be exported as JSON for version control and deployment:

1. In the dashboard portal, click **...** > **Export to file**.
2. The JSON contains all tile queries, layout, parameters, and data source references.
3. Import via **New item** > **Real-Time Dashboard** > **Import from file**.

**JSON structure overview**:
```json
{
  "schema_version": "v4",
  "title": "Factory Operations Dashboard",
  "tiles": [
    {
      "id": "tile-001",
      "title": "Average Temperature",
      "query": "DeviceTelemetry | where Timestamp > ago(1h) | summarize avg(Temperature)",
      "visualType": "stat",
      "dataSourceName": "iot-telemetry-db",
      "position": { "x": 0, "y": 0, "width": 3, "height": 2 }
    }
  ],
  "dataSources": [
    {
      "name": "iot-telemetry-db",
      "clusterUri": "https://<eventhouse-uri>.kusto.fabric.microsoft.com",
      "database": "iot-telemetry-db"
    }
  ],
  "parameters": []
}
```

---

## Error Codes and Remediation

| Code / Error | Meaning | Remediation |
|---|---|---|
| `Data source not found` | Dashboard references a deleted or renamed KQL database | Update data source in dashboard settings |
| `Query timeout` | Tile query exceeded 30-second timeout | Optimize query; use materialized view; add `set query_timeout = 30s;` |
| `Partial query failure: MemoryError` | Tile query too broad; exceeded memory | Add `where Timestamp > ago(Xh)` time filter; use summarize earlier |
| `403 Forbidden on data source` | Dashboard viewer lacks access to KQL database | Grant viewer role on the workspace containing the KQL database |
| `Parameter not found` | Query references `_paramName` not defined | Add parameter in dashboard settings; match variable name exactly |
| `Refresh rate too fast` | Capacity throttling at high refresh rate | Increase Fabric SKU or reduce refresh rate |
| `Tile renders no data` | Query returns zero rows | Verify time range; check data source has recent data; test query in KQL editor |

---

## Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Tiles per dashboard | 200 | Performance degrades above ~50 tiles |
| Parameters per dashboard | 50 | |
| Data sources per dashboard | 20 | |
| Minimum auto-refresh interval | 30 seconds | F64+ SKU recommended for 30s refresh |
| Query timeout per tile | 30 seconds | Cannot be extended for dashboard tiles |
| Query result rows displayed | 10,000 | Table tiles paginate; charts use aggregated data |
| Dashboard export JSON size | 100 MB | |
| Concurrent viewers | Depends on Fabric capacity | Each viewer generates queries on each refresh |

---

## Common Patterns and Gotchas

**Pattern: Shared time range for all tiles**
Add a Time range picker parameter with variables `_startTime` and `_endTime`. All tile queries reference these. Users can change the time range on the dashboard and all tiles update simultaneously.

**Pattern: Drillthrough with parameters**
Create a summary dashboard with a device list tile. When users click a device ID, navigate to a detail dashboard with `_deviceId` pre-populated. Use the tile link feature (Edit tile > Link > Dashboard page with parameter preset).

**Gotcha: `render` keyword not needed**
Unlike KQL queries run in the KQL editor (where `render timechart` drives visualization), Real-Time Dashboard tiles use the Visual type setting in the tile editor. The `render` clause in tile queries is ignored. Remove it for clarity.

**Gotcha: Timestamp columns must be UTC**
Auto-refresh tiles compare `now()` to `Timestamp`. If ingested data uses local time without a timezone offset, `ago(1h)` will miss current data. Always ingest timestamps in UTC.

**Pattern: Anomaly detection tile**
```kql
DeviceTelemetry
| where Timestamp > ago(3d)
| summarize AvgTemp = avg(Temperature) by bin(Timestamp, 10m)
| extend anomalies = series_decompose_anomalies(make_list(AvgTemp))
| mv-expand Timestamp, AvgTemp, anomalies
| where toreal(anomalies) != 0
| project Timestamp = todatetime(Timestamp), AvgTemp = toreal(AvgTemp), AnomalyScore = toreal(anomalies)
```
This tile requires the time range to span at least 72 hours for meaningful anomaly baseline computation.

**Pattern: Traffic-light status**
Use conditional formatting on a table tile:
- Green: `Status == "Running"` → background `#00b050`
- Yellow: `Status == "Warning"` → background `#ffc000`
- Red: `Status == "Error"` or `Temperature > 85` → background `#ff0000`
