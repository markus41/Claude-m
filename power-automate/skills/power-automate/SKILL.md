---
name: power-automate
description: >
  Deep expertise in Power Automate cloud flows — flow design, debugging, deployment,
  connector management, trigger types, retry policies, solution-aware concepts,
  throttle limits, and flow lifecycle via Dataverse Web API and Power Platform API.
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
---

# Power Automate Cloud Flows

This skill provides comprehensive knowledge for designing, troubleshooting, and deploying Power Automate cloud flows with idempotent patterns, connector management, retry policies, and solution-aware deployment via the supported Dataverse Web API and Power Platform API.

## Base URLs

### Supported APIs

```
Dataverse Web API:   https://{org}.{region}.dynamics.com/api/data/v9.2
Power Platform API:  https://api.powerplatform.com/powerautomate/environments/{envId}
```

### Legacy API (Unsupported — Diagnostic Only)

```
https://api.flow.microsoft.com/providers/Microsoft.ProcessSimple/environments/{envId}
```

**Note:** Microsoft explicitly states `api.flow.microsoft.com` is unsupported and subject to breaking changes. Use the Dataverse Web API for production integrations.

## API Endpoints

### Flow Management (Dataverse Web API)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/data/v9.2/workflows?$filter=category eq 5` | List cloud flows |
| GET | `/api/data/v9.2/workflows({workflowid})` | Get specific flow |
| POST | `/api/data/v9.2/workflows` | Create flow |
| PATCH | `/api/data/v9.2/workflows({workflowid})` | Update flow (enable/disable) |
| DELETE | `/api/data/v9.2/workflows({workflowid})` | Delete flow |

**Enable/Disable flow:**
```json
PATCH /api/data/v9.2/workflows({workflowid})
{
  "statecode": 1
}
```

`statecode` values: `0` = Draft/Off, `1` = Activated/On.

### Flow Runs (Power Platform API)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/powerautomate/environments/{envId}/flowRuns?workflowId={id}&api-version=2022-03-01-preview` | List flow runs |

### Flow Management Connector Actions

The Power Automate Management connector provides 21 actions:

| Action | Purpose |
|--------|---------|
| `ListMyFlows` | List flows owned by caller |
| `ListFlowsInEnvironment_V2` | List all flows in environment (admin) |
| `GetFlow` | Get flow details |
| `StartFlow` | Enable a flow |
| `StopFlow` | Disable a flow |
| `DeleteFlow` | Delete a flow |
| `CreateFlow` | Create a new flow |
| `ResubmitFlow` | Resubmit a failed run |
| `CancelFlowRun` | Cancel a running flow |

## Flow Run Status Values

| Status | Description |
|--------|-------------|
| `Running` | Flow is currently executing |
| `Succeeded` | Flow completed successfully |
| `Failed` | Flow failed — check error details |
| `Cancelled` | Flow was manually cancelled |
| `TimedOut` | Flow exceeded timeout limit (30 days default) |
| `Skipping` | Trigger condition not met, run skipped |
| `Suspended` | Flow is paused (e.g., waiting for approval) |

### Flow Run Detail Schema

```json
{
  "name": "08585329-1234-5678-abcd-000000000000",
  "startTime": "2026-03-01T10:00:00Z",
  "endTime": "2026-03-01T10:00:15Z",
  "status": "Failed",
  "trigger": {
    "name": "When_an_item_is_created",
    "status": "Succeeded",
    "code": "OK"
  },
  "error": {
    "code": "ActionFailed",
    "message": "The 'Send_an_email' action failed with status 429 (TooManyRequests)."
  },
  "correlation": {
    "clientTrackingId": "custom-tracking-id-123"
  }
}
```

## Connector Throttle Limits

| Connector | Limit | Window | Notes |
|-----------|-------|--------|-------|
| SharePoint | 600 API calls | 60 seconds per connection | Per-connection limit |
| Office 365 Outlook | 300 API calls | 60 seconds per connection | Inbox limits apply independently |
| Dataverse (Web API) | 6,000 requests | 5-minute sliding window per user | Also: 1,200s execution time limit |
| Custom connectors | 500 requests | 60 seconds per connection | Default for all custom connectors |
| Power Automate Management | 5 GET / 300 non-GET | 60s / 3,600s per connection | Admin operations |
| HTTP connector | No published fixed limit | — | Subject to platform burst cap |

**Platform-level burst cap:** 100,000 actions per 5 minutes across all flows in an environment.

