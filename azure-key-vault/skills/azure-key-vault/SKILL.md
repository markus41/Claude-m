---
name: Azure Key Vault
description: >
  Deep expertise in Azure Key Vault -- manage secrets, cryptographic keys, and certificates
  with RBAC access control, network security, rotation policies, managed identity integration,
  App Service Key Vault references, Event Grid notifications, and monitoring. Targets professional
  developers and cloud engineers securing Azure workloads.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - key vault
  - azure secrets
  - azure keys
  - azure certificates
  - secret rotation
  - managed identity
  - vault access
  - kv reference
  - keyvault
  - certificate renewal
  - secret management
  - encryption key
---

# Azure Key Vault

## 1. Key Vault Overview

Azure Key Vault is a cloud service for securely storing and managing secrets, cryptographic keys, and certificates. It provides centralized secret management with hardware security module (HSM) backing, fine-grained access control, and audit logging.

**Data types**:
| Type | Description | Use Cases |
|------|-------------|-----------|
| Secrets | Arbitrary strings (connection strings, API keys, passwords) | Database passwords, API keys, SAS tokens, connection strings |
| Keys | RSA or EC cryptographic keys (software or HSM-protected) | Encryption, signing, wrapping other keys |
| Certificates | X.509 certificates with private key management | TLS/SSL, code signing, client authentication |

**Vault vs Managed HSM**:
| Feature | Key Vault | Managed HSM |
|---------|-----------|-------------|
| Data types | Secrets, keys, certificates | Keys only |
| HSM protection | Premium SKU (FIPS 140-2 Level 2) | Always (FIPS 140-2 Level 3) |
| Pricing | Per operation + per key/secret | Per HSM unit (hourly) |
| Multi-region | Geo-replication built in | Manual setup |
| Use case | General secret management | Regulatory compliance, highest assurance |

**SKUs**:
| SKU | Key Protection | HSM Keys | Price Model |
|-----|---------------|----------|-------------|
| Standard | Software-protected | Not available | Per 10,000 operations |
| Premium | HSM-backed (FIPS 140-2 Level 2) | RSA 2048/3072/4096, EC P-256/P-384/P-521 | Per 10,000 operations + per key |

**Pricing** (approximate):
- Secrets operations: $0.03 per 10,000 transactions
- RSA 2048-bit key operations (software): $0.03 per 10,000 transactions
- RSA 2048-bit key operations (HSM): $1.00 per 10,000 transactions
- Certificate renewals: $3.00 per renewal
- No charge for storing secrets/keys (only for operations)

## 2. Provisioning

### Azure CLI

```bash
# Create a Key Vault with RBAC authorization, soft-delete, and purge protection
az keyvault create \
  --name <vault-name> \
  --resource-group <rg-name> \
  --location <location> \
  --sku standard \
  --enable-rbac-authorization true \
  --enable-soft-delete true \
  --enable-purge-protection true \
  --retention-days 90
```

Parameters:
- `--name`: Globally unique, 3-24 chars, alphanumeric and hyphens, must start with a letter.
- `--sku`: `standard` or `premium`. Choose `premium` only if HSM-backed keys are required.
- `--enable-rbac-authorization`: Use Azure RBAC instead of legacy access policies. Strongly recommended.
- `--enable-purge-protection`: Once enabled, cannot be disabled. Prevents permanent deletion during retention period.
- `--retention-days`: Soft-delete retention, 7-90 days. Default: 90.

### Bicep Template

```bicep
@description('The name of the Key Vault')
param vaultName string

@description('The Azure region for the Key Vault')
param location string = resourceGroup().location

@description('The SKU of the Key Vault')
@allowed(['standard', 'premium'])
param skuName string = 'standard'

@description('The tenant ID for RBAC')
param tenantId string = subscription().tenantId

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: vaultName
  location: location
  properties: {
    sku: {
      family: 'A'
      name: skuName
    }
    tenantId: tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enablePurgeProtection: true
    networkAcls: {
      defaultAction: 'Deny'
      bypass: 'AzureServices'
      ipRules: []
      virtualNetworkRules: []
    }
    publicNetworkAccess: 'Enabled' // Set to 'Disabled' with private endpoints
  }
}

output vaultUri string = keyVault.properties.vaultUri
output vaultId string = keyVault.id
```

### Network Rules

```bash
# Set default action to deny all traffic
az keyvault update --name <vault-name> --default-action Deny

# Allow specific IP ranges
az keyvault network-rule add --name <vault-name> --ip-address 203.0.113.0/24

# Allow a VNet subnet
az keyvault network-rule add --name <vault-name> \
  --vnet-name <vnet-name> --subnet <subnet-name>

# Allow trusted Azure services (recommended)
az keyvault update --name <vault-name> --bypass AzureServices

# Create a private endpoint
az network private-endpoint create \
  --name <pe-name> \
  --resource-group <rg-name> \
  --vnet-name <vnet-name> \
  --subnet <subnet-name> \
  --private-connection-resource-id $(az keyvault show --name <vault-name> --query id -o tsv) \
  --group-id vault \
  --connection-name <connection-name>

# Configure private DNS zone
az network private-dns zone create \
  --resource-group <rg-name> \
  --name privatelink.vaultcore.azure.net

az network private-dns link vnet create \
  --resource-group <rg-name> \
  --zone-name privatelink.vaultcore.azure.net \
  --name <link-name> \
  --virtual-network <vnet-name> \
  --registration-enabled false
```

## 3. Secrets Management

Secrets are arbitrary byte sequences (up to 25 KB) stored in Key Vault. Each secret has a name, value, content type, optional expiration, and version history.

### CRUD Operations (Azure CLI)

**Create a secret**:
```bash
az keyvault secret set \
  --vault-name <vault-name> \
  --name "DatabasePassword" \
  --value "P@ssw0rd!2024" \
  --content-type "text/plain" \
  --expires "2025-06-01T00:00:00Z" \
  --not-before "2024-01-01T00:00:00Z" \
  --tags environment=production application=api
```

**Create from file** (multi-line secrets, JSON, certificates):
```bash
az keyvault secret set \
  --vault-name <vault-name> \
  --name "ServiceAccountKey" \
  --file ./service-account.json \
  --content-type "application/json" \
  --encoding utf-8
```

