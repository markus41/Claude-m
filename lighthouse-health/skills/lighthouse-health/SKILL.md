---
name: lighthouse-health
description: Deep expertise in Microsoft 365 Lighthouse multi-tenant management — tenant health scoring, GDAP delegated admin, security baselines, and remediation planning for MSPs/CSPs.
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

This skill provides knowledge for managing multiple Microsoft 365 customer tenants via Lighthouse, with focus on health scoring and remediation planning.

## Lighthouse API Overview

Base URL: `https://graph.microsoft.com/beta/tenantRelationships/managedTenants/`

| Endpoint | Purpose |
|---|---|
| `/tenants` | List managed tenants |
| `/managementTemplates` | Baseline configuration templates |
| `/managementTemplateSteps` | Steps within templates |
| `/tenantsDetailedInformation` | Detailed tenant info |
| `/credentialUserRegistrationsSummaries` | MFA registration status |
| `/managedDeviceCompliances` | Device compliance across tenants |
| `/windowsProtectionStates` | Windows security status |
| `/cloudPcOverview` | Cloud PC health (if applicable) |

## Health Scoring Criteria

### Security Score (Green/Yellow/Red)
| Metric | Green | Yellow | Red |
|---|---|---|---|
| MFA coverage | > 95% | 80-95% | < 80% |
| Admin MFA | 100% | 90-99% | < 90% |
| Legacy auth blocked | Yes | Partial | No |
| Conditional Access policies | >= 3 core | 1-2 | None |
| Security defaults | Enabled or CA | — | Disabled + no CA |

### Account Hygiene
| Metric | Green | Yellow | Red |
|---|---|---|---|
| Stale accounts (90+ days) | 0 | 1-5 | > 5 |
| Inactive accounts (30+ days) | < 5% | 5-15% | > 15% |
| Guest accounts not reviewed | 0 | 1-10 | > 10 |
| Disabled accounts with licenses | 0 | 1-3 | > 3 |

### Licensing
| Metric | Green | Yellow | Red |
|---|---|---|---|
| Unused licenses | < 5% | 5-15% | > 15% |
| Over-provisioned SKUs | 0 | 1-2 | > 2 |
| License assignment errors | 0 | 1-3 | > 3 |

## GDAP (Granular Delegated Admin Privileges)

All cross-tenant operations require GDAP relationships:

```
GET https://graph.microsoft.com/v1.0/tenantRelationships/delegatedAdminRelationships?$filter=status eq 'active'
```

### Key GDAP Roles for Health Scanning
| Role | Purpose |
|---|---|
| Security Reader | Read security posture, sign-in logs |
| Global Reader | Read tenant configuration |
| Reports Reader | Access usage reports |
| User Administrator | User lifecycle queries |

## Authentication

Lighthouse operations use the partner tenant credentials with GDAP:

```typescript
// Authenticate as partner admin
const credential = new ClientSecretCredential(partnerTenantId, clientId, clientSecret);
const client = Client.initWithMiddleware({ authProvider });

// Access customer tenant data via Lighthouse API
const tenants = await client.api("/tenantRelationships/managedTenants/tenants").get();
```

## Cross-Tenant Data Queries

To check MFA coverage for a specific customer tenant:

```
GET https://graph.microsoft.com/beta/tenantRelationships/managedTenants/credentialUserRegistrationsSummaries?$filter=tenantId eq '{customerTenantId}'
```

## Remediation Planning

For each red/yellow finding, generate an actionable remediation item:

1. **What**: Plain-language description of the issue
2. **Why**: Risk if not addressed
3. **How**: Specific Graph API calls or admin portal steps
4. **Effort**: Estimated complexity (Quick Fix / Moderate / Complex)
5. **Impact**: Which users/systems are affected
