---
name: proj-setup
description: Set up the Dynamics 365 Project Operations plugin — validate auth context, confirm org URL, verify Project Operations is provisioned, check security roles (Project Manager, Team Member, Billing Admin), and test entity access
argument-hint: "[--org-url <url>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Dynamics 365 Project Operations Plugin Setup

Interactive guided setup for the Dynamics 365 Project Operations plugin. Validates the organization URL, checks authentication, confirms Project Operations is provisioned in the environment, verifies security roles, and tests connectivity to project, time entry, and billing entities.

## Flags

- `--org-url <url>`: Provide the D365 organization URL directly (skips interactive prompt)

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

Required for token acquisition.

### Azure CLI Authentication

```bash
az account show --query "{subscription: id, tenant: tenantId, user: user.name}" -o json
```

Confirm the tenant matches the target Dynamics 365 tenant.

## Step 2: Discover or Confirm Organization URL

If `--org-url` was not provided, discover via the Discovery Service:

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

Use `AskUserQuestion` if multiple environments are returned.

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
print(f\"OrganizationId: {r['OrganizationId']}\")"
```

Record `UserId` as the `systemuser` GUID.

## Step 4: Verify systemuser Record

```bash
curl -s "${D365_ORG_URL}/api/data/v9.2/systemusers(${USER_ID})?\$select=fullname,isdisabled,accessmode" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "Accept: application/json"
```

- `isdisabled` must be `false`
- `accessmode` should be `4` (Non-interactive) or `0` (Read-Write)

### Add Application User (if missing)

1. Power Platform Admin Center > Environments > Settings > Users + permissions > Application users
2. New app user → select Azure AD app → assign Business Unit
3. Assign Project Operations security roles (see Step 5)

## Step 5: Check Project Operations Security Roles

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

Required roles by workload:

| Operation | Required role |
|---|---|
| Project create/manage (WBS, team) | `Project Manager` |
| Time and expense entry | `Project Team Member` |
| Resource scheduling | `Resource Manager` |
| Invoice creation and billing | `Project Billing Admin` |
| Read-only reporting | `Project Viewer` |

## Step 6: Verify Project Operations Provisioning

Check for the Project Parameter record — its presence confirms Project Operations is provisioned:

```bash
curl -s "${D365_ORG_URL}/api/data/v9.2/msdyn_projectparameters?\$select=msdyn_projectparameterid,msdyn_orgcalendar&\$top=1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "Accept: application/json" | python3 -c "
import sys, json
r = json.load(sys.stdin)
params = r.get('value', [])
if params:
    print(f'Project Operations: PROVISIONED (parameter ID: {params[0][\"msdyn_projectparameterid\"]})')
else:
    print('Project Operations: NOT PROVISIONED — install from Power Platform Admin Center > Dynamics 365 apps')"
```

## Step 7: Test Entity Access

```bash
# Test projects
curl -s "${D365_ORG_URL}/api/data/v9.2/msdyn_projects?\$select=msdyn_subject,msdyn_projectstage&\$top=3" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "Accept: application/json" | python3 -c "
import sys, json
r = json.load(sys.stdin)
print(f'Projects accessible: {len(r.get(\"value\", []))}')"

# Test time entries
curl -s "${D365_ORG_URL}/api/data/v9.2/msdyn_timeentries?\$select=msdyn_date,msdyn_duration,msdyn_entrystatus&\$top=3" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "Accept: application/json" | python3 -c "
import sys, json
r = json.load(sys.stdin)
print(f'Time entries accessible: {len(r.get(\"value\", []))}')"

# Test organizational units
curl -s "${D365_ORG_URL}/api/data/v9.2/msdyn_organizationalunits?\$select=msdyn_name&\$top=3" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "Accept: application/json" | python3 -c "
import sys, json
r = json.load(sys.stdin)
print(f'Organizational units: {len(r.get(\"value\", []))}')"
```

## Step 8: Configure Environment Variables

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

## Step 9: Output Setup Report

```markdown
# Dynamics 365 Project Operations Setup Report

| Component | Status | Details |
|---|---|---|
| Azure CLI | OK / MISSING | v2.x.x |
| Azure authentication | OK / NOT_SIGNED_IN | Tenant: {tenantId} |
| Organization URL | CONFIRMED | {orgUrl} |
| WhoAmI call | OK / FAILED | UserId: {userId} |
| systemuser record | EXISTS / MISSING | IsDisabled: false |
| Security roles | ASSIGNED / MISSING | {roleList} |
| Project Operations | PROVISIONED / MISSING | Parameter ID: {id} |
| Projects access | OK / FAILED | {N} projects |
| Time entries access | OK / FAILED | {N} time entries |
| Org units | OK / FAILED | {N} units |
| .env file | CREATED / EXISTS / SKIPPED | — |

Setup completed at <timestamp>.
```

## Important Notes

- Project Operations has three deployment topologies: Lite, Resource/Non-stocked, and Stocked/production-based. Some entities may differ depending on deployment type.
- The `msdyn_projectparameters` entity is the most reliable way to confirm Project Operations is installed.
- Token audience must be the exact org URL (e.g., `https://contoso.crm.dynamics.com`).
- Reference: `skills/dynamics-365-project-ops/SKILL.md` for full API guidance.
