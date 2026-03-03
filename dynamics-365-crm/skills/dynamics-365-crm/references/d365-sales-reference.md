# Dynamics 365 Sales Reference

## Sales Hub App Modules

Dynamics 365 Sales ships three app modules:

| App module | URI pattern | Audience |
|---|---|---|
| Sales Hub | `apps/Sales Hub` | Sales reps and managers — primary experience |
| Sales Insights | `apps/Sales Insights` | AI-driven forecasting and coaching |
| App for Outlook | `apps/App for Outlook` | Email tracking and CRM sync |

## Core Sales Entities

### Lead

**Purpose:** An unqualified prospect — not yet a customer.

**Key fields:**

| Field | Type | Description |
|---|---|---|
| `leadid` | GUID | Primary key |
| `fullname` | string | First + last name |
| `companyname` | string | Company |
| `emailaddress1` | string | Primary email |
| `telephone1` | string | Business phone |
| `subject` | string | Topic / interest |
| `estimatedvalue` | money | Estimated deal value |
| `estimatedclosedate` | date | Expected close |
| `leadsourcecode` | picklist | Lead source (see below) |
| `industrycode` | picklist | Industry |
| `statecode` | state | 0=Open, 1=Qualified, 2=Disqualified |
| `statuscode` | status | 1=New, 2=Contacted, 3=Qualified, 4=Lost, 5=Cannot Contact, 6=No Longer Interested |
| `ownerid` | lookup | Assigned owner |
| `_parentaccountid_value` | GUID | Associated account (if any) |
| `_parentcontactid_value` | GUID | Associated contact (if any) |

**Lead source codes:**

| Value | Label |
|---|---|
| 1 | Advertisement |
| 2 | Employee Referral |
| 3 | External Referral |
| 5 | Partner |
| 8 | Web |
| 9 | Word of Mouth |
| 10 | Other |

**Rating codes:** 1=Hot, 2=Warm, 3=Cold

### QualifyLead Action

Converts a lead to Account + Contact + Opportunity. This is a Dataverse bound action:

```http
POST {orgUrl}/api/data/v9.2/leads({leadId})/Microsoft.Dynamics.CRM.QualifyLead
Content-Type: application/json

{
  "CreateAccount": true,
  "CreateContact": true,
  "CreateOpportunity": true,
  "Status": 3,
  "OpportunityCurrencyId": {
    "transactioncurrencyid": "{currency-id}",
    "@odata.type": "Microsoft.Dynamics.CRM.transactioncurrency"
  }
}
```

Response includes created record references:
```json
{
  "@odata.context": "...",
  "value": [
    { "opportunityid": "{id}", "@odata.type": "#Microsoft.Dynamics.CRM.opportunity" },
    { "accountid": "{id}", "@odata.type": "#Microsoft.Dynamics.CRM.account" },
    { "contactid": "{id}", "@odata.type": "#Microsoft.Dynamics.CRM.contact" }
  ]
}
```

### Opportunity

**Purpose:** A qualified sales deal in progress.

**Key fields:**

| Field | Type | Description |
|---|---|---|
| `opportunityid` | GUID | Primary key |
| `name` | string | Opportunity name |
| `estimatedvalue` | money | Est. revenue |
| `actualvalue` | money | Actual revenue (set on close) |
| `estimatedclosedate` | date | Expected close date |
| `actualclosedate` | date | Actual close date |
| `closeprobability` | int | Close probability 0–100 |
| `stepname` | string | Current BPF stage name |
| `statecode` | state | 0=Open, 1=Won, 2=Lost |
| `statuscode` | status | 1=In Progress, 2=On Hold (open); 3=Won, 4=Canceled, 5=Out-Sold (closed) |
| `_parentaccountid_value` | GUID | Account |
| `_parentcontactid_value` | GUID | Primary contact |
| `_ownerid_value` | GUID | Owner |
| `_pricelevelid_value` | GUID | Price list |
| `_transactioncurrencyid_value` | GUID | Currency |
| `opportunityratingcode` | picklist | 1=Hot, 2=Warm, 3=Cold |

**Business Process Flow (Sales Process) stages:**

