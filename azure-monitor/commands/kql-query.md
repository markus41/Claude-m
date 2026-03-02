---
name: kql-query
description: "Write and run KQL queries against Log Analytics or Application Insights, with result explanation"
argument-hint: "<description-of-what-to-query> [--workspace <name>] [--timerange <duration>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Write and Run a KQL Query

Generate a KQL (Kusto Query Language) query based on a natural-language description, run it against a Log Analytics workspace or Application Insights resource, and explain the results.

## Instructions

### 1. Parse the Request

- `<description>` — What the user wants to find (e.g., "show me 5xx errors in the last hour", "top 10 slowest SQL queries", "CPU usage by VM").
- `--workspace` — Log Analytics workspace name. If not provided, ask the user or look for a workspace in the current subscription.
- `--timerange` — Time range for the query (e.g., `1h`, `24h`, `7d`). Default: `24h`.

### 2. Identify the Target Table

Map the user's description to the correct Log Analytics or Application Insights table:

| User Intent | Table |
|-------------|-------|
| HTTP requests, response times | `requests` (App Insights) |
| External calls, SQL, HTTP dependencies | `dependencies` (App Insights) |
| Application errors, stack traces | `exceptions` (App Insights) |
| Custom log messages | `traces` (App Insights) |
| Feature usage, business events | `customEvents` (App Insights) |
| VM performance (CPU, memory, disk) | `Perf` |
| Agent heartbeat, connectivity | `Heartbeat` |
| Azure resource operations | `AzureActivity` |
| Azure AD sign-in logs | `SigninLogs` |
| Security events | `SecurityEvent` |
| Kubernetes pods | `KubePodInventory` |
| Container logs | `ContainerLogV2` |
| DNS queries | `DnsEvents` |
| Network flows | `AzureNetworkAnalytics_CL` |

### 3. Generate the Query

Build a KQL query following these best practices:

- **Filter early**: Put `where TimeGenerated > ago(...)` or `where timestamp > ago(...)` as the first filter.
- **Project**: Select only the columns needed for the result.
- **Summarize**: Use appropriate aggregation functions (`count`, `avg`, `percentile`, `dcount`).
- **Sort**: Order results by the most relevant column.
- **Limit**: Use `top N` or `take N` to limit result size.
- **Render**: Add `render timechart`, `render barchart`, etc. when the user wants a visualization.

### 4. Run the Query

Execute the query using Azure CLI:

```bash
az monitor log-analytics query \
  --workspace "<workspace-id>" \
  --analytics-query "<kql-query>" \
  --timespan "PT<duration>"
```

Or for Application Insights:
```bash
az monitor app-insights query \
  --app "<app-insights-name>" \
  --resource-group "<rg>" \
  --analytics-query "<kql-query>"
```

### 5. Explain the Results

After running the query:

1. **Summarize the findings** in plain language (e.g., "There were 142 HTTP 500 errors in the last hour, mostly from the `/api/orders` endpoint").
2. **Highlight anomalies** — unusually high values, sudden spikes, or unexpected patterns.
3. **Suggest follow-up queries** if the results warrant deeper investigation (e.g., "Run a dependency analysis to see if the SQL backend is causing the 500 errors").
4. **Recommend actions** if appropriate (e.g., "Consider creating an alert for this condition").

### 6. Save the Query (Optional)

If the user wants to reuse the query:

```bash
# Save as a function in Log Analytics
# (In the Azure Portal: Logs > Save > Save as function)
```

Or write the query to a `.kql` file in the project:
```bash
# Save to queries/error-analysis.kql
```
