# Approval Gates Reference

## Overview

Approval gates are structured checkpoints in service desk workflows that require human authorization before executing sensitive or irreversible actions. This reference covers Power Automate approval actions, Teams adaptive card approvals, parallel and sequential approval patterns, approval delegation, timeout handling, audit trail, and email-based approval.

---

## Power Automate Approval Actions

### "Start and Wait for an Approval" Action

The primary approval action. Pauses the flow until an approver responds or the request times out.

```json
{
  "Request_group_membership_approval": {
    "type": "ApiConnection",
    "inputs": {
      "host": {
        "connection": { "name": "@parameters('$connections')['approvals']['connectionId']" }
      },
      "method": "post",
      "path": "/approvalRequests/subscribe",
      "body": {
        "approvalType": "Basic",
        "title": "Approval: Add @{triggerBody()?['RequesterName']} to @{triggerBody()?['GroupName']}",
        "assignedTo": "@{triggerBody()?['ManagerEmail']}",
        "details": "**Requester**: @{triggerBody()?['RequesterName']}\n**Group**: @{triggerBody()?['GroupName']}\n**Reason**: @{triggerBody()?['Justification']}\n**Ticket**: @{triggerBody()?['TicketId']}",
        "itemLink": "https://tickets.contoso.com/@{triggerBody()?['TicketId']}",
        "itemLinkDescription": "View ticket",
        "requestDate": "@{utcNow()}",
        "enableNotifications": true
      }
    },
    "limit": {
      "timeout": "P2D"
    }
  }
}
```

**Approval types**:
| Type | Value | Behavior |
|---|---|---|
| Basic (yes/no) | `Basic` | Approve or Reject |
| Custom (free text) | `CustomResponse` | Define custom response options |

**After the action completes**, check the outcome:

```json
{
  "Check_approval_outcome": {
    "type": "If",
    "expression": {
      "and": [
        {
          "equals": [
            "@body('Request_group_membership_approval')?['outcome']",
            "Approve"
          ]
        }
      ]
    },
    "actions": {
      "Execute_approved_action": { ... }
    },
    "else": {
      "actions": {
        "Notify_requester_rejected": { ... }
      }
    }
  }
}
```

### Approval Response Object

```json
{
  "outcome": "Approve",  // or "Reject"
  "approverResponse": "Approved — user is on the Finance team.",
  "approvedBy": [
    {
      "displayName": "John Manager",
      "email": "john.manager@contoso.com",
      "respondedDate": "2026-03-03T14:35:00Z"
    }
  ],
  "requestDate": "2026-03-03T10:00:00Z",
  "completionDate": "2026-03-03T14:35:00Z",
  "title": "Approval: Add Jane Smith to Finance Group"
}
```

---

## Teams Adaptive Card Approval

For richer approval experiences with context and inline comments, send an Adaptive Card to Teams.

### Send Approval Card to Teams Channel

```json
{
  "Post_approval_card": {
    "type": "ApiConnection",
    "inputs": {
      "host": {
        "connection": { "name": "@parameters('$connections')['teams']['connectionId']" }
      },
      "method": "post",
      "path": "/v3/beta/teams/@{encodeURIComponent(parameters('cr_ITTeamId'))}/channels/@{encodeURIComponent(parameters('cr_ApprovalChannelId'))}/messages",
      "body": {
        "messageType": "message",
        "attachments": [
          {
            "contentType": "application/vnd.microsoft.card.adaptive",
            "content": {
              "type": "AdaptiveCard",
              "version": "1.5",
              "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
              "body": [
                {
                  "type": "TextBlock",
                  "text": "Approval Required — Service Desk Request",
                  "weight": "Bolder",
                  "size": "Large",
                  "color": "Warning"
                },
                {
                  "type": "FactSet",
                  "facts": [
                    { "title": "Ticket", "value": "@{triggerBody()?['TicketId']}" },
                    { "title": "Request", "value": "@{triggerBody()?['RequestType']}" },
                    { "title": "Requester", "value": "@{triggerBody()?['RequesterName']}" },
                    { "title": "Justification", "value": "@{triggerBody()?['Justification']}" },
                    { "title": "Priority", "value": "@{triggerBody()?['Priority']}" },
                    { "title": "SLA Due", "value": "@{formatDateTime(triggerBody()?['SlaDue'], 'yyyy-MM-dd HH:mm')}" }
                  ]
                },
                {
                  "type": "Input.Text",
                  "id": "approverComments",
                  "placeholder": "Comments (optional — visible to requester)",
                  "isMultiline": true,
                  "maxLength": 500
                }
              ],
              "actions": [
                {
                  "type": "Action.Submit",
                  "title": "Approve",
                  "style": "positive",
                  "data": {
                    "action": "approve",
                    "ticketId": "@{triggerBody()?['TicketId']}",
                    "flowResumeUrl": "@{body('Create_approval_token')?['resumeUrl']}"
                  }
                },
                {
                  "type": "Action.Submit",
                  "title": "Reject",
                  "style": "destructive",
                  "data": {
                    "action": "reject",
                    "ticketId": "@{triggerBody()?['TicketId']}",
                    "flowResumeUrl": "@{body('Create_approval_token')?['resumeUrl']}"
                  }
                },
                {
                  "type": "Action.OpenUrl",
                  "title": "View Full Ticket",
                  "url": "https://tickets.contoso.com/@{triggerBody()?['TicketId']}"
                }
              ]
            }
          }
        ]
      }
    }
  }
}
```

