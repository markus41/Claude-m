---
name: msp-tenant-provisioning:tenant-provision
description: Create a new Microsoft 365 tenant for a customer via the Partner Center CSP API — collect company details, place the customer record, capture the one-time admin password, order subscriptions (Business Premium, add-ons), and confirm tenant is live and accessible.
argument-hint: "[--company-name <name>] [--domain <prefix>] [--country <CC>] [--licenses <n>]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# Tenant Provisioning

Create a new Microsoft 365 tenant for a customer via the Partner Center CSP API.

## Provisioning Flow

### Step 1: Collect Customer Details

Ask for the following if not provided via arguments:

1. **Company name** — official legal name (used for tenant display name)
2. **Domain prefix** — desired `.onmicrosoft.com` prefix (e.g., `contoso` → `contoso.onmicrosoft.com`)
   - Check availability first (skip if --domain already supplied)
3. **Country code** — ISO 3166-1 alpha-2 (e.g., `US`, `DE`, `GB`, `AU`)
4. **Address** — street, city, state/region, postal code
5. **Admin first name** and **last name** — for the initial Global Admin account
6. **Admin email** — external contact email (for recovery, not the tenant email)
7. **Phone number** — company phone
8. **Subscription plan** — present options:
   - **Business Basic** (`CFQ7TTC0J25L`) — Exchange, Teams, SharePoint
   - **Business Standard** (`CFQ7TTC0LDPB`) — Basic + Office apps
   - **Business Premium** (`CFQ7TTC0LF4B`) — Standard + Defender, Intune, Entra P1 (**recommended for MSP**)
   - **Custom** — enter offer ID manually
9. **License count** — number of seats to purchase
10. **Add-ons** (optional) — Defender for Business, Visio, Project, etc.

### Step 2: Acquire Partner Center Token

```bash
# Partner Center token (different from Graph token)
PC_TOKEN=$(az account get-access-token \
  --resource https://api.partnercenter.microsoft.com \
  --query accessToken -o tsv)

PC_BASE="https://api.partnercenter.microsoft.com/v1"
```

### Step 3: Check Domain Availability

```bash
# Check if the desired onmicrosoft.com prefix is available
az rest --method GET \
  --url "${PC_BASE}/domains/${DOMAIN_PREFIX}.onmicrosoft.com" \
  --headers "Authorization=Bearer ${PC_TOKEN}"
```

If unavailable, suggest alternatives:
- `{prefix}inc`, `{prefix}corp`, `{prefix}-it`, `{prefix}tech`

Ask user to confirm the domain before proceeding.

### Step 4: Create Customer Record

```bash
az rest --method POST \
  --url "${PC_BASE}/customers" \
  --headers "Authorization=Bearer ${PC_TOKEN}" \
  --body '{
    "CompanyProfile": {
      "Domain": "{domain-prefix}.onmicrosoft.com",
      "CompanyName": "{company-name}"
    },
    "BillingProfile": {
      "FirstName": "{admin-first-name}",
      "LastName": "{admin-last-name}",
      "Email": "{admin-email}",
      "Culture": "en-US",
      "Language": "en",
      "CompanyName": "{company-name}",
      "DefaultAddress": {
        "FirstName": "{admin-first-name}",
        "LastName": "{admin-last-name}",
        "AddressLine1": "{street}",
        "City": "{city}",
        "State": "{state}",
        "PostalCode": "{postal-code}",
        "Country": "{country-code}",
        "PhoneNumber": "{phone}"
      }
    }
  }'
```

**Extract from response:**
- `id` → customer ID (needed for all subsequent calls)
- `UserCredentials.UserName` → initial Global Admin UPN
- `UserCredentials.Password` → **one-time password — save immediately**
- `CompanyProfile.TenantId` → the new tenant ID

```
⚠️  IMPORTANT: Save these credentials now — the password is shown only once.

Admin account: {admin-upn}
Temporary password: {one-time-password}
Tenant ID: {tenant-id}
Customer ID: {customer-id}
```

Write to `tenant-{domain-prefix}-credentials.md` immediately:
```
---
domain: {domain-prefix}.onmicrosoft.com
tenant_id: {tenant-id}
customer_id: {customer-id}
admin_upn: {admin-upn}
created: {timestamp}
---

# {Company Name} — Tenant Credentials

Admin UPN: {admin-upn}
Temp Password: {one-time-password}

⚠️ Share via secure channel (1Password, Keeper, etc.) — do NOT store long term.
```

### Step 5: Order Subscriptions

```bash
CUSTOMER_ID="{customer-id}"

# Discover offer details
az rest --method GET \
  --url "${PC_BASE}/offers?Country={country-code}&Locale=en-US" \
  --headers "Authorization=Bearer ${PC_TOKEN}"
```

Place order:

```bash
az rest --method POST \
  --url "${PC_BASE}/customers/${CUSTOMER_ID}/orders" \
  --headers "Authorization=Bearer ${PC_TOKEN}" \
  --body '{
    "LineItems": [
      {
        "LineItemNumber": 0,
        "OfferId": "{offer-id}",
        "Quantity": {license-count},
        "FriendlyName": "{company-name} - {plan-name}"
      }
    ],
    "BillingCycle": "Annual"
  }'
```

Extract `OrderId` and `SubscriptionId` from response.

If add-ons were selected, place a separate order for each add-on offer linked to the base subscription.

### Step 6: Verify Tenant is Live

```bash
GRAPH_TOKEN=$(az account get-access-token --resource https://graph.microsoft.com --query accessToken -o tsv)

# Verify tenant is accessible
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/tenants/{tenant-id}" \
  --headers "Authorization=Bearer ${GRAPH_TOKEN}"

# Verify subscription is active
az rest --method GET \
  --url "${PC_BASE}/customers/${CUSTOMER_ID}/subscriptions" \
  --headers "Authorization=Bearer ${PC_TOKEN}"
```

Confirm:
- Tenant status: active
- Subscription status: `active`
- License count matches order

### Step 7: Summary

```
## Tenant Provisioned Successfully

Company: {Company Name}
Domain: {domain-prefix}.onmicrosoft.com
Tenant ID: {tenant-id}
Customer ID (Partner Center): {customer-id}

Admin Account: {admin-upn}
Temp Password: [saved to tenant-{domain-prefix}-credentials.md]

Subscriptions:
  Microsoft 365 Business Premium × {n} — Annual — Active
  [Add-ons if applicable]

Next steps:
  1. Share credentials via secure channel with customer
  2. Run initial M365 security baseline:
     /msp-tenant-provisioning:tenant-configure --domain {domain-prefix}
  3. Set up custom domain:
     /msp-tenant-provisioning:tenant-domain-setup --domain {domain-prefix}
  4. Set up Azure subscription (if applicable):
     /msp-tenant-provisioning:tenant-azure-setup --tenant-id {tenant-id}
  5. Onboard to Lighthouse:
     /msp-tenant-provisioning:tenant-lighthouse-onboard --tenant-id {tenant-id}
```

## Arguments

- `--company-name <name>`: Skip company name question
- `--domain <prefix>`: Skip domain availability check (use this prefix)
- `--country <CC>`: ISO 3166-1 alpha-2 country code
- `--licenses <n>`: Number of licenses to order
