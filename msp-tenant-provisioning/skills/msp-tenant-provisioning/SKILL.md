---
name: msp-tenant-provisioning
description: >
  Deep expertise in MSP/CSP new customer provisioning — creating Microsoft 365 tenants via
  Partner Center CSP API, ordering subscriptions and licenses, configuring custom domains and
  DNS records, applying initial M365 security baselines (Conditional Access, PIM, security
  defaults), setting up Azure subscriptions and management group hierarchies, and onboarding
  new tenants to Microsoft 365 Lighthouse via GDAP relationships.
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
triggers:
  - new tenant provisioning
  - create m365 tenant
  - csp customer creation
  - partner center customer
  - new customer onboarding
  - tenant bootstrap
  - provision new tenant
  - azure subscription creation
  - tenant initial configuration
  - domain dns setup m365
  - m365 baseline setup
  - new azure enrollment
  - partner center api
  - csp subscription order
  - new m365 customer
  - tenant onboard msp
  - management group setup
  - initial conditional access
  - m365 security defaults
  - pim initial setup
  - dns mx record m365
  - domain verification m365
  - break glass account
  - csp order licenses
  - partner center rest api
---

# MSP Tenant Provisioning

This skill covers the end-to-end workflow for provisioning new Microsoft 365 and Azure customer
tenants as a CSP/MSP. It spans Partner Center tenant creation, subscription ordering, domain
setup, initial security configuration, Azure subscription hierarchy, and M365 Lighthouse
onboarding — everything needed to go from "new customer signed" to "fully operational secured
tenant with MSP access".

## Provisioning Workflow Overview

```
1. Create M365 tenant (Partner Center CSP)
        ↓
2. Order subscriptions and licenses
        ↓
3. Verify custom domain + configure DNS
        ↓
4. Apply initial security baseline (CA, PIM, defaults)
        ↓
5. Create Azure subscription (if needed)
        ↓
6. Set up management groups + policy
        ↓
7. GDAP relationship + Lighthouse onboarding
```

---

## Part 1: Partner Center API — Authentication

All Partner Center API calls authenticate against the partner tenant.

```
Authorization endpoint: https://login.microsoftonline.com/{partner-tenant-id}/oauth2/v2.0/token
Audience: https://api.partnercenter.microsoft.com
Base URL: https://api.partnercenter.microsoft.com
```

### Token Request

```bash
curl -X POST \
  "https://login.microsoftonline.com/{partner-tenant-id}/oauth2/v2.0/token" \
  -d "grant_type=client_credentials" \
  -d "client_id={app-id}" \
  -d "client_secret={secret}" \
  -d "scope=https://api.partnercenter.microsoft.com/.default"
```

### Key Headers

```
Authorization: Bearer {token}
MS-CorrelationId: {guid}         # Track across operations
MS-RequestId: {guid}             # Per-request tracking
Content-Type: application/json
Accept: application/json
```

---

## Part 2: Create New M365 Customer Tenant

```
POST https://api.partnercenter.microsoft.com/v1/customers
```

### Request Body

```json
{
  "companyProfile": {
    "domain": "customercompany.onmicrosoft.com",
    "companyName": "Customer Company Inc."
  },
  "billingProfile": {
    "culture": "en-US",
    "language": "en",
    "email": "billing@customercompany.com",
    "companyName": "Customer Company Inc.",
    "defaultAddress": {
      "country": "US",
      "region": "WA",
      "city": "Seattle",
      "addressLine1": "123 Main Street",
      "postalCode": "98101",
      "firstName": "John",
      "lastName": "Doe",
      "phoneNumber": "4255551234"
    }
  }
}
```

### Response — Key Fields

```json
{
  "id": "<customer-id>",
  "companyProfile": {
    "tenantId": "<new-tenant-id>",
    "domain": "customercompany.onmicrosoft.com",
    "companyName": "Customer Company Inc."
  },
  "userCredentials": {
    "userName": "admin",
    "password": "<generated-temp-password>"
  }
}
```

**Save immediately**: `tenantId`, `id` (customer ID), and `userCredentials`. The admin password is only returned once.

---

## Part 3: Order Subscriptions

```
POST https://api.partnercenter.microsoft.com/v1/customers/{customer-id}/orders
```

### Request Body

