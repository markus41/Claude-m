---
name: business-central-setup
description: Set up the Business Central plugin — discover BC environments, select a company, validate API connectivity, check permission sets, and test Finance and Supply Chain access
argument-hint: "[--environment <name>] [--company-name <name>] [--finance-only] [--supply-chain-only]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Business Central Plugin Setup

Interactive guided setup for the Business Central plugin. Discovers BC environments, selects the target company, validates API v2.0 connectivity, verifies the service principal has the required BC permission sets, and tests Finance and Supply Chain entity access.

## Flags

- `--environment <name>`: Target BC environment name (e.g., `Production`, `Sandbox`); skips discovery prompt
- `--company-name <name>`: Target company display name; skips company selection prompt
- `--finance-only`: Check only Finance entities (GL, customers, vendors)
- `--supply-chain-only`: Check only Supply Chain entities (items, sales orders, purchase orders)

Default: Full setup covering both Finance and Supply Chain.

## Integration Context Fail-Fast Check

Before any external API call, validate:

- `tenantId` (always required — stop with a structured error if missing)
- `environmentCloud` (default `AzureCloud`)
- `principalType` (`service-principal` for automation; `delegated-user` for interactive)

## Step 1: Check Prerequisites

### Azure CLI

```bash
az --version
```

Required for token acquisition. If missing, instruct the user to install Azure CLI.

### Azure CLI Authentication

```bash
az account show --query "{subscription: id, tenant: tenantId, user: user.name}" -o json
```

Confirm the tenant matches the target Business Central tenant. If `tenantId` from `az account show` differs from integration context, warn the user.

### jq (optional but recommended)

```bash
jq --version 2>/dev/null && echo "jq available" || echo "jq not found — will use python3 for JSON parsing"
```

## Step 2: Discover BC Environments

Acquire a token for the Business Central resource and list all environments:

```bash
BC_TOKEN=$(az account get-access-token \
  --resource "https://api.businesscentral.dynamics.com" \
  --query accessToken -o tsv)

TENANT_ID=$(az account show --query tenantId -o tsv)

curl -s "https://api.businesscentral.dynamics.com/v2.0/${TENANT_ID}/environments" \
  -H "Authorization: Bearer $BC_TOKEN" \
  -H "Accept: application/json" | python3 -c "
import sys, json
data = json.load(sys.stdin)
envs = data.get('value', [])
for e in envs:
    print(f\"{e['name']} [{e['type']}] — version {e.get('applicationVersion','?')} — status {e.get('status','?')}\")"
```

**Token audience must be `https://api.businesscentral.dynamics.com` — not management.azure.com.**

If `--environment` was not provided and multiple environments are returned, use `AskUserQuestion` to let the user select the target environment.

If no environments are returned, the service principal lacks the `Financials.ReadWrite.All` delegated/application permission or has not been added as an application user in BC Admin Center.

## Step 3: Discover Companies in the Environment

```bash
ENV_NAME="<selected-environment-name>"

curl -s "https://api.businesscentral.dynamics.com/v2.0/${TENANT_ID}/${ENV_NAME}/api/v2.0/companies" \
  -H "Authorization: Bearer $BC_TOKEN" \
  -H "Accept: application/json" | python3 -c "
import sys, json
data = json.load(sys.stdin)
companies = data.get('value', [])
for c in companies:
    print(f\"{c['displayName']} — ID: {c['id']} — systemVersion: {c.get('systemVersion','?')}\")"
```

If `--company-name` was not provided and multiple companies exist, use `AskUserQuestion` to let the user select the target company.

Record the selected company `id` as `COMPANY_ID`.

## Step 4: Verify Finance Access (skip if --supply-chain-only)

### Chart of Accounts

```bash
BASE_URL="https://api.businesscentral.dynamics.com/v2.0/${TENANT_ID}/${ENV_NAME}/api/v2.0/companies(${COMPANY_ID})"

curl -s "${BASE_URL}/accounts?\$select=id,number,displayName,category&\$filter=blocked eq false&\$top=5" \
  -H "Authorization: Bearer $BC_TOKEN" \
  -H "Accept: application/json" | python3 -c "
import sys, json
r = json.load(sys.stdin)
accounts = r.get('value', [])
print(f'Chart of accounts accessible — {len(accounts)} accounts returned (top 5)')
for a in accounts:
    print(f\"  {a['number']} {a['displayName']} [{a['category']}]\")"
```

### GL Entries (Last 30 Days)

```bash
import_date=$(python3 -c "from datetime import date, timedelta; print((date.today() - timedelta(days=30)).isoformat())")

curl -s "${BASE_URL}/generalLedgerEntries?\$select=id,postingDate,documentNumber,debitAmount,creditAmount&\$filter=postingDate ge ${import_date}&\$top=5" \
  -H "Authorization: Bearer $BC_TOKEN" \
  -H "Accept: application/json" | python3 -c "
import sys, json
r = json.load(sys.stdin)
entries = r.get('value', [])
print(f'GL entries accessible — {len(entries)} entries found (last 30 days, top 5)')"
```

### Customers

```bash
curl -s "${BASE_URL}/customers?\$select=id,number,displayName,balance&\$top=5" \
  -H "Authorization: Bearer $BC_TOKEN" \
  -H "Accept: application/json" | python3 -c "
import sys, json
r = json.load(sys.stdin)
customers = r.get('value', [])
print(f'Customers accessible — {len(customers)} customers returned (top 5)')"
```

