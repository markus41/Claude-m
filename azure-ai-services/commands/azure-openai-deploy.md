---
name: azure-openai-deploy
description: Provision a new Azure OpenAI deployment — select model, SKU, capacity, content filter, and apply governance guardrails
argument-hint: "<deployment-name> --model <model-name> [--capacity <kTPM>] [--sku <Standard|GlobalStandard>] [--content-filter <policy-name>] [--dry-run]"
allowed-tools:
  - Bash
  - Read
  - Write
---

# Azure OpenAI Deployment

Provisions a new Azure OpenAI model deployment with the specified model, SKU, and capacity. Validates quota availability, applies a content filter policy, and configures managed identity access.

## Arguments

- `<deployment-name>`: Name for the deployment (alphanumeric and hyphens)
- `--model <model-name>`: Model to deploy (e.g., `gpt-4o`, `text-embedding-3-small`)
- `--capacity <kTPM>`: Capacity in thousands-of-tokens-per-minute (default: 30)
- `--sku <sku>`: Deployment SKU: `Standard`, `GlobalStandard`, `DataZoneStandard` (default: `Standard`)
- `--content-filter <name>`: Name of content filter policy to apply (default: `Microsoft.Default`)
- `--dry-run`: Show what would be created without executing

## Integration Context Check

Require:
- `AZURE_SUBSCRIPTION_ID`
- `AZURE_OPENAI_RESOURCE_GROUP`
- `AZURE_OPENAI_ACCOUNT_NAME`
- Role: `Cognitive Services Contributor`

## Step 1: Validate Model Availability

Check that the requested model is available in the resource's region:

```bash
az cognitiveservices account list-models \
  --name ${AZURE_OPENAI_ACCOUNT_NAME} \
  --resource-group ${AZURE_OPENAI_RESOURCE_GROUP} \
  --query "[?name=='{model}'].{Name: name, Version: version, Lifecycle: lifecycleStatus}" \
  -o table
```

- If model is not available in this region, list available models and suggest alternatives or a region with the model.
- If `lifecycleStatus` is `GenerallyAvailable`: proceed.
- If `Deprecated`: warn and suggest migrating to a current version.

### Available Models Quick Reference

| Model | Category | Notes |
|---|---|---|
| `gpt-4o` | Chat | Multimodal, best quality |
| `gpt-4o-mini` | Chat | Fast, cost-efficient |
| `gpt-4-turbo` | Chat | 128k context |
| `gpt-35-turbo` | Chat | High-volume, lowest cost |
| `text-embedding-3-large` | Embedding | 3072 dims, highest quality |
| `text-embedding-3-small` | Embedding | 1536 dims, efficient |
| `dall-e-3` | Image | Image generation |
| `whisper` | Audio | Speech transcription |

## Step 2: Check Quota Availability

```bash
LOCATION=$(az cognitiveservices account show \
  --name ${AZURE_OPENAI_ACCOUNT_NAME} \
  --resource-group ${AZURE_OPENAI_RESOURCE_GROUP} \
  --query location -o tsv)

az cognitiveservices usage list \
  --location $LOCATION \
  --query "[?contains(name.value, '{modelFamily}')].{Resource: name.localizedValue, Used: currentValue, Limit: limit, Available: to_number(subtract(to_string(limit), to_string(currentValue)))}" \
  -o table
```

Calculate: required capacity ({capacity} kTPM) + current usage ≤ limit.

If quota is insufficient:
- Report current usage/limit
- Suggest lower capacity, a different region, or a GlobalStandard deployment
- Provide link to Azure OpenAI quota request: https://aka.ms/oai/quotaincrease

## Step 3: Check/Create Content Filter Policy

Validate the content filter policy exists:

```bash
az rest --method GET \
  --uri "https://management.azure.com/subscriptions/${AZURE_SUBSCRIPTION_ID}/resourceGroups/${AZURE_OPENAI_RESOURCE_GROUP}/providers/Microsoft.CognitiveServices/accounts/${AZURE_OPENAI_ACCOUNT_NAME}/raiPolicies/{contentFilter}?api-version=2023-10-01-preview"
```

If the policy doesn't exist and a custom name was specified:

```bash
az rest --method PUT \
  --uri "https://management.azure.com/subscriptions/${AZURE_SUBSCRIPTION_ID}/resourceGroups/${AZURE_OPENAI_RESOURCE_GROUP}/providers/Microsoft.CognitiveServices/accounts/${AZURE_OPENAI_ACCOUNT_NAME}/raiPolicies/{contentFilter}?api-version=2023-10-01-preview" \
  --body '{
    "properties": {
      "mode": "Default",
      "contentFilters": [
        {"name": "Hate", "blocking": true, "enabled": true, "severityThreshold": "Medium", "source": "Prompt"},
        {"name": "Hate", "blocking": true, "enabled": true, "severityThreshold": "Medium", "source": "Completion"},
        {"name": "Violence", "blocking": true, "enabled": true, "severityThreshold": "Medium", "source": "Prompt"},
        {"name": "Violence", "blocking": true, "enabled": true, "severityThreshold": "Medium", "source": "Completion"},
        {"name": "SelfHarm", "blocking": true, "enabled": true, "severityThreshold": "Low", "source": "Prompt"},
        {"name": "SelfHarm", "blocking": true, "enabled": true, "severityThreshold": "Low", "source": "Completion"},
        {"name": "Sexual", "blocking": true, "enabled": true, "severityThreshold": "Medium", "source": "Prompt"},
        {"name": "Sexual", "blocking": true, "enabled": true, "severityThreshold": "Medium", "source": "Completion"},
        {"name": "Jailbreak", "blocking": true, "enabled": true, "source": "Prompt"},
        {"name": "ProtectedMaterial", "blocking": true, "enabled": true, "source": "Completion"}
      ]
    }
  }'
```

