# License Analysis API — M365 License Optimizer Reference

The Microsoft Graph API provides comprehensive access to tenant SKU inventory, user license assignments, group-based licensing, and usage reports. This reference covers the API endpoints, response schemas, and patterns for building a complete license analysis.

---

## REST API Endpoints (Microsoft Graph)

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| GET | `/subscribedSkus` | `Organization.Read.All` | — | All tenant SKUs with capacity |
| GET | `/subscribedSkus/{skuId}` | `Organization.Read.All` | — | Single SKU detail |
| GET | `/users?$select=assignedLicenses,licenseDetails` | `User.Read.All` | `$filter`, `$select`, `$top` | User license data |
| GET | `/users/{id}/licenseDetails` | `User.Read.All` | — | Full service plan breakdown |
| POST | `/users/{id}/assignLicense` | `User.ReadWrite.All` + `Directory.ReadWrite.All` | Body: add/remove arrays | Assign or remove licenses |
| GET | `/users?$filter=assignedLicenses/$count ne 0` | `User.Read.All` | `$count=true` + `ConsistencyLevel: eventual` | Licensed users only |
| GET | `/groups?$filter=assignedLicenses/$count ne 0` | `Group.Read.All` | `$count=true` + `ConsistencyLevel: eventual` | Groups with licenses |
| GET | `/groups/{id}/assignedLicenses` | `Group.Read.All` | — | Group license assignments |
| POST | `/groups/{id}/assignLicense` | `Group.ReadWrite.All` + `Directory.ReadWrite.All` | Body: add/remove | Group-based licensing |
| GET | `/groups/{id}/membersWithLicenseErrors` | `Group.Read.All` | — | Users with assignment errors |
| GET | `/reports/getOffice365ActiveUserDetail(period='D30')` | `Reports.Read.All` | `period` | Per-user activity CSV |
| GET | `/reports/getOffice365ActiveUserCounts(period='D30')` | `Reports.Read.All` | `period` | Aggregate active counts |
| GET | `/reports/getMailboxUsageDetail(period='D30')` | `Reports.Read.All` | `period` | Mailbox activity |
| GET | `/directoryRoles/{id}/members` | `Directory.Read.All` | — | Role members (for admin detection) |

**Base URL:** `https://graph.microsoft.com/v1.0`

---

## subscribedSku Response Schema

```typescript
interface SubscribedSku {
  id: string;                      // Resource ID
  accountId: string;               // Tenant account ID
  accountName: string;             // Tenant name
  appliesTo: 'User' | 'Company';  // Target type
  capabilityStatus: 'Enabled' | 'Warning' | 'Suspended' | 'Deleted' | 'LockedOut';
  consumedUnits: number;           // Currently assigned
  prepaidUnits: {
    enabled: number;               // Available to assign
    suspended: number;             // Suspended (billing issue)
    warning: number;               // Will expire soon
    lockedOut: number;             // Locked out (billing)
  };
  skuId: string;                   // GUID for API operations
  skuPartNumber: string;           // Friendly name (e.g., ENTERPRISEPACK)
  subscriptionIds: string[];       // Underlying subscription GUIDs
  servicePlans: Array<{
    servicePlanId: string;
    servicePlanName: string;
    provisioningStatus: 'Success' | 'Disabled' | 'PendingInput' | 'PendingActivation' | 'PendingProvisioning';
    appliesTo: 'User' | 'Company';
  }>;
}
```

**Available licenses formula:**
```
available = prepaidUnits.enabled - consumedUnits
utilization_pct = (consumedUnits / prepaidUnits.enabled) * 100
```

---

## Get All Tenant Licenses (TypeScript)

