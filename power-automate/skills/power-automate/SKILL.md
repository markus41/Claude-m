---
name: power-automate
description: >
  Deep expertise in all Power Automate product areas: cloud flows (automated, instant,
  scheduled), desktop flows and RPA, Business Process Flows, AI Builder integration,
  Process Mining, Approvals, custom connectors, governance and DLP, advanced expressions,
  child flows, Power Platform Pipelines, and solution-aware ALM. Covers Dataverse Web API,
  Power Platform API, connector throttling, retry policies, environment strategy, CoE Toolkit,
  and end-to-end flow lifecycle from design through production.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
triggers:
  - power automate
  - cloud flow
  - flow design
  - flow debug
  - flow failed
  - flow run
  - connector
  - flow trigger
  - flow deployment
  - power platform flow
  - approval flow
  - automated flow
  - desktop flow
  - RPA
  - robotic process automation
  - business process flow
  - BPF
  - AI Builder
  - form processing
  - document intelligence
  - process mining
  - custom connector
  - DLP policy
  - flow governance
  - CoE toolkit
  - power platform pipelines
  - child flow
  - power automate expression
  - flow expression
  - attended automation
  - unattended automation
  - flow solution
  - connection reference
  - environment variable
---

# Power Automate — Full Product Reference

This skill provides comprehensive knowledge for designing, building, troubleshooting, and
governing all Power Automate product areas: cloud flows, desktop flows/RPA, Business Process
Flows, AI Builder, Process Mining, Approvals, custom connectors, governance, and ALM.

## Product Areas at a Glance

| Area | Description | Entry Point |
|---|---|---|
| **Cloud flows** | Automated, instant, and scheduled flows; connector-based integration | [references/cloud-flows.md](./references/cloud-flows.md) |
| **Desktop flows / RPA** | UI automation, attended/unattended bots, PAD recorder | [references/desktop-flows.md](./references/desktop-flows.md) |
| **Business Process Flows** | Dataverse-guided stage/step processes for model-driven apps | [references/business-process-flows.md](./references/business-process-flows.md) |
| **AI Builder** | Form processing, document intelligence, prediction, classification | [references/ai-builder.md](./references/ai-builder.md) |
| **Process Mining** | Event log analysis, process discovery, conformance checking | [references/process-mining.md](./references/process-mining.md) |
| **Approvals** | Teams-integrated approvals, adaptive cards, delegation | [references/approvals-adaptive-cards.md](./references/approvals-adaptive-cards.md) |
| **Connectors & triggers** | Standard/premium connectors, HTTP, throttling limits | [references/connectors-triggers.md](./references/connectors-triggers.md) |
| **Error handling & retry** | Try/catch/finally scopes, run-after, retry policies | [references/error-handling-retry.md](./references/error-handling-retry.md) |
| **Custom connectors** | OpenAPI spec, code policies, certification, environment mgmt | [references/custom-connectors.md](./references/custom-connectors.md) |
| **Governance & DLP** | Admin center, DLP policies, CoE Toolkit, environment strategy | [references/governance-dlp.md](./references/governance-dlp.md) |
| **Expressions** | Full expression function library, operators, type coercions | [references/expressions-advanced.md](./references/expressions-advanced.md) |
| **Child flows & Pipelines** | Child flow patterns, Power Platform Pipelines CI/CD | [references/child-flows-pipelines.md](./references/child-flows-pipelines.md) |

---

## Base URLs

### Supported APIs

```
Dataverse Web API:     https://{org}.{region}.dynamics.com/api/data/v9.2
Power Platform API:    https://api.powerplatform.com/powerautomate/environments/{envId}
AI Builder API:        https://{org}.{region}.dynamics.com/api/data/v9.2/msdyn_AIModels
Process Mining API:    https://api.powerplatform.com/processinsights/environments/{envId}
Approvals API:         https://{org}.{region}.dynamics.com/api/data/v9.2/approvals
```

### Legacy API (Diagnostic Only — Do Not Use in Production)

```
https://api.flow.microsoft.com/providers/Microsoft.ProcessSimple/environments/{envId}
```

---

## Cloud Flow Management (Dataverse Web API)

### Core Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/data/v9.2/workflows?$filter=category eq 5` | List cloud flows |
| GET | `/api/data/v9.2/workflows({workflowid})` | Get specific flow |
| POST | `/api/data/v9.2/workflows` | Create flow |
| PATCH | `/api/data/v9.2/workflows({workflowid})` | Update / enable / disable |
| DELETE | `/api/data/v9.2/workflows({workflowid})` | Delete flow |

**`category` values:** `0` = Classic workflow, `5` = Cloud flow, `6` = Desktop flow, `9` = BPF

**Enable/disable:**
```json
PATCH /api/data/v9.2/workflows({workflowid})
{ "statecode": 1 }
```
`statecode`: `0` = Off/Draft, `1` = On/Activated.

### Flow Run Status Values

