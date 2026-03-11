---
name: Azure OpenAI
description: >
  Deep expertise in Azure OpenAI Service — deploy and manage GPT-4o, GPT-4, GPT-3.5-Turbo,
  Embeddings, DALL-E, Whisper, and TTS models. Covers Standard, Provisioned-Managed, and
  Global Standard deployment types, fine-tuning workflows, content filtering policies, prompt
  engineering patterns, Batch API, quota management, and secure production architectures.
  Uses az cognitiveservices CLI and Azure OpenAI REST API for all operations.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - azure openai
  - openai deployment
  - gpt deployment
  - azure openai fine-tuning
  - content filter
  - openai quota
  - openai batch
  - azure openai model
  - prompt engineering azure
  - dalle azure
  - whisper azure
  - embedding deployment
---

# Azure OpenAI Service

## Shared Workflow Routing
- Use the shared workflow spec for deterministic multi-plugin routing: [`workflows/multi-plugin-workflows.md`](../../../workflows/multi-plugin-workflows.md).
- Apply the trigger phrases, handoff contracts, auth prerequisites, validation checkpoints, and stop conditions before escalating to the next plugin.


## 1. Azure OpenAI Overview

Azure OpenAI Service provides REST API access to OpenAI's language models including GPT-4o, GPT-4, GPT-3.5-Turbo, Embeddings (text-embedding-ada-002, text-embedding-3-small, text-embedding-3-large), DALL-E 3, Whisper, and TTS. Models run on Azure infrastructure with enterprise security, compliance, and regional data residency.

**Azure OpenAI vs OpenAI API**:
| Aspect | Azure OpenAI | OpenAI API |
|--------|-------------|------------|
| Authentication | Azure AD / API key | API key only |
| Data residency | Regional (your chosen Azure region) | US-based |
| Network isolation | Private endpoints, VNet integration | Public only |
| Compliance | SOC 2, HIPAA, FedRAMP, ISO 27001 | SOC 2 |
| Content filtering | Built-in, configurable | Moderation API (separate) |
| SLA | 99.9% uptime | Best effort |
| Fine-tuning | Supported (GPT-4o-mini, GPT-3.5-Turbo) | Supported |
| Billing | Azure subscription, PTU or pay-per-token | Credit-based |
| Model availability | Phased regional rollout | Global immediate |

**Pricing models**:
| Pricing Type | Description | Best For |
|-------------|-------------|----------|
| Pay-As-You-Go (Standard) | Per 1K tokens consumed | Variable, unpredictable workloads |
| Provisioned Throughput (PTU) | Reserved compute units, fixed hourly | Consistent high-volume production |
| Global Standard | Cross-region routing, pay-per-token | Global apps with latency optimization |
| Global Provisioned | Cross-region routing, reserved PTU | Global apps with guaranteed throughput |

**Supported models (as of 2026)**:
| Model Family | Models | Capabilities |
|-------------|--------|-------------|
| GPT-4o | gpt-4o, gpt-4o-mini | Text + vision, function calling, JSON mode |
| GPT-4 | gpt-4, gpt-4-turbo, gpt-4-32k | Text generation, function calling |
| GPT-3.5 | gpt-35-turbo, gpt-35-turbo-16k | Text generation, fine-tuning |
| o-series | o1, o1-mini, o3-mini | Reasoning, chain-of-thought |
| Embeddings | text-embedding-ada-002, text-embedding-3-small, text-embedding-3-large | Vector embeddings |
| DALL-E | dall-e-3 | Image generation |
| Whisper | whisper | Speech-to-text |
| TTS | tts, tts-hd | Text-to-speech |

**Regional availability**: Not all models are available in all regions. Check the Azure OpenAI model availability matrix before selecting a deployment region. Key regions with broad model support: East US, East US 2, West US, West US 3, Sweden Central, UK South, France Central, Japan East, Australia East.


## 2. Resource & Deployment Management

### Create an Azure OpenAI Resource

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
  --custom-domain my-openai-resource

# Verify the resource
az cognitiveservices account show \
  --name my-openai-resource \
  --resource-group rg-openai \
  --query "{Name:name, Endpoint:properties.endpoint, ProvisioningState:properties.provisioningState}"

# List all OpenAI resources in subscription
az cognitiveservices account list \
  --query "[?kind=='OpenAI'].{Name:name, RG:resourceGroup, Location:location, State:properties.provisioningState}" \
  --output table

# Get keys
az cognitiveservices account keys list \
  --name my-openai-resource \
  --resource-group rg-openai

# Regenerate key
az cognitiveservices account keys regenerate \
  --name my-openai-resource \
  --resource-group rg-openai \
  --key-name key1
```

**Custom domain** is required for Azure AD authentication. Set `--custom-domain` at creation time (cannot be changed later).

### Deploy Models

**Deployment types comparison**:
| Type | Billing | Scaling | Latency | Use Case |
|------|---------|---------|---------|----------|
| Standard | Pay-per-token (TPM) | Auto, shared capacity | Variable | Dev/test, low-moderate traffic |
| Provisioned-Managed (PTU) | Hourly reserved units | Fixed, dedicated compute | Consistent, low | Production with predictable volume |
| Global Standard | Pay-per-token, cross-region | Auto, global routing | Optimized | Global apps, multi-region failover |
| Global Provisioned | Hourly reserved, cross-region | Fixed, global routing | Consistent | Global production, guaranteed throughput |

```bash
# Deploy a GPT-4o model (Standard)
az cognitiveservices account deployment create \
  --name my-openai-resource \
  --resource-group rg-openai \
  --deployment-name gpt4o-deployment \
  --model-name gpt-4o \
  --model-version "2024-08-06" \
  --model-format OpenAI \
  --sku-name Standard \
  --sku-capacity 30

# Deploy GPT-4o-mini (Standard)
az cognitiveservices account deployment create \
  --name my-openai-resource \
  --resource-group rg-openai \
  --deployment-name gpt4o-mini-deploy \
  --model-name gpt-4o-mini \
  --model-version "2024-07-18" \
  --model-format OpenAI \
  --sku-name Standard \
  --sku-capacity 50

# Deploy with Provisioned Throughput (PTU)
az cognitiveservices account deployment create \
  --name my-openai-resource \
  --resource-group rg-openai \
  --deployment-name gpt4o-ptu \
  --model-name gpt-4o \
  --model-version "2024-08-06" \
  --model-format OpenAI \
  --sku-name ProvisionedManaged \
  --sku-capacity 50

