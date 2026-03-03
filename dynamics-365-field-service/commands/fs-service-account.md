---
name: fs-service-account
description: Manage Dynamics 365 Field Service service accounts, customer assets, and functional locations — create assets, link to accounts, set up location hierarchy, and retrieve asset service history
argument-hint: "<action> [--account-id <id>] [--asset-id <id>] [--location-id <id>] [--serial-number <sn>]"
allowed-tools:
  - Bash
  - Read
  - Write
---

# Dynamics 365 Field Service Service Account and Asset Management

Creates and manages service accounts, customer assets, and functional locations. Retrieves asset service history from related work orders.

## Arguments

- `<action>`: Required — `list-assets`, `create-asset`, `update-asset`, `create-location`, `link-asset`, `asset-history`
- `--account-id <id>`: Service account (Account) GUID
- `--asset-id <id>`: Customer asset GUID (required for update-asset/link-asset/asset-history)
- `--location-id <id>`: Functional location GUID
- `--parent-location-id <id>`: Parent functional location GUID (for hierarchy)
- `--asset-name <name>`: Asset name/description
- `--serial-number <sn>`: Asset serial number
- `--category-id <id>`: Customer asset category GUID
- `--location-name <name>`: Functional location name

## Integration Context Check

Require:
- `D365_ORG_URL`
- Minimum role: `Field Service - Dispatcher` or `Field Service - Resource`

## Step 1: Authenticate

```bash
TOKEN=$(az account get-access-token --resource "${D365_ORG_URL}" --query accessToken -o tsv)
```

## Step 2: Action — List Assets for Service Account (list-assets)

```bash
curl -s "${D365_ORG_URL}/api/data/v9.2/msdyn_customerassets?\$select=msdyn_customerassetid,msdyn_name,msdyn_serialnumber,msdyn_lastworkordercompleteddate&\$expand=msdyn_account(\$select=name,address1_city),msdyn_category(\$select=msdyn_name),msdyn_functionallocation(\$select=msdyn_name)&\$filter=_msdyn_account_value eq ${ACCOUNT_ID} and statecode eq 0&\$orderby=msdyn_name asc" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "Accept: application/json" | python3 -c "
import sys, json
r = json.load(sys.stdin)
assets = r.get('value', [])
print(f'Assets for account: {len(assets)}')
for a in assets:
    name = a.get('msdyn_name', 'Unknown')
    sn = a.get('msdyn_serialnumber', 'N/A')
    location = a.get('msdyn_functionallocation', {}).get('msdyn_name', 'No location')
    last_wo = a.get('msdyn_lastworkordercompleteddate', 'Never')[:10] if a.get('msdyn_lastworkordercompleteddate') else 'Never'
    print(f'  {name} | SN: {sn} | Location: {location} | Last service: {last_wo}')"
```

## Step 3: Action — Create Customer Asset (create-asset)

```bash
ASSET_BODY="{
  \"msdyn_name\": \"${ASSET_NAME}\",
  \"msdyn_account@odata.bind\": \"/accounts/${ACCOUNT_ID}\",
  \"msdyn_serialnumber\": \"${SERIAL_NUMBER}\"
}"

# Add optional fields if provided
if [ -n "${CATEGORY_ID}" ]; then
  ASSET_BODY=$(echo "$ASSET_BODY" | python3 -c "
import sys, json
b = json.load(sys.stdin)
b['msdyn_category@odata.bind'] = '/msdyn_customerassetcategories/${CATEGORY_ID}'
print(json.dumps(b))")
fi

if [ -n "${LOCATION_ID}" ]; then
  ASSET_BODY=$(echo "$ASSET_BODY" | python3 -c "
import sys, json
b = json.load(sys.stdin)
b['msdyn_functionallocation@odata.bind'] = '/msdyn_functionallocations/${LOCATION_ID}'
print(json.dumps(b))")
fi

curl -s -X POST \
  "${D365_ORG_URL}/api/data/v9.2/msdyn_customerassets" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "$ASSET_BODY"
```

Note the `msdyn_customerassetid` from the `OData-EntityId` response header.

## Step 4: Action — Update Customer Asset (update-asset)

```bash
curl -s -X PATCH \
  "${D365_ORG_URL}/api/data/v9.2/msdyn_customerassets(${ASSET_ID})" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -d "{
    \"msdyn_name\": \"${ASSET_NAME}\",
    \"msdyn_serialnumber\": \"${SERIAL_NUMBER}\",
    \"msdyn_functionallocation@odata.bind\": \"/msdyn_functionallocations/${LOCATION_ID}\"
  }"
```

