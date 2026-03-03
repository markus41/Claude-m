# Azure Key Vault Secrets — Deep Reference

## Overview

Azure Key Vault Secrets provide secure storage for arbitrary string values such as connection strings, API keys, passwords, and SAS tokens. Secrets are versioned, support soft delete and purge protection, and integrate with managed identity for zero-credential access from Azure workloads.

## REST API Endpoints

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|---|---|---|---|---|
| PUT | `https://{vault}.vault.azure.net/secrets/{name}` | Key Vault Secrets Officer | `?api-version=7.4`, body `{value, attributes, tags}` | Creates or updates; creates new version |
| GET | `https://{vault}.vault.azure.net/secrets/{name}` | Key Vault Secrets User | `?api-version=7.4` | Gets current (latest) version |
| GET | `https://{vault}.vault.azure.net/secrets/{name}/{version}` | Key Vault Secrets User | `?api-version=7.4` | Gets specific version |
| GET | `https://{vault}.vault.azure.net/secrets` | Key Vault Secrets Officer | `?api-version=7.4&maxresults=25` | Lists all secrets (names only, not values) |
| GET | `https://{vault}.vault.azure.net/secrets/{name}/versions` | Key Vault Secrets Officer | `?api-version=7.4` | Lists all versions of a secret |
| PATCH | `https://{vault}.vault.azure.net/secrets/{name}/{version}` | Key Vault Secrets Officer | Body: `{attributes, tags}` | Update metadata; cannot change value |
| DELETE | `https://{vault}.vault.azure.net/secrets/{name}` | Key Vault Secrets Officer | `?api-version=7.4` | Soft-deletes if soft delete enabled |
| GET | `https://{vault}.vault.azure.net/deletedsecrets/{name}` | Key Vault Secrets Officer | `?api-version=7.4` | Get a soft-deleted secret |
| POST | `https://{vault}.vault.azure.net/deletedsecrets/{name}/recover` | Key Vault Secrets Officer | `?api-version=7.4` | Recover a soft-deleted secret |
| DELETE | `https://{vault}.vault.azure.net/deletedsecrets/{name}` | Key Vault Purge | `?api-version=7.4` | Permanently purge (irreversible) |
| POST | `https://{vault}.vault.azure.net/secrets/{name}/backup` | Key Vault Secrets Officer | `?api-version=7.4` | Export encrypted backup blob |
| POST | `https://{vault}.vault.azure.net/secrets/restore` | Key Vault Secrets Officer | Body: `{value: <base64>}` | Restore from backup to same subscription/region |

## TypeScript SDK Patterns (Azure SDK v12)

### Set and get a secret

```typescript
import { SecretClient } from "@azure/keyvault-secrets";
import { DefaultAzureCredential } from "@azure/identity";

const vaultUrl = `https://${process.env.KEY_VAULT_NAME}.vault.azure.net`;
const credential = new DefaultAzureCredential();
const client = new SecretClient(vaultUrl, credential);

// Set a secret (creates new version if already exists)
const setResult = await client.setSecret("db-connection-string", process.env.DB_CONNECTION!, {
  contentType: "text/plain",
  tags: { environment: "production", rotationDue: "2027-01-01" },
  expiresOn: new Date("2027-06-01T00:00:00Z"),
});
console.log("Secret version:", setResult.properties.version);

// Get current version
const getResult = await client.getSecret("db-connection-string");
console.log("Value:", getResult.value);
console.log("Created:", getResult.properties.createdOn);
```

### List and iterate all secrets

```typescript
import { SecretClient } from "@azure/keyvault-secrets";
import { DefaultAzureCredential } from "@azure/identity";

const client = new SecretClient(
  `https://${process.env.KEY_VAULT_NAME}.vault.azure.net`,
  new DefaultAzureCredential()
);

// List all secret names (values are NOT returned in list)
for await (const secret of client.listPropertiesOfSecrets()) {
  console.log(secret.name, secret.enabled, secret.expiresOn);
}

