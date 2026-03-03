# Azure Key Vault Certificates — Deep Reference

## Overview

Azure Key Vault Certificates manage the full lifecycle of X.509 certificates, including issuance, renewal, storage, and access. Key Vault integrates with certificate authorities (DigiCert, GlobalSign) for automatic renewal, or accepts self-signed and imported certificates. The private key of each certificate is stored as a Key Vault Key and is accessible via the Keys API as well.

## REST API Endpoints

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|---|---|---|---|---|
| POST | `https://{vault}.vault.azure.net/certificates/{name}/create` | Key Vault Certificates Officer | Policy JSON body | Begin certificate creation/issuance |
| GET | `https://{vault}.vault.azure.net/certificates/{name}` | Key Vault Certificates User | `?api-version=7.4` | Get latest certificate version |
| GET | `https://{vault}.vault.azure.net/certificates/{name}/{version}` | Key Vault Certificates User | `?api-version=7.4` | Get specific version with public key |
| GET | `https://{vault}.vault.azure.net/certificates` | Key Vault Certificates Officer | `maxresults` | List all certificate names |
| GET | `https://{vault}.vault.azure.net/certificates/{name}/versions` | Key Vault Certificates Officer | — | List all versions |
| GET | `https://{vault}.vault.azure.net/certificates/{name}/policy` | Key Vault Certificates Officer | — | Get certificate policy (issuance config) |
| PATCH | `https://{vault}.vault.azure.net/certificates/{name}/policy` | Key Vault Certificates Officer | Policy JSON | Update policy (affects future renewals) |
| POST | `https://{vault}.vault.azure.net/certificates/{name}/import` | Key Vault Certificates Officer | `{value: PFX base64, pwd: password}` | Import existing PFX/PEM certificate |
| GET | `https://{vault}.vault.azure.net/certificates/{name}/pending` | Key Vault Certificates Officer | — | Get pending certificate creation status |
| POST | `https://{vault}.vault.azure.net/certificates/{name}/pending/merge` | Key Vault Certificates Officer | Signed certificate body | Complete CSR flow by merging signed cert |
| DELETE | `https://{vault}.vault.azure.net/certificates/{name}` | Key Vault Certificates Officer | — | Soft-delete certificate |
| POST | `https://{vault}.vault.azure.net/deletedcertificates/{name}/recover` | Key Vault Certificates Officer | — | Recover soft-deleted certificate |
| GET | `https://{vault}.vault.azure.net/certificates/{name}/{version}?encoding=PEM` | Key Vault Certificates User | `encoding=PEM` | Download as PEM |

## Certificate Policy Schema

```json
{
  "keyProperties": {
    "kty": "RSA",
    "key_size": 4096,
    "reuse_key": false,
    "exportable": true
  },
  "secretProperties": {
    "contentType": "application/x-pkcs12"
  },
  "x509CertificateProperties": {
    "subject": "CN=api.contoso.com",
    "subjectAlternativeNames": {
      "dnsNames": ["api.contoso.com", "www.contoso.com"]
    },
    "validityInMonths": 12,
    "keyUsage": ["digitalSignature", "keyEncipherment"],
    "ekus": ["1.3.6.1.5.5.7.3.1"]
  },
  "issuerParameters": {
    "name": "Self",
    "certificateType": null
  },
  "lifetimeActions": [
    {
      "trigger": { "daysBeforeExpiry": 30 },
      "action": { "actionType": "AutoRenew" }
    },
    {
      "trigger": { "daysBeforeExpiry": 60 },
      "action": { "actionType": "EmailContacts" }
    }
  ],
  "attributes": {
    "enabled": true
  }
}
```

### Issuer Values

| Issuer Name | Type | Notes |
|---|---|---|
| `Self` | Self-signed | Created and signed by Key Vault internally |
| `Unknown` | External CSR | Key Vault generates the CSR; user signs externally and merges |
| `DigiCert` | CA-integrated | Requires DigiCert account configured in vault |
| `GlobalSign` | CA-integrated | Requires GlobalSign account configured in vault |

## TypeScript SDK Patterns (Azure SDK v12)

### Create a self-signed certificate

