# Domain DNS Setup — M365 Verification, DNS Records, SPF/DKIM/DMARC

## Domain Lifecycle in M365

```
1. Add domain to tenant (Graph API)
2. Get verification TXT record
3. Create TXT record at domain registrar
4. Verify domain ownership (Graph API)
5. Configure M365 DNS records (MX, CNAME, SRV, TXT)
6. Set as primary domain (optional)
7. Update user UPNs to new domain
```

---

## Step 1: Add Domain

```
POST https://graph.microsoft.com/v1.0/domains
Authorization: Bearer {admin-token-for-customer-tenant}
Content-Type: application/json

{ "id": "customercompany.com" }
```

### Response

```json
{
  "id": "customercompany.com",
  "isDefault": false,
  "isVerified": false,
  "supportedServices": [],
  "availabilityStatus": null
}
```

---

## Step 2: Get Verification DNS Records

```
GET https://graph.microsoft.com/v1.0/domains/customercompany.com/verificationDnsRecords
```

### Response

```json
{
  "value": [
    {
      "recordType": "Txt",
      "label": "@",
      "text": "MS=ms12345678",
      "ttl": 3600
    }
  ]
}
```

Add this TXT record at the domain registrar. Wait for DNS propagation (5–30 minutes typical,
up to 48 hours in rare cases).

---

## Step 3: Verify Domain

```
POST https://graph.microsoft.com/v1.0/domains/customercompany.com/verify
```

### Response on Success

```json
{
  "id": "customercompany.com",
  "isDefault": false,
  "isVerified": true
}
```

---

## Step 4: Set as Primary Domain

```
PATCH https://graph.microsoft.com/v1.0/domains/customercompany.com
Content-Type: application/json

{
  "isDefault": true
}
```

---

## Step 5: Full M365 DNS Records

After domain is verified, configure all M365 DNS records:

### Exchange Online (Email)

| Type | Host/Name | Value | TTL |
|------|-----------|-------|-----|
| MX | @ | `{tenant}-com.mail.protection.outlook.com` | 3600 |
| CNAME | autodiscover | `autodiscover.outlook.com` | 3600 |

**MX Record format**: Replace dots with dashes in the domain name.
Example: `customercompany.com` → `customercompany-com.mail.protection.outlook.com`

Verify exact MX value:
```
GET https://graph.microsoft.com/v1.0/domains/customercompany.com/serviceConfigurationRecords
?$filter=supportedService eq 'Email'
```

### Skype for Business / Microsoft Teams (if using Phone System)

| Type | Host/Name | Value | Priority | Weight | Port |
|------|-----------|-------|----------|--------|------|
| SRV | `_sip._tls` | `sipdir.online.lync.com` | 100 | 1 | 443 |
| SRV | `_sipfederationtls._tcp` | `sipfed.online.lync.com` | 100 | 1 | 5061 |
| CNAME | sip | `sipdir.online.lync.com` | — | — | — |
| CNAME | lyncdiscover | `webdir.online.lync.com` | — | — | — |

### Intune / Azure AD Device Management

| Type | Host/Name | Value |
|------|-----------|-------|
| CNAME | enterpriseregistration | `enterpriseregistration.windows.net` |
| CNAME | enterpriseenrollment | `enterpriseenrollment.manage.microsoft.com` |

### Get All Required Records from Graph

```
GET https://graph.microsoft.com/v1.0/domains/customercompany.com/serviceConfigurationRecords
```

This returns the complete, tenant-specific list of all required DNS records.

---

## Step 6: Email Authentication (SPF, DKIM, DMARC)

### SPF Record

Add TXT record at `@` (root domain):

```
v=spf1 include:spf.protection.outlook.com -all
```

If the customer also sends from other services, include them:
```
v=spf1 include:spf.protection.outlook.com include:_spf.google.com -all
```

### DKIM Setup in M365

Enable DKIM signing in Exchange Online via the Microsoft Defender portal or via PowerShell:

```powershell
# Connect to Exchange Online
Connect-ExchangeOnline -UserPrincipalName admin@customercompany.com

# Enable DKIM
New-DkimSigningConfig -DomainName customercompany.com -Enabled $true
```

After running, M365 provides two CNAME records to add at the registrar:

| Type | Name | Value |
|------|------|-------|
| CNAME | `selector1._domainkey` | `selector1-customercompany-com._domainkey.{tenant}.onmicrosoft.com` |
| CNAME | `selector2._domainkey` | `selector2-customercompany-com._domainkey.{tenant}.onmicrosoft.com` |

Re-enable after adding CNAMEs:

```powershell
Set-DkimSigningConfig -Identity customercompany.com -Enabled $true
```

### DMARC Record

Add TXT record at `_dmarc.customercompany.com`:

```
v=DMARC1; p=none; rua=mailto:dmarc-reports@customercompany.com; ruf=mailto:dmarc-forensics@customercompany.com; fo=1
```

Progression path:
- Start: `p=none` (monitoring only)
- After 2 weeks clean data: `p=quarantine`
- After 1 month: `p=reject`

---

## Step 7: Update User UPNs to New Domain

```
PATCH https://graph.microsoft.com/v1.0/users/{userId}

{
  "userPrincipalName": "john.doe@customercompany.com"
}
```

Bulk update:
```bash
# Get all users on .onmicrosoft.com domain
az ad user list \
  --filter "userPrincipalName endswith '@customercompany.onmicrosoft.com'" \
  --query "[].{id:id,upn:userPrincipalName}" \
  --output json
```

---

## DNS Verification Tools

```bash
# Check MX record
nslookup -type=MX customercompany.com 8.8.8.8

# Check SPF
nslookup -type=TXT customercompany.com 8.8.8.8

# Check DMARC
nslookup -type=TXT _dmarc.customercompany.com 8.8.8.8

# Check DKIM selector
nslookup -type=CNAME selector1._domainkey.customercompany.com 8.8.8.8

# Check MX propagation globally (use external tool)
# https://mxtoolbox.com/MXLookup.aspx
# https://toolbox.googleapps.com/apps/checkmx/
```

---

## Domain Checklist

```
Domain Configuration Checklist — customercompany.com

Verification:
[ ] Domain added to M365 tenant
[ ] Verification TXT record added at registrar
[ ] Domain verified successfully
[ ] Primary domain set (if replacing onmicrosoft.com)

Email:
[ ] MX record updated to M365
[ ] Autodiscover CNAME created
[ ] SPF TXT record: v=spf1 include:spf.protection.outlook.com -all
[ ] DKIM enabled in M365 (selector1 + selector2 CNAMEs added)
[ ] DMARC TXT record added (start with p=none)

Device Management:
[ ] enterpriseregistration CNAME created
[ ] enterpriseenrollment CNAME created

Teams / SfB:
[ ] SRV records added (if using Teams Phone System)
[ ] sip and lyncdiscover CNAMEs created

User UPNs:
[ ] Admin accounts updated to new domain
[ ] All user UPNs updated from .onmicrosoft.com
[ ] Existing email addresses set as aliases
```
