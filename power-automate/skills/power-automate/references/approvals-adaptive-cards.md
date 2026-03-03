# Power Automate — Approvals & Adaptive Cards

## Overview
The Power Automate Approvals connector provides Teams-integrated, email-based, and mobile
approval workflows. Approvals support single/multi-approver patterns, parallel and sequential
routing, delegation, reassignment, and custom Adaptive Card rendering in Teams. The Approvals
app in Teams surfaces all pending approvals in one place.

---

## Approvals Connector Actions

| Action | Purpose | Notes |
|---|---|---|
| `Start and wait for an approval` | Create approval + block flow until responded | Synchronous — flow resumes on completion |
| `Create an approval` | Create approval without waiting | Async — poll status separately |
| `Wait for an approval` | Resume wait on existing approval | Use with `Create an approval` |
| `Get approval` | Retrieve approval details by ID | Check status programmatically |
| `Cancel an approval` | Withdraw pending approval | Only works on `Pending` approvals |
| `Respond to an approval` | Approve/reject programmatically | Service principal can auto-respond |

---

## Approval Types

| Type | Behavior |
|---|---|
| `Approve/Reject - First to respond` | First approver response determines outcome |
| `Approve/Reject - Everyone must approve` | ALL approvers must approve; any rejection rejects |
| `Custom Responses - Wait for all responses` | Custom options; collect all responses |
| `Custom Responses - First to respond` | Custom options; first response wins |

---

## Basic Approval Flow (JSON)

```json
{
  "Start_approval": {
    "type": "OpenApiConnection",
    "inputs": {
      "host": {
        "connection": { "name": "@parameters('$connections')['approvals']['connectionId']" }
      },
      "method": "post",
      "path": "/approvalRequests/synchronous",
      "body": {
        "title": "Purchase Request: @{triggerBody()?['Title']}",
        "assignedTo": "manager@contoso.com;approver2@contoso.com",
        "details": "Amount: @{triggerBody()?['Amount']}\nRequested by: @{triggerBody()?['RequestedBy']}\nBusiness justification: @{triggerBody()?['Justification']}",
        "itemLink": "https://contoso.sharepoint.com/sites/Finance/Lists/PurchaseRequests/DispForm.aspx?ID=@{triggerBody()?['ID']}",
        "itemLinkDescription": "View request",
        "notificationRecipients": "@{triggerBody()?['RequestedBy']}",
        "approvalType": "Basic",
        "enableNotifications": true,
        "enableReassignment": true
      }
    }
  },
  "Check_outcome": {
    "type": "If",
    "expression": "@equals(body('Start_approval')?['outcome'], 'Approve')",
    "actions": { "Approved_branch": {} },
    "else": { "actions": { "Rejected_branch": {} } }
  }
}
```

**Response object:**
```json
{
  "id": "approval-guid",
  "outcome": "Approve",
  "responses": [
    {
      "approver": { "email": "manager@contoso.com", "displayName": "Jane Smith" },
      "requestDate": "2026-03-01T09:00:00Z",
      "responseDate": "2026-03-01T09:45:00Z",
      "approverResponse": "Approve",
      "comments": "Approved — within budget"
    }
  ]
}
```

---

## Parallel Approval Pattern (All Must Approve)

```json
{
  "Start_parallel_approval": {
    "type": "OpenApiConnection",
    "inputs": {
      "body": {
        "title": "Contract Review Required",
        "assignedTo": "legal@contoso.com;finance@contoso.com;ciso@contoso.com",
        "approvalType": "Basic",
        "details": "Contract with @{triggerBody()?['Vendor']} requires multi-department review.",
        "requestType": "AllApprove"
      }
    }
  }
}
```

---

## Sequential Multi-Stage Approval

```
Stage 1: Manager approval
  → If approved: Stage 2: Finance approval
    → If approved: Stage 3: Legal review
      → If approved: Process request
  → If rejected at any stage: Notify requester
```

