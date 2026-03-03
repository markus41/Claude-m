# Azure Key Vault Keys and Cryptography — Deep Reference

## Overview

Azure Key Vault Keys provide secure storage and use of RSA and EC cryptographic keys. Keys can be software-protected (standard tier) or HSM-protected (Premium tier or Managed HSM). Operations are performed server-side in Key Vault — private key material never leaves the HSM boundary, enabling envelope encryption, signing, and wrapping patterns.

## REST API Endpoints

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|---|---|---|---|---|
| POST | `https://{vault}.vault.azure.net/keys/{name}/create` | Key Vault Crypto Officer | `kty`, `key_size` or `crv`, `key_ops`, `attributes` | Creates key in vault |
| GET | `https://{vault}.vault.azure.net/keys/{name}` | Key Vault Crypto Officer | `?api-version=7.4` | Gets latest key version public metadata |
| GET | `https://{vault}.vault.azure.net/keys/{name}/{version}` | Key Vault Crypto Officer | `?api-version=7.4` | Gets specific version |
| GET | `https://{vault}.vault.azure.net/keys` | Key Vault Crypto Officer | `maxresults` | Lists key names |
| GET | `https://{vault}.vault.azure.net/keys/{name}/versions` | Key Vault Crypto Officer | — | Lists all versions |
| PATCH | `https://{vault}.vault.azure.net/keys/{name}/{version}` | Key Vault Crypto Officer | `attributes`, `tags` | Update key metadata |
| POST | `https://{vault}.vault.azure.net/keys/{name}/rotate` | Key Vault Crypto Officer | — | Triggers key rotation (requires policy) |
| POST | `https://{vault}.vault.azure.net/keys/{name}/rotationpolicy` | Key Vault Crypto Officer | Rotation policy JSON | Sets auto-rotation policy |
| POST | `https://{vault}.vault.azure.net/keys/{name}/{version}/encrypt` | Key Vault Crypto User | `alg`, `value` (base64) | Encrypts data with key |
| POST | `https://{vault}.vault.azure.net/keys/{name}/{version}/decrypt` | Key Vault Crypto User | `alg`, `value` (base64) | Decrypts data |
| POST | `https://{vault}.vault.azure.net/keys/{name}/{version}/sign` | Key Vault Crypto User | `alg`, `value` (base64 digest) | Signs a digest |
| POST | `https://{vault}.vault.azure.net/keys/{name}/{version}/verify` | Key Vault Crypto User | `alg`, `digest`, `signature` | Verifies a signature |
| POST | `https://{vault}.vault.azure.net/keys/{name}/{version}/wrapkey` | Key Vault Crypto User | `alg`, `value` (base64 key) | Wraps a symmetric key |
| POST | `https://{vault}.vault.azure.net/keys/{name}/{version}/unwrapkey` | Key Vault Crypto User | `alg`, `value` (base64 wrapped) | Unwraps a symmetric key |
| DELETE | `https://{vault}.vault.azure.net/keys/{name}` | Key Vault Crypto Officer | — | Soft-deletes key |
| POST | `https://{vault}.vault.azure.net/keys/{name}/import` | Key Vault Crypto Officer | `key`, `hsm`, `attributes` | Import existing key material |

## Key Types and Algorithms

| Key Type | Key Size / Curve | Supported Operations | Notes |
|---|---|---|---|
| RSA | 2048, 3072, 4096 bits | encrypt, decrypt, wrapKey, unwrapKey, sign, verify | Software-protected by default |
| RSA-HSM | 2048, 3072, 4096 bits | Same as RSA | Premium vault or Managed HSM required |
| EC | P-256, P-384, P-521 | sign, verify | Elliptic curve; no encrypt/decrypt |
| EC-HSM | P-256, P-384, P-521, P-256K | sign, verify | HSM-protected EC key |
| oct | 128, 192, 256 bits | encrypt, decrypt, wrapKey, unwrapKey | Symmetric; Managed HSM only |

### Encryption Algorithm Reference

| Algorithm | Key Type | Notes |
|---|---|---|
| `RSA-OAEP` | RSA | OAEP with SHA-1 (legacy compatibility) |
| `RSA-OAEP-256` | RSA | OAEP with SHA-256 (recommended) |
| `RSA1_5` | RSA | PKCS#1 v1.5 (avoid for new implementations) |
| `ES256` | EC P-256 | ECDSA with SHA-256 |
| `ES384` | EC P-384 | ECDSA with SHA-384 |
| `ES512` | EC P-521 | ECDSA with SHA-512 |
| `PS256` | RSA | RSASSA-PSS with SHA-256 (preferred for signing) |
| `PS384` | RSA | RSASSA-PSS with SHA-384 |
| `A128KW` | oct | AES key wrap, 128-bit |
| `A256KW` | oct | AES key wrap, 256-bit |

## TypeScript SDK Patterns (Azure SDK v12)

### Create a key and encrypt/decrypt

