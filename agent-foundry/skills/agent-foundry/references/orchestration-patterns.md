# Orchestration Patterns — Azure AI Foundry Agents

## Overview

Azure AI Foundry supports multi-agent orchestration through function tools, thread management, streaming, and state handoff. This reference covers coordinator-agent patterns, specialized sub-agents, agent chaining, streaming responses, thread management, file search and code interpreter integration, connection-based data access, agent evaluation, Prompt Flow integration, and responsible AI design principles.

---

## REST API Reference

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| POST | `/agents` | Azure AI Developer | Body: `name`, `model`, `instructions`, `tools`, `tool_resources` | Create an agent |
| GET | `/agents/{agentId}` | Azure AI Developer | — | Get agent details |
| PATCH | `/agents/{agentId}` | Azure AI Developer | Body: fields to update | Update agent |
| DELETE | `/agents/{agentId}` | Azure AI Developer | — | Delete agent |
| POST | `/threads` | Azure AI Developer | Body: `messages` (optional) | Create a thread |
| DELETE | `/threads/{threadId}` | Azure AI Developer | — | Delete thread |
| POST | `/threads/{threadId}/messages` | Azure AI Developer | Body: `role`, `content` | Add message to thread |
| GET | `/threads/{threadId}/messages` | Azure AI Developer | `$top`, `before`, `after` | List messages |
| POST | `/threads/{threadId}/runs` | Azure AI Developer | Body: `agent_id`, `additional_instructions`, `stream` | Create a run |
| GET | `/threads/{threadId}/runs/{runId}` | Azure AI Developer | — | Poll run status |
| POST | `/threads/{threadId}/runs/{runId}/submit_tool_outputs` | Azure AI Developer | Body: `tool_outputs` | Submit function tool results |
| GET | `/threads/{threadId}/runs/{runId}/steps` | Azure AI Developer | — | List run steps (tool calls, messages) |
| POST | `/threads/{threadId}/runs/{runId}/cancel` | Azure AI Developer | — | Cancel an in-progress run |

---

## Single-Agent Basic Pattern

```python
from azure.ai.projects import AIProjectClient
from azure.ai.projects.models import MessageRole, RunStatus
from azure.identity import DefaultAzureCredential
import os
import time

def create_simple_agent_session(user_message: str) -> str:
    """Basic single-agent question-answer pattern."""
    client = AIProjectClient.from_connection_string(
        credential=DefaultAzureCredential(),
        conn_str=os.environ["AZURE_AI_FOUNDRY_CONNECTION_STRING"],
    )

    # Create or reuse an agent
    agent = client.agents.create_agent(
        model="gpt-4o",
        name="assistant",
        instructions="You are a helpful assistant. Be concise and factual.",
    )

    # Create a new thread per conversation
    thread = client.agents.create_thread()

    # Add the user message
    client.agents.create_message(
        thread_id=thread.id,
        role=MessageRole.USER,
        content=user_message,
    )

    # Run and wait for completion
    run = client.agents.create_and_process_run(
        thread_id=thread.id,
        agent_id=agent.id,
    )

    if run.status != RunStatus.COMPLETED:
        raise RuntimeError(f"Run failed with status: {run.status}, error: {run.last_error}")

    # Get the latest assistant message
    messages = client.agents.list_messages(thread_id=thread.id)
    for msg in messages.data:
        if msg.role == MessageRole.ASSISTANT:
            return msg.content[0].text.value if msg.content else ""

    return ""
```

---

## Multi-Agent: Coordinator + Specialized Sub-Agents

In this pattern, a coordinator agent receives the user request and delegates to specialized agents via function tools.

