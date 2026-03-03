---
name: business-central
description: Deep expertise in Microsoft Dynamics 365 Business Central ERP via BC OData v4 / API v2.0 REST API — managing finance (GL accounts, journal entries, AP/AR, bank reconciliation), supply chain (sales orders, purchase orders, sales invoices, purchase invoices), and inventory (items, item ledger entries, availability, valuation); posting documents; discovering environments; and automating back-office ERP workflows.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
triggers:
  - business central
  - BC
  - dynamics 365 business central
  - D365 BC
  - business central api
  - general ledger
  - GL entry
  - GL account
  - chart of accounts
  - journal entry
  - general journal
  - accounts payable
  - accounts receivable
  - AP
  - AR
  - vendor invoice
  - vendor ledger
  - customer invoice
  - customer ledger
  - sales invoice
  - sales order
  - sales order line
  - purchase order
  - purchase invoice
  - purchase order line
  - inventory item
  - item availability
  - item ledger
  - bank reconciliation
  - bank account BC
  - financial report
  - aged receivables
  - aged payables
  - bc environment
  - bc company
  - bc tenant
  - post sales invoice
  - post journal
  - receive purchase order
  - ERP finance
  - SMB ERP
---

# Microsoft Dynamics 365 Business Central ERP

This skill provides comprehensive knowledge for operating Microsoft Dynamics 365 Business Central via the BC OData v4 / API v2.0 REST API. It covers the full Finance module (GL accounts, journal entries, AP/AR, bank reconciliation), the Supply Chain module (sales orders, sales invoices, purchase orders, purchase invoices), and Inventory management (items, availability, item ledger entries).

## Integration Context Contract

- Canonical contract: [`docs/integration-context.md`](../../../docs/integration-context.md)

| Workflow | tenantId | environmentName | companyId | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Finance read (GL, journals, customers, vendors) | required | required | required | `service-principal` | `Financials.ReadWrite.All` + BC permission set |
| Sales/Purchase write (invoices, orders) | required | required | required | `service-principal` | `Financials.ReadWrite.All` + BC permission set |
| Environment discovery | required | — | — | `service-principal` or `delegated-user` | `Financials.ReadWrite.All` |

**Required auth parameters for every BC workflow:**

- `tenantId` — Entra ID tenant GUID
- `environmentName` — BC environment name (e.g., `Production`, `Sandbox`)
- `companyId` — BC company GUID (obtained from `/companies` endpoint)

Fail fast when `tenantId`, `environmentName`, or `companyId` is missing. Never expose company GUIDs or tenant IDs in error output.

## Business Central API Overview

### Base URL (company-scoped)

```
https://api.businesscentral.dynamics.com/v2.0/{tenantId}/{environmentName}/api/v2.0/companies({companyId})/
```

All Finance and Supply Chain entity endpoints are company-scoped. Environment discovery is tenant-scoped (no `companies(...)` segment).

### Authentication

```typescript
import { ClientSecretCredential } from "@azure/identity";

const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
const token = await credential.getToken("https://api.businesscentral.dynamics.com/.default");

// All requests include:
// Authorization: Bearer {token}
// Accept: application/json
// Content-Type: application/json  (for POST/PATCH)
// If-Match: *  (for PATCH — required for optimistic concurrency)
```

**Token audience must be `https://api.businesscentral.dynamics.com/` — not management.azure.com or any other resource.**

### Environment and Company Discovery

**List environments (tenant-scoped):**

```http
GET https://api.businesscentral.dynamics.com/v2.0/{tenantId}/environments
```

Response includes `name`, `type` (`Production` / `Sandbox`), `aadTenantId`, `applicationVersion`.

**List companies within an environment:**

```http
GET https://api.businesscentral.dynamics.com/v2.0/{tenantId}/{environmentName}/api/v2.0/companies
```

Response includes `id`, `name`, `displayName`, `businessProfileId`, `systemVersion`.

Use `$filter=name eq 'Cronus International Ltd.'` to find a specific company by name.

