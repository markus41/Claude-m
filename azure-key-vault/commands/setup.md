---
name: setup
description: Set up the Azure Key Vault plugin -- install Azure CLI, create a Key Vault, configure RBAC access
argument-hint: "[--minimal]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Azure Key Vault Setup

Guide the user through setting up an Azure Key Vault environment.

## Step 1: Check Prerequisites

Verify the following are installed:

- **Azure CLI 2.50+**: Required for Key Vault management.
- **Node.js 18+**: Required if using the Azure SDK for JavaScript.

```bash
az version        # Must be >= 2.50.0
node --version    # Must be >= 18.0.0 (if using JS SDK)
```

## Step 2: Authenticate to Azure

```bash
az login
az account show   # Verify correct subscription
```

If the user has multiple subscriptions, help them select the correct one:
```bash
az account list --output table
az account set --subscription <subscription-id>
```

## Step 3: Create a Resource Group (if needed)

```bash
az group create --name <rg-name> --location <location>
```

Common locations: `eastus`, `westus2`, `westeurope`, `northeurope`.

## Step 4: Create the Key Vault

```bash
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

Ask the user for:
- **Vault name** -- globally unique, 3-24 characters, alphanumeric and hyphens only.
- **SKU** -- `standard` (software-protected keys) or `premium` (HSM-backed keys). Default: `standard`.
- **Purge protection** -- recommended `true` for production. Warn that once enabled it cannot be disabled.

## Step 5: Assign RBAC Roles

Grant the current user administrative access:

```bash
# Get current user object ID
CURRENT_USER=$(az ad signed-in-user show --query id -o tsv)

# Assign Key Vault Administrator role
az role assignment create \
  --role "Key Vault Administrator" \
  --assignee "$CURRENT_USER" \
  --scope "/subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.KeyVault/vaults/<vault-name>"
```

For application access, assign narrower roles:
- `Key Vault Secrets User` -- read secrets only
- `Key Vault Secrets Officer` -- read/write secrets
- `Key Vault Certificates Officer` -- manage certificates
- `Key Vault Crypto Officer` -- manage keys and cryptographic operations

## Step 6: Configure Network Rules (Optional)

For production environments, restrict network access:

```bash
# Deny all public access by default
az keyvault update --name <vault-name> --default-action Deny

# Allow specific IP ranges
az keyvault network-rule add --name <vault-name> --ip-address <cidr-range>

# Allow specific VNets
az keyvault network-rule add --name <vault-name> --vnet-name <vnet> --subnet <subnet>
```

## Step 7: Install SDK Dependencies (Optional)

For JavaScript/TypeScript development:

```bash
npm install @azure/keyvault-secrets @azure/keyvault-keys @azure/keyvault-certificates @azure/identity
```

For .NET development:

```bash
dotnet add package Azure.Security.KeyVault.Secrets
dotnet add package Azure.Security.KeyVault.Keys
dotnet add package Azure.Security.KeyVault.Certificates
dotnet add package Azure.Identity
```

## Step 8: Verify Access

Test reading from the vault:

```bash
# Set a test secret
az keyvault secret set --vault-name <vault-name> --name "test-secret" --value "hello-world"

# Read it back
az keyvault secret show --vault-name <vault-name> --name "test-secret" --query value -o tsv

# Clean up
az keyvault secret delete --vault-name <vault-name> --name "test-secret"
```

If `--minimal` is passed, stop after Step 3 (prerequisites and authentication only).
