---
name: license-optimizer
description: >
  Deep expertise in Microsoft 365 license management and optimization — SKU inventory,
  usage analysis, group-based licensing, service plan management, downgrade/upgrade
  recommendations, and CSP/MSP billing via Graph API for cost-saving engagements.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
triggers:
  - license optimization
  - unused licenses
  - license waste
  - sku downgrade
  - license savings
  - csp licensing
  - msp license review
  - license cost
  - underused licenses
  - license report
---

# M365 License Optimizer

This skill provides comprehensive knowledge for identifying license waste, recommending right-sizing, managing group-based licensing, and generating savings reports for MSP/CSP customer review meetings via Graph API.

## Integration Context Contract
- Canonical contract: [`docs/integration-context.md`](../../../docs/integration-context.md)

| Workflow | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| License scan, right-sizing, reporting | required | optional | `AzureCloud`\* | `delegated-user` | `Directory.Read.All`, `User.Read.All`, `Reports.Read.All` |

\* Use sovereign cloud values from the canonical contract when applicable.

Fail fast before Graph calls when required context is missing or invalid. Redact tenant/user identifiers in outputs.

## Base URL

```
https://graph.microsoft.com/v1.0
```

All endpoints below are relative to this base URL.

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/subscribedSkus` | List all tenant SKUs with capacity |
| GET | `/subscribedSkus/{skuId}` | Get specific SKU details |
| GET | `/users/{id}/licenseDetails` | Get user's assigned license details |
| POST | `/users/{id}/assignLicense` | Assign or remove licenses from user |
| GET | `/users?$select=assignedLicenses,signInActivity` | List users with license and sign-in data |
| GET | `/groups/{id}/assignedLicenses` | Get group's assigned licenses |
| POST | `/groups/{id}/assignLicense` | Assign license to group (group-based licensing) |
| GET | `/users/{id}/memberOf` | Check group memberships for GBL inheritance |
| GET | `/reports/getOffice365ActiveUserDetail(period='D30')` | Per-user activity across services |
| GET | `/reports/getOffice365ActiveUserCounts(period='D30')` | Aggregate active user counts |
| GET | `/reports/getOffice365ServicesUserCounts(period='D30')` | Per-service active user counts |
| GET | `/reports/getMailboxUsageDetail(period='D30')` | Mailbox activity and storage |

## License Inventory

### List Tenant SKUs

```
GET /subscribedSkus
```

**Response fields:**
- `skuPartNumber` — friendly SKU identifier
- `skuId` — GUID for API operations
- `prepaidUnits.enabled` — total purchased licenses
- `consumedUnits` — currently assigned licenses
- `appliesTo` — `User` or `Company`
- `servicePlans[]` — individual service plans included in the SKU

**Available licenses formula:** `prepaidUnits.enabled - consumedUnits`

### List User License Details

```
GET /users?$select=displayName,userPrincipalName,assignedLicenses,signInActivity,accountEnabled
  &$filter=assignedLicenses/$count ne 0
  &$count=true
  &$orderby=signInActivity/lastSignInDateTime asc
