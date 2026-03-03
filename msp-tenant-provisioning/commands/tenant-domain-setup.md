---
name: msp-tenant-provisioning:tenant-domain-setup
description: Add and verify a custom domain for a Microsoft 365 tenant — add the domain via Graph API, retrieve DNS verification TXT records, guide DNS record creation for M365 services (MX, autodiscover CNAME, SRV, SPF, DKIM, DMARC), verify the domain, set as primary, and update user UPNs.
argument-hint: "[--tenant-id <id>] [--domain <fqdn>] [--dns-provider azure|cloudflare|route53|other]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# Custom Domain Setup

Add and verify a custom domain for a Microsoft 365 tenant, then configure all required DNS records.

## Domain Setup Flow

### Step 1: Collect Domain Information

Ask for if not provided:
1. **Customer tenant ID** (or domain prefix)
2. **Custom domain** — the fully qualified domain name to add (e.g., `contoso.com`)
3. **DNS provider** — Azure DNS, Cloudflare, Route 53, GoDaddy, or other
4. **Domain purpose** — Primary (all services) or subdomain (e.g., email-only)

### Step 2: Acquire Token and Add Domain

```bash
TENANT_ID="{customer-tenant-id}"
GRAPH_TOKEN=$(az account get-access-token \
  --resource https://graph.microsoft.com \
  --tenant "${TENANT_ID}" \
  --query accessToken -o tsv)

CUSTOM_DOMAIN="{custom-domain}"

# Add domain to tenant
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/domains" \
  --headers "Authorization=Bearer ${GRAPH_TOKEN}" \
  --body "{\"id\": \"${CUSTOM_DOMAIN}\"}"
```

### Step 3: Get Verification Records

```bash
# Retrieve TXT verification record
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/domains/${CUSTOM_DOMAIN}/verificationDnsRecords" \
  --headers "Authorization=Bearer ${GRAPH_TOKEN}"
```

Extract TXT record from response and display:

```
## Domain Verification Required

Add this TXT record to your DNS zone for {custom-domain}:

Type:  TXT
Name:  @ (or {custom-domain}.)
Value: MS=ms{verification-code}
TTL:   3600

This proves ownership of the domain to Microsoft.
```

### Step 4: Guide DNS Record Creation

After displaying the verification TXT record, show ALL required M365 DNS records so the customer or DNS admin can add them all at once.

**M365 Required DNS Records for {custom-domain}:**

```
## All DNS Records for Microsoft 365

### Email (Exchange Online)
Type: MX
Name: @ (or {custom-domain}.)
Value: {domain-prefix}-com.mail.protection.outlook.com
Priority: 10
TTL: 3600

### Autodiscover (Outlook client configuration)
Type: CNAME
Name: autodiscover
Value: autodiscover.outlook.com
TTL: 3600

### Skype/Teams SRV records
Type: SRV
Name: _sip._tls
Value: 100 1 443 sipdir.online.lync.com
TTL: 3600

Type: SRV
Name: _sipfederationtls._tcp
Value: 100 1 5061 sipfed.online.lync.com
TTL: 3600

### Teams/Lync CNAME records
Type: CNAME
Name: sip
Value: sipdir.online.lync.com
TTL: 3600

Type: CNAME
Name: lyncdiscover
Value: webdir.online.lync.com
TTL: 3600

### Device Management (Intune MDM enrollment)
Type: CNAME
Name: enterpriseregistration
Value: enterpriseregistration.windows.net
TTL: 3600

Type: CNAME
Name: enterpriseenrollment
Value: enterpriseenrollment.manage.microsoft.com
TTL: 3600

### Email Authentication — SPF
Type: TXT
Name: @ (or {custom-domain}.)
Value: v=spf1 include:spf.protection.outlook.com -all
TTL: 3600
```

If `--dns-provider azure`, offer to create records via CLI:

```bash
# Example: Create MX record in Azure DNS
az network dns record-set mx add-record \
  --resource-group {dns-rg} \
  --zone-name {custom-domain} \
  --record-set-name "@" \
  --exchange "{domain-mx}.mail.protection.outlook.com" \
  --preference 10
```

For Cloudflare or other providers, provide the records in a copy-paste friendly table.

### Step 5: Wait for DNS Propagation

Ask: "Have you added the TXT verification record to your DNS zone? (yes/no)"

If yes, attempt verification:

```bash
# Verify domain ownership
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/domains/${CUSTOM_DOMAIN}/verify" \
  --headers "Authorization=Bearer ${GRAPH_TOKEN}"
```