## Flow Trigger Types

| Trigger Type | `type` Value | `kind` Value | Description |
|-------------|-------------|-------------|-------------|
| Manual/Button | `Request` | `Button` | Instant flow triggered by user |
| Recurrence/Schedule | `Recurrence` | — | Runs on schedule (min 60s interval) |
| Automated/Event | `ApiConnectionWebhook` | — | Triggered by connector event (e.g., "When item created") |
| HTTP Request | `Request` | `Http` | External webhook — generates SAS-signed URL |
| Power Apps V2 | `Request` | `PowerAppsV2` | Strongly typed canvas app trigger |

### Trigger Configuration Examples

**Recurrence:**
```json
{
  "type": "Recurrence",
  "recurrence": {
    "frequency": "Day",
    "interval": 1,
    "startTime": "2026-03-01T08:00:00Z",
    "timeZone": "Central Standard Time",
    "schedule": {
      "hours": ["8", "17"],
      "minutes": ["0"]
    }
  }
}
```

**Recurrence frequency values:** `Second` (min 60), `Minute`, `Hour`, `Day`, `Week`, `Month`.

## Solution-Aware Flow Concepts

### Connection References

Solution components that decouple connector configuration from concrete connections:
- Defined in solution as component type
- Must be re-mapped on import to target environment connections
- Allows same flow to work across dev/test/prod without editing

### Environment Variables

Configuration values that vary per environment:
- **Types:** `String`, `Number`, `Boolean`, `JSON`, `Data source`, `Secret`
- Values should be kept in a separate unmanaged layer for per-environment overrides
- Reference in flow expressions: `@parameters('envVarSchemaName')`

### Managed vs Unmanaged

| Aspect | Managed | Unmanaged |
|--------|---------|-----------|
| Editable | No (locked) | Yes |
| Removal | Components removed on uninstall | Manual cleanup |
| Use case | Production deployment | Development |
| Layering | Base layer | Customization layer (wins) |

Use `Remove active customization` to revert unmanaged changes back to managed base.

## Retry Policies

### Retry Policy Types

| Policy | Description | Default Behavior |
|--------|-------------|-----------------|
| `exponential` | Exponential backoff (default) | Low: 2 retries ~10 min; Medium/High: 12 retries ~1 hr |
| `fixed` | Constant delay between retries | Fixed interval, configurable |
| `none` | Immediate fail on first error | No retries |

### Retry Limits

- Maximum 90 retries
- Maximum 1 day delay between retries
- Minimum 5 second delay
- Retries trigger on: `408` (timeout), `429` (throttled), `5xx` (server error)
- `Retry-After` header is honored when present

### Configure Run After

Control flow branching based on previous action outcome:

| Status | Description |
|--------|-------------|
| `is successful` | Action completed normally |
| `has failed` | Action threw an error |
| `is skipped` | Action was skipped |
| `has timed out` | Action exceeded its timeout |

Combine statuses for error-handling patterns:

```
Configure run after: has failed, has timed out
→ Execute error notification action
```

### Scope-Based Error Handling Pattern

```
Scope: "Try"
  Action 1
  Action 2
  Action 3

Scope: "Catch" (configure run after: Try has failed)
  Log error details
  Send notification

Scope: "Finally" (configure run after: Catch is successful, has failed, is skipped)
  Cleanup actions
```

## Flow Plan Types

| Plan | Per-User Cost | PPR/Day | Premium Connectors | RPA |
|------|-------------|---------|-------------------|-----|
| Power Automate Premium | $15/user/mo | 40,000 | Yes | Attended |
| Power Automate Process | Per-flow capacity | 250,000 (stackable) | Yes | Unattended |
| Power Automate Hosted Process | Per-flow | 250,000 | Yes | Hosted unattended |
| Seeded (O365/M365) | Included | ~10,000 (Low profile) | No | No |
| Pay-as-you-go | Per run | 10M (Extended) | Yes | Yes |

**PPR = Power Platform Requests.** Seeded plans only support standard connectors.

## Required Permissions

| Role | Scope | Capabilities |
|------|-------|-------------|
| Environment Maker | Environment | Create flows, manage own flows |
| Environment Admin | Environment | All flows visible, manage all resources |
| System Administrator | Dataverse | Full admin including schema |
| Flow co-owner | Per flow | Full edit/delete/share (except cannot remove creator) |
| Flow run-only user | Per flow | Trigger only — no flow logic visibility |

