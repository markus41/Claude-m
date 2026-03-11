---
name: azure-ai-services
description: Deep expertise in Azure AI workloads — provisioning and managing Azure OpenAI Service deployments, Azure AI Search indexes and skillsets, Azure AI Studio/Foundry projects, Cognitive Services endpoints, content filtering policies, quota management, and responsible AI governance via ARM REST API and service-specific data planes.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
triggers:
  - azure openai
  - azure ai
  - openai deployment
  - gpt deployment
  - gpt-4
  - gpt-4o
  - embeddings deployment
  - text-embedding
  - ai search
  - cognitive search
  - azure search
  - vector search
  - semantic search
  - ai studio
  - ai foundry
  - cognitive services
  - language service
  - vision service
  - speech service
  - translator
  - content filter
  - responsible ai
  - fine-tuning
  - model deployment
  - model catalog
  - ai project
  - ai connection
  - quota management
  - TPM quota
  - RAG
  - retrieval augmented generation
  - ai index
  - skillset
  - indexer
  - search index
  - vector field
  - semantic ranker
  - ai evaluation
---

# Azure AI Services

This skill provides comprehensive knowledge for provisioning, managing, and governing Azure AI workloads. It covers the Azure OpenAI Service (deployments, quotas, fine-tuning, content filtering), Azure AI Search (indexes, indexers, skillsets, vector search), Azure AI Studio / AI Foundry (projects, connections, model catalog, evaluations), and Azure Cognitive Services (Language, Vision, Speech, Translator).

## Integration Context Contract

- Canonical contract: [`docs/integration-context.md`](../../../docs/integration-context.md)

| Workflow | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Azure OpenAI provisioning and management | required | required | `AzureCloud`* | `service-principal` | `Cognitive Services Contributor` or `Azure AI Administrator` |
| Azure OpenAI data plane (completions, embeddings) | required | required | `AzureCloud`* | `service-principal` | `Cognitive Services OpenAI User` or `Cognitive Services OpenAI Contributor` |
| Azure AI Search management | required | required | `AzureCloud`* | `service-principal` | `Search Service Contributor` |
| Azure AI Search data plane (index/query) | required | required | `AzureCloud`* | `service-principal` | `Search Index Data Contributor` / `Search Index Data Reader` |
| AI Studio / Foundry project management | required | required | `AzureCloud`* | `service-principal` | `Azure AI Developer` or `Owner` on the AI hub |
| Cognitive Services (Language, Vision, Speech) | required | required | `AzureCloud`* | `service-principal` | `Cognitive Services Contributor` |

\* Use sovereign cloud values from the canonical contract when applicable.

Fail fast when required context is missing. Redact tenant, subscription, and endpoint keys in outputs.

## Architecture Overview

```
Azure AI Services Ecosystem
  ├─ Azure OpenAI Service
  │    ├─ Resource (Cognitive Services account, kind=OpenAI)
  │    ├─ Deployments (model + SKU + quota)
  │    ├─ Fine-tuning jobs
  │    └─ Content filter policies
  │
  ├─ Azure AI Search
  │    ├─ Search service (SKU: free/basic/standard/storage-optimized)
  │    ├─ Indexes (fields, vector fields, semantic configs)
  │    ├─ Indexers + data sources
  │    └─ Skillsets (built-in + custom)
  │
  ├─ Azure AI Studio / AI Foundry
  │    ├─ AI Hub (shared infra: storage, Key Vault, ACR, compute)
  │    ├─ AI Projects (experiments, evals, deployments)
  │    ├─ Model catalog (Azure OpenAI, HuggingFace, Meta Llama, etc.)
  │    └─ Connections (OpenAI endpoint, search, blob, etc.)
  │
  └─ Cognitive Services (multi-service or single-service)
       ├─ Language (NER, sentiment, summarization, CLU)
       ├─ Vision (OCR, object detection, face)
       ├─ Speech (STT, TTS, speaker recognition)
       └─ Translator (text, document)
```

