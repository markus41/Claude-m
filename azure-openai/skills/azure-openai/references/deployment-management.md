# Azure OpenAI — Deployment Management

## Overview

Azure OpenAI model deployments control which models are available at your endpoint, how they scale, and how they are billed. Each deployment maps a model name and version to a deployment name used in API calls. Deployment types (Standard, Provisioned-Managed, Global Standard, Global Provisioned) determine billing, latency, and scaling behavior.

---

## REST API Endpoints (Deployment Management)

Base URL: `https://management.azure.com`
API Version: `2024-06-01-preview`

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| PUT | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.CognitiveServices/accounts/{name}/deployments/{deployment}` | Cognitive Services Contributor | Body: deployment definition | Create or update deployment |
| GET | `.../{name}/deployments/{deployment}` | Reader | — | Get deployment details |
| GET | `.../{name}/deployments` | Reader | — | List all deployments |
| DELETE | `.../{name}/deployments/{deployment}` | Contributor | — | Delete deployment |
| GET | `.../{name}/models` | Reader | — | List available models |
| GET | `/subscriptions/{sub}/providers/Microsoft.CognitiveServices/locations/{location}/models` | Reader | — | List models available in a region |

---

## SKU Comparison

| SKU Name | Billing | Capacity Unit | Min Capacity | Scaling | Latency | Data Processing |
|----------|---------|--------------|-------------|---------|---------|----------------|
| Standard | Pay-per-token | TPM (thousands) | 1K | Auto, shared compute | Variable | Regional |
| ProvisionedManaged | Hourly reserved | PTU | 50 | Fixed, dedicated | Consistent, low | Regional |
| GlobalStandard | Pay-per-token | TPM (thousands) | 1K | Auto, cross-region | Optimized | Cross-region |
| GlobalProvisioned | Hourly reserved | PTU | 50 | Fixed, cross-region | Consistent | Cross-region |
| DataZoneStandard | Pay-per-token | TPM (thousands) | 1K | Auto, data zone | Variable | Data zone boundary |

**Choosing a SKU**:
- **Standard**: Start here for development, testing, and moderate production workloads.
- **ProvisionedManaged**: Use when you need consistent latency and have predictable token volume (>100M tokens/month).
- **GlobalStandard**: Best for global applications where latency optimization across regions matters.
- **GlobalProvisioned**: Combines guaranteed throughput with global routing.

---

## Create and Manage Deployments (az CLI)

### Create Resource

```bash
# Create resource group
az group create --name rg-openai --location eastus

# Create Azure OpenAI cognitive account
az cognitiveservices account create \
  --name my-openai-resource \
  --resource-group rg-openai \
  --kind OpenAI \
  --sku S0 \
  --location eastus \
  --custom-domain my-openai-resource \
  --tags environment=production team=platform

# Show resource details
az cognitiveservices account show \
  --name my-openai-resource \
  --resource-group rg-openai \
  --query "{Name:name, Endpoint:properties.endpoint, State:properties.provisioningState, CustomDomain:properties.customSubDomainName}" \
  --output table

# List all OpenAI resources
az cognitiveservices account list \
  --query "[?kind=='OpenAI'].{Name:name, RG:resourceGroup, Location:location, State:properties.provisioningState}" \
  --output table
```

### Create Deployments

```bash
# GPT-4o — Standard
az cognitiveservices account deployment create \
  --name my-openai-resource \
  --resource-group rg-openai \
  --deployment-name gpt4o-standard \
  --model-name gpt-4o \
  --model-version "2024-08-06" \
  --model-format OpenAI \
  --sku-name Standard \
  --sku-capacity 30

# GPT-4o — Provisioned-Managed (PTU)
az cognitiveservices account deployment create \
  --name my-openai-resource \
  --resource-group rg-openai \
  --deployment-name gpt4o-ptu \
  --model-name gpt-4o \
  --model-version "2024-08-06" \
  --model-format OpenAI \
  --sku-name ProvisionedManaged \
  --sku-capacity 100

# GPT-4o — Global Standard
az cognitiveservices account deployment create \
  --name my-openai-resource \
  --resource-group rg-openai \
  --deployment-name gpt4o-global \
  --model-name gpt-4o \
  --model-version "2024-08-06" \
  --model-format OpenAI \
  --sku-name GlobalStandard \
  --sku-capacity 80

# GPT-4o-mini — Standard (cost-optimized)
az cognitiveservices account deployment create \
  --name my-openai-resource \
  --resource-group rg-openai \
  --deployment-name gpt4o-mini \
  --model-name gpt-4o-mini \
  --model-version "2024-07-18" \
  --model-format OpenAI \
  --sku-name Standard \
  --sku-capacity 100