Security groups can be assigned as co-owners or run-only users for scale management.

## Error Handling

### Common Error Codes

| Code | HTTP Status | Cause |
|------|------------|-------|
| `ActionFailed` | Varies | Generic action failure — check inner error |
| `TooManyRequests` | 429 | Connector throttle limit exceeded |
| `RequestTimeout` | 408 | Action exceeded timeout |
| `Unauthorized` | 401 | Connection expired or revoked |
| `Forbidden` | 403 | DLP policy blocking connector or insufficient permissions |
| `NotFound` | 404 | Referenced resource (list, file, user) not found |
| `BadGateway` | 502 | Connector service temporarily unavailable |
| `ServiceUnavailable` | 503 | Platform or connector outage |

### Dataverse-Specific Error Codes

| Code | Description |
|------|-------------|
| `-2147015902` | Duplicate detection — record already exists |
| `-2147015903` | Object reference not set — missing required field |
| `-2147015898` | Privilege check failed — insufficient security role |

### DLP (Data Loss Prevention) Policy Errors

If a flow uses connectors from different DLP groups (Business vs Non-Business), the flow will be suspended with a DLP violation error. Resolve by:
1. Moving connectors to the same group in DLP policy
2. Splitting the flow into multiple flows (one per DLP group)
3. Requesting a DLP policy exception from the tenant admin

## OData Query Reference (Dataverse)

```
# List active cloud flows
/api/data/v9.2/workflows?$filter=category eq 5 and statecode eq 1
  &$select=name,statecode,workflowid,modifiedon
  &$orderby=modifiedon desc
  &$top=50

# List flows by owner
/api/data/v9.2/workflows?$filter=category eq 5 and _ownerid_value eq '{userId}'
  &$expand=ownerid($select=fullname)

# List failed flows (most recently modified)
/api/data/v9.2/workflows?$filter=category eq 5 and statuscode eq 2
  &$orderby=modifiedon desc
```

## Common Flow Patterns

### Pattern 1: Approval Flow Design

1. Design trigger: "When an item is created" in SharePoint list
2. Add "Start and wait for an approval" action (Approval type: Approve/Reject - First to respond)
3. Add condition branch on approval outcome
4. Approved: execute business logic (update record, send notification)
5. Rejected: notify requester with rejection reason
6. Add scope-based try/catch around the entire approval block
7. Configure retry policy: `none` for approval actions (avoid duplicate requests)

### Pattern 2: Failed Run Investigation

1. Identify failed run: `GET /powerautomate/environments/{envId}/flowRuns?workflowId={id}` — find runs with `status: Failed`
2. Check `error.code` and `error.message` for root cause
3. If `429 TooManyRequests`: check connector throttle table — add delays or reduce concurrency
4. If `401 Unauthorized`: check connection status — re-authenticate or recreate connection
5. If `DLP violation`: check DLP policies — resolve connector grouping conflicts
6. Resubmit after fix: use `ResubmitFlow` management connector action

### Pattern 3: Solution-Aware Deployment

1. Build flow in development environment inside a solution
2. Use connection references (not hardcoded connections)
3. Use environment variables for configuration values
4. Export solution as managed
5. Import to target environment — map connection references to target connections
6. Set environment variable values for target environment
7. Verify flow activates and test with manual trigger

### Pattern 4: Resilient Integration Flow

1. Design with scope-based try/catch/finally pattern
2. Configure retry policy: `exponential` for external API calls
3. Add concurrency control: limit parallel runs to avoid throttling
4. Add `compose` actions to capture intermediate state for debugging
5. Add error notification in catch scope (Teams message or email)
6. Add cleanup in finally scope (update status, release locks)
7. Test with simulated failures before deployment

## Decision Tree

1. Need to capture environment/connectors/SLA/failure expectations? → `setup`
2. Need architecture for a new/refactored flow (trigger, branches, retries, idempotency)? → `flow-design`
3. Need root-cause for failed/timed-out/intermittent runs? → `flow-debug`
4. Need go/no-go readiness before promoting flow across environments? → `flow-deploy-check`
5. End-to-end? Run: `setup` → `flow-design` → `flow-deploy-check`; use `flow-debug` for incidents.

## Minimal References

- `power-automate/commands/setup.md`
- `power-automate/commands/flow-design.md`
- `power-automate/commands/flow-debug.md`
- `power-automate/commands/flow-deploy-check.md`
- `power-automate/README.md`
