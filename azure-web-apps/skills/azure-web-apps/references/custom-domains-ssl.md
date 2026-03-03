# Azure App Service — Custom Domains & SSL

## Overview

Azure App Service apps get a default hostname at `{appName}.azurewebsites.net`. Custom domains can be bound to apps after DNS verification. SSL/TLS certificates can be App Service Managed (free, auto-renewing), imported from Azure Key Vault, or uploaded as PFX files. SNI SSL is the standard binding type; IP-based SSL (legacy) assigns a dedicated IP address.

---

## REST API Endpoints

Base URL: `https://management.azure.com`
API Version: `2023-12-01`

### Custom Domain Bindings

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| PUT | `/.../sites/{appName}/hostNameBindings/{hostname}` | Website Contributor | Body: binding definition | Bind custom domain |
| GET | `/.../sites/{appName}/hostNameBindings/{hostname}` | Reader | — | Get specific domain binding |
| GET | `/.../sites/{appName}/hostNameBindings` | Reader | — | List all domain bindings |
| DELETE | `/.../sites/{appName}/hostNameBindings/{hostname}` | Website Contributor | — | Remove domain binding |
| POST | `/.../sites/{appName}/listSiteCertificates` | Website Contributor | — | List certificates for site |

### Certificates

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| PUT | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/certificates/{certName}` | Website Contributor | Body: certificate definition | Upload or import certificate |
| GET | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/certificates` | Reader | — | List certificates in resource group |
| DELETE | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/certificates/{certName}` | Website Contributor | — | Delete certificate |
| GET | `/.../sites/{appName}/config/web` | Reader | — | Get TLS settings (minTlsVersion, etc.) |

### Managed Certificate

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| PUT | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/certificates/{certName}` | Website Contributor | `serverFarmId`, `canonicalName` | Create free managed certificate |

---

## DNS Configuration

### CNAME Record (Subdomains)

For subdomains (e.g., `www.example.com`, `api.example.com`), use a CNAME record pointing to the default hostname.

```
Type:  CNAME
Name:  www
Value: my-app.azurewebsites.net
TTL:   3600
```

Additionally, create a TXT record for domain verification:
```
Type:  TXT
Name:  asuid.www
Value: {domain-verification-id}
TTL:   3600
```

**Get the domain verification ID**:
```bash
az webapp show \
  --name my-app \
  --resource-group rg-webapp \
  --query customDomainVerificationId \
  -o tsv
```

### A Record (Apex/Root Domain)

For apex domains (e.g., `example.com`), CNAME records are not allowed at the root. Use an A record pointing to the app's outbound IP address.

```
Type:  A
Name:  @  (or leave blank for root)
Value: <outbound-ip-address>
TTL:   3600

Type:  TXT
Name:  asuid
Value: {domain-verification-id}
TTL:   3600
```

**Get outbound IPs**:
```bash
az webapp show \
  --name my-app \
  --resource-group rg-webapp \
  --query outboundIpAddresses \
  -o tsv
```

**Note**: Outbound IPs can change when scaling. Use CNAME with `www` and redirect apex → `www` at DNS level, or use a DNS provider that supports ALIAS/ANAME records for the apex domain pointing to the App Service hostname.

### Traffic Manager / Front Door Integration

For global load balancing, configure:
```
Type:  CNAME
Name:  www
Value: my-traffic-manager-profile.trafficmanager.net
```
or
```
Type:  CNAME
Name:  www
Value: my-frontdoor-endpoint.azurefd.net
```

The App Service then receives traffic from the Front Door/Traffic Manager IP ranges. Configure access restrictions on the App Service to only allow Front Door or Traffic Manager source IPs.

---

## Bind Custom Domain (ARM JSON)

```json
PUT /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/sites/{appName}/hostNameBindings/www.example.com?api-version=2023-12-01
{
  "properties": {
    "siteName": "{appName}",
    "domainId": null,
    "azureResourceName": "{appName}",
    "azureResourceType": "Website",
    "customHostNameDnsRecordType": "CName",
    "hostNameType": "Verified",
    "sslState": "Disabled",
    "thumbprint": null
  }
}
```

**`hostNameType`**: `"Verified"` = DNS already configured. `"Managed"` = domain is in Azure DNS.

After binding the domain without SSL, add the certificate and update `sslState`:
```json
{
  "properties": {
    "sslState": "SniEnabled",
    "thumbprint": "<certificate-thumbprint>"
  }
}
```

---

## Free Managed Certificate

App Service Managed Certificates are free, auto-renewing (every 6 months), and only valid for the specific domain bound to the app. They cannot be exported.

