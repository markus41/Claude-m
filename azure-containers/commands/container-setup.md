---
name: container-setup
description: Set up the Azure Containers plugin — install Docker, Azure CLI, create ACR and Container Apps environment
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

# Azure Containers Setup

Guide the user through setting up an Azure container development environment.

## Step 1: Check Prerequisites

Verify the following are installed:

- **Docker**: Required for building container images locally.
- **Azure CLI**: Required for managing Azure resources.

```bash
docker --version    # Must be >= 20.10
az --version        # Must be >= 2.50
```

## Step 2: Install Docker (if missing)

**Windows**:
```bash
winget install Docker.DockerDesktop
```

**macOS**:
```bash
brew install --cask docker
```

**Linux (Ubuntu/Debian)**:
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

Verify Docker is running:
```bash
docker info
```

## Step 3: Install Azure CLI Extensions

```bash
az extension add --name containerapp --upgrade
az extension add --name acr --upgrade
az provider register --namespace Microsoft.App
az provider register --namespace Microsoft.OperationalInsights
```

## Step 4: Authenticate with Azure

```bash
az login
az account show
```

Ask the user which subscription to use if multiple are available:
```bash
az account list --output table
az account set --subscription "<subscription-id>"
```

## Step 5: Create a Resource Group

Ask the user for a resource group name and location:

```bash
az group create --name <rg-name> --location <location>
```

Common locations: `eastus`, `westeurope`, `westus2`, `northeurope`.

## Step 6: Create Azure Container Registry

```bash
az acr create \
  --resource-group <rg-name> \
  --name <acr-name> \
  --sku Basic \
  --admin-enabled false
```

SKU options:
| SKU | Storage | Throughput | Geo-replication | Private endpoints |
|-----|---------|-----------|-----------------|-------------------|
| Basic | 10 GB | Standard | No | No |
| Standard | 100 GB | Higher | No | No |
| Premium | 500 GB | Highest | Yes | Yes |

Enable managed identity pull (recommended over admin credentials):
```bash
az acr update --name <acr-name> --anonymous-pull-enabled false
```

## Step 7: Create Container Apps Environment

```bash
az containerapp env create \
  --name <env-name> \
  --resource-group <rg-name> \
  --location <location>
```

This creates a Log Analytics workspace automatically. For custom VNet integration:
```bash
az containerapp env create \
  --name <env-name> \
  --resource-group <rg-name> \
  --location <location> \
  --infrastructure-subnet-resource-id <subnet-id>
```

## Step 8: Configure Environment Variables

Create a `.env` file in the project root:

```
AZURE_SUBSCRIPTION_ID=<subscription-id>
AZURE_RESOURCE_GROUP=<rg-name>
ACR_NAME=<acr-name>
ACR_LOGIN_SERVER=<acr-name>.azurecr.io
CONTAINER_APP_ENV=<env-name>
LOCATION=<location>
```

Ensure `.env` is in `.gitignore`:
```bash
echo ".env" >> .gitignore
```

## Step 9: Verify Access

Test ACR access:
```bash
az acr login --name <acr-name>
docker pull mcr.microsoft.com/hello-world
docker tag mcr.microsoft.com/hello-world <acr-name>.azurecr.io/hello-world:test
docker push <acr-name>.azurecr.io/hello-world:test
az acr repository list --name <acr-name> --output table
```

Test Container Apps access:
```bash
az containerapp env show --name <env-name> --resource-group <rg-name>
```

List all Container Apps environments:
```bash
az containerapp env list --resource-group <rg-name> --output table
```

## Step 10: Delete Environment (Cleanup)

```bash
# Delete a Container Apps environment (destroys all apps within it)
az containerapp env delete --name <env-name> --resource-group <rg-name> --yes
```

If `--minimal` is passed, stop after Step 3 (dependencies only).
