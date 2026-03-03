# Dynamics 365 Customer Service Reference

## Service Hub App Module

The Customer Service Hub app (`apps/Customer Service Hub`) is the primary agent experience. The Omnichannel for Customer Service extends it with live chat, SMS, and social channels.

## Core Customer Service Entities

### Case (Incident)

**Purpose:** A customer issue, request, or complaint requiring resolution.

**Key fields:**

| Field | Type | Description |
|---|---|---|
| `incidentid` | GUID | Primary key |
| `ticketnumber` | string | Auto-generated case number (e.g., CAS-01234) |
| `title` | string | Case subject |
| `description` | string | Case description |
| `prioritycode` | picklist | 1=High, 2=Normal, 3=Low |
| `casetypecode` | picklist | 1=Question, 2=Problem, 3=Request |
| `statecode` | state | 0=Active, 1=Resolved, 2=Cancelled |
| `statuscode` | status | 1=In Progress, 2=On Hold, 3=Waiting for Details, 4=Researching, 5=Problem Solved, 1000=Information Provided |
| `_customerid_value` | GUID | Customer (account or contact) |
| `_primarycontactid_value` | GUID | Primary contact |
| `_ownerid_value` | GUID | Assigned owner |
| `_slaid_value` | GUID | Applied SLA |
| `_subjectid_value` | GUID | Subject (category tree) |
| `_contractid_value` | GUID | Linked service contract |
| `firstresponseslastatus` | picklist | 1=In Progress, 2=Warning, 3=Succeeded, 4=Noncompliant |
| `resolvebykpiid` | lookup | Resolve-by KPI instance |
| `followupby` | datetime | Follow-up reminder date |
| `activitiescomplete` | bool | All related activities closed |

**Case origin codes:**

| Value | Label |
|---|---|
| 1 | Phone |
| 2 | Email |
| 3 | Web |
| 2483 | Facebook |
| 3986 | Twitter |
| 700610 | IoT |

### ResolveIncident Action

```http
POST {orgUrl}/api/data/v9.2/ResolveIncident
{
  "IncidentResolution": {
    "@odata.type": "Microsoft.Dynamics.CRM.incidentresolution",
    "incidentid@odata.bind": "/incidents/{caseId}",
    "subject": "Resolved — VPN firmware updated to v2.3",
    "description": "Root cause: outdated VPN firmware. Applied firmware update v2.3.",
    "timespent": 45,
    "billabletime": 30
  },
  "Status": 5
}
```

**`timespent`** and **`billabletime`** are in minutes.

### Reopen Case (after resolution)

```http
PATCH {orgUrl}/api/data/v9.2/incidents({caseId})
{
  "statecode": 0,
  "statuscode": 1
}
```

### Escalation

Escalation changes the priority, owner, or queue assignment. Trigger escalation via:

1. PATCH priority to High
2. Reassign to escalation queue or senior agent
3. Add escalation comment to timeline

No native `EscalateCase` action exists — implement as a Power Automate flow or use business rules.

## Queues

### Queue Types

| `queueviewtype` | Description |
|---|---|
| 0 | Public queue (visible to all) |
| 1 | Private queue (visible to members only) |

### List Cases in Queue

```http
GET {orgUrl}/api/data/v9.2/queueitems
  ?$filter=_queueid_value eq {queueId} and objecttypecode eq 112
  &$expand=objectid_incident($select=ticketnumber,title,prioritycode,statecode,statuscode)
  &$orderby=createdon asc
```

`objecttypecode` for Case = 112.

### Route Case to Specific Agent

```http
POST {orgUrl}/api/data/v9.2/queueitems({queueItemId})/Microsoft.Dynamics.CRM.PickFromQueue
{
  "WorkerId": "{systemUserId}",
  "RemoveQueueItem": false
}
```

### Release Queue Item (unassign)

```http
POST {orgUrl}/api/data/v9.2/queueitems({queueItemId})/Microsoft.Dynamics.CRM.ReleaseToQueue
{}
```

### Remove Queue Item

```http
POST {orgUrl}/api/data/v9.2/queueitems({queueItemId})/Microsoft.Dynamics.CRM.RemoveFromQueue
{}
```

## SLA Management

### SLA Types

| `slainvokedid.slainvokedidType` | Description |
|---|---|
| Standard SLA | Pauses when case put On Hold |
| Enhanced SLA | Supports multiple KPIs (first response, resolve by, custom) |

### SLA KPI Instances

Each SLA applied to a case creates `slakpiinstances` records tracking individual KPIs.

```http
GET {orgUrl}/api/data/v9.2/slakpiinstances
  ?$filter=_regarding_value eq {caseId}
  &$select=name,status,warningtime,failuretime,computedfailuretime,succeededon
  &$expand=slakpiid($select=name,kpifield)
```

**KPI status values:**

| `status` | Meaning |
|---|---|
| 1 | In Progress |
| 2 | Succeeded (met SLA) |
| 3 | Noncompliant (breached) |
| 4 | Paused |
| 5 | Warning (approaching breach) |
| 6 | Canceled |

### Pause SLA (On Hold)

Setting case to On Hold status automatically pauses the SLA timer (for Enhanced SLAs):

```http
PATCH {orgUrl}/api/data/v9.2/incidents({caseId})
{
  "statecode": 0,
  "statuscode": 2
}
```

Resume by setting status back to In Progress (statuscode 1).

## Knowledge Base

### Knowledge Article Statuses

