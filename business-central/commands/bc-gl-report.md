---
name: bc-gl-report
description: Generate a Business Central general ledger report — chart of accounts summary, period GL entry listing, trial balance, and AP/AR aging snapshot
argument-hint: "[--period <YYYY-MM>] [--account <number>] [--category <Assets|Liabilities|Equity|Income|Expense>] [--aged-ar] [--aged-ap]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# Business Central GL Report

Generates a general ledger summary report for a Business Central company. Covers chart of accounts balances, period GL entry listing, trial balance by category, and optional AP/AR aging snapshots.

## Flags

- `--period <YYYY-MM>`: Report period (e.g., `2026-03`); defaults to current month
- `--account <number>`: Filter to a specific GL account number
- `--category <name>`: Filter by account category (e.g., `Expense`, `Income`)
- `--aged-ar`: Include aged receivables snapshot
- `--aged-ap`: Include aged payables snapshot

Default: Full trial balance for the current period.

## Prerequisites

Require from integration context or `.env`:
- `BC_BASE_URL` (company-scoped API base)
- `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` (or use `az account get-access-token`)

## Step 1: Acquire Token

```bash
BC_TOKEN=$(az account get-access-token \
  --resource "https://api.businesscentral.dynamics.com" \
  --query accessToken -o tsv)

BASE_URL="${BC_BASE_URL}"  # e.g., https://api.businesscentral.dynamics.com/v2.0/{tenantId}/{env}/api/v2.0/companies({companyId})
```

## Step 2: Determine Report Period

If `--period` is not provided, default to current month:

```bash
PERIOD=$(python3 -c "from datetime import date; d = date.today(); print(d.strftime('%Y-%m'))")
PERIOD_START="${PERIOD}-01"
PERIOD_END=$(python3 -c "
from datetime import date
import calendar
y, m = map(int, '${PERIOD}'.split('-'))
last_day = calendar.monthrange(y, m)[1]
print(f'{y}-{m:02d}-{last_day}')")
echo "Reporting period: ${PERIOD_START} to ${PERIOD_END}"
```

## Step 3: Retrieve Chart of Accounts with Balances

```bash
ACCT_FILTER="\$filter=blocked eq false"
if [ -n "${ACCOUNT}" ]; then
  ACCT_FILTER="\$filter=number eq '${ACCOUNT}'"
elif [ -n "${CATEGORY}" ]; then
  ACCT_FILTER="\$filter=category eq '${CATEGORY}' and blocked eq false"
fi

curl -s "${BASE_URL}/accounts?\$select=id,number,displayName,category,subCategory,directPosting,balance&${ACCT_FILTER}&\$orderby=number asc" \
  -H "Authorization: Bearer $BC_TOKEN" \
  -H "Accept: application/json" | python3 -c "
import sys, json
r = json.load(sys.stdin)
accounts = r.get('value', [])
print(f'Accounts: {len(accounts)}')
for a in accounts:
    print(f\"{a['number']:>10}  {a['displayName']:<40}  {a['category']:<20}  {a.get('balance',0):>15,.2f}\")"
```

## Step 4: Retrieve GL Entries for the Period

```bash
GL_FILTER="\$filter=postingDate ge ${PERIOD_START} and postingDate le ${PERIOD_END}"
if [ -n "${ACCOUNT}" ]; then
  GL_FILTER="${GL_FILTER} and accountNumber eq '${ACCOUNT}'"
fi

ALL_ENTRIES='[]'
NEXT_URL="${BASE_URL}/generalLedgerEntries?\$select=id,postingDate,documentNumber,documentType,accountNumber,description,debitAmount,creditAmount&${GL_FILTER}&\$orderby=postingDate asc,entryNumber asc"

# Paginate through all results
python3 << 'EOF'
import urllib.request, json, os, sys

token = os.environ.get('BC_TOKEN', '')
headers = {'Authorization': f'Bearer {token}', 'Accept': 'application/json'}
url = os.environ.get('NEXT_URL', '')

all_entries = []
while url:
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())
    all_entries.extend(data.get('value', []))
    url = data.get('@odata.nextLink', '')

total_debit = sum(e['debitAmount'] for e in all_entries)
total_credit = sum(e['creditAmount'] for e in all_entries)

print(f"Period GL entries: {len(all_entries)}")
print(f"Total debits: {total_debit:,.2f}")
print(f"Total credits: {total_credit:,.2f}")
print()
print(f"{'Date':<12} {'Doc Number':<20} {'Account':<10} {'Description':<35} {'Debit':>12} {'Credit':>12}")
print("-" * 105)
for e in all_entries:
    print(f"{e['postingDate']:<12} {e['documentNumber']:<20} {e['accountNumber']:<10} {e['description'][:35]:<35} {e['debitAmount']:>12,.2f} {e['creditAmount']:>12,.2f}")
EOF
```

## Step 5: Trial Balance by Category

Group account balances by category and compute net:

```python
# Categories: Assets, Liabilities, Equity, Income, CostOfGoodsSold, Expense
# Trial balance: debit-normal accounts (Assets, Expense, COGS) vs credit-normal (Liabilities, Equity, Income)

DEBIT_NORMAL = {'Assets', 'CostOfGoodsSold', 'Expense'}
CREDIT_NORMAL = {'Liabilities', 'Equity', 'Income'}

# Balance interpretation:
# Debit-normal: positive balance = debit (asset/expense), negative = credit (contra)
# Credit-normal: positive balance = credit (liability/equity/income), negative = debit (contra)
```

Output trial balance table:

```
| Category          | Total Balance |  Normal side |
|-------------------|---------------|--------------|
| Assets            |   450,000.00  | Debit        |
| Liabilities       |   180,000.00  | Credit       |
| Equity            |   120,000.00  | Credit       |
| Income            |   210,000.00  | Credit       |
| Cost of Goods Sold|    85,000.00  | Debit        |
| Expense           |    55,000.00  | Debit        |
```

Total assets must equal total liabilities + equity (balance sheet equation check).

## Step 6: Aged Receivables Snapshot (if --aged-ar)

```bash
TODAY=$(python3 -c "from datetime import date; print(date.today().isoformat())")

curl -s "${BASE_URL}/customerLedgerEntries?\$select=customerId,customerNumber,dueDate,remainingAmount,documentType,documentNumber&\$filter=open eq true&\$orderby=dueDate asc" \
  -H "Authorization: Bearer $BC_TOKEN" \
  -H "Accept: application/json" | python3 -c "
import sys, json
from datetime import date, datetime

r = json.load(sys.stdin)
entries = r.get('value', [])
today = date.today()

buckets = {'Current': 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0}
for e in entries:
    due = datetime.strptime(e['dueDate'], '%Y-%m-%d').date()
    days_overdue = (today - due).days
    amt = e.get('remainingAmount', 0)
    if days_overdue <= 0:
        buckets['Current'] += amt
    elif days_overdue <= 30:
        buckets['1-30'] += amt
    elif days_overdue <= 60:
        buckets['31-60'] += amt
    elif days_overdue <= 90:
        buckets['61-90'] += amt
    else:
        buckets['90+'] += amt

total = sum(buckets.values())
print('Aged Receivables Summary')
print('-' * 40)
for bucket, amt in buckets.items():
    pct = (amt / total * 100) if total else 0
    print(f'{bucket:>10}:  {amt:>12,.2f}  ({pct:>5.1f}%)')
print(f'      Total:  {total:>12,.2f}')
print(f'Total open entries: {len(entries)}')"
```

## Step 7: Aged Payables Snapshot (if --aged-ap)

Same logic as Step 6 but using `vendorLedgerEntries`:

```bash
curl -s "${BASE_URL}/vendorLedgerEntries?\$select=vendorId,vendorNumber,dueDate,remainingAmount,documentType,externalDocumentNumber&\$filter=open eq true&\$orderby=dueDate asc" \
  -H "Authorization: Bearer $BC_TOKEN" \
  -H "Accept: application/json" | python3 -c "
import sys, json
from datetime import date, datetime

r = json.load(sys.stdin)
entries = r.get('value', [])
today = date.today()

buckets = {'Not yet due': 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0}
for e in entries:
    due = datetime.strptime(e['dueDate'], '%Y-%m-%d').date()
    days_overdue = (today - due).days
    amt = e.get('remainingAmount', 0)
    if days_overdue <= 0:
        buckets['Not yet due'] += amt
    elif days_overdue <= 30:
        buckets['1-30'] += amt
    elif days_overdue <= 60:
        buckets['31-60'] += amt
    elif days_overdue <= 90:
        buckets['61-90'] += amt
    else:
        buckets['90+'] += amt

total = sum(buckets.values())
print('Aged Payables Summary')
print('-' * 40)
for bucket, amt in buckets.items():
    pct = (amt / total * 100) if total else 0
    print(f'{bucket:>12}:  {amt:>12,.2f}  ({pct:>5.1f}%)')
print(f'         Total:  {total:>12,.2f}')
print(f'Total open entries: {len(entries)}')"
```

## Step 8: Output Report

Produce the final markdown report:

```markdown
# Business Central GL Report
**Company:** {companyName}
**Environment:** {environmentName}
**Period:** {YYYY-MM} ({startDate} – {endDate})
**Generated:** {timestamp}

## Trial Balance

| Category | Balance |
|---|---|
| Assets | {amount} |
| Liabilities | {amount} |
| Equity | {amount} |
| Income | {amount} |
| Cost of Goods Sold | {amount} |
| Expense | {amount} |
| **Net (Income – Expenses)** | **{netIncome}** |

Balance sheet check: Assets = {assets} | Liabilities + Equity = {liabEquity} | **{BALANCED / UNBALANCED}**

## Period Activity ({N} GL Entries)

{table of entries: Date | Doc Number | Account | Description | Debit | Credit}

## Aged Receivables (if requested)

{aging table}

## Aged Payables (if requested)

{aging table}

## Notes

- Trial balance data sourced from `/accounts` endpoint (current balances, not period-filtered).
- For period-specific net income, compute from GL entries: sum of Income credits minus Expense debits.
- Accounts with zero balance are excluded from the trial balance display.
```
