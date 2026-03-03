# Connectors and Triggers Reference

## Overview

Power Automate connectors provide pre-built integrations with hundreds of services. This reference covers the distinction between Standard and Premium connectors, key connector configurations for SharePoint, Outlook, Teams, and Dataverse, HTTP action usage, webhook registration, connection references in solutions, and throttling limits.

---

## Standard vs Premium Connectors

| Tier | License Required | Examples |
|---|---|---|
| Standard | Microsoft 365 / Seeded plan | SharePoint, Outlook, Teams, OneDrive, Excel, Forms, Planner, Lists |
| Premium | Power Automate Premium or Process license | Dataverse, SQL Server, Salesforce, SAP, ServiceNow, HTTP |
| Custom | Premium (any custom connector is Premium) | All custom connectors |
| On-Premises | Premium + On-Premises Data Gateway | SQL on-prem, File System, SAP on-prem |

---

## SharePoint Triggers and Actions

### Triggers
| Trigger | Description | Notes |
|---|---|---|
| When an item is created | Fires when a new list item is created | Polls every 30 seconds |
| When an item is created or modified | Fires on create or update | Cannot distinguish create vs update in trigger body |
| When a file is created | Fires when a new file is added to a library | Includes file metadata |
| When a file is created or modified | Fires on file add or update | |
| When an item is deleted | Fires when a list item is deleted | Only provides item ID |
| For a selected item | Manual trigger from SharePoint list context menu | Requires Instant flow |

### Key Action Endpoints
| Action | Path Pattern |
|---|---|
| Get items | `/datasets/{site}/tables/{list}/items` |
| Create item | `POST /datasets/{site}/tables/{list}/items` |
| Update item | `PATCH /datasets/{site}/tables/{list}/items/{id}` |
| Delete item | `DELETE /datasets/{site}/tables/{list}/items/{id}` |
| Get file content | `GET /datasets/{site}/GetFileContent` |
| Create file | `POST /datasets/{site}/files` |
| Send HTTP request to SharePoint | `POST /_api/{endpoint}` |

### SharePoint Filter Query (OData)
```
// In "Get items" action — Filter Query field
Status eq 'Pending' and Priority eq 1
startswith(Title, 'Report-')
AssignedTo/EMail eq 'user@contoso.com'
Modified ge '2026-01-01T00:00:00Z'
```

---

## Office 365 Outlook Triggers and Actions

### Triggers
| Trigger | Description |
|---|---|
| When a new email arrives | Fires when matching email received |
| When a new email arrives (V3) | Enhanced version with folder selection and filtering |
| When an event is added to calendar | Fires on new calendar event |
| When an event is modified | Fires when existing event changes |
| When a contact is modified | Fires when Outlook contact changes |
| When an email is flagged (V2) | Fires when email is flagged |

### Key Actions
| Action | Purpose |
|---|---|
| Send an email (V2) | Send email from user's mailbox |
| Reply to email (V3) | Reply to an email thread |
| Forward an email (V2) | Forward to additional recipients |
| Create event (V4) | Create calendar event |
| Get calendar view of events (V3) | List events in date range |
| Get room lists | List conference room groups |
| Move email (V2) | Move to folder |
| Mark as read or unread (V3) | Update read status |

### Send Email Body (with HTML)
```json
{
  "To": "recipient@contoso.com",
  "Subject": "Notification: @{triggerBody()?['Title']} requires attention",
  "Body": "<html><body><h2>Action Required</h2><p>Item: @{triggerBody()?['Title']}</p><p>Status: @{triggerBody()?['Status']}</p><a href='@{triggerBody()?['Link']}'>View Item</a></body></html>",
  "Importance": "High",
  "IsHtml": true
}
```

---

## Microsoft Teams Triggers and Actions

### Triggers
| Trigger | Description |
|---|---|
| When a new channel message is added | Fires on new message in a Teams channel |
| When a new chat message is added | Fires on message in a 1:1 or group chat |
| When a new team is created | Fires when a new Teams team is provisioned |
| When a channel is created | Fires on new channel |
| For a selected message | Manual trigger from Teams message context menu |

### Key Actions
| Action | Purpose |
|---|---|
| Post message in a chat or channel (V2) | Post adaptive card or text message |
| Post an adaptive card in a chat or channel | Rich card with actions |
| Post a choice of options as the bot | Prompt user with choices |
| Create a team | Provision a new Teams team |
| Add a member to a team | Add user to Teams team |
| Create a channel | Add a channel to a team |
| List teams | Enumerate teams the connection user is a member of |
| Get team | Get team details by team ID |
| Get message details | Retrieve a specific message |

