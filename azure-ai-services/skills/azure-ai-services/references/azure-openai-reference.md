# Azure OpenAI Service Reference

## Resource Management (ARM)

### Resource Type

`Microsoft.CognitiveServices/accounts` with `kind: OpenAI`

### API Version

Use `api-version=2023-10-01-preview` for management operations.

### Supported Regions (as of 2026)

Primary: `eastus`, `eastus2`, `westus`, `westus3`, `swedencentral`, `uksouth`, `westeurope`, `francecentral`, `germanywestcentral`, `norwayeast`, `canadaeast`, `australiaeast`, `japaneast`, `southindia`

Model availability varies by region — always check before provisioning.

### Create Azure OpenAI Resource

```http
PUT https://management.azure.com/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.CognitiveServices/accounts/{accountName}?api-version=2023-10-01-preview
{
  "kind": "OpenAI",
  "sku": { "name": "S0" },
  "location": "eastus",
  "properties": {
    "customSubDomainName": "{accountName}",
    "publicNetworkAccess": "Enabled",
    "networkAcls": { "defaultAction": "Allow" },
    "restore": false
  },
  "identity": { "type": "SystemAssigned" }
}
```

### Get Keys

```http
POST https://management.azure.com/.../accounts/{accountName}/listKeys?api-version=2023-10-01-preview
```

**Never expose keys in code.** Use managed identity (`Cognitive Services OpenAI User` role on the resource) instead.

### Rotate Keys

```http
POST .../accounts/{accountName}/regenerateKey
{ "keyName": "key1" }
```

## Deployments

### Model Catalog (2026)

| Model | Max context | Use case |
|---|---|---|
| `gpt-4o` | 128k tokens | General purpose, multimodal |
| `gpt-4o-mini` | 128k tokens | Fast, cost-effective tasks |
| `gpt-4-turbo` | 128k tokens | Complex reasoning |
| `gpt-35-turbo` | 16k tokens | High-volume, low-cost |
| `text-embedding-3-large` | 8,191 tokens | High-quality embeddings (3072 dims) |
| `text-embedding-3-small` | 8,191 tokens | Efficient embeddings (1536 dims) |
| `text-embedding-ada-002` | 8,191 tokens | Legacy embeddings (1536 dims) |
| `dall-e-3` | N/A | Image generation |
| `whisper` | N/A | Speech transcription |
| `tts` | N/A | Text-to-speech |

### Deployment SKUs

| SKU name | Description |
|---|---|
| `Standard` | Pay-per-token, shared infrastructure |
| `GlobalStandard` | Cross-region routing for higher throughput |
| `DataZoneStandard` | Data processed within a geo zone |
| `ProvisionedManaged` | Reserved throughput (PTU model) |

**Capacity** for Standard SKU = thousands of tokens per minute (TPM). E.g., `capacity: 30` = 30,000 TPM.

### Create Deployment

```http
PUT https://management.azure.com/.../accounts/{accountName}/deployments/{deploymentName}?api-version=2023-10-01-preview
{
  "sku": { "name": "Standard", "capacity": 30 },
  "properties": {
    "model": {
      "format": "OpenAI",
      "name": "gpt-4o",
      "version": "2024-05-13"
    },
    "versionUpgradeOption": "OnceCurrentVersionExpired",
    "raiPolicyName": "my-content-filter-policy"
  }
}
```

`versionUpgradeOption` values: `OnceNewDefaultVersionAvailable`, `OnceCurrentVersionExpired`, `NoAutoUpgrade`

### List Deployments

```http
GET .../accounts/{accountName}/deployments?api-version=2023-10-01-preview
```

### Delete Deployment

```http
DELETE .../accounts/{accountName}/deployments/{deploymentName}?api-version=2023-10-01-preview
```

## Quota Management

### Get Regional Quota Usage

```http
GET https://management.azure.com/subscriptions/{sub}/providers/Microsoft.CognitiveServices/locations/{region}/usages?api-version=2023-10-01-preview
```

Response example:

```json
{
  "value": [
    {
      "name": { "value": "OpenAI.Standard.gpt-4o", "localizedValue": "Standard gpt-4o" },
      "unit": "Count",
      "currentValue": 120,
      "limit": 480
    }
  ]
}
```

`currentValue` and `limit` are in thousands of TPM (same unit as deployment `capacity`).

### Quota Request (via Azure Portal or Support Ticket)

Programmatic quota increase is not available via API — must go through Azure support portal or the quota request form in Azure OpenAI Studio.

## Fine-Tuning

### Create Fine-Tuning Job

```http
POST https://{accountName}.openai.azure.com/openai/fine_tuning/jobs?api-version=2024-05-01-preview
Content-Type: application/json

{
  "model": "gpt-35-turbo-0125",
  "training_file": "{training-file-id}",
  "validation_file": "{validation-file-id}",
  "hyperparameters": {
    "n_epochs": 3,
    "batch_size": 1,
    "learning_rate_multiplier": 1
  },
  "suffix": "my-finetuned-model"
}
```

**Fine-tunable models:** `gpt-35-turbo-0125`, `gpt-4-0613` (limited preview), `babbage-002`, `davinci-002`

### Training File Format (JSONL)