**Read a secret**:
```bash
# Get current version value
az keyvault secret show --vault-name <vault-name> --name "DatabasePassword" --query value -o tsv

# Get metadata without value
az keyvault secret show --vault-name <vault-name> --name "DatabasePassword" \
  --query "{id:id, name:name, version:id, enabled:attributes.enabled, created:attributes.created, updated:attributes.updated, expires:attributes.expires, contentType:contentType, tags:tags}"

# Get specific version
az keyvault secret show --vault-name <vault-name> --name "DatabasePassword" --version <version-id>
```

**List secrets**:
```bash
# List all secrets (metadata only, not values)
az keyvault secret list --vault-name <vault-name> \
  --query "[].{name:name, enabled:attributes.enabled, expires:attributes.expires}" -o table

# List all versions of a secret
az keyvault secret list-versions --vault-name <vault-name> --name "DatabasePassword" \
  --query "[].{version:id, created:attributes.created, enabled:attributes.enabled}" -o table
```

**Update metadata** (without changing value):
```bash
az keyvault secret set-attributes \
  --vault-name <vault-name> \
  --name "DatabasePassword" \
  --expires "2026-01-01T00:00:00Z" \
  --content-type "text/plain" \
  --tags environment=production rotated=true
```

**Disable a secret** (without deleting):
```bash
az keyvault secret set-attributes --vault-name <vault-name> --name "DatabasePassword" --enabled false
```

**Delete and recover**:
```bash
# Soft-delete
az keyvault secret delete --vault-name <vault-name> --name "DatabasePassword"

# List deleted secrets
az keyvault secret list-deleted --vault-name <vault-name>

# Recover
az keyvault secret recover --vault-name <vault-name> --name "DatabasePassword"

# Purge (permanent, if purge protection allows)
az keyvault secret purge --vault-name <vault-name> --name "DatabasePassword"
```

### Secret URI Structure

Every secret has a URI: `https://<vault-name>.vault.azure.net/secrets/<name>/<version>`
- Without version: resolves to the latest enabled version.
- With version: resolves to that specific version (immutable).

### Node.js SDK (@azure/keyvault-secrets)

```typescript
import { SecretClient } from "@azure/keyvault-secrets";
import { DefaultAzureCredential } from "@azure/identity";

const vaultUrl = "https://<vault-name>.vault.azure.net";
const client = new SecretClient(vaultUrl, new DefaultAzureCredential());

// Create or update a secret
const result = await client.setSecret("DatabasePassword", "P@ssw0rd!2024", {
  contentType: "text/plain",
  expiresOn: new Date("2025-06-01T00:00:00Z"),
  tags: { environment: "production" },
});
console.log(`Created: ${result.properties.id} (version: ${result.properties.version})`);

// Read a secret
const secret = await client.getSecret("DatabasePassword");
console.log(`Value: ${secret.value}`);

// Read a specific version
const versioned = await client.getSecret("DatabasePassword", { version: "<version-id>" });

// List all secrets
for await (const properties of client.listPropertiesOfSecrets()) {
  console.log(`${properties.name} - expires: ${properties.expiresOn}`);
}

// List versions
for await (const version of client.listPropertiesOfSecretVersions("DatabasePassword")) {
  console.log(`Version: ${version.version}, created: ${version.createdOn}`);
}

// Disable a secret
await client.updateSecretProperties("DatabasePassword", result.properties.version!, {
  enabled: false,
});

// Delete a secret (soft-delete)
const poller = await client.beginDeleteSecret("DatabasePassword");
await poller.pollUntilDone();

// Recover a deleted secret
const recoverPoller = await client.beginRecoverDeletedSecret("DatabasePassword");
await recoverPoller.pollUntilDone();
```

### REST API

```
# Set a secret
PUT https://<vault-name>.vault.azure.net/secrets/<name>?api-version=7.4
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "value": "<secret-value>",
  "contentType": "text/plain",
  "attributes": {
    "enabled": true,
    "exp": 1735689600,
    "nbf": 1704067200
  },
  "tags": {
    "environment": "production"
  }
}

# Get a secret
GET https://<vault-name>.vault.azure.net/secrets/<name>?api-version=7.4
Authorization: Bearer <access-token>

# Get specific version
GET https://<vault-name>.vault.azure.net/secrets/<name>/<version>?api-version=7.4

# List secrets
GET https://<vault-name>.vault.azure.net/secrets?api-version=7.4
```

## 4. Key Management

Azure Key Vault keys are cryptographic keys used for encryption, signing, and key wrapping. Keys can be software-protected (Standard SKU) or HSM-protected (Premium SKU).

### Key Types

| Key Type | Sizes/Curves | Operations | SKU |
|----------|-------------|------------|-----|
| RSA | 2048, 3072, 4096 | Encrypt, decrypt, sign, verify, wrap, unwrap | Standard + Premium |
| RSA-HSM | 2048, 3072, 4096 | Same as RSA, HSM-protected | Premium only |
| EC | P-256, P-384, P-521 | Sign, verify | Standard + Premium |
| EC-HSM | P-256, P-384, P-521 | Sign, verify, HSM-protected | Premium only |
| oct-HSM | 128, 192, 256 | Wrap, unwrap (symmetric, HSM only) | Premium only (Managed HSM) |

### Key Operations

| Operation | Description | Use Case |
|-----------|-------------|----------|
| `encrypt` | Encrypt data with the public key | Protect data at rest |
| `decrypt` | Decrypt data with the private key | Read protected data |
| `sign` | Sign a digest with the private key | Code signing, JWT signing |
| `verify` | Verify a signature with the public key | Validate signatures |
| `wrapKey` | Encrypt a symmetric key with an asymmetric key | Key encryption keys (KEK) |
| `unwrapKey` | Decrypt a wrapped symmetric key | Recover wrapped keys |

### Azure CLI