```python
import json
from azure.ai.projects.models import FunctionTool, ToolSet

# Step 1: Create specialized sub-agents
def create_specialized_agents(client) -> dict[str, str]:
    """Create sub-agents for specific domains."""
    agents = {}

    # Financial analysis sub-agent
    finance_agent = client.agents.create_agent(
        model="gpt-4o",
        name="finance-analyst",
        instructions=(
            "You are a financial analyst. Analyze revenue, costs, and margins. "
            "Always cite specific numbers. Output structured JSON when summarizing."
        ),
    )
    agents["finance"] = finance_agent.id

    # Technical support sub-agent
    tech_agent = client.agents.create_agent(
        model="gpt-4o",
        name="tech-support",
        instructions=(
            "You are a technical support specialist. Diagnose issues systematically. "
            "Provide step-by-step remediation. Escalate if the issue is beyond your capability."
        ),
    )
    agents["tech"] = tech_agent.id

    return agents


# Step 2: Define function tools for the coordinator to call sub-agents
def make_subagent_tool(client, sub_agent_id: str, agent_name: str) -> FunctionTool:
    """Wrap a sub-agent call as a function tool for the coordinator."""
    def call_subagent(question: str) -> str:
        """Invoke the specialized sub-agent and return its response."""
        thread = client.agents.create_thread()
        client.agents.create_message(
            thread_id=thread.id,
            role="user",
            content=question,
        )
        run = client.agents.create_and_process_run(
            thread_id=thread.id,
            agent_id=sub_agent_id,
        )
        messages = client.agents.list_messages(thread_id=thread.id)
        for msg in messages.data:
            if msg.role == "assistant":
                return msg.content[0].text.value if msg.content else ""
        return "Sub-agent returned no response."

    # Return the function wrapped as a FunctionTool
    return FunctionTool(
        functions={call_subagent},
    )


# Step 3: Create the coordinator agent with sub-agent tools
def create_coordinator_agent(client, sub_agent_ids: dict[str, str]):
    toolset = ToolSet()
    for domain, agent_id in sub_agent_ids.items():
        toolset.add(make_subagent_tool(client, agent_id, domain))

    coordinator = client.agents.create_agent(
        model="gpt-4o",
        name="coordinator",
        instructions=(
            "You are a coordinator. For financial questions, delegate to the finance sub-agent. "
            "For technical questions, delegate to the tech-support sub-agent. "
            "Synthesize the responses and present a unified answer to the user."
        ),
        toolset=toolset,
    )
    return coordinator
```

---

## Agent Chaining (Sequential Pipeline)

In agent chaining, the output of one agent becomes the input to the next.

```python
def agent_chain_pipeline(client, user_request: str, agent_ids: list[str]) -> str:
    """
    Chain multiple agents sequentially.
    Each agent receives the previous agent's output as context.
    """
    current_input = user_request
    final_output = ""

    for i, agent_id in enumerate(agent_ids):
        thread = client.agents.create_thread()

        prompt = current_input if i == 0 else (
            f"Previous analysis:\n{current_input}\n\n"
            f"Please refine, validate, or extend this analysis."
        )

        client.agents.create_message(
            thread_id=thread.id,
            role="user",
            content=prompt,
        )

        run = client.agents.create_and_process_run(
            thread_id=thread.id,
            agent_id=agent_id,
        )

        messages = client.agents.list_messages(thread_id=thread.id)
        for msg in messages.data:
            if msg.role == "assistant":
                current_input = msg.content[0].text.value if msg.content else current_input
                final_output = current_input
                break

    return final_output
```

---

## Streaming Responses

```python
from azure.ai.projects.models import AgentStreamEvent, RunStepDeltaChunk, MessageDeltaChunk
import sys

def stream_agent_response(client, thread_id: str, agent_id: str, user_message: str) -> str:
    """Stream the agent response token-by-token."""
    client.agents.create_message(
        thread_id=thread_id,
        role="user",
        content=user_message,
    )

    full_response = ""

    with client.agents.create_stream(
        thread_id=thread_id,
        agent_id=agent_id,
    ) as stream:
        for event_type, event_data, _ in stream:
            if event_type == AgentStreamEvent.THREAD_MESSAGE_DELTA:
                if isinstance(event_data, MessageDeltaChunk):
                    for block in event_data.delta.content or []:
                        if hasattr(block, "text") and block.text:
                            token = block.text.value or ""
                            sys.stdout.write(token)
                            sys.stdout.flush()
                            full_response += token

            elif event_type == AgentStreamEvent.THREAD_RUN_STEP_DELTA:
                if isinstance(event_data, RunStepDeltaChunk):
                    # Handle tool call streaming (code interpreter output, etc.)
                    for step in event_data.delta.step_details or []:
                        if hasattr(step, "tool_calls"):
                            for tc in step.tool_calls or []:
                                if hasattr(tc, "code_interpreter") and tc.code_interpreter:
                                    sys.stdout.write(tc.code_interpreter.input or "")
                                    sys.stdout.flush()

    print()  # Newline after streaming completes
    return full_response
```

---

## Thread Management