# Deploy Global Standard
az cognitiveservices account deployment create \
  --name my-openai-resource \
  --resource-group rg-openai \
  --deployment-name gpt4o-global \
  --model-name gpt-4o \
  --model-version "2024-08-06" \
  --model-format OpenAI \
  --sku-name GlobalStandard \
  --sku-capacity 80

# Deploy an embeddings model
az cognitiveservices account deployment create \
  --name my-openai-resource \
  --resource-group rg-openai \
  --deployment-name embedding-deploy \
  --model-name text-embedding-3-small \
  --model-version "1" \
  --model-format OpenAI \
  --sku-name Standard \
  --sku-capacity 120

# Deploy DALL-E 3
az cognitiveservices account deployment create \
  --name my-openai-resource \
  --resource-group rg-openai \
  --deployment-name dalle3-deploy \
  --model-name dall-e-3 \
  --model-version "3.0" \
  --model-format OpenAI \
  --sku-name Standard \
  --sku-capacity 1

# Deploy Whisper
az cognitiveservices account deployment create \
  --name my-openai-resource \
  --resource-group rg-openai \
  --deployment-name whisper-deploy \
  --model-name whisper \
  --model-version "001" \
  --model-format OpenAI \
  --sku-name Standard \
  --sku-capacity 1

# List deployments
az cognitiveservices account deployment list \
  --name my-openai-resource \
  --resource-group rg-openai \
  --query "[].{Name:name, Model:properties.model.name, Version:properties.model.version, SKU:sku.name, Capacity:sku.capacity, State:properties.provisioningState}" \
  --output table

# Update deployment capacity (scale up/down)
az cognitiveservices account deployment create \
  --name my-openai-resource \
  --resource-group rg-openai \
  --deployment-name gpt4o-deployment \
  --model-name gpt-4o \
  --model-version "2024-08-06" \
  --model-format OpenAI \
  --sku-name Standard \
  --sku-capacity 60

# Delete a deployment
az cognitiveservices account deployment delete \
  --name my-openai-resource \
  --resource-group rg-openai \
  --deployment-name gpt4o-deployment
```

### Model Version Upgrades

Azure OpenAI models have version deprecation timelines. When a model version is deprecated, deployments using that version must be upgraded.

```bash
# List available model versions
az cognitiveservices account list-models \
  --name my-openai-resource \
  --resource-group rg-openai \
  --query "[?name=='gpt-4o'].{Name:name, Version:version, LifecycleStatus:lifecycleStatus}" \
  --output table

# Update deployment to a new model version
az cognitiveservices account deployment create \
  --name my-openai-resource \
  --resource-group rg-openai \
  --deployment-name gpt4o-deployment \
  --model-name gpt-4o \
  --model-version "2024-11-20" \
  --model-format OpenAI \
  --sku-name Standard \
  --sku-capacity 30
```

**Auto-update policy**: Deployments can be set to auto-update to the latest GA version. For production, pin to a specific version and test before upgrading.


## 3. Model Catalog & Selection

### Model Selection Guide

| Use Case | Recommended Model | Reasoning |
|----------|------------------|-----------|
| General chat/completion | gpt-4o | Best quality-to-cost ratio, multimodal |
| Cost-sensitive, simple tasks | gpt-4o-mini | Low cost, fast, good for classification/extraction |
| Complex reasoning | o1 or o3-mini | Built-in chain-of-thought, math, code |
| Legacy workloads | gpt-35-turbo | Cheapest, fine-tuning support |
| Semantic search / RAG | text-embedding-3-small | Good quality, low dimensions (1536) |
| High-precision embeddings | text-embedding-3-large | Best quality, configurable dimensions (up to 3072) |
| Image generation | dall-e-3 | Highest quality, prompt adherence |
| Speech transcription | whisper | Multi-language, timestamps |
| Speech synthesis | tts / tts-hd | Natural voices, multiple languages |

### Deprecation Awareness

Models follow a lifecycle: Preview -> GA -> Deprecated -> Retired. Monitor deprecation timelines:

```bash
# Check model lifecycle status
az cognitiveservices account list-models \
  --name my-openai-resource \
  --resource-group rg-openai \
  --query "[].{Name:name, Version:version, Status:lifecycleStatus, Deprecation:deprecation.inference}" \
  --output table
```

Always plan model version migrations 30+ days before retirement dates. Test new versions in a staging deployment before updating production.


## 4. Fine-Tuning

Fine-tuning customizes a base model with your own training data to improve performance on specific tasks, reduce prompt length, and lower inference costs.

**Supported models for fine-tuning**: gpt-4o-mini, gpt-35-turbo-0613, gpt-35-turbo-1106, gpt-35-turbo-0125.

### Training Data Format

Training data must be in JSONL format with chat completion messages:

```jsonl
{"messages": [{"role": "system", "content": "You are a customer support agent for Contoso."}, {"role": "user", "content": "How do I reset my password?"}, {"role": "assistant", "content": "To reset your password, go to Settings > Security > Change Password. Enter your current password and your new password twice. Click Save."}]}
{"messages": [{"role": "system", "content": "You are a customer support agent for Contoso."}, {"role": "user", "content": "What are your business hours?"}, {"role": "assistant", "content": "Our business hours are Monday through Friday, 9 AM to 5 PM Eastern Time. We are closed on weekends and federal holidays."}]}
```

**Data requirements**:
- Minimum 10 examples (50-100+ recommended for good results)
- Maximum file size: 512 MB per file
- Each example must include at least one user message and one assistant message
- System messages should be consistent across examples
- Validation split is automatic (or provide a separate validation file)

### Fine-Tuning Workflow via REST API

```bash
RESOURCE_NAME="my-openai-resource"
API_VERSION="2024-08-01-preview"
BASE_URL="https://${RESOURCE_NAME}.openai.azure.com/openai"

# Step 1: Upload training file
curl -X POST "${BASE_URL}/files?api-version=${API_VERSION}" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -F "purpose=fine-tune" \
  -F "file=@training_data.jsonl"
# Response includes file ID: "file-abc123"

# Step 2: Upload validation file (optional)
curl -X POST "${BASE_URL}/files?api-version=${API_VERSION}" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -F "purpose=fine-tune" \
  -F "file=@validation_data.jsonl"

# Step 3: Check file processing status
curl -X GET "${BASE_URL}/files/file-abc123?api-version=${API_VERSION}" \
  -H "api-key: ${AZURE_OPENAI_KEY}"
# Wait until status is "processed"

