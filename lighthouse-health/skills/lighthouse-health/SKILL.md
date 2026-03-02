---
name: lighthouse-health
description: >
  Deep expertise in Microsoft 365 Lighthouse multi-tenant management — tenant health scoring,
  GDAP delegated admin, security baselines, MFA coverage, device compliance, risky users,
  and remediation planning for MSPs/CSPs via the Lighthouse beta Graph API.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
triggers:
  - lighthouse
  - tenant health
  - multi-tenant
  - msp dashboard
  - csp management
  - gdap
  - managed tenants
  - security scorecard
  - mfa coverage
  - stale accounts
---

# Microsoft 365 Lighthouse Tenant Health

This skill provides comprehensive knowledge for managing multiple Microsoft 365 customer tenants via Lighthouse, with focus on health scoring, GDAP relationship management, and remediation planning for MSPs/CSPs.

## Integration Context Contract
- Canonical contract: [`docs/integration-context.md`](../../../docs/integration-context.md)

| Workflow | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Multi-tenant health scoring and remediation | required (partner + customer) | optional | `AzureCloud`\* | `delegated-user` | `DelegatedAdminRelationship.Read.All`, `Directory.Read.All`, `AuditLog.Read.All` |

\* Use sovereign cloud values from the canonical contract when applicable.

Fail fast before scanning tenants when required context is missing or invalid. Redact partner/customer IDs in outputs.

## Base URL

```
https://graph.microsoft.com/beta/tenantRelationships/managedTenants
```

All Lighthouse endpoints below are relative to this base URL. GDAP endpoints use a different base path.

## API Endpoints

### Tenant Management

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/tenants` | List all managed tenants |
| GET | `/tenants/{tenantId}` | Get specific tenant details |
| GET | `/tenantsDetailedInformation` | Detailed tenant info (contacts, industry) |
| GET | `/tenantsCustomizedInformation` | Partner-customized tenant metadata |
| PATCH | `/tenantsCustomizedInformation/{tenantId}` | Update partner metadata for tenant |
| GET | `/tenantTags` | List tenant tags |
| POST | `/tenantTags` | Create tenant tag |

### Security & Compliance Baselines

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/managementTemplates` | List baseline configuration templates |
| GET | `/managementTemplates/{id}` | Get template details |
| GET | `/managementTemplateSteps` | List steps within templates |
| GET | `/managementTemplateStepVersions` | Get step version details |
| GET | `/managementTemplateStepTenantSummaries` | Deployment status per tenant |
| GET | `/managementActions` | List management actions |
| GET | `/managementActionTenantDeploymentStatuses` | Action deployment status per tenant |

### User & Authentication Health

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/credentialUserRegistrationsSummaries` | MFA registration summaries per tenant |
| GET | `/conditionalAccessPolicyCoverages` | Conditional access policy deployment |
| GET | `/managedTenantAlertRules` | Alert rules across tenants |
| GET | `/managedTenantAlerts` | Active alerts |

### Device Compliance

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/managedDeviceCompliances` | Device compliance across tenants |
| GET | `/managedDeviceComplianceTrends` | Compliance trends over time |
| GET | `/windowsProtectionStates` | Windows security status |
| GET | `/windowsDeviceMalwareStates` | Malware detection across tenants |
| GET | `/cloudPcOverview` | Cloud PC health (if applicable) |

### Risky Users

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/riskyUsers` | Risky users across managed tenants |

### GDAP Relationships (v1.0 — separate base path)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/tenantRelationships/delegatedAdminRelationships` | List all GDAP relationships |
| GET | `/tenantRelationships/delegatedAdminRelationships/{id}` | Get relationship details |
| POST | `/tenantRelationships/delegatedAdminRelationships` | Create GDAP relationship |
| PATCH | `/tenantRelationships/delegatedAdminRelationships/{id}` | Update relationship |
| POST | `/tenantRelationships/delegatedAdminRelationships/{id}/accessAssignments` | Assign roles |
| GET | `/tenantRelationships/delegatedAdminRelationships/{id}/accessAssignments` | List role assignments |

**Base URL for GDAP:** `https://graph.microsoft.com/v1.0`

## MFA Registration Summary Response Example

```json
{
  "value": [
    {
      "id": "customer-tenant-id_summary",
      "tenantId": "customer-tenant-id",
      "tenantDisplayName": "Contoso Customer",
      "totalUserCount": 150,
      "mfaRegisteredUserCount": 142,
      "mfaExcludedUserCount": 3,
      "securityDefaultsEnabled": false,
      "mfaConditionalAccessPolicyState": "enabled",
      "adminsMfaRegisteredCount": 8,
      "adminsMfaNotRegisteredCount": 0,
      "adminsCount": 8,
      "lastRefreshedDateTime": "2026-02-28T12:00:00Z"
    }
  ]
}
```