### Handle Card Response (via HTTP Trigger Flow)

Create a second flow with an HTTP Request trigger that receives the card submission:

```json
// Second flow — receives the card action.submit data
{
  "triggers": {
    "manual": {
      "type": "Request",
      "kind": "Http",
      "inputs": {
        "schema": {
          "type": "object",
          "properties": {
            "action": { "type": "string" },
            "ticketId": { "type": "string" },
            "approverComments": { "type": "string" },
            "responderId": { "type": "string" }
          }
        }
      }
    }
  }
}
```

---

## Parallel Approvals

Parallel approvals require multiple approvers to respond simultaneously. The flow waits for all (or a quorum) to respond.

### All Must Approve Pattern

```json
{
  "Parallel_approval_branch": {
    "type": "Scope",
    "actions": {
      "Approve_by_manager": {
        "type": "ApiConnection",
        "runAfter": {},
        "inputs": {
          "body": {
            "approvalType": "Basic",
            "title": "Manager Approval: @{triggerBody()?['RequestTitle']}",
            "assignedTo": "@{triggerBody()?['ManagerEmail']}",
            "details": "@{triggerBody()?['RequestDetails']}"
          }
        }
      },
      "Approve_by_security": {
        "type": "ApiConnection",
        "runAfter": {},
        "inputs": {
          "body": {
            "approvalType": "Basic",
            "title": "Security Approval: @{triggerBody()?['RequestTitle']}",
            "assignedTo": "security-team@contoso.com",
            "details": "@{triggerBody()?['RequestDetails']}"
          }
        }
      }
    }
  },
  "Check_all_approved": {
    "type": "If",
    "runAfter": { "Parallel_approval_branch": ["Succeeded"] },
    "expression": {
      "and": [
        { "equals": ["@body('Approve_by_manager')?['outcome']", "Approve"] },
        { "equals": ["@body('Approve_by_security')?['outcome']", "Approve"] }
      ]
    }
  }
}
```

### First to Respond Pattern (Approve/Reject)

Use the built-in `Approve/Reject - First to respond` approval type:

```json
{
  "body": {
    "approvalType": "Basic",
    "title": "Urgent Approval Required",
    "assignedTo": "manager1@contoso.com;manager2@contoso.com;manager3@contoso.com",
    "enableNotifications": true
  }
}
```

Multiple semicolon-separated approvers — first response wins.

---

## Sequential Approvals

Sequential approvals require Tier 1 approval before requesting Tier 2.