| Status | Description |
|---|---|
| `Running` | Currently executing |
| `Succeeded` | Completed successfully |
| `Failed` | Failed — check `error.code` and `error.message` |
| `Cancelled` | Manually cancelled |
| `TimedOut` | Exceeded 30-day timeout |
| `Skipping` | Trigger condition not met |
| `Suspended` | Paused — waiting for approval or external signal |

### OData Query Patterns

```
# Active cloud flows
GET /api/data/v9.2/workflows?$filter=category eq 5 and statecode eq 1
  &$select=name,statecode,workflowid,modifiedon&$orderby=modifiedon desc&$top=50

# Flows by owner
GET /api/data/v9.2/workflows?$filter=category eq 5 and _ownerid_value eq '{userId}'
  &$expand=ownerid($select=fullname)

# Flows with recent failures
GET /api/data/v9.2/workflows?$filter=category eq 5 and statuscode eq 2
  &$orderby=modifiedon desc
```

---

## Trigger Types

| Trigger | `type` | `kind` | Description |
|---|---|---|---|
| Automated / Event | `ApiConnectionWebhook` | — | Connector event (SharePoint, Dataverse, etc.) |
| Scheduled | `Recurrence` | — | Time-based schedule (min 60s) |
| Instant / Button | `Request` | `Button` | User-triggered |
| HTTP Webhook | `Request` | `Http` | External webhook with SAS-signed URL |
| Power Apps V2 | `Request` | `PowerAppsV2` | Strongly typed canvas app trigger |
| Power Pages | `Request` | `PowerPagesV2` | From Power Pages form submit |
| Dataverse row | `OpenApiConnection` | — | When row is added/modified/deleted |

**Recurrence example:**
```json
{
  "type": "Recurrence",
  "recurrence": {
    "frequency": "Day", "interval": 1,
    "startTime": "2026-01-01T08:00:00Z",
    "timeZone": "Central Standard Time",
    "schedule": { "hours": ["8","17"], "minutes": ["0"] }
  }
}
```

---

## Solution-Aware Flow Concepts

### Connection References

Decouple connector configuration from concrete connections:
- Defined in solution as a component
- Must be re-mapped on import to target environment connections
- Allows same flow to work across dev/test/prod without editing

### Environment Variables

| Type | Reference Syntax | Notes |
|---|---|---|
| `String` | `@parameters('env_SchemaName')` | URLs, IDs, names |
| `Number` | `@parameters('env_SchemaName')` | Thresholds, limits |
| `Boolean` | `@parameters('env_SchemaName')` | Feature flags |
| `JSON` | `@parameters('env_SchemaName')` | Structured config |
| `Secret` | Via Key Vault reference | Credentials — never plain text |
| `Data source` | Dataverse table reference | For data source connectors |

Values kept in unmanaged layer for per-environment overrides.

### Managed vs Unmanaged Layers

| Aspect | Managed | Unmanaged |
|---|---|---|
| Editable | No (locked) | Yes |
| Removal | Components removed on uninstall | Manual cleanup |
| Use case | Production deployment | Development |
| Layering | Base layer | Customization layer (wins) |

Use `Remove active customization` to revert unmanaged changes.

---

## Retry Policies

| Policy | Description |
|---|---|
| `exponential` | Default — exponential backoff |
| `fixed` | Constant delay between retries |
| `none` | Fail immediately — no retries |

**Limits:** Max 90 retries, max 1-day delay, min 5s delay.
**Triggers:** `408`, `429`, `5xx`. `Retry-After` header is honored.

**Run-after statuses:** `is successful` | `has failed` | `is skipped` | `has timed out`

**Scope-based try/catch/finally:**
```
Scope: "Try"           → business logic
Scope: "Catch"         → run after: Try has failed
  Log error, notify
Scope: "Finally"       → run after: Catch succeeded / failed / skipped
  Cleanup, release locks
```

---

## Connector Throttle Limits

| Connector | Limit | Window | Notes |
|---|---|---|---|
| SharePoint | 600 calls | 60s per connection | Per-connection |
| Office 365 Outlook | 300 calls | 60s per connection | |
| Dataverse (Web API) | 6,000 requests | 5-min sliding window per user | |
| Custom connectors | 500 requests | 60s per connection | Default |
| Power Automate Mgmt | 5 GET / 300 non-GET | 60s / 3,600s per connection | Admin ops |
| HTTP connector | No published limit | — | Subject to burst cap |

**Platform burst cap:** 100,000 actions / 5 minutes across all flows in an environment.

---

## Plan Types & Licensing

| Plan | Cost | Power Platform Requests/Day | Premium Connectors | RPA |
|---|---|---|---|---|
| Power Automate Premium | $15/user/mo | 40,000 | Yes | Attended |
| Power Automate Process | Per-flow | 250,000 (stackable) | Yes | Unattended |
| Power Automate Hosted Process | Per-flow | 250,000 | Yes | Hosted unattended |
| Seeded (M365) | Included | ~10,000 (Low profile) | No | No |
| Pay-as-you-go | Per run | 10M (Extended) | Yes | Yes |

**AI Builder credits:** Separate from PPR. Included in Premium (500 credits/user/mo); pooled at tenant level.

---

## Required Permissions