If verification fails, provide DNS propagation check command:

```bash
# Check if TXT record has propagated
nslookup -type=TXT {custom-domain}
# Or using dig:
dig TXT {custom-domain} +short
```

If not propagated yet, instruct user to wait (typically 5–15 min, up to 48h for some providers) and re-run the command.

### Step 6: Set Domain as Primary

```bash
# Verify current default domain
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/domains" \
  --headers "Authorization=Bearer ${GRAPH_TOKEN}"

# Promote custom domain to default (primary)
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/domains/${CUSTOM_DOMAIN}" \
  --headers "Authorization=Bearer ${GRAPH_TOKEN}" \
  --body '{"isDefault": true}'
```

### Step 7: Configure DKIM

Get DKIM selectors from Exchange Online:

```powershell
# Run in Exchange Online PowerShell
Connect-ExchangeOnline -UserPrincipalName admin@{domain}.onmicrosoft.com
Get-DkimSigningConfig -Domain {custom-domain} | Select-Object Selector1CNAME, Selector2CNAME
New-DkimSigningConfig -DomainName {custom-domain} -Enabled $false
```

Display CNAME records to add:

```
### DKIM CNAME Records (add after Exchange enables the keys)
Type: CNAME
Name: selector1._domainkey
Value: selector1-{domain-prefix}-{tld}._domainkey.{tenant-prefix}.onmicrosoft.com

Type: CNAME
Name: selector2._domainkey
Value: selector2-{domain-prefix}-{tld}._domainkey.{tenant-prefix}.onmicrosoft.com
```

After CNAMEs are in DNS:
```powershell
Set-DkimSigningConfig -Identity {custom-domain} -Enabled $true
Get-DkimSigningConfig -Domain {custom-domain} | Select-Object Enabled, Status
```

### Step 8: Configure DMARC

Display recommended DMARC record progression:

```
### DMARC Record (start with p=none, move to quarantine/reject)

Phase 1 — Monitoring (add now):
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@{custom-domain}; ruf=mailto:dmarc@{custom-domain}; fo=1

Phase 2 — After 30 days with clean reports:
Value: v=DMARC1; p=quarantine; pct=25; rua=mailto:dmarc@{custom-domain}

Phase 3 — Full enforcement:
Value: v=DMARC1; p=reject; rua=mailto:dmarc@{custom-domain}
```

### Step 9: Update User UPNs (optional)

If the customer wants existing users migrated from `.onmicrosoft.com` to the custom domain:

```bash
# List all users still on onmicrosoft.com domain
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/users?\$filter=endswith(userPrincipalName,'onmicrosoft.com')&\$select=id,displayName,userPrincipalName" \
  --headers "Authorization=Bearer ${GRAPH_TOKEN}"
```

For each user, update UPN:
```bash
az rest --method PATCH \
  --url "https://graph.microsoft.com/v1.0/users/{user-id}" \
  --headers "Authorization=Bearer ${GRAPH_TOKEN}" \
  --body "{\"userPrincipalName\": \"{username}@${CUSTOM_DOMAIN}\"}"
```

Ask for confirmation before bulk-updating UPNs (this affects sign-in for all users).

### Step 10: Summary

```
## Domain Setup Complete

Tenant: {tenant-id}
Custom Domain: {custom-domain} ✅ Verified and Primary

DNS Records Configured:
  ✅ MX — Exchange Online email routing
  ✅ Autodiscover CNAME — Outlook auto-configuration
  ✅ SRV records — Teams/Skype
  ✅ SPF TXT — Email sender authentication
  ✅ DKIM CNAMEs — Added (enable via Exchange Online)
  ✅ DMARC TXT — Monitoring phase (p=none)

DKIM Status: Pending — enable via Exchange Online PowerShell
DMARC Phase: Monitoring — review reports in 30 days

User UPNs updated: {n} users migrated to @{custom-domain}

Action required:
  → Enable DKIM in Exchange Online (Set-DkimSigningConfig -Enabled $true)
  → Review DMARC aggregate reports at dmarc@{custom-domain}
  → Promote DMARC to p=quarantine after 30 days clean
```

## Arguments

- `--tenant-id <id>`: Customer tenant ID
- `--domain <fqdn>`: Custom domain to add (e.g., `contoso.com`)
- `--dns-provider azure|cloudflare|route53|other`: DNS provider for provider-specific instructions
