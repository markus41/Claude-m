# Azure Monitor — Workbooks & Dashboards

## Overview

Azure Workbooks are interactive analytical reports that combine KQL queries, metrics queries, parameters, and visualizations into a single document. They are stored as ARM resources and can be shared across subscriptions. Azure Dashboards provide a simpler pinning-based interface for static tiles. Workbooks support parameters (dropdowns, time ranges, text inputs) that filter all queries in the workbook dynamically.

---

## REST API Endpoints

Base URL: `https://management.azure.com`

### Workbooks

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| PUT | `/subscriptions/{sub}/resourceGroups/{rg}/providers/microsoft.insights/workbooks/{workbookId}` | Monitoring Contributor | Body: workbook definition | Create or update workbook |
| GET | `/subscriptions/{sub}/resourceGroups/{rg}/providers/microsoft.insights/workbooks/{workbookId}` | Monitoring Reader | — | Get workbook by resource ID |
| GET | `/subscriptions/{sub}/resourceGroups/{rg}/providers/microsoft.insights/workbooks` | Monitoring Reader | `category`, `sourceId` | List workbooks |
| DELETE | `/subscriptions/{sub}/resourceGroups/{rg}/providers/microsoft.insights/workbooks/{workbookId}` | Monitoring Contributor | — | Delete workbook |
| GET | `/providers/microsoft.insights/workbooktemplates` | Reader | — | List built-in workbook templates |

**Query parameters for listing workbooks**:
| Parameter | Description | Example |
|-----------|-------------|---------|
| `category` | Workbook category filter | `workbook`, `sentinel`, `tsg`, `performance` |
| `sourceId` | Filter by linked resource | App Insights resource ID |
| `canFetchContent` | Include serialized content | `true` |