# o3-mini — reasoning model
az cognitiveservices account deployment create \
  --name my-openai-resource \
  --resource-group rg-openai \
  --deployment-name o3-mini-deploy \
  --model-name o3-mini \
  --model-version "2025-01-31" \
  --model-format OpenAI \
  --sku-name GlobalStandard \
  --sku-capacity 50

# Embeddings — text-embedding-3-small
az cognitiveservices account deployment create \
  --name my-openai-resource \
  --resource-group rg-openai \
  --deployment-name embeddings-small \
  --model-name text-embedding-3-small \
  --model-version "1" \
  --model-format OpenAI \
  --sku-name Standard \
  --sku-capacity 350

# Embeddings — text-embedding-3-large
az cognitiveservices account deployment create \
  --name my-openai-resource \
  --resource-group rg-openai \
  --deployment-name embeddings-large \
  --model-name text-embedding-3-large \
  --model-version "1" \
  --model-format OpenAI \
  --sku-name Standard \
  --sku-capacity 120

# DALL-E 3
az cognitiveservices account deployment create \
  --name my-openai-resource \
  --resource-group rg-openai \
  --deployment-name dalle3 \
  --model-name dall-e-3 \
  --model-version "3.0" \
  --model-format OpenAI \
  --sku-name Standard \
  --sku-capacity 1

# Whisper (speech-to-text)
az cognitiveservices account deployment create \
  --name my-openai-resource \
  --resource-group rg-openai \
  --deployment-name whisper \
  --model-name whisper \
  --model-version "001" \
  --model-format OpenAI \
  --sku-name Standard \
  --sku-capacity 1

# TTS (text-to-speech)
az cognitiveservices account deployment create \
  --name my-openai-resource \
  --resource-group rg-openai \
  --deployment-name tts \
  --model-name tts \
  --model-version "001" \
  --model-format OpenAI \
  --sku-name Standard \
  --sku-capacity 1
```

### Update Deployments

```bash
# Scale up capacity (re-issue create with new capacity)
az cognitiveservices account deployment create \
  --name my-openai-resource \
  --resource-group rg-openai \
  --deployment-name gpt4o-standard \
  --model-name gpt-4o \
  --model-version "2024-08-06" \
  --model-format OpenAI \
  --sku-name Standard \
  --sku-capacity 60

# Upgrade model version
az cognitiveservices account deployment create \
  --name my-openai-resource \
  --resource-group rg-openai \
  --deployment-name gpt4o-standard \
  --model-name gpt-4o \
  --model-version "2024-11-20" \
  --model-format OpenAI \
  --sku-name Standard \
  --sku-capacity 60
```

### List and Inspect Deployments

```bash
# List all deployments
az cognitiveservices account deployment list \
  --name my-openai-resource \
  --resource-group rg-openai \
  --query "[].{Name:name, Model:properties.model.name, Version:properties.model.version, SKU:sku.name, Capacity:sku.capacity, State:properties.provisioningState}" \
  --output table

# Show specific deployment
az cognitiveservices account deployment show \
  --name my-openai-resource \
  --resource-group rg-openai \
  --deployment-name gpt4o-standard \
  --query "{Name:name, Model:properties.model.name, Version:properties.model.version, SKU:sku.name, Capacity:sku.capacity, RateLimits:properties.rateLimits}"
```

### Delete Deployments

```bash
# Delete a deployment
az cognitiveservices account deployment delete \
  --name my-openai-resource \
  --resource-group rg-openai \
  --deployment-name gpt4o-standard

# Delete the entire resource (WARNING: deletes all deployments)
az cognitiveservices account delete \
  --name my-openai-resource \
  --resource-group rg-openai
```

---

## Model Version Management

```bash
# List available models in a resource
az cognitiveservices account list-models \
  --name my-openai-resource \
  --resource-group rg-openai \
  --query "[].{Name:name, Version:version, Lifecycle:lifecycleStatus, Deprecation:deprecation.inference}" \
  --output table

# List models available in a region (no resource required)
az cognitiveservices model list \
  --location eastus \
  --query "[?kind=='OpenAI'].{Name:model.name, Version:model.version, SKUs:model.skus[*].name}" \
  --output table
