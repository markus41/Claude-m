# Partner Center REST API — Customers, Subscriptions, Users, Orders

## Base URL and Auth

```
Base URL: https://api.partnercenter.microsoft.com
Version:  v1
Auth:     OAuth 2.0 Bearer — audience: https://api.partnercenter.microsoft.com
```

### App Permissions Required

| Permission | Type | Purpose |
|-----------|------|---------|
| `https://api.partnercenter.microsoft.com/user_impersonation` | Delegated | User context operations |
| Partner Center admin role assignment | Admin | Required for tenant creation |

The app must be registered as a native application in Partner Center (Admin → App Management).

---

## Create New Customer Tenant

```
POST https://api.partnercenter.microsoft.com/v1/customers
Authorization: Bearer {token}
MS-CorrelationId: {guid}
Content-Type: application/json
```

### Full Request Body

```json
{
  "companyProfile": {
    "domain": "fabrikammsp.onmicrosoft.com",
    "companyName": "Fabrikam MSP Customer"
  },
  "billingProfile": {
    "culture": "en-US",
    "language": "en",
    "email": "billing@fabrikammsp.com",
    "companyName": "Fabrikam MSP Customer",
    "defaultAddress": {
      "country": "US",
      "region": "CA",
      "city": "San Francisco",
      "addressLine1": "456 Market Street",
      "postalCode": "94105",
      "firstName": "Jane",
      "lastName": "Smith",
      "phoneNumber": "4155551234"
    }
  }
}
```

### Response — Critical Fields to Capture

```json
{
  "id": "<partner-center-customer-id>",
  "companyProfile": {
    "tenantId": "<new-m365-tenant-id>",
    "domain": "fabrikammsp.onmicrosoft.com",
    "companyName": "Fabrikam MSP Customer"
  },
  "userCredentials": {
    "userName": "admin",
    "password": "<generated-temp-password>"
  },
  "links": {
    "self": { "uri": "/v1/customers/<partner-center-customer-id>" }
  }
}
```

**Immediately save**:
- `id` → Partner Center customer ID (used for all subsequent API calls)
- `companyProfile.tenantId` → M365 tenant ID (used for Graph API calls)
- `userCredentials.password` → **Shown only once** — store in Key Vault

---

## List All Customers

```
GET /v1/customers?size=500
```

### With Search Filter

```
GET /v1/customers?size=500&filter={"Field":"CompanyName","Value":"Fabrikam","Operator":"starts_with"}
```

---

## Get Customer Details

```
GET /v1/customers/{customer-id}
```

```
GET /v1/customers/{customer-id}/profiles/company
GET /v1/customers/{customer-id}/profiles/billing
```

---

## List Subscriptions

```
GET /v1/customers/{customer-id}/subscriptions
```

### Response Fields

```json
{
  "totalCount": 3,
  "items": [
    {
      "id": "<subscription-id>",
      "offerId": "CFQ7TTC0LF4B:0001",
      "offerName": "Microsoft 365 Business Premium",
      "quantity": 25,
      "unitType": "Licenses",
      "status": "active",
      "autoRenewEnabled": true,
      "termDuration": "P1Y",
      "billingCycle": "Annual",
      "commitmentEndDate": "2027-01-15T00:00:00Z"
    }
  ]
}
```

### Subscription Status Values

| Status | Description |
|--------|-------------|
| `active` | Operational |
| `suspended` | Payment issue or cancelled |
| `deleted` | Permanently removed |
| `expired` | Term ended, not renewed |

---

## Update Subscription Quantity

```
PATCH /v1/customers/{customer-id}/subscriptions/{subscription-id}
Content-Type: application/json

{
  "quantity": 30
}
```

---

## Create Customer Users

```
POST /v1/customers/{customer-id}/users
Content-Type: application/json

{
  "usageLocation": "US",
  "userPrincipalName": "john.doe@fabrikammsp.onmicrosoft.com",
  "firstName": "John",
  "lastName": "Doe",
  "displayName": "John Doe",
  "passwordProfile": {
    "forceChangePassword": true,
    "password": "<temp-password>"
  }
}
```

---

## Assign Licenses to User

```
POST /v1/customers/{customer-id}/users/{user-id}/licenses
Content-Type: application/json

{
  "licenseAssignments": [
    {
      "skuId": "<sku-id-from-subscription>",
      "excludedPlans": []
    }
  ]
}
```

Get SKU IDs from: `GET /v1/customers/{id}/subscribedskus`

---

## Service Request (Support Tickets)

```
POST /v1/customers/{customer-id}/servicerequests
Content-Type: application/json

{
  "title": "Initial setup assistance",
  "description": "New customer tenant setup — assistance required",
  "severity": "moderate",
  "supportTopicId": "<support-topic-id>",
  "organizationName": "Fabrikam MSP Customer",
  "status": "none"
}
```

---

## Reseller Relationships

For indirect CSP providers, manage reseller-customer relationships:

```
GET /v1/customers/{customer-id}/relationships
```

---

## Error Codes

| HTTP Status | Error Code | Meaning |
|-------------|-----------|---------|
| 400 | `InvalidInput` | Malformed request body |
| 400 | `DomainNotAvailable` | Domain already taken |
| 401 | `Unauthorized` | Token expired or missing |
| 403 | `PartnerInsufficientPermissions` | App not registered in Partner Center |
| 409 | `CustomerAlreadyExists` | Domain already registered |
| 429 | `TooManyRequests` | Rate limit hit — use `Retry-After` header |
| 500 | `InternalServerError` | Microsoft-side issue — retry with backoff |