# Step 4: Create fine-tuning job
curl -X POST "${BASE_URL}/fine_tuning/jobs?api-version=${API_VERSION}" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "training_file": "file-abc123",
    "validation_file": "file-def456",
    "hyperparameters": {
      "n_epochs": 3,
      "batch_size": 1,
      "learning_rate_multiplier": 1.0
    },
    "suffix": "contoso-support"
  }'
# Response includes job ID: "ftjob-xyz789"

# Step 5: Monitor training progress
curl -X GET "${BASE_URL}/fine_tuning/jobs/ftjob-xyz789?api-version=${API_VERSION}" \
  -H "api-key: ${AZURE_OPENAI_KEY}"

# Step 6: List fine-tuning events (training logs)
curl -X GET "${BASE_URL}/fine_tuning/jobs/ftjob-xyz789/events?api-version=${API_VERSION}" \
  -H "api-key: ${AZURE_OPENAI_KEY}"

# Step 7: Deploy the fine-tuned model
az cognitiveservices account deployment create \
  --name my-openai-resource \
  --resource-group rg-openai \
  --deployment-name contoso-support-ft \
  --model-name "gpt-4o-mini.ft-contoso-support" \
  --model-version "1" \
  --model-format OpenAI \
  --sku-name Standard \
  --sku-capacity 20

# List fine-tuning jobs
curl -X GET "${BASE_URL}/fine_tuning/jobs?api-version=${API_VERSION}" \
  -H "api-key: ${AZURE_OPENAI_KEY}"

# Cancel a running job
curl -X POST "${BASE_URL}/fine_tuning/jobs/ftjob-xyz789/cancel?api-version=${API_VERSION}" \
  -H "api-key: ${AZURE_OPENAI_KEY}"

# Delete a fine-tuned model
curl -X DELETE "${BASE_URL}/fine_tuning/jobs/ftjob-xyz789?api-version=${API_VERSION}" \
  -H "api-key: ${AZURE_OPENAI_KEY}"
```

### Hyperparameter Tuning

| Parameter | Default | Range | Guidance |
|-----------|---------|-------|----------|
| n_epochs | auto (typically 3) | 1-25 | Start with auto; increase if underfitting, decrease if overfitting |
| batch_size | auto | 1-256 | Larger batches = smoother training; auto works well |
| learning_rate_multiplier | auto | 0.01-5.0 | Lower = more conservative; increase if model is not learning |

### Evaluation

After fine-tuning, evaluate the model:
- Compare fine-tuned model responses against base model on a held-out test set
- Check training loss and validation loss curves for convergence
- Monitor for overfitting: validation loss increasing while training loss decreases
- Test edge cases and adversarial inputs specific to your domain


## 5. Content Filtering

Azure OpenAI includes built-in content filtering that evaluates both prompts and completions. Filters run automatically and can be customized per deployment.

**Default filter categories**:
| Category | Description | Default Severity |
|----------|-------------|-----------------|
| Hate | Hate speech, discrimination | Medium |
| Sexual | Sexual content | Medium |
| Violence | Violent content, threats | Medium |
| Self-harm | Self-harm instructions, glorification | Medium |

**Severity levels** (0-7 scale, grouped):
| Level | Range | Description |
|-------|-------|-------------|
| Safe | 0-1 | No harmful content detected |
| Low | 2-3 | Mildly problematic content |
| Medium | 4-5 | Moderately harmful content |
| High | 6-7 | Severely harmful content |

### Custom Content Filter Policies

Content filter policies are managed via the REST API. Policies can be assigned to individual deployments.

```bash
RESOURCE_NAME="my-openai-resource"
RG="rg-openai"
SUB_ID="$(az account show --query id -o tsv)"
API_VERSION="2024-06-01-preview"
BASE_ARM="https://management.azure.com/subscriptions/${SUB_ID}/resourceGroups/${RG}/providers/Microsoft.CognitiveServices/accounts/${RESOURCE_NAME}"

# Create a custom content filter policy
curl -X PUT "${BASE_ARM}/raiPolicies/strict-policy?api-version=${API_VERSION}" \
  -H "Authorization: Bearer $(az account get-access-token --query accessToken -o tsv)" \
  -H "Content-Type: application/json" \
  -d '{
    "properties": {
      "basePolicyName": "Microsoft.DefaultV2",
      "mode": "Blocking",
      "contentFilters": [
        {"name": "hate", "blocking": true, "enabled": true, "allowedContentLevel": "Low", "source": "Prompt"},
        {"name": "hate", "blocking": true, "enabled": true, "allowedContentLevel": "Low", "source": "Completion"},
        {"name": "sexual", "blocking": true, "enabled": true, "allowedContentLevel": "Low", "source": "Prompt"},
        {"name": "sexual", "blocking": true, "enabled": true, "allowedContentLevel": "Low", "source": "Completion"},
        {"name": "violence", "blocking": true, "enabled": true, "allowedContentLevel": "Low", "source": "Prompt"},
        {"name": "violence", "blocking": true, "enabled": true, "allowedContentLevel": "Low", "source": "Completion"},
        {"name": "selfharm", "blocking": true, "enabled": true, "allowedContentLevel": "Low", "source": "Prompt"},
        {"name": "selfharm", "blocking": true, "enabled": true, "allowedContentLevel": "Low", "source": "Completion"},
        {"name": "jailbreak", "blocking": true, "enabled": true, "source": "Prompt"},
        {"name": "indirect_attack", "blocking": true, "enabled": true, "source": "Prompt"}
      ]
    }
  }'

# List content filter policies
curl -X GET "${BASE_ARM}/raiPolicies?api-version=${API_VERSION}" \
  -H "Authorization: Bearer $(az account get-access-token --query accessToken -o tsv)"

# Get a specific policy
curl -X GET "${BASE_ARM}/raiPolicies/strict-policy?api-version=${API_VERSION}" \
  -H "Authorization: Bearer $(az account get-access-token --query accessToken -o tsv)"

# Delete a policy
curl -X DELETE "${BASE_ARM}/raiPolicies/strict-policy?api-version=${API_VERSION}" \
  -H "Authorization: Bearer $(az account get-access-token --query accessToken -o tsv)"
```

### Custom Blocklists

Blocklists allow blocking specific terms or patterns that the default filters may not catch.

```bash
# Create a blocklist
curl -X PUT "${BASE_ARM}/raiBlocklists/profanity-list?api-version=${API_VERSION}" \
  -H "Authorization: Bearer $(az account get-access-token --query accessToken -o tsv)" \
  -H "Content-Type: application/json" \
  -d '{
    "properties": {
      "description": "Custom profanity and competitor brand terms"
    }
  }'