### Vendors

```bash
curl -s "${BASE_URL}/vendors?\$select=id,number,displayName,balance&\$top=5" \
  -H "Authorization: Bearer $BC_TOKEN" \
  -H "Accept: application/json" | python3 -c "
import sys, json
r = json.load(sys.stdin)
vendors = r.get('value', [])
print(f'Vendors accessible — {len(vendors)} vendors returned (top 5)')"
```

## Step 5: Verify Supply Chain Access (skip if --finance-only)

### Items

```bash
curl -s "${BASE_URL}/items?\$select=id,number,displayName,type,inventory&\$top=5" \
  -H "Authorization: Bearer $BC_TOKEN" \
  -H "Accept: application/json" | python3 -c "
import sys, json
r = json.load(sys.stdin)
items = r.get('value', [])
print(f'Items accessible — {len(items)} items returned (top 5)')
for i in items:
    print(f\"  {i['number']} {i['displayName']} [{i['type']}] — qty: {i.get('inventory',0)}\")"
```

### Sales Orders

```bash
curl -s "${BASE_URL}/salesOrders?\$select=id,number,customerName,status,totalAmountIncludingTax&\$top=5" \
  -H "Authorization: Bearer $BC_TOKEN" \
  -H "Accept: application/json" | python3 -c "
import sys, json
r = json.load(sys.stdin)
orders = r.get('value', [])
print(f'Sales orders accessible — {len(orders)} orders returned (top 5)')"
```

### Purchase Orders

```bash
curl -s "${BASE_URL}/purchaseOrders?\$select=id,number,vendorName,status,totalAmountIncludingTax&\$top=5" \
  -H "Authorization: Bearer $BC_TOKEN" \
  -H "Accept: application/json" | python3 -c "
import sys, json
r = json.load(sys.stdin)
orders = r.get('value', [])
print(f'Purchase orders accessible — {len(orders)} orders returned (top 5)')"
```

## Step 6: Check Permission Sets in BC

BC authorization is controlled by **Permission Sets** assigned to the application user in the BC environment. Required sets:

| Workload | Recommended permission set |
|---|---|
| Finance read | `D365 BUS FULL ACCESS` or `FINANCE, ALL` |
| Finance write (post journals/invoices) | `D365 BUS FULL ACCESS` |
| Supply Chain read | `D365 BUS FULL ACCESS` or `SALES & RECEIVABLE` |
| Supply Chain write | `D365 BUS FULL ACCESS` |
| Read-only audit | `D365 READ` |

To verify or assign permission sets:
1. Open BC: `https://businesscentral.dynamics.com/{tenantId}/{environmentName}`
2. Navigate to **Users** → find the application user by client ID
3. Check **Permission Sets** FastTab

If the API returns `403 Authorization_RequestDenied`, the application user in BC lacks the required permission set. Guide the user to assign `D365 BUS FULL ACCESS` minimum.

## Step 7: Configure Environment Variables

Write the configuration to `.env`:

```
AZURE_TENANT_ID=<tenant-id>
AZURE_CLIENT_ID=<client-id>
AZURE_CLIENT_SECRET=<client-secret>
BC_ENVIRONMENT=<environment-name>
BC_COMPANY_ID=<company-guid>
BC_COMPANY_NAME=<company-display-name>
BC_BASE_URL=https://api.businesscentral.dynamics.com/v2.0/<tenant-id>/<environment-name>/api/v2.0/companies(<company-guid>)
```

Use the `Write` tool. Verify `.gitignore` contains `.env`.

## Step 8: Output Setup Report

```markdown
# Business Central Setup Report

| Component | Status | Details |
|---|---|---|
| Azure CLI | OK / MISSING | v2.x.x |
| Azure authentication | OK / NOT_SIGNED_IN | Tenant: {tenantId} |
| BC environments discovered | {N} environments | {list of names} |
| Target environment | CONFIRMED | {environmentName} [{type}] |
| Companies in environment | {N} companies | — |
| Target company | CONFIRMED | {companyName} — {companyId} |
| Finance: chart of accounts | OK / FAILED / SKIPPED | {N} accounts |
| Finance: GL entries | OK / FAILED / SKIPPED | {N} entries (last 30 days) |
| Finance: customers | OK / FAILED / SKIPPED | {N} customers |
| Finance: vendors | OK / FAILED / SKIPPED | {N} vendors |
| Supply Chain: items | OK / FAILED / SKIPPED | {N} items |
| Supply Chain: sales orders | OK / FAILED / SKIPPED | {N} orders |
| Supply Chain: purchase orders | OK / FAILED / SKIPPED | {N} orders |
| .env file | CREATED / EXISTS / SKIPPED | — |

Setup completed at <timestamp>.
```

## Important Notes

- The BC API token audience is `https://api.businesscentral.dynamics.com` — tokens for other Azure resources will be rejected.
- Application users in BC must have a user record created in **BC Admin Center** → **Environments** → **Users** before API access works.
- BC environment names are case-sensitive (e.g., `Production` ≠ `production`).
- Multi-company BC tenants require a separate `companyId` per company — there is no cross-company query endpoint.
- Reference: `skills/business-central/SKILL.md` for full API guidance.
