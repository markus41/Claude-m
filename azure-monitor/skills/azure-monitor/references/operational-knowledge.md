# Azure Monitor operational knowledge (compact)

## 1) Core API / surface map
- **Metrics**: Azure Monitor Metrics API (`Microsoft.Insights/metrics`) for platform and custom metrics.
- **Logs/KQL**: Log Analytics query surface (`/query`) for workspace and resource-context queries.
- **Alerts**: Metric alerts, scheduled query (log) alerts, action groups, alert processing rules.
- **Diagnostic settings**: Resource-level export of logs/metrics to Log Analytics, Event Hub, or Storage.
- **Application Insights**: request/dependency/trace telemetry, availability tests, distributed tracing.

## 2) Prerequisite matrix
| Area | Minimum requirement |
|---|---|
| Azure access | Subscription with target resources + Log Analytics/App Insights workspace access |
| RBAC (configure) | Monitoring Contributor (or Contributor) on monitored resources + workspace write if creating assets |
| RBAC (read-only) | Reader on resources + Log Analytics Reader / Monitoring Reader |
| Tenant/subscription | Correct tenant and subscription selected before query/config changes |
| Data plumbing | Diagnostic settings enabled where platform logs are required |
| Alert routing | Action group targets (email/webhook/ITSM) created and reachable |

## 3) Common failure modes and deterministic remediation
- **No data in Log Analytics**
  1. Check diagnostic settings exist and categories are enabled.
  2. Validate destination workspace and region compatibility.
  3. Wait ingestion delay window; rerun bounded-time query.
- **Alert not firing**
  1. Confirm evaluation frequency/window and threshold logic.
  2. Verify signal source has datapoints in interval.
  3. Check alert processing rules/suppression and action group health.
- **KQL query timeout or high cost**
  1. Add strict time filter early (`where TimeGenerated > ago(...)`).
  2. Project only needed columns.
  3. Use summarize/materialized views patterns where applicable.
- **Missing distributed traces**
  1. Ensure app uses Application Insights/OpenTelemetry SDK correctly.
  2. Confirm connection string and sampling settings.
  3. Validate operation/correlation IDs are propagated.

## 4) Limits, quotas, pagination/throttling guidance
- **Workspace limits**: ingestion/retention and commitment tier directly affect cost and query horizon.
- **Query behavior**: large scans may be throttled or timed out; optimize filters and aggregation.
- **Alerting scale**: many high-frequency rules can create alert storms; consolidate by severity/service.
- **Pagination**: handle API continuation (`nextLink`) for list operations and large result sets.
- **Throttling**: implement retry with exponential backoff for control-plane and query APIs; respect service retry hints.

## 5) Safe-default operational patterns
1. **Observe before act**: baseline current metrics/log volume and existing alert inventory.
2. **Start read-only**: run KQL diagnostics and metrics review before creating/changing alerts.
3. **Deploy in stages**: create rules in lower environments or disabled state first, then enable.
4. **Noise control first**: tune thresholds, dimensions, and suppression before paging on-call.
5. **Post-change validation**: simulate signal, confirm alert fired, and verify action group delivery.