```jsonl
{"messages": [{"role": "system", "content": "You are a helpful assistant."}, {"role": "user", "content": "What is Azure?"}, {"role": "assistant", "content": "Azure is Microsoft's cloud platform..."}]}
{"messages": [{"role": "user", "content": "How do I create a VM?"}, {"role": "assistant", "content": "To create a VM in Azure..."}]}
```

### Upload Training File

```http
POST https://{accountName}.openai.azure.com/openai/files?api-version=2024-05-01-preview
Content-Type: multipart/form-data; boundary=----
------
Content-Disposition: form-data; name="purpose"
fine-tune
------
Content-Disposition: form-data; name="file"; filename="training.jsonl"
[file content]
------
```

### Monitor Fine-Tuning Job

```http
GET https://{accountName}.openai.azure.com/openai/fine_tuning/jobs/{jobId}?api-version=2024-05-01-preview
```

Status values: `validating_files`, `queued`, `running`, `succeeded`, `failed`, `cancelled`

## Content Filter Policies

### Categories

| Category | Levels | Notes |
|---|---|---|
| `Hate` | Low, Medium, High | Hate speech and discriminatory content |
| `Violence` | Low, Medium, High | Violent or graphic content |
| `SelfHarm` | Low, Medium, High | Content promoting self-harm |
| `Sexual` | Low, Medium, High | Explicit sexual content |
| `Profanity` | On/Off | Block profane language |
| `Jailbreak` | On/Off | Prompt injection / jailbreak attempts |
| `IndirectAttack` | On/Off | Indirect prompt injections via data |
| `ProtectedMaterial` | On/Off | Copyright-protected text |

### Severity Threshold Behavior

Setting threshold to `Low` = blocks content at Low, Medium, and High severity.
Setting to `Medium` = blocks Medium and High only.
Setting to `High` = only blocks High severity content.

### Microsoft Default Policy

The built-in `Microsoft.Default` policy uses Medium thresholds for all categories. Do not modify the default policy — create named custom policies for production.

## Data Plane API

### Base URL

```
https://{accountName}.openai.azure.com/openai/deployments/{deploymentName}/
```

### Chat Completions

```
POST .../chat/completions?api-version=2024-02-01
```

### Embeddings

```
POST .../embeddings?api-version=2024-02-01
{
  "input": ["Text to embed"],
  "encoding_format": "float"  // or "base64" for compact transfer
}
```

Embedding dimensions: `text-embedding-3-large` = 3072 (or reduced via `dimensions` param), `text-embedding-3-small` = 1536, `ada-002` = 1536.

### Streaming

Add `"stream": true` to request; server sends SSE events. Use `stream_options: {"include_usage": true}` to get token usage on the final `[DONE]` chunk.

### Authentication Options

| Method | How | Recommendation |
|---|---|---|
| API key | `api-key: {key}` header | Dev/test only |
| Entra ID token | `Authorization: Bearer {token}` | Production (managed identity) |
| Managed identity | `DefaultAzureCredential` with `Cognitive Services OpenAI User` role | Production (preferred) |

## Monitoring and Diagnostics

### Enable Diagnostic Settings (ARM)

```http
PUT https://management.azure.com/.../accounts/{accountName}/providers/microsoft.insights/diagnosticSettings/openai-logs?api-version=2021-05-01-preview
{
  "properties": {
    "workspaceId": "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.OperationalInsights/workspaces/{ws}",
    "logs": [
      { "category": "Audit", "enabled": true },
      { "category": "RequestResponse", "enabled": true }
    ],
    "metrics": [
      { "category": "AllMetrics", "enabled": true }
    ]
  }
}
```

### Key Metrics

| Metric | Description | Alert threshold |
|---|---|---|
| `TokenTransaction` | Total tokens processed | — |
| `ProcessedPromptTokens` | Prompt tokens | — |
| `GeneratedCompletionTokens` | Completion tokens | — |
| `AzureOpenAIRequests` | Total API requests | — |
| `ContentFilteredRequests` | Requests blocked by content filter | > 1% of total |
| `ThrottledRequests` | Rate-limited requests | > 5% of total |

### KQL Alert Query (Log Analytics)

```kql
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.COGNITIVESERVICES"
| where OperationName == "ChatCompletions_Create"
| where ResultSignature == "429"
| summarize ThrottledCount = count() by bin(TimeGenerated, 5m), Resource
| where ThrottledCount > 10
```

## Throttling and Retry

| Status | Code | Retry strategy |
|---|---|---|
| 429 | `RateLimitReached` | Retry-After header (seconds) + exponential backoff |
| 429 | `TokensPerMinuteExceeded` | Retry after 1s + jitter |
| 503 | `ServiceUnavailable` | Retry after 5s (max 3 retries) |
| 400 | `content_filter` | Do not retry — review prompt |
| 400 | `context_length_exceeded` | Truncate prompt — do not retry blindly |

**Recommended retry pattern:**

```typescript
async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 5): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      if (e.status === 429 && attempt < maxAttempts) {
        const retryAfter = parseInt(e.headers?.["retry-after"] ?? "1", 10);
        const delay = retryAfter * 1000 * Math.pow(2, attempt - 1) + Math.random() * 1000;
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw e;
    }
  }
  throw new Error("Max retry attempts exceeded");
}
```
