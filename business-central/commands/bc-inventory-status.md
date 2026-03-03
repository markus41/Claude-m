---
name: bc-inventory-status
description: Check Business Central inventory levels, item availability, inventory valuation, and item ledger history
argument-hint: "[--item <number>] [--low-stock --threshold <n>] [--valuation] [--ledger --item-id <id> --days <n>]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# Business Central Inventory Status

Inspect inventory levels and item ledger activity in Business Central. Supports item availability checks, low-stock alerts, inventory valuation summaries, and item ledger entry history.

## Flags

- `--item <number>`: Filter to a specific item number (SKU)
- `--low-stock --threshold <n>`: List items with inventory below the threshold quantity
- `--valuation`: Show inventory valuation (quantity × unit cost per item)
- `--ledger --item-id <id>`: Show item ledger entry history for an item
- `--days <n>`: Number of days of ledger history to retrieve (default: 30)
- `--category <code>`: Filter by item category code

Default: Full inventory status report for all non-blocked Inventory-type items.

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

## Step 2: Retrieve Item Inventory Levels

```bash
ITEM_FILTER="type eq 'Inventory' and blocked eq false"
if [ -n "${ITEM_NUMBER}" ]; then
  ITEM_FILTER="${ITEM_FILTER} and number eq '${ITEM_NUMBER}'"
fi
if [ -n "${CATEGORY}" ]; then
  ITEM_FILTER="${ITEM_FILTER} and itemCategoryCode eq '${CATEGORY}'"
fi

# Paginate through all items
python3 << EOF
import urllib.request, json, os

token = os.environ.get('BC_TOKEN', '')
base_url = os.environ.get('BASE_URL', '')
threshold = float(os.environ.get('THRESHOLD', '-1'))
item_filter = os.environ.get('ITEM_FILTER', "type eq 'Inventory' and blocked eq false")

headers = {'Authorization': f'Bearer {token}', 'Accept': 'application/json'}
url = f"{base_url}/items?\$select=id,number,displayName,type,inventory,unitCost,unitPrice,itemCategoryCode,baseUnitOfMeasureCode&\$filter={item_filter}&\$orderby=number asc"

all_items = []
while url:
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())
    all_items.extend(data.get('value', []))
    url = data.get('@odata.nextLink', '')

# Apply low-stock filter if threshold is set
if threshold >= 0:
    all_items = [i for i in all_items if i.get('inventory', 0) <= threshold]

print(f"Items: {len(all_items)}")
print()
print(f"{'Number':<15} {'Name':<35} {'Category':<15} {'UoM':<6} {'Qty On Hand':>12} {'Unit Cost':>10} {'Sales Price':>12}")
print('-' * 110)
for item in all_items:
    qty = item.get('inventory', 0)
    flag = ' *** LOW' if threshold >= 0 and qty <= threshold else ''
    print(f"{item['number']:<15} {item['displayName'][:35]:<35} {item.get('itemCategoryCode',''):<15} {item.get('baseUnitOfMeasureCode',''):<6} {qty:>12.2f} {item.get('unitCost',0):>10,.2f} {item.get('unitPrice',0):>12,.2f}{flag}")

total_items = len(all_items)
low_stock = len([i for i in all_items if i.get('inventory', 0) <= 0])
print()
print(f"Total items: {total_items}")
print(f"Zero or negative stock: {low_stock}")
EOF
```

## Step 3: Inventory Valuation (if --valuation)

Calculate total inventory value (quantity × unit cost) per item:

```bash
python3 << 'EOF'
import urllib.request, json, os

token = os.environ.get('BC_TOKEN', '')
base_url = os.environ.get('BASE_URL', '')

headers = {'Authorization': f'Bearer {token}', 'Accept': 'application/json'}
url = f"{base_url}/items?$select=id,number,displayName,type,inventory,unitCost,itemCategoryCode&$filter=type eq 'Inventory' and blocked eq false&$orderby=itemCategoryCode asc,number asc"

all_items = []
while url:
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())
    all_items.extend(data.get('value', []))
    url = data.get('@odata.nextLink', '')

# Group by category
categories = {}
for item in all_items:
    cat = item.get('itemCategoryCode', 'Uncategorized')
    categories.setdefault(cat, []).append(item)

print(f"{'Number':<15} {'Name':<35} {'Qty':>10} {'Unit Cost':>10} {'Inventory Value':>16}")
print('-' * 92)

grand_total = 0
for cat, items in sorted(categories.items()):
    cat_total = 0
    print(f"\n## Category: {cat}")
    for item in items:
        qty = item.get('inventory', 0)
        cost = item.get('unitCost', 0)
        value = qty * cost
        cat_total += value
        print(f"  {item['number']:<13} {item['displayName'][:35]:<35} {qty:>10.2f} {cost:>10,.2f} {value:>16,.2f}")
    print(f"  {'Category Total':>60} {cat_total:>16,.2f}")
    grand_total += cat_total

print()
print(f"{'TOTAL INVENTORY VALUE':>75} {grand_total:>16,.2f}")
EOF
```

## Step 4: Item Ledger History (if --ledger)

Retrieve movement history for a specific item:

```bash
DAYS="${DAYS:-30}"
START_DATE=$(python3 -c "from datetime import date, timedelta; print((date.today() - timedelta(days=${DAYS})).isoformat())")

python3 << EOF
import urllib.request, json, os

token = os.environ.get('BC_TOKEN', '')
base_url = os.environ.get('BASE_URL', '')
item_id = os.environ.get('ITEM_ID', '')
start_date = os.environ.get('START_DATE', '')

headers = {'Authorization': f'Bearer {token}', 'Accept': 'application/json'}
url = f"{base_url}/itemLedgerEntries?\$select=id,itemNumber,postingDate,entryType,quantity,costAmount,documentNumber,externalDocumentNumber&\$filter=itemId eq {item_id} and postingDate ge {start_date}&\$orderby=postingDate desc"

all_entries = []
while url:
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())
    all_entries.extend(data.get('value', []))
    url = data.get('@odata.nextLink', '')

total_in = sum(e['quantity'] for e in all_entries if e['quantity'] > 0)
total_out = sum(abs(e['quantity']) for e in all_entries if e['quantity'] < 0)
net_movement = total_in - total_out
total_cost = sum(e.get('costAmount', 0) for e in all_entries)

print(f"Item Ledger: {len(all_entries)} entries (last {os.environ.get('DAYS','30')} days)")
print(f"Total IN:  {total_in:,.2f}")
print(f"Total OUT: {total_out:,.2f}")
print(f"Net:       {net_movement:,.2f}")
print(f"Total cost impact: {total_cost:,.2f}")
print()
print(f"{'Date':<12} {'Entry Type':<20} {'Qty':>10} {'Cost Amt':>12} {'Document':<20}")
print('-' * 80)
for e in all_entries:
    print(f"{e['postingDate']:<12} {e['entryType']:<20} {e['quantity']:>10.2f} {e.get('costAmount',0):>12,.2f} {e.get('documentNumber',''):<20}")
EOF
```

## Step 5: Low Stock Alert (if --low-stock)

Flag items at or below the threshold with purchasing recommendations:

```bash
THRESHOLD="${THRESHOLD:-0}"

echo "Low Stock Alert — threshold: ${THRESHOLD}"
echo ""
echo "Items at or below threshold:"
echo ""

# Re-run item query with low-stock filter applied in python (see Step 2 with threshold)
# For each low-stock item, also check open purchase order lines to see if resupply is in progress:

python3 << 'EOF'
import urllib.request, json, os

token = os.environ.get('BC_TOKEN', '')
base_url = os.environ.get('BASE_URL', '')
threshold = float(os.environ.get('THRESHOLD', '0'))

headers = {'Authorization': f'Bearer {token}', 'Accept': 'application/json'}

# Fetch low-stock items
url = f"{base_url}/items?$select=id,number,displayName,inventory,unitCost,unitPrice&$filter=type eq 'Inventory' and blocked eq false&$orderby=inventory asc"
items = []
while url:
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())
    items.extend(data.get('value', []))
    url = data.get('@odata.nextLink', '')

low_items = [i for i in items if i.get('inventory', 0) <= threshold]

if not low_items:
    print(f"No items found at or below threshold {threshold}")
else:
    print(f"{'Number':<15} {'Name':<35} {'On Hand':>10} {'Suggest Order':>14}")
    print('-' * 78)
    for item in low_items:
        qty = item.get('inventory', 0)
        # Simple suggestion: order enough to reach 2× threshold or 10 units minimum
        suggested = max(10, int(threshold * 2) - int(qty))
        print(f"{item['number']:<15} {item['displayName'][:35]:<35} {qty:>10.2f} {suggested:>14}")
    print()
    print(f"Total low-stock items: {len(low_items)}")
    print("Recommendation: Create purchase orders for flagged items.")
EOF
```

## Step 6: Output Report

```markdown
# Business Central Inventory Status Report

**Company:** {companyName}
**Environment:** {environmentName}
**Generated:** {timestamp}

## Inventory Summary

| Metric | Value |
|---|---|
| Total inventory items | {totalItems} |
| Items with zero stock | {zeroStockCount} |
| Items below threshold | {lowStockCount} (threshold: {threshold}) |
| Total inventory value | {totalValue} |

## Item Availability

| Number | Name | Category | UoM | Qty On Hand | Unit Cost | Sales Price |
|---|---|---|---|---|---|---|
| {number} | {name} | {category} | {uom} | {qty} | {cost} | {price} |

## Inventory Valuation (if requested)

| Category | Total Value |
|---|---|
| {category} | {value} |
| **Grand Total** | **{grandTotal}** |

## Item Ledger History (if requested)

| Date | Entry Type | Qty | Cost Amount | Document |
|---|---|---|---|---|
| {date} | {type} | {qty} | {cost} | {docNum} |

## Low Stock Alerts (if requested)

| Number | Name | On Hand | Suggested Order Qty |
|---|---|---|---|
| {number} | {name} | {qty} | {suggestedQty} |

## Recommendations

- Zero-stock items: Review demand and create purchase orders if still active
- Negative inventory: Investigate missing receipt postings or incorrect adjustments
- Items below reorder point: Create purchase orders now to avoid stockouts
- High-value slow-moving items: Review for obsolescence and consider write-down
```