### Dashboards

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| PUT | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Portal/dashboards/{dashboardName}` | Contributor | Body: dashboard definition | Create or update dashboard |
| GET | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Portal/dashboards/{dashboardName}` | Reader | — | Get dashboard |
| GET | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Portal/dashboards` | Reader | — | List dashboards in resource group |

---

## Workbook ARM Template

A workbook is a JSON document with `serializedData` containing a JSON-in-string representing the workbook content.

```json
PUT /subscriptions/{sub}/resourceGroups/{rg}/providers/microsoft.insights/workbooks/{guid}?api-version=2022-04-01
{
  "name": "{guid}",
  "type": "microsoft.insights/workbooks",
  "location": "eastus",
  "kind": "shared",
  "properties": {
    "displayName": "Application Performance Overview",
    "serializedData": "<see workbook content JSON below>",
    "version": "1.0",
    "category": "workbook",
    "sourceId": "/subscriptions/{sub}/resourceGroups/{rg}/providers/microsoft.insights/components/{appInsightsName}",
    "tags": []
  }
}
```

**`kind`**: `"shared"` = visible to all users with access; `"user"` = private to owner.
**`sourceId`**: Associates workbook with a specific App Insights or Log Analytics resource. Use `"azure monitor"` for workspace-independent workbooks.

---

## Workbook Content Structure

The `serializedData` value is a JSON string (escaped). The inner structure:

```json
{
  "version": "Notebook/1.0",
  "items": [
    // Text item
    {
      "type": 1,
      "content": {
        "json": "## Application Performance\nThis workbook shows request rates, latency, and failures."
      },
      "name": "header"
    },
    // Parameter item
    {
      "type": 9,
      "content": {
        "version": "KqlParameterItem/1.0",
        "parameters": [
          {
            "id": "timeRange",
            "version": "KqlParameterItem/1.0",
            "name": "TimeRange",
            "type": 4,
            "value": { "durationMs": 3600000 },
            "typeSettings": {
              "selectableValues": [
                { "durationMs": 900000, "text": "Last 15 minutes" },
                { "durationMs": 3600000, "text": "Last hour" },
                { "durationMs": 86400000, "text": "Last 24 hours" },
                { "durationMs": 604800000, "text": "Last 7 days" }
              ]
            },
            "label": "Time Range"
          },
          {
            "id": "appFilter",
            "name": "App",
            "type": 2,
            "query": "requests | distinct cloud_RoleName | sort by cloud_RoleName asc",
            "queryType": 0,
            "resourceType": "microsoft.insights/components",
            "value": "All",
            "jsonData": "[\"All\"]",
            "typeSettings": { "additionalResourceOptions": ["value:All"] },
            "label": "Application"
          }
        ]
      },
      "name": "parameters"
    },
    // Query item (table)
    {
      "type": 3,
      "content": {
        "version": "KqlItem/1.0",
        "query": "requests\n| where timestamp {TimeRange}\n| where cloud_RoleName == '{App}' or '{App}' == 'All'\n| summarize total=count(), failed=countif(success==false), p95=percentile(duration,95) by name\n| order by p95 desc",
        "size": 0,
        "title": "Top Operations by P95 Latency",
        "timeContextFromParameter": "TimeRange",
        "queryType": 0,
        "resourceType": "microsoft.insights/components",
        "visualization": "table",
        "gridSettings": {
          "formatters": [
            {
              "columnMatch": "p95",
              "formatter": 8,
              "formatterOptions": {
                "palette": "green-red",
                "min": 0,
                "max": 2000
              }
            }
          ]
        }
      },
      "name": "top-operations"
    },
    // Query item (time chart)
    {
      "type": 3,
      "content": {
        "version": "KqlItem/1.0",
        "query": "requests\n| where timestamp {TimeRange}\n| summarize count=count(), failures=countif(success==false) by bin(timestamp, 5m)\n| extend failRate = failures * 100.0 / count",
        "size": 0,
        "title": "Request Rate and Failure Rate",
        "timeContextFromParameter": "TimeRange",
        "queryType": 0,
        "resourceType": "microsoft.insights/components",
        "visualization": "timechart"
      },
      "name": "request-chart"
    }
  ],
  "styleSettings": {},
  "fromTemplateId": "sentinel-UserWorkbook"
}
```

---

## Item Types Reference

| Type ID | Item Type | Purpose |
|---------|-----------|---------|
| 1 | Text | Markdown text, headers, descriptions |
| 3 | Query | KQL query result displayed as table, chart, grid, tiles |
| 9 | Parameters | Interactive parameter controls (time range, dropdown, text) |
| 10 | Metric | Azure Monitor Metrics query |
| 11 | Links | Navigation links and tabs |
| 12 | Group | Collapsible group container |

---

## Parameter Types Reference

| Type ID | Parameter Type | Input Method |
|---------|---------------|-------------|
| 1 | Text | Free-text input |
| 2 | Drop-down | Select from KQL-populated list |
| 4 | Time range picker | Relative or absolute time range |
| 5 | Resource picker | Select Azure resources |
| 6 | Subscription picker | Select Azure subscriptions |
| 7 | Resource type picker | Select resource type |

---

## Visualization Types Reference

| Visualization | `visualization` value | Best For |
|--------------|----------------------|---------|
| Table | `"table"` | Multi-column result sets with conditional formatting |
| Time chart | `"timechart"` | Trends over time (requires `bin(timestamp, interval)`) |
| Bar chart | `"barchart"` | Comparison across categories |
| Pie chart | `"piechart"` | Distribution/proportion |
| Tiles | `"tiles"` | KPI cards with single metric per tile |
| Map | `"map"` | Geographic distribution |
| Scatter chart | `"scatterchart"` | Correlation between two metrics |
| Area chart | `"areachart"` | Stacked time series |
| Grid | `"grid"` | Table with drill-down capability |

---

## Bicep: Workbook Deployment

```bicep
param location string = resourceGroup().location
param workbookId string = newGuid()
param appInsightsId string

