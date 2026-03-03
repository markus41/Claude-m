---
name: bc-purchase-order
description: Create purchase orders in Business Central, add lines, receive goods, and post purchase invoices
argument-hint: "[--list] [--create --vendor-id <id>] [--add-line --po-id <id> --item-id <id> --qty <n> --cost <n>] [--receive --po-id <id>] [--invoice --po-id <id>]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# Business Central Purchase Order

Manage purchase orders and purchase invoices in Business Central. Covers creating POs, adding lines, receiving goods (creating inventory receipts), and posting purchase invoices.

## Flags

- `--list`: List purchase orders (optionally filter with `--status`)
- `--status <status>`: Filter by status (`Draft`, `Open`, `Released`, `Received`, `Invoiced`)
- `--create`: Create a new draft purchase order
- `--vendor-id <id>`: Vendor GUID (required with --create)
- `--vendor-name <name>`: Find vendor by display name (alternative to --vendor-id)
- `--add-line`: Add a line to an existing PO
- `--po-id <id>`: Target purchase order GUID
- `--item-id <id>`: Item GUID for the PO line
- `--qty <n>`: Ordered quantity
- `--cost <n>`: Direct unit cost (uses item default if omitted)
- `--receive`: Receive all outstanding lines on a PO (post a warehouse receipt)
- `--invoice`: Create and post a purchase invoice from a received PO

## Prerequisites

Require from integration context or `.env`:
- `BC_BASE_URL`
- Token via `az account get-access-token`

## Step 1: Acquire Token

```bash
BC_TOKEN=$(az account get-access-token \
  --resource "https://api.businesscentral.dynamics.com" \
  --query accessToken -o tsv)

BASE_URL="${BC_BASE_URL}"
```

## Step 2: List Purchase Orders (if --list)

```bash
STATUS_FILTER=""
if [ -n "${STATUS}" ]; then
  STATUS_FILTER="status eq '${STATUS}'"
else
  STATUS_FILTER="status ne 'Invoiced'"
fi

curl -s "${BASE_URL}/purchaseOrders?\$select=id,number,vendorName,orderDate,expectedReceiptDate,status,totalAmountIncludingTax,vendorInvoiceNumber&\$filter=${STATUS_FILTER}&\$orderby=expectedReceiptDate asc" \
  -H "Authorization: Bearer $BC_TOKEN" \
  -H "Accept: application/json" | python3 -c "
import sys, json
r = json.load(sys.stdin)
orders = r.get('value', [])
print(f'Purchase orders: {len(orders)}')
print()
print(f'{\"PO Number\":<20} {\"Vendor\":<30} {\"Order Date\":<12} {\"Expected Receipt\":<18} {\"Total\":>12} {\"Status\":<12}')
print('-' * 110)
for po in orders:
    print(f\"{po['number']:<20} {po['vendorName'][:30]:<30} {po['orderDate']:<12} {po.get('expectedReceiptDate',''):<18} {po['totalAmountIncludingTax']:>12,.2f} {po['status']:<12}\")"
```

## Step 3: Resolve Vendor (if --vendor-name)

```bash
curl -s "${BASE_URL}/vendors?\$select=id,number,displayName&\$filter=contains(displayName,'${VENDOR_NAME}')&\$top=10" \
  -H "Authorization: Bearer $BC_TOKEN" \
  -H "Accept: application/json" | python3 -c "
import sys, json
r = json.load(sys.stdin)
vendors = r.get('value', [])
for v in vendors:
    print(f\"{v['id']} | {v['number']} | {v['displayName']}\")"
```

If multiple matches, use `AskUserQuestion` to select.

## Step 4: Create Purchase Order (if --create)

```bash
TODAY=$(python3 -c "from datetime import date; print(date.today().isoformat())")
EXPECTED=$(python3 -c "from datetime import date, timedelta; print((date.today() + timedelta(days=14)).isoformat())")

PO_RESPONSE=$(curl -s -X POST "${BASE_URL}/purchaseOrders" \
  -H "Authorization: Bearer $BC_TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d "{
    \"vendorId\": \"${VENDOR_ID}\",
    \"orderDate\": \"${TODAY}\",
    \"expectedReceiptDate\": \"${EXPECTED}\",
    \"currencyCode\": \"USD\"
  }")

PO_ID=$(echo "$PO_RESPONSE" | python3 -c "import sys,json; r=json.load(sys.stdin); print(r.get('id',''))")
PO_NUMBER=$(echo "$PO_RESPONSE" | python3 -c "import sys,json; r=json.load(sys.stdin); print(r.get('number',''))")

echo "Created purchase order: ${PO_NUMBER} (${PO_ID})"
```

## Step 5: Add Line to Purchase Order (if --add-line)