## Step 5: Action — Create Functional Location (create-location)

Functional locations represent physical spaces (buildings, floors, rooms) in a hierarchy:

```bash
LOCATION_BODY="{
  \"msdyn_name\": \"${LOCATION_NAME}\",
  \"msdyn_account@odata.bind\": \"/accounts/${ACCOUNT_ID}\"
}"

if [ -n "${PARENT_LOCATION_ID}" ]; then
  LOCATION_BODY=$(echo "$LOCATION_BODY" | python3 -c "
import sys, json
b = json.load(sys.stdin)
b['msdyn_parentfunctionallocation@odata.bind'] = '/msdyn_functionallocations/${PARENT_LOCATION_ID}'
print(json.dumps(b))")
fi

curl -s -X POST \
  "${D365_ORG_URL}/api/data/v9.2/msdyn_functionallocations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "$LOCATION_BODY"
```

## Step 6: Action — Asset Service History (asset-history)

Retrieve all work orders related to this asset:

```bash
curl -s "${D365_ORG_URL}/api/data/v9.2/msdyn_workorders?\$select=msdyn_workorderid,msdyn_name,msdyn_systemstatus,msdyn_workorderresolution,createdon,modifiedon,msdyn_timetocomplete&\$expand=msdyn_primaryincidenttype(\$select=msdyn_name)&\$filter=_msdyn_customerassetid_value eq ${ASSET_ID}&\$orderby=createdon desc&\$top=20" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "Accept: application/json" | python3 -c "
import sys, json

STATUS_LABELS = {
  690970000: 'Unscheduled', 690970001: 'Scheduled',
  690970002: 'In Progress', 690970003: 'Completed',
  690970004: 'Posted', 690970005: 'Canceled'
}

r = json.load(sys.stdin)
orders = r.get('value', [])
print(f'Work orders for asset: {len(orders)}')
for wo in orders:
    name = wo.get('msdyn_name', 'Unknown')
    status = STATUS_LABELS.get(wo.get('msdyn_systemstatus', 0), 'Unknown')
    incident = wo.get('msdyn_primaryincidenttype', {}).get('msdyn_name', 'N/A') if wo.get('msdyn_primaryincidenttype') else 'N/A'
    created = wo.get('createdon', '')[:10]
    ttc = wo.get('msdyn_timetocomplete', 0)
    print(f'  {name} | {status} | {incident} | {created} | {ttc} min')"
```

## Step 7: Query Asset Categories

```bash
curl -s "${D365_ORG_URL}/api/data/v9.2/msdyn_customerassetcategories?\$select=msdyn_customerassetcategoryid,msdyn_name&\$filter=statecode eq 0&\$orderby=msdyn_name asc" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "Accept: application/json"
```

## Output Format

```markdown
# Field Service Service Account / Asset Report
**Action:** {action}
**Timestamp:** {timestamp}

## Service Account
| Field | Value |
|---|---|
| Account Name | {name} |
| Account ID | {accountId} |
| City | {address1_city} |

## Assets ({N} total)
| Asset | Serial Number | Location | Category | Last Service |
|---|---|---|---|---|
| HVAC Unit — Roof West | HVAC-2019-0042 | Building A — Roof | HVAC | 2026-01-15 |
| Generator — B1 | GEN-2020-0011 | Basement B1 | Power | 2025-11-02 |

## Created Asset (if create-asset)
| Field | Value |
|---|---|
| Asset ID | {msdyn_customerassetid} |
| Name | {msdyn_name} |
| Serial Number | {msdyn_serialnumber} |
| Location | {functionalLocationName} |
| Category | {categoryName} |

## Service History (if asset-history)
| Work Order | Status | Incident Type | Date | Duration |
|---|---|---|---|---|
| WO-2026-00101 | Completed | HVAC Compressor Failure | 2026-01-15 | 120 min |
| WO-2025-00893 | Completed | Annual PM | 2025-06-10 | 90 min |

## Next Steps
{Contextual recommendations based on asset health and service history}
```

## Important Notes

- Service accounts in Field Service are standard `accounts` records — use `accountid` from the accounts entity.
- An asset must be linked to a service account (`msdyn_account`) before it can appear on work orders.
- Functional location hierarchy is unlimited depth — use `msdyn_parentfunctionallocation` for multi-level locations (e.g., Site > Building > Floor > Room).
- Asset categories (`msdyn_customerassetcategories`) must be configured in Field Service settings before they can be assigned to assets.