1. Qualify — identify the opportunity
2. Develop — understand requirements and solution fit
3. Propose — present proposal/quote
4. Close — negotiate and sign

**WinOpportunity action:**

```http
POST {orgUrl}/api/data/v9.2/WinOpportunity
{
  "OpportunityClose": {
    "opportunityid@odata.bind": "/opportunities/{opportunityId}",
    "subject": "Won — Deal closed",
    "actualrevenue": 75000,
    "actualclosedate": "2026-03-10",
    "description": "Signed MSA and SOW received"
  },
  "Status": 3
}
```

**LoseOpportunity action:**

```http
POST {orgUrl}/api/data/v9.2/LoseOpportunity
{
  "OpportunityClose": {
    "opportunityid@odata.bind": "/opportunities/{opportunityId}",
    "subject": "Lost — Competitor selected",
    "competitorid@odata.bind": "/competitors/{competitorId}",
    "description": "Customer chose competitor on price"
  },
  "Status": 4
}
```

### Account

**Purpose:** A company or organization.

**Key fields:**

| Field | Type | Description |
|---|---|---|
| `accountid` | GUID | Primary key |
| `name` | string | Account name |
| `accountnumber` | string | Account number |
| `websiteurl` | string | Website |
| `emailaddress1` | string | Email |
| `telephone1` | string | Phone |
| `revenue` | money | Annual revenue |
| `numberofemployees` | int | Employee count |
| `industrycode` | picklist | Industry |
| `accountcategorycode` | picklist | 1=Preferred, 2=Standard |
| `customertypecode` | picklist | Customer type |
| `_primarycontactid_value` | GUID | Primary contact |
| `_ownerid_value` | GUID | Owner |

**Relationship types:** Use `parentaccountid` for parent company hierarchy.

### Contact

**Purpose:** An individual person, typically associated with an Account.

**Key fields:**

| Field | Type | Description |
|---|---|---|
| `contactid` | GUID | Primary key |
| `fullname` | string | Full name |
| `firstname` | string | First name |
| `lastname` | string | Last name |
| `emailaddress1` | string | Primary email |
| `telephone1` | string | Business phone |
| `mobilephone` | string | Mobile |
| `jobtitle` | string | Job title |
| `department` | string | Department |
| `_accountid_value` | GUID | Parent account |
| `_parentcustomerid_value` | GUID | Parent customer (account or contact) |

## Quotes, Orders, and Invoices

### Sales Document Flow

```
Lead → Opportunity → Quote → Order → Invoice
```

**Quote statuses:**

| `statecode` | Meaning |
|---|---|
| 0 | Active (Draft, In Progress) |
| 1 | Won |
| 2 | Closed (Canceled, Revised) |

**Convert Quote to Order (CalculatePrice action + Create Order):**

Quotes are converted via `ConvertQuoteToSalesOrder` action (available in classic UI). Via Web API, create a `salesorder` with the same line items and link to the opportunity.

**Order statuses:**

| `statecode` | `statuscode` | Meaning |
|---|---|---|
| 0 | 1 | New |
| 0 | 2 | Pending |
| 1 | 3 | Complete |
| 2 | 4 | Canceled |
| 3 | 6 | Invoiced |

### Quote/Order Product (Line Items)

Entity set: `quotedetails` (quote lines), `salesorderdetails` (order lines), `invoicedetails` (invoice lines)

```http
POST {orgUrl}/api/data/v9.2/quotedetails
{
  "quoteid@odata.bind": "/quotes/{quoteId}",
  "productid@odata.bind": "/products/{productId}",
  "quantity": 5,
  "priceperunit": 1000,
  "uomid@odata.bind": "/uoms/{uomId}",
  "ispriceoverridden": false
}
```

## Pipeline Forecasting

### Forecast Configuration

Forecasting is configured via the Sales Hub app settings. Forecast categories map to opportunity status:

| Forecast category | `forecastcategoryname` | Typical probability |
|---|---|---|
| Won | `Won` | 100% |
| Committed | `Committed` | 80–100% |
| Best Case | `BestCase` | 40–79% |
| Pipeline | `Pipeline` | 1–39% |
| Omitted | `Omitted` | 0% |

### Pipeline Query (via Web API)