### Adaptive Card with Approval Pattern
```json
{
  "type": "AdaptiveCard",
  "version": "1.5",
  "body": [
    {
      "type": "TextBlock",
      "text": "Approval Request",
      "weight": "Bolder",
      "size": "Large"
    },
    {
      "type": "FactSet",
      "facts": [
        { "title": "Submitted by", "value": "@{triggerBody()?['Requester']}" },
        { "title": "Request", "value": "@{triggerBody()?['Description']}" },
        { "title": "Amount", "value": "@{formatNumber(triggerBody()?['Amount'], 'C2', 'en-US')}" }
      ]
    },
    {
      "type": "Input.Text",
      "id": "comments",
      "placeholder": "Add comments (optional)",
      "isMultiline": true
    }
  ],
  "actions": [
    {
      "type": "Action.Submit",
      "title": "Approve",
      "style": "positive",
      "data": { "action": "approve" }
    },
    {
      "type": "Action.Submit",
      "title": "Reject",
      "style": "destructive",
      "data": { "action": "reject" }
    }
  ]
}
```

---

## Dataverse Triggers and Actions

### Triggers
| Trigger | Description |
|---|---|
| When a row is added | Fires on record create |
| When a row is modified | Fires on record update |
| When a row is deleted | Fires on record delete |
| When an action is performed | Fires when a Dataverse action is invoked |

### Key Actions
| Action | Purpose |
|---|---|
| Add a new row | Create a Dataverse record |
| Update a row | Update an existing record |
| Delete a row | Delete a record |
| Get a row by ID | Retrieve a single record |
| List rows | Query records with OData filter |
| Associate rows | Create relationship between records |
| Disassociate rows | Remove relationship |
| Perform a bound action | Call a Dataverse bound action |
| Perform an unbound action | Call a global Dataverse action |

### List Rows with OData Filter
```json
{
  "entityName": "incidents",
  "$filter": "statuscode eq 1 and prioritycode eq 2",
  "$orderby": "createdon desc",
  "$top": "100",
  "$select": "incidentid,title,createdon,customerid"
}
```

### Dataverse Trigger Filter
```json
// "When a row is modified" — filter expression
// Only fire when Status column changes
"filterExpression": "statuscode ne @previousRecord.statuscode"
```

---

## HTTP Action

The HTTP action calls any REST API without a dedicated connector. It is a Premium connector.

### HTTP Action Configuration
```json
{
  "HTTP_call": {
    "type": "Http",
    "inputs": {
      "method": "POST",
      "uri": "https://api.example.com/v1/orders",
      "headers": {
        "Content-Type": "application/json",
        "Authorization": "Bearer @{body('Get_auth_token')?['access_token']}",
        "X-Request-ID": "@{guid()}",
        "X-Correlation-ID": "@{workflow().run.name}"
      },
      "body": {
        "orderId": "@{triggerBody()?['orderId']}",
        "amount": "@{triggerBody()?['amount']}",
        "timestamp": "@{utcNow()}"
      },
      "retryPolicy": {
        "type": "exponential",
        "count": 3,
        "interval": "PT5S",
        "minimumInterval": "PT5S",
        "maximumInterval": "PT60S"
      },
      "authentication": {
        "type": "ManagedServiceIdentity",
        "audience": "https://management.azure.com/"
      }
    }
  }
}
```

### HTTP Authentication Options
| Type | Configuration |
|---|---|
| No auth | Omit `authentication` block |
| Basic | `{ "type": "Basic", "username": "user", "password": "pass" }` |
| API Key in header | Use `headers` to add the key |
| OAuth2 / Bearer | `{ "type": "Raw", "value": "Bearer @{token}" }` |
| Azure AD / MSI | `{ "type": "ManagedServiceIdentity", "audience": "..." }` |
| Azure AD (with cert) | `{ "type": "ActiveDirectoryOAuth", "tenant": "...", "audience": "...", "clientId": "...", "secret": "..." }` |

### Parse HTTP Response
After an HTTP action, parse the JSON response body:

```json
{
  "Parse_response": {
    "type": "ParseJson",
    "inputs": {
      "content": "@body('HTTP_call')",
      "schema": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "status": { "type": "string" },
          "items": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "sku": { "type": "string" },
                "quantity": { "type": "integer" }
              }
            }
          }
        }
      }
    }
  }
}
```

---

## Webhook Registration Pattern

For APIs that support webhooks but lack a dedicated Power Automate connector:

1. Create an **HTTP Request trigger** in the flow — this generates a unique callback URL.
2. Register the callback URL with the external API (in a setup flow or manually).
3. When the external event fires, the API POSTs to the callback URL, triggering the flow.
4. Handle the `DELETE` call from Power Platform when the flow is deleted — unregister the webhook.

