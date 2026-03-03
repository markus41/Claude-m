# Ticket Workflows Reference

## Overview

Service desk ticket workflows automate the lifecycle of IT support requests from submission through resolution. This reference covers ticket lifecycle states, ITSM connector integrations (ServiceNow and Jira Service Management), Graph API patterns for Teams and Outlook notifications, Dataverse ticket schema design, SLA tracking, priority matrices, and automated triage patterns.

---

## Ticket Lifecycle States

### Standard ITSM State Machine

```
New → Acknowledged → In Progress → Pending (waiting for user/vendor) → Resolved → Closed
                          │
                          └→ Escalated → Manager Review → Resolved → Closed
                          │
                          └→ Cancelled
```

### State Table

| State | Code | Description | Transitions To |
|---|---|---|---|
| New | `1` | Ticket created, not yet seen | Acknowledged, Cancelled |
| Acknowledged | `2` | Agent has seen the ticket | In Progress, Pending, Cancelled |
| In Progress | `3` | Agent actively working | Pending, Escalated, Resolved, Cancelled |
| Pending | `4` | Waiting — user response, vendor, change window | In Progress, Cancelled |
| Escalated | `5` | Elevated to Tier 2 / manager | In Progress, Resolved, Cancelled |
| Resolved | `6` | Fix applied; awaiting user confirmation | Closed, In Progress (re-open) |
| Closed | `7` | Confirmed resolved; SLA clock stopped | (terminal) |
| Cancelled | `8` | Request withdrawn or invalid | (terminal) |

---

## ITSM Connector Integrations

### ServiceNow Connector (Power Automate)

The ServiceNow connector provides standard ITSM actions for incident, change, and request management.

#### Endpoint Reference

| Operation | Connector Action | REST Equivalent |
|---|---|---|
| Create incident | `CreateRecord` (table: `incident`) | `POST /api/now/table/incident` |
| Update incident | `UpdateRecord` (table: `incident`) | `PATCH /api/now/table/incident/{sys_id}` |
| Get incident | `GetRecord` (table: `incident`) | `GET /api/now/table/incident/{sys_id}` |
| List incidents | `ListRecords` (table: `incident`) | `GET /api/now/table/incident?sysparm_query=...` |
| Create task | `CreateRecord` (table: `task`) | `POST /api/now/table/task` |
| Add work note | `UpdateRecord` (work_notes field) | `PATCH /api/now/table/incident/{sys_id}` |

#### Create ServiceNow Incident — Power Automate HTTP Action

```json
// If using HTTP action directly (more flexible than connector)
{
  "HTTP_Create_ServiceNow_Incident": {
    "type": "Http",
    "inputs": {
      "method": "POST",
      "uri": "https://{instance}.service-now.com/api/now/table/incident",
      "headers": {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": "Basic @{base64(concat(parameters('cr_SnowUsername'), ':', parameters('cr_SnowPassword')))}"
      },
      "body": {
        "short_description": "@{triggerBody()?['TicketTitle']}",
        "description": "@{triggerBody()?['TicketDescription']}",
        "urgency": "@{variables('SnowUrgency')}",
        "impact": "@{variables('SnowImpact')}",
        "category": "@{triggerBody()?['Category']}",
        "assignment_group": "@{variables('AssignmentGroup')}",
        "caller_id": "@{triggerBody()?['RequesterId']}",
        "work_notes": "Ticket created via M365 Service Desk automation"
      },
      "retryPolicy": {
        "type": "exponential",
        "count": 3,
        "interval": "PT10S"
      }
    }
  }
}
```

#### ServiceNow Priority / Urgency / Impact Matrix

| Urgency | Impact | Priority |
|---|---|---|
| High (1) | High (1) | 1 — Critical |
| High (1) | Medium (2) | 2 — High |
| Medium (2) | High (1) | 2 — High |
| High (1) | Low (3) | 3 — Moderate |
| Medium (2) | Medium (2) | 3 — Moderate |
| Low (3) | High (1) | 3 — Moderate |
| Medium (2) | Low (3) | 4 — Low |
| Low (3) | Medium (2) | 4 — Low |
| Low (3) | Low (3) | 5 — Planning |

### Jira Service Management Connector

#### Endpoint Reference

