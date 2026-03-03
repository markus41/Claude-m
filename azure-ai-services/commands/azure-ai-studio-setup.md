---
name: azure-ai-studio-setup
description: Scaffold an Azure AI Studio (AI Foundry) project — create or attach an AI Hub, provision a project, configure connections to Azure OpenAI and AI Search, and validate the setup
argument-hint: "[--hub-name <name>] [--project-name <name>] [--resource-group <rg>] [--location <loc>]"
allowed-tools:
  - Bash
  - Read
  - Write
  - AskUserQuestion
---

# Azure AI Studio / Foundry Project Setup

Creates an Azure AI Hub (shared infrastructure) and an AI Project under it. Configures connections to Azure OpenAI, Azure AI Search, and Azure Blob Storage. Validates the project is functional and ready for model evaluation, RAG, or custom AI workloads.

## Arguments

- `--hub-name <name>`: AI Hub name (create new or attach existing)
- `--project-name <name>`: AI Project name
- `--resource-group <rg>`: Resource group for all resources (created if needed)
- `--location <loc>`: Azure region (default: `eastus`)

## Integration Context Check

Require:
- `AZURE_SUBSCRIPTION_ID`
- Role: `Contributor` on resource group (for hub creation) or `Azure AI Developer` on existing hub

## Step 1: Check Prerequisites

```bash
az --version
az account show --query "{subscription: id, tenant: tenantId}" -o json
```

Verify the `Microsoft.MachineLearningServices` and `Microsoft.CognitiveServices` providers are registered:

```bash
az provider show --namespace Microsoft.MachineLearningServices --query "registrationState" -o tsv
az provider show --namespace Microsoft.CognitiveServices --query "registrationState" -o tsv
```

If not registered:
```bash
az provider register --namespace Microsoft.MachineLearningServices
az provider register --namespace Microsoft.CognitiveServices
```

## Step 2: Ensure Resource Group Exists

```bash
az group show --name {resourceGroup} 2>/dev/null || \
  az group create --name {resourceGroup} --location {location}
```

## Step 3: Discover or Create AI Hub

### Check for Existing AI Hub

```bash
az ml workspace list \
  --resource-group {resourceGroup} \
  --query "[?kind=='Hub'].{Name: name, Location: location, ResourceId: id}" \
  -o table
```

If an existing hub is found, use `AskUserQuestion` to confirm whether to use it or create a new one.

### Create Supporting Resources (if new hub needed)

An AI Hub requires: Storage Account, Key Vault, Application Insights, and optionally Container Registry.

**Storage Account:**
```bash
az storage account create \
  --name "{hubName}storage" \
  --resource-group {resourceGroup} \
  --location {location} \
  --sku Standard_LRS \
  --kind StorageV2 \
  --https-only true \
  --min-tls-version TLS1_2
```

**Key Vault:**
```bash
az keyvault create \
  --name "{hubName}kv" \
  --resource-group {resourceGroup} \
  --location {location} \
  --sku standard \
  --enable-rbac-authorization true
```

**Application Insights:**
```bash
az monitor app-insights component create \
  --app "{hubName}-insights" \
  --resource-group {resourceGroup} \
  --location {location} \
  --kind web
```

### Create AI Hub

```bash
STORAGE_ID=$(az storage account show --name "{hubName}storage" --resource-group {resourceGroup} --query id -o tsv)
KV_ID=$(az keyvault show --name "{hubName}kv" --resource-group {resourceGroup} --query id -o tsv)
AI_ID=$(az monitor app-insights component show --app "{hubName}-insights" --resource-group {resourceGroup} --query id -o tsv)

az ml workspace create \
  --name {hubName} \
  --resource-group {resourceGroup} \
  --location {location} \
  --kind Hub \
  --storage-account $STORAGE_ID \
  --key-vault $KV_ID \
  --application-insights $AI_ID \
  --display-name "{hubName} AI Hub" \
  --description "Shared AI infrastructure hub"
```

## Step 4: Create AI Project