# Add items to blocklist
curl -X PUT "${BASE_ARM}/raiBlocklists/profanity-list/raiBlocklistItems/item1?api-version=${API_VERSION}" \
  -H "Authorization: Bearer $(az account get-access-token --query accessToken -o tsv)" \
  -H "Content-Type: application/json" \
  -d '{
    "properties": {
      "pattern": "competitor-brand-name",
      "isRegex": false
    }
  }'

# Add regex-based blocklist item
curl -X PUT "${BASE_ARM}/raiBlocklists/profanity-list/raiBlocklistItems/item2?api-version=${API_VERSION}" \
  -H "Authorization: Bearer $(az account get-access-token --query accessToken -o tsv)" \
  -H "Content-Type: application/json" \
  -d '{
    "properties": {
      "pattern": "\\b(badword1|badword2|badword3)\\b",
      "isRegex": true
    }
  }'

# List blocklist items
curl -X GET "${BASE_ARM}/raiBlocklists/profanity-list/raiBlocklistItems?api-version=${API_VERSION}" \
  -H "Authorization: Bearer $(az account get-access-token --query accessToken -o tsv)"
```

### Content Filter Annotations

When content filtering triggers, the API response includes annotations:

```json
{
  "choices": [{
    "content_filter_results": {
      "hate": {"filtered": false, "severity": "safe"},
      "sexual": {"filtered": false, "severity": "safe"},
      "violence": {"filtered": false, "severity": "safe"},
      "self_harm": {"filtered": false, "severity": "safe"}
    }
  }],
  "prompt_filter_results": [{
    "content_filter_results": {
      "hate": {"filtered": false, "severity": "safe"},
      "sexual": {"filtered": false, "severity": "safe"},
      "violence": {"filtered": false, "severity": "safe"},
      "self_harm": {"filtered": false, "severity": "safe"},
      "jailbreak": {"filtered": false, "detected": false},
      "indirect_attack": {"filtered": false, "detected": false}
    }
  }]
}
```

When a filter triggers with `"filtered": true`, the API returns a 400 error with `content_filter` as the finish reason. Handle this in your application:

```python
try:
    response = client.chat.completions.create(...)
except openai.BadRequestError as e:
    if "content_filter" in str(e):
        # Log the filtered request, return safe fallback
        logger.warning(f"Content filter triggered: {e}")
        return "I cannot assist with that request."
```


## 6. Prompt Engineering

### System Message Patterns

System messages set the persona, constraints, and behavior of the model. They are the most important tool for controlling output quality.

**Basic persona pattern**:
```
You are a helpful assistant for Contoso customer support. You answer questions about
Contoso products and services. You are polite, concise, and accurate.

Rules:
- Only answer questions related to Contoso products.
- If you don't know the answer, say "I don't have that information. Please contact support@contoso.com."
- Never make up product features or pricing.
- Always include a link to relevant documentation when available.
```

**Grounding with context pattern** (for RAG):
```
You are a knowledgeable assistant that answers questions based on the provided context.
Use ONLY the information from the context below to answer. If the answer is not in
the context, say "I don't have enough information to answer that question."

## Context
{retrieved_documents}

## Rules
- Cite the source document for each claim using [Source: document_name].
- Do not infer or extrapolate beyond what the context states.
- If the context contains conflicting information, present both perspectives.
```

**JSON output pattern**:
```
You are a data extraction assistant. Extract the requested information from the input
text and return it as a JSON object matching the specified schema.

Always respond with valid JSON. Do not include markdown formatting or explanation text.
If a field cannot be determined from the input, set its value to null.
```

### Few-Shot Examples

Few-shot examples teach the model your expected output format and reasoning:

```json
{
  "messages": [
    {"role": "system", "content": "You classify support tickets into categories: billing, technical, account, other."},
    {"role": "user", "content": "I was charged twice for my subscription this month."},
    {"role": "assistant", "content": "{\"category\": \"billing\", \"confidence\": 0.95, \"reasoning\": \"Double charge indicates a billing issue\"}"},
    {"role": "user", "content": "I can't log into my account after changing my email."},
    {"role": "assistant", "content": "{\"category\": \"account\", \"confidence\": 0.90, \"reasoning\": \"Login failure after email change is an account management issue\"}"},
    {"role": "user", "content": "The API returns a 500 error when I call the /users endpoint."},
    {"role": "assistant", "content": "{\"category\": \"technical\", \"confidence\": 0.98, \"reasoning\": \"API error is a technical support issue\"}"},
    {"role": "user", "content": "<actual user input here>"}
  ]
}
```

### Function Calling

Function calling lets the model generate structured arguments for functions you define:

```json
{
  "messages": [
    {"role": "system", "content": "You help users manage their calendar."},
    {"role": "user", "content": "Schedule a meeting with John tomorrow at 2 PM for 30 minutes about project review."}
  ],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "schedule_meeting",
        "description": "Schedule a calendar meeting",
        "parameters": {
          "type": "object",
          "properties": {
            "title": {"type": "string", "description": "Meeting title"},
            "attendees": {"type": "array", "items": {"type": "string"}, "description": "List of attendee names or emails"},
            "start_time": {"type": "string", "description": "Meeting start time in ISO 8601 format"},
            "duration_minutes": {"type": "integer", "description": "Meeting duration in minutes"},
            "description": {"type": "string", "description": "Meeting description or agenda"}
          },
          "required": ["title", "attendees", "start_time", "duration_minutes"]
        }
      }
    }
  ],
  "tool_choice": "auto"
}
```

### Structured Output (JSON Mode)

Force the model to output valid JSON:

```bash
curl -X POST "https://${RESOURCE_NAME}.openai.azure.com/openai/deployments/${DEPLOYMENT}/chat/completions?api-version=2024-08-01-preview" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "system", "content": "Extract entities from the text. Return a JSON object with arrays for people, organizations, and locations."},
      {"role": "user", "content": "Microsoft CEO Satya Nadella announced new AI features at the Seattle conference."}
    ],
    "response_format": {"type": "json_object"},
    "temperature": 0,
    "max_tokens": 500
  }'
