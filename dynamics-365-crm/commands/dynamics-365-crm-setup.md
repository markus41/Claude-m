---
name: dynamics-365-crm-setup
description: Set up the Dynamics 365 CRM plugin — validate auth context, confirm org URL, verify service principal has a systemuser record, check D365 app access, and test Dataverse Web API connectivity
argument-hint: "[--org-url <url>] [--sales-only] [--service-only]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Dynamics 365 CRM Plugin Setup

Interactive guided setup for the Dynamics 365 CRM plugin. Validates the Dynamics 365 organization URL, checks service principal authentication, verifies `systemuser` record existence, confirms required security roles, and tests Dataverse Web API connectivity for Sales and Customer Service.

## Flags

- `--org-url <url>`: Provide the D365 organization URL directly (skips interactive prompt)
- `--sales-only`: Check only Dynamics 365 Sales (skip Customer Service validation)
- `--service-only`: Check only Dynamics 365 Customer Service (skip Sales validation)

Default: Full setup covering both Sales and Customer Service.

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

Required for token acquisition. If missing, instruct user to install.

### Azure CLI Authentication

```bash
az account show --query "{subscription: id, tenant: tenantId, user: user.name}" -o json
```

Confirm the tenant matches the target Dynamics 365 tenant.

### PowerShell (optional — for advanced D365 admin)

```bash
pwsh --version
```

- Not required for basic Dataverse Web API operations.
- Required for Dynamics 365 PowerShell module (`Microsoft.Xrm.Tooling.Connector`).

## Step 2: Discover or Confirm Organization URL

If `--org-url` was not provided, discover the organization URL via the Discovery Service.

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

Record the `ApiUrl` as the `orgUrl` (e.g., `https://contoso.crm.dynamics.com`).

## Step 3: Verify Basic Connectivity

Test the Dataverse Web API with a lightweight WhoAmI call:

```bash
TOKEN=$(az account get-access-token --resource "{orgUrl}" --query accessToken -o tsv)

curl -s "{orgUrl}/api/data/v9.2/WhoAmI" \
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

- If successful: confirms `UserId` (the `systemuser` GUID for the caller), `OrganizationId`, and `BusinessUnitId`.
- If 401: the service principal is not authorized for this org. Check the service principal has been added as a user via Power Platform Admin Center.
- If 403: the caller has a `systemuser` record but insufficient security roles.

## Step 4: Verify systemuser Record

A service principal must have a `systemuser` record in the Dataverse org to authenticate. Confirm:

```bash
curl -s "{orgUrl}/api/data/v9.2/systemusers({userId})?$select=fullname,isdisabled,accessmode,domainname" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Accept: application/json"
```

Check:
- `isdisabled` must be `false`
- `accessmode` should be `4` (for non-interactive/application access) or `0` (read-write)

### Add Application User (if missing)

If no `systemuser` record exists, guide the user to create one:

1. Open Power Platform Admin Center: https://admin.powerplatform.microsoft.com
2. Navigate to **Environments** > select target environment > **Settings** > **Users + permissions** > **Application users**
3. Click **New app user**
4. Select the Azure AD application (service principal)
5. Choose the Business Unit
6. Assign required Security Roles (see Step 5)
7. Save

## Step 5: Check Security Roles

Retrieve roles assigned to the application user:

```bash
curl -s "{orgUrl}/api/data/v9.2/systemusers({userId})/systemuserroles_association?$select=name,roleid" \
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
| D365 Sales — full access | `Salesperson` or `Sales Manager` |
| D365 Customer Service — full access | `Customer Service Representative` or `Customer Service Manager` |
| Read-only across all entities | `System Administrator` → `System Customizer` (minimum) |
| Bulk import/export | `System Administrator` |
| Power Automate integration | `Environment Maker` |

If roles are missing, guide user to assign them via Power Platform Admin Center > Application Users > Manage security roles.

## Step 6: Validate Sales Access (skip if --service-only)

Test read access to Sales entities:

```bash
# List top 5 open leads
curl -s "{orgUrl}/api/data/v9.2/leads?\$select=fullname,companyname,statuscode&\$filter=statecode eq 0&\$top=5" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "Accept: application/json" | python3 -c "
import sys, json
r = json.load(sys.stdin)
print(f\"Open leads found: {len(r.get('value', []))}\")"

# List top 5 open opportunities
curl -s "{orgUrl}/api/data/v9.2/opportunities?\$select=name,estimatedvalue,stepname&\$filter=statecode eq 0&\$top=5" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "Accept: application/json" | python3 -c "
import sys, json
r = json.load(sys.stdin)
print(f\"Open opportunities found: {len(r.get('value', []))}\")"
```

## Step 7: Validate Customer Service Access (skip if --sales-only)

```bash
# List top 5 active cases
curl -s "{orgUrl}/api/data/v9.2/incidents?\$select=ticketnumber,title,prioritycode,statecode&\$filter=statecode eq 0&\$top=5" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "Accept: application/json" | python3 -c "
import sys, json
r = json.load(sys.stdin)
print(f\"Active cases found: {len(r.get('value', []))}\")"

# List queues
curl -s "{orgUrl}/api/data/v9.2/queues?\$select=name,queueviewtype&\$top=5" \
  -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" \
  -H "Accept: application/json" | python3 -c "
import sys, json
r = json.load(sys.stdin)
print(f\"Queues found: {len(r.get('value', []))}\")"
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
# Dynamics 365 CRM Setup Report

| Component | Status | Details |
|---|---|---|
| Azure CLI | OK / MISSING | v2.x.x |
| Azure authentication | OK / NOT_SIGNED_IN | Tenant: {tenantId} |
| Organization URL | CONFIRMED | {orgUrl} |
| WhoAmI call | OK / FAILED | UserId: {userId} |
| systemuser record | EXISTS / MISSING | IsDisabled: false |
| Security roles | ASSIGNED / MISSING | {roleList} |
| Sales access (leads) | OK / FAILED / SKIPPED | {N} open leads |
| Sales access (opps) | OK / FAILED / SKIPPED | {N} open opportunities |
| Customer Service (cases) | OK / FAILED / SKIPPED | {N} active cases |
| Customer Service (queues) | OK / FAILED / SKIPPED | {N} queues |
| .env file | CREATED / EXISTS / SKIPPED | — |

Setup completed at <timestamp>.
```

## Important Notes

- Application users in Dynamics 365 require an `accessmode` of `4` (Non-interactive) for service principals.
- Token audience must be the org URL exactly (e.g., `https://contoso.crm.dynamics.com`), not `https://crm.dynamics.com`.
- The Discovery Service URL `https://globaldisco.crm.dynamics.com` works for commercial cloud. For GCC/GovCloud see integration-context.md.
- Security roles in Dynamics 365 are additive — assign the minimum required roles per operation type.
- Reference: `skills/dynamics-365-crm/SKILL.md` for full API guidance.
