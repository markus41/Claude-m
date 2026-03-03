---
name: azure-ai-services-setup
description: Set up the Azure AI Services plugin — validate RBAC roles, provision or discover Azure OpenAI resources, check quota availability, and confirm AI Search connectivity
argument-hint: "[--openai-only] [--search-only] [--resource-group <rg>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Azure AI Services Plugin Setup

Interactive guided setup for the Azure AI Services plugin. Validates Azure prerequisites, locates or creates Azure OpenAI and AI Search resources, checks quota, verifies RBAC assignments, and confirms data-plane connectivity.

## Flags

- `--openai-only`: Check only Azure OpenAI (skip AI Search validation)
- `--search-only`: Check only AI Search (skip Azure OpenAI validation)
- `--resource-group <rg>`: Scope discovery to a specific resource group

Default: Full setup covering Azure OpenAI Service and Azure AI Search.

## Integration Context Fail-Fast Check

Before any external API call, validate integration context from [`docs/integration-context.md`](../../docs/integration-context.md):

- `tenantId` (always required)
- `subscriptionId` (required)
- `environmentCloud`
- `principalType`
- `scopesOrRoles`

Stop immediately with a structured error if required context is missing.

## Step 1: Check Prerequisites

### Azure CLI

```bash
az --version
```

Required. If missing, instruct user to install: https://learn.microsoft.com/en-us/cli/azure/install-azure-cli

### Azure CLI Authentication

```bash
az account show --query "{subscription: id, tenant: tenantId, user: user.name}" -o json
```

Confirm the subscription and tenant are correct.

## Step 2: Discover Existing Azure OpenAI Resources (skip if --search-only)

List all Azure OpenAI resources in the subscription (or scoped resource group):

```bash
az cognitiveservices account list --query "[?kind=='OpenAI'].{Name:name, RG:resourceGroup, Location:location, Endpoint:properties.endpoint, State:properties.provisioningState}" -o table
```

If the `--resource-group` flag is set, add `--resource-group {rg}`.

- If resources are found: display them and ask the user which one to use.
- If none found: ask the user whether to create a new one or provide an existing resource name manually.

### Create New Azure OpenAI Resource (if needed)

Use `AskUserQuestion` to collect:
1. Resource name
2. Resource group (create if needed)
3. Region (`eastus` recommended for broadest model availability)

```bash
az cognitiveservices account create \
  --name {accountName} \
  --resource-group {rg} \
  --kind OpenAI \
  --sku S0 \
  --location {location} \
  --custom-domain {accountName} \
  --yes
```

## Step 3: Validate Azure OpenAI RBAC

```bash
az role assignment list --scope $(az cognitiveservices account show --name {accountName} --resource-group {rg} --query id -o tsv) --output table
```

Required roles:

| Operation | Required role |
|---|---|
| Manage resources and deployments | `Cognitive Services Contributor` |
| Call API (completions/embeddings) | `Cognitive Services OpenAI User` |
| Manage content filters | `Cognitive Services OpenAI Contributor` |

Assign missing roles:

```bash
az role assignment create \
  --role "Cognitive Services OpenAI User" \
  --assignee {principalId} \
  --scope {openaiResourceId}
```

## Step 4: List Deployments and Check Quota

**List existing deployments:**

```bash
az cognitiveservices account deployment list \
  --name {accountName} \
  --resource-group {rg} \
  --query "[].{Name:name, Model:properties.model.name, Version:properties.model.version, Capacity:sku.capacity, SKU:sku.name}" \
  -o table
```

**Check regional quota:**

```bash
az cognitiveservices usage list \
  --location {location} \
  --query "[?starts_with(name.value, 'OpenAI')].{Resource:name.localizedValue, Used:currentValue, Limit:limit}" \
  -o table
```

Report quota headroom for each model family. Flag if any model family is at > 80% of quota.

## Step 5: Create a Test Deployment (optional)

If no deployments exist, offer to create a small `gpt-4o-mini` deployment for connectivity testing:

```bash
az cognitiveservices account deployment create \
  --name {accountName} \
  --resource-group {rg} \
  --deployment-name "gpt-4o-mini-test" \
  --model-name "gpt-4o-mini" \
  --model-version "2024-07-18" \
  --model-format OpenAI \
  --sku-capacity 10 \
  --sku-name "Standard"
```

10k TPM is sufficient for testing.

## Step 6: Verify Azure OpenAI Data-Plane Connectivity

Get the endpoint and key:

```bash
ENDPOINT=$(az cognitiveservices account show --name {accountName} --resource-group {rg} --query properties.endpoint -o tsv)
KEY=$(az cognitiveservices account keys list --name {accountName} --resource-group {rg} --query key1 -o tsv)
```

