---
name: aoai-quota
description: "View Azure OpenAI quota usage, monitor TPM/RPM limits, and manage rate limit strategies"
argument-hint: "[--check] [--deployment <name>] [--region <location>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Azure OpenAI Quota Management

View quota usage, identify rate limit bottlenecks, and plan capacity.

## Instructions

### 1. Validate Inputs

- `--check` — Show current quota usage for all deployments.
- `--deployment` — Focus on a specific deployment.
- `--region` — Check quota for a specific Azure region.

If no flag is specified, show a full quota overview.

### 2. View Subscription-Level Quota

```bash
# List quota usage by model in a region
az cognitiveservices usage list \
  --location <region> \
  --query "[?contains(name.value, 'OpenAI')].{Model:name.value, Current:currentValue, Limit:limit}" \
  --output table
```

### 3. View Deployment-Level Usage

```bash
# List all deployments with capacity
az cognitiveservices account deployment list \
  --name <resource-name> \
  --resource-group <rg-name> \
  --query "[].{Name:name, Model:properties.model.name, SKU:sku.name, Capacity:sku.capacity, State:properties.provisioningState}" \
  --output table

# Check token usage metrics (last 1 hour)
az monitor metrics list \
  --resource "/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.CognitiveServices/accounts/<resource-name>" \
  --metric "TokenTransaction" \
  --dimension "ModelDeploymentName" \
  --interval PT1H \
  --start-time "$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ)" \
  --output table

# Check active tokens (current utilization)
az monitor metrics list \
  --resource "/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.CognitiveServices/accounts/<resource-name>" \
  --metric "ActiveTokens" \
  --dimension "ModelDeploymentName" \
  --interval PT1M \
  --output table

# Check PTU utilization (for provisioned deployments)
az monitor metrics list \
  --resource "/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.CognitiveServices/accounts/<resource-name>" \
  --metric "ProvisionedManagedUtilizationV2" \
  --interval PT5M \
  --output table
```

### 4. Check for 429 Errors

```bash
# Count 429 errors in the last hour
az monitor metrics list \
  --resource "/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.CognitiveServices/accounts/<resource-name>" \
  --metric "ClientErrors" \
  --dimension "StatusCode" \
  --interval PT1H \
  --output table
```

### 5. Quota Optimization Recommendations

Based on the usage data, recommend:

| Situation | Recommendation |
|-----------|---------------|
| Frequent 429 errors | Increase deployment capacity or add parallel deployments |
| Low utilization (<20%) | Reduce capacity to save quota for other deployments |
| Consistent high utilization (>80%) | Consider Provisioned Throughput (PTU) for cost savings |
| Bursty traffic patterns | Use multiple Standard deployments across regions |
| Non-urgent bulk processing | Use Batch API for 50% cost savings |

### 6. Create Quota Alert

```bash
az monitor metrics alert create \
  --name "openai-quota-warning" \
  --resource-group <rg-name> \
  --scopes "/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.CognitiveServices/accounts/<resource-name>" \
  --condition "total ClientErrors > 50" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --description "Alert when Azure OpenAI 429 rate limit errors exceed threshold"
```

### 7. Display Summary

Show the user:
- Current quota usage per deployment (TPM used vs allocated)
- 429 error rate in the last hour
- PTU utilization percentage (if applicable)
- Recommendations for optimization
- Link to Azure portal quota page
