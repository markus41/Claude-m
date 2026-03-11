---
name: aoai-deploy
description: "Create, update, or delete Azure OpenAI model deployments — set capacity, choose SKU, manage model versions"
argument-hint: "[--create|--update|--delete] [--deployment-name <name>] [--model <model>] [--sku <Standard|ProvisionedManaged|GlobalStandard>] [--capacity <tpm>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Deploy Azure OpenAI Models

Create, update, or delete model deployments on an Azure OpenAI resource.

## Instructions

### 1. Validate Inputs

- `--create` — Create a new deployment.
- `--update` — Update an existing deployment (capacity or model version).
- `--delete` — Delete a deployment.
- `--deployment-name` — Name for the deployment (used in API calls). Ask if not provided.
- `--model` — Model name (e.g., gpt-4o, gpt-4o-mini, text-embedding-3-small). Ask if not provided.
- `--sku` — Deployment SKU: Standard (default), ProvisionedManaged, GlobalStandard.
- `--capacity` — Capacity in TPM thousands (Standard/Global) or PTUs (Provisioned).

If no action is specified, ask the user what they want to do.

### 2. Pre-Deployment Checks

Before creating/updating, verify:
- The Azure OpenAI resource exists and is in a succeeded state.
- The chosen model is available in the resource's region.
- The requested capacity is within quota limits.

```bash
# Verify resource
az cognitiveservices account show \
  --name <resource-name> \
  --resource-group <rg-name> \
  --query "{State:properties.provisioningState, Location:location}"

# Check available models
az cognitiveservices account list-models \
  --name <resource-name> \
  --resource-group <rg-name> \
  --query "[?name=='<model-name>'].{Name:name, Version:version, Status:lifecycleStatus}" \
  --output table

# List existing deployments
az cognitiveservices account deployment list \
  --name <resource-name> \
  --resource-group <rg-name> \
  --query "[].{Name:name, Model:properties.model.name, SKU:sku.name, Capacity:sku.capacity}" \
  --output table
```

### 3. Create Deployment

```bash
az cognitiveservices account deployment create \
  --name <resource-name> \
  --resource-group <rg-name> \
  --deployment-name <deployment-name> \
  --model-name <model-name> \
  --model-version "<version>" \
  --model-format OpenAI \
  --sku-name <sku> \
  --sku-capacity <capacity>
```

**Common deployment configurations**:

| Model | Recommended SKU | Suggested Capacity | Use Case |
|-------|----------------|-------------------|----------|
| gpt-4o | Standard | 30-80 TPM | General purpose chat/completion |
| gpt-4o-mini | Standard | 50-200 TPM | Cost-optimized, simple tasks |
| text-embedding-3-small | Standard | 120-350 TPM | Embeddings for RAG |
| text-embedding-3-large | Standard | 60-120 TPM | High-precision embeddings |
| dall-e-3 | Standard | 1 | Image generation |
| whisper | Standard | 1 | Speech-to-text |
| o3-mini | GlobalStandard | 30-80 TPM | Reasoning tasks |

### 4. Update Deployment

To change capacity or model version, re-issue the create command with updated values:

```bash
# Scale up capacity
az cognitiveservices account deployment create \
  --name <resource-name> \
  --resource-group <rg-name> \
  --deployment-name <deployment-name> \
  --model-name <model-name> \
  --model-version "<new-version>" \
  --model-format OpenAI \
  --sku-name <sku> \
  --sku-capacity <new-capacity>
```

The deployment remains available during updates (no downtime).

### 5. Delete Deployment

```bash
az cognitiveservices account deployment delete \
  --name <resource-name> \
  --resource-group <rg-name> \
  --deployment-name <deployment-name>
```

Confirm with the user before deleting. Deleted deployments free up quota immediately.

### 6. Display Summary

Show the user:
- Deployment name and model
- SKU type and capacity
- API endpoint: `https://<resource-name>.openai.azure.com/openai/deployments/<deployment-name>/chat/completions`
- Verification command: `curl` example to test the deployment
- Quota usage after the operation
