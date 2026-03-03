---
name: bc-sales-invoice
description: Create, update, and post Business Central sales invoices; list open and posted invoices; send invoices by email
argument-hint: "[--list] [--create --customer-id <id> --item-id <id> --qty <n> --price <n>] [--post --invoice-id <id>] [--send --invoice-id <id>]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# Business Central Sales Invoice

Manage sales invoices in Business Central via the API v2.0. Supports listing open/posted invoices, creating new draft invoices with lines, posting invoices, and sending invoices by email.

## Flags

- `--list`: List sales invoices (default: all statuses, optionally filter with `--status`)
- `--status <status>`: Filter by status (`Draft`, `Open`, `Paid`, `Cancelled`)
- `--create`: Create a new draft sales invoice (requires `--customer-id`)
- `--customer-id <id>`: Customer GUID for the new invoice
- `--customer-name <name>`: Find customer by display name (alternative to `--customer-id`)
- `--item-id <id>`: Item GUID for the first invoice line (optional with --create)
- `--qty <n>`: Quantity for the first invoice line
- `--price <n>`: Unit price override (uses item default if omitted)
- `--post --invoice-id <id>`: Post a draft invoice (finalizes it)
- `--send --invoice-id <id>`: Post and email the invoice to the customer
- `--invoice-id <id>`: Target invoice GUID for post/send/view operations

## Prerequisites

Require from integration context or `.env`:
- `BC_BASE_URL` (company-scoped API base)
- Token access via `az account get-access-token`

## Step 1: Acquire Token

```bash
BC_TOKEN=$(az account get-access-token \
  --resource "https://api.businesscentral.dynamics.com" \
  --query accessToken -o tsv)

BASE_URL="${BC_BASE_URL}"
```

## Step 2: List Sales Invoices (if --list)

```bash
STATUS_FILTER=""
if [ -n "${STATUS}" ]; then
  STATUS_FILTER="and status eq '${STATUS}'"
fi

curl -s "${BASE_URL}/salesInvoices?\$select=id,number,invoiceDate,dueDate,customerName,currencyCode,totalAmountIncludingTax,remainingAmount,status,externalDocumentNumber&\$filter=status ne 'Cancelled' ${STATUS_FILTER}&\$orderby=invoiceDate desc" \
  -H "Authorization: Bearer $BC_TOKEN" \
  -H "Accept: application/json" | python3 -c "
import sys, json
r = json.load(sys.stdin)
invoices = r.get('value', [])
print(f'Sales invoices: {len(invoices)}')
print()
print(f'{\"Number\":<20} {\"Date\":<12} {\"Due\":<12} {\"Customer\":<30} {\"Total\":>12} {\"Remaining\":>12} {\"Status\":<12}')
print('-' * 114)
for inv in invoices:
    print(f\"{inv['number']:<20} {inv['invoiceDate']:<12} {inv.get('dueDate',''):<12} {inv['customerName'][:30]:<30} {inv['totalAmountIncludingTax']:>12,.2f} {inv.get('remainingAmount',0):>12,.2f} {inv['status']:<12}\")"
```

## Step 3: Resolve Customer (if --customer-name provided instead of --customer-id)

```bash
curl -s "${BASE_URL}/customers?\$select=id,number,displayName&\$filter=contains(displayName,'${CUSTOMER_NAME}')&\$top=10" \
  -H "Authorization: Bearer $BC_TOKEN" \
  -H "Accept: application/json" | python3 -c "
import sys, json
r = json.load(sys.stdin)
customers = r.get('value', [])
for c in customers:
    print(f\"{c['id']} | {c['number']} | {c['displayName']}\")"
```

If multiple matches are returned, use `AskUserQuestion` to let the user select the correct customer.

## Step 4: Create Sales Invoice (if --create)

```bash
TODAY=$(python3 -c "from datetime import date; print(date.today().isoformat())")
DUE_DATE=$(python3 -c "from datetime import date, timedelta; print((date.today() + timedelta(days=30)).isoformat())")

INVOICE_RESPONSE=$(curl -s -X POST "${BASE_URL}/salesInvoices" \
  -H "Authorization: Bearer $BC_TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d "{
    \"customerId\": \"${CUSTOMER_ID}\",
    \"invoiceDate\": \"${TODAY}\",
    \"dueDate\": \"${DUE_DATE}\",
    \"currencyCode\": \"USD\"
  }")

INVOICE_ID=$(echo "$INVOICE_RESPONSE" | python3 -c "import sys,json; r=json.load(sys.stdin); print(r.get('id',''))")
INVOICE_NUMBER=$(echo "$INVOICE_RESPONSE" | python3 -c "import sys,json; r=json.load(sys.stdin); print(r.get('number',''))")

echo "Created sales invoice: ${INVOICE_NUMBER} (${INVOICE_ID})"
```