```bash
# Create an RSA key
az keyvault key create \
  --vault-name <vault-name> \
  --name "EncryptionKey" \
  --kty RSA \
  --size 2048 \
  --ops encrypt decrypt sign verify wrapKey unwrapKey \
  --expires "2025-12-31T00:00:00Z" \
  --tags purpose=data-encryption

# Create an EC key for signing
az keyvault key create \
  --vault-name <vault-name> \
  --name "SigningKey" \
  --kty EC \
  --curve P-256 \
  --ops sign verify

# Create an HSM-protected RSA key (Premium SKU required)
az keyvault key create \
  --vault-name <vault-name> \
  --name "HsmEncryptionKey" \
  --kty RSA-HSM \
  --size 4096 \
  --protection hsm

# Import an existing key
az keyvault key import \
  --vault-name <vault-name> \
  --name "ImportedKey" \
  --pem-file ./private-key.pem

# List keys
az keyvault key list --vault-name <vault-name> \
  --query "[].{name:name, keyType:key.kty, enabled:attributes.enabled, expires:attributes.expires}" -o table

# Show key details
az keyvault key show --vault-name <vault-name> --name "EncryptionKey"

# Rotate a key (creates a new version)
az keyvault key rotate --vault-name <vault-name> --name "EncryptionKey"

# Delete a key
az keyvault key delete --vault-name <vault-name> --name "EncryptionKey"

# Back up a key
az keyvault key backup --vault-name <vault-name> --name "EncryptionKey" --file EncryptionKey.backup

# Restore a key
az keyvault key restore --vault-name <vault-name> --file EncryptionKey.backup
```

### Bring Your Own Key (BYOK)

Import an existing HSM-protected key into Key Vault:

```bash
# Generate a key exchange key (KEK) in Key Vault
az keyvault key create --vault-name <vault-name> --name "ImportKEK" --kty RSA-HSM --size 4096 --ops import

# Download the KEK public key
az keyvault key download --vault-name <vault-name> --name "ImportKEK" --file kek-public.pem --encoding PEM

# Wrap your key with the KEK (using your HSM tooling)
# ... vendor-specific wrapping process ...

# Import the wrapped key
az keyvault key import --vault-name <vault-name> --name "MyHsmKey" --byok-file ./wrapped-key.byok
```

### Node.js SDK (@azure/keyvault-keys)

```typescript
import { KeyClient, CryptographyClient } from "@azure/keyvault-keys";
import { DefaultAzureCredential } from "@azure/identity";

const vaultUrl = "https://<vault-name>.vault.azure.net";
const credential = new DefaultAzureCredential();
const keyClient = new KeyClient(vaultUrl, credential);

// Create a key
const key = await keyClient.createRsaKey("EncryptionKey", {
  keySize: 2048,
  keyOps: ["encrypt", "decrypt", "wrapKey", "unwrapKey"],
  expiresOn: new Date("2025-12-31"),
  tags: { purpose: "data-encryption" },
});

// Create an EC key
const ecKey = await keyClient.createEcKey("SigningKey", {
  curve: "P-256",
  keyOps: ["sign", "verify"],
});

// Use CryptographyClient for cryptographic operations
const cryptoClient = new CryptographyClient(key, credential);

// Encrypt
const plaintext = Buffer.from("Hello, World!");
const encryptResult = await cryptoClient.encrypt("RSA-OAEP", plaintext);

// Decrypt
const decryptResult = await cryptoClient.decrypt("RSA-OAEP", encryptResult.result);
console.log(Buffer.from(decryptResult.result).toString()); // "Hello, World!"

// Sign
const digest = Buffer.from("sha256-hash-of-data");
const signResult = await cryptoClient.sign("RS256", digest);

// Verify
const verifyResult = await cryptoClient.verify("RS256", digest, signResult.result);
console.log(`Signature valid: ${verifyResult.result}`);

// Wrap a key
const symmetricKey = Buffer.from("0123456789abcdef0123456789abcdef"); // 256-bit AES key
const wrapResult = await cryptoClient.wrapKey("RSA-OAEP", symmetricKey);

// Unwrap
const unwrapResult = await cryptoClient.unwrapKey("RSA-OAEP", wrapResult.result);

// Rotate (create new version)
const rotated = await keyClient.rotateKey("EncryptionKey");
console.log(`New version: ${rotated.properties.version}`);

// List keys
for await (const keyProperties of keyClient.listPropertiesOfKeys()) {
  console.log(`${keyProperties.name} - type: ${keyProperties.keyType}`);
}
```

### Key Rotation Policy

```bash
# Set a rotation policy
az keyvault key rotation-policy update \
  --vault-name <vault-name> \
  --name "EncryptionKey" \
  --value '{
    "lifetimeActions": [
      { "trigger": { "timeAfterCreate": "P90D" }, "action": { "type": "Rotate" } },
      { "trigger": { "timeBeforeExpiry": "P30D" }, "action": { "type": "Notify" } }
    ],
    "attributes": { "expiryTime": "P120D" }
  }'

# View the rotation policy
az keyvault key rotation-policy show --vault-name <vault-name> --name "EncryptionKey"
```

## 5. Certificate Management

Key Vault certificates combine an X.509 certificate with its private key and an issuance policy. Key Vault can issue self-signed certificates or integrate with CAs (DigiCert, GlobalSign) for automated issuance and renewal.

### Certificate Lifecycle

1. **Create policy** -- Define subject, SANs, key properties, issuer, and lifetime actions.
2. **Issue** -- Key Vault generates the key pair and either self-signs or sends a CSR to the CA.
3. **Store** -- Certificate, private key, and policy are stored together.
4. **Use** -- Applications access the certificate via the Key Vault SDK or as a linked secret (PFX/PEM).
5. **Renew** -- Auto-renewal triggers based on lifetime actions (percentage of lifetime or days before expiry).

### Self-Signed Certificates (Azure CLI)

```bash
# Create with a JSON policy
az keyvault certificate create \
  --vault-name <vault-name> \
  --name "ApiTlsCert" \
  --policy '{
    "issuerParameters": { "name": "Self" },
    "keyProperties": {
      "exportable": true,
      "keySize": 2048,
      "keyType": "RSA",
      "reuseKey": false
    },
    "secretProperties": { "contentType": "application/x-pkcs12" },
    "x509CertificateProperties": {
      "subject": "CN=api.contoso.com",
      "subjectAlternativeNames": {
        "dnsNames": ["api.contoso.com", "api-staging.contoso.com"]
      },
      "validityInMonths": 12,
      "keyUsage": ["digitalSignature", "keyEncipherment"]
    },
    "lifetimeActions": [
      {
        "trigger": { "daysBeforeExpiry": 30 },
        "action": { "actionType": "AutoRenew" }
      }
    ]
  }'
```

### CA-Integrated Certificates

