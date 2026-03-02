# Azure Monitor Plugin

Azure Monitor, Application Insights, and Log Analytics — write KQL queries, configure metric and log alerts with action groups, set up Application Insights instrumentation and sampling, create dashboards and workbooks, manage diagnostic settings for Azure resources, implement distributed tracing with OpenTelemetry, and optimize monitoring costs.

## What This Plugin Provides

This is a **knowledge plugin** — it gives Claude deep expertise in Azure Monitor so it can write KQL queries, create alerts, configure diagnostic settings, instrument applications with Application Insights, build dashboards, and review monitoring configurations. It does not contain runtime code, MCP servers, or executable scripts.

## Setup

Run `/setup` to install Azure CLI and create a Log Analytics workspace:

```
/setup              # Full guided setup
/setup --minimal    # Workspace creation only
```

Requires an Azure subscription with Contributor access.

## Commands

| Command | Description |
|---------|-------------|
| `/setup` | Install Azure CLI, create Log Analytics workspace, enable diagnostic settings |
| `/kql-query` | Write and run KQL queries against Log Analytics, explain results |
| `/alert-create` | Create metric or log alerts with action groups |
| `/appinsights-setup` | Add Application Insights to a Node.js/TypeScript project with sampling |
| `/dashboard-create` | Create Azure Dashboard or Workbook from KQL queries |
| `/diagnostic-settings` | Configure diagnostic settings for Azure resources |

## Agent

| Agent | Description |
|-------|-------------|
| **Monitor Reviewer** | Reviews monitoring configurations for coverage, alert quality, KQL efficiency, cost optimization, and security |

## Trigger Keywords

The skill activates automatically when conversations mention: `azure monitor`, `application insights`, `app insights`, `log analytics`, `kql`, `kusto query`, `azure alerts`, `azure metrics`, `diagnostic settings`, `azure dashboard`, `workbook`, `action group`, `smart detection`.

## Author

Markus Ahling
