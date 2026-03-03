# Business Central Finance Reference

## Chart of Accounts Structure

Business Central uses a flat chart of accounts with an account number range convention:

| Number range | Category | Typical accounts |
|---|---|---|
| 1000–1999 | Assets | Cash, bank, receivables, inventory, fixed assets |
| 2000–2999 | Liabilities | Accounts payable, loans, deferred revenue |
| 3000–3999 | Equity | Owner equity, retained earnings |
| 4000–4999 | Income | Sales revenue, service income |
| 5000–5999 | Cost of Goods Sold | Direct material costs, production labor |
| 6000–8999 | Expense | Operating expenses, SG&A, depreciation |

**Retrieve the full chart of accounts:**

```http
GET {baseUrl}/accounts?$select=id,number,displayName,category,subCategory,blocked,directPosting,balance&$filter=blocked eq false&$orderby=number asc
```

**Key fields:**

| Field | Type | Description |
|---|---|---|
| `id` | GUID | Primary key |
| `number` | string | Account number (user-defined) |
| `displayName` | string | Account name |
| `category` | string | `Assets`, `Liabilities`, `Equity`, `Income`, `CostOfGoodsSold`, `Expense` |
| `subCategory` | string | User-defined sub-grouping |
| `directPosting` | boolean | `true` = can be used in journal lines |
| `blocked` | boolean | `true` = account is locked for new entries |
| `balance` | decimal | Current balance (read-only, computed) |

Only use accounts where `directPosting eq true` and `blocked eq false` in journal lines. Posting to a non-direct-posting account returns a `422 Internal_PostingError`.

## General Ledger Entries

GL entries are the immutable audit trail of all posted transactions. They are read-only via the API.

**Retrieve GL entries by date range:**

```http
GET {baseUrl}/generalLedgerEntries?$select=id,postingDate,documentNumber,documentType,accountNumber,accountId,description,debitAmount,creditAmount&$filter=postingDate ge 2026-01-01 and postingDate le 2026-03-31&$orderby=postingDate desc,entryNumber desc
```

**Key fields:**

| Field | Type | Description |
|---|---|---|
| `id` | GUID | Primary key |
| `postingDate` | date | Date posted to ledger |
| `documentNumber` | string | Source document number |
| `documentType` | string | `Invoice`, `Credit Memo`, `Payment`, `Journal` |
| `accountNumber` | string | GL account number |
| `description` | string | Transaction description |
| `debitAmount` | decimal | Debit side of the entry |
| `creditAmount` | decimal | Credit side of the entry |

Entries are always balanced per document (debit total = credit total per document number).

**Period summary (aggregate by account):**

Fetch all GL entries for the period and group client-side by `accountNumber`. Business Central does not support OData `$apply=groupby` on this endpoint in all versions.

## Journal Entries (General Journal)

### Journal Batch Management

Journal batches (`journals`) are named containers for unposted lines.

**Retrieve existing journal batches:**

```http
GET {baseUrl}/journals?$select=id,code,displayName,lastModifiedDateTime,balancingAccount
```

**Create a new journal batch:**

```http
POST {baseUrl}/journals
{
  "code": "ACCRUAL",
  "displayName": "Monthly Accrual Journal"
}
```

Journal codes must be unique within the company. Reuse existing batches (e.g., `GENERAL`) when appropriate — do not create a new batch for every posting.

### Journal Line Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `lineNumber` | integer | Yes | Sequential, increments by 10000 per line |
| `accountType` | string | Yes | `G/L Account`, `Customer`, `Vendor`, `Bank Account` |
| `accountId` | GUID | Conditional | Required if `accountType` ≠ `G/L Account` |
| `accountNumber` | string | Yes | GL account number or customer/vendor number |
| `postingDate` | date | Yes | Must be within an open accounting period |
| `documentNumber` | string | Yes | Must be unique per period; use company number series |
| `description` | string | Yes | Transaction description |
| `debitAmount` | decimal | Yes | Set to 0 if credit |
| `creditAmount` | decimal | Yes | Set to 0 if debit |
| `currencyCode` | string | No | ISO 4217; leave blank for LCY (local currency) |
| `externalDocumentNumber` | string | No | Vendor invoice number or bank reference |
| `dimensionSetId` | GUID | No | Dimension combination for cost center reporting |

### Posting Rules

1. **Balance check**: Sum of `debitAmount` across all lines must equal sum of `creditAmount` before posting.
2. **Period check**: `postingDate` must fall within a period where `User Setup` allows posting (typically the current and prior period).
3. **Account check**: `accountNumber` must resolve to a non-blocked, direct-posting account.
4. **Document uniqueness**: BC enforces uniqueness of `documentNumber` per GL register.

### Common Journal Templates

**Record a bank payment to a vendor:**

```
Debit  2000 Accounts Payable    500.00
Credit 1010 Bank Account        500.00
```

**Record a customer payment receipt:**

```
Debit  1010 Bank Account        1,200.00
Credit 1300 Accounts Receivable 1,200.00
```

**Record a prepaid expense:**

```
Debit  1600 Prepaid Expenses    300.00
Credit 1010 Bank Account        300.00
```