| `statecode` | `statuscode` | Meaning |
|---|---|---|
| 0 | 1 | Draft |
| 0 | 2 | Approved |
| 0 | 7 | Scheduled |
| 1 | 3 | Published |
| 2 | 4 | Expired |
| 3 | 6 | Archived |
| 4 | 5 | Discarded |

### Search Knowledge Articles

```http
GET {orgUrl}/api/data/v9.2/knowledgearticles
  ?$select=knowledgearticleid,title,description,keywords,statecode
  &$filter=statecode eq 1 and contains(keywords, 'vpn')
  &$orderby=rating desc
  &$top=10
```

### Full-Text Search (RetrieveByTopIncidentSubjectKbArticle)

```http
POST {orgUrl}/api/data/v9.2/RetrieveByTopIncidentSubjectKbArticle
{
  "SubjectId": "{subjectId}",
  "UseInflection": true
}
```

### Associate Knowledge Article with Case

```http
POST {orgUrl}/api/data/v9.2/incidents({caseId})/knowledgearticle_incidents/$ref
{
  "@odata.id": "{orgUrl}/api/data/v9.2/knowledgearticles({articleId})"
}
```

### Create Knowledge Article

```http
POST {orgUrl}/api/data/v9.2/knowledgearticles
{
  "title": "How to troubleshoot VPN disconnections",
  "keywords": "vpn disconnect remote access",
  "description": "Steps to resolve frequent VPN disconnections.",
  "content": "<h2>Steps</h2><ol><li>Check firmware version...</li></ol>",
  "languagelocaleid@odata.bind": "/languagelocale(1033)"
}
```

### Publish Knowledge Article

```http
POST {orgUrl}/api/data/v9.2/knowledgearticles({articleId})/Microsoft.Dynamics.CRM.SetStateKnowledgeArticle
{
  "Status": 3,
  "StateCode": 1,
  "EntityMoniker": {
    "Id": "{articleId}",
    "LogicalName": "knowledgearticle"
  }
}
```

## Entitlements

Entitlements track support limits (by cases or hours) allocated to a customer.

**Key fields:** `name`, `entitlementtypecode` (1=Number of Cases, 2=Number of Hours), `totalterms`, `remainingterms`, `startdate`, `enddate`, `_customerid_value`

```http
POST {orgUrl}/api/data/v9.2/entitlements
{
  "name": "Contoso — 10 Cases / Year",
  "entitlementtypecode": 1,
  "totalterms": 10,
  "startdate": "2026-01-01",
  "enddate": "2026-12-31",
  "customerid_account@odata.bind": "/accounts/{accountId}",
  "statecode": 0
}
```

**Activate entitlement:**

```http
POST {orgUrl}/api/data/v9.2/SetStateEntitlement
{
  "EntityMoniker": { "Id": "{entitlementId}", "LogicalName": "entitlement" },
  "State": { "Value": 1 },
  "Status": { "Value": 1 }
}
```

## Routing Rules

**Routing rule sets** (`routingrulesets`) define ordered rules for automatic case assignment.

```http
GET {orgUrl}/api/data/v9.2/routingrulesets
  ?$select=name,isactiverule
  &$filter=isactiverule eq true
```

**Evaluate routing rule manually:**

```http
POST {orgUrl}/api/data/v9.2/ApplyRoutingRule
{
  "Target": {
    "incidentid": "{caseId}",
    "@odata.type": "Microsoft.Dynamics.CRM.incident"
  }
}
```

## Case Merge

Merge duplicate cases (retains data from primary):

```http
POST {orgUrl}/api/data/v9.2/MergeIncident
{
  "Target": {
    "incidentid": "{primaryCaseId}",
    "@odata.type": "Microsoft.Dynamics.CRM.incident"
  },
  "SubordinateId": "{duplicateCaseId}",
  "PerformParentingChecks": false
}
```

## Subject Tree (Case Classification)

The subject tree (`subjects`) organizes cases into categories. Retrieve the subject tree:

```http
GET {orgUrl}/api/data/v9.2/subjects
  ?$select=subjectid,title,description
  &$filter=_parentsubject_value eq null
  &$expand=Subject_SubjectOf($select=subjectid,title)
```

## Business Hours and Calendars

Customer Service uses service calendars for SLA time calculations during business hours.

```http
GET {orgUrl}/api/data/v9.2/calendars
  ?$select=calendarid,name,type
  &$filter=type eq 2
```

Calendar types: 0=Inner Calendar, 1=Calendar Rules, 2=Service Level Agreement, 3=Business Closure

## Service Level Targets (Common SLAs)

| Industry standard | First response (High) | First response (Normal) | Resolution (High) | Resolution (Normal) |
|---|---|---|---|---|
| IT helpdesk tier 1 | 1 hour | 4 hours | 8 hours | 24 hours |
| IT helpdesk tier 2 | 2 hours | 8 hours | 24 hours | 72 hours |
| Enterprise support | 15 min | 1 hour | 4 hours | 8 hours |
| Standard support | 1 hour | 4 hours | 1 business day | 3 business days |

## Case Metrics Aggregation

**Open cases by queue and priority:**

```kql
/api/data/v9.2/incidents
  ?$apply=filter(statecode eq 0)
    /groupby((prioritycode,_owningqueue_value),aggregate($count as caseCount))
  &$expand=_owningqueue_value($select=name)
```

**Average resolution time (last 30 days):**

```
/api/data/v9.2/incidents
  ?$apply=filter(statecode eq 1 and resolvedon ge {30DaysAgo})
    /aggregate(actualserviceunits with average as avgResolutionMinutes)
```

`actualserviceunits` stores the resolution time in minutes.