```json
{
  "lineItems": [
    {
      "lineItemNumber": 0,
      "offerId": "<offer-id>",
      "quantity": 25,
      "termDuration": "P1Y",
      "billingCycle": "Annual"
    }
  ]
}
```

### Discover Current Offer IDs

```
GET https://api.partnercenter.microsoft.com/v1/offers?country=US
```

Filter by `productTitle` containing "Microsoft 365" for M365 SKUs. Common product IDs:
- `CFQ7TTC0LF4B` — Microsoft 365 Business Premium
- `CFQ7TTC0LFLX` — Microsoft 365 E3
- `CFQ7TTC0LFLZ` — Microsoft 365 E5

### Available Billing Cycles

| Term | Billing | Use for |
|------|---------|---------|
| `P1M` / `Monthly` | Monthly | Flexibility, trials |
| `P1Y` / `Annual` | Annual (paid monthly or upfront) | Standard customers |
| `P3Y` / `Annual` | 3-year | Cost savings commitment |

---

## Part 4: Initial M365 Security Baseline

See deep-dive: [`references/initial-m365-config.md`](./references/initial-m365-config.md)

### Security Defaults

Enable via Graph API (simple baseline for small tenants):

```
PATCH https://graph.microsoft.com/v1.0/policies/identitySecurityDefaultsEnforcementPolicy
{ "isEnabled": true }
```

**Note**: Disable security defaults before creating custom Conditional Access policies.

### Conditional Access — Required Baseline Policies

1. **Require MFA for all users** (excluding break-glass)
2. **Require MFA for all admins**
3. **Block legacy authentication protocols**
4. **Require compliant device** (if Intune configured)

```json
{
  "displayName": "CA001 - Require MFA for All Users",
  "state": "enabled",
  "conditions": {
    "users": {
      "includeUsers": ["All"],
      "excludeUsers": ["<break-glass-1-object-id>", "<break-glass-2-object-id>"]
    },
    "applications": { "includeApplications": ["All"] }
  },
  "grantControls": {
    "operator": "OR",
    "builtInControls": ["mfa"]
  }
}
```

---

## Part 5: Domain Setup

See deep-dive: [`references/domain-dns-setup.md`](./references/domain-dns-setup.md)

### Add Domain via Graph

```
POST https://graph.microsoft.com/v1.0/domains
{ "id": "customercompany.com" }
```

### Get Verification DNS Records

```
GET https://graph.microsoft.com/v1.0/domains/customercompany.com/verificationDnsRecords
```

Returns TXT record (e.g., `MS=ms12345678`) to add at domain registrar.

### Verify and Set Primary

```
POST https://graph.microsoft.com/v1.0/domains/customercompany.com/verify
```

```
PATCH https://graph.microsoft.com/v1.0/domains/customercompany.com
{ "isDefault": true }
```

### Required DNS Records for M365

| Type | Name | Value / Points to |
|------|------|-------------------|
| MX | @ | `{tenant}.mail.protection.outlook.com` |
| TXT | @ | `v=spf1 include:spf.protection.outlook.com -all` |
| CNAME | autodiscover | `autodiscover.outlook.com` |
| CNAME | enterpriseregistration | `enterpriseregistration.windows.net` |
| CNAME | enterpriseenrollment | `enterpriseenrollment.manage.microsoft.com` |
| SRV | `_sip._tls` | `sipdir.online.lync.com:443` |
| SRV | `_sipfederationtls._tcp` | `sipfed.online.lync.com:5061` |

---

## Part 6: Progressive Disclosure — Reference Files

| Topic | File |
|-------|------|
| Partner Center REST API: customers, users, subscriptions, orders | [`references/partner-center-api.md`](./references/partner-center-api.md) |
| CSP subscription provisioning: offer IDs, billing cycles, license assignment | [`references/csp-subscription-provisioning.md`](./references/csp-subscription-provisioning.md) |
| Initial M365 security: CA policies, PIM, security defaults, break-glass | [`references/initial-m365-config.md`](./references/initial-m365-config.md) |
| Azure tenant setup: management groups, subscriptions, policy, RBAC | [`references/azure-tenant-setup.md`](./references/azure-tenant-setup.md) |
| Domain DNS records, verification, primary domain, SPF/DKIM/DMARC | [`references/domain-dns-setup.md`](./references/domain-dns-setup.md) |