```bash
# Configure a CA issuer (one-time setup)
az keyvault certificate issuer create \
  --vault-name <vault-name> \
  --issuer-name "DigiCertIssuer" \
  --provider-name DigiCert \
  --account-id <digicert-account-id> \
  --password <digicert-api-key>

# Issue a certificate via the CA
az keyvault certificate create \
  --vault-name <vault-name> \
  --name "ProdTlsCert" \
  --policy '{
    "issuerParameters": { "name": "DigiCertIssuer" },
    "keyProperties": { "exportable": true, "keySize": 2048, "keyType": "RSA" },
    "secretProperties": { "contentType": "application/x-pkcs12" },
    "x509CertificateProperties": {
      "subject": "CN=www.contoso.com",
      "validityInMonths": 12
    },
    "lifetimeActions": [
      { "trigger": { "daysBeforeExpiry": 60 }, "action": { "actionType": "AutoRenew" } }
    ]
  }'
```

### Certificate Operations

```bash
# List certificates
az keyvault certificate list --vault-name <vault-name> \
  --query "[].{name:name, expires:attributes.expires, enabled:attributes.enabled}" -o table

# Show certificate details
az keyvault certificate show --vault-name <vault-name> --name "ApiTlsCert" \
  --query "{subject:policy.x509CertificateProperties.subject, issuer:policy.issuerParameters.name, expires:attributes.expires, thumbprint:x509Thumbprint}"

# Download as PEM
az keyvault certificate download --vault-name <vault-name> --name "ApiTlsCert" \
  --file api-cert.pem --encoding PEM

# Export PFX (certificate + private key via the secret)
az keyvault secret show --vault-name <vault-name> --name "ApiTlsCert" \
  --query value -o tsv | base64 -d > api-cert.pfx

# Import an existing certificate
az keyvault certificate import --vault-name <vault-name> --name "ImportedCert" \
  --file ./cert-with-key.pfx --password <pfx-password>

# Delete
az keyvault certificate delete --vault-name <vault-name> --name "ApiTlsCert"
```

### App Service / App Gateway Integration

**App Service TLS binding**:
```bash
# Import KV certificate into App Service
az webapp config ssl import \
  --resource-group <rg-name> \
  --name <app-name> \
  --key-vault <vault-name> \
  --key-vault-certificate-name "ApiTlsCert"

# Bind to a custom domain
THUMBPRINT=$(az keyvault certificate show --vault-name <vault-name> --name "ApiTlsCert" --query x509Thumbprint -o tsv)
az webapp config ssl bind \
  --resource-group <rg-name> \
  --name <app-name> \
  --certificate-thumbprint "$THUMBPRINT" \
  --ssl-type SNI
```

**Application Gateway**:
```bash
# Reference a KV certificate in App Gateway
az network application-gateway ssl-cert create \
  --gateway-name <gw-name> \
  --resource-group <rg-name> \
  --name <ssl-cert-name> \
  --key-vault-secret-id "https://<vault-name>.vault.azure.net/secrets/ApiTlsCert"
```

### Node.js SDK (@azure/keyvault-certificates)

```typescript
import { CertificateClient } from "@azure/keyvault-certificates";
import { DefaultAzureCredential } from "@azure/identity";

const vaultUrl = "https://<vault-name>.vault.azure.net";
const client = new CertificateClient(vaultUrl, new DefaultAzureCredential());

// Create a self-signed certificate
const createPoller = await client.beginCreateCertificate("ApiTlsCert", {
  issuerName: "Self",
  subject: "CN=api.contoso.com",
  subjectAlternativeNames: {
    dnsNames: ["api.contoso.com"],
  },
  validityInMonths: 12,
  keySize: 2048,
  contentType: "application/x-pkcs12",
  lifetimeActions: [
    { trigger: { daysBeforeExpiry: 30 }, action: "AutoRenew" },
  ],
});
const cert = await createPoller.pollUntilDone();
console.log(`Certificate: ${cert.name}, thumbprint: ${cert.properties.x509Thumbprint}`);

// List certificates
for await (const certProperties of client.listPropertiesOfCertificates()) {
  console.log(`${certProperties.name} - expires: ${certProperties.expiresOn}`);
}

// Get a certificate
const retrieved = await client.getCertificate("ApiTlsCert");
console.log(`Subject: ${retrieved.policy?.subject}`);

// Delete a certificate
const deletePoller = await client.beginDeleteCertificate("ApiTlsCert");
await deletePoller.pollUntilDone();

// Recover a deleted certificate
const recoverPoller = await client.beginRecoverDeletedCertificate("ApiTlsCert");
await recoverPoller.pollUntilDone();
```

## 6. Access Control

### RBAC vs Access Policies

Azure Key Vault supports two access models. RBAC authorization is the recommended approach.

| Feature | RBAC (Recommended) | Access Policies (Legacy) |
|---------|--------------------|-----------------------|
| Granularity | Per-secret, per-key, per-certificate | Per-vault only |
| Management | Azure IAM, consistent with all Azure resources | Vault-specific configuration |
| Conditional access | Supported via Azure AD | Limited |
| Audit | Unified Azure activity log | Separate Key Vault audit log |
| Max assignments | 2000 per subscription | 1024 per vault |
| PIM integration | Yes (time-bound elevation) | No |

**Enable RBAC** (disable access policies):
```bash
az keyvault update --name <vault-name> --enable-rbac-authorization true
```

### Key Vault RBAC Roles

| Role | Secrets | Keys | Certificates | Management |
|------|---------|------|-------------|------------|
| Key Vault Administrator | Full | Full | Full | Full |
| Key Vault Secrets Officer | CRUD | - | - | - |
| Key Vault Secrets User | Read | - | - | - |
| Key Vault Crypto Officer | - | Full | - | - |
| Key Vault Crypto User | - | Encrypt, decrypt, wrap, unwrap, sign, verify | - | - |
| Key Vault Certificates Officer | - | - | Full | - |
| Key Vault Certificate User | - | - | Read | - |
| Key Vault Reader | List (no values) | List (no values) | List (no values) | Read metadata |

**Assign a role**:
```bash
# Scope to the vault
VAULT_ID=$(az keyvault show --name <vault-name> --query id -o tsv)

az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee <principal-id-or-email> \
  --scope "$VAULT_ID"

# Scope to a specific secret
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee <principal-id> \
  --scope "$VAULT_ID/secrets/DatabasePassword"
```

