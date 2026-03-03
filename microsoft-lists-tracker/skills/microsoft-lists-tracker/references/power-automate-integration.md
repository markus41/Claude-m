# Lists Power Automate Integration — Reference

## Overview

This reference covers Microsoft Lists integration with Power Automate — the "When item is
created/modified" trigger, create/update/get item actions, SharePoint vs Graph connector
differences, approval flows with Lists, and Teams Adaptive Card notifications from Lists.

---

## Power Automate Connector Overview

### SharePoint Connector (Recommended for Lists)

The **SharePoint connector** is the primary connector for Microsoft Lists in Power Automate.
It provides native triggers and actions optimized for list operations.

| Trigger / Action | Name | Notes |
|-----------------|------|-------|
| Trigger | When an item is created | Fires when a new item is added |
| Trigger | When an item is created or modified | Fires on create OR any field update |
| Action | Create item | Adds a new item to a list |
| Action | Update item | Updates fields on an existing item |
| Action | Get item | Retrieves a single item by ID |
| Action | Get items | Retrieves multiple items with filter |
| Action | Delete item | Removes an item |
| Action | Get attachments | Lists item attachments |

### Microsoft Graph HTTP Action (Alternative)

Use the HTTP with Azure AD connector to call Graph API endpoints directly when the SharePoint
connector's actions lack a feature you need (e.g., batch operations, content types).

---

## Code Snippets (Power Automate Flow Patterns)

### Flow JSON — When Item Is Created: Send Teams Notification

```json
{
  "definition": {
    "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
    "contentVersion": "1.0.0.0",
    "triggers": {
      "When_an_item_is_created": {
        "type": "ApiConnection",
        "inputs": {
          "host": { "connection": { "name": "@parameters('$connections')['sharepointonline']['connectionId']" } },
          "method": "get",
          "path": "/datasets/@{encodeURIComponent('https://contoso.sharepoint.com/sites/Operations')}/tables/@{encodeURIComponent('Issue Tracker')}/onnewitems"
        },
        "recurrence": { "frequency": "Minute", "interval": 1 }
      }
    },
    "actions": {
      "Post_adaptive_card_to_Teams": {
        "type": "ApiConnection",
        "inputs": {
          "host": { "connection": { "name": "@parameters('$connections')['teams']['connectionId']" } },
          "method": "post",
          "path": "/v1.0/teams/{teamId}/channels/{channelId}/messages",
          "body": {
            "contentType": "html",
            "content": "<attachment id=\"1\"></attachment>",
            "attachments": [
              {
                "id": "1",
                "contentType": "application/vnd.microsoft.card.adaptive",
                "content": "@{json(variables('adaptiveCardJson'))}"
              }
            ]
          }
        },
        "runAfter": { "Initialize_adaptive_card": ["Succeeded"] }
      }
    }
  }
}
```

### Adaptive Card JSON for New Issue Notification

```json
{
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "type": "AdaptiveCard",
  "version": "1.3",
  "body": [
    {
      "type": "TextBlock",
      "text": "New Issue Created",
      "weight": "Bolder",
      "size": "Medium",
      "color": "Attention"
    },
    {
      "type": "FactSet",
      "facts": [
        { "title": "Title:", "value": "@{triggerBody()?['Title']}" },
        { "title": "Priority:", "value": "@{triggerBody()?['Priority']}" },
        { "title": "Status:", "value": "@{triggerBody()?['Status']}" },
        { "title": "Due Date:", "value": "@{triggerBody()?['DueDate']}" }
      ]
    }
  ],
  "actions": [
    {
      "type": "Action.OpenUrl",
      "title": "View Issue",
      "url": "@{triggerBody()?['{Link}']}"
    }
  ]
}
```

### TypeScript — Trigger Power Automate Flow from Graph (HTTP Request Trigger)

```typescript
import { Client } from "@microsoft/microsoft-graph-client";

// Power Automate flow with HTTP Request trigger
// This calls a flow that processes new list items from an external system

async function triggerFlowForNewItem(
  flowTriggerUrl: string, // From the "When a HTTP request is received" trigger
  itemData: {
    title: string;
    priority: string;
    assigneeEmail: string;
    description: string;
  }
): Promise<void> {
  const response = await fetch(flowTriggerUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(itemData),
  });

  if (!response.ok && response.status !== 202) {
    throw new Error(`Flow trigger failed: ${response.status}`);
  }

  console.log("Flow triggered successfully");
}
```

### TypeScript — Create Item and Trigger Flow via Graph API