Run a minimal chat completion call:

```bash
curl -s -X POST "${ENDPOINT}openai/deployments/{deploymentName}/chat/completions?api-version=2024-02-01" \
  -H "api-key: ${KEY}" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Respond with: connectivity test OK"}],"max_tokens":10}' \
  | python3 -c "import sys,json; r=json.load(sys.stdin); print(r['choices'][0]['message']['content'])"
```

- If successful: print the response confirming connectivity.
- If 401: check key validity and RBAC.
- If 404: confirm deployment name is correct.

**Important:** Instruct user to rotate this key immediately after testing. Use managed identity for production.

## Step 7: Discover Azure AI Search Resources (skip if --openai-only)

```bash
az search service list --query "[].{Name:name, RG:resourceGroup, SKU:sku.name, Location:location, Replicas:replicaCount, Partitions:partitionCount, Semantic:properties.semanticSearch}" -o table
```

If none found: offer to create a Standard tier service.

### Create AI Search Service (if needed)

```bash
az search service create \
  --name {serviceName} \
  --resource-group {rg} \
  --sku Standard \
  --location {location} \
  --partition-count 1 \
  --replica-count 1 \
  --semantic-search standard
```

## Step 8: Validate AI Search RBAC and Connectivity

```bash
az role assignment list --scope $(az search service show --name {serviceName} --resource-group {rg} --query id -o tsv)
```

Required roles for RBAC auth: `Search Service Contributor`, `Search Index Data Contributor`

**List indexes:**

```bash
SEARCH_ENDPOINT="https://{serviceName}.search.windows.net"
ADMIN_KEY=$(az search admin-key show --resource-group {rg} --service-name {serviceName} --query primaryKey -o tsv)

curl -s "${SEARCH_ENDPOINT}/indexes?api-version=2024-05-01-preview&\$select=name" \
  -H "api-key: ${ADMIN_KEY}" | python3 -c "import sys,json; [print(i['name']) for i in json.load(sys.stdin)['value']]"
```

- If returns index list (possibly empty): connectivity confirmed.
- If 403: check admin key or RBAC assignment.

## Step 9: Configure Environment Variables

Create or update `.env`:

```
AZURE_TENANT_ID=<tenant-id>
AZURE_CLIENT_ID=<client-id>
AZURE_CLIENT_SECRET=<client-secret>
AZURE_SUBSCRIPTION_ID=<subscription-id>
AZURE_OPENAI_ENDPOINT=https://<accountName>.openai.azure.com/
AZURE_OPENAI_API_KEY=<key1>
AZURE_OPENAI_RESOURCE_GROUP=<rg>
AZURE_OPENAI_ACCOUNT_NAME=<accountName>
AZURE_SEARCH_ENDPOINT=https://<serviceName>.search.windows.net
AZURE_SEARCH_ADMIN_KEY=<adminKey>
AZURE_SEARCH_SERVICE_NAME=<serviceName>
AZURE_SEARCH_RESOURCE_GROUP=<rg>
```

Write the file with the `Write` tool. Verify `.gitignore` contains `.env`.

## Step 10: Output Setup Report

```markdown
# Azure AI Services Setup Report

| Component | Status | Details |
|---|---|---|
| Azure CLI | OK / MISSING | v2.x.x |
| Azure authentication | OK / NOT_SIGNED_IN | Sub: {subscriptionId} |
| Azure OpenAI resource | FOUND / CREATED / NOT_FOUND | {accountName} in {location} |
| OpenAI RBAC | SUFFICIENT / INSUFFICIENT | Roles: ... |
| OpenAI deployments | {N} active | {deploymentNames} |
| Quota headroom | OK / LOW | {model}: {used}/{limit} kTPM |
| Data-plane connectivity | OK / FAILED | {deploymentName} responded |
| AI Search service | FOUND / CREATED / NOT_FOUND / SKIPPED | {serviceName} ({sku}) |
| AI Search RBAC | SUFFICIENT / INSUFFICIENT / SKIPPED | — |
| AI Search connectivity | OK / FAILED / SKIPPED | {N} indexes found |
| .env file | CREATED / EXISTS / SKIPPED | — |

Setup completed at <timestamp>.
```

## Important Notes

- For production, assign the `Cognitive Services OpenAI User` role to a managed identity and remove API keys.
- `gpt-4o` and `gpt-4-turbo` require quota request approval in some regions — check the Azure OpenAI Studio quota page.
- `semanticSearch: standard` on AI Search adds a cost above Basic tier — consider `free` (1000 queries/month) for development.
- Content filter policies default to `Microsoft.Default` — create named custom policies before production deployment.
- Reference: `skills/azure-ai-services/SKILL.md` for full API guidance.