```typescript
import { CertificateClient } from "@azure/keyvault-certificates";
import { DefaultAzureCredential } from "@azure/identity";

const client = new CertificateClient(
  `https://${process.env.KEY_VAULT_NAME}.vault.azure.net`,
  new DefaultAzureCredential()
);

// Start certificate creation (async operation)
const createPoller = await client.beginCreateCertificate("api-tls-cert", {
  issuerName: "Self",
  subject: "CN=api.contoso.com",
  subjectAlternativeNames: {
    dnsNames: ["api.contoso.com", "www.contoso.com"],
  },
  validityInMonths: 12,
  keyType: "RSA",
  keySize: 4096,
  contentType: "application/x-pkcs12",
  exportable: true,
  lifetimeActions: [
    {
      lifecycleEventType: "AutoRenew",
      daysBeforeExpiry: 30,
    },
    {
      lifecycleEventType: "EmailContacts",
      daysBeforeExpiry: 60,
    },
  ],
});

const certificate = await createPoller.pollUntilDone();
console.log("Certificate created:", certificate.id);
console.log("Thumbprint:", certificate.properties.x509Thumbprint?.toString("hex"));
```

### Import a PFX certificate

```typescript
import { CertificateClient } from "@azure/keyvault-certificates";
import { DefaultAzureCredential } from "@azure/identity";
import { readFileSync } from "fs";

const client = new CertificateClient(
  `https://${process.env.KEY_VAULT_NAME}.vault.azure.net`,
  new DefaultAzureCredential()
);

// Read PFX file
const pfxBuffer = readFileSync("/certs/mycert.pfx");

// Import the certificate
const imported = await client.importCertificate("imported-tls-cert", pfxBuffer, {
  password: process.env.PFX_PASSWORD, // optional PFX password
  policy: {
    issuerName: "Unknown",
    contentType: "application/x-pkcs12",
    exportable: true,
    lifetimeActions: [
      {
        lifecycleEventType: "AutoRenew",
        daysBeforeExpiry: 30,
      },
    ],
  },
});
console.log("Imported cert expires:", imported.properties.expiresOn);
```

### Download certificate as PEM for use in TLS

```typescript
import { SecretClient } from "@azure/keyvault-secrets";
import { CertificateClient } from "@azure/keyvault-certificates";
import { DefaultAzureCredential } from "@azure/identity";

const vaultUrl = `https://${process.env.KEY_VAULT_NAME}.vault.azure.net`;
const credential = new DefaultAzureCredential();

// Certificates with private keys are accessible via the Secrets API as PEM/PFX
const secretClient = new SecretClient(vaultUrl, credential);
const certSecret = await secretClient.getSecret("api-tls-cert");

// The value is the base64-encoded PFX (or PEM if contentType is x-pem-file)
const pfxBase64 = certSecret.value!;
const pfxBuffer = Buffer.from(pfxBase64, "base64");

// Use with Node.js https module
import https from "https";
const server = https.createServer({
  pfx: pfxBuffer,
  passphrase: "", // no password if not set during import
});
```

### List certificates and check expiry

```typescript
import { CertificateClient } from "@azure/keyvault-certificates";
import { DefaultAzureCredential } from "@azure/identity";

const client = new CertificateClient(
  `https://${process.env.KEY_VAULT_NAME}.vault.azure.net`,
  new DefaultAzureCredential()
);

const warningDays = 30;
const now = new Date();

for await (const cert of client.listPropertiesOfCertificates()) {
  const expiry = cert.expiresOn;
  if (expiry) {
    const daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry <= warningDays) {
      console.warn(`EXPIRING: ${cert.name} — ${daysUntilExpiry} days (${expiry.toISOString()})`);
    }
  }
}
```

## Azure CLI Patterns

```bash
# Create self-signed certificate
az keyvault certificate create \
  --vault-name mykeyvault \
  --name "api-tls-cert" \
  --policy "$(az keyvault certificate get-default-policy)"

# Create with custom policy
az keyvault certificate create \
  --vault-name mykeyvault \
  --name "api-tls-cert" \
  --policy '{
    "issuerParameters": {"name": "Self"},
    "keyProperties": {"kty": "RSA", "key_size": 4096, "exportable": true},
    "secretProperties": {"contentType": "application/x-pkcs12"},
    "x509CertificateProperties": {
      "subject": "CN=api.contoso.com",
      "subjectAlternativeNames": {"dns_names": ["api.contoso.com"]},
      "validityInMonths": 12
    },
    "lifetimeActions": [{"trigger": {"daysBeforeExpiry": 30}, "action": {"actionType": "AutoRenew"}}]
  }'

