---
name: dashboard-create
description: "Create an Azure Dashboard or Workbook from KQL queries for monitoring visualization"
argument-hint: "<dashboard|workbook> --name <name> [--queries <description>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Create a Monitoring Dashboard or Workbook

Generate an Azure Dashboard (portal tiles) or Azure Workbook (interactive report) from KQL queries.

## Instructions

### 1. Parse the Request

- `<type>` — One of: `dashboard`, `workbook`. Ask if not provided.
- `--name` — Dashboard or workbook name. Ask if not provided.
- `--queries` — Description of what to visualize (e.g., "error rates, response times, and CPU usage for our web app"). Ask if not provided.

### 2. Gather Requirements

Ask the user:
- **Target resources** — Which Azure resources or Application Insights instances to monitor
- **Key metrics** — What they want to see at a glance (errors, latency, throughput, availability, resource utilization)
- **Time range** — Default time range for the dashboard (e.g., last 24 hours, last 7 days)
- **Audience** — Ops team (detailed), management (high-level KPIs), or developers (debug-focused)

### 3. Design the Layout

Based on the audience and requirements, plan the tile/section layout:

**Operations dashboard** (typical layout):
| Row | Tiles |
|-----|-------|
| 1 | KPI tiles: Total requests, Error rate %, P95 latency, Availability % |
| 2 | Time chart: Request volume over time | Time chart: Error rate over time |
| 3 | Bar chart: Top errors by type | Table: Slowest operations |
| 4 | Time chart: CPU/Memory usage | Table: Recent exceptions |

**Executive dashboard** (high-level):
| Row | Tiles |
|-----|-------|
| 1 | KPI tiles: Availability %, SLA status, Active users, Error budget remaining |
| 2 | Trend chart: Availability over 30 days | Trend chart: Response time trend |

### 4a. Generate Dashboard JSON (for `dashboard` type)

Create a dashboard JSON file with tiles for each KQL query:

```json
{
  "properties": {
    "lenses": [
      {
        "order": 0,
        "parts": [
          {
            "position": { "x": 0, "y": 0, "colSpan": 3, "rowSpan": 2 },
            "metadata": {
              "type": "Extension/Microsoft_OperationsManagementSuite_Workspace/PartType/LogsDashboardPart",
              "settings": {
                "content": {
                  "Query": "<kql-query>",
                  "PartTitle": "<tile-title>"
                }
              }
            }
          }
        ]
      }
    ]
  }
}
```

Write the JSON to a file (e.g., `monitoring/dashboard.json`).

Deploy the dashboard:
```bash
az portal dashboard create \
  --resource-group <rg> \
  --name "<dashboard-name>" \
  --input-path dashboard.json \
  --location <location>
```

### 4b. Generate Workbook Template (for `workbook` type)

Create a workbook JSON template with parameterized queries:

**Parameters to include**:
- Time range picker (default: last 24 hours)
- Resource picker (if multi-resource)
- Service/role name filter

**Sections to include** (based on user requirements):
- Overview KPIs (tiles visualization)
- Trend charts (time series)
- Detail tables (grids with conditional formatting)
- Error analysis (charts + tables)

Write the workbook template to a file (e.g., `monitoring/workbook-template.json`).

Deploy the workbook:
```bash
az monitor app-insights workbook create \
  --resource-group <rg> \
  --name "<workbook-name>" \
  --location <location> \
  --kind shared \
  --category workbook \
  --serialized-data @monitoring/workbook-template.json
```

### 5. Write KQL Queries

For each tile or section, generate an optimized KQL query. Follow these rules:
- Filter by time range first (`where timestamp > ago(...)`)
- Use appropriate visualization render hints (`render timechart`, `render barchart`, `render piechart`)
- Include `summarize` with appropriate time bins for trend charts
- Use `project` to limit columns in table views
- Apply conditional formatting hints in comments for workbook grids

### 6. Display Summary

Show the user:
- Dashboard/workbook name and resource group
- List of tiles or sections with their KQL queries
- How to access: Azure Portal > Dashboard / Monitor > Workbooks
- How to share: Dashboard sharing settings or workbook access control
- How to customize: Edit in the portal to add/remove tiles, adjust time ranges
