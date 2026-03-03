---
name: proj-billing
description: Manage Dynamics 365 Project Operations project billing — create project contracts, add contract lines, generate invoice proposals, confirm invoices, review unbilled actuals, and track revenue
argument-hint: "<action> [--project-id <id>] [--contract-id <id>] [--invoice-id <id>] [--invoice-date <date>] [--dry-run]"
allowed-tools:
  - Bash
  - Read
  - Write
---

# Dynamics 365 Project Operations Billing

Creates and manages project contracts, contract lines, invoice proposals, and billing actuals in Dynamics 365 Project Operations via the Dataverse Web API.

## Arguments

- `<action>`: Required — `create-contract`, `add-contract-line`, `generate-invoice`, `confirm-invoice`, `actuals`, `revenue-summary`
- `--project-id <id>`: Project GUID
- `--contract-id <id>`: Project contract (salesorder) GUID
- `--contract-line-id <id>`: Contract line (salesorderdetail) GUID
- `--invoice-id <id>`: Invoice GUID
- `--customer-id <id>`: Customer account GUID (required for create-contract)
- `--price-level-id <id>`: Price list GUID (required for create-contract)
- `--org-unit-id <id>`: Organizational unit GUID (required for create-contract)
- `--invoice-date <date>`: Invoice date (ISO 8601, e.g., 2026-05-31)
- `--billing-method <t&m|fixed>`: Contract line billing method (default: t&m)
- `--budget-amount <n>`: Contract line budget amount
- `--dry-run`: Preview without executing

## Integration Context Check

Require:
- `D365_ORG_URL`
- Minimum role: `Project Billing Admin` or `Billing Manager`

## Step 1: Authenticate

```bash
TOKEN=$(az account get-access-token --resource "${D365_ORG_URL}" --query accessToken -o tsv)
```

## Step 2: Action — Create Project Contract (create-contract)

```bash
# Get default org unit if not provided
if [ -z "${ORG_UNIT_ID}" ]; then
  ORG_UNIT_ID=$(curl -s "${D365_ORG_URL}/api/data/v9.2/msdyn_projectparameters?\$select=_msdyn_defaultorganizationalunit_value&\$top=1" \
    -H "Authorization: Bearer $TOKEN" \
    -H "OData-MaxVersion: 4.0" \
    -H "Accept: application/json" | python3 -c "
import sys, json
r = json.load(sys.stdin)
params = r.get('value', [])
print(params[0].get('_msdyn_defaultorganizationalunit_value', '') if params else '')")
fi

curl -s -X POST \
  "${D365_ORG_URL}/api/data/v9.2/salesorders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{
    \"name\": \"${CONTRACT_NAME}\",
    \"customerid_account@odata.bind\": \"/accounts/${CUSTOMER_ID}\",
    \"pricelevelid@odata.bind\": \"/pricelevels/${PRICE_LEVEL_ID}\",
    \"msdyn_contractorganizationalunit@odata.bind\": \"/msdyn_organizationalunits/${ORG_UNIT_ID}\",
    \"msdyn_project@odata.bind\": \"/msdyn_projects/${PROJECT_ID}\",
    \"orderstatus\": 3,
    \"msdyn_ordertype\": 3
  }"
```

Note the `salesorderid` from the `OData-EntityId` response header.

## Step 3: Action — Add Contract Line (add-contract-line)

```bash
BILLING_METHOD=192350000  # Time and Material default
if [ "${BILLING_METHOD_ARG}" = "fixed" ]; then
  BILLING_METHOD=192350001
fi

curl -s -X POST \
  "${D365_ORG_URL}/api/data/v9.2/salesorderdetails" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{
    \"salesorderid@odata.bind\": \"/salesorders/${CONTRACT_ID}\",
    \"msdyn_project@odata.bind\": \"/msdyn_projects/${PROJECT_ID}\",
    \"msdyn_billingmethod\": ${BILLING_METHOD},
    \"msdyn_budgetamount\": ${BUDGET_AMOUNT:-0},
    \"quantity\": 1,
    \"priceperunit\": ${BUDGET_AMOUNT:-0},
    \"extendedamount\": ${BUDGET_AMOUNT:-0}
  }"
```

