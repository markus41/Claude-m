# Partner Center API — Lighthouse and Tenant Operations

## Authentication

```
Endpoint: https://login.microsoftonline.com/{partner-tenant-id}/oauth2/v2.0/token
Audience:  https://api.partnercenter.microsoft.com
Base URL:  https://api.partnercenter.microsoft.com
API version: v1
```

Required app permissions (app registration in partner tenant):
- `https://api.partnercenter.microsoft.com/user_impersonation` (delegated)
- `https://api.partnercenter.microsoft.com/.default` (application)

---

## Key Endpoints

### Customer Management

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/v1/customers` | List all CSP customers |
| GET | `/v1/customers/{id}` | Get specific customer |
| GET | `/v1/customers/{id}/profiles/company` | Company profile |
| GET | `/v1/customers/{id}/profiles/billing` | Billing profile |
| PATCH | `/v1/customers/{id}/profiles/company` | Update company profile |

### Subscriptions

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/v1/customers/{id}/subscriptions` | List subscriptions |
| GET | `/v1/customers/{id}/subscriptions/{sub-id}` | Get subscription |
| PATCH | `/v1/customers/{id}/subscriptions/{sub-id}` | Update (quantity, status) |
| POST | `/v1/customers/{id}/orders` | Place new order |

### Users

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/v1/customers/{id}/users` | List customer users |
| POST | `/v1/customers/{id}/users` | Create user |
| DELETE | `/v1/customers/{id}/users/{user-id}` | Delete user |
| PATCH | `/v1/customers/{id}/users/{user-id}` | Update user |
| POST | `/v1/customers/{id}/users/{user-id}/licenses` | Assign licenses |

### Offers and Pricing

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/v1/offers?country={cc}` | List available offers |
| GET | `/v1/offers/{offer-id}` | Get offer details |
| GET | `/v1/ratecards/azure` | Azure consumption pricing |

---

## List All Customers

```bash
curl -X GET \
  "https://api.partnercenter.microsoft.com/v1/customers?size=500" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "MS-CorrelationId: $(uuidgen)" \
  -H "Accept: application/json"
```

### Response

```json
{
  "totalCount": 42,
  "items": [
    {
      "id": "<customer-id>",
      "companyProfile": {
        "tenantId": "<customer-tenant-id>",
        "domain": "customercompany.onmicrosoft.com",
        "companyName": "Customer Company Inc."
      },
      "relationshipToPartner": "reseller",
      "links": {
        "self": { "uri": "/v1/customers/<customer-id>" }
      }
    }
  ]
}
```

---

## Onboard Customer Tenant to M365 Lighthouse

Lighthouse eligibility requirements per customer:
- At least 1 of: Microsoft 365 Business Premium, E3, E5, F1, F3 license
- Under 1,000 licensed users (soft cap — larger tenants supported with additional config)
- Active GDAP relationship with the MSP partner

### Check Lighthouse Onboarding Status

```
GET https://graph.microsoft.com/beta/tenantRelationships/managedTenants/tenants/{customer-tenant-id}
?$select=tenantId,displayName,tenantStatusInformation
```

```json
{
  "tenantStatusInformation": {
    "onboardingStatus": "onBoarded",
    "onboardingDateTime": "2026-01-15T10:00:00Z",
    "onboardedByUserId": "partner-admin@contoso.com"
  }
}
```

### Onboarding Status Values

| Status | Description |
|--------|-------------|
| `notOnBoarded` | Tenant not yet onboarded |
| `onBoarded` | Fully onboarded to Lighthouse |
| `onBoardingFailed` | Error during onboarding |
| `ineligible` | Does not meet licensing/size requirements |

---

## Partner Center — GDAP Invitation API

Partner Center provides a separate API for GDAP invitation management that integrates with
the M365 admin center customer approval flow.

### Create GDAP Invitation

```
POST https://api.partnercenter.microsoft.com/v1/customers/{customer-id}/delegatedadminrelationships
Content-Type: application/json
Authorization: Bearer {partner-token}

{
  "displayName": "Contoso MSP — GDAP",
  "duration": "P730D",
  "autoExtendDuration": "P180D",
  "requestedAccessDetails": {
    "unifiedRoles": [
      { "roleDefinitionId": "f2ef992c-3afb-46b9-b7cf-a126ee74c451" },
      { "roleDefinitionId": "194ae4cb-b126-40b2-bd5b-6091b380977d" }
    ]
  }
}
```

---

## Service Plans — Lighthouse-Relevant Subscriptions

When querying customer subscriptions, filter for Lighthouse-eligible plans:

```
GET /v1/customers/{id}/subscriptions
```

Filter response for `offerName` containing:
- `Microsoft 365 Business Premium`
- `Microsoft 365 E3`
- `Microsoft 365 E5`
- `Microsoft 365 F1` / `F3`

### Check License Count for Lighthouse Eligibility

```python
# Pseudo-code for eligibility check
eligible_plans = ['Business Premium', 'E3', 'E5', 'F1', 'F3']
customer_subs = get_subscriptions(customer_id)
lighthouse_eligible = any(
    plan in sub['offerName'] and sub['quantity'] > 0 and sub['status'] == 'active'
    for sub in customer_subs
    for plan in eligible_plans
)
```

---

## Bulk Customer Lighthouse Status Report

Combine Partner Center customer list with Lighthouse tenant status:

```
1. GET /v1/customers → all_customers[]
2. GET /beta/tenantRelationships/managedTenants/tenants → lighthouse_tenants[]
3. LEFT JOIN on tenantId
4. For each customer:
   - Not in Lighthouse → check eligibility (subscription + GDAP)
   - In Lighthouse (onBoarded) → include in health scan
   - onBoardingFailed → investigate and retry
```