```

**JSON Schema mode** (for strict schema validation):
```json
{
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "name": "entity_extraction",
      "strict": true,
      "schema": {
        "type": "object",
        "properties": {
          "people": {"type": "array", "items": {"type": "string"}},
          "organizations": {"type": "array", "items": {"type": "string"}},
          "locations": {"type": "array", "items": {"type": "string"}}
        },
        "required": ["people", "organizations", "locations"],
        "additionalProperties": false
      }
    }
  }
}
```

### Token Optimization

Reduce token usage and cost:
- **Be concise in system messages**: Remove unnecessary words; use bullet points over paragraphs.
- **Use few-shot wisely**: 2-3 examples are usually sufficient; more adds tokens without proportional quality gain.
- **Set max_tokens**: Always set a reasonable `max_tokens` limit to prevent runaway generation.
- **Use gpt-4o-mini for simple tasks**: Classification, extraction, and reformatting tasks often work well with the smaller model.
- **Cache common prompts**: Use the same system message across conversations to benefit from prompt caching (automatic for Azure OpenAI).
- **Structured output reduces retries**: JSON mode avoids parsing failures that require re-prompting.


## 7. Batch API

The Batch API processes large volumes of requests asynchronously at a 50% discount compared to standard pricing. Ideal for bulk processing, data labeling, evaluation, and non-time-sensitive workloads.

### Batch Input File Format

The input file is JSONL where each line is a request:

```jsonl
{"custom_id": "request-1", "method": "POST", "url": "/chat/completions", "body": {"model": "gpt-4o-mini", "messages": [{"role": "system", "content": "Classify the sentiment."}, {"role": "user", "content": "I love this product!"}], "max_tokens": 50}}
{"custom_id": "request-2", "method": "POST", "url": "/chat/completions", "body": {"model": "gpt-4o-mini", "messages": [{"role": "system", "content": "Classify the sentiment."}, {"role": "user", "content": "This is terrible and broken."}], "max_tokens": 50}}
{"custom_id": "request-3", "method": "POST", "url": "/chat/completions", "body": {"model": "gpt-4o-mini", "messages": [{"role": "system", "content": "Classify the sentiment."}, {"role": "user", "content": "It works fine, nothing special."}], "max_tokens": 50}}
```

**Requirements**:
- Each line must have `custom_id`, `method`, `url`, and `body`
- `custom_id` must be unique within the file
- Maximum 100,000 requests per batch
- Maximum input file size: 200 MB
- `model` field in body must match the deployment name

### Batch Workflow

```bash
RESOURCE_NAME="my-openai-resource"
API_VERSION="2024-08-01-preview"
BASE_URL="https://${RESOURCE_NAME}.openai.azure.com/openai"

# Step 1: Upload input file
curl -X POST "${BASE_URL}/files?api-version=${API_VERSION}" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -F "purpose=batch" \
  -F "file=@batch_input.jsonl"
# Returns file_id: "file-batch123"

# Step 2: Create batch job
curl -X POST "${BASE_URL}/batches?api-version=${API_VERSION}" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "input_file_id": "file-batch123",
    "endpoint": "/chat/completions",
    "completion_window": "24h"
  }'
# Returns batch_id: "batch_abc789"

# Step 3: Monitor batch status
curl -X GET "${BASE_URL}/batches/batch_abc789?api-version=${API_VERSION}" \
  -H "api-key: ${AZURE_OPENAI_KEY}"
# status: "validating" -> "in_progress" -> "completed"

# Step 4: Retrieve results
# Get output_file_id from batch status response
curl -X GET "${BASE_URL}/files/file-output456/content?api-version=${API_VERSION}" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  --output batch_results.jsonl

# Step 5: List all batches
curl -X GET "${BASE_URL}/batches?api-version=${API_VERSION}" \
  -H "api-key: ${AZURE_OPENAI_KEY}"

# Cancel a batch
curl -X POST "${BASE_URL}/batches/batch_abc789/cancel?api-version=${API_VERSION}" \
  -H "api-key: ${AZURE_OPENAI_KEY}"
```

### Batch Output Format

Each line in the output JSONL file:
```jsonl
{"id": "response-1", "custom_id": "request-1", "response": {"status_code": 200, "body": {"choices": [{"message": {"role": "assistant", "content": "Positive"}, "finish_reason": "stop"}], "usage": {"prompt_tokens": 25, "completion_tokens": 2, "total_tokens": 27}}}}
{"id": "response-2", "custom_id": "request-2", "response": {"status_code": 200, "body": {"choices": [{"message": {"role": "assistant", "content": "Negative"}, "finish_reason": "stop"}], "usage": {"prompt_tokens": 27, "completion_tokens": 2, "total_tokens": 29}}}}
```

Failed requests include error details in the response body. Always check `status_code` for each result.


## 8. Embeddings

### Deploy and Use Embeddings

```bash
# Deploy embedding model
az cognitiveservices account deployment create \
  --name my-openai-resource \
  --resource-group rg-openai \
  --deployment-name embeddings \
  --model-name text-embedding-3-small \
  --model-version "1" \
  --model-format OpenAI \
  --sku-name Standard \
  --sku-capacity 120

# Generate embeddings
curl -X POST "https://${RESOURCE_NAME}.openai.azure.com/openai/deployments/embeddings/embeddings?api-version=2024-08-01-preview" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "input": ["Azure OpenAI provides enterprise-grade AI models", "Machine learning on Azure cloud platform"],
    "dimensions": 1536
  }'
```

**Model comparison**:
| Model | Max Tokens | Default Dimensions | Configurable | Cost (per 1M tokens) |
|-------|------------|-------------------|-------------|---------------------|
| text-embedding-ada-002 | 8,191 | 1,536 | No | $0.10 |
| text-embedding-3-small | 8,191 | 1,536 | Yes (down to 256) | $0.02 |
| text-embedding-3-large | 8,191 | 3,072 | Yes (down to 256) | $0.13 |

**Dimension reduction**: Use the `dimensions` parameter to reduce vector size. Lower dimensions = smaller storage, faster search, slightly lower quality. `text-embedding-3-small` with 512 dimensions is a good balance for most RAG applications.

### Integration with Azure AI Search

Embeddings power vector search in Azure AI Search:
1. Generate embeddings for documents during indexing
2. Generate embeddings for user queries at search time
3. Use cosine similarity for ranking
4. Combine with keyword search for hybrid retrieval (recommended)

```bash
# Index documents with embeddings (AI Search REST API)
curl -X POST "https://my-search.search.windows.net/indexes/my-index/docs/index?api-version=2024-07-01" \
  -H "api-key: ${SEARCH_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "value": [
      {
        "@search.action": "upload",
        "id": "doc1",
        "content": "Azure OpenAI overview document...",
        "contentVector": [0.0023, -0.0142, ...]
      }
    ]
  }'