## Step 4: Action — Generate Invoice Proposal (generate-invoice)

```bash
INVOICE_DATE="${INVOICE_DATE:-$(date +%Y-%m-%dT00:00:00Z)}"

curl -s -X POST \
  "${D365_ORG_URL}/api/data/v9.2/msdyn_projects(${PROJECT_ID})/Microsoft.Dynamics.CRM.msdyn_CreateInvoice" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{
    \"InvoiceDate\": \"${INVOICE_DATE}\"
  }" | python3 -c "
import sys, json
r = json.load(sys.stdin)
invoice_id = r.get('InvoiceId', r.get('invoiceid', 'Unknown'))
print(f'Invoice proposal created: {invoice_id}')"
```

### Preview Invoice Before Confirming

```bash
curl -s "${D365_ORG_URL}/api/data/v9.2/invoices(${INVOICE_ID})?\$select=name,totalamount,totaltax,invoicestatuscode,datedelivered&\$expand=customerid_account(\$select=name)" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "Accept: application/json"
```

Review the invoice lines:

```bash
curl -s "${D365_ORG_URL}/api/data/v9.2/invoicedetails?\$select=invoicedetailid,productdescription,quantity,priceperunit,extendedamount&\$filter=_invoiceid_value eq ${INVOICE_ID}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "Accept: application/json"
```

## Step 5: Action — Confirm Invoice (confirm-invoice)

```bash
# Dry-run: show invoice summary before confirming
if [ "${DRY_RUN}" = "true" ]; then
  curl -s "${D365_ORG_URL}/api/data/v9.2/invoices(${INVOICE_ID})?\$select=name,totalamount,invoicestatuscode" \
    -H "Authorization: Bearer $TOKEN" \
    -H "OData-MaxVersion: 4.0" \
    -H "Accept: application/json" | python3 -c "
import sys, json
r = json.load(sys.stdin)
print('Invoice to confirm (dry run):')
print(f'  Name: {r.get(\"name\")}')
print(f'  Total: \${r.get(\"totalamount\", 0):.2f}')
print(f'  Status: {r.get(\"invoicestatuscode\")}')
print('Confirmation NOT executed (dry run).')"
  exit 0
fi

curl -s -X POST \
  "${D365_ORG_URL}/api/data/v9.2/invoices(${INVOICE_ID})/Microsoft.Dynamics.CRM.msdyn_ConfirmInvoice" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -d '{}'

echo "Invoice confirmed. Actuals updated from Unbilled Sales to Billed Sales."
```

## Step 6: Action — View Unbilled Actuals (actuals)

```bash
curl -s "${D365_ORG_URL}/api/data/v9.2/msdyn_actuals?\$select=msdyn_actualid,msdyn_transactiontype,msdyn_amount,msdyn_quantity,msdyn_transactiondate,msdyn_billingstatus,msdyn_documenttype&\$expand=msdyn_task(\$select=msdyn_subject),msdyn_bookableresource(\$select=name),msdyn_resourcecategory(\$select=name)&\$filter=_msdyn_project_value eq ${PROJECT_ID} and msdyn_transactiontype eq 192350005 and msdyn_billingstatus eq 192350000 and statecode eq 0&\$orderby=msdyn_transactiondate asc" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "Accept: application/json" | python3 -c "
import sys, json

TRANS_TYPE = {192350000: 'Cost', 192350001: 'Inter-Org Sales', 192350004: 'Billed Sales', 192350005: 'Unbilled Sales'}
DOC_TYPE = {192350003: 'Time Entry', 192350004: 'Expense', 192350005: 'Journal'}

r = json.load(sys.stdin)
actuals = r.get('value', [])
total_unbilled = sum(a.get('msdyn_amount', 0) for a in actuals)
print(f'Unbilled actuals: {len(actuals)} entries | Total: \${total_unbilled:,.2f}')
print()
for a in actuals:
    resource = a.get('msdyn_bookableresource', {}).get('name', 'Unknown') if a.get('msdyn_bookableresource') else 'Unknown'
    task = a.get('msdyn_task', {}).get('msdyn_subject', 'Unknown') if a.get('msdyn_task') else 'Unknown'
    role = a.get('msdyn_resourcecategory', {}).get('name', '') if a.get('msdyn_resourcecategory') else ''
    amount = a.get('msdyn_amount', 0)
    qty = a.get('msdyn_quantity', 0)
    date = a.get('msdyn_transactiondate', '')[:10]
    doc = DOC_TYPE.get(a.get('msdyn_documenttype', 0), 'Other')
    print(f'  {date} | {resource} | {task} | {role} | {doc} | {qty:.1f}h | \${amount:,.2f}')"
```

