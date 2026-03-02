---
name: setup
description: Set up Azure Networking plugin — install Azure CLI, verify networking providers, check subscription quotas
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

# Azure Networking Setup

Guide the user through setting up their Azure environment for networking operations.

## Step 1: Check Prerequisites

Verify the following are installed:

- **Azure CLI 2.50+**: Required for all networking commands.

```bash
az --version   # Must be >= 2.50.0
```

## Step 2: Install or Update Azure CLI

If not installed:

**Windows**:
```bash
winget install -e --id Microsoft.AzureCLI
```

**macOS**:
```bash
brew install azure-cli
```

**Linux**:
```bash
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

## Step 3: Authenticate

```bash
az login
az account show --query "{name:name, id:id, tenantId:tenantId}" -o table
```

If the user has multiple subscriptions, ask which one to use:
```bash
az account list --query "[].{Name:name, Id:id, IsDefault:isDefault}" -o table
az account set --subscription <subscription-id>
```

## Step 4: Verify Networking Resource Providers

Ensure the required resource providers are registered:

```bash
az provider show -n Microsoft.Network --query "registrationState" -o tsv
az provider show -n Microsoft.Compute --query "registrationState" -o tsv
```

If not registered:
```bash
az provider register -n Microsoft.Network
az provider register -n Microsoft.Compute
```

## Step 5: Check Subscription Quotas

Verify the subscription has sufficient quotas for networking resources:

```bash
az network list-usages --location <region> -o table
```

Key quotas to check:
- Virtual Networks (default: 1000)
- Network Security Groups (default: 5000)
- Public IP Addresses (default: 1000)
- Load Balancers (default: 1000)
- VPN Gateways (default: 1 per VNet)
- Private Endpoints (default: 1000)

## Step 6: Install Bicep CLI (Optional)

For infrastructure-as-code deployments:

```bash
az bicep install
az bicep version
```

## Step 7: Verify Access

Test network read access:

```bash
az network vnet list -o table
az network nsg list -o table
```

If either command fails with an authorization error, the user needs at least **Network Contributor** role on the target resource group or subscription.

If `--minimal` is passed, stop after Step 4 (CLI + providers only).