**List role assignments**:
```bash
az role assignment list --scope "$VAULT_ID" \
  --query "[].{principal:principalName, role:roleDefinitionName, type:principalType}" -o table
```

### Legacy Access Policies

For vaults not yet migrated to RBAC:

```bash
# Grant secret get/list to a user
az keyvault set-policy --name <vault-name> \
  --upn user@contoso.com \
  --secret-permissions get list

# Grant to a service principal
az keyvault set-policy --name <vault-name> \
  --spn <app-id> \
  --secret-permissions get \
  --key-permissions get unwrapKey wrapKey

# Remove a policy
az keyvault delete-policy --name <vault-name> --upn user@contoso.com
```

### Private Endpoints

Restrict network access so the vault is only reachable from specific VNets:

```bash
# Create a private endpoint
az network private-endpoint create \
  --name "kv-pe" \
  --resource-group <rg-name> \
  --vnet-name <vnet-name> \
  --subnet <subnet-name> \
  --private-connection-resource-id "$VAULT_ID" \
  --group-id vault \
  --connection-name "kv-connection"

# Disable public access entirely
az keyvault update --name <vault-name> --public-network-access Disabled
```

### Firewall Rules

```bash
# Default deny + allow specific IPs
az keyvault update --name <vault-name> --default-action Deny
az keyvault network-rule add --name <vault-name> --ip-address 203.0.113.50
az keyvault network-rule add --name <vault-name> --ip-address 198.51.100.0/24

# Allow a VNet subnet
SUBNET_ID=$(az network vnet subnet show --resource-group <rg-name> --vnet-name <vnet> --name <subnet> --query id -o tsv)
az keyvault network-rule add --name <vault-name> --subnet "$SUBNET_ID"

# Allow trusted Azure services to bypass firewall
az keyvault update --name <vault-name> --bypass AzureServices
```

## 7. Application Integration

### App Service Key Vault References

Key Vault references let App Service and Functions read secrets at runtime without any code changes. The platform resolves the reference and injects the secret value into the app setting.

**Requirements**:
- App Service/Functions must have a system-assigned or user-assigned managed identity.
- The managed identity must have `Key Vault Secrets User` role on the vault.
- The vault must allow access from the app (network rules / trusted services).

**Configure**:
```bash
# Using secret URI (recommended -- always gets latest version)
az webapp config appsettings set \
  --name <app-name> \
  --resource-group <rg-name> \
  --settings "DbPassword=@Microsoft.KeyVault(SecretUri=https://<vault>.vault.azure.net/secrets/DatabasePassword)"

# Pinned to specific version
az webapp config appsettings set \
  --name <app-name> \
  --resource-group <rg-name> \
  --settings "DbPassword=@Microsoft.KeyVault(SecretUri=https://<vault>.vault.azure.net/secrets/DatabasePassword/<version>)"

# Alternative syntax
az webapp config appsettings set \
  --name <app-name> \
  --resource-group <rg-name> \
  --settings "DbPassword=@Microsoft.KeyVault(VaultName=<vault>;SecretName=DatabasePassword)"
```

**Behavior**:
- References without a version resolve to the latest enabled version.
- The secret is cached for 24 hours and refreshed on app restart.
- If the reference cannot be resolved, the raw `@Microsoft.KeyVault(...)` string is used as the value -- the app does not crash but the secret is not available.

**Verify status**:
```bash
az webapp config appsettings list --name <app-name> --resource-group <rg-name> \
  --query "[?contains(value,'Microsoft.KeyVault')].{name:name, value:value}" -o table
```

### Azure Functions

Same as App Service -- Functions support Key Vault references in application settings:

```bash
az functionapp config appsettings set \
  --name <function-name> \
  --resource-group <rg-name> \
  --settings "StorageConnection=@Microsoft.KeyVault(SecretUri=https://<vault>.vault.azure.net/secrets/StorageConnectionString)"
```

### Container Apps

Container Apps use a managed identity to pull secrets at revision creation:

```bash
# Enable system-assigned identity
az containerapp identity assign --name <app-name> --resource-group <rg-name> --system-assigned

# Add a Key Vault secret reference
az containerapp secret set \
  --name <app-name> \
  --resource-group <rg-name> \
  --secrets "db-password=keyvaultref:https://<vault>.vault.azure.net/secrets/DatabasePassword,identityref:system"

# Use the secret as an environment variable
az containerapp update \
  --name <app-name> \
  --resource-group <rg-name> \
  --set-env-vars "DB_PASSWORD=secretref:db-password"
```

### .NET Configuration Provider

The `Azure.Extensions.AspNetCore.Configuration.Secrets` package integrates Key Vault directly into the .NET configuration system:

```csharp
// Program.cs
using Azure.Identity;

var builder = WebApplication.CreateBuilder(args);

// Add Key Vault as a configuration source
builder.Configuration.AddAzureKeyVault(
    new Uri("https://<vault-name>.vault.azure.net"),
    new DefaultAzureCredential());

var app = builder.Build();

// Access secrets like any configuration value
var dbPassword = app.Configuration["DatabasePassword"];
var apiKey = app.Configuration["ExternalApiKey"];
```

Secrets are loaded at startup and cached. To refresh, restart the app or implement a custom `KeyVaultSecretManager`.

### Spring Boot (Java)

```xml
<!-- pom.xml -->
<dependency>
  <groupId>com.azure.spring</groupId>
  <artifactId>spring-cloud-azure-starter-keyvault-secrets</artifactId>
</dependency>
```

```yaml
# application.yml
spring:
  cloud:
    azure:
      keyvault:
        secret:
          property-sources:
            - name: my-vault
              endpoint: https://<vault-name>.vault.azure.net
```

Secret names with hyphens are mapped to dotted property names: `database-password` becomes `database.password` in Spring configuration.

## 8. Managed Identity

Managed identities eliminate the need to store credentials in code or configuration. Azure manages the identity lifecycle, and the identity is automatically authenticated to Azure services.

### System-Assigned vs User-Assigned

| Feature | System-Assigned | User-Assigned |
|---------|----------------|---------------|
| Lifecycle | Tied to the resource | Independent -- shared across resources |
| Creation | Enable on the resource | Create separately, then assign |
| Deletion | Deleted with the resource | Must be deleted explicitly |
| Sharing | One per resource | One identity for multiple resources |
| Use case | Single-app access | Shared access pattern, blue-green deploys |

