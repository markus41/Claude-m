---
name: fs-setup
description: Set up the Dynamics 365 Field Service plugin — validate auth context, confirm org URL, check Field Service installation, verify security roles, and test work order and booking entity access
argument-hint: "[--org-url <url>] [--check-iot]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Dynamics 365 Field Service Plugin Setup

Interactive guided setup for the Dynamics 365 Field Service plugin. Validates the Dynamics 365 organization URL, checks service principal authentication, verifies Field Service is installed in the environment, confirms required security roles, and tests Dataverse Web API connectivity for Field Service entities.

## Flags

- `--org-url <url>`: Provide the D365 organization URL directly (skips interactive prompt)
- `--check-iot`: Additionally validate Connected Field Service (IoT) configuration

Default: Core Field Service setup (work orders, bookings, resources). IoT check optional.

## Integration Context Fail-Fast Check

Before any external API call, validate integration context from [`docs/integration-context.md`](../../docs/integration-context.md):

- `tenantId` (always required)
- `orgUrl` (Dynamics 365 organization URL — required)
- `environmentCloud`
- `principalType`

If `orgUrl` is missing, attempt to discover it (Step 2). Stop with a structured error if `tenantId` is missing.

## Step 1: Check Prerequisites

### Azure CLI

```bash
az --version
```

Required for token acquisition. If missing, instruct user to install from https://docs.microsoft.com/cli/azure/install-azure-cli.

### Azure CLI Authentication

```bash
az account show --query "{subscription: id, tenant: tenantId, user: user.name}" -o json
```

Confirm the tenant matches the target Dynamics 365 tenant.

## Step 2: Discover or Confirm Organization URL

If `--org-url` was not provided, discover the organization URL via the Discovery Service:

```bash
TOKEN=$(az account get-access-token --resource "https://globaldisco.crm.dynamics.com" --query accessToken -o tsv)

curl -s "https://globaldisco.crm.dynamics.com/api/discovery/v2.0/Instances" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for inst in data.get('value', []):
    print(f\"{inst['FriendlyName']} — {inst['ApiUrl']} ({inst['EnvironmentId']})\")"
```

If multiple environments are returned, use `AskUserQuestion` to let the user select the target environment.

## Step 3: Verify Basic Connectivity (WhoAmI)

```bash
TOKEN=$(az account get-access-token --resource "${D365_ORG_URL}" --query accessToken -o tsv)

curl -s "${D365_ORG_URL}/api/data/v9.2/WhoAmI" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Accept: application/json" | python3 -c "
import sys, json
r = json.load(sys.stdin)
print(f\"UserId: {r['UserId']}\")
print(f\"OrganizationId: {r['OrganizationId']}\")
print(f\"BusinessUnitId: {r['BusinessUnitId']}\")"
```

- If successful: record `UserId` as the `systemuser` GUID.
- If 401: service principal lacks a `systemuser` record — see Step 4.
- If 403: user record exists but lacks security roles — see Step 5.

## Step 4: Verify systemuser Record

```bash
curl -s "${D365_ORG_URL}/api/data/v9.2/systemusers(${USER_ID})?\$select=fullname,isdisabled,accessmode,domainname" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Accept: application/json"
```

- `isdisabled` must be `false`
- `accessmode` should be `4` (Non-interactive) for service principals

### Add Application User (if missing)

1. Open Power Platform Admin Center: https://admin.powerplatform.microsoft.com
2. Navigate to **Environments** > select environment > **Settings** > **Users + permissions** > **Application users**
3. Click **New app user**, select Azure AD application, choose Business Unit
4. Assign Field Service security roles (see Step 5)

## Step 5: Check Field Service Security Roles

```bash
curl -s "${D365_ORG_URL}/api/data/v9.2/systemusers(${USER_ID})/systemuserroles_association?\$select=name,roleid" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "Accept: application/json" | python3 -c "
import sys, json
r = json.load(sys.stdin)
for role in r.get('value', []):
    print(f\"  - {role['name']}\")"
```

Required roles by operation:

| Operation | Required role |
|---|---|
| Work order create/update | `Field Service - Dispatcher` or `Field Service - Administrator` |
| Resource scheduling (URS) | `Field Service - Resource` + `Field Service - Dispatcher` |
| Read-only reporting | `Field Service - Read Only` |
| IoT/Connected Field Service | `IoT - Administrator` + `Field Service - Administrator` |

## Step 6: Verify Field Service Installation

Check that Field Service solution is installed:

```bash
curl -s "${D365_ORG_URL}/api/data/v9.2/msdyn_workordertypes?\$select=msdyn_workordertypeid,msdyn_name&\$top=3" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "Accept: application/json" | python3 -c "
import sys, json
r = json.load(sys.stdin)
print(f\"Field Service work order types found: {len(r.get('value', []))}\")"
```

If the entity does not exist (404), Field Service is not installed. Direct user to install Field Service from Power Platform Admin Center > Dynamics 365 apps.

## Step 7: Test Work Order Access

```bash
# List top 5 work orders
curl -s "${D365_ORG_URL}/api/data/v9.2/msdyn_workorders?\$select=msdyn_name,msdyn_systemstatus&\$top=5" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "Accept: application/json" | python3 -c "
import sys, json
r = json.load(sys.stdin)
print(f\"Work orders accessible: {len(r.get('value', []))}\")"

# List bookable resources
curl -s "${D365_ORG_URL}/api/data/v9.2/bookableresources?\$select=name,resourcetype&\$top=5" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "Accept: application/json" | python3 -c "
import sys, json
r = json.load(sys.stdin)
print(f\"Bookable resources found: {len(r.get('value', []))}\")"
```

## Step 8: Validate IoT Configuration (if --check-iot)

```bash
# Check if Connected Field Service IoT provider is configured
curl -s "${D365_ORG_URL}/api/data/v9.2/msdyn_iotproviders?\$select=msdyn_name,msdyn_hubendpoint" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "Accept: application/json" | python3 -c "
import sys, json
r = json.load(sys.stdin)
providers = r.get('value', [])
if providers:
    for p in providers:
        print(f\"IoT Provider: {p['msdyn_name']}\")
else:
    print('No IoT providers configured — Connected Field Service not set up')"
```

## Step 9: Configure Environment Variables

Create or update `.env`:

```
AZURE_TENANT_ID=<tenant-id>
AZURE_CLIENT_ID=<client-id>
AZURE_CLIENT_SECRET=<client-secret>
D365_ORG_URL=https://<orgname>.crm.dynamics.com
D365_ENVIRONMENT_ID=<environment-guid>
D365_USER_ID=<systemuser-guid>
D365_ORGANIZATION_ID=<organization-guid>
```

Write using the `Write` tool. Verify `.gitignore` contains `.env`.

## Step 10: Output Setup Report

```markdown
# Dynamics 365 Field Service Setup Report

| Component | Status | Details |
|---|---|---|
| Azure CLI | OK / MISSING | v2.x.x |
| Azure authentication | OK / NOT_SIGNED_IN | Tenant: {tenantId} |
| Organization URL | CONFIRMED | {orgUrl} |
| WhoAmI call | OK / FAILED | UserId: {userId} |
| systemuser record | EXISTS / MISSING | IsDisabled: false |
| Security roles | ASSIGNED / MISSING | {roleList} |
| Field Service installation | INSTALLED / MISSING | {N} work order types |
| Work order access | OK / FAILED | {N} accessible |
| Bookable resources | OK / FAILED | {N} resources |
| IoT providers | CONFIGURED / NOT_CONFIGURED / SKIPPED | {N} providers |
| .env file | CREATED / EXISTS / SKIPPED | — |

Setup completed at <timestamp>.
```

## Important Notes

- Field Service licenses must be assigned in Microsoft 365 Admin Center for users who need Field Service app access.
- Universal Resource Scheduling (URS) is a dependency of Field Service and is installed automatically.
- The Discovery Service URL `https://globaldisco.crm.dynamics.com` works for commercial cloud only. For GCC/GovCloud see integration-context.md.
- Reference: `skills/dynamics-365-field-service/SKILL.md` for full API guidance.
