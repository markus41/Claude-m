# Azure AI Agent Service — Tool Configuration

## Overview

Azure AI Agent Service supports four categories of built-in tools. Add them to the agent's `tools` array at creation time or update later.

---

## Code Interpreter

Executes Python code in a sandboxed environment. Ideal for data analysis, file processing, and visualization.

```json
{"type": "code_interpreter"}
```

**Enable at agent creation:**
```json
{
  "name": "data-analyst",
  "model": "gpt-4o",
  "instructions": "You are a data analyst. Use code to process files and produce charts.",
  "tools": [{"type": "code_interpreter"}]
}
```

**Attach files to a message (at run time):**
```python
message = client.agents.create_message(
    thread_id=thread.id,
    role="user",
    content="Analyze this CSV",
    attachments=[{
        "file_id": uploaded_file.id,
        "tools": [{"type": "code_interpreter"}]
    }]
)
```

**Supported file types**: `.csv`, `.xlsx`, `.json`, `.txt`, `.pdf`, `.png`, `.jpg`, `.py`, `.js`

**Limits**: 512 MB per file; 10 files per message; 20 files per agent.

---

## File Search (Vector Store RAG)

Semantic search over uploaded documents using automatic chunking, embedding, and vector storage.

```json
{"type": "file_search"}
```

**Full setup flow:**
```python
from azure.ai.projects import AIProjectClient
from azure.identity import DefaultAzureCredential

client = AIProjectClient.from_connection_string(
    conn_str=os.environ["AZURE_AI_FOUNDRY_CONNECTION_STRING"],
    credential=DefaultAzureCredential()
)

# 1. Create vector store
vector_store = client.agents.create_vector_store_and_poll(
    name="product-docs",
    file_ids=[]  # add files next
)

# 2. Upload files
file_batch = client.agents.upload_file_and_poll(
    vector_store_id=vector_store.id,
    file_path="product_manual.pdf"
)

# 3. Attach to agent
agent = client.agents.update_agent(
    assistant_id=agent_id,
    tools=[{"type": "file_search"}],
    tool_resources={"file_search": {"vector_store_ids": [vector_store.id]}}
)
```

**File search options** (set at agent creation):
```json
{
  "type": "file_search",
  "file_search": {
    "max_num_results": 20,
    "ranking_options": {
      "ranker": "default_2024_08_21",
      "score_threshold": 0.0
    }
  }
}
```

**Supported file types**: `.pdf`, `.docx`, `.txt`, `.md`, `.html`, `.pptx`, `.json`, `.csv` (and more)

---

## Azure AI Search (External Index)

Ground the agent in an existing Azure AI Search index without building a new vector store.

```json
{
  "type": "azure_ai_search",
  "azure_ai_search": {
    "index_connection_id": "/subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.MachineLearningServices/workspaces/<project>/connections/<connection-name>",
    "index_name": "my-search-index"
  }
}
```

**Prerequisites:**
1. An Azure AI Search resource must exist
2. A connection to it must be configured in the AI Foundry project (under **Settings** → **Connected resources**)
3. The index must already be populated

**Find the connection ID:**
```bash
az ml connection list --workspace-name <project> --resource-group <rg> --subscription <sub> --query "[?type=='azure_ai_search'].id" -o tsv
```

---

## Function Calling

Define custom tools the agent can invoke during a run. When called, the run enters `requires_action` state.

```json
{
  "type": "function",
  "function": {
    "name": "get_stock_price",
    "description": "Get the current stock price for a ticker symbol",
    "parameters": {
      "type": "object",
      "properties": {
        "ticker": {
          "type": "string",
          "description": "Stock ticker symbol, e.g. MSFT"
        },
        "currency": {
          "type": "string",
          "enum": ["USD", "EUR", "GBP"],
          "description": "Currency for the price"
        }
      },
      "required": ["ticker"]
    }
  }
}
```

**Handling requires_action:**
```python
if run.status == "requires_action":
    tool_calls = run.required_action.submit_tool_outputs.tool_calls
    tool_outputs = []
    for call in tool_calls:
        if call.function.name == "get_stock_price":
            args = json.loads(call.function.arguments)
            result = fetch_stock_price(args["ticker"], args.get("currency", "USD"))
            tool_outputs.append({
                "tool_call_id": call.id,
                "output": json.dumps(result)
            })
    run = client.agents.submit_tool_outputs_to_run(
        thread_id=thread.id,
        run_id=run.id,
        tool_outputs=tool_outputs
    )
```

**Best practices:**
- Keep function descriptions specific — the model uses them to decide when to call the function
- Return JSON strings from functions, not raw Python objects
- Always handle the case where the run returns to `requires_action` multiple times (chained calls)

---

## Combining Multiple Tools

```json
{
  "name": "research-assistant",
  "model": "gpt-4o",
  "instructions": "You are a research assistant with access to documents, web data via functions, and data analysis tools.",
  "tools": [
    {"type": "file_search"},
    {"type": "code_interpreter"},
    {
      "type": "function",
      "function": {
        "name": "search_web",
        "description": "Search the web for current information",
        "parameters": {
          "type": "object",
          "properties": {
            "query": {"type": "string"}
          },
          "required": ["query"]
        }
      }
    }
  ]
}
```

**Note**: Code interpreter and file search can be active simultaneously. Azure AI Search and file search cannot both be used for the same query — choose the source that matches your data location.