```json
{
  "Stage1_Manager_Approval": {
    "type": "ApiConnection",
    "inputs": {
      "body": {
        "approvalType": "Basic",
        "title": "Stage 1 — Manager Approval",
        "assignedTo": "@{triggerBody()?['ManagerEmail']}"
      }
    }
  },
  "Check_stage1": {
    "type": "If",
    "runAfter": { "Stage1_Manager_Approval": ["Succeeded"] },
    "expression": { "equals": ["@body('Stage1_Manager_Approval')?['outcome']", "Approve"] },
    "actions": {
      "Stage2_Director_Approval": {
        "type": "ApiConnection",
        "inputs": {
          "body": {
            "approvalType": "Basic",
            "title": "Stage 2 — Director Approval (Manager: @{body('Stage1_Manager_Approval')?['approvedBy'][0]['displayName']} approved)",
            "assignedTo": "@{triggerBody()?['DirectorEmail']}",
            "details": "Manager approved with comment: @{body('Stage1_Manager_Approval')?['approverResponse']}"
          }
        }
      }
    },
    "else": {
      "actions": {
        "Notify_requester_rejected_stage1": { ... }
      }
    }
  }
}
```

---

## Approval Delegation

When a manager is unavailable, delegate approval to an alternate.

### Delegation Pattern

```json
// Check if manager is out-of-office before sending approval
{
  "Check_manager_availability": {
    "type": "ApiConnection",
    "inputs": {
      "method": "get",
      "path": "/v2/Mail/OofSettings/@{encodeURIComponent(triggerBody()?['ManagerEmail'])}"
    }
  },
  "Route_approval": {
    "type": "If",
    "expression": {
      "equals": [
        "@body('Check_manager_availability')?['isOofEnabled']",
        true
      ]
    },
    "actions": {
      "Send_to_delegate": {
        "type": "ApiConnection",
        "inputs": {
          "body": {
            "assignedTo": "@{triggerBody()?['DelegateEmail']}",
            "title": "Delegated Approval (Manager @{triggerBody()?['ManagerEmail']} is OOO)"
          }
        }
      }
    },
    "else": {
      "actions": {
        "Send_to_manager": {
          "type": "ApiConnection",
          "inputs": {
            "body": {
              "assignedTo": "@{triggerBody()?['ManagerEmail']}"
            }
          }
        }
      }
    }
  }
}
```

---

## Timeout Handling

### Configure Approval Timeout

```json
{
  "Approval_with_timeout": {
    "type": "ApiConnection",
    "inputs": {
      "body": {
        "approvalType": "Basic",
        "title": "@{triggerBody()?['Title']}",
        "assignedTo": "@{triggerBody()?['ApproverEmail']}"
      }
    },
    "limit": {
      "timeout": "P1D"  // ISO 8601 — 1 day timeout
    }
  }
}
```

### Handle Timeout via runAfter

```json
{
  "Handle_approval_result": {
    "type": "Switch",
    "runAfter": {
      "Approval_with_timeout": ["Succeeded", "Failed", "TimedOut"]
    },
    "expression": "@if(equals(actions('Approval_with_timeout').status, 'TimedOut'), 'TimedOut', body('Approval_with_timeout')?['outcome'])",
    "cases": {
      "Approve": {
        "case": "Approve",
        "actions": { "Execute_approved": { ... } }
      },
      "Reject": {
        "case": "Reject",
        "actions": { "Notify_rejected": { ... } }
      },
      "TimedOut": {
        "case": "TimedOut",
        "actions": {
          "Escalate_due_to_timeout": {
            "type": "ApiConnection",
            "inputs": {
              "body": {
                "approvalType": "Basic",
                "title": "ESCALATED (Original approver did not respond in 24h): @{triggerBody()?['Title']}",
                "assignedTo": "@{triggerBody()?['DirectorEmail']}"
              }
            }
          }
        }
      }
    }
  }
}
```

**Approval timeout ISO 8601 values**:
- `PT1H` — 1 hour
- `P1D` — 1 day
- `P2D` — 2 days
- `P7D` — 1 week
- Maximum: `P30D` (30 days — platform hard limit for approval actions)

---

## Approval Audit Trail

Every approval action must be logged for compliance and auditability.

### Log to Dataverse

