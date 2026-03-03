# CSP Subscription Provisioning — Offer IDs, Billing, License Assignment

## Discover Available Offers

```
GET https://api.partnercenter.microsoft.com/v1/offers?country=US
Authorization: Bearer {token}
```

Filter response by `productTitle` to find specific SKUs. The full offer catalog is large
(500+ items) — filter aggressively.

### Common Microsoft 365 Product IDs

| Product | Product ID | SKU Note |
|---------|-----------|---------|
| Microsoft 365 Business Basic | `CFQ7TTC0LH18` | Entry-level, no desktop apps |
| Microsoft 365 Business Standard | `CFQ7TTC0LDPB` | Apps included |
| Microsoft 365 Business Premium | `CFQ7TTC0LF4B` | Premium security + Defender |
| Microsoft 365 E3 | `CFQ7TTC0LFLX` | Enterprise without E5 security |
| Microsoft 365 E5 | `CFQ7TTC0LFLZ` | Full enterprise + security |
| Microsoft 365 F1 | `CFQ7TTC0LH0T` | Firstline worker (no mailbox) |
| Microsoft 365 F3 | `CFQ7TTC0LHSF` | Firstline worker (with mailbox) |
| Exchange Online Plan 1 | `CFQ7TTC0LF4K` | Email only |
| Exchange Online Plan 2 | `CFQ7TTC0LHPB` | Email + archiving |
| Microsoft Defender for Business | `CFQ7TTC0LGV4` | SMB security |
| Intune Plan 1 | `CFQ7TTC0LCH4` | Device management only |
| Azure Active Directory P1 | `CFQ7TTC0LFLS` | Conditional Access + PIM |
| Azure Active Directory P2 | `CFQ7TTC0LFLQ` | Full identity protection |

**Note**: Offer IDs are locale-specific. For EU/UK customers, query `?country=GB` or `?country=DE`.
Always query live to confirm current IDs — they can change.

---

## Place an Order

```
POST /v1/customers/{customer-id}/orders
Content-Type: application/json

{
  "lineItems": [
    {
      "lineItemNumber": 0,
      "offerId": "CFQ7TTC0LF4B:0001",
      "quantity": 25,
      "termDuration": "P1Y",
      "billingCycle": "Annual",
      "friendlyName": "Microsoft 365 Business Premium — HQ Staff"
    },
    {
      "lineItemNumber": 1,
      "offerId": "CFQ7TTC0LHSF:0001",
      "quantity": 10,
      "termDuration": "P1Y",
      "billingCycle": "Annual",
      "friendlyName": "Microsoft 365 F3 — Field Workers"
    }
  ]
}
```

### Order Response

```json
{
  "id": "<order-id>",
  "status": "completed",
  "lineItems": [
    {
      "lineItemNumber": 0,
      "offerId": "CFQ7TTC0LF4B:0001",
      "subscriptionId": "<subscription-id>",
      "quantity": 25,
      "status": "fulfilled"
    }
  ],
  "creationDate": "2026-03-03T10:00:00Z"
}
```

---

## Billing Cycles and Term Options

| Term | Billing Cycle Options | Notes |
|------|----------------------|-------|
| `P1M` (monthly) | Monthly | No annual commitment; higher unit price |
| `P1Y` (1 year) | Monthly or Annual (upfront) | Standard; annual = ~10-20% discount |
| `P3Y` (3 years) | Monthly or Annual | Largest discount; lock-in risk |

For new customers: default to `P1Y` / `Annual` unless flexibility is required.

---

## Add-On Subscriptions

Some offers require a base subscription. Add-ons are ordered the same way but reference a
`parentSubscriptionId`:

```json
{
  "lineItems": [
    {
      "lineItemNumber": 0,
      "offerId": "CFQ7TTC0LGV4:0001",
      "quantity": 25,
      "termDuration": "P1Y",
      "billingCycle": "Annual",
      "parentSubscriptionId": "<m365-business-premium-sub-id>"
    }
  ]
}
```

---

## Assign Licenses via Graph API (Post-Order)

After the order fulfills, licenses are available. Assign to users via Graph:

### Get Available SKUs in Tenant

```
GET https://graph.microsoft.com/v1.0/subscribedSkus
Authorization: Bearer {customer-tenant-token}
?$select=skuId,skuPartNumber,consumedUnits,prepaidUnits
```

### Assign License to User

```json
POST https://graph.microsoft.com/v1.0/users/{userId}/assignLicense

{
  "addLicenses": [
    {
      "skuId": "<sku-id>",
      "disabledPlans": []
    }
  ],
  "removeLicenses": []
}
```

### Bulk License Assignment (Group-Based)

For tenants with Azure AD P1/P2, use group-based licensing:

```json
PATCH https://graph.microsoft.com/v1.0/groups/{group-id}

{
  "assignedLicenses": [
    {
      "skuId": "<sku-id>",
      "disabledPlans": []
    }
  ]
}
```

---

## License Seat Validation Before Order

Check available seats before placing expansion orders:

```
GET https://graph.microsoft.com/v1.0/subscribedSkus
```

```json
// Calculate available seats
"prepaidUnits": {
  "enabled": 25,
  "warning": 0,
  "suspended": 0
},
"consumedUnits": 22,
// available = enabled - consumedUnits = 3 seats remaining
```

---

## Cancel/Suspend a Subscription

```
PATCH /v1/customers/{customer-id}/subscriptions/{subscription-id}

{ "status": "suspended" }
```

Note: Annual subscriptions have a cancellation window (typically 7 days from order date).
After the window, the subscription cannot be cancelled until the end of the term.

---

## Trial Subscriptions

```json
{
  "lineItems": [
    {
      "lineItemNumber": 0,
      "offerId": "CFQ7TTC0LF4B:0003",
      "quantity": 25,
      "termDuration": "P1M",
      "billingCycle": "none"
    }
  ]
}
```

Trial `billingCycle: "none"` creates a free trial. Convert to paid by updating billingCycle:

```json
PATCH /v1/customers/{customer-id}/subscriptions/{trial-sub-id}

{ "billingCycle": "Annual", "termDuration": "P1Y" }
```