var workbookContent = {
  version: 'Notebook/1.0'
  items: [
    {
      type: 1
      content: {
        json: '## Request Performance Dashboard'
      }
      name: 'header'
    }
    {
      type: 3
      content: {
        version: 'KqlItem/1.0'
        query: 'requests | where timestamp > ago(1h) | summarize count=count(), p95=percentile(duration,95) by name | order by p95 desc | take 10'
        size: 0
        title: 'Top 10 Operations by P95'
        queryType: 0
        resourceType: 'microsoft.insights/components'
        visualization: 'table'
      }
      name: 'top-ops'
    }
  ]
}

resource workbook 'microsoft.insights/workbooks@2022-04-01' = {
  name: workbookId
  location: location
  kind: 'shared'
  properties: {
    displayName: 'Request Performance Dashboard'
    serializedData: string(workbookContent)
    version: '1.0'
    category: 'workbook'
    sourceId: appInsightsId
  }
}
```

---

## Shared Workbooks and Access Control

Shared workbooks (`kind: "shared"`) are visible to anyone with Reader access to the resource group or parent Application Insights resource.

**Permissions model**:
| Permission | Access Level |
|------------|-------------|
| Reader | View shared workbooks |
| Monitoring Reader | View workbooks + query data |
| Monitoring Contributor | Create/edit workbooks |
| Contributor | Full management |

**Sharing across subscriptions**: To share a workbook across subscriptions, copy the `serializedData` JSON and create a new workbook in the target subscription. There is no native cross-subscription sharing.

---

## Pinning Workbook Sections to Dashboards

You can pin individual sections (items) of a workbook to an Azure Dashboard.

1. Open the workbook in the Azure portal.
2. Click the pin icon on a specific chart or table section.
3. Select the target dashboard (existing or new).
4. The pinned tile auto-refreshes based on the dashboard's time range.

**Programmatic dashboard with pinned tile (ARM)**:
```json
PUT /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Portal/dashboards/my-dashboard?api-version=2020-09-01-preview
{
  "location": "global",
  "properties": {
    "lenses": {
      "0": {
        "order": 0,
        "parts": {
          "0": {
            "position": { "x": 0, "y": 0, "rowSpan": 4, "colSpan": 6 },
            "metadata": {
              "type": "Extension/AppInsightsExtension/PartType/AspNetOverviewPinnedPart",
              "asset": {
                "idInputName": "ComponentId",
                "object": {
                  "Name": "my-app-insights",
                  "SubscriptionId": "{sub}",
                  "ResourceGroup": "{rg}"
                }
              },
              "settings": {
                "content": {
                  "OverviewType": 0
                }
              }
            }
          }
        }
      }
    },
    "metadata": {
      "model": {
        "timeRange": {
          "value": { "relative": { "duration": 24, "timeUnit": 1 } },
          "type": "MsPortalFx.Composition.Configuration.ValueTypes.TimeRange"
        }
      }
    }
  }
}
```

---

## Export and Import via Azure CLI

```bash
# Export workbook content
az resource show \
  --ids "/subscriptions/{sub}/resourceGroups/{rg}/providers/microsoft.insights/workbooks/{guid}" \
  --query properties.serializedData \
  -o tsv > workbook-export.json

# Create workbook from exported file
CONTENT=$(cat workbook-export.json)
az resource create \
  --resource-type "microsoft.insights/workbooks" \
  --resource-group rg-monitoring \
  --name $(uuidgen) \
  --properties "{\"displayName\": \"Imported Workbook\", \"serializedData\": $(echo $CONTENT | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'), \"version\": \"1.0\", \"category\": \"workbook\", \"sourceId\": \"/subscriptions/{sub}/resourceGroups/{rg}/providers/microsoft.insights/components/{aiName}\"}" \
  --api-version "2022-04-01"
```

---

## TypeScript: Create Workbook via SDK

```typescript
import { ApplicationInsightsManagementClient } from "@azure/arm-appinsights";
import { DefaultAzureCredential } from "@azure/identity";
import { v4 as uuidv4 } from "uuid";

const credential = new DefaultAzureCredential();
const client = new ApplicationInsightsManagementClient(credential, subscriptionId);