## Health Scoring Criteria

### Security Score (Green/Yellow/Red)

| Metric | Green | Yellow | Red |
|--------|-------|--------|-----|
| MFA coverage | > 95% | 80-95% | < 80% |
| Admin MFA | 100% | 90-99% | < 90% |
| Legacy auth blocked | Yes | Partial | No |
| Conditional Access policies | >= 3 core | 1-2 | None |
| Security defaults | Enabled or CA | — | Disabled + no CA |
| Risky users addressed | 0 active | 1-3 active | > 3 active |

### Account Hygiene

| Metric | Green | Yellow | Red |
|--------|-------|--------|-----|
| Stale accounts (90+ days) | 0 | 1-5 | > 5 |
| Inactive accounts (30+ days) | < 5% | 5-15% | > 15% |
| Guest accounts not reviewed | 0 | 1-10 | > 10 |
| Disabled accounts with licenses | 0 | 1-3 | > 3 |

### Device Compliance

| Metric | Green | Yellow | Red |
|--------|-------|--------|-----|
| Device compliance rate | > 95% | 80-95% | < 80% |
| Windows protection active | > 95% | 80-95% | < 80% |
| Malware detections (30 days) | 0 | 1-5 | > 5 |
| Encryption enabled | > 95% | 80-95% | < 80% |

### Licensing

| Metric | Green | Yellow | Red |
|--------|-------|--------|-----|
| Unused licenses | < 5% | 5-15% | > 15% |
| Over-provisioned SKUs | 0 | 1-2 | > 2 |
| License assignment errors | 0 | 1-3 | > 3 |

## GDAP (Granular Delegated Admin Privileges)

### Key GDAP Roles for Health Scanning

| Role | Purpose | Role Template ID |
|------|---------|-----------------|
| Security Reader | Read security posture, sign-in logs | `5d6b6bb7-de71-4623-b4af-96380a352509` |
| Global Reader | Read tenant configuration | `f2ef992c-3afb-46b9-b7cf-a126ee74c451` |
| Reports Reader | Access usage reports | `4a5d8f65-41da-4de4-8968-e035b65339cf` |
| User Administrator | User lifecycle queries | `fe930be7-5e62-47db-91af-98c3a49a38b1` |
| Security Administrator | Security settings, risky users | `194ae4cb-b126-40b2-bd5b-6091b380977d` |

### Filter Active GDAP Relationships

```
GET https://graph.microsoft.com/v1.0/tenantRelationships/delegatedAdminRelationships
  ?$filter=status eq 'active'
  &$select=id,displayName,customer,accessDetails,status,duration,autoExtendDuration,endDateTime
  &$orderby=endDateTime asc
```

### GDAP Relationship Status Values

| Status | Description |
|--------|-------------|
| `active` | Relationship is active and roles can be exercised |
| `expiring` | Approaching expiration date |
| `expired` | Relationship has expired — roles are revoked |
| `terminated` | Manually terminated by either party |
| `approvalPending` | Customer has not yet approved |

### Create GDAP Relationship Body

```json
{
  "displayName": "Contoso MSP - Security Management",
  "duration": "P730D",
  "autoExtendDuration": "P180D",
  "customer": {
    "tenantId": "customer-tenant-id"
  },
  "accessDetails": {
    "unifiedRoles": [
      { "roleDefinitionId": "5d6b6bb7-de71-4623-b4af-96380a352509" },
      { "roleDefinitionId": "f2ef992c-3afb-46b9-b7cf-a126ee74c451" }
    ]
  }
}
```

## Authentication

Lighthouse operations use the partner tenant credentials with GDAP:

```typescript
import { ClientSecretCredential } from "@azure/identity";
import { Client } from "@microsoft/microsoft-graph-client";
import { TokenCredentialAuthenticationProvider } from
  "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials";

const credential = new ClientSecretCredential(partnerTenantId, clientId, clientSecret);
const authProvider = new TokenCredentialAuthenticationProvider(credential, {
  scopes: ["https://graph.microsoft.com/.default"]
});
const client = Client.initWithMiddleware({ authProvider });

// Access customer tenant data via Lighthouse API
const tenants = await client.api(
  "/tenantRelationships/managedTenants/tenants"
).get();
```

## Required Permissions

| Operation | Permission / Role |
|-----------|-------------------|
| List managed tenants | `ManagedTenants.Read.All` |
| Read MFA summaries | `ManagedTenants.Read.All` |
| Read device compliance | `ManagedTenants.Read.All` |
| Manage baselines | `ManagedTenants.ReadWrite.All` |
| Manage tenant tags | `ManagedTenants.ReadWrite.All` |
| GDAP relationships | `DelegatedAdminRelationship.ReadWrite.All` |
| GDAP role assignments | `DelegatedAdminRelationship.ReadWrite.All` |
| Risky users (per tenant) | Security Reader GDAP role in customer tenant |

