---
name: fs-work-order
description: Create, update, and complete Dynamics 365 Field Service work orders — add service tasks, products, and services; apply incident types; and transition work order lifecycle status
argument-hint: "<action> [--work-order-id <id>] [--account-id <id>] [--incident-type-id <id>] [--priority <high|normal|low>] [--dry-run]"
allowed-tools:
  - Bash
  - Read
  - Write
---

# Dynamics 365 Field Service Work Order Management

Creates, updates, and completes Field Service work orders. Supports applying incident types (which auto-populate service tasks, products, and services), adding individual tasks and parts, and transitioning through the work order lifecycle.

## Arguments

- `<action>`: Required action — `create`, `update`, `add-task`, `add-product`, `complete`, `cancel`
- `--work-order-id <id>`: GUID of existing work order (required for update/add-task/add-product/complete/cancel)
- `--account-id <id>`: Service account GUID (required for create)
- `--incident-type-id <id>`: Incident type GUID to apply (optional for create)
- `--asset-id <id>`: Customer asset GUID to associate
- `--territory-id <id>`: Service territory GUID
- `--priority <high|normal|low>`: Work order priority (default: normal)
- `--time-window-start <datetime>`: Customer preferred start (ISO 8601 UTC)
- `--time-window-end <datetime>`: Customer preferred end (ISO 8601 UTC)
- `--summary <text>`: Work order summary description
- `--resolution <text>`: Resolution notes (required for complete action)
- `--dry-run`: Preview what would be created without executing

## Integration Context Check

Require:
- `D365_ORG_URL`
- `D365_USER_ID`
- Minimum role: `Field Service - Dispatcher`

## Step 1: Validate Required Parameters

For `create`:
- `--account-id` is required — verify the account exists and has Field Service enabled
- `--priority` maps to: high=1, normal=2, low=3

For `update`/`complete`:
- `--work-order-id` is required
- Retrieve current work order to verify it exists and check current status

```bash
TOKEN=$(az account get-access-token --resource "${D365_ORG_URL}" --query accessToken -o tsv)
```

## Step 2: Action — Create Work Order

```bash
PRIORITY_CODE=2
case "${PRIORITY:-normal}" in
  high) PRIORITY_CODE=1 ;;
  normal) PRIORITY_CODE=2 ;;
  low) PRIORITY_CODE=3 ;;
esac

curl -s -X POST \
  "${D365_ORG_URL}/api/data/v9.2/msdyn_workorders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{
    \"msdyn_workordersummary\": \"${SUMMARY}\",
    \"msdyn_systemstatus\": 690970000,
    \"msdyn_priority\": ${PRIORITY_CODE},
    \"msdyn_serviceaccount@odata.bind\": \"/accounts/${ACCOUNT_ID}\",
    \"msdyn_timewindowstart\": \"${TIME_WINDOW_START}\",
    \"msdyn_timewindowend\": \"${TIME_WINDOW_END}\"
  }" | python3 -c "
import sys, json
r = json.load(sys.stdin)
print(f\"Created work order: {r.get('msdyn_name', 'Unknown')} ({r.get('msdyn_workorderid', 'Unknown')})\")
"
```

Capture the `msdyn_workorderid` from the response `OData-EntityId` header or the response body.

## Step 3: Apply Incident Type (if --incident-type-id provided)

Applying an incident type auto-creates service tasks, required products, and required services from the template.

```bash
curl -s -X POST \
  "${D365_ORG_URL}/api/data/v9.2/msdyn_workorders(${WORK_ORDER_ID})/Microsoft.Dynamics.CRM.msdyn_ApplyIncidentTypeToWorkOrder" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{
    \"IncidentType\": {
      \"msdyn_incidenttypeid\": \"${INCIDENT_TYPE_ID}\",
      \"@odata.type\": \"Microsoft.Dynamics.CRM.msdyn_incidenttype\"
    }
  }"
```

After applying, retrieve and list the created service tasks:

```bash
curl -s "${D365_ORG_URL}/api/data/v9.2/msdyn_workorderservicetasks?\$select=msdyn_name,msdyn_estimatedduration,msdyn_lineorder&\$filter=_msdyn_workorder_value eq ${WORK_ORDER_ID}&\$orderby=msdyn_lineorder asc" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "Accept: application/json"
```