```http
GET {orgUrl}/api/data/v9.2/opportunities
  ?$select=name,estimatedvalue,closeprobability,stepname,estimatedclosedate,forecastcategoryname
  &$expand=owninguser($select=fullname),parentaccountid($select=name)
  &$filter=statecode eq 0 and estimatedclosedate ge {start} and estimatedclosedate le {end}
  &$orderby=estimatedclosedate asc
```

**Weighted pipeline value calculation:**

```typescript
const weightedValue = opportunities.reduce((sum, opp) => {
  return sum + (opp.estimatedvalue * opp.closeprobability / 100);
}, 0);
```

### Forecast API

The Forecast API is available under the `msdyn_forecastinstances` entity (Sales Insights required).

```http
GET {orgUrl}/api/data/v9.2/msdyn_forecastinstances
  ?$select=msdyn_forecastinstanceid,msdyn_forecastdefinitionname,msdyn_internalvalue,msdyn_manualvalue
  &$filter=msdyn_forecastperiodstartdate ge {start}
```

## Competitors

**Create competitor:**

```http
POST {orgUrl}/api/data/v9.2/competitors
{
  "name": "Acme Corp",
  "websiteurl": "https://acme.example.com",
  "strengths": "Lower price",
  "weaknesses": "No enterprise support",
  "opportunities": "Price-sensitive prospects"
}
```

**Associate competitor with opportunity:**

```http
POST {orgUrl}/api/data/v9.2/opportunities({oppId})/competitor_associations/$ref
{
  "@odata.id": "{orgUrl}/api/data/v9.2/competitors({competitorId})"
}
```

## Goals and Metrics

**Goal entity:** `goals` with related `goalmetrics` (revenue, count).

```http
POST {orgUrl}/api/data/v9.2/goals
{
  "title": "Q2 2026 Revenue — Jane Smith",
  "metricid@odata.bind": "/metrics/{revenueMetricId}",
  "ownerid@odata.bind": "/systemusers/{userId}",
  "goalstartdate": "2026-04-01",
  "goalenddate": "2026-06-30",
  "targetsalesorders_base": 0,
  "targetmoney": 200000
}
```

## Sales Territories

**Create territory:**

```http
POST {orgUrl}/api/data/v9.2/territories
{
  "name": "Northeast US",
  "description": "NY, NJ, CT, MA",
  "managerid@odata.bind": "/systemusers/{managerId}"
}
```

**Assign account to territory:**

```http
PATCH {orgUrl}/api/data/v9.2/accounts({accountId})
{
  "territoryid@odata.bind": "/territories/{territoryId}"
}
```

## Activity Tracking

**Complete task:**

```http
PATCH {orgUrl}/api/data/v9.2/tasks({taskId})
{
  "statecode": 1,
  "statuscode": 5,
  "actualend": "2026-03-10T14:00:00Z"
}
```

**Send email activity:**

```http
POST {orgUrl}/api/data/v9.2/emails
{
  "subject": "Follow-up on proposal",
  "directioncode": true,
  "regardingobjectid_opportunity@odata.bind": "/opportunities/{opportunityId}",
  "email_activity_parties": [
    {
      "partyid_contact@odata.bind": "/contacts/{contactId}",
      "participationtypemask": 2
    }
  ]
}
```

`participationtypemask` values: 1=From, 2=To, 3=CC, 4=BCC

**Send email (trigger):**

```http
POST {orgUrl}/api/data/v9.2/emails({emailId})/Microsoft.Dynamics.CRM.SendEmail
{ "IssueSend": true }
```

## Duplicate Detection

Duplicate detection rules fire on create/update. To suppress:

```http
POST {orgUrl}/api/data/v9.2/leads
MSCRM-SuppressDuplicateDetection: true
```

To check for duplicates before creation:

```http
POST {orgUrl}/api/data/v9.2/RetrieveDuplicates
{
  "BusinessEntity": {
    "emailaddress1": "jane@contoso.com",
    "@odata.type": "Microsoft.Dynamics.CRM.lead"
  },
  "MatchingEntityName": "lead",
  "PagingInfo": { "PageNumber": 1, "Count": 50 }
}
```