Header: ConsistencyLevel: eventual
```

### Assign License Request Body

```json
POST /users/{userId}/assignLicense
{
  "addLicenses": [
    {
      "skuId": "05e9a617-0261-4cee-bb44-138d3ef5d965",
      "disabledPlans": [
        "efb87545-963c-4e0d-99df-69c6916d9eb0"
      ]
    }
  ],
  "removeLicenses": []
}
```

### Remove License Request Body

```json
POST /users/{userId}/assignLicense
{
  "addLicenses": [],
  "removeLicenses": ["05e9a617-0261-4cee-bb44-138d3ef5d965"]
}
```

## Group-Based Licensing

Assign licenses to a group so all members automatically inherit the license:

### Assign License to Group

```json
POST /groups/{groupId}/assignLicense
{
  "addLicenses": [
    {
      "skuId": "05e9a617-0261-4cee-bb44-138d3ef5d965",
      "disabledPlans": []
    }
  ],
  "removeLicenses": []
}
```

### Check Group License Processing Status

```
GET /groups/{groupId}?$select=assignedLicenses,licenseProcessingState
```

**`licenseProcessingState` values:** `QueuedForProcessing`, `ProcessingInProgress`, `ProcessingComplete`.

### Find Users with Group-Based License Errors

```
GET /groups/{groupId}/membersWithLicenseErrors
```

Returns users whose license could not be applied due to conflicts or insufficient licenses.

## Common SKU Reference

| Friendly Name | SKU Part Number | SKU ID (GUID) | Monthly Cost (USD) |
|---|---|---|---|
| Microsoft 365 F1 | `M365_F1` | `44575883-256e-4a79-9da4-ebe9acabe2b2` | ~$2.25 |
| Microsoft 365 F3 | `SPE_F1` | `66b55226-6b4f-492c-910c-a3b7a3c9d993` | ~$8.00 |
| Microsoft 365 Business Basic | `O365_BUSINESS_ESSENTIALS` | `3b555118-da6a-4418-894f-7df1e2096870` | ~$6.00 |
| Microsoft 365 Business Standard | `O365_BUSINESS_PREMIUM` | `f245ecc8-75af-4f8e-b61f-27d8114de5f3` | ~$12.50 |
| Microsoft 365 Business Premium | `SPB` | `cbdc14ab-d96c-4c30-b9f4-6ada7cdc1d46` | ~$22.00 |
| Microsoft 365 E1 | `STANDARDPACK` | `18181a46-0d4e-45cd-891e-60aabd171b4e` | ~$8.00 |
| Microsoft 365 E3 | `ENTERPRISEPACK` | `05e9a617-0261-4cee-bb44-138d3ef5d965` | ~$36.00 |
| Microsoft 365 E5 | `ENTERPRISEPREMIUM` | `06ebc4ee-1bb5-47dd-8120-11324bc54e06` | ~$57.00 |
| Exchange Online Plan 1 | `EXCHANGESTANDARD` | `4b9405b0-7788-4568-add1-99614e613b69` | ~$4.00 |
| Exchange Online Plan 2 | `EXCHANGEENTERPRISE` | `19ec0d23-8335-4cbd-94ac-6050e30712fa` | ~$8.00 |

*Prices are approximate list prices. CSP/EA pricing varies.*

## Service Plan ID Reference (Top 20)

| Service Plan Name | Service Plan ID | Included In |
|---|---|---|
| Exchange Online (Plan 1) | `9aaf7827-d63c-4b61-89c3-182f06f82b13` | E1, E3, Business Basic/Standard |
| Exchange Online (Plan 2) | `efb87545-963c-4e0d-99df-69c6916d9eb0` | E3, E5 |
| SharePoint Online (Plan 1) | `e95bec33-7c88-4a70-8e19-b10bd9d0c014` | E1, Business Basic |
| SharePoint Online (Plan 2) | `5dbe027f-2339-4123-9542-606e4d348a72` | E3, E5 |
| Microsoft Teams | `57ff2da0-773e-42df-b2af-ffb7a2317929` | All M365/O365 plans |
| Office Apps for Enterprise | `43de0ff5-c92c-492b-9116-175376d08c38` | E3, E5 |
| Microsoft Intune Plan 1 | `c1ec4a95-1f05-45b3-a911-aa3fa01094f5` | E3, E5, Business Premium |
| Azure AD Premium P1 | `41781fb2-bc02-4b7c-bd55-b576c07bb09d` | E3, E5, Business Premium |
| Azure AD Premium P2 | `eec0eb4f-6444-4f95-aba0-50c24d67f998` | E5 |
| Microsoft Defender for Office 365 P1 | `f20fedf3-f3c3-43c3-8267-2bfdd51c0939` | Business Premium |
| Microsoft Defender for Office 365 P2 | `8e0c0a52-6a6c-4d40-8370-dd62790dcd70` | E5 |
| Cloud App Security | `2e2ddb96-6af9-4b1d-a3f0-d6ecfd22edb2` | E5 |
| Power BI Pro | `70d33638-9c74-4d01-bfd3-562de28bd4ba` | E5 |
| Audio Conferencing | `3e26ee1f-8a5f-4d52-aee2-b81ce45c8f40` | E5 |
| Phone System | `4828c8ec-dc2e-4571-b391-0e3e3b8e29b2` | E5 |
| Information Protection P1 | `5136a095-5cf0-4aff-bec3-e84448b38ea5` | E3, E5 |
| Information Protection P2 | `efb0351d-3b08-4503-993d-383af8de41e3` | E5 |
| OneDrive for Business (Plan 1) | `e95bec33-7c88-4a70-8e19-b10bd9d0c014` | E1, Business Basic |
| OneDrive for Business (Plan 2) | `5dbe027f-2339-4123-9542-606e4d348a72` | E3, E5 |
| Yammer Enterprise | `7547a3fe-08ee-4ccb-b430-5077c5041653` | E1, E3, E5 |

## Optimization Patterns

### Pattern 1: Inactive License Detection

Users with a license but no sign-in for 30+ days:

```
GET /users?$filter=signInActivity/lastSignInDateTime le {30daysAgo}
  &$select=displayName,userPrincipalName,assignedLicenses,signInActivity,accountEnabled
  &$count=true
  &$orderby=signInActivity/lastSignInDateTime asc