## Step 4: Action — Add Service Task (add-task)

Manually add a service task to an existing work order:

```bash
curl -s -X POST \
  "${D365_ORG_URL}/api/data/v9.2/msdyn_workorderservicetasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{
    \"msdyn_name\": \"${TASK_NAME}\",
    \"msdyn_workorder@odata.bind\": \"/msdyn_workorders/${WORK_ORDER_ID}\",
    \"msdyn_estimatedduration\": ${ESTIMATED_DURATION_MINUTES:-30},
    \"msdyn_lineorder\": ${LINE_ORDER:-10}
  }"
```

## Step 5: Action — Add Product (add-product)

Add a part or material to a work order:

```bash
curl -s -X POST \
  "${D365_ORG_URL}/api/data/v9.2/msdyn_workorderproducts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{
    \"msdyn_workorder@odata.bind\": \"/msdyn_workorders/${WORK_ORDER_ID}\",
    \"msdyn_product@odata.bind\": \"/products/${PRODUCT_ID}\",
    \"msdyn_estimatedquantity\": ${QUANTITY:-1},
    \"msdyn_linestatus\": 690970000
  }"
```

## Step 6: Action — Complete Work Order

Completing a work order sets status to Completed and records resolution:

```bash
# First, verify all service tasks are completed
INCOMPLETE=$(curl -s "${D365_ORG_URL}/api/data/v9.2/msdyn_workorderservicetasks?\$select=msdyn_name,msdyn_iscompleted&\$filter=_msdyn_workorder_value eq ${WORK_ORDER_ID} and msdyn_iscompleted eq false" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "Accept: application/json" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('value', [])))")

if [ "$INCOMPLETE" -gt 0 ]; then
  echo "Warning: ${INCOMPLETE} service tasks not yet marked complete."
fi

# Complete the work order
curl -s -X PATCH \
  "${D365_ORG_URL}/api/data/v9.2/msdyn_workorders(${WORK_ORDER_ID})" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -d "{
    \"msdyn_systemstatus\": 690970003,
    \"msdyn_workorderresolution\": \"${RESOLUTION}\"
  }"
```

## Step 7: Action — Update Work Order

General-purpose update for any mutable field:

```bash
curl -s -X PATCH \
  "${D365_ORG_URL}/api/data/v9.2/msdyn_workorders(${WORK_ORDER_ID})" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Content-Type: application/json" \
  -d "{
    \"msdyn_priority\": ${PRIORITY_CODE},
    \"msdyn_workordersummary\": \"${SUMMARY}\",
    \"msdyn_timewindowstart\": \"${TIME_WINDOW_START}\",
    \"msdyn_timewindowend\": \"${TIME_WINDOW_END}\"
  }"
```

## Output Format

```markdown
# Work Order Operation Report
**Action:** {action}
**Timestamp:** {timestamp}
**Organization:** {orgUrl}

## Work Order
| Field | Value |
|---|---|
| Work Order ID | {msdyn_workorderid} |
| Name | {msdyn_name} |
| Status | {systemStatus} |
| Priority | {priority} |
| Service Account | {accountName} |
| Asset | {assetName or N/A} |
| Incident Type | {incidentTypeName or N/A} |

## Service Tasks ({N} total)
| # | Task | Estimated Duration | Completed |
|---|---|---|---|
| 1 | {taskName} | {duration} min | {yes/no} |

## Products ({N} total)
| Product | Qty | Status |
|---|---|---|
| {productName} | {qty} | Estimated |

## Result
{Created / Updated / Completed / Task added / Product added}

## Next Steps
1. {Assign booking if Unscheduled}
2. {Review estimated duration matches SLA window}
3. {Dispatch technician once booking confirmed}
```

## Important Notes

- Status transitions must follow valid paths: Unscheduled → Scheduled → In Progress → Completed → Posted.
- Do not PATCH `msdyn_systemstatus` directly to bypass intermediate states — use the proper transition sequence.
- Applying an incident type is idempotent only if done before any manual tasks are added; applying it twice will create duplicate tasks.
- The work order `msdyn_name` (WO number) is auto-generated by Field Service autonumbering — do not set it manually.