| Operation | REST Endpoint |
|---|---|
| Create issue | `POST /rest/api/3/issue` |
| Update issue | `PUT /rest/api/3/issue/{issueIdOrKey}` |
| Get issue | `GET /rest/api/3/issue/{issueIdOrKey}` |
| Add comment | `POST /rest/api/3/issue/{issueIdOrKey}/comment` |
| Transition issue | `POST /rest/api/3/issue/{issueIdOrKey}/transitions` |
| List transitions | `GET /rest/api/3/issue/{issueIdOrKey}/transitions` |

#### Create Jira Service Request — Power Automate HTTP Action

```json
{
  "HTTP_Create_Jira_Issue": {
    "type": "Http",
    "inputs": {
      "method": "POST",
      "uri": "https://{org}.atlassian.net/rest/api/3/issue",
      "headers": {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": "Basic @{base64(concat(parameters('cr_JiraEmail'), ':', parameters('cr_JiraApiToken')))}"
      },
      "body": {
        "fields": {
          "project": { "key": "@{parameters('cr_JiraProjectKey')}" },
          "summary": "@{triggerBody()?['TicketTitle']}",
          "description": {
            "type": "doc",
            "version": 1,
            "content": [
              {
                "type": "paragraph",
                "content": [
                  {
                    "type": "text",
                    "text": "@{triggerBody()?['TicketDescription']}"
                  }
                ]
              }
            ]
          },
          "issuetype": { "name": "Service Request" },
          "priority": { "name": "@{variables('JiraPriority')}" },
          "labels": ["m365-automated"],
          "customfield_10014": "@{triggerBody()?['SprintId']}"
        }
      }
    }
  }
}
```

#### Transition Jira Issue (Change Status)

```json
// First get available transitions
{
  "Get_transitions": {
    "type": "Http",
    "inputs": {
      "method": "GET",
      "uri": "https://{org}.atlassian.net/rest/api/3/issue/{issueKey}/transitions",
      "headers": { "Authorization": "Basic @{base64(...)}" }
    }
  }
}

// Then apply the desired transition
{
  "Transition_to_In_Progress": {
    "type": "Http",
    "inputs": {
      "method": "POST",
      "uri": "https://{org}.atlassian.net/rest/api/3/issue/{issueKey}/transitions",
      "headers": {
        "Content-Type": "application/json",
        "Authorization": "Basic @{base64(...)}"
      },
      "body": {
        "transition": {
          "id": "@{body('Get_transitions')?['transitions'][0]['id']}"
        }
      }
    }
  }
}
```

---

## Graph API for Ticket Notifications

### Teams Notification — Create Ticket Alert

```json
POST https://graph.microsoft.com/v1.0/teams/{teamId}/channels/{channelId}/messages
Authorization: Bearer {token}
Content-Type: application/json

{
  "body": {
    "contentType": "html",
    "content": "<h3>New Service Desk Ticket</h3><p><strong>INC-2026-0042</strong> — Password Reset Request</p><p>Submitted by: Jane Smith | Priority: High | SLA: 4 hours</p><a href='https://portal.contoso.com/tickets/INC-2026-0042'>View Ticket</a>"
  }
}
```

### Outlook Email Notification — SLA Warning

```json
POST https://graph.microsoft.com/v1.0/me/sendMail
Authorization: Bearer {token}
Content-Type: application/json

{
  "message": {
    "subject": "⚠️ SLA Warning: INC-2026-0042 Due in 30 Minutes",
    "body": {
      "contentType": "HTML",
      "content": "<h2>SLA Warning</h2><p>Ticket <strong>INC-2026-0042</strong> will breach SLA in <strong>30 minutes</strong>.</p><table><tr><th>Ticket</th><td>INC-2026-0042</td></tr><tr><th>Subject</th><td>VPN Access Issue</td></tr><tr><th>Priority</th><td>High</td></tr><tr><th>SLA Due</th><td>2026-03-03 15:00 UTC</td></tr><tr><th>Assigned To</th><td>Tier 1 Support</td></tr></table><p><a href='https://tickets.contoso.com/INC-2026-0042'>Open Ticket →</a></p>"
    },
    "toRecipients": [
      { "emailAddress": { "address": "it-support@contoso.com" } }
    ],
    "importance": "high"
  }
}
```

---

## Dataverse Ticket Schema

For organizations using Dataverse as the ticketing backend:

### Core Tables

