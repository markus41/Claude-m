# azure-ai-services

Azure AI workloads plugin for Claude Code. Covers Azure OpenAI Service deployments, Azure AI Search indexes and RAG pipelines, Azure AI Studio / AI Foundry projects, Cognitive Services provisioning, content filtering, quota management, and responsible AI governance.

## What it covers

- **Azure OpenAI Service** — deployments (GPT-4o, GPT-4o-mini, embeddings, DALL-E, Whisper), quota management, fine-tuning, content filter policies
- **Azure AI Search** — index schema design with vector fields, HNSW configuration, semantic ranking, indexers, skillsets, hybrid search
- **Azure AI Studio / Foundry** — AI Hub and Project provisioning, connections (OpenAI, Search, Blob), model catalog, evaluation
- **Cognitive Services** — Language, Vision, Speech, Translator endpoint provisioning
- **Responsible AI** — content filter governance, managed identity patterns, PII handling, rate limiting

## Install

```bash
/plugin install azure-ai-services@claude-m-microsoft-marketplace
```

## Required permissions

| Workload | Role |
|---|---|
| Azure OpenAI management (deployments, filters) | `Cognitive Services Contributor` or `Azure AI Administrator` |
| Azure OpenAI data plane (completions, embeddings) | `Cognitive Services OpenAI User` |
| Azure AI Search management | `Search Service Contributor` |
| Azure AI Search data plane | `Search Index Data Contributor` |
| AI Studio / Foundry Hub + Project | `Azure AI Developer` or `Owner` on hub |

## Setup

```
/azure-ai-services-setup
```

Discovers or creates Azure OpenAI resources, checks quota, validates RBAC, tests data-plane connectivity, and optionally sets up AI Search.

## Commands

| Command | Description |
|---|---|
| `/azure-ai-services-setup` | Validate auth, discover resources, check quota and connectivity |
| `/azure-openai-deploy` | Provision a new model deployment with SKU, capacity, and content filter |
| `/azure-openai-audit` | Audit all deployments — quota, content filters, RBAC, governance gaps |
| `/azure-search-index` | Create or update an AI Search index with vector + semantic config |
| `/azure-ai-studio-setup` | Scaffold an AI Hub and Project with OpenAI and Search connections |

## Example prompts

- "Use `azure-ai-services` to audit all Azure OpenAI deployments in my subscription"
- "Deploy gpt-4o with 30k TPM Standard capacity and a production content filter policy"
- "Create an AI Search index named 'knowledge-base' with 1536-dimension vector fields and semantic ranker"
- "Set up an AI Foundry project in rg-ai-dev with connections to my OpenAI account and Search service"
- "Show me which Azure OpenAI deployments are using deprecated model versions"

## Auth pattern

Uses the integration context contract (`docs/integration-context.md`). Required context:

```
tenantId + subscriptionId + AZURE_OPENAI_ACCOUNT_NAME (or AZURE_SEARCH_SERVICE_NAME)
```

Managed identity is preferred over API keys for production deployments.