```typescript
import { KeyClient, CryptographyClient } from "@azure/keyvault-keys";
import { DefaultAzureCredential } from "@azure/identity";

const vaultUrl = `https://${process.env.KEY_VAULT_NAME}.vault.azure.net`;
const credential = new DefaultAzureCredential();

// Create key client
const keyClient = new KeyClient(vaultUrl, credential);

// Create an RSA-HSM key (requires Premium tier)
const key = await keyClient.createRsaKey("data-encryption-key", {
  keySize: 4096,
  keyOperations: ["encrypt", "decrypt", "wrapKey", "unwrapKey"],
  hsm: true, // HSM-protected
  tags: { environment: "production", dataClass: "pii" },
});
console.log("Key ID:", key.id);

// Cryptography client uses the specific key version
const cryptoClient = new CryptographyClient(key.id!, credential);

// Encrypt data
const plaintext = Buffer.from("Sensitive PII data");
const encryptResult = await cryptoClient.encrypt({
  algorithm: "RSA-OAEP-256",
  plaintext,
});
console.log("Ciphertext (base64):", encryptResult.result.toString("base64"));

// Decrypt
const decryptResult = await cryptoClient.decrypt({
  algorithm: "RSA-OAEP-256",
  ciphertext: encryptResult.result,
});
console.log("Decrypted:", decryptResult.result.toString("utf-8"));
```

### Envelope encryption pattern (best practice for large data)

```typescript
import { KeyClient, CryptographyClient } from "@azure/keyvault-keys";
import { DefaultAzureCredential } from "@azure/identity";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const vaultUrl = `https://${process.env.KEY_VAULT_NAME}.vault.azure.net`;
const credential = new DefaultAzureCredential();
const keyClient = new KeyClient(vaultUrl, credential);

// Get the KEK (Key Encryption Key) from Key Vault
const kek = await keyClient.getKey("master-key-encryption-key");
const cryptoClient = new CryptographyClient(kek.id!, credential);

// Generate a random DEK (Data Encryption Key) locally
const dek = randomBytes(32); // 256-bit AES key
const iv = randomBytes(16);

// Encrypt data locally with AES-256-GCM using the DEK
const largePayload = Buffer.from("... large sensitive document ...");
const cipher = createCipheriv("aes-256-gcm", dek, iv);
const encryptedData = Buffer.concat([cipher.update(largePayload), cipher.final()]);
const authTag = cipher.getAuthTag();

// Wrap the DEK with Key Vault
const wrapResult = await cryptoClient.wrapKey("A256KW", dek);
const wrappedDek = wrapResult.result;

// Store: { wrappedDek, iv, authTag, encryptedData }
// Only wrappedDek + metadata are stored; DEK is not persisted in plain text

// --- Decryption path ---
// Unwrap DEK from Key Vault
const unwrapResult = await cryptoClient.unwrapKey("A256KW", wrappedDek);
const recoveredDek = unwrapResult.result;

// Decrypt data locally
const decipher = createDecipheriv("aes-256-gcm", recoveredDek, iv);
decipher.setAuthTag(authTag);
const decryptedData = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
console.log(decryptedData.toString("utf-8"));
```

### Sign and verify

```typescript
import { KeyClient, CryptographyClient } from "@azure/keyvault-keys";
import { DefaultAzureCredential } from "@azure/identity";
import { createHash } from "crypto";

const vaultUrl = `https://${process.env.KEY_VAULT_NAME}.vault.azure.net`;
const credential = new DefaultAzureCredential();
const keyClient = new KeyClient(vaultUrl, credential);

// Create an EC key for signing
const signingKey = await keyClient.createEcKey("document-signing-key", {
  curve: "P-256",
  keyOperations: ["sign", "verify"],
});

const cryptoClient = new CryptographyClient(signingKey.id!, credential);

// Sign a document (Key Vault requires the digest, not the raw data)
const document = Buffer.from("Contract document content");
const digest = createHash("sha256").update(document).digest();

const signResult = await cryptoClient.sign("ES256", digest);
console.log("Signature:", signResult.result.toString("base64"));

// Verify signature
const verifyResult = await cryptoClient.verify("ES256", digest, signResult.result);
console.log("Signature valid:", verifyResult.result); // true
```

### Set auto-rotation policy

```typescript
import { KeyClient } from "@azure/keyvault-keys";
import { DefaultAzureCredential } from "@azure/identity";

const keyClient = new KeyClient(
  `https://${process.env.KEY_VAULT_NAME}.vault.azure.net`,
  new DefaultAzureCredential()
);

// Rotate every 90 days, notify 30 days before expiry
await keyClient.updateKeyRotationPolicy("data-encryption-key", {
  lifetimeActions: [
    {
      action: "Rotate",
      timeAfterCreate: "P90D", // ISO 8601 duration: 90 days
    },
    {
      action: "Notify",
      timeBeforeExpiry: "P30D", // Notify 30 days before expiry
    },
  ],
  expiresIn: "P180D", // Key version expires 180 days after creation
});