| Role | Scope | Capabilities |
|---|---|---|
| Environment Maker | Environment | Create flows, manage own flows |
| Environment Admin | Environment | All flows visible, manage all resources |
| System Administrator | Dataverse | Full admin including schema |
| Flow co-owner | Per flow | Full edit/delete/share |
| Flow run-only user | Per flow | Trigger only |
| Process Mining Contributor | Environment | Create/edit mining processes |
| AI Builder Customizer | Dataverse | Create/train AI models |

---

## Common Error Codes

| Code | HTTP | Cause | Remediation |
|---|---|---|---|
| `ActionFailed` | Varies | Generic failure | Check inner error details |
| `TooManyRequests` | 429 | Throttle exceeded | Add delay, reduce concurrency |
| `RequestTimeout` | 408 | Action timed out | Increase timeout or split work |
| `Unauthorized` | 401 | Connection expired | Re-authenticate connection |
| `Forbidden` | 403 | DLP / permissions | Check DLP group, RBAC role |
| `NotFound` | 404 | Resource missing | Verify list/table/user exists |
| `BadGateway` | 502 | Connector unavailable | Retry with exponential backoff |
| `ServiceUnavailable` | 503 | Platform outage | Monitor service health |
| `-2147015902` | Dataverse | Duplicate detection | Check duplicate detection rules |
| `-2147015898` | Dataverse | Privilege check failed | Check security role assignment |

**DLP violations:** Flow suspended — resolve by moving connectors to same DLP group, splitting flow, or requesting exception.

---

## Core Design Patterns

### Approval Flow
1. Trigger: item created/modified in SharePoint or Dataverse
2. `Start and wait for an approval` (Approve/Reject - First to respond)
3. Condition on `outcome` → approved branch / rejected branch
4. Wrap in try/catch scope
5. Retry policy: `none` for approval actions (avoid duplicate requests)

### Resilient Integration Flow
1. Scope-based try/catch/finally
2. Exponential retry on external API calls
3. Concurrency limit: prevent parallel runs causing throttle
4. Compose actions to capture intermediate state for debugging
5. Error notification in catch (Teams adaptive card)
6. Cleanup in finally (update status record, release locks)

### Solution-Aware Deployment
1. Build flow in dev inside a solution
2. Use connection references (never hardcode connections)
3. Use environment variables for all config values
4. Export as managed; import to target; re-map connection references
5. Set environment variable values in target layer

### Failed Run Investigation
1. `GET /powerautomate/environments/{envId}/flowRuns?workflowId={id}` — find `status: Failed` runs
2. Check `error.code` + `error.message`
3. `429` → check throttle table, add delays
4. `401` → re-authenticate connection
5. DLP → check connector group placement
6. Resubmit: `ResubmitFlow` management connector action

---

## Decision Tree

1. **New flow architecture** (trigger, branches, retries, idempotency) → `/flow-design`
2. **Failed / timed-out / intermittent run** → `/flow-debug`
3. **Pre-promotion readiness check** → `/flow-deploy-check`
4. **AI Builder model setup** → `/pa-ai-builder`
5. **Custom connector creation** → `/pa-custom-connector`
6. **BPF design** → `/pa-bpf-design`
7. **Governance, DLP audit, CoE** → `/pa-governance`
8. **Full setup & onboarding** → `/flow-setup`

---

## Progressive Disclosure — Reference Files

| Topic | File |
|---|---|
| Flow types, triggers, expressions, control flow, environment variables | [`references/cloud-flows.md`](./references/cloud-flows.md) |
| Standard/premium connectors, HTTP action, throttling limits, connection references | [`references/connectors-triggers.md`](./references/connectors-triggers.md) |
| Try/catch/finally, run-after, retry policies, dead letter, timeout | [`references/error-handling-retry.md`](./references/error-handling-retry.md) |
| PAD recorder, UI/web automation, attended/unattended, machine groups, SAP/Citrix | [`references/desktop-flows.md`](./references/desktop-flows.md) |
| Business Process Flows — stages, steps, branching, Dataverse integration | [`references/business-process-flows.md`](./references/business-process-flows.md) |
| AI Builder — form processing, document intelligence, prediction, custom models | [`references/ai-builder.md`](./references/ai-builder.md) |
| Process Mining — event logs, discovery, conformance, KPIs, analytics | [`references/process-mining.md`](./references/process-mining.md) |
| Approvals — Teams adaptive cards, parallel/sequential, delegation, mobile | [`references/approvals-adaptive-cards.md`](./references/approvals-adaptive-cards.md) |
| Custom connectors — OpenAPI spec, code policies, certification | [`references/custom-connectors.md`](./references/custom-connectors.md) |
| Governance — DLP policies, admin center, CoE Toolkit, environment strategy | [`references/governance-dlp.md`](./references/governance-dlp.md) |
| Expression function library — string, date, number, array, type coercions | [`references/expressions-advanced.md`](./references/expressions-advanced.md) |
| Child flows, Power Platform Pipelines, CI/CD deployment patterns | [`references/child-flows-pipelines.md`](./references/child-flows-pipelines.md) |