```bash
# Step 1: Bind custom domain first (must be done before creating managed cert)
az webapp config hostname add \
  --webapp-name my-app \
  --resource-group rg-webapp \
  --hostname www.example.com

# Step 2: Create managed certificate
az webapp config ssl create \
  --name my-app \
  --resource-group rg-webapp \
  --hostname www.example.com

# Step 3: Bind the certificate to the domain
THUMBPRINT=$(az webapp config ssl list \
  --resource-group rg-webapp \
  --query "[?subjectName=='www.example.com'].thumbprint" -o tsv)

az webapp config ssl bind \
  --name my-app \
  --resource-group rg-webapp \
  --certificate-thumbprint $THUMBPRINT \
  --ssl-type SNI
```

**ARM JSON — Create Managed Certificate**:
```json
PUT /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/certificates/www-example-com?api-version=2023-12-01
{
  "location": "eastus",
  "properties": {
    "serverFarmId": "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/serverfarms/{planName}",
    "canonicalName": "www.example.com"
  }
}
```

Wait for `provisioningState == "Succeeded"` before binding.

---

## Custom Certificate Upload (PFX)

```bash
# Upload PFX certificate
az webapp config ssl upload \
  --name my-app \
  --resource-group rg-webapp \
  --certificate-file ./my-cert.pfx \
  --certificate-password "my-pfx-password"

# Bind to domain
THUMBPRINT=$(az webapp config ssl list \
  --resource-group rg-webapp \
  --query "[?subjectName=='*.example.com'].thumbprint" -o tsv)

az webapp config ssl bind \
  --name my-app \
  --resource-group rg-webapp \
  --certificate-thumbprint $THUMBPRINT \
  --ssl-type SNI
```

**ARM JSON — Upload PFX**:
```json
PUT /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/certificates/my-pfx-cert?api-version=2023-12-01
{
  "location": "eastus",
  "properties": {
    "pfxBlob": "<base64-encoded-pfx>",
    "password": "my-pfx-password",
    "serverFarmId": "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/serverfarms/{planName}"
  }
}
```

---

## Key Vault Certificate Import

Import a certificate directly from Azure Key Vault — no PFX password needed in the ARM call.

**Prerequisites**:
1. Certificate stored in Key Vault (PFX or PKCS12 format).
2. App Service resource provider has access to Key Vault secrets.

```bash
# Grant App Service RP access to Key Vault
az keyvault set-policy \
  --name my-keyvault \
  --spn abfa0a7c-a6b6-4736-8310-5855508787cd \
  --secret-permissions get \
  --certificate-permissions get
```

The service principal `abfa0a7c-a6b6-4736-8310-5855508787cd` is the Microsoft.Web resource provider in Azure Public Cloud.

```json
PUT /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/certificates/my-kv-cert?api-version=2023-12-01
{
  "location": "eastus",
  "properties": {
    "keyVaultId": "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.KeyVault/vaults/my-keyvault",
    "keyVaultSecretName": "my-certificate-secret",
    "serverFarmId": "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/serverfarms/{planName}"
  }
}
```

---

## TLS Configuration

```json
PATCH /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/sites/{appName}/config/web?api-version=2023-12-01
{
  "properties": {
    "minTlsVersion": "1.2",
    "minTlsCipherSuite": "TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384",
    "http20Enabled": true,
    "ftpsState": "Disabled"
  }
}
```

**`minTlsVersion`**: `"1.0"`, `"1.1"`, `"1.2"` (minimum recommended), `"1.3"` (best, may break older clients).
**`ftpsState`**: `"AllAllowed"`, `"FtpsOnly"`, `"Disabled"`. Disable FTP entirely for security.
**`http20Enabled`**: `true` enables HTTP/2 (recommended for multiplexing).

### HTTPS-Only Enforcement

```bash
az webapp update \
  --name my-app \
  --resource-group rg-webapp \
  --https-only true
```

This redirects all HTTP requests to HTTPS automatically (301 redirect).

---

## Bicep: Complete Custom Domain + SSL

```bicep
param appName string
param customDomain string = 'www.example.com'
param location string = resourceGroup().location

resource webApp 'Microsoft.Web/sites@2023-12-01' existing = {
  name: appName
}

// Step 1: Bind custom domain
resource domainBinding 'Microsoft.Web/sites/hostNameBindings@2023-12-01' = {
  parent: webApp
  name: customDomain
  properties: {
    siteName: appName
    hostNameType: 'Verified'
    sslState: 'Disabled'
  }
}

// Step 2: Create managed certificate (depends on domain binding)
resource managedCert 'Microsoft.Web/certificates@2023-12-01' = {
  name: replace(customDomain, '.', '-')
  location: location
  properties: {
    serverFarmId: webApp.properties.serverFarmId
    canonicalName: customDomain
  }
  dependsOn: [domainBinding]
}

// Step 3: Bind certificate to domain (update binding with thumbprint)
resource domainBindingWithSsl 'Microsoft.Web/sites/hostNameBindings@2023-12-01' = {
  parent: webApp
  name: customDomain
  properties: {
    siteName: appName
    hostNameType: 'Verified'
    sslState: 'SniEnabled'
    thumbprint: managedCert.properties.thumbprint
  }
  dependsOn: [managedCert]
}
```