```json
{
  "Manager_approval": {
    "type": "OpenApiConnection",
    "inputs": {
      "body": {
        "title": "Expense Approval — Stage 1 of 3",
        "assignedTo": "@{triggerBody()?['ManagerEmail']}",
        "details": "Amount: $@{triggerBody()?['Amount']}"
      }
    }
  },
  "Check_manager": {
    "type": "If",
    "expression": "@equals(body('Manager_approval')?['outcome'], 'Approve')",
    "actions": {
      "Finance_approval": {
        "type": "OpenApiConnection",
        "inputs": {
          "body": {
            "title": "Expense Approval — Stage 2 of 3",
            "assignedTo": "finance-team@contoso.com",
            "details": "Manager approved. Amount: $@{triggerBody()?['Amount']}"
          }
        }
      }
    }
  }
}
```

---

## Custom Responses

```json
{
  "body": {
    "title": "Risk Assessment: @{triggerBody()?['ProjectName']}",
    "assignedTo": "risk-committee@contoso.com",
    "approvalType": "CustomResponses",
    "allowCustomResponse": false,
    "customResponseOptions": ["Low Risk — Approve", "Medium Risk — Conditional", "High Risk — Reject"]
  }
}
```

**Access custom response:** `@{body('Start_approval')?['responses'][0]?['approverResponse']}`

---

## Teams Adaptive Card Approval

Send a custom Adaptive Card in Teams with approve/reject buttons:

```json
{
  "Post_approval_card": {
    "type": "OpenApiConnection",
    "inputs": {
      "host": { "connection": { "name": "@parameters('$connections')['teams']['connectionId']" } },
      "method": "post",
      "path": "/v1.0/chats/@{body('Create_chat')?['id']}/messages",
      "body": {
        "body": {
          "contentType": "html",
          "content": "<attachment id=\"approval-card\"></attachment>"
        },
        "attachments": [{
          "id": "approval-card",
          "contentType": "application/vnd.microsoft.card.adaptive",
          "content": {
            "type": "AdaptiveCard",
            "version": "1.5",
            "body": [
              { "type": "TextBlock", "size": "Large", "weight": "Bolder", "text": "Purchase Request" },
              { "type": "FactSet", "facts": [
                { "title": "Item", "value": "@{triggerBody()?['Title']}" },
                { "title": "Amount", "value": "$@{triggerBody()?['Amount']}" },
                { "title": "Requested by", "value": "@{triggerBody()?['RequestedBy']}" }
              ]},
              { "type": "Input.Text", "id": "comments", "placeholder": "Add comments (optional)", "isMultiline": true }
            ],
            "actions": [
              { "type": "Action.Execute", "title": "Approve", "verb": "approve", "style": "positive",
                "data": { "approvalId": "@{body('Create_approval')?['id']}", "response": "Approve" }},
              { "type": "Action.Execute", "title": "Reject", "verb": "reject", "style": "destructive",
                "data": { "approvalId": "@{body('Create_approval')?['id']}", "response": "Reject" }}
            ]
          }
        }]
      }
    }
  }
}
```

**Handle card response** using a separate `When a Teams bot action is invoked` flow trigger.

---

## Approval with Timeout Handling

```json
{
  "Start_approval": {
    "type": "OpenApiConnection",
    "inputs": {
      "body": {
        "title": "Time-Sensitive Approval",
        "assignedTo": "approver@contoso.com",
        "details": "This request expires in 24 hours."
      }
    },
    "limit": { "timeout": "PT24H" }
  },
  "Check_timed_out": {
    "type": "If",
    "expression": "@equals(actions('Start_approval').status, 'TimedOut')",
    "actions": {
      "Escalate_to_manager": {
        "type": "OpenApiConnection",
        "inputs": {
          "body": {
            "title": "ESCALATED: Approval overdue",
            "assignedTo": "skip-level@contoso.com",
            "details": "Original approver did not respond within 24 hours."
          }
        }
      }
    },
    "else": {
      "actions": { "Process_response": {} }
    }
  }
}
```

**`limit.timeout`** uses ISO 8601 duration: `PT1H` = 1 hour, `P1D` = 1 day, `PT30M` = 30 min.

---