```python
class AgentSession:
    """Manages a persistent conversation thread with an agent."""

    def __init__(self, client, agent_id: str):
        self.client = client
        self.agent_id = agent_id
        self.thread = client.agents.create_thread()
        self.message_count = 0

    def chat(self, user_message: str) -> str:
        """Send a message and get a response, maintaining conversation context."""
        self.client.agents.create_message(
            thread_id=self.thread.id,
            role="user",
            content=user_message,
        )
        self.message_count += 1

        run = self.client.agents.create_and_process_run(
            thread_id=self.thread.id,
            agent_id=self.agent_id,
        )

        if run.status != "completed":
            return f"[Error: run ended with status {run.status}]"

        messages = self.client.agents.list_messages(thread_id=self.thread.id)
        for msg in messages.data:
            if msg.role == "assistant":
                return msg.content[0].text.value if msg.content else ""

        return ""

    def get_conversation_history(self) -> list[dict]:
        """Return the full conversation history."""
        messages = self.client.agents.list_messages(thread_id=self.thread.id)
        return [
            {
                "role": msg.role,
                "content": msg.content[0].text.value if msg.content else "",
                "created_at": msg.created_at,
            }
            for msg in reversed(messages.data)
        ]

    def close(self) -> None:
        """Delete the thread when done."""
        self.client.agents.delete_thread(thread_id=self.thread.id)
```

---

## File Search Tool Integration

```python
from azure.ai.projects.models import VectorStore, FileSearchTool

def create_rag_agent(client, document_paths: list[str]) -> tuple:
    """Create an agent with a vector store for document search."""
    # Upload files
    uploaded_files = []
    for path in document_paths:
        with open(path, "rb") as f:
            file = client.agents.upload_file_and_poll(
                file=f,
                purpose="assistants",
            )
            uploaded_files.append(file.id)

    # Create vector store
    vector_store = client.agents.create_vector_store_and_poll(
        file_ids=uploaded_files,
        name="knowledge-base",
    )

    # Create agent with file search tool
    file_search_tool = FileSearchTool(vector_store_ids=[vector_store.id])

    agent = client.agents.create_agent(
        model="gpt-4o",
        name="rag-agent",
        instructions=(
            "You are a document assistant. Answer questions using only the provided documents. "
            "Always cite the source document and section when answering."
        ),
        tools=file_search_tool.definitions,
        tool_resources=file_search_tool.resources,
    )

    return agent, vector_store
```

---

## Connection-Based Data Access

```python
from azure.ai.projects.models import AzureAISearchTool

def create_search_agent(client, search_connection_name: str, index_name: str):
    """Create an agent connected to Azure AI Search."""
    # Get the AI Search connection from the Foundry project
    connection = client.connections.get(search_connection_name)

    search_tool = AzureAISearchTool(
        index_connection_id=connection.id,
        index_name=index_name,
    )

    agent = client.agents.create_agent(
        model="gpt-4o",
        name="search-agent",
        instructions=(
            "You are a search assistant. Use Azure AI Search to find relevant documents. "
            "Summarize search results and provide source citations."
        ),
        tools=search_tool.definitions,
        tool_resources=search_tool.resources,
    )

    return agent
```

---

## Agent State Management

Agents do not have built-in persistent state across threads. Use external storage for state.

```python
import json
from datetime import datetime

class AgentStateManager:
    """Manages agent state across sessions using external storage."""

    def __init__(self, storage_path: str = "agent_state.json"):
        self.storage_path = storage_path
        self._state: dict = {}
        self._load()

    def _load(self) -> None:
        try:
            with open(self.storage_path) as f:
                self._state = json.load(f)
        except FileNotFoundError:
            self._state = {}

    def _save(self) -> None:
        with open(self.storage_path, "w") as f:
            json.dump(self._state, f, indent=2, default=str)

    def save_thread_ref(self, session_id: str, thread_id: str, agent_id: str) -> None:
        self._state[session_id] = {
            "thread_id": thread_id,
            "agent_id": agent_id,
            "last_active": datetime.utcnow().isoformat(),
        }
        self._save()

    def get_thread_ref(self, session_id: str) -> dict | None:
        return self._state.get(session_id)

    def cleanup_old_sessions(self, max_age_hours: int = 24) -> int:
        """Remove state entries for old sessions."""
        cutoff = datetime.utcnow().timestamp() - max_age_hours * 3600
        to_remove = [
            sid for sid, data in self._state.items()
            if datetime.fromisoformat(data["last_active"]).timestamp() < cutoff
        ]
        for sid in to_remove:
            del self._state[sid]
        self._save()
        return len(to_remove)
```

