# Azure OpenAI Plugin

Azure OpenAI Service operations — deploy and manage GPT-4o, GPT-4, GPT-3.5-Turbo, Embeddings, DALL-E, Whisper, and TTS models. Covers Standard, Provisioned-Managed, and Global Standard deployment types, fine-tuning workflows, content filtering policies, prompt engineering patterns, Batch API, quota management, and secure production architectures using `az cognitiveservices` CLI and the Azure OpenAI REST API.

## What This Plugin Provides

This is a **knowledge plugin** — it gives Claude deep expertise in Azure OpenAI Service so it can create and manage deployments, configure content filters, design effective prompts, run fine-tuning jobs, process batch workloads, and optimize cost and security. It does not contain runtime code, MCP servers, or executable scripts.

## Setup

Run `/aoai-setup` to create an Azure OpenAI resource and verify API access:

```
/aoai-setup              # Full guided setup
/aoai-setup --minimal    # Resource creation and key retrieval only
```

Requires an Azure subscription with access to Azure OpenAI Service.

## Commands

| Command | Description |
|---------|-------------|
| `/aoai-setup` | Install Azure CLI, create cognitive account, configure defaults, verify API access |
| `/aoai-deploy` | Create, update, or delete model deployments — set capacity, choose SKU, manage model versions |
| `/aoai-fine-tune` | Upload training data, create fine-tuning job, monitor progress, deploy the result |
| `/aoai-content-filter` | Create and manage content filter policies and custom blocklists |
| `/aoai-quota` | View quota usage, monitor TPM/RPM limits, identify rate limit bottlenecks |
| `/aoai-batch` | Create batch processing jobs, upload input files, monitor, retrieve results |

## Agent

| Agent | Description |
|-------|-------------|
| **OpenAI Reviewer** | Reviews Azure OpenAI implementations for deployment configuration, content filter policies, prompt engineering quality, security posture, cost optimization, and error handling patterns |

## Trigger Keywords

The skill activates automatically when conversations mention: `azure openai`, `openai deployment`, `gpt deployment`, `azure openai fine-tuning`, `content filter`, `openai quota`, `openai batch`, `azure openai model`, `prompt engineering azure`, `dalle azure`, `whisper azure`, `embedding deployment`.

## Example Prompts

- "Deploy GPT-4o with 50K TPM capacity in East US and set up a strict content filter policy."
- "Fine-tune GPT-4o-mini with my customer support training data and deploy the result."
- "Review my Azure OpenAI implementation for security best practices and cost optimization."
- "Create a batch job to classify 10,000 support tickets using GPT-4o-mini."
- "Show my current quota usage and recommend capacity adjustments."
- "Set up a RAG pipeline with Azure OpenAI embeddings and AI Search."

## Author

Markus Ahling
