# process-task-mining

Process and task mining from Microsoft log sources — extract event logs, discover process models, analyze performance, check conformance, and audit workload distribution.

## What this plugin does

Analyzes **what work is actually being done** inside Microsoft systems by reconstructing real business process execution paths from existing log data. No additional instrumentation needed — uses log data that already exists in:

- **Power Automate** — cloud flow run history (flow-level or action-level)
- **M365 Unified Audit Log** — SharePoint, Teams, Exchange, Entra ID, Power Platform events
- **Azure Monitor / Log Analytics** — ARM operations, Entra audit, custom app logs via KQL
- **Dataverse Audit Log** — entity create/update/delete/access events

## Commands

| Command | Purpose |
|---|---|
| `/mining-setup` | Interactive wizard — capture sources, auth, time window; produce `mining-context.json` |
| `/log-extract` | Pull events from one or more sources → unified event log CSV |
| `/process-discover` | Event log CSV → Directly-Follows Graph (Mermaid) + process variants table |
| `/performance-analyze` | Throughput time, waiting time, bottleneck table, rework detection |
| `/conformance-check` | Actual log vs. reference process → fitness score + deviation report |
| `/resource-analyze` | Workload per user, handover network, per-user conformance, authorization audit |

## Typical workflow

```bash
# 1. Set up the mining context
/mining-setup --sources pa,m365

# 2. Extract event logs
/log-extract --context mining-context.json --output event-log.csv

# 3. Discover what process actually runs
/process-discover event-log.csv

# 4. Measure performance and find bottlenecks
/performance-analyze event-log.csv

# 5. Compare against intended process
/conformance-check event-log.csv --reference reference-process.txt

# 6. Analyze people and workload
/resource-analyze event-log.csv --handover-network
```

## Event log format

The unified event log CSV is a superset of Microsoft's official **PA Process Mining** ingestion format and can be directly imported into the Power Automate Process Mining UI for native visualization:

| Field | Required | Description |
|---|---|---|
| `caseId` | Yes | Process instance ID |
| `activityName` | Yes | Step name |
| `timestamp` | Yes | ISO 8601 UTC |
| `resource` | Yes | User UPN or service |
| `lifecycle` | Yes | `start` or `complete` |
| `duration_ms` | No | Duration in milliseconds |
| `sourceSystem` | Yes | `power-automate`, `m365-audit`, `azure-monitor`, `dataverse` |
| `rawEventId` | No | Original event ID |

## Required permissions

| Source | Permission |
|---|---|
| Power Automate | `Flow.Read.All` (Power Platform API) |
| M365 Unified Audit Log | `AuditLog.Read.All` (Graph Beta) |
| Azure Monitor | `Reader` + `Log Analytics Reader` (Azure RBAC) |
| Dataverse | `System Administrator` or Audit Log Reader |

## Key constraints

- M365 UAL retention: **180 days** (standard) / **1 year** (E5) / **10 years** (add-on)
- Graph Audit API: maximum **10 concurrent** query jobs; results available for **30 days**
- PA Task Mining (desktop recordings) has **no programmatic API** — this plugin uses log-based approximation

## Official documentation

- [PA Process Mining](https://learn.microsoft.com/en-us/power-automate/process-mining-overview)
- [PA Process Mining data format](https://learn.microsoft.com/en-us/power-automate/process-mining-processes-and-data)
- [M365 Unified Audit Log](https://learn.microsoft.com/en-us/purview/audit-solutions-overview)
- [Graph Audit Log Query API](https://learn.microsoft.com/en-us/graph/api/security-auditcoreroot-list-auditlogqueries)
- [Office 365 Management Activity API](https://learn.microsoft.com/en-us/office/office-365-management-api/office-365-management-activity-api-reference)
- [Dataverse Auditing](https://learn.microsoft.com/en-us/power-platform/admin/manage-dataverse-auditing)
