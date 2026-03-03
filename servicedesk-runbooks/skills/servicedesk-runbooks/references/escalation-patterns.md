# Escalation Patterns Reference

## Overview

Escalation patterns define how service desk requests move from initial handling to higher-tier support when they cannot be resolved within SLA or require specialized expertise. This reference covers time-based escalation triggers, skill-based routing, manager escalation chains, cross-team escalation, external vendor escalation, executive bridge patterns, post-incident review automation, and runbook handoff documentation.

---

## Time-Based Escalation Triggers

### Scheduled SLA Check (Power Automate Recurrence)

```json
// Flow: Check for SLA-approaching and breached tickets every 15 minutes
{
  "triggers": {
    "SLA_Check_Schedule": {
      "type": "Recurrence",
      "recurrence": {
        "frequency": "Minute",
        "interval": 15
      }
    }
  },
  "actions": {
    "Get_tickets_near_SLA": {
      "type": "ApiConnection",
      "inputs": {
        "method": "get",
        "path": "/v2/datasets/default.cds/tables/cr_tickets/items",
        "queries": {
          "$filter": "cr_status ne 200000006 and cr_status ne 200000007 and cr_status ne 200000008 and cr_sladuedate le @{addMinutes(utcNow(), 30)}",
          "$select": "cr_ticketid,cr_title,cr_priority,cr_sladuedate,cr_assignedto,cr_assignedteam,cr_requester",
          "$orderby": "cr_sladuedate asc"
        }
      }
    },
    "Process_each_ticket": {
      "type": "Foreach",
      "foreach": "@body('Get_tickets_near_SLA')?['value']",
      "runtimeConfiguration": { "concurrency": { "repetitions": 5 } },
      "actions": {
        "Classify_escalation_type": {
          "type": "Compose",
          "inputs": {
            "ticketId": "@{items('Process_each_ticket')?['cr_ticketid']}",
            "minutesRemaining": "@{div(sub(ticks(items('Process_each_ticket')?['cr_sladuedate']), ticks(utcNow())), 600000000)}",
            "isBreached": "@{less(ticks(items('Process_each_ticket')?['cr_sladuedate']), ticks(utcNow()))}"
          }
        },
        "Route_escalation": {
          "type": "Switch",
          "expression": "@if(outputs('Classify_escalation_type')?['isBreached'], 'Breached', if(less(outputs('Classify_escalation_type')?['minutesRemaining'], 15), 'Critical', 'Warning'))",
          "cases": {
            "Breached": {
              "case": "Breached",
              "actions": {
                "Escalate_breached": { /* Manager notification + ticket escalation */ }
              }
            },
            "Critical": {
              "case": "Critical",
              "actions": {
                "Alert_15min_warning": { /* Urgent notification to assignee */ }
              }
            },
            "Warning": {
              "case": "Warning",
              "actions": {
                "Send_30min_warning": { /* Standard notification */ }
              }
            }
          }
        }
      }
    }
  }
}
```

### Time-Based Escalation Thresholds by Priority

| Priority | 1st Warning | 2nd Warning | Escalate to Tier 2 | Escalate to Manager | Breached |
|---|---|---|---|---|---|
| Critical | 15 min remaining | — | SLA breach | 15 min after breach | At SLA due |
| High | 1 hour remaining | 30 min remaining | 30 min after breach | 1 hour after breach | At SLA due |
| Medium | 2 hours remaining | 1 hour remaining | 2 hours after breach | 4 hours after breach | At SLA due |
| Low | 1 day remaining | 4 hours remaining | 1 day after breach | 2 days after breach | At SLA due |

---

## Skill-Based Routing

Route tickets to the team or agent with the appropriate skill set based on ticket category and subcategory.

### Routing Table

| Category | Subcategory | Assigned Team | Skill Tag |
|---|---|---|---|
| Network | VPN | Network Team | `vpn-expert` |
| Network | Wi-Fi | Network Team | `wireless` |
| Account | Password Reset | Tier 1 Support | `basic-access` |
| Account | MFA Reset | Security Team | `identity-security` |
| Account | Privileged Access | Security Team | `pam` |
| Software | Standard Install | Tier 1 Support | `software-deploy` |
| Software | License Issue | Licensing Team | `license-mgmt` |
| Hardware | Laptop Request | Hardware Team | `asset-mgmt` |
| Hardware | Peripheral | Tier 1 Support | `hardware-basic` |
| Server | Outage | Tier 3 Ops | `server-admin` |
| Security | Phishing | Security Team | `incident-response` |

### Skill-Based Routing Flow