---

## Agent Evaluation Patterns

```python
from azure.ai.evaluation import evaluate, RelevanceEvaluator, GroundednessEvaluator

def evaluate_agent_responses(
    client,
    agent_id: str,
    test_cases: list[dict]
) -> dict:
    """
    Evaluate agent responses against test cases.

    test_cases format:
    [{"question": "...", "expected": "...", "context": "..."}]
    """
    # Collect agent responses
    results = []
    for case in test_cases:
        thread = client.agents.create_thread()
        client.agents.create_message(thread_id=thread.id, role="user", content=case["question"])
        run = client.agents.create_and_process_run(thread_id=thread.id, agent_id=agent_id)

        response = ""
        if run.status == "completed":
            messages = client.agents.list_messages(thread_id=thread.id)
            for msg in messages.data:
                if msg.role == "assistant":
                    response = msg.content[0].text.value if msg.content else ""
                    break

        results.append({
            "query": case["question"],
            "response": response,
            "context": case.get("context", ""),
            "ground_truth": case.get("expected", ""),
        })

        client.agents.delete_thread(thread_id=thread.id)

    # Run evaluators
    eval_results = evaluate(
        data=results,
        evaluators={
            "relevance": RelevanceEvaluator(model_config={
                "azure_endpoint": client._config.endpoint,
                "model": "gpt-4o",
            }),
            "groundedness": GroundednessEvaluator(model_config={
                "azure_endpoint": client._config.endpoint,
                "model": "gpt-4o",
            }),
        },
    )

    return eval_results
```

---

## Responsible AI Design Principles

| Principle | Implementation Pattern |
|---|---|
| Input validation | Validate user messages for prompt injection before passing to agent |
| Output filtering | Apply content safety filters on agent responses before returning to users |
| Scope limitation | Write narrow, task-specific system prompts; avoid "do anything" instructions |
| Human-in-the-loop | For high-stakes actions (delete, send email), require confirmation step |
| Audit logging | Log all thread IDs, run IDs, and agent actions for traceability |
| Rate limiting | Throttle user request rates to prevent abuse |
| PII redaction | Strip PII from messages before logging; use structured logging |
| Grounding | Prefer file search or AI Search tools over bare LLM recall for factual queries |
| Fail-safe defaults | On run failure, return a safe fallback message; never expose raw errors |
| Transparency | Inform users when they are interacting with an AI agent |

---

## Error Codes

| Error | Meaning | Remediation |
|-------|---------|-------------|
| Run status `failed` | Agent run encountered an error | Check `run.last_error.code` and `run.last_error.message` |
| `requires_action` status | Function tool call pending | Submit tool outputs via `submit_tool_outputs` |
| `expired` status | Run expired (default: 10 minutes) | Recreate the run; consider reducing prompt complexity |
| `cancelled` status | Run was cancelled | Check if cancellation was intentional; recreate if needed |
| `file_not_found` in file search | Vector store not attached | Update agent `tool_resources` with valid vector store IDs |
| `IndexNotFound` in AI Search | Index name incorrect | Verify index name in Azure AI Search resource |
| Streaming `ConnectionError` | Network interruption | Implement retry with exponential backoff |
| `QuotaExceeded` | Model token quota hit | Reduce prompt size; request quota increase |
| Function tool timeout | Tool execution exceeded run time limit | Optimize tool functions; use async patterns |
| State `thread_id` not found | Thread was deleted or expired | Create a new thread; restore state from external storage |

---

## Limits

| Resource | Limit | Notes |
|---|---|---|
| Agents per project | 100 | Contact Microsoft for increase |
| Threads per project | No hard limit | Clean up unused threads |
| Run timeout | 10 minutes | Set via `timeout` parameter in run creation |
| Messages per thread | 100,000 | Practical context limit is model token window |
| Files per vector store | 10,000 | |
| Vector store size | 100 GB | |
| File size per upload | 512 MB | |
| Concurrent runs | Limited by model capacity | Queue requests with backoff on `429` |
| Tool call nesting | 1 level | Agents cannot call agents recursively via native SDK |
| Streaming token size | Model max token limit | gpt-4o: 128k context window |
| Function tools per agent | 128 | Combine related functions into one tool |
| Evaluation concurrent jobs | 20 | Batch evaluation datasets to stay under limit |
