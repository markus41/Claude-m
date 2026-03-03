# Azure Boards — Work Items, WIQL, and Boards Reference

## Overview

Azure Boards provides Agile project management through work items, backlogs, sprint boards, and delivery plans. This reference covers the complete Work Item REST API, WIQL query language syntax, field references, area/iteration paths, work item relations, board configuration, and sprint planning endpoints.

---

## Work Item REST API

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/_apis/wit/workitems/{id}?api-version=7.1` | Work Items (Read) | `fields`, `asOf`, `$expand` | `$expand=all` includes relations and attachments |
| GET | `/_apis/wit/workitems?ids=1,2,3&api-version=7.1` | Work Items (Read) | `ids` (comma-sep, max 200), `fields` | Batch get up to 200 items |
| POST | `/_apis/wit/workitems/${type}?api-version=7.1` | Work Items (Read & Write) | Body: JSON Patch array; `type` = `$Task`, `$Bug`, etc. | Content-Type: `application/json-patch+json` |
| PATCH | `/_apis/wit/workitems/{id}?api-version=7.1` | Work Items (Read & Write) | Body: JSON Patch array; `suppressNotifications` | Same patch format as create |
| DELETE | `/_apis/wit/workitems/{id}?api-version=7.1` | Work Items (Read & Write) | `destroy` (permanent) | Default: moves to Recycle Bin |
| GET | `/_apis/wit/workitems/{id}/revisions?api-version=7.1` | Work Items (Read) | `$top`, `$skip`, `$expand` | Full revision history |
| GET | `/_apis/wit/workitems/{id}/updates?api-version=7.1` | Work Items (Read) | `$top`, `$skip` | Field-change deltas |
| POST | `/_apis/wit/wiql?api-version=7.1` | Work Items (Read) | Body: `{ query: "<WIQL>" }` | Returns IDs; fetch items separately |
| GET | `/_apis/wit/queries?api-version=7.1` | Work Items (Read) | `$depth`, `$expand`, `$top` | Browse saved queries |
| POST | `/_apis/wit/queries?api-version=7.1` | Work Items (Read & Write) | Body: `name`, `wiql`, `isPublic` | Create or save a query |
| GET | `/_apis/wit/fields?api-version=7.1` | Work Items (Read) | `$expand=extensionFields` | List all field definitions |
| GET | `/_apis/wit/workitemtypes?api-version=7.1` | Work Items (Read) | — | List all work item types |
| GET | `/_apis/wit/attachments/{attachmentId}?api-version=7.1` | Work Items (Read) | `download` | Download attachment |
| POST | `/_apis/wit/attachments?api-version=7.1` | Work Items (Read & Write) | Body: binary; `fileName` | Upload attachment; returns URL |
| GET | `/_apis/wit/classificationnodes?api-version=7.1` | Work Items (Read) | `$depth`, `ids` | List Area and Iteration paths |
| POST | `/_apis/wit/classificationnodes/{nodeType}?api-version=7.1` | Project Admin | Body: `name`, `attributes.startDate` | Create area/iteration node |

---

## Creating a Work Item

```typescript
import axios from "axios";

const ORG = "myorg";
const PROJECT = "myproject";
const PAT = process.env.ADO_PAT!;
const auth = Buffer.from(`:${PAT}`).toString("base64");

const BASE = `https://dev.azure.com/${ORG}/${PROJECT}/_apis/wit`;
const PATCH_HEADERS = {
  Authorization: `Basic ${auth}`,
  "Content-Type": "application/json-patch+json",
};

async function createWorkItem(type: "User Story" | "Task" | "Bug" | "Feature" | "Epic") {
  const ops = [
    { op: "add", path: "/fields/System.Title", value: "Implement OAuth 2.0 login" },
    { op: "add", path: "/fields/System.Description", value: "<p>User-facing login flow using PKCE.</p>" },
    { op: "add", path: "/fields/System.AssignedTo", value: "user@company.com" },
    { op: "add", path: "/fields/System.AreaPath", value: `${PROJECT}\\Frontend` },
    { op: "add", path: "/fields/System.IterationPath", value: `${PROJECT}\\Sprint 12` },
    { op: "add", path: "/fields/Microsoft.VSTS.Common.Priority", value: 2 },
    { op: "add", path: "/fields/Microsoft.VSTS.Scheduling.StoryPoints", value: 5 },
    { op: "add", path: "/fields/System.Tags", value: "auth; security" },
    // Link to parent Feature
    {
      op: "add",
      path: "/relations/-",
      value: {
        rel: "System.LinkTypes.Hierarchy-Reverse",
        url: `https://dev.azure.com/${ORG}/${PROJECT}/_apis/wit/workitems/100`,
        attributes: { comment: "Child of Feature #100" },
      },
    },
  ];

  const encodedType = encodeURIComponent(`$${type}`);
  const response = await axios.post(
    `${BASE}/workitems/${encodedType}?api-version=7.1`,
    ops,
    { headers: PATCH_HEADERS }
  );

  return response.data;
}
```

---

## Updating a Work Item

```typescript
async function updateWorkItem(id: number, updates: Record<string, unknown>) {
  const ops = Object.entries(updates).map(([field, value]) => ({
    op: "replace",
    path: `/fields/${field}`,
    value,
  }));

  const response = await axios.patch(
    `${BASE}/workitems/${id}?api-version=7.1&suppressNotifications=false`,
    ops,
    { headers: PATCH_HEADERS }
  );

  return response.data;
}