### Key Entity Sets

| Entity | Endpoint suffix | Workload |
|---|---|---|
| Chart of accounts | `accounts` | Finance |
| GL entries | `generalLedgerEntries` | Finance |
| Journals | `journals` | Finance |
| Journal lines | `journals({journalId})/journalLines` | Finance |
| Customers | `customers` | Finance / Sales |
| Customer ledger entries | `customerLedgerEntries` | Finance |
| Vendors | `vendors` | Finance / Purchasing |
| Vendor ledger entries | `vendorLedgerEntries` | Finance |
| Bank accounts | `bankAccounts` | Finance |
| Items | `items` | Inventory |
| Sales orders | `salesOrders` | Sales |
| Sales order lines | `salesOrders({id})/salesOrderLines` | Sales |
| Sales invoices | `salesInvoices` | Sales |
| Sales invoice lines | `salesInvoices({id})/salesInvoiceLines` | Sales |
| Purchase orders | `purchaseOrders` | Purchasing |
| Purchase order lines | `purchaseOrders({id})/purchaseOrderLines` | Purchasing |
| Purchase invoices | `purchaseInvoices` | Purchasing |
| Item ledger entries | `itemLedgerEntries` | Inventory |

### Key Actions

| Action | HTTP call | Effect |
|---|---|---|
| Post sales invoice | `POST salesInvoices({id})/Microsoft.NAV.post` | Posts the invoice (status: Draft → Open → Posted) |
| Post general journal | `POST journals({id})/Microsoft.NAV.post` | Posts all lines in the journal batch |
| Receive purchase order | `POST purchaseOrders({id})/Microsoft.NAV.receive` | Records item receipt for the PO |
| Send sales invoice | `POST salesInvoices({id})/Microsoft.NAV.send` | Posts and emails the invoice |

**Never PATCH `status` directly on a document to simulate posting.** Always use the NAV actions.

### OData Query Patterns

**Retrieve with $select and $filter:**

```http
GET {baseUrl}/salesInvoices?$select=id,number,customerName,totalAmountIncludingTax,status,invoiceDate&$filter=status eq 'Draft'&$top=50
```

**Expand related records:**

```http
GET {baseUrl}/salesOrders?$select=id,number,customerName,totalAmountIncludingTax&$expand=salesOrderLines($select=itemId,description,quantity,unitPrice)&$filter=status eq 'Open'
```

**Pagination (`@odata.nextLink`):**

Always follow `@odata.nextLink` when present — never assume a single response is complete.

```http
Prefer: odata.maxpagesize=100
```

## Finance Module

### Chart of Accounts

```http
GET {baseUrl}/accounts?$select=id,number,displayName,category,subCategory,blocked,directPosting&$orderby=number asc
```

**Account categories:** `Assets`, `Liabilities`, `Equity`, `Income`, `CostOfGoodsSold`, `Expense`

Only accounts with `directPosting eq true` can be used in journal lines.

### General Ledger Entries

```http
GET {baseUrl}/generalLedgerEntries?$select=id,postingDate,documentNumber,accountNumber,debitAmount,creditAmount,description&$filter=postingDate ge 2026-01-01 and postingDate le 2026-03-31&$orderby=postingDate desc
```

GL entries are read-only (created by posting journals or documents).

### Journal Entry Workflow

1. **Create or get a journal batch:**

```http
POST {baseUrl}/journals
{
  "code": "GENERAL",
  "displayName": "General Journal"
}
```

2. **Add lines (debit and credit must balance):**

```http
POST {baseUrl}/journals({journalId})/journalLines
{
  "lineNumber": 10000,
  "accountType": "G/L Account",
  "accountNumber": "6200",
  "postingDate": "2026-03-01",
  "documentNumber": "JNL-2026-001",
  "description": "Office supplies expense",
  "debitAmount": 500.00,
  "creditAmount": 0.00
}
```

Then the balancing credit line:

```http
POST {baseUrl}/journals({journalId})/journalLines
{
  "lineNumber": 20000,
  "accountType": "G/L Account",
  "accountNumber": "2100",
  "postingDate": "2026-03-01",
  "documentNumber": "JNL-2026-001",
  "description": "Accounts payable — office supplies",
  "debitAmount": 0.00,
  "creditAmount": 500.00
}
```

3. **Post the journal:**

```http
POST {baseUrl}/journals({journalId})/Microsoft.NAV.post
```

**Journal correctness rules:**
- Total `debitAmount` must equal total `creditAmount` within the batch before posting
- `postingDate` must fall within an open accounting period
- `accountNumber` must exist and have `directPosting eq true`
- `documentNumber` is required and must be unique within the posting period (per BC number series configuration)

### Customers and AR

**Create customer:**

```http
POST {baseUrl}/customers
{
  "displayName": "Contoso Ltd",
  "email": "billing@contoso.com",
  "phoneNumber": "+1-555-0100",
  "addressLine1": "123 Main St",
  "city": "New York",
  "state": "NY",
  "postalCode": "10001",
  "country": "US",
  "paymentTermsId": "{paymentTermsGuid}",
  "currencyCode": "USD"
}
```

**Customer ledger entries (AR aging):**

```http
GET {baseUrl}/customerLedgerEntries?$select=id,customerId,customerNumber,postingDate,documentType,documentNumber,description,debitAmount,creditAmount,remainingAmount,open&$filter=customerId eq {customerId} and open eq true&$orderby=postingDate asc
```

`open eq true` filters to unpaid (outstanding) entries. Use `remainingAmount` for aging calculation.

### Vendors and AP

**Vendor ledger entries (AP aging):**

```http
GET {baseUrl}/vendorLedgerEntries?$select=id,vendorId,vendorNumber,postingDate,documentType,documentNumber,description,debitAmount,creditAmount,remainingAmount,open,dueDate&$filter=vendorId eq {vendorId} and open eq true&$orderby=dueDate asc
```

`dueDate` compared to today gives days overdue for AP aging.

### Bank Accounts

```http
GET {baseUrl}/bankAccounts?$select=id,number,displayName,bankAccountNumber,currencyCode,currentBalance
```

Bank reconciliation is performed in the BC UI; the API exposes balances for reporting.

## Supply Chain Module

### Sales Orders

**Create sales order:**

```http
POST {baseUrl}/salesOrders
{
  "customerId": "{customerGuid}",
  "orderDate": "2026-03-01",
  "shipmentDate": "2026-03-15",
  "currencyCode": "USD",
  "paymentTermsId": "{paymentTermsGuid}"
}
```

**Add sales order line:**

```http
POST {baseUrl}/salesOrders({salesOrderId})/salesOrderLines
{
  "lineType": "Item",
  "itemId": "{itemGuid}",
  "description": "Widget Pro 2000",
  "quantity": 10,
  "unitPrice": 199.99,
  "discountPercent": 5
}
```

**Sales order statuses:** `Draft` → `Open` → `Released` → `Shipped` → `Invoiced`

### Sales Invoices

**Create sales invoice:**

```http
POST {baseUrl}/salesInvoices
{
  "customerId": "{customerGuid}",
  "invoiceDate": "2026-03-01",
  "dueDate": "2026-03-31",
  "currencyCode": "USD"
}
```

**Add invoice line:**

```http
POST {baseUrl}/salesInvoices({salesInvoiceId})/salesInvoiceLines
{
  "lineType": "Item",
  "itemId": "{itemGuid}",
  "description": "Widget Pro 2000",
  "quantity": 5,
  "unitPrice": 199.99
}
```

**Post (finalize) invoice:**

```http
POST {baseUrl}/salesInvoices({salesInvoiceId})/Microsoft.NAV.post
```

After posting, status becomes `Open` (posted but unpaid). A credit memo is required to reverse a posted invoice — never DELETE a posted invoice.

### Purchase Orders

**Create purchase order:**