// List all versions of a specific secret
for await (const version of client.listPropertiesOfSecretVersions("db-connection-string")) {
  console.log(version.version, version.enabled, version.createdOn);
}
```

### Disable a secret version (rotation pattern)

```typescript
import { SecretClient } from "@azure/keyvault-secrets";
import { DefaultAzureCredential } from "@azure/identity";

const client = new SecretClient(
  `https://${process.env.KEY_VAULT_NAME}.vault.azure.net`,
  new DefaultAzureCredential()
);

// Get all versions and disable all but the latest
const versions: string[] = [];
for await (const v of client.listPropertiesOfSecretVersions("api-key")) {
  if (v.version) versions.push(v.version);
}

// Sort by createdOn, keep last N versions enabled
const latestVersion = versions.at(-1);
for (const version of versions.slice(0, -1)) {
  await client.updateSecretProperties("api-key", version, { enabled: false });
  console.log(`Disabled version: ${version}`);
}
```

### Recover a soft-deleted secret

```typescript
import { SecretClient } from "@azure/keyvault-secrets";
import { DefaultAzureCredential } from "@azure/identity";

const client = new SecretClient(
  `https://${process.env.KEY_VAULT_NAME}.vault.azure.net`,
  new DefaultAzureCredential()
);

// List deleted secrets
for await (const deleted of client.listDeletedSecrets()) {
  console.log(deleted.name, deleted.properties.deletedOn, deleted.properties.scheduledPurgeDate);
}

// Recover a specific deleted secret (returns polling operation)
const poller = await client.beginRecoverDeletedSecret("db-connection-string");
const recovered = await poller.pollUntilDone();
console.log("Recovered:", recovered.name);
```

## Azure CLI Patterns

```bash
# Create a secret
az keyvault secret set \
  --vault-name mykeyvault \
  --name "db-connection-string" \
  --value "Server=myserver;Database=mydb;..." \
  --content-type "text/plain" \
  --expires "2027-06-01T00:00:00Z" \
  --tags environment=production

# Get secret value
az keyvault secret show \
  --vault-name mykeyvault \
  --name "db-connection-string" \
  --query value \
  --output tsv

# List all secrets
az keyvault secret list \
  --vault-name mykeyvault \
  --output table

# List versions
az keyvault secret list-versions \
  --vault-name mykeyvault \
  --name "db-connection-string" \
  --output table

# Disable a version
az keyvault secret set-attributes \
  --vault-name mykeyvault \
  --name "db-connection-string" \
  --version "<old-version-id>" \
  --enabled false

# Delete (soft delete)
az keyvault secret delete \
  --vault-name mykeyvault \
  --name "db-connection-string"

# Purge permanently
az keyvault secret purge \
  --vault-name mykeyvault \
  --name "db-connection-string"

# Recover deleted secret
az keyvault secret recover \
  --vault-name mykeyvault \
  --name "db-connection-string"

# Backup and restore
az keyvault secret backup \
  --vault-name mykeyvault \
  --name "db-connection-string" \
  --file secret-backup.blob

az keyvault secret restore \
  --vault-name mykeyvault \
  --file secret-backup.blob
```

## PowerShell Patterns

```powershell
# Authenticate
Connect-AzAccount

# Set a secret
$secretValue = ConvertTo-SecureString "my-secret-value" -AsPlainText -Force
Set-AzKeyVaultSecret `
  -VaultName "mykeyvault" `
  -Name "db-connection-string" `
  -SecretValue $secretValue `
  -ContentType "text/plain" `
  -Expires (Get-Date "2027-06-01") `
  -Tag @{ environment = "production" }

# Get secret
$secret = Get-AzKeyVaultSecret -VaultName "mykeyvault" -Name "db-connection-string"
$plainText = ConvertFrom-SecureString $secret.SecretValue -AsPlainText
Write-Host "Value: $plainText"

# List all secrets
Get-AzKeyVaultSecret -VaultName "mykeyvault" | Format-Table Name, Enabled, Expires

# Rotate: set new version and disable old versions
$newValue = ConvertTo-SecureString "new-secret-value" -AsPlainText -Force
Set-AzKeyVaultSecret -VaultName "mykeyvault" -Name "api-key" -SecretValue $newValue