## Azure OpenAI Service

### ARM Resource Type

`Microsoft.CognitiveServices/accounts` with `kind: OpenAI`

**Create Azure OpenAI resource:**

```http
PUT https://management.azure.com/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.CognitiveServices/accounts/{accountName}?api-version=2023-10-01-preview
Authorization: Bearer {arm-token}
Content-Type: application/json

{
  "kind": "OpenAI",
  "sku": { "name": "S0" },
  "location": "eastus",
  "properties": {
    "customSubDomainName": "{accountName}",
    "networkAcls": { "defaultAction": "Allow" },
    "publicNetworkAccess": "Enabled"
  }
}
```

### Deployments

**List deployments:**

```http
GET https://management.azure.com/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.CognitiveServices/accounts/{accountName}/deployments?api-version=2023-10-01-preview
```

**Create deployment:**

```http
PUT https://management.azure.com/.../accounts/{accountName}/deployments/{deploymentName}?api-version=2023-10-01-preview
{
  "sku": { "name": "Standard", "capacity": 120 },
  "properties": {
    "model": {
      "format": "OpenAI",
      "name": "gpt-4o",
      "version": "2024-05-13"
    },
    "versionUpgradeOption": "OnceCurrentVersionExpired"
  }
}
```

**Capacity units:** `capacity` is in thousands-of-tokens-per-minute (TPM). A capacity of `120` = 120,000 TPM.

**Available models (as of 2026):** `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`, `gpt-35-turbo`, `text-embedding-3-large`, `text-embedding-3-small`, `text-embedding-ada-002`, `dall-e-3`, `whisper`

### Quota Management

**Get quota usage:**

```http
GET https://management.azure.com/subscriptions/{sub}/providers/Microsoft.CognitiveServices/locations/{location}/usages?api-version=2023-10-01-preview
```

Response includes current value and limit per model family.

**Quota limits by region:** Quota is shared across all deployments in a subscription per region per model family. Monitor `currentValue / limit` to avoid throttling.

### Content Filters

**List content filter policies:**

```http
GET https://management.azure.com/.../accounts/{accountName}/raiPolicies?api-version=2023-10-01-preview
```

**Create custom content filter policy:**

```http
PUT .../accounts/{accountName}/raiPolicies/{policyName}
{
  "properties": {
    "mode": "Default",
    "contentFilters": [
      { "name": "Hate", "blocking": true, "enabled": true, "severityThreshold": "Medium", "source": "Prompt" },
      { "name": "Hate", "blocking": true, "enabled": true, "severityThreshold": "Medium", "source": "Completion" },
      { "name": "Violence", "blocking": true, "enabled": true, "severityThreshold": "Low", "source": "Prompt" },
      { "name": "Violence", "blocking": true, "enabled": true, "severityThreshold": "Low", "source": "Completion" },
      { "name": "SelfHarm", "blocking": true, "enabled": true, "severityThreshold": "Low", "source": "Prompt" },
      { "name": "SelfHarm", "blocking": true, "enabled": true, "severityThreshold": "Low", "source": "Completion" },
      { "name": "Sexual", "blocking": true, "enabled": true, "severityThreshold": "Medium", "source": "Prompt" },
      { "name": "Sexual", "blocking": true, "enabled": true, "severityThreshold": "Medium", "source": "Completion" }
    ]
  }
}
```

**Assign content filter to deployment** by including `raiPolicyName` in the deployment `properties`.

### Data Plane (Completions)

```
https://{accountName}.openai.azure.com/openai/deployments/{deploymentName}/chat/completions?api-version=2024-02-01
```

Authentication: `api-key` header (key-based) or `Authorization: Bearer {entra-token}` (managed identity — preferred).

## Azure AI Search

### ARM Resource Type

`Microsoft.Search/searchServices`

**Create search service:**