```


## 9. Quota & Rate Limits

### Understanding Quotas

Azure OpenAI uses Tokens Per Minute (TPM) as the primary quota unit. Requests Per Minute (RPM) is derived from TPM.

| Deployment Type | Quota Unit | Default Limit | Scaling |
|----------------|-----------|---------------|---------|
| Standard | TPM (thousands) | Varies by model and region | 1K-1000K TPM per deployment |
| Provisioned (PTU) | Provisioned Throughput Units | Purchased capacity | Fixed, dedicated |
| Global Standard | TPM (thousands) | Higher than regional Standard | Cross-region pooling |

**TPM to RPM conversion** (approximate):
| Model | Tokens per Request (avg) | TPM | Approx RPM |
|-------|-------------------------|-----|-----------|
| gpt-4o | 1,000 | 30K | 30 |
| gpt-4o | 1,000 | 150K | 150 |
| gpt-4o-mini | 500 | 200K | 400 |
| text-embedding-3-small | 250 | 350K | 1,400 |

### Viewing and Managing Quotas

```bash
# View quota usage for a subscription
az cognitiveservices usage list \
  --location eastus \
  --query "[?name.value=='OpenAI.Standard.gpt-4o'].{Model:name.value, Current:currentValue, Limit:limit}" \
  --output table

# View deployment-level metrics via Azure Monitor
az monitor metrics list \
  --resource "/subscriptions/${SUB_ID}/resourceGroups/rg-openai/providers/Microsoft.CognitiveServices/accounts/my-openai-resource" \
  --metric "TokenTransaction" \
  --dimension "ModelDeploymentName" \
  --interval PT1H \
  --start-time "$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ)" \
  --output table

# View active tokens per minute
az monitor metrics list \
  --resource "/subscriptions/${SUB_ID}/resourceGroups/rg-openai/providers/Microsoft.CognitiveServices/accounts/my-openai-resource" \
  --metric "ActiveTokens" \
  --dimension "ModelDeploymentName" \
  --interval PT1M \
  --output table
```

### Handling 429 Rate Limits

When you exceed your quota, the API returns HTTP 429 with a `Retry-After` header.

**Retry pattern with exponential backoff**:
```python
import time
import openai

def call_with_retry(client, messages, deployment, max_retries=5):
    for attempt in range(max_retries):
        try:
            return client.chat.completions.create(
                model=deployment,
                messages=messages,
            )
        except openai.RateLimitError as e:
            retry_after = int(e.response.headers.get("Retry-After", 2 ** attempt))
            if attempt == max_retries - 1:
                raise
            time.sleep(min(retry_after, 60))
        except openai.APITimeoutError:
            if attempt == max_retries - 1:
                raise
            time.sleep(2 ** attempt)
```

**Strategies for high-throughput workloads**:
1. **Multiple deployments**: Spread load across multiple deployments of the same model
2. **Multiple resources**: Create OpenAI resources in different regions for aggregate quota
3. **Batch API**: Use for non-time-sensitive workloads (50% cheaper, separate quota)
4. **Provisioned throughput**: Purchase PTUs for guaranteed capacity
5. **Request queuing**: Implement a queue with rate limiting to smooth traffic spikes


## 10. Monitoring & Diagnostics

### Azure Monitor Metrics

Key metrics for Azure OpenAI resources:

| Metric | Description | Alert Threshold |
|--------|-------------|----------------|
| `TokenTransaction` | Total tokens processed | Trend analysis |
| `ActiveTokens` | Tokens in active requests | Near quota limit |
| `ProcessedPromptTokens` | Input tokens consumed | Cost tracking |
| `GeneratedTokens` | Output tokens generated | Cost tracking |
| `ProvisionedManagedUtilizationV2` | PTU utilization % | > 90% |
| `AzureOpenAIRequests` | Total API requests | Baseline deviation |
| `AzureOpenAITimeToResponse` | Time to first token (ms) | > 5000ms |
| `ClientErrors` | 4xx error count | Spike detection |
| `ServerErrors` | 5xx error count | > 0 |

```bash
# Create an alert for high error rate
az monitor metrics alert create \
  --name "openai-high-errors" \
  --resource-group rg-openai \
  --scopes "/subscriptions/${SUB_ID}/resourceGroups/rg-openai/providers/Microsoft.CognitiveServices/accounts/my-openai-resource" \
  --condition "total ClientErrors > 100" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action "/subscriptions/${SUB_ID}/resourceGroups/rg-openai/providers/Microsoft.Insights/actionGroups/ops-team"

# Create an alert for PTU utilization
az monitor metrics alert create \
  --name "openai-ptu-high-utilization" \
  --resource-group rg-openai \
  --scopes "/subscriptions/${SUB_ID}/resourceGroups/rg-openai/providers/Microsoft.CognitiveServices/accounts/my-openai-resource" \
  --condition "avg ProvisionedManagedUtilizationV2 > 90" \
  --window-size 15m \
  --evaluation-frequency 5m \
  --action "/subscriptions/${SUB_ID}/resourceGroups/rg-openai/providers/Microsoft.Insights/actionGroups/ops-team"
```

### Diagnostic Settings

```bash
# Enable diagnostic logging to Log Analytics
az monitor diagnostic-settings create \
  --resource "/subscriptions/${SUB_ID}/resourceGroups/rg-openai/providers/Microsoft.CognitiveServices/accounts/my-openai-resource" \
  --name "openai-diagnostics" \
  --workspace "/subscriptions/${SUB_ID}/resourceGroups/rg-openai/providers/Microsoft.OperationalInsights/workspaces/my-law" \
  --logs '[{"categoryGroup":"allLogs","enabled":true}]' \
  --metrics '[{"category":"AllMetrics","enabled":true}]'
```

### KQL Queries for Log Analytics

```kql
// Token usage by deployment (last 24h)
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.COGNITIVESERVICES"
| where TimeGenerated > ago(24h)
| summarize TotalTokens=sum(toint(properties_s.totalTokens))
    by DeploymentName=tostring(properties_s.modelDeploymentName)
| order by TotalTokens desc

// Error rate by deployment
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.COGNITIVESERVICES"
| where TimeGenerated > ago(1h)
| summarize
    TotalRequests = count(),
    Errors = countif(toint(resultSignature_d) >= 400)
    by DeploymentName=tostring(properties_s.modelDeploymentName)
| extend ErrorRate = round(100.0 * Errors / TotalRequests, 2)

// P50/P95/P99 latency
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.COGNITIVESERVICES"
| where TimeGenerated > ago(1h)
| summarize
    P50 = percentile(toint(DurationMs), 50),
    P95 = percentile(toint(DurationMs), 95),
    P99 = percentile(toint(DurationMs), 99)
    by DeploymentName=tostring(properties_s.modelDeploymentName)