```

**Version lifecycle**:
| Status | Meaning | Action |
|--------|---------|--------|
| preview | Early access, may change | Use for evaluation only |
| ga | Generally available, fully supported | Safe for production |
| deprecated | Scheduled for retirement | Plan migration to newer version |
| retired | No longer available | Must migrate immediately |

---

## Bicep Deployment Template

```bicep
@description('Azure OpenAI resource name')
param openAIName string

@description('Location')
param location string = resourceGroup().location

@description('GPT-4o deployment capacity (TPM in thousands)')
param gpt4oCapacity int = 30

@description('Embeddings deployment capacity (TPM in thousands)')
param embeddingsCapacity int = 120

resource openAI 'Microsoft.CognitiveServices/accounts@2024-06-01-preview' = {
  name: openAIName
  location: location
  kind: 'OpenAI'
  sku: { name: 'S0' }
  identity: { type: 'SystemAssigned' }
  properties: {
    customSubDomainName: openAIName
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      defaultAction: 'Allow'
    }
  }
}

resource gpt4oDeployment 'Microsoft.CognitiveServices/accounts/deployments@2024-06-01-preview' = {
  parent: openAI
  name: 'gpt-4o'
  sku: {
    name: 'Standard'
    capacity: gpt4oCapacity
  }
  properties: {
    model: {
      name: 'gpt-4o'
      version: '2024-08-06'
      format: 'OpenAI'
    }
  }
}

resource embeddingsDeployment 'Microsoft.CognitiveServices/accounts/deployments@2024-06-01-preview' = {
  parent: openAI
  name: 'embeddings'
  sku: {
    name: 'Standard'
    capacity: embeddingsCapacity
  }
  properties: {
    model: {
      name: 'text-embedding-3-small'
      version: '1'
      format: 'OpenAI'
    }
  }
  dependsOn: [gpt4oDeployment] // Sequential deployment to avoid conflicts
}

output openAIEndpoint string = openAI.properties.endpoint
output openAIPrincipalId string = openAI.identity.principalId
```

---

## PTU (Provisioned Throughput Units) Planning

**Sizing guidance**:
| Workload | Avg Input Tokens | Avg Output Tokens | Requests/min | Estimated PTUs |
|----------|-----------------|------------------|-------------|---------------|
| Chatbot | 500 | 200 | 50 | 50-100 |
| Document summarization | 3000 | 500 | 20 | 100-200 |
| Code generation | 1000 | 1000 | 30 | 100-150 |
| RAG pipeline | 2000 | 300 | 100 | 200-400 |

Use the Azure OpenAI capacity calculator in the Azure portal to get accurate PTU estimates based on your specific workload patterns. Monitor `ProvisionedManagedUtilizationV2` metric and target 70-80% utilization for optimal cost-performance balance.

---

## Key Management

```bash
# List keys
az cognitiveservices account keys list \
  --name my-openai-resource \
  --resource-group rg-openai

# Regenerate key1
az cognitiveservices account keys regenerate \
  --name my-openai-resource \
  --resource-group rg-openai \
  --key-name key1

# Regenerate key2
az cognitiveservices account keys regenerate \
  --name my-openai-resource \
  --resource-group rg-openai \
  --key-name key2
```

**Key rotation pattern**: Always regenerate key1 first, update all consumers to use key2, then regenerate key2. Or better: use managed identity to eliminate keys entirely.

---

## Common Patterns and Gotchas

**1. Deployment name vs model name**: The deployment name is what you use in API calls (`/deployments/{deployment-name}/chat/completions`). The model name is the Azure model identifier (e.g., `gpt-4o`). They do not need to match, but using descriptive deployment names (e.g., `gpt4o-prod`, `gpt4o-staging`) helps with management.

**2. Sequential deployment creation**: ARM deployments for the same OpenAI resource should be created sequentially (not in parallel) to avoid conflicts. In Bicep, use `dependsOn` to chain deployments.

**3. Capacity is not guaranteed for Standard**: Standard SKU capacity is shared and subject to regional availability. If a region is constrained, you may not be able to scale up. Consider Global Standard for better availability.

**4. PTU minimum commitment**: Provisioned-Managed deployments have minimum capacity requirements (typically 50 PTUs) and may require a commitment term. Check current minimums before planning.

**5. Model version pinning**: Always pin to a specific model version in production. Auto-update can introduce behavioral changes. Test new versions in a staging deployment before promoting.

**6. Custom domain is permanent**: The `--custom-domain` set during resource creation cannot be changed. Choose a meaningful, stable name. Custom domain is required for Azure AD authentication.

**7. Deployment update is a PUT**: Updating a deployment (capacity, model version) uses the same `deployment create` command — it is an upsert. The deployment remains available during updates.