## Step 4: Dry-Run Preview (if --dry-run)

Display what would be created without executing:

```markdown
## Dry Run Preview

Would create deployment:
- Account: {accountName}
- Deployment name: {deploymentName}
- Model: {model} (version: {version})
- SKU: {sku}
- Capacity: {capacity}k TPM
- Content filter: {contentFilter}
- Quota check: {used}/{limit} kTPM — {available} available ({available >= capacity ? "OK" : "INSUFFICIENT"})
```

If `--dry-run`, stop here.

## Step 5: Create Deployment

```bash
az cognitiveservices account deployment create \
  --name ${AZURE_OPENAI_ACCOUNT_NAME} \
  --resource-group ${AZURE_OPENAI_RESOURCE_GROUP} \
  --deployment-name "{deploymentName}" \
  --model-name "{model}" \
  --model-version "{version}" \
  --model-format OpenAI \
  --sku-capacity {capacity} \
  --sku-name "{sku}"
```

After creation, apply content filter via ARM PATCH:

```bash
az rest --method PATCH \
  --uri "https://management.azure.com/subscriptions/${AZURE_SUBSCRIPTION_ID}/resourceGroups/${AZURE_OPENAI_RESOURCE_GROUP}/providers/Microsoft.CognitiveServices/accounts/${AZURE_OPENAI_ACCOUNT_NAME}/deployments/{deploymentName}?api-version=2023-10-01-preview" \
  --body '{"properties": {"raiPolicyName": "{contentFilter}"}}'
```

## Step 6: Configure Monitoring Alert

Create a quota usage alert (80% threshold):

```bash
az monitor metrics alert create \
  --name "OpenAI-Quota-Warning-{deploymentName}" \
  --resource-group ${AZURE_OPENAI_RESOURCE_GROUP} \
  --scopes $(az cognitiveservices account show --name ${AZURE_OPENAI_ACCOUNT_NAME} --resource-group ${AZURE_OPENAI_RESOURCE_GROUP} --query id -o tsv) \
  --condition "avg ThrottledRequests > 10" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --severity 2 \
  --description "Azure OpenAI throttling detected on {deploymentName}"
```

## Step 7: Verify Deployment

```bash
az cognitiveservices account deployment show \
  --name ${AZURE_OPENAI_ACCOUNT_NAME} \
  --resource-group ${AZURE_OPENAI_RESOURCE_GROUP} \
  --deployment-name "{deploymentName}" \
  --query "{Name: name, Model: properties.model.name, Version: properties.model.version, Capacity: sku.capacity, SKU: sku.name, State: properties.provisioningState}"
```

## Deployment Lifecycle Management

### Delete Deployment

Remove a deployment that is no longer needed:

```bash
az cognitiveservices account deployment delete \
  --name ${AZURE_OPENAI_ACCOUNT_NAME} \
  --resource-group ${AZURE_OPENAI_RESOURCE_GROUP} \
  --deployment-name "{deploymentName}"
```

This frees the associated quota capacity immediately.

### Update Deployment (Scale TPM)

Scale a deployment's capacity up or down without redeploying:

```bash
az cognitiveservices account deployment update \
  --name ${AZURE_OPENAI_ACCOUNT_NAME} \
  --resource-group ${AZURE_OPENAI_RESOURCE_GROUP} \
  --deployment-name "{deploymentName}" \
  --capacity 120
```

Capacity is in kTPM (thousands of tokens per minute). Check quota availability before scaling up.

## Output Format

```markdown
# Azure OpenAI Deployment Report
**Timestamp:** {timestamp} | **Account:** {accountName}

## Deployment Created
| Field | Value |
|---|---|
| Deployment name | {deploymentName} |
| Model | {model} (v{version}) |
| SKU | {sku} |
| Capacity | {capacity}k TPM |
| Content filter | {contentFilter} |
| Status | Succeeded |
| Endpoint | https://{accountName}.openai.azure.com/openai/deployments/{deploymentName}/ |

## Quota After Deployment
| Model family | Used | Limit | Remaining |
|---|---|---|---|
| {modelFamily} | {newUsed} | {limit} | {remaining} |

## Next Steps
1. Use managed identity (`Cognitive Services OpenAI User` role) for production access
2. Monitor throttling via Azure Monitor metric `ThrottledRequests`
3. Rotate any API keys used during testing
4. Apply to AI Search vectorizer or application configuration
```