```json
{
  "Log_approval_event": {
    "type": "ApiConnection",
    "inputs": {
      "method": "post",
      "path": "/v2/datasets/default.cds/tables/cr_approvalevents/items",
      "body": {
        "cr_ticketid": "@{triggerBody()?['TicketId']}",
        "cr_approvaltype": "@{triggerBody()?['ApprovalType']}",
        "cr_approver": "@{body('Approval_action')?['approvedBy'][0]['email']}",
        "cr_outcome": "@{body('Approval_action')?['outcome']}",
        "cr_comments": "@{body('Approval_action')?['approverResponse']}",
        "cr_requestedon": "@{triggerBody()?['RequestedOn']}",
        "cr_respondedon": "@{body('Approval_action')?['completionDate']}",
        "cr_requestedby": "@{triggerBody()?['RequesterEmail']}",
        "cr_flowrunid": "@{workflow().run.name}"
      }
    }
  }
}
```

### Audit Event Schema

| Field | Description |
|---|---|
| `cr_ticketid` | ITSM ticket reference |
| `cr_approvaltype` | What was being approved (group add, license assign, etc.) |
| `cr_approver` | Who responded |
| `cr_outcome` | Approve / Reject / TimedOut |
| `cr_comments` | Approver's response comments |
| `cr_requestedon` | When approval was requested |
| `cr_respondedon` | When approver responded |
| `cr_requestedby` | Who initiated the request |
| `cr_flowrunid` | Power Automate run ID for traceability |

---

## Email-Based Approval

For external approvers or environments without Teams, use email approval.

### HTML Approval Email with Reply Parsing

```json
{
  "Send_approval_email": {
    "type": "ApiConnection",
    "inputs": {
      "body": {
        "To": "@{triggerBody()?['ApproverEmail']}",
        "Subject": "Action Required: Approve/Reject Service Request @{triggerBody()?['TicketId']}",
        "Body": "<html><body><h2>Service Desk Approval Request</h2><table><tr><td><strong>Ticket</strong></td><td>@{triggerBody()?['TicketId']}</td></tr><tr><td><strong>Request</strong></td><td>@{triggerBody()?['RequestTitle']}</td></tr><tr><td><strong>Requester</strong></td><td>@{triggerBody()?['RequesterName']}</td></tr><tr><td><strong>Details</strong></td><td>@{triggerBody()?['Details']}</td></tr></table><br/><p><strong>Please reply to this email with one of:</strong></p><ul><li>Type <strong>APPROVE</strong> to approve this request</li><li>Type <strong>REJECT</strong> followed by your reason to reject</li></ul><p>This request will auto-expire in 24 hours if no response is received.</p><hr/><small>Ticket ID: @{triggerBody()?['TicketId']} | Do not forward this email.</small></body></html>",
        "IsHtml": true,
        "Importance": "High"
      }
    }
  }
}
```

Use a second flow triggered by email reply matching the ticket ID in the subject to process the approval response.

---

## Error Codes and Conditions

| Code / Condition | Meaning | Remediation |
|---|---|---|
| `Approval action TimedOut` | No response within timeout period | Use `runAfter: TimedOut` to handle; escalate to next approver |
| `AssignedTo` email not found | Approver account doesn't exist in tenant | Validate approver email before sending; fall back to team alias |
| Duplicate approval requests sent | Flow retrying the approval action | Set `retryPolicy: none` on all approval actions |
| Card action not working in Teams | Bot not registered; action.submit URL not configured | Verify Teams bot registration; use Power Automate approval connector for simpler cases |
| Audit log record creation fails | Dataverse permission error | Verify service principal has Create access to `cr_approvalevents` table |
| Sequential approval Stage 2 never sent | Stage 1 result check logic error | Verify `outcome` comparison is case-exact: `"Approve"` not `"approve"` |
| Parallel branch timeout mismatch | One branch times out before other responds | Set same timeout on both parallel approval actions |
| Email approval reply not detected | Subject prefix changed by approver | Use ticket ID in email subject instead of prefix; search by ticket ID |

---

## Limits Table

| Resource | Limit | Notes |
|---|---|---|
| Approval action timeout max | P30D (30 days) | Hard limit for the approval action |
| Parallel approvers (semicolon) | 100 | Per `assignedTo` list |
| Approval responses tracked | Configurable | All responses stored in Power Automate |
| Approval audit trail retention | 30 days (Power Automate) | Store in Dataverse for long-term retention |
| Approvals connector API calls | 300/60s per connection | Standard connector limits |
| Adaptive card in Teams size | 28 KB | Per card payload |
| Sequential approval depth | No platform limit | Practical: keep under 5 stages |