# Import PFX
az keyvault certificate import \
  --vault-name mykeyvault \
  --name "imported-cert" \
  --file mycert.pfx \
  --password "$PFX_PASSWORD"

# List certificates with expiry
az keyvault certificate list \
  --vault-name mykeyvault \
  --output table

# Get certificate (public key + metadata)
az keyvault certificate show \
  --vault-name mykeyvault \
  --name "api-tls-cert"

# Download as PEM
az keyvault secret download \
  --vault-name mykeyvault \
  --name "api-tls-cert" \
  --file api-tls-cert.pem \
  --encoding base64

# Delete certificate
az keyvault certificate delete \
  --vault-name mykeyvault \
  --name "api-tls-cert"

# Recover deleted certificate
az keyvault certificate recover \
  --vault-name mykeyvault \
  --name "api-tls-cert"
```

## Error Codes

| Code | Meaning | Remediation |
|---|---|---|
| CertificateNotFound (404) | Certificate does not exist | Check name spelling; check soft-deleted certificates |
| Forbidden (403) | Missing certificate permissions | Assign Key Vault Certificates Officer (manage) or Certificates User (read) |
| CertificateExpired (403) | Certificate has expired | Renew or issue a new certificate version |
| InvalidCertificatePolicy (400) | Malformed policy JSON | Validate policy schema; check required fields |
| PendingCertificateExpired (404) | Pending CSR expired | Recreate the certificate |
| CertificateOperationInProgress (409) | Another operation running on cert | Wait for pending operation to complete |
| CAUnavailable (500) | CA integration error (DigiCert/GlobalSign) | Check CA account credentials; use Self-signed fallback |
| Throttled (429) | Rate limit exceeded | Implement caching; reduce polling frequency on pending operations |

## Throttling Limits

| Resource | Limit | Retry Strategy |
|---|---|---|
| Certificate GET operations | 4,000/10 seconds per vault | Cache certificate objects locally with TTL |
| Certificate management operations | 200/10 seconds per vault | Serialize bulk operations |
| Certificate create (CA-integrated) | Subject to CA rate limits | Use auto-renewal; avoid manual mass creation |
| Certificate versions per name | No hard limit | Clean up old versions; retain last 3–5 |

## Production Gotchas

- **Private key is stored as a Key Vault Secret**: To retrieve a certificate with its private key, use the Secrets API with the certificate name. The `CertificateClient` returns only the public certificate (X.509 DER). This is intentional to enforce least-privilege access.
- **`contentType` determines export format**: Set `contentType` to `application/x-pkcs12` for PFX and `application/x-pem-file` for PEM. This affects how the private key is encoded in the Secret value.
- **Auto-renewal creates new versions**: When a certificate auto-renews, a new version is created in Key Vault. Applications referencing the certificate by version ID must update their reference. Use versionless references where possible (App Service KV references support this).
- **CA integration requires issuer configuration**: To use DigiCert or GlobalSign, the CA account must be configured in Key Vault via the Issuers API. Without this, certificate creation with a CA issuer will fail.
- **Self-signed ≠ trusted by browsers**: Self-signed certificates are useful for internal services and mTLS, but browsers will show security warnings. For public-facing endpoints, use a CA-integrated or imported CA-signed certificate.
- **CSR flow for on-premises CA**: Use `issuerName: "Unknown"` to generate a CSR. Download the pending CSR, sign it with your internal CA, then call `merge` to complete the certificate. This is the standard pattern for enterprise PKI integration.
- **Certificate renewal gap**: Auto-renewal at `daysBeforeExpiry: 30` creates a new certificate version before expiry. The old version is still valid until its expiry date. Applications must pick up the new version, typically via a restart or App Service KV reference update.
- **App Service certificate binding**: App Service can bind to Key Vault certificates. The binding uses the latest version. After renewal, App Service automatically picks up the new certificate (may take up to 24 hours; trigger a sync from the portal if needed).