## Step 7: Action — Revenue Summary (revenue-summary)

```bash
# Summarize actuals by transaction type for the project
curl -s "${D365_ORG_URL}/api/data/v9.2/msdyn_actuals?\$apply=filter(_msdyn_project_value eq ${PROJECT_ID} and statecode eq 0)/groupby((msdyn_transactiontype),aggregate(msdyn_amount with sum as totalAmount,\$count as transactionCount))" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "Accept: application/json" | python3 -c "
import sys, json

TRANS_TYPE = {
  192350000: 'Cost', 192350001: 'Inter-Org Sales',
  192350002: 'Resale', 192350004: 'Billed Sales',
  192350005: 'Unbilled Sales', 192350006: 'Tax'
}

r = json.load(sys.stdin)
print('Revenue Summary:')
print(f'  {\"Type\":<20} {\"Count\":>8} {\"Total Amount\":>16}')
print('  ' + '-'*46)
for row in r.get('value', []):
    ttype = TRANS_TYPE.get(row.get('msdyn_transactiontype', 0), 'Other')
    count = row.get('transactionCount', 0)
    amount = row.get('totalAmount', 0)
    print(f'  {ttype:<20} {count:>8} {\"\$\"+f\"{amount:,.2f}\":>16}')"
```

## Output Format

```markdown
# Project Operations Billing Report
**Action:** {action}
**Timestamp:** {timestamp}

## Project Contract (if create-contract)
| Field | Value |
|---|---|
| Contract ID | {salesorderid} |
| Name | {name} |
| Customer | {customerName} |
| Status | Active |
| Linked Project | {projectName} |

## Contract Lines
| Billing Method | Budget | Line ID |
|---|---|---|
| Time and Material | $280,000 | {id} |

## Invoice (if generate-invoice / confirm-invoice)
| Field | Value |
|---|---|
| Invoice ID | {invoiceId} |
| Name | {invoiceName} |
| Total | ${totalAmount} |
| Status | {status} |
| Invoice Date | {date} |

## Invoice Lines
| Description | Qty | Price | Total |
|---|---|---|---|
| Time — Alex Rivera — Infrastructure | 120h | $150/h | $18,000 |
| Expense — Travel | 1 | $285.50 | $285.50 |

## Unbilled Actuals Summary
| Transaction Type | Count | Total |
|---|---|---|
| Unbilled Sales | 48 | $72,450.00 |
| Cost | 48 | $43,200.00 |

## Revenue Summary
| Type | Count | Total |
|---|---|---|
| Cost | 120 | $58,000.00 |
| Unbilled Sales | 48 | $72,450.00 |
| Billed Sales | 72 | $108,000.00 |

## Next Steps
1. Confirm invoice to lock actuals and move to Billed Sales
2. {N} unbilled actuals pending — generate invoice to capture
3. Review contract line utilization vs. budget before next billing cycle
```

## Important Notes

- Use `msdyn_ConfirmInvoice` action — do not PATCH `invoicestatuscode` directly, as this skips the actuals reversal/creation workflow.
- After invoice confirmation, `msdyn_actuals` records of type Unbilled Sales (192350005) are reversed and replaced with Billed Sales (192350004) records.
- Project contracts (`salesorders`) in Project Operations must have `msdyn_ordertype = 3` (Project-based) — do not create them as standard Sales Orders.
- Fixed-price contract lines require billing milestones (`msdyn_contractlinescheduleofvalues`) marked complete before they appear on invoice proposals.