```typescript
import { Client } from "@microsoft/microsoft-graph-client";

async function createItemAndNotify(
  client: Client,
  siteId: string,
  listId: string,
  fields: Record<string, unknown>,
  flowTriggerUrl?: string
): Promise<string> {
  // Create item via Graph
  const item = await client
    .api(`/sites/${siteId}/lists/${listId}/items`)
    .post({ fields });

  console.log(`Item created: ${item.id}`);

  // Optionally trigger a Power Automate flow for additional processing
  if (flowTriggerUrl) {
    await triggerFlowForNewItem(flowTriggerUrl, {
      title: String(fields.Title ?? ""),
      priority: String(fields.Priority ?? "Normal"),
      assigneeEmail: String(fields.AssigneeEmail ?? ""),
      description: String(fields.Description ?? ""),
    });
  }

  return item.id;
}
```

### TypeScript — Approval Flow: Create Approval Item in Lists

```typescript
interface ApprovalRequest {
  title: string;
  requestDetails: string;
  requestedBy: string;
  requestedByEmail: string;
  requestAmount?: number;
}

async function createApprovalRequest(
  client: Client,
  siteId: string,
  approvalListId: string,
  request: ApprovalRequest
): Promise<string> {
  const item = await client
    .api(`/sites/${siteId}/lists/${approvalListId}/items`)
    .post({
      fields: {
        Title: request.title,
        RequestDetails: request.requestDetails,
        RequestedBy: request.requestedBy,
        RequestedByEmail: request.requestedByEmail,
        ApprovalStatus: "Pending",
        RequestDate: new Date().toISOString().split("T")[0],
        ...(request.requestAmount !== undefined && { RequestAmount: request.requestAmount }),
      },
    });

  console.log(`Approval request created: ${item.id}`);
  // Power Automate picks this up via "When an item is created" trigger
  // and routes to approvers automatically
  return item.id;
}

async function updateApprovalStatus(
  client: Client,
  siteId: string,
  approvalListId: string,
  itemId: string,
  status: "Approved" | "Rejected",
  approverComments: string
): Promise<void> {
  await client
    .api(`/sites/${siteId}/lists/${approvalListId}/items/${itemId}/fields`)
    .patch({
      ApprovalStatus: status,
      ApproverComments: approverComments,
      ApprovalDate: new Date().toISOString().split("T")[0],
    });

  console.log(`Approval ${status} for item ${itemId}`);
}
```

### PowerShell — Power Automate + Lists Integration via Graph

```powershell
Connect-MgGraph -Scopes "Sites.ReadWrite.All"

$siteId = "YOUR_SITE_ID"
$listId = "YOUR_LIST_ID"

# Create an item that triggers a Power Automate flow
$itemBody = @{
    fields = @{
        Title = "Expense Approval - Team Offsite"
        RequestedBy = "Jordan Lee"
        RequestedByEmail = "jordan@contoso.com"
        RequestAmount = 2500
        RequestDetails = "Team offsite at Redmond campus, Q2 planning"
        ApprovalStatus = "Pending"
        RequestDate = (Get-Date -Format "yyyy-MM-dd")
    }
} | ConvertTo-Json -Depth 5

$item = Invoke-MgGraphRequest -Method POST `
    -Uri "https://graph.microsoft.com/v1.0/sites/$siteId/lists/$listId/items" `
    -Body $itemBody -ContentType "application/json"

Write-Host "Approval request created: $($item.id)"

# Poll for approval status
$maxAttempts = 10
$attempt = 0
do {
    Start-Sleep -Seconds 30
    $attempt++
    $updatedItem = Invoke-MgGraphRequest -Method GET `
        -Uri "https://graph.microsoft.com/v1.0/sites/$siteId/lists/$listId/items/$($item.id)?`$expand=fields(`$select=ApprovalStatus,ApproverComments)"

    $status = $updatedItem.fields.ApprovalStatus
    Write-Host "Attempt $attempt - Status: $status"
} while ($status -eq "Pending" -and $attempt -lt $maxAttempts)