## Step 5: Add Invoice Line (if --item-id provided)

```bash
# Resolve item to get default price if --price not provided
if [ -z "${PRICE}" ]; then
  PRICE=$(curl -s "${BASE_URL}/items(${ITEM_ID})?\$select=unitPrice" \
    -H "Authorization: Bearer $BC_TOKEN" \
    -H "Accept: application/json" | python3 -c "import sys,json; r=json.load(sys.stdin); print(r.get('unitPrice',0))")
fi

QTY="${QTY:-1}"

LINE_RESPONSE=$(curl -s -X POST "${BASE_URL}/salesInvoices(${INVOICE_ID})/salesInvoiceLines" \
  -H "Authorization: Bearer $BC_TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d "{
    \"lineType\": \"Item\",
    \"itemId\": \"${ITEM_ID}\",
    \"quantity\": ${QTY},
    \"unitPrice\": ${PRICE}
  }")

echo "$LINE_RESPONSE" | python3 -c "
import sys, json
r = json.load(sys.stdin)
print(f\"Line added: {r.get('description','?')} — qty: {r.get('quantity',0)} × {r.get('unitPrice',0):,.2f} = {r.get('amountIncludingTax',0):,.2f}\")"
```

To add additional lines, repeat Step 5 with different `--item-id`, `--qty`, and `--price` values.

## Step 6: Review Invoice Before Posting

```bash
curl -s "${BASE_URL}/salesInvoices(${INVOICE_ID})?\$select=id,number,invoiceDate,dueDate,customerName,totalAmountExcludingTax,totalAmountIncludingTax,status&\$expand=salesInvoiceLines(\$select=description,quantity,unitPrice,discountPercent,amountIncludingTax)" \
  -H "Authorization: Bearer $BC_TOKEN" \
  -H "Accept: application/json" | python3 -c "
import sys, json
r = json.load(sys.stdin)
print(f\"Invoice: {r['number']}\")
print(f\"Customer: {r['customerName']}\")
print(f\"Date: {r['invoiceDate']}  Due: {r.get('dueDate','')}\")
print(f\"Status: {r['status']}\")
print()
print(f\"{'Description':<40} {'Qty':>6} {'Price':>10} {'Disc%':>6} {'Amount':>12}\")
print('-' * 80)
for line in r.get('salesInvoiceLines', {}).get('value', []):
    print(f\"{line['description'][:40]:<40} {line['quantity']:>6.2f} {line['unitPrice']:>10,.2f} {line.get('discountPercent',0):>5.1f}% {line['amountIncludingTax']:>12,.2f}\")
print()
print(f\"Subtotal (excl. tax): {r['totalAmountExcludingTax']:>12,.2f}\")
print(f\"Total (incl. tax):    {r['totalAmountIncludingTax']:>12,.2f}\")"
```

Guard: if `status` is not `Draft`, skip posting — do not re-post an already posted invoice.

## Step 7: Post Invoice (if --post or --send)

**Post only:**

```bash
POST_RESPONSE=$(curl -s -X POST "${BASE_URL}/salesInvoices(${INVOICE_ID})/Microsoft.NAV.post" \
  -H "Authorization: Bearer $BC_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{}")

echo "$POST_RESPONSE" | python3 -c "
import sys, json
# A successful post returns 204 No Content — empty body is expected
print('Invoice posted successfully. Status is now Open.')"
```

**Post and send (email to customer):**

```bash
curl -s -X POST "${BASE_URL}/salesInvoices(${INVOICE_ID})/Microsoft.NAV.send" \
  -H "Authorization: Bearer $BC_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{}"

echo "Invoice posted and sent by email to the customer."
```

After posting, the invoice status changes to `Open`. The invoice can no longer be edited. To reverse it, create a sales credit memo.

## Step 8: Output Report

```markdown
# Business Central Sales Invoice Report

**Company:** {companyName}
**Environment:** {environmentName}
**Generated:** {timestamp}

## Action: {List / Created / Posted / Sent}

### Invoice Details (if created/posted)

| Field | Value |
|---|---|
| Invoice Number | {number} |
| Customer | {customerName} |
| Invoice Date | {invoiceDate} |
| Due Date | {dueDate} |
| Status | {status} |
| Total (incl. tax) | {totalAmountIncludingTax} |

### Invoice Lines

| Description | Qty | Unit Price | Disc% | Amount |
|---|---|---|---|---|
| {description} | {qty} | {price} | {disc} | {amount} |

### Summary (if --list)

| Status | Count | Total Value |
|---|---|---|
| Draft | {n} | {total} |
| Open | {n} | {total} |
| Paid | {n} | {total} |

## Next Steps

- Draft invoices: review and post when ready
- Open invoices: apply customer payment via Customer Ledger Entries
- Overdue invoices (dueDate past today): follow up or apply late charges
```