```bash
HUB_ID=$(az ml workspace show --name {hubName} --resource-group {resourceGroup} --query id -o tsv)

az ml workspace create \
  --name {projectName} \
  --resource-group {resourceGroup} \
  --location {location} \
  --kind Project \
  --hub-id $HUB_ID \
  --display-name "{projectName}" \
  --description "AI project for {purpose}"
```

Verify project was created:
```bash
az ml workspace show \
  --name {projectName} \
  --resource-group {resourceGroup} \
  --query "{Name: name, Kind: kind, Hub: properties.hubResourceId, State: properties.provisioningState}" \
  -o json
```

## Step 5: Add Azure OpenAI Connection

```bash
az ml connection create \
  --name "azure-openai-connection" \
  --resource-group {resourceGroup} \
  --workspace-name {projectName} \
  --file /dev/stdin << 'EOF'
{
  "name": "azure-openai-connection",
  "type": "azure_open_ai",
  "target": "{AZURE_OPENAI_ENDPOINT}",
  "credentials": {
    "type": "api_key",
    "key": "{AZURE_OPENAI_API_KEY}"
  },
  "metadata": {
    "ApiVersion": "2024-02-01",
    "ApiType": "azure",
    "ResourceId": "{openaiResourceId}"
  }
}
EOF
```

**Prefer managed identity over API key.** For production, use:
```json
{
  "credentials": {
    "type": "managed_identity"
  }
}
```
And assign `Cognitive Services OpenAI User` role on the OpenAI resource to the project's managed identity.

## Step 6: Add Azure AI Search Connection (optional)

```bash
az ml connection create \
  --name "azure-search-connection" \
  --resource-group {resourceGroup} \
  --workspace-name {projectName} \
  --file /dev/stdin << 'EOF'
{
  "name": "azure-search-connection",
  "type": "cognitive_search",
  "target": "{AZURE_SEARCH_ENDPOINT}",
  "credentials": {
    "type": "api_key",
    "key": "{AZURE_SEARCH_ADMIN_KEY}"
  }
}
EOF
```

## Step 7: List Connections

Verify all connections are registered:

```bash
az ml connection list \
  --resource-group {resourceGroup} \
  --workspace-name {projectName} \
  --query "[].{Name: name, Type: type, Target: target, AuthType: credentials.type}" \
  -o table
```

## Step 8: Assign RBAC to Project

Assign `Azure AI Developer` to the team or service principals that will use the project:

```bash
PROJECT_ID=$(az ml workspace show --name {projectName} --resource-group {resourceGroup} --query id -o tsv)

az role assignment create \
  --role "Azure AI Developer" \
  --assignee {principalId} \
  --scope $PROJECT_ID
```

## Step 9: Validate Project

Run a quick model listing to confirm the OpenAI connection works:

```bash
az ml model list \
  --resource-group {resourceGroup} \
  --workspace-name {projectName} \
  -o table 2>/dev/null || echo "No models registered yet (expected for new projects)"
```

## Output Format

```markdown
# Azure AI Studio Setup Report
**Timestamp:** {timestamp} | **Subscription:** {subscriptionId}

## Resources Created

| Resource | Name | Type | Status |
|---|---|---|---|
| Resource Group | {rg} | Resource Group | Created / Existing |
| Storage Account | {hubName}storage | Standard_LRS | Created |
| Key Vault | {hubName}kv | Standard | Created |
| App Insights | {hubName}-insights | Web | Created |
| AI Hub | {hubName} | ML Workspace (Hub) | Created |
| AI Project | {projectName} | ML Workspace (Project) | Created |

## Connections

| Name | Type | Auth | Status |
|---|---|---|---|
| azure-openai-connection | AzureOpenAI | ApiKey / ManagedIdentity | Connected |
| azure-search-connection | CognitiveSearch | ApiKey | Connected |

## RBAC Assignments

| Principal | Role | Scope |
|---|---|---|
| {principalId} | Azure AI Developer | {projectName} |

## Next Steps
1. Open Azure AI Studio at https://ai.azure.com and select project {projectName}
2. Add model evaluation datasets for baseline quality assessment
3. Replace API key connections with managed identity for production
4. Configure budget alerts on the resource group
```
