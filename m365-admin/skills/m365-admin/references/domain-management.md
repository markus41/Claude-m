# Domain and Federation Management

This reference covers custom domain management and SAML/WS-Fed federation configuration via Microsoft Graph API.

## Required Scopes

| Operation | Scope |
|---|---|
| Read domains | `Domain.Read.All` |
| Create/manage domains | `Domain.ReadWrite.All` |
| Federation configuration | `Domain.ReadWrite.All` |

The signed-in user must have the Domain Name Administrator or Global Administrator role.

## Domain Management

### List All Domains

```
GET https://graph.microsoft.com/v1.0/domains
```

Response includes:
- `id`: domain name (e.g., `contoso.com`)
- `isDefault`: whether this is the default domain for new UPNs
- `isInitial`: the initial `.onmicrosoft.com` domain (cannot be deleted)
- `isVerified`: whether DNS verification passed
- `authenticationType`: `Managed` or `Federated`
- `supportedServices`: which M365 services use this domain

### Get Single Domain

```
GET https://graph.microsoft.com/v1.0/domains/contoso.com
```

### Add Custom Domain

```
POST https://graph.microsoft.com/v1.0/domains
Content-Type: application/json

{
  "id": "contoso.com"
}
```

The domain is created in `unverified` state. After creation, retrieve DNS records and add them to your DNS provider.

### Get DNS Verification Records

```
GET https://graph.microsoft.com/v1.0/domains/contoso.com/verificationDnsRecords
```

Returns one or more records to add to your DNS zone. Common types:
- `TXT` record with a Microsoft-provided value
- `MX` record (alternative verification method)

After adding DNS records, trigger verification.

### Verify Domain

```
POST https://graph.microsoft.com/v1.0/domains/contoso.com/verify
```

Returns the updated domain object with `isVerified: true` on success.

### Get Service Configuration DNS Records

After verification, retrieve the DNS records required for M365 services:

```
GET https://graph.microsoft.com/v1.0/domains/contoso.com/serviceConfigurationRecords
```

Returns records for Exchange (MX, Autodiscover, SPF, DKIM), Teams (SIP, Lyncdiscover), and Intune (CNAME).

### Set Default Domain

```
PATCH https://graph.microsoft.com/v1.0/domains/contoso.com
Content-Type: application/json

{
  "isDefault": true
}
```

Only one domain can be the default. Setting a new default automatically unsets the previous one.

### Update Domain Properties

```
PATCH https://graph.microsoft.com/v1.0/domains/contoso.com
Content-Type: application/json

{
  "passwordNotificationWindowInDays": 14,
  "passwordValidityPeriodInDays": 90
}
```

### Delete Domain

Cannot delete the initial `.onmicrosoft.com` domain or a domain with active users/services.

```
DELETE https://graph.microsoft.com/v1.0/domains/contoso.com
```

Returns `204 No Content` on success.

### List Domain Users

```
GET https://graph.microsoft.com/v1.0/domains/contoso.com/domainNameReferences
```

Returns users and groups that have their UPN or email on this domain.

## SAML/WS-Fed Federation

Federation converts a managed domain to federated, routing authentication to your on-premises IdP (AD FS, PingFederate, Okta, etc.).

### Get Federation Configuration

```
GET https://graph.microsoft.com/v1.0/domains/contoso.com/federationConfiguration
```

### Create Federation Configuration (convert to federated)

```
POST https://graph.microsoft.com/v1.0/domains/contoso.com/federationConfiguration
Content-Type: application/json

{
  "@odata.type": "#microsoft.graph.samlOrWsFedExternalDomainFederation",
  "issuerUri": "http://adfs.contoso.com/adfs/services/trust",
  "displayName": "Contoso AD FS",
  "metadataExchangeUri": "https://adfs.contoso.com/adfs/services/trust/mex",
  "signingCertificate": "BASE64_ENCODED_CERTIFICATE",
  "passiveSignInUri": "https://adfs.contoso.com/adfs/ls/",
  "preferredAuthenticationProtocol": "wsFed",
  "federatedIdpMfaBehavior": "acceptIfMfaDoneByFederatedIdp"
}
```

`preferredAuthenticationProtocol`: `saml` or `wsFed`
`federatedIdpMfaBehavior`: `acceptIfMfaDoneByFederatedIdp`, `enforceMfaByFederatedIdp`, `rejectMfaByFederatedIdp`

### Update Federation Configuration

```
PATCH https://graph.microsoft.com/v1.0/domains/contoso.com/federationConfiguration/{configId}
Content-Type: application/json

{
  "signingCertificate": "NEW_BASE64_ENCODED_CERTIFICATE"
}
```

Use this when renewing the token-signing certificate on the IdP.

### Delete Federation Configuration (convert back to managed)

```
DELETE https://graph.microsoft.com/v1.0/domains/contoso.com/federationConfiguration/{configId}
```

**Warning**: After deleting federation, users in this domain can no longer use their on-premises IdP credentials. Ensure cloud authentication (password hash sync or pass-through auth) is configured before removing federation.

## Domain Verification Workflow

Complete sequence for adding a new custom domain:

```typescript
// Step 1: Add the domain
await graphClient.api("/domains").post({ id: "newdomain.com" });

// Step 2: Get verification records
const verificationRecords = await graphClient
  .api("/domains/newdomain.com/verificationDnsRecords")
  .get();

// Display records for admin to add to DNS
for (const record of verificationRecords.value) {
  console.log(`Type: ${record.recordType}`);
  console.log(`Label: ${record.label}`);
  console.log(`Text: ${record.text}`);
  console.log(`TTL: ${record.ttl}`);
}

// Step 3: (After DNS propagation) Verify
const verified = await graphClient.api("/domains/newdomain.com/verify").post(null);
if (verified.isVerified) {
  console.log("Domain verified successfully");
}

// Step 4: Get service configuration records
const serviceRecords = await graphClient
  .api("/domains/newdomain.com/serviceConfigurationRecords")
  .get();
// Add these to DNS for M365 service functionality
```

## Common Domain Operations via PowerShell

For operations not available in Graph:

```powershell
# Connect to Azure AD
Connect-AzureAD

# List all domains
Get-AzureADDomain | Select-Object Name, IsDefault, IsVerified, AuthenticationType

# Convert domain to federated (via AD FS)
Convert-MsolDomainToFederated -DomainName contoso.com -SupportMultipleDomain

# Convert domain back to managed
Convert-MsolDomainToStandard -DomainName contoso.com -SkipUserConversion $false -PasswordFile "C:\temp\passwords.txt"

# Update federation settings
Set-MsolDomainFederationSettings -DomainName contoso.com -IssuerUri "https://new-adfs.contoso.com/adfs/services/trust"
```

## Subdomain Management

Subdomains (e.g., `mail.contoso.com`) can be added separately:

```
POST https://graph.microsoft.com/v1.0/domains
Content-Type: application/json

{
  "id": "mail.contoso.com"
}
```

Subdomains inherit the authentication type (managed/federated) of the parent domain. They must be verified independently.