```typescript
import { Client } from '@microsoft/microsoft-graph-client';

interface LicenseInventory {
  skuId: string;
  skuPartNumber: string;
  friendlyName: string;
  totalPurchased: number;
  totalAssigned: number;
  available: number;
  utilizationPct: number;
  capabilityStatus: string;
}

async function getLicenseInventory(client: Client): Promise<LicenseInventory[]> {
  const result = await client.api('/subscribedSkus').get();

  return result.value.map((sku: any) => ({
    skuId: sku.skuId,
    skuPartNumber: sku.skuPartNumber,
    friendlyName: SKU_FRIENDLY_NAMES[sku.skuPartNumber] || sku.skuPartNumber,
    totalPurchased: sku.prepaidUnits.enabled,
    totalAssigned: sku.consumedUnits,
    available: sku.prepaidUnits.enabled - sku.consumedUnits,
    utilizationPct: Math.round((sku.consumedUnits / sku.prepaidUnits.enabled) * 100),
    capabilityStatus: sku.capabilityStatus
  }));
}

// Friendly name lookup table (partial — extend as needed)
const SKU_FRIENDLY_NAMES: Record<string, string> = {
  'ENTERPRISEPREMIUM': 'Microsoft 365 E5',
  'ENTERPRISEPACK': 'Microsoft 365 E3',
  'STANDARDPACK': 'Microsoft 365 E1',
  'SPE_E3': 'Microsoft 365 E3',
  'SPE_E5': 'Microsoft 365 E5',
  'SPB': 'Microsoft 365 Business Premium',
  'O365_BUSINESS_PREMIUM': 'Microsoft 365 Business Standard',
  'O365_BUSINESS_ESSENTIALS': 'Microsoft 365 Business Basic',
  'EXCHANGESTANDARD': 'Exchange Online Plan 1',
  'EXCHANGEENTERPRISE': 'Exchange Online Plan 2',
  'TEAMS_EXPLORATORY': 'Microsoft Teams Exploratory',
  'M365_F1': 'Microsoft 365 F1',
  'SPE_F1': 'Microsoft 365 F3',
  'POWER_BI_PRO': 'Power BI Pro',
  'PROJECTPREMIUM': 'Project Plan 5',
  'VISIO_PLAN2': 'Visio Plan 2',
  'AAD_PREMIUM_P2': 'Azure Active Directory Premium P2',
  'EMS': 'Enterprise Mobility + Security E3',
  'EMSPREMIUM': 'Enterprise Mobility + Security E5'
};
```

---

## User License Assignment Paths

Understanding assignment path is critical for determining who manages a user's license.

```typescript
interface UserLicenseDetail {
  userId: string;
  userPrincipalName: string;
  assignedLicenses: Array<{
    skuId: string;
    disabledPlans: string[];
  }>;
  licenseDetails: Array<{
    id: string;
    skuId: string;
    skuPartNumber: string;
    servicePlans: Array<{
      servicePlanId: string;
      servicePlanName: string;
      provisioningStatus: string;
      appliesTo: string;
    }>;
  }>;
  assignmentPath: 'direct' | 'group-based' | 'mixed';
}

// Determine if a license is directly assigned or via group
async function getUserLicenseAssignmentPath(
  client: Client,
  userId: string
): Promise<'direct' | 'group-based' | 'mixed'> {
  const details = await client
    .api(`/users/${userId}/licenseDetails`)
    .get();

  const allAssignedViaGroup = details.value.every(
    (d: any) => d.assignedByGroup !== null
  );
  const anyDirect = details.value.some(
    (d: any) => d.assignedByGroup === null
  );
  const anyGroup = details.value.some(
    (d: any) => d.assignedByGroup !== null
  );

  if (anyDirect && anyGroup) return 'mixed';
  if (anyGroup) return 'group-based';
  return 'direct';
}
```

---

## Complete License Scan (Full User List)

```typescript
// Collect all licensed users with sign-in activity (paginated)
async function getAllLicensedUsers(client: Client): Promise<any[]> {
  const allUsers: any[] = [];
  let url =
    '/users?$select=id,displayName,userPrincipalName,accountEnabled,assignedLicenses,signInActivity,usageLocation' +
    '&$filter=assignedLicenses/$count ne 0' +
    '&$count=true&$top=500';

  while (url) {
    const page = await client
      .api(url)
      .header('ConsistencyLevel', 'eventual')
      .get();
    allUsers.push(...page.value);
    url = page['@odata.nextLink'] || null;
  }

  return allUsers;
}
```