**Amortize prepaid (monthly):**

```
Debit  6100 Rent Expense        100.00
Credit 1600 Prepaid Expenses    100.00
```

## Customers and Accounts Receivable

### Customer Fields

| Field | Type | Description |
|---|---|---|
| `id` | GUID | Primary key |
| `number` | string | Customer number (assigned from number series) |
| `displayName` | string | Customer name |
| `email` | string | Billing email |
| `phoneNumber` | string | Primary phone |
| `addressLine1` | string | Street address |
| `city` | string | City |
| `state` | string | State/region |
| `postalCode` | string | ZIP/postal code |
| `country` | string | ISO 3166-1 alpha-2 |
| `paymentTermsId` | GUID | Default payment terms |
| `currencyCode` | string | Default invoicing currency |
| `creditLimit` | decimal | Credit limit (0 = unlimited) |
| `balance` | decimal | Outstanding balance (read-only) |
| `blocked` | string | `All` = fully blocked, `Invoice` = no new invoices, blank = active |

### AR Aging Calculation

Aged receivables are derived from open `customerLedgerEntries`:

```http
GET {baseUrl}/customerLedgerEntries?$select=id,customerId,customerNumber,postingDate,dueDate,documentType,documentNumber,description,remainingAmount,open&$filter=open eq true&$orderby=dueDate asc
```

Age buckets relative to today:

| Bucket | Filter |
|---|---|
| Current (not yet due) | `dueDate ge today` |
| 1–30 days overdue | `dueDate ge today-30 and dueDate lt today` |
| 31–60 days | `dueDate ge today-60 and dueDate lt today-30` |
| 61–90 days | `dueDate ge today-90 and dueDate lt today-60` |
| 90+ days | `dueDate lt today-90` |

Sum `remainingAmount` per bucket per customer for the aged receivables report.

## Vendors and Accounts Payable

### Vendor Fields

| Field | Type | Description |
|---|---|---|
| `id` | GUID | Primary key |
| `number` | string | Vendor number |
| `displayName` | string | Vendor name |
| `email` | string | Contact email |
| `phoneNumber` | string | Primary phone |
| `addressLine1` | string | Remittance address |
| `city` | string | City |
| `state` | string | State/region |
| `postalCode` | string | ZIP/postal code |
| `country` | string | ISO 3166-1 alpha-2 |
| `paymentTermsId` | GUID | Default payment terms |
| `currencyCode` | string | Invoice currency |
| `balance` | decimal | Outstanding AP balance (read-only) |
| `blocked` | string | `All`, `Payment`, `Invoice`, blank |

### AP Aging Calculation

```http
GET {baseUrl}/vendorLedgerEntries?$select=id,vendorId,vendorNumber,postingDate,dueDate,documentType,documentNumber,externalDocumentNumber,description,remainingAmount,open&$filter=open eq true&$orderby=dueDate asc
```

Same age bucket logic as AR. `externalDocumentNumber` is the vendor's invoice number — important for matching vendor statements.

**Overdue AP detection:**

```
daysOverdue = today - dueDate  (where dueDate < today)
```

Flag entries with `daysOverdue > 30` for early payment discount forfeiture analysis.

## Bank Accounts

```http
GET {baseUrl}/bankAccounts?$select=id,number,displayName,bankAccountNumber,bankName,currencyCode,currentBalance,lastModifiedDateTime
```

| Field | Type | Description |
|---|---|---|
| `id` | GUID | Primary key |
| `number` | string | BC internal bank account code |
| `displayName` | string | Account name |
| `bankAccountNumber` | string | Actual bank account number |
| `bankName` | string | Bank institution name |
| `currencyCode` | string | Account currency |
| `currentBalance` | decimal | BC book balance (reconciled + unreconciled) |

**Bank reconciliation** is performed in the BC UI (Payment Reconciliation Journal). The API does not expose individual bank statement lines — use `currentBalance` for book-to-bank variance reporting.

## Payment Terms

```http
GET {baseUrl}/paymentTerms?$select=id,code,displayName,dueDateCalculation,discountDateCalculation,discountPercent,calculateDiscountOnCreditMemos
```

Common payment terms codes: `NET30`, `NET60`, `2/10 NET30` (2% discount if paid within 10 days, net 30).

`dueDateCalculation` is a BC date formula string, e.g., `30D` (30 days), `1M` (1 month), `CM+30D` (end of current month + 30 days).

## Accounting Period Validation

Before posting, confirm the period is open:

```http
GET {baseUrl}/accountingPeriods?$select=startDate,name,closed,fiscalYearStart&$orderby=startDate desc&$top=12
```

| Field | Type | Description |
|---|---|---|
| `startDate` | date | Period start (always the 1st of a month for monthly setup) |
| `name` | string | Period name (e.g., `March 2026`) |
| `closed` | boolean | `true` = period is locked; no new postings allowed |
| `fiscalYearStart` | boolean | `true` = this period is the start of a fiscal year |

A `postingDate` in a period where `closed eq true` returns `422 Internal_PostingError` with description `Posting Date is not within your range of allowed posting dates`.