```http
PUT https://management.azure.com/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Search/searchServices/{serviceName}?api-version=2023-11-01
{
  "location": "eastus",
  "sku": { "name": "standard" },
  "properties": {
    "replicaCount": 1,
    "partitionCount": 1,
    "hostingMode": "default",
    "publicNetworkAccess": "enabled",
    "semanticSearch": "standard"
  }
}
```

**SKU options:** `free` (1 index, 50 MB), `basic` (15 indexes, 2 GB), `standard` (50 indexes, 25 GB/partition), `standard2`, `standard3`, `storage_optimized_l1`, `storage_optimized_l2`

### Index Schema (Data Plane)

```
https://{serviceName}.search.windows.net
```

**Create index with vector support:**

```json
{
  "name": "products-index",
  "fields": [
    { "name": "id", "type": "Edm.String", "key": true, "retrievable": true },
    { "name": "title", "type": "Edm.String", "searchable": true, "retrievable": true, "analyzer": "en.microsoft" },
    { "name": "content", "type": "Edm.String", "searchable": true, "retrievable": true },
    { "name": "category", "type": "Edm.String", "filterable": true, "facetable": true, "retrievable": true },
    {
      "name": "contentVector",
      "type": "Collection(Edm.Single)",
      "searchable": true,
      "retrievable": false,
      "dimensions": 1536,
      "vectorSearchProfile": "hnsw-profile"
    }
  ],
  "vectorSearch": {
    "profiles": [{ "name": "hnsw-profile", "algorithm": "hnsw-config" }],
    "algorithms": [{ "name": "hnsw-config", "kind": "hnsw", "hnswParameters": { "m": 4, "efConstruction": 400, "efSearch": 500, "metric": "cosine" } }]
  },
  "semantic": {
    "configurations": [{
      "name": "semantic-config",
      "prioritizedFields": {
        "titleField": { "fieldName": "title" },
        "contentFields": [{ "fieldName": "content" }]
      }
    }]
  }
}
```

### Indexer and Data Source

**Create Blob data source:**

```json
{
  "name": "blob-datasource",
  "type": "azureblob",
  "credentials": { "connectionString": "DefaultEndpointsProtocol=https;..." },
  "container": { "name": "documents", "query": null }
}
```

**Create indexer with skillset:**

```json
{
  "name": "blob-indexer",
  "dataSourceName": "blob-datasource",
  "targetIndexName": "products-index",
  "skillsetName": "enrichment-skillset",
  "schedule": { "interval": "PT2H" },
  "parameters": { "configuration": { "dataToExtract": "contentAndMetadata", "parsingMode": "default" } }
}
```

### Skillsets

Built-in cognitive skills: `OcrSkill`, `ImageAnalysisSkill`, `MergeSkill`, `SplitSkill`, `EntityRecognitionSkill`, `KeyPhraseExtractionSkill`, `LanguageDetectionSkill`, `SentimentSkill`, `TranslationSkill`

**Custom Web API skill** for calling Azure OpenAI embeddings during indexing:

```json
{
  "@odata.type": "#Microsoft.Skills.Custom.WebApiSkill",
  "name": "embedding-skill",
  "uri": "https://{functionApp}.azurewebsites.net/api/GenerateEmbedding",
  "httpMethod": "POST",
  "inputs": [{ "name": "text", "source": "/document/content" }],
  "outputs": [{ "name": "embedding", "targetName": "contentVector" }]
}
```

### Search Queries

**Hybrid search (keyword + vector):**

```json
{
  "search": "renewable energy storage",
  "vectorQueries": [{
    "kind": "vector",
    "vector": [0.123, -0.456, ...],
    "k": 5,
    "fields": "contentVector"
  }],
  "queryType": "semantic",
  "semanticConfiguration": "semantic-config",
  "queryLanguage": "en-us",
  "top": 10,
  "select": "id,title,content,category",
  "filter": "category eq 'technology'"
}
```

## Azure AI Studio / AI Foundry

AI Studio is deployed as ARM resources under `Microsoft.MachineLearningServices/workspaces` with `kind: Hub` or `kind: Project`.

**Create AI Hub:**