---

## SKU ID to Product Name Mapping Table (Extended)

| Friendly Name | SKU Part Number | SKU ID (GUID) |
|--------------|----------------|----------------|
| Microsoft 365 F1 | `M365_F1` | `44575883-256e-4a79-9da4-ebe9acabe2b2` |
| Microsoft 365 F3 | `SPE_F1` | `66b55226-6b4f-492c-910c-a3b7a3c9d993` |
| Microsoft 365 Business Basic | `O365_BUSINESS_ESSENTIALS` | `3b555118-da6a-4418-894f-7df1e2096870` |
| Microsoft 365 Business Standard | `O365_BUSINESS_PREMIUM` | `f245ecc8-75af-4f8e-b61f-27d8114de5f3` |
| Microsoft 365 Business Premium | `SPB` | `cbdc14ab-d96c-4c30-b9f4-6ada7cdc1d46` |
| Microsoft 365 E1 | `STANDARDPACK` | `18181a46-0d4e-45cd-891e-60aabd171b4e` |
| Microsoft 365 E3 | `ENTERPRISEPACK` | `05e9a617-0261-4cee-bb44-138d3ef5d965` |
| Microsoft 365 E5 | `ENTERPRISEPREMIUM` | `06ebc4ee-1bb5-47dd-8120-11324bc54e06` |
| Microsoft 365 E3 (no Teams) | `SPE_E3_USGOV_GCCHIGH` | varies | GCC High variant |
| Exchange Online Plan 1 | `EXCHANGESTANDARD` | `4b9405b0-7788-4568-add1-99614e613b69` |
| Exchange Online Plan 2 | `EXCHANGEENTERPRISE` | `19ec0d23-8335-4cbd-94ac-6050e30712fa` |
| Exchange Online Kiosk | `EXCHANGEDESKLESS` | `80b2d799-d2ba-4d2a-8842-fb0d0f3a4b82` |
| Teams Essentials | `TEAMS_ESSENTIALS` | `6af4b3d6-14bb-4a2a-960c-6c902aad34f3` |
| Power BI Pro | `POWER_BI_PRO` | `f8a1db68-be16-40ed-86d5-cb42ce701560` |
| Power BI Premium Per User | `POWER_BI_PREMIUM_PER_USER` | `f8a1db68-be16-40ed-86d5-cb42ce701560` |
| Entra ID P1 (standalone) | `AAD_PREMIUM` | `078d2b04-f1bd-4111-bbd4-b4b1b354cef4` |
| Entra ID P2 (standalone) | `AAD_PREMIUM_P2` | `84a661c4-e949-4bd2-a560-ed7766fcaf2b` |
| Microsoft Intune Plan 1 | `INTUNE_A` | `061f9ace-7d42-4136-88ac-31dc755f143f` |
| EMS E3 | `EMS` | `efccb6f7-5641-4e0e-bd10-b4976e1bf68e` |
| EMS E5 | `EMSPREMIUM` | `b05e124f-c7cc-45a0-a6aa-8cf78c946968` |
| Project Plan 3 | `PROJECTPROFESSIONAL` | `53818b1b-4a27-454b-8896-0dba576410e6` |
| Project Plan 5 | `PROJECTPREMIUM` | `09015f9f-377f-4538-bbb5-f75ceb09358a` |
| Visio Plan 1 | `VISIOCLIENT` | `4b244418-9658-4451-a2b8-b5e2b364e9bd` |
| Visio Plan 2 | `VISIO_PLAN2` | `c5928f49-12ba-48f7-ada3-0d743a3601d5` |

---

## Service Plan Disable Patterns (Partial License)

When you want to assign an E3 license but disable specific service plans (e.g., Teams):

