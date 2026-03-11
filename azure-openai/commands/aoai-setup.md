---
name: aoai-setup
description: Set up Azure OpenAI — install Azure CLI, create cognitive account, configure defaults, verify API access
argument-hint: "[--minimal] [--resource-name <name>] [--location <region>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Azure OpenAI Setup

Guide the user through setting up an Azure OpenAI resource and verifying API access.

## Step 1: Check Prerequisites

Verify Azure CLI is installed and the user is logged in:

```bash
az --version   # Must be >= 2.50.0
az account show --query "{Name:name, SubscriptionId:id, TenantId:tenantId}" --output table
```

If not logged in:
```bash
az login
az account set --subscription <subscription-id>
```

## Step 2: Register the Cognitive Services Provider

Ensure the Microsoft.CognitiveServices resource provider is registered:

```bash
az provider register --namespace Microsoft.CognitiveServices
az provider show --namespace Microsoft.CognitiveServices --query "registrationState" -o tsv
# Should output "Registered"
```

## Step 3: Create a Resource Group (if needed)

```bash
az group create --name <rg-name> --location <region>
```

Recommended regions with broad model support: `eastus`, `eastus2`, `westus`, `westus3`, `swedencentral`, `uksouth`.

## Step 4: Create the Azure OpenAI Resource

```bash
az cognitiveservices account create \
  --name <resource-name> \
  --resource-group <rg-name> \
  --kind OpenAI \
  --sku S0 \
  --location <region> \
  --custom-domain <resource-name>
```

**Important**: The `--custom-domain` value is permanent and required for Azure AD authentication. Choose a meaningful, stable name.

Verify the resource:
```bash
az cognitiveservices account show \
  --name <resource-name> \
  --resource-group <rg-name> \
  --query "{Name:name, Endpoint:properties.endpoint, State:properties.provisioningState}"
```

## Step 5: Retrieve API Keys

```bash
az cognitiveservices account keys list \
  --name <resource-name> \
  --resource-group <rg-name>
```

Store the key securely. For production, use managed identity instead of API keys.

## Step 6: Set Environment Variables

```bash
# Set for current session
export AZURE_OPENAI_ENDPOINT="https://<resource-name>.openai.azure.com/"
export AZURE_OPENAI_KEY="<your-api-key>"
export AZURE_OPENAI_API_VERSION="2024-08-01-preview"
```

For persistent configuration, add to your shell profile (`~/.bashrc`, `~/.zshrc`, or use `.env` file).

## Step 7: Verify API Access

Test connectivity with a simple model list call:

```bash
curl -s "https://<resource-name>.openai.azure.com/openai/models?api-version=2024-08-01-preview" \
  -H "api-key: ${AZURE_OPENAI_KEY}" | jq '.data | length'
```

If no models are listed, you need to create a deployment first (use `/aoai-deploy`).

## Step 8: Deploy a Default Model (Optional)

Create a basic GPT-4o deployment for testing:

```bash
az cognitiveservices account deployment create \
  --name <resource-name> \
  --resource-group <rg-name> \
  --deployment-name gpt4o \
  --model-name gpt-4o \
  --model-version "2024-08-06" \
  --model-format OpenAI \
  --sku-name Standard \
  --sku-capacity 10
```

Test the deployment:
```bash
curl -X POST "https://<resource-name>.openai.azure.com/openai/deployments/gpt4o/chat/completions?api-version=2024-08-01-preview" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hello, Azure OpenAI!"}], "max_tokens": 50}'
```

If `--minimal` is passed, stop after Step 5 (resource creation and key retrieval only).

## Step 9: Install Python SDK (Optional)

```bash
pip install openai azure-identity
```

Verify SDK:
```python
from openai import AzureOpenAI
client = AzureOpenAI(
    azure_endpoint="https://<resource-name>.openai.azure.com/",
    api_key="<your-api-key>",
    api_version="2024-08-01-preview"
)
print("SDK configured successfully")
```

## Display Summary

Show the user:
- Resource name and endpoint URL
- Deployment name(s) created
- Environment variables to set
- Next steps: `/aoai-deploy` to create model deployments