```json
{
  "Route_to_skilled_team": {
    "type": "Switch",
    "expression": "@{concat(toLower(triggerBody()?['Category']), '-', toLower(triggerBody()?['Subcategory']))}",
    "cases": {
      "network-vpn": {
        "case": "network-vpn",
        "actions": {
          "Assign_to_network_team": {
            "type": "ApiConnection",
            "inputs": {
              "body": {
                "cr_assignedteam": "Network Team",
                "cr_skilltag": "vpn-expert",
                "cr_priority": 200000002
              }
            }
          }
        }
      },
      "security-phishing": {
        "case": "security-phishing",
        "actions": {
          "Escalate_to_security_immediately": {
            "type": "Scope",
            "actions": {
              "Set_critical_priority": { ... },
              "Page_security_team_oncall": { ... },
              "Open_major_incident": { ... }
            }
          }
        }
      }
    },
    "default": {
      "actions": {
        "Assign_to_tier1": {
          "type": "ApiConnection",
          "inputs": {
            "body": {
              "cr_assignedteam": "Tier 1 Support",
              "cr_skilltag": "general"
            }
          }
        }
      }
    }
  }
}
```

---

## Manager Escalation Chain

### Resolve Manager from Graph API

```json
{
  "Get_requester_manager": {
    "type": "Http",
    "inputs": {
      "method": "GET",
      "uri": "https://graph.microsoft.com/v1.0/users/@{triggerBody()?['RequesterUpn']}/manager",
      "headers": {
        "Authorization": "Bearer @{body('Get_token')?['access_token']}"
      }
    }
  },
  "Get_manager_of_manager": {
    "type": "Http",
    "runAfter": { "Get_requester_manager": ["Succeeded"] },
    "inputs": {
      "method": "GET",
      "uri": "https://graph.microsoft.com/v1.0/users/@{body('Get_requester_manager')?['id']}/manager",
      "headers": {
        "Authorization": "Bearer @{body('Get_token')?['access_token']}"
      }
    }
  }
}
```

### Manager Chain Escalation Pattern

```json
{
  "Escalation_tier1_notify_manager": {
    "type": "Scope",
    "actions": {
      "Notify_direct_manager": {
        "type": "Http",
        "inputs": {
          "method": "POST",
          "uri": "https://graph.microsoft.com/v1.0/users/@{body('Get_requester_manager')?['id']}/sendMail",
          "body": {
            "message": {
              "subject": "SLA Breach: Ticket @{triggerBody()?['TicketId']} needs your attention",
              "body": {
                "contentType": "HTML",
                "content": "<p>Ticket <b>@{triggerBody()?['TicketId']}</b> has breached SLA and requires your intervention.</p><table><tr><td>Issue</td><td>@{triggerBody()?['Title']}</td></tr><tr><td>Breached By</td><td>@{triggerBody()?['MinutesBreached']} minutes</td></tr><tr><td>Assigned To</td><td>@{triggerBody()?['AssignedTo']}</td></tr></table>"
              },
              "toRecipients": [{ "emailAddress": { "address": "@{body('Get_requester_manager')?['mail']}" } }]
            }
          }
        }
      }
    }
  },
  "Wait_for_manager_response": {
    "type": "Wait",
    "inputs": { "interval": { "unit": "Hour", "count": 2 } }
  },
  "Check_ticket_resolved": {
    "type": "ApiConnection",
    "inputs": {
      "method": "get",
      "path": "/v2/datasets/default.cds/tables/cr_tickets/items/@{triggerBody()?['TicketId']}"
    }
  },
  "If_still_unresolved_escalate_further": {
    "type": "If",
    "expression": {
      "and": [
        {
          "not": { "equals": ["@body('Check_ticket_resolved')?['cr_status']", 200000006] }
        }
      ]
    },
    "actions": {
      "Notify_skip_level_manager": { ... }
    }
  }
}
```

---

## Cross-Team Escalation