// Manually trigger rotation
await keyClient.rotateKey("data-encryption-key");
```

## Azure CLI Patterns

```bash
# Create RSA key (software-protected)
az keyvault key create \
  --vault-name mykeyvault \
  --name "data-encryption-key" \
  --kty RSA \
  --size 4096 \
  --ops encrypt decrypt wrapKey unwrapKey

# Create HSM-protected key
az keyvault key create \
  --vault-name mykeyvault \
  --name "hsm-key" \
  --kty RSA-HSM \
  --size 4096

# List keys
az keyvault key list \
  --vault-name mykeyvault \
  --output table

# Get key versions
az keyvault key list-versions \
  --vault-name mykeyvault \
  --name "data-encryption-key"

# Rotate key manually
az keyvault key rotate \
  --vault-name mykeyvault \
  --name "data-encryption-key"

# Set rotation policy
az keyvault key rotation-policy update \
  --vault-name mykeyvault \
  --name "data-encryption-key" \
  --value '{"lifetimeActions":[{"action":{"type":"Rotate"},"trigger":{"timeAfterCreate":"P90D"}}],"attributes":{"expiryTime":"P180D"}}'

# Encrypt/decrypt (base64-encoded input)
az keyvault key encrypt \
  --vault-name mykeyvault \
  --name "data-encryption-key" \
  --algorithm RSA-OAEP-256 \
  --value "$(echo -n 'sensitive data' | base64)"

# Disable a key version
az keyvault key set-attributes \
  --vault-name mykeyvault \
  --name "data-encryption-key" \
  --version "<version-id>" \
  --enabled false
```

## Error Codes

| Code | Meaning | Remediation |
|---|---|---|
| Forbidden (403) | Missing Key Vault Crypto User or Crypto Officer role | Assign correct RBAC role; Crypto User for operations, Crypto Officer for management |
| KeyNotFound (404) | Key name does not exist | Check key name; verify soft-delete state |
| KeyDisabled (403) | Key version is disabled | Enable the version or create a new key version |
| InvalidKeyUsage (400) | Algorithm not permitted for key's `key_ops` | Ensure key was created with the required operations |
| KeyOperationNotPermitted (403) | Key operation blocked by key policy | Check key rotation policy or activation date |
| WrapKeyFailed (500) | Internal HSM error during wrap | Retry with exponential backoff; check HSM health |
| Throttled (429) | Rate limit exceeded | Implement caching; cache cryptographic results where appropriate |
| BadParameter (400) | Invalid algorithm string | Use exact algorithm identifiers from the supported list above |

## Throttling Limits

| Resource | Limit | Retry Strategy |
|---|---|---|
| Cryptographic operations (RSA) | 1,500/10 seconds per vault | Cache encryption results; avoid per-request KV calls |
| Cryptographic operations (EC) | 1,000/10 seconds per vault | Use local signing with cached key material for verification |
| Key management operations | 200/10 seconds per vault | Batch key rotation; reduce parallel management calls |
| Key import operations | 10/10 seconds per vault | Sequential import; retry with exponential backoff |
| Managed HSM operations | Higher limits (provisioned) | Dedicated HSM pool; use for high-throughput scenarios |

## Production Gotchas

- **Key material never leaves the HSM**: Key Vault performs cryptographic operations server-side. You never receive the raw private key bytes. For envelope encryption, use `wrapKey`/`unwrapKey` to protect locally-generated DEKs.
- **Use envelope encryption for large payloads**: Key Vault encrypt/decrypt has a payload size limit (RSA: ~500 bytes). For data larger than this, encrypt with a local AES key and use Key Vault to wrap/unwrap the AES key.
- **Cache CryptographyClient**: Each `CryptographyClient` instance fetches key metadata on first use. Reuse instances rather than creating new ones per request.
- **Key version pinning**: When using a specific key version ID in your application, you must update the reference when you rotate the key. Use the versionless key ID with envelope encryption so rotation is transparent.
- **HSM-backed keys require Premium vault**: `RSA-HSM` and `EC-HSM` keys require a Premium SKU vault or Managed HSM cluster. Attempting to create HSM keys on a Standard vault returns `BadParameter`.
- **Algorithm selection**: Avoid `RSA1_5` (PKCS#1 v1.5) for new implementations due to padding oracle vulnerabilities. Use `RSA-OAEP-256` for encryption and `PS256`/`PS384` for signing.
- **Key rotation and re-encryption**: Auto-rotation creates a new key version but does NOT re-encrypt existing data. Implement a re-encryption job that reads data encrypted with the old version, decrypts with old key, re-encrypts with new key version, and updates the stored `keyId` reference.
- **Managed identity scope**: If multiple microservices share the same managed identity, they all share the same Key Vault access. Use separate managed identities per service with least-privilege key operation permissions.