## Delegation and Reassignment

Approvers can reassign approvals from:
- **Power Automate Approvals app** (Teams or web)
- **Approval email** (if enabled via `enableReassignment: true`)
- **Mobile app** (Power Automate mobile)

**Flow to handle reassignment event:**
```json
{
  "trigger": {
    "type": "OpenApiConnectionWebhook",
    "inputs": {
      "path": "/triggers/approvalEvent",
      "queries": { "eventType": "ApprovalReassigned" }
    }
  }
}
```

---

## PowerShell — Monitor Pending Approvals

```powershell
$env = "https://yourorg.crm.dynamics.com"
$token = (Get-AzAccessToken -ResourceUrl $env).Token
$headers = @{ Authorization = "Bearer $token" }

# Get all pending approvals
$pending = Invoke-RestMethod "$env/api/data/v9.2/approvals?`$filter=statecode eq 0&`$select=title,createdon,_ownerid_value&`$orderby=createdon asc" -Headers $headers

Write-Host "Pending approvals: $($pending.value.Count)"
$pending.value | ForEach-Object {
  $age = [datetime]::UtcNow - [datetime]$_.createdon
  Write-Host "  '$($_.title)' — pending $($age.TotalHours.ToString('F1')) hours"
}

# Cancel overdue approvals (older than 48 hours)
$cutoff = [datetime]::UtcNow.AddHours(-48).ToString("o")
$overdue = Invoke-RestMethod "$env/api/data/v9.2/approvals?`$filter=statecode eq 0 and createdon lt $cutoff" -Headers $headers
$overdue.value | ForEach-Object {
  $body = @{ statecode = 2 } | ConvertTo-Json  # 2 = Cancelled
  Invoke-RestMethod "$env/api/data/v9.2/approvals($($_.approvalid))" -Method Patch -Headers $headers -Body $body -ContentType "application/json"
  Write-Host "Cancelled: $($_.title)"
}
```

---

## Error Codes

| Error | Cause | Remediation |
|---|---|---|
| `ApprovalAlreadyCompleted` | Responding to completed approval | Check `outcome` before responding |
| `ApprovalNotFound` | Invalid approval ID | Verify approval was created; check environment |
| `AssigneeNotFound` | Invalid email in `assignedTo` | Verify user exists in Azure AD |
| `ApprovalLimitExceeded` | Too many concurrent approvals | Stagger creation; max 100 pending per user |
| `ConnectionExpired` | Approvals connection credentials expired | Re-create Approvals connector connection |
| `TimedOut` | Approval not responded to within timeout | Escalate or cancel and recreate |
| `TeamsCardDeliveryFailed` | User not in Teams or card rendering error | Verify Teams membership; validate card JSON |

---

## Limits

| Resource | Limit | Notes |
|---|---|---|
| Approvers per approval | 200 | Per single approval request |
| Pending approvals per user | 1,000 | In Approvals app |
| Approval title length | 500 characters | |
| Approval details length | 2,000 characters | Plain text |
| Timeout maximum | 28 days | ISO 8601 duration |
| Custom response options | 10 | Per approval |
| Attachments | Not natively supported | Use `itemLink` to link to document |

---

## Production Gotchas

- **`Start and wait` blocks the flow run** for the entire approval duration — a 7-day timeout
  means the flow run is open for 7 days consuming concurrency quota. Use `Create + Wait`
  pattern for long-running approvals and store approval ID in Dataverse.
- **Approval emails go to Outlook AND Teams** by default when `enableNotifications: true` —
  approvers may respond from email while Teams card is still showing; both are valid response paths.
- **`assignedTo` email must be exact UPN** — display names and aliases fail silently and
  the approval is created with no valid assignee.
- **DLP policies can block the Approvals connector** if it's classified as Non-Business while
  your flow uses Business connectors — keep Approvals in the Business group.
- **Approval data is stored in Dataverse** in the `approvals` table — accessible via Web API
  for reporting and compliance archival purposes.
- **Mobile approvals** use the Power Automate mobile app — push notifications require the
  user to have the app installed and notifications enabled.