For issues that span multiple technical domains (e.g., VPN issue that's actually a network + Active Directory + certificate problem).

### Cross-Team Escalation Record

```json
POST /api/data/v9.2/cr_crossteamescalations
{
  "cr_ticketid@odata.bind": "/cr_tickets(<ticket-id>)",
  "cr_primaryteam": "Network Team",
  "cr_involvedteams": "[\"Network Team\",\"Active Directory Team\",\"PKI Team\"]",
  "cr_escalationreason": "VPN certificate validation failure — requires PKI and AD investigation",
  "cr_bridgeurl": "https://teams.microsoft.com/l/meetup-join/...",
  "cr_bridgetime": "2026-03-03T15:00:00Z",
  "cr_coordinator": "jane.smith@contoso.com"
}
```

### Cross-Team Teams Channel Bridge

```json
// Create a temporary Teams channel for cross-team collaboration
POST https://graph.microsoft.com/v1.0/teams/{itTeamId}/channels
{
  "displayName": "INC-2026-0042 — Cross-Team Bridge",
  "description": "Temporary channel for VPN outage investigation. Auto-archive in 7 days.",
  "membershipType": "private"
}

// Add members from each involved team
POST https://graph.microsoft.com/v1.0/teams/{teamId}/channels/{channelId}/members
{
  "@odata.type": "#microsoft.graph.aadUserConversationMember",
  "roles": ["member"],
  "user@odata.bind": "https://graph.microsoft.com/v1.0/users('{userId}')"
}
```

---

## External Vendor Escalation

When the issue requires third-party vendor involvement (hardware warranty, software vendor support, ISP outage).

### Vendor Escalation Email Template (Graph API)

```json
POST https://graph.microsoft.com/v1.0/users/{serviceAccountId}/sendMail
{
  "message": {
    "subject": "[URGENT] Support Case: @{variables('VendorCasePrefix')} — @{triggerBody()?['Title']}",
    "body": {
      "contentType": "HTML",
      "content": "<h2>Escalation to Vendor Support</h2><p>Dear @{variables('VendorContactName')},</p><p>We are escalating the following issue under our support agreement.</p><table border='1'><tr><th>Our Ticket</th><td>@{triggerBody()?['TicketId']}</td></tr><tr><th>Product/Service</th><td>@{triggerBody()?['AffectedProduct']}</td></tr><tr><th>Issue Summary</th><td>@{triggerBody()?['IssueSummary']}</td></tr><tr><th>Impact</th><td>@{triggerBody()?['ImpactStatement']}</td></tr><tr><th>Users Affected</th><td>@{triggerBody()?['UsersAffectedCount']}</td></tr><tr><th>Steps Taken</th><td>@{triggerBody()?['TroubleshootingSteps']}</td></tr><tr><th>SLA Tier</th><td>@{triggerBody()?['SupportTier']}</td></tr></table><p>Please acknowledge receipt and provide a case number within @{variables('VendorResponseSLAHours')} hours per our support agreement.</p><p>Contact: @{triggerBody()?['PrimaryContactEmail']}</p>"
    },
    "toRecipients": [
      { "emailAddress": { "address": "@{variables('VendorSupportEmail')}" } }
    ],
    "ccRecipients": [
      { "emailAddress": { "address": "it-management@contoso.com" } }
    ],
    "importance": "high"
  }
}
```

### Vendor SLA Tracking

```json
POST /api/data/v9.2/cr_vendorescalations
{
  "cr_ticketid@odata.bind": "/cr_tickets(<ticket-id>)",
  "cr_vendorname": "@{triggerBody()?['VendorName']}",
  "cr_vendorticketid": "",
  "cr_escalatedon": "@{utcNow()}",
  "cr_vendorresponsedue": "@{addHours(utcNow(), variables('VendorResponseSLAHours'))}",
  "cr_vendorresolutiondue": "@{addHours(utcNow(), variables('VendorResolutionSLAHours'))}",
  "cr_status": 200000001,
  "cr_escalatedby": "@{triggerBody()?['EscalatedByEmail']}"
}
```

---

## Executive Bridge Pattern

For P1/Critical incidents affecting executives or large user populations, invoke the executive bridge protocol.

### P1 Incident Detection and Bridge Initiation

```json
{
  "Check_P1_criteria": {
    "type": "If",
    "expression": {
      "or": [
        { "equals": ["@triggerBody()?['Priority']", 200000001] },
        { "greaterOrEquals": ["@triggerBody()?['UsersAffectedCount']", 100] },
        { "equals": ["@triggerBody()?['AffectsExecutives']", true] }
      ]
    },
    "actions": {
      "Initiate_executive_bridge": {
        "type": "Scope",
        "actions": {
          "Create_bridge_meeting": {
            "type": "Http",
            "inputs": {
              "method": "POST",
              "uri": "https://graph.microsoft.com/v1.0/users/{cioId}/onlineMeetings",
              "body": {
                "startDateTime": "@{addMinutes(utcNow(), 5)}",
                "endDateTime": "@{addHours(utcNow(), 2)}",
                "subject": "P1 INCIDENT BRIDGE: @{triggerBody()?['Title']}",
                "joinMeetingIdSettings": { "isPasscodeRequired": false }
              }
            }
          },
          "Send_bridge_invites": {
            "type": "Http",
            "inputs": {
              "method": "POST",
              "uri": "https://graph.microsoft.com/v1.0/me/events",
              "body": {
                "subject": "🔴 P1 INCIDENT BRIDGE: @{triggerBody()?['Title']}",
                "start": {
                  "dateTime": "@{addMinutes(utcNow(), 5)}",
                  "timeZone": "UTC"
                },
                "end": {
                  "dateTime": "@{addHours(utcNow(), 2)}",
                  "timeZone": "UTC"
                },
                "attendees": "@{variables('P1BridgeAttendees')}",
                "body": {
                  "contentType": "HTML",
                  "content": "<h2>P1 Incident Bridge</h2><p><strong>Incident:</strong> @{triggerBody()?['Title']}</p><p><strong>Impact:</strong> @{triggerBody()?['ImpactStatement']}</p><p><strong>Ticket:</strong> @{triggerBody()?['TicketId']}</p><p><strong>Bridge Lead:</strong> @{triggerBody()?['IncidentCommander']}</p>"
                },
                "isOnlineMeeting": true
              }
            }
          },
          "Post_P1_to_war_room_channel": {
            "type": "ApiConnection",
            "inputs": {
              "body": {
                "messageType": "message",
                "body": {
                  "content": "🔴 **P1 INCIDENT DECLARED** 🔴\n\n**@{triggerBody()?['Title']}**\n\nTicket: @{triggerBody()?['TicketId']}\nImpact: @{triggerBody()?['ImpactStatement']}\nUsers Affected: @{triggerBody()?['UsersAffectedCount']}\n\n📞 Bridge: @{body('Create_bridge_meeting')?['joinUrl']}"
                }
              }
            }
          }
        }
      }
    }
  }
}
```

### P1 Bridge Roles and Responsibilities

| Role | Responsibility |
|---|---|
| Incident Commander | Owns resolution; chairs bridge call; drives decisions |
| Technical Lead | Leads technical diagnosis and fix |
| Communications Lead | Updates stakeholders every 30 minutes |
| Management Bridge | CIO/VP availability; executive decisions only |
| Vendor Liaison | Manages vendor calls if third-party involved |
| Scribe | Documents timeline, decisions, and actions |

---

## Post-Incident Review Automation

After a P1/P2 incident is resolved, automatically initiate the post-incident review (PIR) process.

### Trigger PIR on Incident Closure

```json
// Dataverse trigger: When cr_ticket status changes to Resolved and priority = Critical
{
  "Initialize_PIR": {
    "type": "Scope",
    "actions": {
      "Calculate_incident_metrics": {
        "type": "Compose",
        "inputs": {
          "incidentId": "@{triggerBody()?['cr_ticketid']}",
          "duration_minutes": "@{div(sub(ticks(triggerBody()?['cr_resolvedon']), ticks(triggerBody()?['createdon'])), 600000000)}",
          "sla_breached": "@{greater(ticks(triggerBody()?['cr_resolvedon']), ticks(triggerBody()?['cr_sladuedate']))}",
          "sla_breach_minutes": "@{div(sub(ticks(triggerBody()?['cr_resolvedon']), ticks(triggerBody()?['cr_sladuedate'])), 600000000)}"
        }
      },
      "Create_PIR_record": {
        "type": "ApiConnection",
        "inputs": {
          "method": "post",
          "path": "/v2/datasets/default.cds/tables/cr_postincidentreviews/items",
          "body": {
            "cr_ticketid@odata.bind": "/cr_tickets(<ticket-id>)",
            "cr_incidenttitle": "@{triggerBody()?['cr_title']}",
            "cr_incidentdurationminutes": "@{outputs('Calculate_incident_metrics')?['duration_minutes']}",
            "cr_slabreached": "@{outputs('Calculate_incident_metrics')?['sla_breached']}",
            "cr_slabreachminutes": "@{outputs('Calculate_incident_metrics')?['sla_breach_minutes']}",
            "cr_reviewdue": "@{addDays(utcNow(), 3)}",
            "cr_status": 200000001,
            "cr_incidentcommander": "@{triggerBody()?['cr_incidentcommander']}"
          }
        }
      },
      "Schedule_PIR_meeting": {
        "type": "Http",
        "inputs": {
          "method": "POST",
          "uri": "https://graph.microsoft.com/v1.0/users/{incidentCommanderId}/events",
          "body": {
            "subject": "PIR: @{triggerBody()?['cr_title']} — @{triggerBody()?['cr_ticketid']}",
            "start": {
              "dateTime": "@{addDays(utcNow(), 2)}",
              "timeZone": "UTC"
            },
            "end": {
              "dateTime": "@{addDays(addHours(utcNow(), 1), 2)}",
              "timeZone": "UTC"
            },
            "body": {
              "contentType": "text",
              "content": "Post-Incident Review for @{triggerBody()?['cr_ticketid']}. Please review the incident timeline and prepare discussion on root cause, contributing factors, and action items."
            }
          }
        }
      }
    }
  }
}
```

### PIR Document Template (Auto-Generated)

```markdown
# Post-Incident Review: {TicketId}

## Incident Summary
- **Title**: {Title}
- **Severity**: P{Priority}
- **Duration**: {Duration} minutes
- **SLA**: {SLA_Status} ({SLA_Breach_Minutes} min over)
- **Users Affected**: {UsersAffectedCount}

## Timeline
| Time | Event | Actor |
|---|---|---|
| {T+0} | Incident detected | {DetectedBy} |
| {T+N} | Escalated to Tier 2 | |
| {T+N} | Root cause identified | |
| {T+N} | Fix implemented | |
| {T+N} | Incident resolved | |

## Root Cause Analysis
**5 Whys:**
1. Why? [surface symptom]
2. Why? [contributing factor]
3. Why? [deeper cause]
4. Why? [process failure]
5. Why? [root cause]

## Contributing Factors
- [ ] Missing monitoring/alerting
- [ ] Single point of failure
- [ ] Insufficient documentation
- [ ] Change management gap
- [ ] Capacity limitation

## Action Items
| Action | Owner | Due Date | Status |
|---|---|---|---|
| | | | |

## Lessons Learned
1.
2.
3.
```

---

## Runbook Handoff Documentation

When escalating, provide the receiving team with structured handoff documentation.

### Handoff Record Schema

```json
POST /api/data/v9.2/cr_escalationhandoffs
{
  "cr_ticketid@odata.bind": "/cr_tickets(<ticket-id>)",
  "cr_fromteam": "Tier 1 Support",
  "cr_toteam": "Tier 2 Network",
  "cr_escalatedon": "@{utcNow()}",
  "cr_escalatedby": "jane.smith@contoso.com",
  "cr_reason": "VPN issue not resolved after standard troubleshooting — requires network-level investigation",
  "cr_stepstaken": "1. Verified VPN client installed and updated\\n2. Checked user's AD account — active\\n3. Confirmed firewall rules allow UDP 1194\\n4. Error in event log: Certificate validation failed",
  "cr_currentstate": "User cannot connect to VPN. Error: 0x80090016. Client version 5.4.2",
  "cr_nextactions": "1. Check PKI certificate chain\\n2. Review AD CS configuration\\n3. Test with a different user account",
  "cr_artifacts": "Event log export attached as ticket note #3. Wireshark capture available on request.",
  "cr_priority": 200000002,
  "cr_sladuedate": "@{addHours(utcNow(), 2)}"
}
```

---

## Error Codes and Conditions

| Code / Condition | Meaning | Remediation |
|---|---|---|
| SLA check flow returns stale data | Dataverse query cache; flow runs too infrequently | Reduce recurrence interval; use event-based trigger on ticket update |
| Manager Graph API returns 404 | User has no manager assigned in Entra ID | Fall back to team DL; check org chart completeness in Entra |
| P1 bridge invite fails | Meeting organizer calendar full; permissions | Use service account as organizer; verify `Calendars.ReadWrite` permission |
| Cross-team channel not visible | Private channel — member not added | Verify `@{userId}` in member add call; check Graph `ChannelMember.ReadWrite.All` |
| Vendor email not acknowledged | Incorrect vendor email; email blocked by spam filter | Verify vendor contact; use certified email addresses; consider vendor portal submission |
| PIR auto-created for all tickets | Priority filter missing in trigger | Add `cr_priority eq 200000001` filter to Dataverse trigger |
| Executive bridge paging outside business hours | No on-call schedule check | Add time-of-day condition; integrate with PagerDuty/OpsGenie for on-call routing |

---

## Limits Table

| Resource | Limit | Notes |
|---|---|---|
| Graph API meeting creation | No hard limit | Rate limit: 30 calls/minute |
| Graph API sendMail | 30 per minute | Per user mailbox |
| Escalation chain depth | No platform limit | Practical: 4 levels (Tier 1 → Tier 2 → Manager → Director) |
| PIR storage retention | No platform limit | Dataverse capacity limits apply |
| Cross-team bridge channel members | 250 | Per private Teams channel |
| P1 bridge attendee list | 250 | Per calendar invite |
| Escalation log retention | Indefinite (in Dataverse) | Required for compliance audits |
