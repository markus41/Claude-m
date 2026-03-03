---
name: Agent Foundry
description: >
  Deep expertise in the Azure AI Foundry agent lifecycle — scaffold agent definitions,
  deploy to Azure AI Agent Service, manage threads and runs, configure built-in tools
  (code interpreter, file search, Azure AI Search, function calling), run quality and
  safety evaluations, and monitor agent health. Use this skill when a user asks to
  build an agent on Azure AI Foundry, create or deploy a Foundry agent, test an agent
  thread or run, configure agent tools, evaluate agent output quality, troubleshoot
  Azure AI Agent Service errors, or set up Service Principal authentication for AI Foundry.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - azure ai foundry
  - ai foundry agent
  - azure ai agent service
  - scaffold agent
  - deploy agent
  - agent foundry
  - azure openai agent
  - foundry project
  - agent thread
  - agent run
  - create agent thread
  - list foundry agents
  - evaluate agent
  - agent evaluation
  - check agent quality
  - run groundedness eval
  - code interpreter agent
  - add file search
  - configure function calling
  - agent stuck in progress
  - foundry authentication error
  - requires action not resolving
  - connect to ai foundry
---

# Agent Foundry

## 1. Azure AI Foundry Overview

Azure AI Foundry is Microsoft's unified platform for building, deploying, and operating AI applications and agents. It provides:

| Capability | Description |
|---|---|
| **AI Agent Service** | Stateful agents with tools, threads, and runs (OpenAI Assistants-compatible API) |
| **Model Deployments** | Deploy GPT-4o, GPT-4o mini, Phi-3, Mistral, and other models to project endpoints |
| **Evaluations** | Built-in evaluation flows for quality, safety, and groundedness metrics |
| **Projects & Hubs** | Logical containers for models, connections, data, and agent deployments |
| **Connections** | Integrations with Azure AI Search, Blob Storage, Cosmos DB, and more |

**Key concepts:**
- **Hub**: Top-level resource grouping (shared compute, connections, security policies)
- **Project**: Workspace within a hub where you deploy models and build agents
- **Connection string**: Identifies your project uniquely — `<region>.api.azureml.ms;<sub-id>;<rg>;<project>`

## 2. Authentication: Service Principal

Service Principal authentication via `DefaultAzureCredential` fallback chain is required.

See `references/authentication.md` for detailed credential setup, role requirements, and Service Principal creation commands.

**Required environment variables:**

| Variable | Description | Example |
|---|---|---|
| `AZURE_AI_FOUNDRY_CONNECTION_STRING` | Project connection string | `eastus.api.azureml.ms;abc123;my-rg;my-project` |
| `AZURE_CLIENT_ID` | App Registration client ID | `11111111-2222-3333-...` |
| `AZURE_CLIENT_SECRET` | Client secret value | `your~secret~value` |
| `AZURE_TENANT_ID` | Entra ID tenant ID | `44444444-5555-6666-...` |

**Create a Service Principal with least-privilege access:**
```bash
az ad sp create-for-rbac \
  --name "agent-foundry-sp" \
  --role "Azure AI Developer" \
  --scopes "/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.MachineLearningServices/workspaces/<project>"
```

**Role requirements:**
- `Azure AI Developer` — full agent lifecycle (create, run, read, delete)
- `Azure AI User` — run agents and read results only (no create/delete)
- `Cognitive Services OpenAI User` — if using Azure OpenAI endpoints directly

## 3. Agent Lifecycle

### 3.1 Scaffold

Create an agent definition with two artifacts:

**Claude Code agent `.md` file** (for local orchestration via Claude Code):
```yaml
---
name: My Agent
description: >
  Analyzes sales data files and produces a summary report with top insights,
  anomaly flags, and recommended actions. Trigger with "analyze sales",
  "review sales data", or "sales report".
model: inherit
color: blue
tools:
  - Read
  - Write
  - Bash
---
```

**Azure AI Foundry agent JSON** (for Azure AI Agent Service deployment):
```json
{
  "name": "sales-analyzer",
  "description": "Analyzes uploaded sales data and produces structured reports",
  "model": "gpt-4o",
  "instructions": "You are an expert sales data analyst. When given a data file, extract key metrics, identify anomalies, and recommend actions. Format output as structured markdown with an executive summary section.",
  "tools": [
    {"type": "code_interpreter"},
    {"type": "file_search"}
  ],
  "metadata": {
    "source": "agent-foundry-plugin",
    "version": "1.0.0"
  }
}
```

