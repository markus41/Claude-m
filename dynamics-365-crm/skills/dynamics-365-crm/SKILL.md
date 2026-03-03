---
name: dynamics-365-crm
description: Deep expertise in Dynamics 365 Sales and Customer Service via Dataverse Web API — managing leads, opportunities, accounts, contacts, cases, SLAs, queues, and routing rules; generating pipeline forecasts; automating CRM workflows with Power Automate; and operating the CRM business application layer built on Dataverse.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
triggers:
  - dynamics 365
  - dynamics crm
  - d365
  - D365 Sales
  - D365 Customer Service
  - crm
  - lead
  - qualify lead
  - opportunity
  - account management
  - contact management
  - sales pipeline
  - pipeline forecast
  - deal
  - quote
  - order
  - case management
  - customer case
  - support ticket
  - service case
  - SLA
  - queue management
  - routing rule
  - escalation
  - knowledge base
  - knowledge article
  - field service
  - activity log
  - task activity
  - phone call activity
  - appointment crm
  - email activity
  - dataverse crm
  - web api crm
  - fetchxml crm
  - business rule
  - rollup field
  - process flow
  - business process flow
  - power automate crm
---

# Dynamics 365 Sales and Customer Service via Dataverse Web API

This skill provides comprehensive knowledge for operating the Dynamics 365 Sales and Customer Service business application layer on top of Dataverse. It covers the full CRM record lifecycle, pipeline management, case and queue operations, SLA management, and CRM workflow automation via Power Automate.

## Integration Context Contract

- Canonical contract: [`docs/integration-context.md`](../../../docs/integration-context.md)

| Workflow | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Dynamics 365 Sales (leads, opps, accounts) | required | — | `AzureCloud`* | `service-principal` | D365 Sales app access + `systemuser` record in org |
| Dynamics 365 Customer Service (cases, queues) | required | — | `AzureCloud`* | `service-principal` | D365 Customer Service app access + `systemuser` record |
| Full Dataverse Web API (any table) | required | — | `AzureCloud`* | `service-principal` | `Dataverse User` role minimum; `System Administrator` for schema changes |
| Power Automate CRM flows | required | — | `AzureCloud`* | `delegated-user` | Environment Maker + D365 app access |

\* Use sovereign cloud values from the canonical contract when applicable.

**Required auth parameters for every CRM workflow:**

- `tenantId` — Entra ID tenant GUID
- `orgUrl` — Dynamics 365 organization URL: `https://{orgName}.crm.dynamics.com`
- Service principal must have a `systemuser` record in the Dynamics org (auto-created on first login or via admin API)

Fail fast when `orgUrl` is missing or the service principal lacks a `systemuser` record. Redact org URL and record GUIDs in error output.

## Dataverse Web API Overview

All Dynamics 365 data operations use the Dataverse Web API:

```
{orgUrl}/api/data/v9.2/{entitySetName}
```

API version 9.2 is stable and supports all CRM entities, actions, and functions.

### Authentication

```typescript
import { ClientSecretCredential } from "@azure/identity";

const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
const token = await credential.getToken("https://org.crm.dynamics.com/.default");

// All requests include:
// Authorization: Bearer {token}
// OData-MaxVersion: 4.0
// OData-Version: 4.0
// Accept: application/json
// Content-Type: application/json
```

### Key Entity Set Names

| Dynamics 365 entity | API entity set | Primary key |
|---|---|---|
| Lead | `leads` | `leadid` |
| Opportunity | `opportunities` | `opportunityid` |
| Account | `accounts` | `accountid` |
| Contact | `contacts` | `contactid` |
| Quote | `quotes` | `quoteid` |
| Order (Sales Order) | `salesorders` | `salesorderid` |
| Invoice | `invoices` | `invoiceid` |
| Product | `products` | `productid` |
| Case (Incident) | `incidents` | `incidentid` |
| Queue | `queues` | `queueid` |
| Queue Item | `queueitems` | `queueitemid` |
| Knowledge Article | `knowledgearticles` | `knowledgearticleid` |
| SLA | `slas` | `slaid` |
| Activity (base) | `activitypointers` | `activityid` |
| Task | `tasks` | `activityid` |
| Phone Call | `phonecalls` | `activityid` |
| Email | `emails` | `activityid` |
| Appointment | `appointments` | `activityid` |

### OData Query Patterns

**Retrieve with $select and $expand:**

```http
GET {orgUrl}/api/data/v9.2/leads?$select=leadid,fullname,companyname,emailaddress1,statuscode,estimatedvalue&$filter=statecode eq 0 and statuscode eq 1&$orderby=createdon desc&$top=50
```

**Expand related records:**

```http
GET {orgUrl}/api/data/v9.2/opportunities?$select=opportunityid,name,estimatedvalue,stepname,closeprobability,estimatedclosedate&$expand=parentaccountid($select=name,accountnumber)&$filter=statecode eq 0
```

**Pagination ($skiptoken):**

```
Prefer: odata.maxpagesize=100
```

Follow `@odata.nextLink` in the response to retrieve subsequent pages.