// Example: close a bug
await updateWorkItem(42, {
  "System.State": "Closed",
  "Microsoft.VSTS.Common.ResolvedReason": "Fixed",
  "System.History": "Fixed in commit abc123. Closing.",
});
```

---

## Common Field References

| Field Name | Reference | Type | Notes |
|------------|-----------|------|-------|
| ID | `System.Id` | int | Read-only |
| Title | `System.Title` | string | Required |
| Work Item Type | `System.WorkItemType` | string | Read-only after create |
| State | `System.State` | string | Valid values per WIT |
| Assigned To | `System.AssignedTo` | identity | Email or display name |
| Area Path | `System.AreaPath` | treePath | Uses `\\` separator |
| Iteration Path | `System.IterationPath` | treePath | Uses `\\` separator |
| Priority | `Microsoft.VSTS.Common.Priority` | int | 1–4 |
| Story Points | `Microsoft.VSTS.Scheduling.StoryPoints` | double | User Story / Feature |
| Remaining Work | `Microsoft.VSTS.Scheduling.RemainingWork` | double | Task; in hours |
| Original Estimate | `Microsoft.VSTS.Scheduling.OriginalEstimate` | double | Task; in hours |
| Tags | `System.Tags` | string | Semicolon-separated |
| Description | `System.Description` | HTML | Accepts `<p>`, `<ul>`, etc. |
| Repro Steps | `Microsoft.VSTS.TCM.ReproSteps` | HTML | Bug type |
| Acceptance Criteria | `Microsoft.VSTS.Common.AcceptanceCriteria` | HTML | User Story |
| Severity | `Microsoft.VSTS.Common.Severity` | string | Bug: 1-Critical to 4-Low |
| Found In Build | `Microsoft.VSTS.Build.FoundIn` | string | Bug |
| Integration Build | `Microsoft.VSTS.Build.IntegrationBuild` | string | Bug: fixed in |
| History / Comment | `System.History` | HTML | Adds a comment to the item |
| Created By | `System.CreatedBy` | identity | Read-only |
| Created Date | `System.CreatedDate` | dateTime | Read-only |
| Changed By | `System.ChangedBy` | identity | Read-only |
| Changed Date | `System.ChangedDate` | dateTime | Read-only |

---

## Relation Types

| Relation Reference Name | Display Name | Notes |
|------------------------|--------------|-------|
| `System.LinkTypes.Hierarchy-Forward` | Child | Parent → Child direction |
| `System.LinkTypes.Hierarchy-Reverse` | Parent | Child → Parent direction |
| `System.LinkTypes.Related` | Related | Bidirectional |
| `System.LinkTypes.Dependency-Forward` | Successor | Depends on |
| `System.LinkTypes.Dependency-Reverse` | Predecessor | Is depended upon by |
| `Microsoft.VSTS.TestCase.SharedParameterReferencedBy` | References shared parameter | Test-specific |
| `AttachedFile` | Attachment | File attachment |
| `Hyperlink` | Hyperlink | URL link |
| `ArtifactLink` | Build artifact | Link to pipeline artifact |

---

## WIQL (Work Item Query Language)

### Full Syntax Reference

```sql
-- Flat list query
SELECT
  [System.Id],
  [System.Title],
  [System.State],
  [System.AssignedTo],
  [System.AreaPath],
  [System.IterationPath],
  [Microsoft.VSTS.Common.Priority],
  [Microsoft.VSTS.Scheduling.StoryPoints]
FROM WorkItems
WHERE
  [System.TeamProject] = @project
  AND [System.WorkItemType] IN ('User Story', 'Bug')
  AND [System.State] NOT IN ('Closed', 'Resolved', 'Removed')
  AND [System.IterationPath] = @currentIteration('[MyProject]\My Team <id:team-guid>')
  AND [System.AssignedTo] = @me