```bash
# Resolve item default cost if --cost not provided
if [ -z "${COST}" ]; then
  COST=$(curl -s "${BASE_URL}/items(${ITEM_ID})?\$select=unitCost" \
    -H "Authorization: Bearer $BC_TOKEN" \
    -H "Accept: application/json" | python3 -c "import sys,json; r=json.load(sys.stdin); print(r.get('unitCost',0))")
fi

QTY="${QTY:-1}"

# Get current max line number to assign the next one
MAX_LINE=$(curl -s "${BASE_URL}/purchaseOrders(${PO_ID})/purchaseOrderLines?\$select=lineNumber&\$orderby=lineNumber desc&\$top=1" \
  -H "Authorization: Bearer $BC_TOKEN" \
  -H "Accept: application/json" | python3 -c "
import sys, json
r = json.load(sys.stdin)
lines = r.get('value', [])
print(lines[0]['lineNumber'] + 10000 if lines else 10000)")

LINE_RESPONSE=$(curl -s -X POST "${BASE_URL}/purchaseOrders(${PO_ID})/purchaseOrderLines" \
  -H "Authorization: Bearer $BC_TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d "{
    \"lineNumber\": ${MAX_LINE},
    \"lineType\": \"Item\",
    \"itemId\": \"${ITEM_ID}\",
    \"quantity\": ${QTY},
    \"directUnitCost\": ${COST}
  }")

echo "$LINE_RESPONSE" | python3 -c "
import sys, json
r = json.load(sys.stdin)
print(f\"Line added: {r.get('description','?')} — qty: {r.get('quantity',0)} × {r.get('directUnitCost',0):,.2f}\")"
```

## Step 6: Review Purchase Order Before Receiving

```bash
curl -s "${BASE_URL}/purchaseOrders(${PO_ID})?\$select=id,number,vendorName,orderDate,expectedReceiptDate,status,totalAmountIncludingTax&\$expand=purchaseOrderLines(\$select=description,quantity,directUnitCost,quantityReceived,quantityInvoiced)" \
  -H "Authorization: Bearer $BC_TOKEN" \
  -H "Accept: application/json" | python3 -c "
import sys, json
r = json.load(sys.stdin)
print(f\"PO: {r['number']}\")
print(f\"Vendor: {r['vendorName']}\")
print(f\"Order Date: {r['orderDate']}  Expected Receipt: {r.get('expectedReceiptDate','')}\")
print(f\"Status: {r['status']}\")
print()
print(f\"{'Description':<40} {'Ordered':>8} {'Received':>10} {'Invoiced':>10} {'Unit Cost':>10}\")
print('-' * 82)
for line in r.get('purchaseOrderLines', {}).get('value', []):
    qty_remaining = line['quantity'] - line.get('quantityReceived', 0)
    print(f\"{line['description'][:40]:<40} {line['quantity']:>8.2f} {line.get('quantityReceived',0):>10.2f} {line.get('quantityInvoiced',0):>10.2f} {line['directUnitCost']:>10,.2f}\")
print()
print(f\"Total (incl. tax): {r['totalAmountIncludingTax']:>12,.2f}\")"
```

Guard: if `status` is `Invoiced`, all lines are fully received and invoiced — no further action needed.

## Step 7: Receive Purchase Order (if --receive)

The receive action records the physical receipt of goods and creates item ledger entries:

```bash
RECEIVE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  "${BASE_URL}/purchaseOrders(${PO_ID})/Microsoft.NAV.receive" \
  -H "Authorization: Bearer $BC_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{}")

if [ "$RECEIVE_RESPONSE" = "204" ]; then
  echo "Purchase order received successfully. Item ledger entries created."
  echo "PO status is now: Received"
else
  echo "Receive failed with HTTP ${RECEIVE_RESPONSE}. Check BC error log."
fi
```

After receiving:
- Item inventory quantities increase by the received amounts
- `quantityReceived` on each line is updated
- PO status advances to `Received`

## Step 8: Post Purchase Invoice (if --invoice)

After receiving goods, create and post the vendor invoice:

```bash
# Create invoice from the PO (BC links them automatically when using vendorId + vendorInvoiceNumber)
INV_RESPONSE=$(curl -s -X POST "${BASE_URL}/purchaseInvoices" \
  -H "Authorization: Bearer $BC_TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d "{
    \"vendorId\": \"${VENDOR_ID}\",
    \"invoiceDate\": \"$(python3 -c 'from datetime import date; print(date.today().isoformat())')\",
    \"vendorInvoiceNumber\": \"${VENDOR_INVOICE_NUMBER}\"
  }")

INV_ID=$(echo "$INV_RESPONSE" | python3 -c "import sys,json; r=json.load(sys.stdin); print(r.get('id',''))")
echo "Created purchase invoice: ${INV_ID}"

# Post the invoice
curl -s -X POST "${BASE_URL}/purchaseInvoices(${INV_ID})/Microsoft.NAV.post" \
  -H "Authorization: Bearer $BC_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{}"

echo "Purchase invoice posted. Vendor ledger entry created."
```

## Step 9: Output Report

```markdown
# Business Central Purchase Order Report

**Company:** {companyName}
**Environment:** {environmentName}
**Generated:** {timestamp}

## Action: {List / Created / Received / Invoiced}

### Purchase Order Summary (if created)

| Field | Value |
|---|---|
| PO Number | {number} |
| Vendor | {vendorName} |
| Order Date | {orderDate} |
| Expected Receipt | {expectedReceiptDate} |
| Status | {status} |
| Total (incl. tax) | {totalAmountIncludingTax} |

### Lines

| Description | Ordered | Received | Invoiced | Unit Cost |
|---|---|---|---|---|
| {description} | {qty} | {received} | {invoiced} | {cost} |

### List Summary (if --list)

| Status | Count | Total Value |
|---|---|---|
| Open | {n} | {total} |
| Released | {n} | {total} |
| Received | {n} | {total} |

## Next Steps

- Open POs past expected receipt date: chase vendor or update expected date
- Received POs without invoice: request vendor invoice and post
- Overdue AP entries: schedule payment run
```