// Content filter triggers
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.COGNITIVESERVICES"
| where resultSignature_d == 400
| where properties_s contains "content_filter"
| summarize FilterTriggers = count() by bin(TimeGenerated, 1h)
```

### Cost Tracking

```bash
# View Azure OpenAI costs for current billing period
az consumption usage list \
  --start-date "$(date -u -d '30 days ago' +%Y-%m-%d)" \
  --end-date "$(date -u +%Y-%m-%d)" \
  --query "[?contains(instanceName, 'openai')].{Resource:instanceName, Cost:pretaxCost, Currency:currency, UsageStart:usageStart}" \
  --output table
```


## 11. Security

### Managed Identity Authentication (Recommended)

Use Azure AD authentication instead of API keys for production:

```bash
# Assign system-assigned managed identity
az cognitiveservices account identity assign \
  --name my-openai-resource \
  --resource-group rg-openai

# Grant "Cognitive Services OpenAI User" role to an identity
az role assignment create \
  --assignee <principal-id> \
  --role "Cognitive Services OpenAI User" \
  --scope "/subscriptions/${SUB_ID}/resourceGroups/rg-openai/providers/Microsoft.CognitiveServices/accounts/my-openai-resource"

# Grant "Cognitive Services OpenAI Contributor" for deployment management
az role assignment create \
  --assignee <principal-id> \
  --role "Cognitive Services OpenAI Contributor" \
  --scope "/subscriptions/${SUB_ID}/resourceGroups/rg-openai/providers/Microsoft.CognitiveServices/accounts/my-openai-resource"
```

**RBAC roles**:
| Role | Permissions |
|------|------------|
| Cognitive Services OpenAI User | Call completions, embeddings, fine-tuning APIs |
| Cognitive Services OpenAI Contributor | User + manage deployments, files, fine-tuning jobs |
| Cognitive Services Contributor | Full management including resource create/delete |
| Cognitive Services User | Call inference APIs (non-OpenAI specific) |

**Python SDK with Azure AD**:
```python
from azure.identity import DefaultAzureCredential
from openai import AzureOpenAI

client = AzureOpenAI(
    azure_endpoint="https://my-openai-resource.openai.azure.com/",
    azure_ad_token_provider=DefaultAzureCredential().get_token(
        "https://cognitiveservices.azure.com/.default"
    ).token,
    api_version="2024-08-01-preview"
)
```

### Network Isolation

```bash
# Disable public network access
az cognitiveservices account update \
  --name my-openai-resource \
  --resource-group rg-openai \
  --public-network-access Disabled

# Create a private endpoint
az network private-endpoint create \
  --name pe-openai \
  --resource-group rg-openai \
  --vnet-name my-vnet \
  --subnet private-endpoints \
  --private-connection-resource-id "/subscriptions/${SUB_ID}/resourceGroups/rg-openai/providers/Microsoft.CognitiveServices/accounts/my-openai-resource" \
  --group-id account \
  --connection-name openai-connection

# Create private DNS zone
az network private-dns zone create \
  --resource-group rg-openai \
  --name "privatelink.openai.azure.com"

# Link DNS zone to VNet
az network private-dns zone vnet-link create \
  --resource-group rg-openai \
  --zone-name "privatelink.openai.azure.com" \
  --name openai-dns-link \
  --virtual-network my-vnet \
  --registration-enabled false

# Create DNS zone group for automatic DNS registration
az network private-endpoint dns-zone-group create \
  --resource-group rg-openai \
  --endpoint-name pe-openai \
  --name openai-dns-group \
  --private-dns-zone "privatelink.openai.azure.com" \
  --zone-name openai
```

### Customer-Managed Keys (CMK)

```bash
# Enable CMK on the cognitive account
az cognitiveservices account update \
  --name my-openai-resource \
  --resource-group rg-openai \
  --encryption "{\"keySource\":\"Microsoft.KeyVault\",\"keyVaultProperties\":{\"keyName\":\"my-key\",\"keyVersion\":\"abc123\",\"keyVaultUri\":\"https://my-keyvault.vault.azure.net/\"}}"
```

### Data Privacy

- Azure OpenAI does NOT use customer data to train models
- Prompts and completions are NOT shared with OpenAI
- Data is stored in the selected Azure region
- Abuse monitoring data is retained for 30 days (can be opted out for approved use cases)
- Content filtering annotations are processed in real-time and not stored


## 12. Common Patterns

### RAG (Retrieval-Augmented Generation) with AI Search

```python
from openai import AzureOpenAI

client = AzureOpenAI(
    azure_endpoint="https://my-openai.openai.azure.com/",
    api_key=api_key,
    api_version="2024-08-01-preview"
)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": "Answer questions using the provided sources. Cite sources."},
        {"role": "user", "content": "What is the refund policy?"}
    ],
    extra_body={
        "data_sources": [{
            "type": "azure_search",
            "parameters": {
                "endpoint": "https://my-search.search.windows.net",
                "index_name": "knowledge-base",
                "authentication": {
                    "type": "system_assigned_managed_identity"
                },
                "query_type": "vector_semantic_hybrid",
                "embedding_dependency": {
                    "type": "deployment_name",
                    "deployment_name": "embeddings"
                },
                "top_n_documents": 5
            }
        }]
    }
)
```

### Multi-Modal (Vision)

```bash
curl -X POST "https://${RESOURCE_NAME}.openai.azure.com/openai/deployments/gpt4o-deployment/chat/completions?api-version=2024-08-01-preview" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "system", "content": "You analyze images and describe their contents."},
      {"role": "user", "content": [
        {"type": "text", "text": "What is in this image?"},
        {"type": "image_url", "image_url": {"url": "data:image/png;base64,<base64-encoded-image>", "detail": "high"}}
      ]}
    ],
    "max_tokens": 1000
  }'
```

### Assistants API

```bash
# Create an assistant
curl -X POST "https://${RESOURCE_NAME}.openai.azure.com/openai/assistants?api-version=2024-08-01-preview" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "name": "Data Analyst",
    "instructions": "You are a data analyst. Analyze data files and create visualizations.",
    "tools": [{"type": "code_interpreter"}, {"type": "file_search"}]
  }'

# Create a thread
curl -X POST "https://${RESOURCE_NAME}.openai.azure.com/openai/threads?api-version=2024-08-01-preview" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -H "Content-Type: application/json" \
  -d '{}'

# Add a message and run
curl -X POST "https://${RESOURCE_NAME}.openai.azure.com/openai/threads/${THREAD_ID}/messages?api-version=2024-08-01-preview" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "user",
    "content": "Analyze the sales data in the attached file."
  }'

