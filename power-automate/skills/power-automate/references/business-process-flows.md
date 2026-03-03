# Power Automate — Business Process Flows (BPF)

## Overview
Business Process Flows provide guided, stage-based UI overlays on Dataverse model-driven apps.
They enforce data quality, route users through defined steps, and integrate with Power Automate
cloud flows for automation at stage transitions.

---

## REST API Endpoints

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|---|---|---|---|---|
| GET | `/api/data/v9.2/workflows?$filter=category eq 9` | System Customizer | `$select=name,workflowid,primaryentity` | List all BPFs |
| GET | `/api/data/v9.2/processstages?$filter=_processid_value eq {bpfId}` | System Customizer | `$select=stagename,stagecategory,rank` | List stages of a BPF |
| GET | `/api/data/v9.2/{entity}({recordId})?$expand=processsessions` | User RBAC | — | Get active BPF instance |
| POST | `/api/data/v9.2/processsessions` | Environment Maker | `processid`, `regardingobjectid` | Start BPF on record |
| PATCH | `/api/data/v9.2/processsessions({sessionId})` | User RBAC | `activestageid`, `statecode` | Advance or complete |
| GET | `/api/data/v9.2/processsessions?$filter=_regardingobjectid_value eq {id}` | User RBAC | — | Get BPF state for record |

---

## BPF Architecture

```
Entity Record (e.g., Lead)
  └── ProcessSession (process instance)
        ├── Stage 1: Qualify
        │     ├── Step: Enter budget estimate (required)
        │     └── Step: Identify decision maker (recommended)
        ├── Stage 2: Develop
        │     ├── Step: Identify stakeholders
        │     └── Step: Schedule meeting
        ├── Stage 3: Propose
        └── Stage 4: Close
```

**Key objects:**
- `workflow` (`category = 9`) — BPF definition
- `processsession` — instance of BPF running on a record
- `processstage` — stage definition (name, category, rank)
- `processstageparameter` — step (field) definition within a stage

---

## Stage Categories

| `stagecategory` Value | Meaning |
|---|---|
| `0` | Qualify |
| `1` | Develop |
| `2` | Propose |
| `3` | Close |
| `4` | Identify |
| `5` | Research |
| `6` | Resolve |
| `7` | Approve (custom) |

---

## PowerShell — BPF Management

```powershell
# List all BPFs in environment
$env = "https://yourorg.crm.dynamics.com"
$token = (Get-AzAccessToken -ResourceUrl $env).Token
$headers = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }

$bpfs = Invoke-RestMethod "$env/api/data/v9.2/workflows?`$filter=category eq 9&`$select=name,workflowid,primaryentity,statecode" -Headers $headers
$bpfs.value | Format-Table name, primaryentity, statecode

# Get stages for a BPF
$bpfId = "00000000-0000-0000-0000-000000000001"
$stages = Invoke-RestMethod "$env/api/data/v9.2/processstages?`$filter=_processid_value eq $bpfId&`$select=stagename,rank&`$orderby=rank asc" -Headers $headers
$stages.value | Format-Table stagename, rank

# Advance BPF to next stage
$sessionId = "00000000-0000-0000-0000-000000000002"
$nextStageId = "00000000-0000-0000-0000-000000000003"
$body = @{ activestageid = "/processstages($nextStageId)" } | ConvertTo-Json
Invoke-RestMethod "$env/api/data/v9.2/processsessions($sessionId)" -Method Patch -Headers $headers -Body $body
```

---

## TypeScript — BPF Operations

```typescript
import { Client } from "@microsoft/microsoft-graph-client";
import { DefaultAzureCredential } from "@azure/identity";
import axios from "axios";

const orgUrl = process.env.DATAVERSE_URL!; // https://yourorg.crm.dynamics.com

async function getAccessToken(): Promise<string> {
  const cred = new DefaultAzureCredential();
  const token = await cred.getToken(`${orgUrl}/.default`);
  return token!.token;
}

// Get BPF stage for a record
async function getBpfState(entity: string, recordId: string) {
  const token = await getAccessToken();
  const res = await axios.get(
    `${orgUrl}/api/data/v9.2/${entity}(${recordId})?$expand=processsessions($select=activestageid,statecode)`,
    { headers: { Authorization: `Bearer ${token}`, "OData-MaxVersion": "4.0" } }
  );
  return res.data.processsessions;
}