ORDER BY [Microsoft.VSTS.Common.Priority] ASC,
         [System.CreatedDate] DESC

-- Tree query (returns parent-child hierarchy)
SELECT [System.Id], [System.Title], [System.WorkItemType]
FROM WorkItemLinks
WHERE (
  [Source].[System.TeamProject] = @project
  AND [Source].[System.WorkItemType] = 'Feature'
)
AND ([System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward')
AND (
  [Target].[System.WorkItemType] IN ('User Story', 'Bug')
  AND [Target].[System.State] <> 'Closed'
)
ORDER BY [System.Id]
MODE (Recursive)

-- DirectLinks query
SELECT [System.Id], [System.Title]
FROM WorkItemLinks
WHERE (
  [Source].[System.AssignedTo] = @me
)
AND ([System.Links.LinkType] = 'System.LinkTypes.Related')
MODE (MustContain)
```

### WIQL Macros

| Macro | Meaning |
|-------|---------|
| `@project` | Current project context |
| `@me` | Current authenticated user |
| `@today` | Current date (UTC) |
| `@today - 7` | 7 days ago |
| `@currentIteration` | Current sprint for the team |
| `@currentIteration + 1` | Next sprint |
| `@startOfYear` | January 1 of current year |
| `@startOfMonth` | First day of current month |
| `@startOfWeek` | Monday of current week |

### Execute WIQL Query

```typescript
async function runWiqlQuery(wiql: string) {
  const response = await axios.post(
    `${BASE}/wiql?api-version=7.1`,
    { query: wiql },
    { headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" } }
  );

  const result = response.data;
  const ids: number[] = result.workItems.map((wi: { id: number }) => wi.id);

  if (ids.length === 0) return [];

  // Fetch items in batches of 200
  const fields = [
    "System.Id", "System.Title", "System.State",
    "System.AssignedTo", "Microsoft.VSTS.Common.Priority"
  ];
  const batches: number[][] = [];
  for (let i = 0; i < ids.length; i += 200) {
    batches.push(ids.slice(i, i + 200));
  }

  const items = await Promise.all(
    batches.map(batch =>
      axios.get(
        `${BASE}/workitems?ids=${batch.join(",")}&fields=${fields.join(",")}&api-version=7.1`,
        { headers: { Authorization: `Basic ${auth}` } }
      ).then(r => r.data.value)
    )
  );

  return items.flat();
}
```

---

## Area and Iteration Paths

```typescript
// Create an iteration (sprint)
async function createIteration(
  name: string,
  startDate: string,
  finishDate: string,
  parentPath?: string
) {
  const parentSegment = parentPath
    ? `/${encodeURIComponent(parentPath)}`
    : "";

  const body = {
    name,
    attributes: {
      startDate,    // ISO 8601: "2026-03-01"
      finishDate,   // ISO 8601: "2026-03-14"
    },
  };

  const response = await axios.post(
    `${BASE}/classificationnodes/iterations${parentSegment}?api-version=7.1`,
    body,
    { headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" } }
  );

  return response.data;
}

// Assign team to an iteration
async function assignTeamToIteration(teamId: string, iterationId: string) {
  const response = await axios.post(
    `https://dev.azure.com/${ORG}/${PROJECT}/${teamId}/_apis/work/teamsettings/iterations?api-version=7.1`,
    { id: iterationId },
    { headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" } }
  );

  return response.data;
}
```

---

## Board Columns and Swimlanes

```typescript
// Get board columns for a team
async function getBoardColumns(teamId: string, boardId: string) {
  const response = await axios.get(
    `https://dev.azure.com/${ORG}/${PROJECT}/${teamId}/_apis/work/boards/${boardId}/columns?api-version=7.1`,
    { headers: { Authorization: `Basic ${auth}` } }
  );

  return response.data.value;
}

// Update column WIP limits
async function updateColumnWipLimits(
  teamId: string,
  boardId: string,
  columns: Array<{ id: string; itemLimit: number }>
) {
  const response = await axios.put(
    `https://dev.azure.com/${ORG}/${PROJECT}/${teamId}/_apis/work/boards/${boardId}/columns?api-version=7.1`,
    columns,
    { headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" } }
  );

  return response.data;
}
```

---

## Work Item Types and State Transitions

| Type | Default States | Notes |
|------|---------------|-------|
| Epic | New → Active → Resolved → Closed | Top-level feature grouping |
| Feature | New → Active → Resolved → Closed | Groups user stories |
| User Story | New → Active → Resolved → Closed | End-user facing capability |
| Task | New → Active → Closed | Concrete implementation unit |
| Bug | New → Active → Resolved → Closed | Defect tracking |
| Issue | New → Active → Closed | Impediment or risk |
| Test Case | Design → Ready → Closed | Testing artifact |

---

## Sprint Planning REST API

```typescript
// Get current team sprint (iteration)
async function getCurrentSprint(teamId: string) {
  const response = await axios.get(
    `https://dev.azure.com/${ORG}/${PROJECT}/${teamId}/_apis/work/teamsettings/iterations?$timeframe=current&api-version=7.1`,
    { headers: { Authorization: `Basic ${auth}` } }
  );

  return response.data.value[0];
}

// Get sprint backlog (items in sprint)
async function getSprintBacklog(teamId: string, iterationId: string) {
  const response = await axios.get(
    `https://dev.azure.com/${ORG}/${PROJECT}/${teamId}/_apis/work/teamsettings/iterations/${iterationId}/workitems?api-version=7.1`,
    { headers: { Authorization: `Basic ${auth}` } }
  );

  return response.data;
}
```

---

## Error Codes

| Code | Meaning | Remediation |
|------|---------|-------------|
| `TF201007` | Field value violates constraints (required or invalid value) | Check work item type rules for the field and state |
| `TF26027` | Invalid area path or iteration path | Verify path exists using classification nodes API |
| `TF30063` | Work item type not found in project | Use exact type name including spaces (e.g., "User Story") |
| `TF400813` | Unauthorized; missing scopes | Ensure PAT has Work Items (Read & Write) scope |
| `VS402881` | Work item already deleted | Use `destroy=true` only if permanent deletion is intended |
| `TF20012` | Relation already exists | Check existing relations before adding duplicates |
| `TF26194` | WIQL query too long | Reduce query length or break into multiple queries |
| `TF201022` | Area path not found | Create or verify the area path exists in project settings |

---

## Limits

| Resource | Limit | Notes |
|---|---|---|
| Work items per WIQL result | 20,000 IDs | API paginates; fetch items in batches of 200 |
| Batch fetch per request | 200 items | Use `ids` comma-separated list |
| Relations per work item | 1,000 | Practical limit; no hard API cap documented |
| Work item field length (string) | 1,048,576 chars | HTML fields like Description |
| Attachments per work item | 100 | Each attachment max 60 MB |
| Tags per work item | 100 | Semicolon-separated in a single field |
| WIQL query timeout | 30 seconds | Break large queries by area/iteration |
| Area/Iteration path depth | 14 levels | Deeply nested paths are discouraged |
| Concurrency conflicts | Detected via `rev` field | Fetch current `rev` before updating |

---

## Common Patterns and Gotchas

**1. JSON Patch content type is mandatory**
Work item create and update requires `Content-Type: application/json-patch+json`. Sending `application/json` returns a 415 error.

**2. WIQL returns IDs only — always batch-fetch items**
The WIQL endpoint returns `{ workItems: [{ id, url }] }`, not the fields. Always follow up with the batch items endpoint using up to 200 IDs per request.

**3. Area and Iteration paths use backslash as separator**
Path values use `\\` in JSON strings: `"MyProject\\Team A\\Frontend"`. In WIQL, use single backslash: `'MyProject\Team A\Frontend'`.

**4. State transitions are constrained by work item type rules**
You cannot set arbitrary states. The valid transitions depend on the work item type and any customizations. Query `/_apis/wit/workitemtypes/{type}/states` to get valid states and transitions.

**5. `suppressNotifications` does not suppress webhook events**
Setting `suppressNotifications=true` prevents email notifications but does not prevent service hook events (webhooks). Use with caution in automation that should not trigger downstream integrations.

**6. History (comments) are one-way — they cannot be deleted**
Work item history is append-only. The `System.History` field adds a new comment; you cannot edit or delete past comments via the API.

**7. `@currentIteration` requires a team context**
The `@currentIteration` macro only works in queries scoped to a team. Always pass the team context in the WIQL call or use date-based iteration path filters instead.

**8. Bulk updates require sequential `rev` values**
When updating multiple work items in a script, each PATCH returns the updated `rev`. If another process updates the item concurrently, your subsequent PATCH will fail with a conflict. Refetch before retrying.

**9. Custom fields have a prefix based on extension publisher**
Fields added by marketplace extensions use the format `<Publisher>.<Extension>.<FieldName>`. Query `/_apis/wit/fields` to discover the correct reference name.

**10. Delivery Plans require the Delivery Plans feature to be enabled**
The Delivery Plans REST API requires the feature enabled in Organization Settings. Attempting to call it without the feature returns a 404 with no useful error message.