curl -X POST "https://${RESOURCE_NAME}.openai.azure.com/openai/threads/${THREAD_ID}/runs?api-version=2024-08-01-preview" \
  -H "api-key: ${AZURE_OPENAI_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "assistant_id": "asst_abc123"
  }'
```

### Streaming Responses

```python
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Explain quantum computing"}],
    stream=True
)

for chunk in response:
    if chunk.choices and chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)
```

### Error Handling Pattern

```python
import openai

try:
    response = client.chat.completions.create(
        model=deployment_name,
        messages=messages,
        max_tokens=1000,
        temperature=0.7
    )
except openai.AuthenticationError:
    # Invalid API key or Azure AD token expired
    logger.error("Authentication failed — check API key or refresh token")
except openai.RateLimitError as e:
    # 429 — retry with exponential backoff
    retry_after = e.response.headers.get("Retry-After", "10")
    logger.warning(f"Rate limited — retry after {retry_after}s")
except openai.BadRequestError as e:
    if "content_filter" in str(e):
        logger.warning("Content filter triggered")
    elif "context_length_exceeded" in str(e):
        logger.error("Input too long — reduce prompt or use model with larger context")
    else:
        logger.error(f"Bad request: {e}")
except openai.APITimeoutError:
    # Request timed out — retry
    logger.warning("Request timed out — retrying")
except openai.InternalServerError:
    # 500 — Azure service issue, retry
    logger.error("Azure OpenAI service error — retrying")
```


## REST API Quick Reference

**Base URL**: `https://{resource-name}.openai.azure.com/openai`

| Operation | Method | Endpoint | API Version |
|-----------|--------|----------|-------------|
| Chat completions | POST | `/deployments/{deployment}/chat/completions` | 2024-08-01-preview |
| Completions | POST | `/deployments/{deployment}/completions` | 2024-08-01-preview |
| Embeddings | POST | `/deployments/{deployment}/embeddings` | 2024-08-01-preview |
| Image generation | POST | `/deployments/{deployment}/images/generations` | 2024-08-01-preview |
| Audio transcription | POST | `/deployments/{deployment}/audio/transcriptions` | 2024-08-01-preview |
| Audio speech | POST | `/deployments/{deployment}/audio/speech` | 2024-08-01-preview |
| Upload file | POST | `/files` | 2024-08-01-preview |
| List files | GET | `/files` | 2024-08-01-preview |
| Get file | GET | `/files/{file-id}` | 2024-08-01-preview |
| Delete file | DELETE | `/files/{file-id}` | 2024-08-01-preview |
| Create fine-tuning job | POST | `/fine_tuning/jobs` | 2024-08-01-preview |
| List fine-tuning jobs | GET | `/fine_tuning/jobs` | 2024-08-01-preview |
| Get fine-tuning job | GET | `/fine_tuning/jobs/{job-id}` | 2024-08-01-preview |
| Cancel fine-tuning job | POST | `/fine_tuning/jobs/{job-id}/cancel` | 2024-08-01-preview |
| List fine-tuning events | GET | `/fine_tuning/jobs/{job-id}/events` | 2024-08-01-preview |
| Create batch | POST | `/batches` | 2024-08-01-preview |
| Get batch | GET | `/batches/{batch-id}` | 2024-08-01-preview |
| Cancel batch | POST | `/batches/{batch-id}/cancel` | 2024-08-01-preview |
| List batches | GET | `/batches` | 2024-08-01-preview |
| Create assistant | POST | `/assistants` | 2024-08-01-preview |
| Create thread | POST | `/threads` | 2024-08-01-preview |
| Create run | POST | `/threads/{thread-id}/runs` | 2024-08-01-preview |

**ARM Management Endpoints** (via `https://management.azure.com`):

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Create/update resource | PUT | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.CognitiveServices/accounts/{name}` |
| Create deployment | PUT | `.../{name}/deployments/{deployment}` |
| List deployments | GET | `.../{name}/deployments` |
| Delete deployment | DELETE | `.../{name}/deployments/{deployment}` |
| List models | GET | `.../{name}/models` |
| Create content filter policy | PUT | `.../{name}/raiPolicies/{policy}` |
| Create blocklist | PUT | `.../{name}/raiBlocklists/{blocklist}` |


## Error Codes Table

| Code | Meaning | Remediation |
|------|---------|-------------|
| 400 `content_filter` | Content filter blocked the request | Adjust content filter policy or rephrase input |
| 400 `context_length_exceeded` | Input + max_tokens exceeds model limit | Reduce prompt length, summarize context, or use model with larger context |
| 400 `invalid_prompt` | Malformed messages array or missing fields | Check messages format, ensure system/user/assistant roles |
| 401 `Unauthorized` | Invalid API key or expired Azure AD token | Regenerate key or refresh token |
| 403 `Forbidden` | Missing RBAC role on the resource | Assign Cognitive Services OpenAI User role |
| 404 `DeploymentNotFound` | Deployment name does not exist | Verify deployment name; check `az cognitiveservices account deployment list` |
| 404 `ModelNotFound` | Model not available in this region | Check regional model availability matrix |
| 429 `RateLimitReached` | Exceeded TPM or RPM quota | Implement retry with backoff; increase quota or add deployments |
| 429 `TokensPerMinuteLimitReached` | Specifically TPM exceeded | Reduce request rate or token volume; consider PTU |
| 500 `InternalServerError` | Azure service issue | Retry with backoff; check Azure status page |
| 503 `ServiceUnavailable` | Temporary service overload | Retry after Retry-After header value |


## Throttling Limits Table

| Resource | Limit | Strategy |
|----------|-------|----------|
| Standard deployment TPM | Varies by model (e.g., 300K for gpt-4o) | Increase capacity or add deployments |
| Requests per minute (derived) | ~TPM / avg_tokens_per_request | Token-aware rate limiting |
| PTU utilization | 100% of purchased units | Monitor ProvisionedManagedUtilizationV2 metric |
| Batch API requests per batch | 100,000 | Split into multiple batches |
| Batch API input file size | 200 MB | Split into smaller files |
| Files per resource | 500 | Delete old files |
| Fine-tuning concurrent jobs | 3 per resource | Queue and serialize jobs |
| Fine-tuning training file size | 512 MB | Sample training data if exceeding |
| Deployments per resource | 30 | Use multiple resources for more deployments |
| Content filter policies | 100 per resource | Reuse policies across deployments |
| Blocklist items | 10,000 per blocklist | Use regex patterns for broader coverage |
| Image generation (DALL-E) | 2 concurrent requests | Queue image requests |
| ARM API: write operations | 1200/min per subscription | Batch deployment changes |