const workbookContent = {
  version: "Notebook/1.0",
  items: [
    {
      type: 1,
      content: { json: "## My Workbook" },
      name: "header",
    },
  ],
};

const workbook = await client.workbooks.createOrUpdate(
  resourceGroupName,
  uuidv4(),
  {
    kind: "shared",
    location: "eastus",
    displayName: "My Performance Workbook",
    serializedData: JSON.stringify(workbookContent),
    version: "1.0",
    category: "workbook",
    sourceId: appInsightsResourceId,
  }
);

console.log("Created workbook:", workbook.id);
```

---

## Error Codes Table

| Code | Meaning | Remediation |
|------|---------|-------------|
| `InvalidSerializedData` | Workbook JSON is malformed | Validate inner JSON before stringifying; check for unescaped characters |
| `WorkbookNotFound` | Workbook resource ID does not exist | Verify resource group, subscription, and workbook GUID |
| `403 Forbidden on workbook read` | No Reader access to resource group | Grant Monitoring Reader on the resource group |
| `Query failed in workbook` | KQL error in workbook item | Open workbook, click "Edit" on the failing item, fix KQL |
| `Parameter reference {Param} not resolved` | Parameter name mismatch | Ensure parameter names in queries match exactly (case-sensitive) |
| `Workbook size limit exceeded` | Serialized content > 1 MB | Reduce number of items; split into multiple workbooks |
| `Dashboard tile refresh error` | Linked workbook item deleted | Re-pin the workbook section; delete stale tile |

---

## Throttling Limits Table

| Resource | Limit | Retry Strategy |
|----------|-------|---------------|
| Workbooks per resource group | No published limit (practical: ~500) | Archive unused workbooks; use naming conventions |
| Workbook serialized content size | 1 MB | Simplify queries; reference external data sources |
| Dashboard tiles per dashboard | 100 tiles | Create multiple dashboards by domain area |
| Workbook query concurrency | Governed by Log Analytics limits (200 concurrent) | Stagger auto-refresh intervals across multiple viewers |
| ARM workbook API rate | 1,200 read / 600 write per hour per subscription | Cache workbook list; avoid frequent create/update in CI |

---

## Common Patterns and Gotchas

**1. Parameter time range binding**
Use `"timeContextFromParameter": "TimeRange"` in each query item to link it to the time range parameter. If omitted, the query uses the default 24-hour window regardless of the parameter selection.

**2. `{ParameterName}` syntax in queries**
Query items reference parameters using curly brace syntax: `{TimeRange}`, `{App}`. For time parameters, the portal injects the appropriate KQL time filter. For drop-down parameters, the value is inserted as a string literal. Always test for the "All" case with an `or 'All' == '{App}'` guard.

**3. Workbook `sourceId` and data scope**
The `sourceId` determines which resources are queried by default. Using an Application Insights resource ID scopes all queries to that resource. Set `sourceId` to `"azure monitor"` for multi-resource workbooks that query Log Analytics workspaces directly.

**4. Shared vs user workbooks in API**
`kind: "shared"` workbooks are stored as ARM resources and manageable via ARM API. `kind: "user"` workbooks are stored in Azure storage tied to the user profile and are NOT accessible via the ARM API — only through the portal.

**5. Conditional formatting performance**
Grid formatters with complex conditions slow down rendering for large result sets (> 1,000 rows). Apply `top N` limits in KQL or use server-side aggregation to keep tables under 500 rows for responsive workbooks.

**6. Auto-refresh settings**
Workbooks support auto-refresh intervals (5 min, 10 min, 30 min, 1 hr) when viewed in the portal. This is a viewer setting, not stored in the workbook definition. For dashboard tiles, the dashboard refresh interval applies.

**7. Exporting workbooks as ARM templates**
The Azure portal "Export template" feature for workbooks includes the full `serializedData` as a nested JSON string. When re-importing, ensure the `serializedData` is double-JSON-encoded (JSON string containing escaped JSON) — a common mistake when manually editing ARM templates.