// Advance BPF to specified stage
async function advanceBpfStage(sessionId: string, nextStageId: string) {
  const token = await getAccessToken();
  await axios.patch(
    `${orgUrl}/api/data/v9.2/processsessions(${sessionId})`,
    { "activestageid@odata.bind": `/processstages(${nextStageId})` },
    { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "OData-MaxVersion": "4.0" } }
  );
}

// Trigger cloud flow on BPF stage change (webhook pattern)
// In the BPF, add a "Run a flow" step that calls an HTTP trigger flow
// The flow receives: stageName, recordId, previousStageId, nextStageId
```

---

## Triggering Cloud Flows from BPF Transitions

### Method 1: Dataverse trigger in cloud flow
```json
{
  "trigger": {
    "type": "OpenApiConnection",
    "inputs": {
      "parameters": {
        "entityName": "processsessions",
        "subscriptionRequest": {
          "message": 2,
          "entityname": "processsession",
          "filteringattributes": "activestageid"
        }
      }
    }
  }
}
```

### Method 2: Client-side JavaScript (model-driven app form)
```javascript
// Form OnSave or stage navigation event
function onBpfStageChange(executionContext) {
  const formContext = executionContext.getFormContext();
  const activeStage = formContext.data.process.getActiveStage();
  const stageName = activeStage.getName();

  if (stageName === "Propose") {
    // Call HTTP trigger flow
    const flowUrl = Xrm.Utility.getGlobalContext().getClientUrl();
    // POST to HTTP trigger with record context
  }
}
```

---

## BPF with Branching

Branching lets the BPF route to different stages based on data:

```
Lead BPF:
  Stage 1: Qualify
    → if Budget > $50,000: Stage 2a (Enterprise Track)
    → if Budget <= $50,000: Stage 2b (SMB Track)
  Stage 2a: Enterprise → Stage 3: Propose
  Stage 2b: SMB → Stage 3: Propose
  Stage 3: Propose → Stage 4: Close
```

**Set up in Power Automate:** Use the `Set active stage` action in a cloud flow triggered by
`Dataverse — When a row is added/modified/deleted` on the `processsession` table.

---

## Step (Field) Requirements

| Requirement Level | Behavior |
|---|---|
| Required | User cannot advance stage until field has value |
| Recommended | Warning shown, but stage advance is allowed |
| Optional | No validation applied |

**API:** Steps are stored as `processstageparameter` records with `requiredlevel`:
- `0` = None / Optional
- `1` = Recommended
- `2` = Required

---

## Error Codes

| Code | Meaning | Remediation |
|---|---|---|
| `0x80040216` | BPF already active on record | Check existing process session before starting |
| `0x80048d19` | Stage not found in BPF | Verify `processstage` GUID belongs to this BPF |
| `0x80045043` | Required step not completed | Populate required field before advancing |
| `ObjectDoesNotExist` | `processsession` not found | BPF not started on this record — call POST first |
| `403 Forbidden` | Insufficient RBAC | Assign `prvReadProcessSession` + `prvWriteProcessSession` |

---

## Limits

| Resource | Limit | Notes |
|---|---|---|
| Stages per BPF | 30 | Includes branching stages |
| Steps per stage | 30 | Fields displayed as steps |
| BPFs per entity | 10 | Multiple BPFs can run concurrently |
| BPF instances per record | Multiple | One per BPF definition |
| Supported entity types | Dataverse tables | Not supported on virtual/elastic tables |

---

## Production Gotchas

- **BPFs run in user context** — the user advancing the stage must have read/write on `processsession`.
  Service accounts used in flows need these privileges explicitly granted.
- **Branching stages are always visible** in the UI even for the branch not taken —
  they just appear disabled. Design stage names carefully to avoid confusion.
- **Concurrent cloud flow triggers** on `processsession` changes can fire multiple times
  during a single BPF advance if multiple fields change — add idempotency checks in the flow.
- **Solution export order matters** — BPF definition must be exported in the same solution
  as the entity it runs on, or you'll get missing dependency errors on import.
- **`statecode`** on `processsession`: `0` = Active, `1` = Inactive (completed/abandoned).
  Filtering to active: `$filter=statecode eq 0`.
- **Real-time workflows (v1)** can still run on BPF stage changes as an alternative to cloud
  flows, but they run synchronously and block the UI — use cloud flows (async) instead.