| Table | Logical Name | Purpose |
|---|---|---|
| Ticket | `cr_ticket` | Main ticket record |
| Ticket Note | `cr_ticketnote` | Work notes and communications |
| SLA Definition | `cr_sladefinition` | SLA rules per priority |
| Escalation Log | `cr_escalationlog` | Audit trail of escalations |

### cr_ticket Table Columns

```json
// Create ticket record via Dataverse API
POST /api/data/v9.2/cr_tickets
{
  "cr_title": "VPN Access Not Working",
  "cr_description": "Unable to connect to VPN since this morning. Error code: 0x800 on Windows 11.",
  "cr_priority": 200000002,
  "cr_status": 200000001,
  "cr_category": "Network",
  "cr_subcategory": "VPN",
  "cr_submittedon": "@utcNow()",
  "cr_sladuedate": "@addHours(utcNow(), 4)",
  "cr_requester@odata.bind": "/contacts(<contact-id>)",
  "cr_assignedteam": "Tier 1 Support",
  "cr_source": "email",
  "cr_externalid": "INC-2026-0042"
}
```

### Priority Option Set Values

| Priority | Value | SLA (Response) | SLA (Resolution) |
|---|---|---|---|
| Critical | `200000001` | 15 minutes | 2 hours |
| High | `200000002` | 1 hour | 4 hours |
| Medium | `200000003` | 4 hours | 8 hours |
| Low | `200000004` | 1 business day | 5 business days |

---

## SLA Tracking

### SLA Calculation Pattern (Power Automate)

```json
// Flow: Check SLA compliance on ticket update
// Trigger: When Dataverse ticket row is modified

{
  "Calculate_SLA_Status": {
    "type": "Compose",
    "inputs": {
      "ticketId": "@{triggerOutputs()?['body/cr_ticketid']}",
      "priority": "@{triggerOutputs()?['body/cr_priority']}",
      "createdOn": "@{triggerOutputs()?['body/createdon']}",
      "slaDueDate": "@{triggerOutputs()?['body/cr_sladuedate']}",
      "currentTime": "@{utcNow()}",
      "minutesRemaining": "@{div(sub(ticks(triggerOutputs()?['body/cr_sladuedate']), ticks(utcNow())), 600000000)}",
      "isSLABreached": "@{less(ticks(triggerOutputs()?['body/cr_sladuedate']), ticks(utcNow()))}"
    }
  },
  "Check_SLA_Threshold": {
    "type": "If",
    "expression": {
      "or": [
        {
          "less": ["@outputs('Calculate_SLA_Status')?['minutesRemaining']", 30]
        }
      ]
    },
    "actions": {
      "Send_SLA_Warning": { ... }
    }
  }
}
```

### SLA Tracking with Business Hours

Business hour SLA calculations require excluding weekends and off-hours:

```javascript
function addBusinessHours(startTime, hoursToAdd) {
  const BUSINESS_START = 8;  // 8 AM
  const BUSINESS_END = 17;   // 5 PM
  const BUSINESS_DAYS = [1, 2, 3, 4, 5];  // Mon-Fri

  let current = new Date(startTime);
  let remaining = hoursToAdd * 60;  // Convert to minutes

  while (remaining > 0) {
    const dayOfWeek = current.getDay();
    const hour = current.getHours();

    if (!BUSINESS_DAYS.includes(dayOfWeek)) {
      // Skip weekend
      current = new Date(current.setDate(current.getDate() + 1));
      current.setHours(BUSINESS_START, 0, 0, 0);
      continue;
    }

    if (hour < BUSINESS_START) {
      current.setHours(BUSINESS_START, 0, 0, 0);
      continue;
    }

    if (hour >= BUSINESS_END) {
      current.setDate(current.getDate() + 1);
      current.setHours(BUSINESS_START, 0, 0, 0);
      continue;
    }

    const minutesToEndOfDay = (BUSINESS_END - hour) * 60 - current.getMinutes();
    if (remaining <= minutesToEndOfDay) {
      current = new Date(current.getTime() + remaining * 60000);
      remaining = 0;
    } else {
      remaining -= minutesToEndOfDay;
      current.setDate(current.getDate() + 1);
      current.setHours(BUSINESS_START, 0, 0, 0);
    }
  }

  return current;
}
```

---

## Priority Matrix