## Error Handling

| Status Code | Meaning | Common Cause |
|-------------|---------|--------------|
| 400 Bad Request | Malformed request | Invalid OData filter, missing required fields |
| 401 Unauthorized | Authentication failure | Expired token, wrong tenant context |
| 403 Forbidden | Insufficient permissions | GDAP relationship expired or missing required role |
| 404 Not Found | Tenant not onboarded | Customer tenant not onboarded to Lighthouse |
| 409 Conflict | Operation conflict | GDAP relationship already exists for this customer |
| 429 Too Many Requests | Throttled | Implement exponential backoff with `Retry-After` header |

### GDAP-Specific Errors

- **403 GDAP Expired**: The delegated admin relationship has expired — renew or create a new relationship before accessing customer data
- **404 Not Onboarded**: Customer tenant is not onboarded to Lighthouse — verify the tenant has an active GDAP relationship and meets eligibility requirements (at least one M365 Business Premium, E3, or E5 license)
- **403 Missing Role**: The GDAP relationship exists but does not include the required role — create a new access assignment with the needed role

## OData Filter/OrderBy Examples

```
# MFA summaries for a specific tenant
/credentialUserRegistrationsSummaries?$filter=tenantId eq '{tenantId}'

# Tenants with low MFA coverage (custom calculation from response)
/credentialUserRegistrationsSummaries?$orderby=mfaRegisteredUserCount asc

# Device compliance for a specific tenant
/managedDeviceCompliances?$filter=tenantId eq '{tenantId}'

# Active alerts ordered by severity
/managedTenantAlerts?$filter=status eq 'active'&$orderby=severity desc

# GDAP relationships expiring soon
/tenantRelationships/delegatedAdminRelationships?$filter=status eq 'active'&$orderby=endDateTime asc&$top=10

# Tenants with specific tag
/tenantTags?$filter=displayName eq 'Priority'
```

## Common MSP Patterns

### Pattern 1: Monthly Health Report Generation

1. `GET /tenants` — list all managed tenants
2. For each tenant:
   - `GET /credentialUserRegistrationsSummaries?$filter=tenantId eq '{id}'` — MFA coverage
   - `GET /managedDeviceCompliances?$filter=tenantId eq '{id}'` — device compliance
   - `GET /windowsProtectionStates?$filter=tenantId eq '{id}'` — security status
   - `GET /riskyUsers?$filter=tenantId eq '{id}'` — risky users
3. Calculate health scores using the scoring criteria tables
4. Generate customer-ready PDF/markdown report with Green/Yellow/Red indicators
5. Include trend comparison with previous month

### Pattern 2: GDAP Relationship Lifecycle

1. `GET /tenantRelationships/delegatedAdminRelationships?$filter=status eq 'active'&$orderby=endDateTime asc` — find relationships nearing expiration
2. For expiring relationships: `POST /tenantRelationships/delegatedAdminRelationships` — create replacement with appropriate roles
3. Customer approves the new relationship in their admin portal
4. `POST .../accessAssignments` — assign partner security groups to GDAP roles
5. Verify access: test API calls to customer tenant data
6. Document relationship in partner management system

### Pattern 3: Security Baseline Deployment

1. `GET /managementTemplates` — list available baseline templates
2. `GET /managementTemplateStepTenantSummaries` — check deployment status across tenants
3. Identify tenants with missing or partially deployed baselines
4. For each gap: generate remediation task with specific steps and GDAP role required
5. Track deployment via `GET /managementActionTenantDeploymentStatuses`
6. Re-score tenants after remediation

### Pattern 4: Cross-Tenant Alert Triage

1. `GET /managedTenantAlerts?$filter=status eq 'active'&$orderby=severity desc` — get active alerts
2. Group alerts by tenant and severity
3. For critical alerts (risky users, malware): prioritize immediate remediation
4. For warning alerts (low MFA, compliance drift): schedule for next maintenance window
5. Update alert status after remediation
6. Log actions in partner ticketing system

## Remediation Planning

For each Red/Yellow finding, generate an actionable remediation item:

1. **What**: Plain-language description of the issue
2. **Why**: Risk if not addressed (with severity classification)
3. **How**: Specific Graph API calls or admin portal steps
4. **Effort**: Estimated complexity (Quick Fix / Moderate / Complex)
5. **Impact**: Which users/systems are affected
6. **GDAP Role**: Which delegated role is required to remediate
