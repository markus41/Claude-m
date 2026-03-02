# Azure Functions operational knowledge (compact)

## 1) Core API / surface map
- **Runtime + app lifecycle**: `az functionapp *` (create/config/deploy/log stream), `func start`, `func azure functionapp publish`.
- **Config and secrets**: App settings (`az functionapp config appsettings *`), Key Vault references in app settings, managed identity.
- **Function endpoints**: HTTP triggers (`/api/<route>`), non-HTTP triggers (Storage Queue/Blob, Service Bus, Event Grid, Event Hub, Timer).
- **Durable Functions**: `orchestrators`, `activities`, `entities`; status query endpoints for orchestration lifecycle.
- **Observability**: Application Insights traces/requests/dependencies + Azure Monitor metrics and alerts.

## 2) Prerequisite matrix
| Area | Minimum requirement |
|---|---|
| Azure access | Subscription with permission to create `Microsoft.Web/sites`, Storage account, and App Insights resources |
| RBAC (deploy) | Contributor on resource group (or narrower custom role with Function App + config write) |
| RBAC (read-only ops) | Reader on resource group + Log Analytics/Application Insights read |
| Local tooling | Azure CLI, Azure Functions Core Tools v4, language runtime (Node/.NET/Python/Java) |
| Tenant/auth | Signed in to correct tenant/subscription (`az account show`, `az account set`) |
| Network/security | Outbound access to Storage/Service Bus/Event Hub endpoints; VNet integration for private dependencies when required |

## 3) Common failure modes and deterministic remediation
- **Cold start latency spikes**
  1. Confirm hosting plan (`az functionapp plan show`).
  2. For latency-sensitive workloads, move to Premium or Flex with always-ready instances.
  3. Reduce package size and startup work.
- **Trigger not firing (Queue/Blob/Service Bus/Event Hub)**
  1. Validate connection setting exists in app settings.
  2. Verify identity/RBAC on backing service.
  3. Check dead-letter/poison queues and host logs.
- **Deployment succeeds but function missing**
  1. Confirm build output path and runtime version compatibility.
  2. Validate `FUNCTIONS_WORKER_RUNTIME` and extension bundle config.
  3. Restart app and inspect startup logs.
- **429/5xx from dependencies**
  1. Add retry with exponential backoff and jitter.
  2. Use queue buffering/circuit breaker for downstream instability.
  3. Tune concurrency and batch size to avoid overload.

## 4) Limits, quotas, pagination/throttling guidance
- **Execution/time**: plan-dependent timeout and scaling behavior; verify before long-running workflows.
- **Throughput controls**: tune host concurrency, queue batch size/prefetch, and downstream connection limits.
- **Durable history growth**: use `continueAsNew`/state compaction for long-lived orchestrations.
- **Pagination**: when calling Graph/REST inside functions, iterate via continuation tokens (`nextLink`/skip tokens), never assume single-page results.
- **Throttling**: treat `429` and transient `5xx` as retryable; honor `Retry-After` headers.

## 5) Safe-default operational patterns
1. **Read-only first**: inspect current config, app settings keys, trigger health, and recent failures before changes.
2. **Dry-run by slot/environment**: validate in non-prod slot or staging app with representative traffic.
3. **Apply minimal change**: one setting/trigger/dependency change at a time.
4. **Verify immediately**: run smoke test + check live logs and key metrics.
5. **Rollback path ready**: slot swap back or redeploy last known good package.