### Enable Managed Identity

**App Service**:
```bash
# System-assigned
az webapp identity assign --name <app-name> --resource-group <rg-name>

# User-assigned
az identity create --name <identity-name> --resource-group <rg-name>
IDENTITY_ID=$(az identity show --name <identity-name> --resource-group <rg-name> --query id -o tsv)
az webapp identity assign --name <app-name> --resource-group <rg-name> --identities "$IDENTITY_ID"
```

**Azure Functions**:
```bash
az functionapp identity assign --name <function-name> --resource-group <rg-name>
```

**Container Apps**:
```bash
az containerapp identity assign --name <app-name> --resource-group <rg-name> --system-assigned
```

**Virtual Machines**:
```bash
az vm identity assign --name <vm-name> --resource-group <rg-name>
```

### Grant Key Vault Access

```bash
# Get the managed identity principal ID
PRINCIPAL_ID=$(az webapp identity show --name <app-name> --resource-group <rg-name> --query principalId -o tsv)
VAULT_ID=$(az keyvault show --name <vault-name> --query id -o tsv)

# Assign the minimum required role
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee "$PRINCIPAL_ID" \
  --scope "$VAULT_ID"
```

### Access Secrets from Code with DefaultAzureCredential

`DefaultAzureCredential` automatically uses the managed identity when running in Azure, and falls back to developer credentials locally (Azure CLI, VS Code, environment variables).

**Node.js**:
```typescript
import { SecretClient } from "@azure/keyvault-secrets";
import { DefaultAzureCredential } from "@azure/identity";

// No connection strings, no client secrets -- just the vault URL
const client = new SecretClient(
  "https://<vault-name>.vault.azure.net",
  new DefaultAzureCredential()
);

const secret = await client.getSecret("DatabasePassword");
```

**.NET**:
```csharp
using Azure.Identity;
using Azure.Security.KeyVault.Secrets;

var client = new SecretClient(
    new Uri("https://<vault-name>.vault.azure.net"),
    new DefaultAzureCredential());

var secret = await client.GetSecretAsync("DatabasePassword");
```

**Python**:
```python
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient

credential = DefaultAzureCredential()
client = SecretClient(vault_url="https://<vault-name>.vault.azure.net", credential=credential)

secret = client.get_secret("DatabasePassword")
print(secret.value)
```

**Java**:
```java
import com.azure.identity.DefaultAzureCredentialBuilder;
import com.azure.security.keyvault.secrets.SecretClient;
import com.azure.security.keyvault.secrets.SecretClientBuilder;

SecretClient client = new SecretClientBuilder()
    .vaultUrl("https://<vault-name>.vault.azure.net")
    .credential(new DefaultAzureCredentialBuilder().build())
    .buildClient();

String value = client.getSecret("DatabasePassword").getValue();
```

### Cross-Service Patterns

**Pattern: App Service reads secrets, accesses SQL with managed identity**:
```
App Service (system-assigned MI)
  -> Key Vault (Secrets User role) -> reads connection metadata
  -> Azure SQL (db_datareader role) -> queries database
```

**Pattern: Azure Functions processes events, writes to Storage**:
```
Azure Functions (system-assigned MI)
  -> Key Vault (Secrets User role) -> reads API key for external service
  -> Storage Account (Blob Contributor role) -> writes output blobs
```

## 9. Rotation Policies

### Built-In Key Rotation

Key Vault can automatically rotate keys based on a policy. When rotation occurs, a new key version is created and the previous version remains accessible.

```bash
# Configure rotation policy
az keyvault key rotation-policy update \
  --vault-name <vault-name> \
  --name "EncryptionKey" \
  --value '{
    "lifetimeActions": [
      {
        "trigger": { "timeAfterCreate": "P90D" },
        "action": { "type": "Rotate" }
      },
      {
        "trigger": { "timeBeforeExpiry": "P30D" },
        "action": { "type": "Notify" }
      }
    ],
    "attributes": {
      "expiryTime": "P120D"
    }
  }'
```

**Duration format** (ISO 8601):
| Duration | Meaning |
|----------|---------|
| `P30D` | 30 days |
| `P90D` | 90 days |
| `P6M` | 6 months |
| `P1Y` | 1 year |
| `P2Y` | 2 years |

### Event Grid Notifications

For secrets and certificates, use Event Grid to trigger custom rotation workflows:

```bash
VAULT_ID=$(az keyvault show --name <vault-name> --query id -o tsv)

# Subscribe to near-expiry and expired events
az eventgrid event-subscription create \
  --name "kv-rotation-sub" \
  --source-resource-id "$VAULT_ID" \
  --endpoint "https://<function-app>.azurewebsites.net/api/RotateSecret" \
  --included-event-types \
    "Microsoft.KeyVault.SecretNearExpiry" \
    "Microsoft.KeyVault.SecretExpired" \
    "Microsoft.KeyVault.KeyNearExpiry" \
    "Microsoft.KeyVault.CertificateNearExpiry"
```

### Custom Rotation with Azure Functions

A typical rotation function:

1. Receives the Event Grid event with the secret name.
2. Reads the current secret to determine what service it belongs to.
3. Calls the target service API to regenerate the credential (e.g., rotate a storage account key, reset a database password).
4. Stores the new credential as a new secret version in Key Vault.
5. Optionally notifies administrators via email or Teams.

```typescript
import { AzureFunction, Context } from "@azure/functions";
import { SecretClient } from "@azure/keyvault-secrets";
import { DefaultAzureCredential } from "@azure/identity";

const rotateSecret: AzureFunction = async (context: Context, event: any): Promise<void> => {
  const secretName: string = event.subject;
  const vaultName: string = event.data.VaultName;
  const vaultUrl = `https://${vaultName}.vault.azure.net`;

  const client = new SecretClient(vaultUrl, new DefaultAzureCredential());

  // Read current secret metadata to determine rotation strategy
  const current = await client.getSecret(secretName);
  const secretType = current.properties.tags?.type || "unknown";

  let newValue: string;
  switch (secretType) {
    case "storage-key":
      newValue = await rotateStorageKey(current);
      break;
    case "sql-password":
      newValue = await rotateSqlPassword(current);
      break;
    default:
      context.log.warn(`No rotation handler for type: ${secretType}`);
      return;
  }

  // Store the new version
  await client.setSecret(secretName, newValue, {
    expiresOn: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    tags: {
      ...current.properties.tags,
      rotatedOn: new Date().toISOString(),
    },
  });

  context.log(`Successfully rotated: ${secretName}`);
};
```

### Rotation Workflow Diagram

```
Secret nears expiry
  -> Event Grid fires SecretNearExpiry
  -> Azure Function triggered
  -> Function reads secret metadata (tags, content type)
  -> Function calls target service API to regenerate credential
  -> Function stores new value in Key Vault (new version)
  -> Function optionally sends notification
  -> Apps using latest-version KV references pick up new value on next cache refresh