```http
PUT https://management.azure.com/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.MachineLearningServices/workspaces/{hubName}?api-version=2024-01-01-preview
{
  "kind": "Hub",
  "location": "eastus",
  "identity": { "type": "SystemAssigned" },
  "properties": {
    "friendlyName": "My AI Hub",
    "storageAccount": "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Storage/storageAccounts/{sa}",
    "keyVault": "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.KeyVault/vaults/{kv}",
    "applicationInsights": "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Insights/components/{ai}"
  }
}
```

**Create AI Project under Hub:**

```http
PUT .../workspaces/{projectName}?api-version=2024-01-01-preview
{
  "kind": "Project",
  "location": "eastus",
  "properties": {
    "friendlyName": "My AI Project",
    "hubResourceId": "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.MachineLearningServices/workspaces/{hubName}"
  }
}
```

**Add connection (Azure OpenAI endpoint):**

```http
PUT .../workspaces/{projectName}/connections/{connectionName}?api-version=2024-01-01-preview
{
  "properties": {
    "category": "AzureOpenAI",
    "target": "https://{openaiAccountName}.openai.azure.com/",
    "authType": "ApiKey",
    "credentials": { "key": "{api-key}" }
  }
}
```

## Responsible AI Governance

### Checklist for New Deployments

- [ ] Content filter policy reviewed and applied (not using `Microsoft.Default` in production)
- [ ] DALL-E image generation has `Jailbreak` filter enabled
- [ ] Model monitoring configured for hallucination and toxicity scoring
- [ ] No API keys stored in code — use managed identity or Key Vault reference
- [ ] Network access restricted to VNet or Private Endpoint for production
- [ ] Diagnostic logs exported to Log Analytics workspace
- [ ] Quota alerts set (80% threshold on TPM)
- [ ] Usage metering reviewed monthly

### Throttling and Error Handling

| Status | Error code | Cause | Fix |
|---|---|---|---|
| 429 | `RateLimitReached` | TPM quota exhausted | Retry with exponential backoff; consider raising quota |
| 429 | `TokensPerMinuteExceeded` | Per-minute burst exceeded | Add jitter to retry; use streaming to reduce perceived latency |
| 400 | `content_filter` | Content filter triggered | Review prompt for policy-violating content |
| 404 | `DeploymentNotFound` | Deployment name typo or not deployed | List deployments and confirm name |
| 503 | `ServiceUnavailable` | Regional outage | Check Azure status; retry with backoff |

## Output Convention

Every operation produces a structured markdown report:

1. **Header**: operation, timestamp, resource location
2. **Resource summary**: resource ID, SKU, status
3. **Deployment table**: model, version, capacity (TPM), status
4. **Quota table**: current usage / limit by model family
5. **Recommendations**: quota headroom, governance gaps, cost observations

## Azure CLI Quick Reference

Common `az` commands for managing Azure AI resources. These complement the ARM REST API operations documented above.

### Account Lifecycle

```bash
# Create Azure OpenAI resource (see Step 2 in setup command)
az cognitiveservices account create --name <account> --resource-group <rg> --kind OpenAI --sku S0 --location eastus --custom-domain <account> --yes

# Delete account
az cognitiveservices account delete --name <account> --resource-group <rg>

# Update account
az cognitiveservices account update --name <account> --resource-group <rg> --custom-domain <domain> --public-network-access Disabled

# List keys
az cognitiveservices account keys list --name <account> --resource-group <rg>

# Regenerate keys
az cognitiveservices account keys regenerate --name <account> --resource-group <rg> --key-name key1
az cognitiveservices account keys regenerate --name <account> --resource-group <rg> --key-name key2
```

### Deployment Lifecycle