```typescript
// Assign E3 without Teams (for Teams Phone-only users)
const E3_SKU_ID = '05e9a617-0261-4cee-bb44-138d3ef5d965';
const TEAMS_SERVICE_PLAN_ID = '57ff2da0-773e-42df-b2af-ffb7a2317929';

await client.api(`/users/${userId}/assignLicense`).post({
  addLicenses: [
    {
      skuId: E3_SKU_ID,
      disabledPlans: [TEAMS_SERVICE_PLAN_ID]  // Disable Teams in E3
    }
  ],
  removeLicenses: []
});
```

---

## Error Codes

| Code | Meaning | Remediation |
|------|---------|-------------|
| 400 `CountViolation` | No available licenses | Free up licenses or purchase more |
| 400 `MutuallyExclusiveViolation` | Conflicting service plans between SKUs | Remove conflicting license before assigning new |
| 400 `DependencyViolation` | Prerequisite service plan missing | Assign required base license first |
| 400 `ProhibitedInUsageLocationViolation` | Service not in user's country | Set `usageLocation` on user before license assignment |
| 400 `InvalidSkuId` | GUID not recognized | Verify SKU ID from `GET /subscribedSkus` |
| 403 `Forbidden` | Missing License Administrator role | Assign role or use delegated admin (GDAP) |
| 409 `LicenseAlreadyAssigned` | License already on user | Check current licenses; remove before re-adding |
| 429 `TooManyRequests` | Graph throttled | Retry with exponential backoff |

---

## Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Users per `$top` | 999 | Maximum for user list queries |
| `subscribedSkus` response | All SKUs in one call | No pagination needed |
| License assignment batch | 1 per API call | Cannot bulk-assign via single call; use parallel requests |
| Group-based licensing | Azure AD P1 required | Not available without P1 license on tenant |
| `licenseDetails` per user | Returns all assigned | No pagination |
| Report API data lag | 48 hours | Reports reflect T-2 days activity |
| Report periods | D7, D30, D90, D180 | No custom date range |

---

## Common Patterns and Gotchas

1. **`skuId` vs `id`** — The `subscribedsSkus` resource has both an `id` (full resource path) and a `skuId` (just the GUID). Use `skuId` for license assignment operations; `id` is for direct resource access.

2. **`usageLocation` must be set** — Before assigning any license, the user must have `usageLocation` set to a valid ISO 3166-1 alpha-2 country code. Missing `usageLocation` causes `ProhibitedInUsageLocationViolation` errors.

3. **Group-based licensing replication lag** — When you assign a license to a group, members may not have the license applied for up to 24 hours. Do not assume immediate propagation. Check `licenseProcessingState` on the group.

4. **Disabled service plans accumulate** — When a user has multiple overlapping SKUs (e.g., E3 + Exchange P2 add-on), disabled service plans from one SKU do not affect service plans from the other SKU. Audit each SKU's `disabledPlans` independently.

5. **Consumed vs enabled** — `consumedUnits` counts all assigned licenses (including disabled accounts). Disabled accounts still consuming licenses are usually the first quick-win in a license review.

6. **capabilityStatus** — SKUs with `capabilityStatus: 'Warning'` have subscriptions expiring soon. SKUs with `Suspended` indicate billing failure. Alert on these in regular reporting.

7. **Report API CSV parsing** — `/reports/getOffice365ActiveUserDetail` returns CSV content. Use `Accept: text/csv` header and parse the CSV. The first two rows are metadata headers; actual data starts on row 3.

8. **Service principal licenses** — Service principals and managed identities cannot hold M365 user licenses. If `appliesTo: 'Company'`, the SKU is a company-level service, not a per-user license (e.g., Azure subscriptions).

9. **GCC/Government SKUs** — US Government tenants (GCC, GCCH, DoD) have different SKU GUIDs than commercial tenants. The SKU Part Numbers may be the same, but the GUIDs differ. Do not hardcode GUIDs for multi-tenant solutions serving government customers.

10. **License assignment via PATCH is deprecated** — The old `PATCH /users/{id}` with license properties is deprecated. Always use `POST /users/{id}/assignLicense` or `POST /groups/{id}/assignLicense`.
