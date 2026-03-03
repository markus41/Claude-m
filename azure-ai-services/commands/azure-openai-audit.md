---
name: azure-openai-audit
description: Audit all Azure OpenAI deployments across the subscription — list deployments, quota usage, content filter configuration, access controls, and governance gaps
argument-hint: "[--subscription <id>] [--resource-group <rg>] [--output-csv]"
allowed-tools:
  - Bash
  - Read
  - Write
---

# Azure OpenAI Audit

Enumerates all Azure OpenAI resources and deployments in the subscription, audits quota consumption, validates content filter policies, checks RBAC assignments and managed identity usage, and reports governance gaps.

## Arguments

- `--subscription <id>`: Subscription ID to audit (defaults to current subscription)
- `--resource-group <rg>`: Scope to a specific resource group
- `--output-csv`: Export deployment inventory as CSV

## Integration Context Check

Require:
- `AZURE_SUBSCRIPTION_ID`
- Role: `Cognitive Services Contributor` (read) or `Reader`

## Step 1: Discover All Azure OpenAI Resources

```bash
az cognitiveservices account list \
  --query "[?kind=='OpenAI'].{Name: name, RG: resourceGroup, Location: location, Endpoint: properties.endpoint, PublicAccess: properties.publicNetworkAccess, ProvisioningState: properties.provisioningState}" \
  -o table
```

## Step 2: Enumerate Deployments per Resource

For each discovered resource:

```bash
az cognitiveservices account deployment list \
  --name {accountName} \
  --resource-group {rg} \
  --query "[].{
    Deployment: name,
    Model: properties.model.name,
    Version: properties.model.version,
    SKU: sku.name,
    CapacityKTPM: sku.capacity,
    ContentFilter: properties.raiPolicyName,
    State: properties.provisioningState,
    VersionUpgrade: properties.versionUpgradeOption
  }" -o table
```

## Step 3: Quota Utilization Report

```bash
LOCATION=$(az cognitiveservices account show --name {accountName} --resource-group {rg} --query location -o tsv)

az cognitiveservices usage list \
  --location $LOCATION \
  --query "[?starts_with(name.value, 'OpenAI')].{Resource: name.localizedValue, Used: currentValue, Limit: limit}" \
  -o table
```

Calculate utilization percentage and flag resources at > 80%:

| Model family | Used kTPM | Limit kTPM | Utilization | Status |
|---|---|---|---|---|
| gpt-4o Standard | 90 | 120 | 75% | OK |
| gpt-35-turbo Standard | 240 | 240 | 100% | CRITICAL |

## Step 4: Content Filter Audit

For each deployment, check the applied content filter policy:

```bash
az rest --method GET \
  --uri "https://management.azure.com/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.CognitiveServices/accounts/{accountName}/raiPolicies?api-version=2023-10-01-preview" \
  --query "value[].{Name: name, Mode: properties.mode}"
```

**Governance flags:**

| Issue | Check |
|---|---|
| Using `Microsoft.Default` in production | Any deployment with `raiPolicyName: Microsoft.Default` |
| Missing Jailbreak filter | Content filter exists but `Jailbreak` filter not enabled |
| High severity thresholds only | All categories set to `High` threshold (too permissive) |
| No content filter applied | `raiPolicyName` is null or not set |

## Step 5: RBAC and Access Control Audit

```bash
# List role assignments on each resource
az role assignment list \
  --scope $(az cognitiveservices account show --name {accountName} --resource-group {rg} --query id -o tsv) \
  --query "[].{Principal: principalName, Role: roleDefinitionName, PrincipalType: principalType}" \
  -o table
```

**Governance flags:**

| Issue | Check |
|---|---|
| No managed identity assignments | Only users/service principals with keys, no MI |
| Excessive Owner assignments | `Owner` role on resource instead of scoped Cognitive Services roles |
| No access restrictions | `publicNetworkAccess: Enabled` without IP restrictions or Private Endpoint |

## Step 6: Diagnostic Settings Check

Verify logging is enabled:

```bash
az monitor diagnostic-settings list \
  --resource $(az cognitiveservices account show --name {accountName} --resource-group {rg} --query id -o tsv) \
  --query "[].{Name: name, WorkspaceId: workspaceId, Logs: logs[?enabled==\`true\`].category}" \
  -o json
```

Flag resources without diagnostic settings or without `RequestResponse` log category.

## Step 7: Model Lifecycle Check

Identify deployments running deprecated or soon-to-expire model versions:

```bash
az cognitiveservices account list-models \
  --name {accountName} \
  --resource-group {rg} \
  --query "[?lifecycleStatus=='Deprecated' || lifecycleStatus=='ToBeDeprecated'].{Name: name, Version: version, Status: lifecycleStatus, Retirement: deprecationDate}" \
  -o table
```

Cross-reference with current deployments to identify upgrade candidates.

## Step 8: Generate CSV (if --output-csv)

Write a CSV inventory file combining all discovered data:

```csv
AccountName,ResourceGroup,Location,DeploymentName,Model,Version,SKU,CapacityKTPM,ContentFilter,HasJailbreakFilter,PublicAccess,HasDiagnostics,QuotaUtilizationPct
contoso-openai,rg-ai,eastus,gpt4o-prod,gpt-4o,2024-05-13,Standard,30,prod-policy,true,Disabled,true,25%
```

## Output Format

```markdown
# Azure OpenAI Audit Report
**Timestamp:** {timestamp} | **Subscription:** {subscriptionId}

## Resource Inventory: {N} Azure OpenAI accounts

| Account | Region | Public Access | Deployments | Diagnostic Logs |
|---|---|---|---|---|
| contoso-openai | eastus | Private EP | 3 | Enabled |
| dev-openai | westeurope | Public | 1 | MISSING |

## Deployment Inventory: {totalDeployments} deployments

| Account | Deployment | Model | Version | Capacity | Content Filter | Upgrade Option |
|---|---|---|---|---|---|---|
| contoso-openai | gpt4o-prod | gpt-4o | 2024-05-13 | 30k TPM | prod-policy | OnceExpired |

## Quota Utilization

| Region | Model Family | Used | Limit | Utilization |
|---|---|---|---|---|
| eastus | gpt-4o Standard | 30 | 120 | 25% ✓ |
| eastus | gpt-35-turbo Standard | 240 | 240 | 100% ⚠ |

## Governance Issues Found: {N}

### CRITICAL
- [QUOTA] gpt-35-turbo in eastus is at 100% quota — new deployments will fail

### HIGH
- [CONTENT FILTER] dev-openai/gpt4o-dev: using Microsoft.Default policy — no Jailbreak filter
- [LOGGING] dev-openai: No diagnostic settings — API usage not auditable

### MEDIUM
- [ACCESS] contoso-openai: 3 users with Cognitive Services Contributor — review least privilege

### LOW
- [MODEL LIFECYCLE] contoso-openai/legacy-embed: text-embedding-ada-002 will be retired 2026-10-01

## Recommendations
1. Raise gpt-35-turbo quota in eastus or migrate workloads to GlobalStandard SKU
2. Create production content filter policy for dev-openai
3. Enable diagnostic settings on all accounts
4. Plan migration from text-embedding-ada-002 to text-embedding-3-small
```