```

## 10. Monitoring and Auditing

### Diagnostic Logs

Enable diagnostic logging to a Log Analytics workspace:

```bash
VAULT_ID=$(az keyvault show --name <vault-name> --query id -o tsv)
WORKSPACE_ID=$(az monitor log-analytics workspace show --resource-group <rg-name> --workspace-name <workspace> --query id -o tsv)

az monitor diagnostic-settings create \
  --name "kv-diagnostics" \
  --resource "$VAULT_ID" \
  --workspace "$WORKSPACE_ID" \
  --logs '[{"category":"AuditEvent","enabled":true,"retentionPolicy":{"enabled":true,"days":90}}]' \
  --metrics '[{"category":"AllMetrics","enabled":true}]'
```

### Log Analytics Queries (KQL)

**All operations in the last 7 days**:
```
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.KEYVAULT"
| where TimeGenerated > ago(7d)
| summarize count() by OperationName, ResultType
| order by count_ desc
```

**Failed access attempts**:
```
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.KEYVAULT"
| where ResultType != "Success"
| where TimeGenerated > ago(24h)
| project TimeGenerated, OperationName, CallerIPAddress, ResultDescription, identity_claim_upn_s
| order by TimeGenerated desc
```

**Secret access by identity**:
```
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.KEYVAULT"
| where OperationName == "SecretGet"
| where TimeGenerated > ago(30d)
| summarize AccessCount=count() by identity_claim_oid_s, CallerIPAddress
| order by AccessCount desc
```

**Secrets nearing expiry**:
```
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.KEYVAULT"
| where OperationName == "SecretNearExpiryEventGridNotification"
| project TimeGenerated, id_s, requestUri_s
```

### Azure Monitor Alerts

```bash
# Alert on failed Key Vault operations
az monitor metrics alert create \
  --name "kv-failed-ops" \
  --resource "$VAULT_ID" \
  --condition "total ServiceApiResult > 0 where StatusCode includes 403" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action <action-group-id> \
  --description "Alert on Key Vault 403 Forbidden responses"
```

### Azure Policy for Key Vault

| Policy | Effect | Description |
|--------|--------|-------------|
| `Key vaults should have soft delete enabled` | Audit/Deny | Ensure soft-delete is enabled |
| `Key vaults should have purge protection enabled` | Audit/Deny | Ensure purge protection is enabled |
| `Secrets should have expiration date set` | Audit/Deny | Require expiration on all secrets |
| `Keys should have expiration date set` | Audit/Deny | Require expiration on all keys |
| `Key Vault should use RBAC` | Audit | Prefer RBAC over access policies |
| `Key Vault should use private endpoint` | Audit/Deny | Require private endpoint connections |
| `Certificates should have specified lifetime action` | Audit | Ensure auto-renewal is configured |

## 11. Backup and Recovery

### Soft-Delete

Soft-delete is enabled by default for all new vaults (since December 2020). Deleted items are retained for the configured retention period and can be recovered.

```bash
# Check soft-delete status
az keyvault show --name <vault-name> --query "properties.{softDelete:enableSoftDelete, purgeProtection:enablePurgeProtection, retentionDays:softDeleteRetentionInDays}"

# List deleted vaults
az keyvault list-deleted --query "[].{name:name, location:properties.location, deletionDate:properties.deletionDate}"

# Recover a deleted vault
az keyvault recover --name <vault-name>

# Purge a deleted vault (permanent)
az keyvault purge --name <vault-name>
```

### Backup and Restore

Key Vault supports per-item backup. Backups are encrypted and can only be restored to a vault in the same Azure subscription and geography.

```bash
# Backup a secret
az keyvault secret backup --vault-name <vault-name> --name "DatabasePassword" --file db-password.backup

# Backup a key
az keyvault key backup --vault-name <vault-name> --name "EncryptionKey" --file encryption-key.backup

# Backup a certificate
az keyvault certificate backup --vault-name <vault-name> --name "ApiTlsCert" --file api-cert.backup

# Restore (to same or different vault in same subscription/geography)
az keyvault secret restore --vault-name <target-vault> --file db-password.backup
az keyvault key restore --vault-name <target-vault> --file encryption-key.backup
az keyvault certificate restore --vault-name <target-vault> --file api-cert.backup
```

**Limitations**:
- Backups cannot be restored across subscriptions or Azure geographies.
- The target vault must have the same SKU or higher.
- The backup file is encrypted with a Microsoft-managed key and is only usable within the Azure ecosystem.
- There is no full-vault backup (each item must be backed up individually).

### Cross-Region Considerations

- Key Vault is a regional service with built-in geo-replication to a paired region.
- During a regional outage, the vault fails over to the paired region in read-only mode.
- Write operations are unavailable during failover.
- For multi-region active-active applications, consider maintaining separate vaults per region with synchronized secrets (via CI/CD or a custom sync process).

## 12. Common Patterns

### Pattern 1: App Service + Managed Identity + KV References

The most common pattern for Azure web applications. Zero secrets in code or configuration.

```bash
# 1. Create the vault
az keyvault create --name myapp-kv --resource-group myapp-rg --location eastus \
  --enable-rbac-authorization true --enable-purge-protection true

# 2. Store secrets
az keyvault secret set --vault-name myapp-kv --name "SqlConnectionString" \
  --value "Server=tcp:mydb.database.windows.net;Database=mydb;Authentication=Active Directory Managed Identity"
az keyvault secret set --vault-name myapp-kv --name "RedisConnectionString" \
  --value "myredis.redis.cache.windows.net:6380,password=xxx,ssl=True"

# 3. Enable managed identity on the app
az webapp identity assign --name myapp --resource-group myapp-rg
PRINCIPAL_ID=$(az webapp identity show --name myapp --resource-group myapp-rg --query principalId -o tsv)