Header: ConsistencyLevel: eventual
```

**Quick wins:**
- Disabled accounts with licenses → remove licenses immediately
- Accounts with no sign-in ever → likely service accounts or stale provisioning
- Accounts with 60+ days inactive → candidate for license removal or downgrade

### Pattern 2: Downgrade Analysis

| Current | Target | Savings/user/mo | Check Before Downgrade |
|---------|--------|----------------|----------------------|
| E5 → E3 | $21 | Not using Defender P2, Phone System, Power BI Pro, Audio Conferencing, AIP P2 |
| E3 → E1 | $28 | Not using desktop Office apps, no Intune dependency |
| E3 → F3 | $28 | Frontline worker — no desktop apps, limited storage acceptable |
| Business Premium → Standard | $9.50 | Not using Intune or advanced security features |
| Business Standard → Basic | $6.50 | Not using desktop Office apps |

### Pattern 3: Service Plan Usage Verification

Before downgrading, verify which service plans the user actually uses:

```
GET /users/{userId}/licenseDetails
```

Cross-reference `servicePlans` with actual usage:
- **Exchange Online**: `GET /reports/getMailboxUsageDetail(period='D30')` — check mailbox activity
- **SharePoint**: `GET /reports/getSharePointActivityUserDetail(period='D30')` — check file activity
- **Teams**: `GET /reports/getTeamsUserActivityUserDetail(period='D30')` — check Teams activity
- **Office Apps**: `GET /reports/getOffice365ActivationsUserDetail` — check activation status

### Pattern 4: Group-Based License Cleanup

1. `GET /groups?$filter=assignedLicenses/$count ne 0&$count=true` — find groups with licenses
2. For each group: `GET /groups/{id}/members?$count=true` — count members
3. Cross-reference with `GET /subscribedSkus` — verify capacity vs assignment
4. `GET /groups/{id}/membersWithLicenseErrors` — find failed assignments
5. Resolve errors: insufficient licenses, service plan conflicts, or missing usage location

## Usage Report Endpoints Reference

| Report | Endpoint | Data Lag |
|--------|----------|----------|
| Active users (all services) | `/reports/getOffice365ActiveUserDetail(period='D30')` | 48 hours |
| Mailbox usage | `/reports/getMailboxUsageDetail(period='D30')` | 48 hours |
| SharePoint activity | `/reports/getSharePointActivityUserDetail(period='D30')` | 48 hours |
| OneDrive activity | `/reports/getOneDriveActivityUserDetail(period='D30')` | 48 hours |
| Teams activity | `/reports/getTeamsUserActivityUserDetail(period='D30')` | 48 hours |
| Office activations | `/reports/getOffice365ActivationsUserDetail` | 48 hours |

**Period values:** `D7`, `D30`, `D90`, `D180`.

## Pagination Handling

All list endpoints may return paginated results:

```javascript
let allUsers = [];
let url = "/users?$select=assignedLicenses,signInActivity&$top=999&$count=true";