## Dynamics 365 Sales

### Lead Management

**Lead statuses:**

| `statecode` | `statuscode` | Meaning |
|---|---|---|
| 0 | 1 | Open — New |
| 0 | 2 | Open — Contacted |
| 0 | 3 | Open — Qualified |
| 1 | 4 | Qualified (closed-won) |
| 2 | 5 | Disqualified (closed-lost) |

**Create lead:**

```http
POST {orgUrl}/api/data/v9.2/leads
{
  "firstname": "Jane",
  "lastname": "Smith",
  "fullname": "Jane Smith",
  "companyname": "Contoso Ltd",
  "emailaddress1": "jane.smith@contoso.com",
  "telephone1": "+1-555-0100",
  "subject": "Interest in Enterprise Plan",
  "description": "Came from website demo request",
  "estimatedvalue": 50000,
  "estimatedclosedate": "2026-06-30",
  "leadsourcecode": 8
}
```

**Qualify a lead (standard action):**

The `QualifyLead` Dataverse action converts a lead into an opportunity, account, and/or contact.

```http
POST {orgUrl}/api/data/v9.2/leads({leadId})/Microsoft.Dynamics.CRM.QualifyLead
{
  "CreateAccount": true,
  "CreateContact": true,
  "CreateOpportunity": true,
  "Status": 3,
  "OpportunityCurrencyId": {
    "transactioncurrencyid": "{usd-currency-id}",
    "@odata.type": "Microsoft.Dynamics.CRM.transactioncurrency"
  }
}
```

Response: includes `opportunityid`, `accountid`, `contactid` of created records.

### Opportunity Management

**Opportunity pipeline stages (BPF — Sales Process):**

| Stage | `stepname` | Typical close probability |
|---|---|---|
| Qualify | `Qualify` | 10% |
| Develop | `Develop` | 20% |
| Propose | `Propose` | 50% |
| Close | `Close` | 80% |

**Create opportunity:**

```http
POST {orgUrl}/api/data/v9.2/opportunities
{
  "name": "Contoso — Enterprise Cloud Migration",
  "estimatedvalue": 120000,
  "estimatedclosedate": "2026-09-30",
  "closeprobability": 50,
  "stepname": "Propose",
  "description": "Full Azure migration project",
  "parentaccountid@odata.bind": "/accounts({accountId})"
}
```

**Win opportunity:**

```http
POST {orgUrl}/api/data/v9.2/WinOpportunity
{
  "OpportunityClose": {
    "opportunityid@odata.bind": "/opportunities/{opportunityId}",
    "subject": "Won — Contoso Enterprise",
    "actualrevenue": 120000,
    "actualclosedate": "2026-06-15",
    "description": "Signed contract received"
  },
  "Status": 3
}
```

**Lose opportunity:**

```http
POST {orgUrl}/api/data/v9.2/LoseOpportunity
{
  "OpportunityClose": {
    "opportunityid@odata.bind": "/opportunities/{opportunityId}",
    "subject": "Lost — Contoso to Competitor",
    "competitorid@odata.bind": "/competitors/{competitorId}"
  },
  "Status": 4
}
```

### Pipeline Reporting

**Aggregate pipeline by owner and stage:**

```http
GET {orgUrl}/api/data/v9.2/opportunities?$select=name,estimatedvalue,stepname,estimatedclosedate,closeprobability&$expand=owninguser($select=fullname)&$filter=statecode eq 0&$orderby=estimatedclosedate asc
```

**Weighted pipeline value:** `estimatedvalue * closeprobability / 100` per opportunity.

## Dynamics 365 Customer Service

### Case (Incident) Management

**Case priorities:**

| `prioritycode` | Display |
|---|---|
| 1 | High |
| 2 | Normal |
| 3 | Low |

**Case statuses:**

| `statecode` | `statuscode` | Meaning |
|---|---|---|
| 0 | 1 | Active — In Progress |
| 0 | 2 | Active — On Hold |
| 0 | 3 | Active — Waiting for Details |
| 0 | 4 | Active — Researching |
| 1 | 5 | Resolved |
| 2 | 6 | Cancelled |

**Create case:**

```http
POST {orgUrl}/api/data/v9.2/incidents
{
  "title": "Cannot connect to VPN — remote site",
  "description": "User reports VPN drops every 30 minutes since yesterday.",
  "prioritycode": 1,
  "casetypecode": 1,
  "customerid_account@odata.bind": "/accounts/{accountId}",
  "primarycontactid@odata.bind": "/contacts/{contactId}",
  "subjectid@odata.bind": "/subjects/{subjectId}"
}
```

**Resolve case:**

```http
POST {orgUrl}/api/data/v9.2/ResolveIncident
{
  "IncidentResolution": {
    "incidentid@odata.bind": "/incidents/{caseId}",
    "subject": "Resolved — VPN firmware updated",
    "description": "Updated firmware on remote router resolved the issue.",
    "timespent": 60
  },
  "Status": 5
}
```

### Queue Management

**Add case to queue:**