```http
POST {baseUrl}/purchaseOrders
{
  "vendorId": "{vendorGuid}",
  "orderDate": "2026-03-01",
  "expectedReceiptDate": "2026-03-20",
  "currencyCode": "USD"
}
```

**Add purchase order line:**

```http
POST {baseUrl}/purchaseOrders({purchaseOrderId})/purchaseOrderLines
{
  "lineType": "Item",
  "itemId": "{itemGuid}",
  "description": "Widget Pro 2000",
  "quantity": 100,
  "directUnitCost": 89.99
}
```

**Receive purchase order:**

```http
POST {baseUrl}/purchaseOrders({purchaseOrderId})/Microsoft.NAV.receive
```

Receiving creates item ledger entries for the received quantity and advances the PO toward invoicing.

### Purchase Invoices

Purchase invoices can be created standalone or automatically from a received PO:

```http
POST {baseUrl}/purchaseInvoices
{
  "vendorId": "{vendorGuid}",
  "invoiceDate": "2026-03-05",
  "vendorInvoiceNumber": "VINV-2026-0042",
  "currencyCode": "USD"
}
```

## Inventory Module

### Items

**List items:**

```http
GET {baseUrl}/items?$select=id,number,displayName,type,unitCost,unitPrice,inventory,blocked&$filter=blocked eq false&$orderby=number asc
```

**Item types:** `Inventory` (stocked), `Service` (non-stocked service), `Non-Inventory` (expensed at purchase)

**Item availability:**

```http
GET {baseUrl}/items({itemId})?$select=id,number,displayName,inventory,unitCost,unitPrice
```

`inventory` field is the current net stock quantity. For detailed availability including sales reservations and purchase receipts, use item ledger entries.

### Item Ledger Entries

```http
GET {baseUrl}/itemLedgerEntries?$select=id,itemId,itemNumber,postingDate,entryType,quantity,salesAmount,costAmount,documentNumber&$filter=itemId eq {itemId}&$orderby=postingDate desc
```

**Entry types:** `Purchase`, `Sale`, `Positive Adjmt.`, `Negative Adjmt.`, `Transfer`, `Consumption`, `Output`

**Inventory valuation** = sum of `costAmount` for all entries of `entryType eq 'Purchase'` and `'Positive Adjmt.'` minus sales and negative adjustments.

## Error Handling

| HTTP status | BC error code | Cause |
|---|---|---|
| 401 | `Authentication_InvalidCredentials` | Invalid or expired token, or wrong audience |
| 403 | `Authorization_RequestDenied` | App user lacks required BC permission set |
| 404 | `Internal_CompanyNotFound` | Invalid `companyId` or environment name |
| 404 | `Internal_EntityNotFound` | Record GUID not found |
| 400 | `Internal_InvalidParameter` | Invalid OData filter or field value |
| 409 | `Internal_EntityConflict` | Optimistic concurrency violation — fetch fresh ETag |
| 422 | `Internal_PostingError` | Document cannot be posted (e.g., unbalanced journal, closed period) |
| 429 | `Internal_RequestLimitExceeded` | API rate limit — apply `Retry-After` backoff |

Parse `error.code` from the OData error body before surfacing messages.

**Rate limits:** Business Central enforces per-tenant and per-user limits. Use `$batch` (OData `$batch`) for bulk reads to reduce round-trips.

## Output Convention

Every operation produces a structured markdown report:

1. **Header**: operation, timestamp, environment, company name
2. **Entity summary**: entity type, ID, key fields
3. **Action result**: what was created/updated/posted
4. **Financial table** (for reporting commands): date, account, debit, credit, balance
5. **Recommendations**: next steps, data quality notes, period close reminders

## Reference Files

| Reference | Path | Topics |
|---|---|---|
| Finance Reference | `references/finance-reference.md` | GL accounts, journal entries, customers, vendors, bank reconciliation, AP/AR ledgers, aging |
| Supply Chain Reference | `references/supply-chain-reference.md` | Items, sales orders, sales invoices, purchase orders, purchase invoices, inventory, credit memos |