```json
// Flow 1: Register webhook
{
  "triggers": {
    "Recurrence": { "type": "Recurrence", "recurrence": { "frequency": "Month", "interval": 1 } }
  },
  "actions": {
    "Register_webhook": {
      "type": "Http",
      "inputs": {
        "method": "POST",
        "uri": "https://api.example.com/webhooks",
        "body": {
          "url": "@{listCallbackUrl()}",
          "events": ["order.created", "order.updated"],
          "secret": "@{parameters('cr_WebhookSecret')}"
        }
      }
    }
  }
}
```

---

## Connection References in Solutions

Connection references must be used in solution-aware flows instead of direct connection objects.

### Connection Reference JSON in Solution
```json
{
  "connectionreferences": {
    "cr_sharepointonline": {
      "runtimeSource": "embedded",
      "connection": {},
      "api": {
        "name": "shared_sharepointonline"
      }
    },
    "cr_office365": {
      "runtimeSource": "embedded",
      "connection": {},
      "api": {
        "name": "shared_office365"
      }
    }
  }
}
```

### Map Connection References on Import
```bash
# Via PAC CLI during solution import
pac solution import \
  --path ./solution.zip \
  --connectionReferencesMappingFile ./connection-mapping.json

# connection-mapping.json
[
  {
    "LogicalName": "cr_sharepointonline",
    "ConnectionId": "/providers/Microsoft.PowerApps/apis/shared_sharepointonline/connections/{id}"
  },
  {
    "LogicalName": "cr_office365",
    "ConnectionId": "/providers/Microsoft.PowerApps/apis/shared_office365/connections/{id}"
  }
]
```

---

## Connector Throttling Reference

| Connector | API Calls Limit | Window | Per | Notes |
|---|---|---|---|---|
| SharePoint | 600 | 60 seconds | Connection | Includes all flow calls from that connection |
| Office 365 Outlook | 300 | 60 seconds | Connection | Sending limits enforced by Exchange separately |
| Microsoft Teams | 200 | 60 seconds | Connection | Teams Graph API limits also apply |
| Dataverse (Premium) | 6,000 | 5 minutes | User | 1,200 seconds execution time limit also applies |
| OneDrive for Business | 100 | 60 seconds | Connection | |
| Excel Online | 100 | 60 seconds | Connection | Not suitable for high-frequency flows |
| Power Automate Management | 5 GET / 300 non-GET | 60s / 3,600s | Connection | Admin operations |
| HTTP (Premium) | No published limit | — | — | Subject to platform burst cap |
| Custom connectors (default) | 500 | 60 seconds | Connection | Configurable per connector |
| Forms | 100 | 60 seconds | Connection | |
| Planner | 300 | 60 seconds | Connection | |

**Platform-level burst cap**: 100,000 actions per 5 minutes across all flows in an environment.

**Power Platform Requests (PPR)** per plan per day:
| Plan | PPR/Day |
|---|---|
| Power Automate Premium | 40,000 |
| Power Automate Process | 250,000 |
| M365 seeded | ~10,000 (Low profile) |

---

## Error Codes and Conditions

| Code / Condition | Meaning | Remediation |
|---|---|---|
| `429 TooManyRequests` from SharePoint | 600 calls/60s exceeded | Reduce `Apply to each` concurrency; add Delay actions; batch requests |
| `429 TooManyRequests` from Dataverse | 6,000 calls/5min exceeded | Reduce frequency; use bulk API operations; add exponential backoff |
| `403 Forbidden` from SharePoint | User/service principal lacks site permissions | Add connection user to SharePoint site with at least Edit permissions |
| `404 Not Found` from SharePoint | List or library doesn't exist | Verify list display name vs internal name; URL-encode site URL |
| `ConnectorThrottled` | Platform-level burst cap hit | Reduce flow frequency; defer non-critical flows to off-peak hours |
| `DLPPolicyViolation` | Flow uses connectors from conflicting DLP groups | Move connectors to same DLP group or split flow |
| Connection invalid | Connection expired or revoked | Re-authenticate the connection; recreate if needed |
| Webhook not firing | Webhook URL changed after flow re-save | Re-register webhook with new callback URL |
| Dataverse trigger firing repeatedly | Trigger has no filter expression; all column updates fire it | Add `filterExpression` to scope trigger to specific columns |

---

## Limits Table

| Resource | Limit | Notes |
|---|---|---|
| Connectors per flow | No hard limit | Practical: keep under 20 distinct connectors |
| Trigger polling interval minimum | 60 seconds | Even for "as soon as possible" settings |
| Webhook trigger concurrency | Configurable 1-50 | Default: 1 (sequential) |
| HTTP action per-call timeout | 120 seconds | Configurable up to 240s in action settings |
| Flow trigger recurrence minimum | 60 seconds | `Second` frequency still minimum 60s |
| Connection references per solution | 200 | Hard platform limit |
| SharePoint "Get items" max rows | 5,000 | Use pagination token for more |
| Dataverse "List rows" max | 5,000 | Use `$skiptoken` for pagination |