### 3.2 Deploy

Create or update an agent via the Azure AI Agent Service REST API:

**Create agent (POST)**:
```
POST {endpoint}/agents?api-version=2024-12-01-preview
Authorization: Bearer <token>
Content-Type: application/json

<agent-json-body>
```

**Response** includes `id` (format: `asst_xxxxxxxxxxxxxxxxxxxxxxxx`) — store this for thread/run operations.

**Update agent (POST with agent ID)**:
```
POST {endpoint}/agents/{agent_id}?api-version=2024-12-01-preview
```

**Delete agent**:
```
DELETE {endpoint}/agents/{agent_id}?api-version=2024-12-01-preview
```

### 3.3 Test (Thread + Run flow)

Azure AI Agent Service uses a Threads/Runs model (same as OpenAI Assistants v2):

```
1. Create thread   POST /threads
2. Add message     POST /threads/{thread_id}/messages
3. Create run      POST /threads/{thread_id}/runs  { "assistant_id": "<agent_id>" }
4. Poll run        GET  /threads/{thread_id}/runs/{run_id}  → wait for terminal status
5. Get messages    GET  /threads/{thread_id}/messages
```

**Run terminal statuses**: `completed`, `failed`, `cancelled`, `expired`, `requires_action`

**Polling pattern**:
```python
import time
while run.status in ["queued", "in_progress", "cancelling"]:
    time.sleep(1)
    run = client.agents.get_run(thread_id=thread.id, run_id=run.id)
```

### 3.4 Manage

**List agents**:
```
GET {endpoint}/agents?api-version=2024-12-01-preview&limit=100
```

**Get agent details**:
```
GET {endpoint}/agents/{agent_id}?api-version=2024-12-01-preview
```

**List run history** (across a thread):
```
GET {endpoint}/threads/{thread_id}/runs?api-version=2024-12-01-preview
```

See `references/agent-tools.md` for complete tool configuration schemas and advanced patterns.

## 4. Agent Tools

### 4.1 Code Interpreter

Executes Python code in a sandboxed environment. Add to agent:
```json
{"type": "code_interpreter"}
```

- Supports: data analysis, chart generation, mathematical computation, CSV/Excel processing
- File uploads: attach files when creating a message or at run creation
- Output: code blocks + plain text + image file citations

### 4.2 File Search

Semantic search over uploaded documents using vector stores:
```json
{"type": "file_search"}
```

**Create a vector store and attach to agent**:
```python
vector_store = client.agents.create_vector_store(name="my-docs")
client.agents.upload_file_and_poll(vector_store_id=vector_store.id, file_path="docs.pdf")
agent = client.agents.update_agent(
    assistant_id=agent_id,
    tool_resources={"file_search": {"vector_store_ids": [vector_store.id]}}
)
```

### 4.3 Azure AI Search

Connect to an Azure AI Search index for grounded RAG:
```json
{
  "type": "azure_ai_search",
  "azure_ai_search": {
    "index_connection_id": "/subscriptions/.../connections/my-search-conn",
    "index_name": "my-index"
  }
}
```

The connection must be pre-configured in the AI Foundry project.

### 4.4 Function Calling

Define custom tools the agent can invoke:
```json
{
  "type": "function",
  "function": {
    "name": "get_weather",
    "description": "Get current weather for a city",
    "parameters": {
      "type": "object",
      "properties": {
        "city": {"type": "string", "description": "City name"}
      },
      "required": ["city"]
    }
  }
}
```

When the agent triggers a function call, the run enters `requires_action` state. Submit results:
```python
client.agents.submit_tool_outputs_to_run(
    thread_id=thread.id,
    run_id=run.id,
    tool_outputs=[{"tool_call_id": call.id, "output": json.dumps(result)}]
)
```

See `references/evaluations.md` for full evaluator configurations and evaluation flow examples.

## 5. Evaluations

Azure AI Foundry provides built-in evaluators for agent output quality:

| Evaluator | Measures | When to Use |
|---|---|---|
| `RelevanceEvaluator` | Response relevance to the query | General QA agents |
| `GroundednessEvaluator` | Answer grounded in provided context | RAG agents |
| `CoherenceEvaluator` | Logical consistency of response | Multi-turn agents |
| `FluencyEvaluator` | Language quality | Customer-facing agents |
| `SimilarityEvaluator` | Similarity to expected answer | Regression testing |
| `ViolenceEvaluator` | Harmful content detection | Safety-critical agents |

**Run an evaluation**:
```python
from azure.ai.evaluation import evaluate, RelevanceEvaluator

result = evaluate(
    data=[{"query": "What is AI?", "response": agent_response, "context": "..."}],
    evaluators={"relevance": RelevanceEvaluator(model_config)},
    azure_ai_project={"subscription_id": "...", "resource_group_name": "...", "project_name": "..."}
)
```

## 6. MCP Tool Usage Patterns

The `azure-ai-foundry` MCP server exposes tools for the operations above. When using MCP tools:

**List agents**: Use the list-agents MCP tool to retrieve all deployed agents
**Create agent**: Pass the full agent JSON as a parameter
**Create thread**: Returns a thread ID — store it for subsequent message/run calls
**Get run status**: Poll this tool in a loop with a short delay until terminal status
**Get messages**: Call after run completes to retrieve the assistant's response

Always check the MCP tool response for `error` fields before proceeding to the next step.

## 7. Common Workflows

These workflows use plugin slash commands (`/af-scaffold-agent`, `/af-deploy-agent`, etc.).

### Deploy and test a new agent end-to-end

```
1. /af-scaffold-agent "An agent that reviews PRs for security issues"
2. /af-deploy-agent agents/pr-security-reviewer.json
3. /af-test-agent asst_xxx --message "Review this diff: <paste diff>"
4. /af-agent-status asst_xxx
```

### Update an existing agent's instructions

```
1. Edit the agent JSON file locally
2. /af-deploy-agent agents/my-agent.json --update
3. /af-test-agent <agent-id> to verify the changes
```

### Monitor a production agent

```
1. /af-agent-status <agent-id>  -- check success rate and recent errors
2. /af-list-agents -- verify all expected agents are still deployed
```

See `references/troubleshooting.md` for an extended troubleshooting guide with additional error codes and remediation steps.

## 8. Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| `AuthenticationError` from MCP | Missing or expired credentials | Re-run `af-setup`, verify env vars |
| `model_not_found` on deploy | Model deployment name mismatch | Use exact deployment name, not base model name |
| Run stuck in `in_progress` | Agent in infinite loop or rate limited | Set `max_completion_tokens` limit on run creation |
| `requires_action` never resolved | Function call not submitted | Submit tool outputs with `submit_tool_outputs_to_run` |
| `file_not_found` in file search | Vector store not attached to agent | Update agent `tool_resources` with vector store IDs |
| Empty message list after run | Thread/run ID mismatch | Verify thread ID used for both run creation and message retrieval |

---

## Reference Files

| File | Content |
|---|---|
| `references/authentication.md` | Service Principal setup, role assignments, DefaultAzureCredential chain |
| `references/agent-tools.md` | Code interpreter, file search, Azure AI Search, function calling — full schemas |
| `references/evaluations.md` | Built-in evaluators, evaluate() usage, safety evaluators |
| `references/troubleshooting.md` | Extended error code reference and remediation steps |

## Progressive Disclosure — Reference Files

| Topic | File |
|---|---|
| Authentication — Service Principal, DefaultAzureCredential, role assignments | [`references/authentication.md`](./references/authentication.md) |
| Tools — code interpreter, file search, Azure AI Search, function calling | [`references/agent-tools.md`](./references/agent-tools.md) |
| Evaluations — quality evaluators, safety evaluators, evaluate() SDK | [`references/evaluations.md`](./references/evaluations.md) |
| Troubleshooting — error codes, run failure modes, remediation | [`references/troubleshooting.md`](./references/troubleshooting.md) |
| Orchestration — multi-agent patterns, chaining, streaming, state management, responsible AI | [`references/orchestration-patterns.md`](./references/orchestration-patterns.md) |