---

## SNI SSL vs IP SSL

| Feature | SNI SSL | IP-Based SSL |
|---------|---------|-------------|
| Certificate assignment | Per hostname | Per IP address |
| Cost | Included in Standard+ | +$0.03/hr per binding |
| HTTP/2 support | Yes | Yes |
| Client compatibility | Modern browsers only (all post-2010) | All clients including very old |
| Required for | All modern use cases | Legacy clients requiring IP-based TLS |
| Custom IP | No — shared outbound IP | Yes — dedicated inbound IP |

**Use IP-based SSL only if**: You need a dedicated inbound IP for the app (e.g., firewall whitelisting by inbound IP) or for legacy clients that don't support SNI (extremely rare).

---

## Error Codes Table

| Code | Meaning | Remediation |
|------|---------|-------------|
| `CustomHostNameValidationFailed` | DNS not pointing to the app or TXT record missing | Add CNAME/A record; add TXT `asuid.{subdomain}` verification record |
| `HostNameAlreadyExists` | Domain bound to another App Service | Release domain from other app first; check all subscriptions |
| `CertificateNotFound` | Certificate thumbprint invalid or not in region | Verify certificate is in same region/resource group as app |
| `InvalidCertificate: expired` | Certificate has passed expiry date | Renew or replace certificate; managed certs auto-renew |
| `KeyVaultAccessDenied` | App Service RP lacks Key Vault permissions | Add Key Vault access policy for App Service RP service principal |
| `SslBindingFailed: certificate CN mismatch` | Certificate doesn't match hostname | Use wildcard cert (`*.example.com`) or per-hostname certificate |
| `ManagedCertificateCreationFailed` | DNS not configured or domain not verified | Verify DNS CNAME/TXT records; wait for DNS propagation |

---

## Throttling Limits Table

| Resource | Limit | Retry Strategy |
|----------|-------|---------------|
| Custom domains per app | 500 (Standard+) | Use wildcard certificates and routing rules for many subdomains |
| SNI SSL bindings per plan | No hard limit | Certificates are per-app; no plan-level SSL limit |
| IP-based SSL bindings per app | 1 per app | Use SNI SSL; IP SSL is legacy |
| Certificate upload size | 32 KB | Split chain certificates; include only required certificates in PFX |
| Managed certificate renewal | Auto-renews 30 days before expiry | Monitor certificate expiry via Azure Monitor alerts |
| DNS propagation time | 0-48 hours (TTL dependent) | Use short TTL (300s) before migration; restore to 3600 after |

---

## Common Patterns and Gotchas

**1. Apex domain CNAME limitation**
DNS standards prohibit CNAME at the zone apex (`@`). Use: (a) `www` redirect + apex A record, (b) DNS providers supporting ALIAS/ANAME at apex (Cloudflare, Route 53, Azure DNS), or (c) Azure Front Door which handles apex domains natively.

**2. Certificate region scoping**
App Service certificates are region-scoped. A certificate in `eastus` cannot be used by an app in `westeurope`. For multi-region deployments, upload the same PFX to each region or use Key Vault with multi-region replication.

**3. Managed certificate limitations**
Managed certificates: (a) cannot be exported, (b) only work for hostnames bound to the specific app, (c) don't support wildcard domains, (d) require the app's DNS to resolve to the app (can't be used with Traffic Manager/Front Door intermediary). For Traffic Manager/Front Door scenarios, use a custom certificate.

**4. Domain verification ID changes**
The `customDomainVerificationId` is per-app, not per-subscription. When you delete and recreate an app, the verification ID changes. Update TXT records accordingly. Keep apps around longer rather than frequently recreating them.

**5. TLS 1.3 client compatibility**
Setting `minTlsVersion: "1.3"` drops support for clients using TLS 1.2. Azure API Management, some corporate proxies, and older SDK versions use TLS 1.2. Keep minimum at `"1.2"` for App Service and configure strict TLS at WAF/Front Door level instead.

**6. Certificate auto-renewal notification**
Azure does not send email notifications when certificates are 30 days from expiry. Set up an Azure Monitor alert on certificate expiry or use Azure Key Vault with auto-rotation for custom certificates.