### Request Type × User Impact Matrix

| Request Type | Single User Affected | Multiple Users Affected | Business Process Blocked |
|---|---|---|---|
| Password / MFA reset | Low | Medium | High |
| Software request | Low | Low | Medium |
| Hardware request | Low | Medium | High |
| VPN / Network access | Medium | High | Critical |
| Email / Teams issue | Medium | High | Critical |
| Server / service down | High | Critical | Critical |
| Security incident | High | Critical | Critical |
| Data recovery | Medium | High | Critical |

---

## Automated Triage Patterns

### AI-Based Triage (Power Automate + AI Builder)

```json
{
  "Classify_ticket": {
    "type": "ApiConnection",
    "inputs": {
      "host": { "connection": { "name": "@parameters('$connections')['cognitiveservicestextanalytics']['connectionId']" } },
      "method": "post",
      "path": "/text/analytics/v3.1/sentiment",
      "body": {
        "documents": [
          {
            "id": "1",
            "text": "@{triggerBody()?['TicketDescription']}",
            "language": "en"
          }
        ]
      }
    }
  },
  "Set_urgency_from_sentiment": {
    "type": "If",
    "expression": {
      "less": ["@body('Classify_ticket')?['documents'][0]['confidenceScores']['negative']", 0.7]
    },
    "actions": {
      "Set_priority_normal": {
        "type": "SetVariable",
        "inputs": { "name": "TicketPriority", "value": "Medium" }
      }
    },
    "else": {
      "actions": {
        "Set_priority_urgent": {
          "type": "SetVariable",
          "inputs": { "name": "TicketPriority", "value": "High" }
        }
      }
    }
  }
}
```

### Keyword-Based Auto-Routing

```json
{
  "Route_by_keyword": {
    "type": "Switch",
    "expression": "@{if(contains(toLower(triggerBody()?['TicketTitle']), 'vpn'), 'network', if(contains(toLower(triggerBody()?['TicketTitle']), 'password'), 'account', if(contains(toLower(triggerBody()?['TicketTitle']), 'laptop'), 'hardware', 'general')))}",
    "cases": {
      "network": {
        "case": "network",
        "actions": {
          "Assign_to_network_team": { ... }
        }
      },
      "account": {
        "case": "account",
        "actions": {
          "Assign_to_security_team": { ... }
        }
      },
      "hardware": {
        "case": "hardware",
        "actions": {
          "Assign_to_hardware_team": { ... }
        }
      }
    },
    "default": {
      "actions": {
        "Assign_to_tier1": { ... }
      }
    }
  }
}
```

---

## Error Codes and Conditions

| Code / Condition | Meaning | Remediation |
|---|---|---|
| ServiceNow `401 Unauthorized` | Credentials invalid or account locked | Verify username/password; check ServiceNow user account status |
| ServiceNow `403 Forbidden` | User lacks required ServiceNow role | Assign `itil` role to the service account in ServiceNow |
| Jira `404 Not Found` | Project key invalid or issue not found | Verify `cr_JiraProjectKey` environment variable; check Jira project exists |
| Jira `400 Bad Request` on create | Required fields missing | Consult Jira project's required fields config; add missing fields to request body |
| Graph API `403` on Teams message | Bot lacks Teams message permissions | Consent to `ChannelMessage.Send` permission in the app registration |
| Dataverse `409 Conflict` on ticket create | External ID collision | Check for duplicate before inserting; use upsert pattern |
| SLA due date in the past on creation | System clock skew; timezone mismatch | Normalize all timestamps to UTC; verify `utcNow()` usage |
| Triage routing always goes to default | Keyword matching case-sensitive | Use `toLower()` on both sides of `contains()` comparison |

---

## Limits Table

| Resource | Limit | Notes |
|---|---|---|
| ServiceNow API rate limit | 1,000 requests/hour | Per user credential |
| Jira API rate limit | 1,000 requests/hour | Per user account |
| Graph API `sendMail` | 30 messages/minute | Per user |
| Dataverse tickets per environment | No hard limit | Storage capacity limits apply |
| Power Automate flow run duration | 30 days | Long-running SLA tracking via scheduled flows |
| SLA calculation precision | Minutes | Business hours calc adds complexity |
| Concurrent ITSM API calls | 10 (conservative) | Reduce `Apply to each` concurrency |