while (url) {
  const response = await client.api(url)
    .header("ConsistencyLevel", "eventual")
    .get();
  allUsers.push(...response.value);
  url = response["@odata.nextLink"] || null;
}
```

**Important:** `$top` max is 999 for user listing. Always follow `@odata.nextLink` for complete results.

## Multi-Tenant (Lighthouse) Scanning

For MSPs scanning across customer tenants:

```
GET /tenantRelationships/managedTenants/tenants
```

Then for each tenant, authenticate via GDAP and run license scan queries.

### Required GDAP Roles

| Operation | Minimum GDAP Role |
|-----------|-------------------|
| Read licenses | License Administrator or Global Reader |
| Read usage reports | Reports Reader |
| Read sign-in activity | Sign-in Logs Reader or Global Reader |
| Assign/remove licenses | License Administrator |

## Savings Calculation

```
Monthly savings = (inactive_count × license_monthly_cost) + (downgrade_count × savings_per_downgrade)
Annual savings = monthly_savings × 12
```

## Required Permissions

| Operation | Permission / Role |
|-----------|-------------------|
| Read tenant SKUs | `Organization.Read.All` |
| Read user licenses | `User.Read.All` |
| Read sign-in activity | `AuditLog.Read.All` + `User.Read.All` |
| Assign/remove user licenses | `User.ReadWrite.All` + `Directory.ReadWrite.All` |
| Group-based licensing | `Group.ReadWrite.All` + `Directory.ReadWrite.All` |
| Usage reports | `Reports.Read.All` |

## Error Handling

| Status Code | Meaning | Common Cause |
|-------------|---------|--------------|
| 400 Bad Request | Malformed request | Service plan conflict, invalid SKU ID, missing usage location |
| 401 Unauthorized | Authentication failure | Expired token, missing scope consent |
| 403 Forbidden | Insufficient permissions | Missing License Administrator role |
| 404 Not Found | Resource not found | Invalid user or SKU ID |
| 409 Conflict | Operation conflict | License already assigned, conflicting service plans |
| 429 Too Many Requests | Throttled | Implement exponential backoff with `Retry-After` header |

### License Assignment Error States

| Error Code | Meaning | Resolution |
|------------|---------|------------|
| `CountViolation` | No available licenses | Purchase more licenses or free existing ones |
| `MutuallyExclusiveViolation` | Conflicting service plans between SKUs | Remove conflicting license before assigning new one |
| `DependencyViolation` | Required service plan not present | Assign prerequisite license first |
| `ProhibitedInUsageLocationViolation` | Service not available in user's location | Set `usageLocation` on user before license assignment |

## OData Filter Reference

| Filter | Purpose | Example |
|--------|---------|---------|
| Inactive users | No sign-in for 30+ days | `$filter=signInActivity/lastSignInDateTime le 2026-01-30` |
| Licensed users | Users with any license | `$filter=assignedLicenses/$count ne 0` |
| Disabled with licenses | Disabled accounts still consuming licenses | `$filter=accountEnabled eq false and assignedLicenses/$count ne 0` |
| Sort by activity | Least active first | `$orderby=signInActivity/lastSignInDateTime asc` |
| With count | Include total | `$count=true` (requires `ConsistencyLevel: eventual`) |

## Important Notes

- `signInActivity` requires Azure AD Premium P1 license on the tenant
- Usage reports have a 48-hour data lag — do not use for real-time decisions
- Disabled accounts with licenses are the easiest win — remove licenses immediately
- E5 license includes many sub-services — check each before recommending E3 downgrade
- CSP license changes take effect at next billing cycle
- Group-based licensing requires Azure AD Premium P1
- Maximum 999 users per `$top` parameter — always paginate

## Progressive Disclosure — Reference Files

| Topic | File |
|---|---|
| Graph subscribedSku API, user license assignment, SKU ID mapping table, service plan IDs, assignment path (direct vs group) | [`references/license-analysis-api.md`](./references/license-analysis-api.md) |
| Inactive user detection, signInActivity API, 90-day threshold, activity reports (Exchange/Teams/Office apps), EXO mailbox stats | [`references/inactive-detection.md`](./references/inactive-detection.md) |
| License cost table, downgrade scenarios, savings calculation, group-based efficiency, executive summary report format | [`references/savings-reporting.md`](./references/savings-reporting.md) |