```http
POST {orgUrl}/api/data/v9.2/queueitems
{
  "objectid_incident@odata.bind": "/incidents/{caseId}",
  "queueid@odata.bind": "/queues/{queueId}"
}
```

**Pick queue item (assign to current user):**

```http
POST {orgUrl}/api/data/v9.2/PickFromQueue
{
  "QueueItemId": "{queueItemId}",
  "WorkerId": "{systemUserId}",
  "RemoveQueueItem": false
}
```

**Routing rule evaluation** is triggered automatically when a case matches a rule condition. Manual evaluation:

```http
POST {orgUrl}/api/data/v9.2/ApplyRoutingRule
{
  "Target": {
    "incidentid": "{caseId}",
    "@odata.type": "Microsoft.Dynamics.CRM.incident"
  }
}
```

### SLA Management

**SLA KPI (service level agreement key performance indicator):**

Each case with an SLA applied gets `slainvokedid` set. Monitor SLA KPI status via `slakpiinstances`:

```http
GET {orgUrl}/api/data/v9.2/slakpiinstances?$filter=_regarding_value eq {caseId}&$select=name,status,failuretime,warningtime,computedfailuretime
```

| `status` | Meaning |
|---|---|
| 1 | In Progress |
| 2 | Succeeded |
| 3 | Noncompliant |
| 4 | Paused |
| 5 | Warning |

## Activity Logging

Log activities against CRM records to create the interaction audit trail.

**Create task against opportunity:**

```http
POST {orgUrl}/api/data/v9.2/tasks
{
  "subject": "Follow-up call — Q2 contract review",
  "description": "Discuss renewal terms and expansion scope.",
  "scheduledend": "2026-03-15T14:00:00Z",
  "prioritycode": 2,
  "regardingobjectid_opportunity@odata.bind": "/opportunities/{opportunityId}"
}
```

**Log phone call (completed):**

```http
POST {orgUrl}/api/data/v9.2/phonecalls
{
  "subject": "Discovery call",
  "directioncode": true,
  "actualend": "2026-03-10T10:30:00Z",
  "statecode": 1,
  "statuscode": 2,
  "regardingobjectid_opportunity@odata.bind": "/opportunities/{opportunityId}"
}
```

## Business Rules and Rollup Fields

- **Business rules**: Configured in the Dataverse maker portal; enforced on both client and server for field validation, default values, and visibility rules.
- **Rollup fields**: Aggregate child records (e.g., sum of opportunity revenue by account). Recalculate via `CalculateRollupField` action:

```http
POST {orgUrl}/api/data/v9.2/CalculateRollupField
{
  "Target": { "accountid": "{accountId}", "@odata.type": "Microsoft.Dynamics.CRM.account" },
  "FieldName": "opportunities_sum_estimatedvalue"
}
```

## Error Handling

| HTTP status | OData error code | Cause |
|---|---|---|
| 401 | `0x80040220` | Service principal lacks `systemuser` record |
| 403 | `0x80040214` | Missing security role or field-level security |
| 404 | `0x80040217` | Record not found (wrong GUID or deleted) |
| 400 | `0x80048408` | Duplicate detection rule violation |
| 400 | `0x8004B400` | Required field missing |
| 429 | `0x80072328` | API throttling — add Retry-After backoff |

**Rate limits:** 6,000 API requests per 5-minute window per user. Use `$batch` (OData $batch) for bulk operations to stay within limits.

## Output Convention

Every operation produces a structured markdown report:

1. **Header**: operation, timestamp, org URL
2. **Record summary**: entity type, ID, key fields
3. **Action result**: what was created/updated/closed
4. **Pipeline table** (for reporting commands): stage, owner, value, probability, close date
5. **Recommendations**: next steps, data quality notes

## Reference Files

| Reference | Path | Topics |
|---|---|---|
| D365 Sales Reference | `references/d365-sales-reference.md` | Leads, opportunities, accounts, contacts, quotes, orders, pipeline reporting, BPF stages |
| D365 Customer Service Reference | `references/d365-customer-service-reference.md` | Cases, queues, SLAs, routing rules, knowledge base, entitlements, escalation paths |

## Progressive Disclosure — Reference Files

| Topic | File |
|---|---|
| D365 Sales entities (leads, opportunities, accounts, contacts, quotes, orders) | [`references/d365-sales-reference.md`](./references/d365-sales-reference.md) |
| D365 Customer Service entities (cases, queues, SLAs, routing, knowledge base) | [`references/d365-customer-service-reference.md`](./references/d365-customer-service-reference.md) |
| Dataverse entity metadata, relationship types, custom entities, party lists | [`references/entities-relationships.md`](./references/entities-relationships.md) |
| FetchXML, OData query syntax, views API, form XML structure | [`references/forms-views-queries.md`](./references/forms-views-queries.md) |
| Plugins (IPlugin), Custom APIs, Power Automate flows, Business Process Flows | [`references/plugins-workflows.md`](./references/plugins-workflows.md) |
| Dataverse Web API auth, $batch, change tracking, audit log, virtual/elastic tables, Fabric Link | [`references/dataverse-integration.md`](./references/dataverse-integration.md) |
