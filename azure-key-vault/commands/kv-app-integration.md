---
name: kv-app-integration
description: "Configure App Service, Functions, or Container Apps to use Key Vault secrets via managed identity"
argument-hint: "<app-service|functions|container-apps> --vault <vault-name> --app <app-name>"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Integrate App with Key Vault

Configure an Azure application to securely access Key Vault secrets using managed identity and Key Vault references.

## Instructions

### 1. Validate Inputs

- `<platform>` -- One of: `app-service`, `functions`, `container-apps`. Ask if not provided.
- `--vault` -- Key Vault name. Ask if not provided.
- `--app` -- Application name. Ask if not provided.

### 2. Enable Managed Identity

**App Service / Functions**:
```bash
# Enable system-assigned managed identity
az webapp identity assign --name <app-name> --resource-group <rg-name>
# or for Functions:
az functionapp identity assign --name <app-name> --resource-group <rg-name>

# Get the principal ID
PRINCIPAL_ID=$(az webapp identity show --name <app-name> --resource-group <rg-name> --query principalId -o tsv)
```

**Container Apps**:
```bash
az containerapp identity assign --name <app-name> --resource-group <rg-name> --system-assigned

PRINCIPAL_ID=$(az containerapp identity show --name <app-name> --resource-group <rg-name> --query principalId -o tsv)
```

### 3. Grant Key Vault Access

```bash
VAULT_ID=$(az keyvault show --name <vault-name> --query id -o tsv)

# Grant Secrets User role (read-only access to secret values)
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee "$PRINCIPAL_ID" \
  --scope "$VAULT_ID"
```

For certificate access, also assign:
```bash
az role assignment create \
  --role "Key Vault Certificate User" \
  --assignee "$PRINCIPAL_ID" \
  --scope "$VAULT_ID"
```

### 4. Configure Key Vault References (App Service / Functions)

Use Key Vault references in app settings to avoid storing secrets in configuration:

```bash
# Get the secret URI
SECRET_URI=$(az keyvault secret show --vault-name <vault-name> --name <secret-name> --query id -o tsv)

# Set the app setting with a Key Vault reference
az webapp config appsettings set \
  --name <app-name> \
  --resource-group <rg-name> \
  --settings "<SETTING_NAME>=@Microsoft.KeyVault(SecretUri=$SECRET_URI)"
```

**Reference formats**:
```
# Full URI with version (pinned to specific version)
@Microsoft.KeyVault(SecretUri=https://<vault>.vault.azure.net/secrets/<name>/<version>)

# URI without version (always gets latest)
@Microsoft.KeyVault(SecretUri=https://<vault>.vault.azure.net/secrets/<name>)

# Alternative format with vault name
@Microsoft.KeyVault(VaultName=<vault>;SecretName=<name>;SecretVersion=<version>)
```

Recommend using the URI without version so the app automatically picks up rotated secrets on restart.

### 5. Configure Container Apps Secrets

Container Apps use a different mechanism -- secrets are pulled at revision creation:

```bash
# Add a secret from Key Vault
az containerapp secret set \
  --name <app-name> \
  --resource-group <rg-name> \
  --secrets "<secret-name>=keyvaultref:<vault-name>.vault.azure.net/secrets/<secret-name>,identityref:system"

# Reference the secret in environment variables
az containerapp update \
  --name <app-name> \
  --resource-group <rg-name> \
  --set-env-vars "<ENV_VAR>=secretref:<secret-name>"
```

### 6. Configure Application Code (SDK approach)

For applications that access Key Vault directly from code:

**Node.js / TypeScript**:
```typescript
import { SecretClient } from "@azure/keyvault-secrets";
import { DefaultAzureCredential } from "@azure/identity";

const vaultUrl = `https://<vault-name>.vault.azure.net`;
const client = new SecretClient(vaultUrl, new DefaultAzureCredential());

// Read a secret
const secret = await client.getSecret("<secret-name>");
console.log(secret.value);
```

**.NET / C#**:
```csharp
using Azure.Identity;
using Azure.Security.KeyVault.Secrets;

var client = new SecretClient(
    new Uri("https://<vault-name>.vault.azure.net"),
    new DefaultAzureCredential());

KeyVaultSecret secret = await client.GetSecretAsync("<secret-name>");
string value = secret.Value;
```

**.NET Configuration Provider** (recommended for ASP.NET):
```csharp
// In Program.cs
builder.Configuration.AddAzureKeyVault(
    new Uri("https://<vault-name>.vault.azure.net"),
    new DefaultAzureCredential());

// Then access secrets like any configuration value
var connectionString = builder.Configuration["DatabaseConnectionString"];
```

**Spring Boot (Java)**:
```yaml
# application.yml
spring:
  cloud:
    azure:
      keyvault:
        secret:
          property-sources:
            - name: <vault-name>
              endpoint: https://<vault-name>.vault.azure.net
```

### 7. Verify Integration

```bash
# Check Key Vault reference status (App Service)
az webapp config appsettings list \
  --name <app-name> \
  --resource-group <rg-name> \
  --query "[?contains(value, 'Microsoft.KeyVault')].{name:name, status:value}" \
  -o table

# Test from the app's Kudu console
az webapp ssh --name <app-name> --resource-group <rg-name>
# Then: echo $<SETTING_NAME>
```

Common issues:
- **403 Forbidden**: Managed identity does not have the correct RBAC role on the vault.
- **SecretNotFound**: Secret name in the reference does not match a secret in the vault.
- **VaultNotFound**: Vault name is incorrect or the app cannot reach the vault (network rules).
- **Restart required**: After adding KV references, restart the app for settings to take effect.

### 8. Display Summary

Show the user:
- Platform configured and managed identity principal ID
- Key Vault references or secrets configured
- How to verify the integration
- Reminder to restart the app after configuration changes