```bash
# List deployments
az cognitiveservices account deployment list --name <account> --resource-group <rg> -o table

# Create deployment
az cognitiveservices account deployment create --name <account> --resource-group <rg> --deployment-name <deployment> --model-name gpt-4o --model-version 2024-05-13 --model-format OpenAI --sku-capacity 30 --sku-name Standard

# Delete deployment
az cognitiveservices account deployment delete --name <account> --resource-group <rg> --deployment-name <deployment>

# Update deployment (scale TPM)
az cognitiveservices account deployment update --name <account> --resource-group <rg> --deployment-name <deployment> --capacity 120
```

### Network Security

```bash
# Add network rule (VNet)
az cognitiveservices account network-rule add --name <account> --resource-group <rg> --subnet <subnet-id>

# Add IP rule
az cognitiveservices account network-rule add --name <account> --resource-group <rg> --ip-address 203.0.113.0/24

# List network rules
az cognitiveservices account network-rule list --name <account> --resource-group <rg>

# Remove network rule
az cognitiveservices account network-rule remove --name <account> --resource-group <rg> --subnet <subnet-id>

# Set default action to Deny (restrict to allowed networks only)
az cognitiveservices account update --name <account> --resource-group <rg> --custom-domain <domain> --api-properties "{\"networkAcls\":{\"defaultAction\":\"Deny\"}}"
```

### Azure AI Search CLI

```bash
# Create search service
az search service create --name <search> --resource-group <rg> --sku Standard --location eastus --partition-count 1 --replica-count 1 --semantic-search standard

# Delete search service
az search service delete --name <search> --resource-group <rg> --yes

# Update search service (scale)
az search service update --name <search> --resource-group <rg> --replica-count 3 --partition-count 2

# Query keys
az search query-key create --name "<key-name>" --resource-group <rg> --service-name <search>
az search query-key list --resource-group <rg> --service-name <search> --output table
az search query-key delete --key-value <key> --resource-group <rg> --service-name <search>

# Admin key regeneration
az search admin-key renew --key-kind primary --resource-group <rg> --service-name <search>
```

### Monitoring and Diagnostics

```bash
# Create diagnostic settings for a Cognitive Services resource
az monitor diagnostic-settings create --resource <cognitive-resource-id> --name "ai-diag" --workspace <workspace-id> --logs '[{"categoryGroup":"allLogs","enabled":true}]' --metrics '[{"category":"AllMetrics","enabled":true}]'

# List diagnostic settings
az monitor diagnostic-settings list --resource <cognitive-resource-id>

# Delete diagnostic settings
az monitor diagnostic-settings delete --resource <cognitive-resource-id> --name "ai-diag"

# List metric alerts
az monitor metrics alert list --resource-group <rg> --output table

# Delete metric alert
az monitor metrics alert delete --resource-group <rg> --name "<alert-name>"
```

## Reference Files

| Reference | Path | Topics |
|---|---|---|
| Azure OpenAI Reference | `references/azure-openai-reference.md` | Deployments, models, quotas, fine-tuning, content filters, data plane, monitoring |
| AI Search Reference | `references/ai-search-reference.md` | Index schema, vector fields, indexers, skillsets, semantic ranking, hybrid search |

## Progressive Disclosure — Reference Files

| Topic | File |
|---|---|
| Azure OpenAI REST API, deployments, chat completions, embeddings, function calling, streaming, content filtering, BYOD, rate limits | [`references/azure-openai-reference.md`](./references/azure-openai-reference.md) |
| AI Search index schema, vector fields, indexers, skillsets, semantic ranking, hybrid search queries | [`references/ai-search-reference.md`](./references/ai-search-reference.md) |
| Language Service (sentiment, NER, PII, summarization, CLU), Translator, Text Analytics for Health, QnA → Custom QA migration | [`references/cognitive-services.md`](./references/cognitive-services.md) |
| Document Intelligence REST API v4.0, prebuilt models, custom/neural models, composed models, confidence scores, bounding polygons | [`references/document-intelligence.md`](./references/document-intelligence.md) |
| Speech SDK (STT/TTS/translation/speaker recognition), Computer Vision 4.0 (analyze/OCR), Video Indexer, Face API retirement | [`references/speech-vision.md`](./references/speech-vision.md) |