# Disable all previous versions
Get-AzKeyVaultSecret -VaultName "mykeyvault" -Name "api-key" -IncludeVersions |
  Where-Object { -not $_.IsCurrent } |
  ForEach-Object {
    Update-AzKeyVaultSecret -VaultName "mykeyvault" -Name "api-key" `
      -Version $_.Version -Enable $false
  }
```

## App Service Key Vault References

App Service can reference Key Vault secrets directly in application settings, avoiding any code changes:

```
# Format for app setting value:
@Microsoft.KeyVault(SecretUri=https://myvault.vault.azure.net/secrets/mySecret/version)

# Or using latest version (recommended with rotation):
@Microsoft.KeyVault(VaultName=myvault;SecretName=mySecret)
```

Requirements:
1. App Service must have a system-assigned or user-assigned managed identity
2. Identity must have Key Vault Secrets User role on the vault or secret
3. Vault must allow network access from the App Service (or use private endpoint)

## Error Codes

| Code | Meaning | Remediation |
|---|---|---|
| Forbidden (403) | Caller lacks RBAC role or vault policy | Assign Key Vault Secrets User (read) or Secrets Officer (write) |
| SecretNotFound (404) | Secret name does not exist | Check name spelling; check if soft-deleted with `listDeletedSecrets` |
| SecretDisabled (403) | Secret version is disabled | Re-enable the version or create a new version |
| SecretExpired (403) | Secret has passed its `expiresOn` date | Update expiry with `updateSecretProperties` or set new version |
| Conflict (409) | Vault in deleted state being re-created | Recover or purge the deleted vault first |
| Throttled (429) | Rate limit exceeded | Wait per `Retry-After` header; implement exponential backoff |
| BadRequest (400) | Invalid secret name (must match `^[0-9a-zA-Z-]+$`) | Use only alphanumeric and hyphen characters in secret names |
| PurgeProtectionEnabled (409) | Cannot purge while purge protection is on | Wait for retention period (7–90 days); contact support |

## Throttling Limits

| Resource | Limit | Retry Strategy |
|---|---|---|
| Secret GET operations | 4,000/10 seconds per vault | Cache secrets locally with short TTL (e.g., 5 minutes) |
| Secret SET operations | 600/10 seconds per vault | Batch rotation; avoid mass writes in parallel |
| Vault-level transaction limit | 2,000 operations/second (aggregate) | Distribute across multiple vaults for high-throughput workloads |
| Soft delete retention | 7–90 days (configurable) | Default is 90 days; reduce for dev environments |
| Max secret value size | 25 KB | Store large objects in Blob Storage; store the blob URL in KV |
| Max secret name length | 127 characters | Keep names descriptive but concise |

## Production Gotchas

- **Never log secret values**: Ensure logging frameworks (e.g., Application Insights) are configured to redact secrets. Use structured logging and avoid interpolating `getSecret().value` into log strings.
- **Cache secrets with TTL**: Calling Key Vault for every request adds latency and can hit throttle limits. Use an in-memory cache with a 5-minute TTL and refresh on expiry or 404.
- **Versioning is immutable**: You cannot modify a secret's value in-place. Each `setSecret` call creates a new version. Old versions remain accessible unless explicitly disabled.
- **Soft delete is now permanent**: Soft delete cannot be disabled on vaults. Plan for the retention period (default 90 days) when cleaning up test vaults.
- **App Service KV references do not auto-refresh**: The app must be restarted or the reference must use the versionless URI format for the latest secret to be picked up after rotation.
- **Managed identity is preferred over service principal**: Use system-assigned managed identity for simple services, user-assigned for sharing identities across services. Avoid storing client secrets in config files.
- **Access policies vs RBAC**: Azure RBAC is the recommended model. Legacy vault access policies do not support deny assignments or Conditional Access. Migrate existing vaults to RBAC.
- **Purge protection for HSM-backed keys**: Enabling purge protection is recommended for production; once enabled, it cannot be disabled. This prevents accidental permanent deletion of critical secrets.