Write-Host "Final status: $($updatedItem.fields.ApprovalStatus)"
Write-Host "Comments: $($updatedItem.fields.ApproverComments)"
```

---

## Power Automate Flow Patterns

### Pattern 1: Item Created → Teams Notification

1. Trigger: "When an item is created" (SharePoint connector)
2. Action: Initialize variable (build adaptive card JSON with `@{triggerBody()?['Title']}` etc.)
3. Action: Post adaptive card to Teams channel

### Pattern 2: Item Modified → Route by Status Change

1. Trigger: "When an item is created or modified"
2. Condition: If `Status` eq `"Resolved"` → Notify customer via email
3. Condition: If `Status` eq `"Escalated"` → Create task in Planner + notify manager

### Pattern 3: Approval Flow with Lists

1. Trigger: "When an item is created" (on Approval Requests list)
2. Action: Start and wait for an approval (Approvals connector)
3. Condition: If approved → Update item's `ApprovalStatus` to "Approved" + send notification
4. Else → Update to "Rejected" + send notification with reason

### Pattern 4: Scheduled Digest (Timer Trigger)

1. Trigger: Recurrence (daily at 8:00 AM)
2. Action: Get items (filter `Status eq 'Open' and DueDate le @{utcNow()}`)
3. Action: Create HTML table from items array
4. Action: Send email with digest to team DL

### Pattern 5: Sync Lists to External System (HTTP Trigger)

1. Trigger: When an item is created or modified
2. Action: HTTP POST to external API with item fields as JSON body
3. Action: Update list item with external system's returned ID (for sync tracking)

---

## Error Codes and Troubleshooting

| Error | Meaning | Resolution |
|-------|---------|------------|
| 400 Bad Request (SharePoint connector) | Malformed item fields or missing required | Check field internal names match list schema |
| 403 Forbidden | Connection lacks permissions | Re-authorize SharePoint connection; check site permissions |
| 404 Not Found | List or site URL incorrect | Verify site URL and list name in connector settings |
| `InvalidTemplate` | Power Automate expression syntax error | Check `@{...}` expression syntax; test with compose action |
| Throttling (429) | Too many requests to SharePoint | Flow retries automatically; consider reducing trigger frequency |
| `WorkflowOperationFailed` | Generic flow action failure | Check action inputs; test manually with known-good values |
| Adaptive Card schema error | Invalid card JSON | Validate at adaptivecards.io/designer |

---

## SharePoint Connector vs Graph HTTP Connector

| Feature | SharePoint Connector | Graph HTTP Action |
|---------|---------------------|-------------------|
| Ease of use | High — visual field mapping | Low — manual JSON construction |
| Authentication | Managed by Power Automate | Requires Azure AD app registration |
| Triggers available | Yes (item created/modified) | No (polling only) |
| Batch operations | No | Yes (via `/$batch`) |
| Content type support | Partial | Full |
| Advanced column types | Person columns as objects | Raw LookupId values |
| Recommended for | Standard list automation | Complex bulk operations |

---

## Throttling Limits

| Resource | Limit | Strategy |
|----------|-------|----------|
| SharePoint connector calls | ~600 per minute (per connection) | Use batching in flows; reduce trigger frequency |
| Power Automate runs | Depends on license (P1: 2,000/day; P2: 5,000/day) | Use premium triggers wisely |
| Approval connector | Concurrent approvals: varies by license | Chain approvals sequentially if needed |
| Teams notifications | ~300 per day per user/channel | Batch notifications; use digest patterns |

---

## Common Patterns and Gotchas

### 1. "When an item is created or modified" Triggers on Every Field Change

This trigger fires for ANY field update, including system fields. Use conditions at the start
of the flow to check which field changed, or use the "Filter array" action to process only
relevant changes.

### 2. Person Columns Return Objects, Not Just Emails

Person column values in the SharePoint connector trigger body are objects like:
`{ "Claims": "i:0#.f|membership|user@contoso.com", "Email": "user@contoso.com", "DisplayName": "User Name" }`.
Extract the email with `@{triggerBody()?['AssignedTo']['Email']}`.

### 3. Multi-Select Choice Fields Return Arrays

Multi-value choice fields come back as arrays. Use the `join()` function to convert them to
strings: `@{join(triggerBody()?['Tags'], ', ')}`.

### 4. Approval Item Lookup ID Must Be Numeric

When referencing the list item ID in subsequent actions (for example, to update the item after
approval), ensure you use the numeric `ID` field (not the list GUID or etag). The trigger body
includes `ID` as an integer.

### 5. `$filter` on Get Items Action Uses OData Syntax

In the "Get items" action, the filter field uses OData syntax with the SharePoint field name
but slightly different syntax than Graph: `Status eq 'Open'` (no `fields/` prefix needed in
the SharePoint connector's filter field).

### 6. Teams Adaptive Cards for Approval Require the Teams App Permission

Posting adaptive cards with action buttons to Teams requires the Power Automate app to have
permission to post messages in the target channel. Ensure the service account running the flow
is a member of the target team.