# 4. Grant access
VAULT_ID=$(az keyvault show --name myapp-kv --query id -o tsv)
az role assignment create --role "Key Vault Secrets User" --assignee "$PRINCIPAL_ID" --scope "$VAULT_ID"

# 5. Configure KV references
az webapp config appsettings set --name myapp --resource-group myapp-rg --settings \
  "ConnectionStrings__Sql=@Microsoft.KeyVault(SecretUri=https://myapp-kv.vault.azure.net/secrets/SqlConnectionString)" \
  "ConnectionStrings__Redis=@Microsoft.KeyVault(SecretUri=https://myapp-kv.vault.azure.net/secrets/RedisConnectionString)"

# 6. Restart to pick up references
az webapp restart --name myapp --resource-group myapp-rg
```

### Pattern 2: Certificate Auto-Renewal with Event Grid

Automatically detect certificates nearing expiry and trigger renewal or notification workflows.

```bash
# 1. Create a certificate with auto-renew policy
az keyvault certificate create --vault-name myapp-kv --name "WildcardCert" \
  --policy '{
    "issuerParameters": { "name": "DigiCertIssuer" },
    "keyProperties": { "exportable": true, "keySize": 2048, "keyType": "RSA" },
    "secretProperties": { "contentType": "application/x-pkcs12" },
    "x509CertificateProperties": {
      "subject": "CN=*.contoso.com",
      "validityInMonths": 12
    },
    "lifetimeActions": [
      { "trigger": { "daysBeforeExpiry": 60 }, "action": { "actionType": "AutoRenew" } },
      { "trigger": { "daysBeforeExpiry": 90 }, "action": { "actionType": "EmailContacts" } }
    ]
  }'

# 2. Subscribe to near-expiry events for alerting
VAULT_ID=$(az keyvault show --name myapp-kv --query id -o tsv)
az eventgrid event-subscription create \
  --name "cert-expiry-alert" \
  --source-resource-id "$VAULT_ID" \
  --endpoint "https://mynotifier.azurewebsites.net/api/CertExpiryAlert" \
  --included-event-types "Microsoft.KeyVault.CertificateNearExpiry"

# 3. After auto-renewal, update App Service binding
# (Automate via Event Grid + Function that calls az webapp config ssl import)
```

### Pattern 3: Key Rotation for Storage Account Encryption

Rotate the customer-managed key (CMK) used to encrypt an Azure Storage account.

```bash
# 1. Create the encryption key
az keyvault key create --vault-name myapp-kv --name "StorageCmk" --kty RSA --size 2048

# 2. Configure automatic rotation
az keyvault key rotation-policy update --vault-name myapp-kv --name "StorageCmk" \
  --value '{
    "lifetimeActions": [
      { "trigger": { "timeAfterCreate": "P180D" }, "action": { "type": "Rotate" } },
      { "trigger": { "timeBeforeExpiry": "P30D" }, "action": { "type": "Notify" } }
    ],
    "attributes": { "expiryTime": "P210D" }
  }'

# 3. Configure Storage to use the KV key (with auto-rotation support)
KEY_URI=$(az keyvault key show --vault-name myapp-kv --name "StorageCmk" --query key.kid -o tsv)
# Strip the version to enable auto-rotation
KEY_URI_VERSIONLESS="${KEY_URI%/*}"

az storage account update --name <storage-account> --resource-group <rg-name> \
  --encryption-key-source Microsoft.Keyvault \
  --encryption-key-vault "https://myapp-kv.vault.azure.net" \
  --encryption-key-name "StorageCmk"

# Storage will automatically use the latest key version when Key Vault rotates
```

### Pattern 4: Multi-Environment Secret Management

Manage secrets across development, staging, and production with separate vaults and consistent naming.

```bash
# 1. Create per-environment vaults
for ENV in dev staging prod; do
  az keyvault create --name "myapp-kv-$ENV" --resource-group "myapp-rg-$ENV" --location eastus \
    --enable-rbac-authorization true --enable-purge-protection true
done

# 2. Use a script to sync secret names (not values) across environments
SECRETS=("DatabasePassword" "ApiKey" "StorageConnectionString" "RedisConnectionString")
for SECRET in "${SECRETS[@]}"; do
  # Check if secret exists in each environment
  for ENV in dev staging prod; do
    az keyvault secret show --vault-name "myapp-kv-$ENV" --name "$SECRET" --query name -o tsv 2>/dev/null || \
      echo "MISSING: $SECRET in myapp-kv-$ENV"
  done
done

# 3. In application code, select vault based on environment
# VAULT_NAME is set per deployment environment
# Node.js:
#   const vaultUrl = `https://${process.env.VAULT_NAME}.vault.azure.net`;
#   const client = new SecretClient(vaultUrl, new DefaultAzureCredential());

# 4. In CI/CD (GitHub Actions example):
# jobs:
#   deploy:
#     env:
#       VAULT_NAME: myapp-kv-${{ github.event.inputs.environment }}
#     steps:
#       - run: |
#           az webapp config appsettings set --name myapp-${{ github.event.inputs.environment }} \
#             --settings "VAULT_NAME=${{ env.VAULT_NAME }}"
```

**Naming conventions**:
| Convention | Example | Benefit |
|-----------|---------|---------|
| `{app}-kv-{env}` | `myapp-kv-prod` | Clear ownership and environment |
| Secret name: `{Service}{Purpose}` | `SqlConnectionString` | Consistent across environments |
| Tags: `environment`, `application`, `owner` | `environment=prod` | Searchable, auditable |

## Progressive Disclosure — Reference Files

| Topic | File |
|---|---|
| Secrets lifecycle, versioning, rotation, App Service references | [`references/secrets-management.md`](./references/secrets-management.md) |
| Cryptographic keys, envelope encryption, signing, auto-rotation | [`references/keys-cryptography.md`](./references/keys-cryptography.md) |
| X.509 certificates, issuance, renewal, CSR workflow | [`references/certificates.md`](./references/certificates.md) |
| RBAC roles, network firewall, private endpoints, Conditional Access | [`references/rbac-network-security.md`](./references/rbac-network-security.md) |
| Diagnostic logs, KQL queries, Event Grid, secret rotation automation | [`references/monitoring-rotation.md`](./references/monitoring-rotation.md) |
