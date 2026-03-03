# Azure AI Agent Service — Troubleshooting

## Authentication Errors

### `AuthenticationError` / `401 Unauthorized`

| Symptom | Cause | Fix |
|---|---|---|
| `AADSTS70011: Invalid scope` | Wrong resource URI | Use `https://cognitiveservices.azure.com/.default` |
| `AADSTS700016: Application not found` | Wrong `AZURE_CLIENT_ID` | Verify App Registration exists in the correct tenant |
| `AADSTS70019: Consent required` | SP lacks consent | Run `az ad app permission grant --id <app-id>` |
| Token expired | Session expired | Delete cached tokens, re-authenticate |
| `403 Forbidden` (not 401) | SP lacks required role | Assign `Azure AI Developer` role to the SP on the project |

**Debug authentication:**
```python
from azure.identity import ClientSecretCredential
import os

cred = ClientSecretCredential(
    tenant_id=os.environ["AZURE_TENANT_ID"],
    client_id=os.environ["AZURE_CLIENT_ID"],
    client_secret=os.environ["AZURE_CLIENT_SECRET"]
)
try:
    token = cred.get_token("https://management.azure.com/.default")
    print("Auth OK, token acquired")
except Exception as e:
    print("Auth FAILED:", e)
```

---

## Agent Deployment Errors

### `model_not_found` / `404 on model deployment`

| Symptom | Fix |
|---|---|
| `DeploymentNotFound: <model-name>` | The `model` field must match the **deployment name** (not the base model name). In AI Foundry, navigate to **Deployments** to find the exact name |
| `Quota exceeded` | Request a quota increase in the Azure Portal, or use a different model deployment |
| `UnsupportedModel: model does not support Assistants API` | Use a model that supports the Assistants API (GPT-4o, GPT-4o mini, GPT-4 Turbo, GPT-3.5 Turbo) |

### Agent `name` Rejected

- Names must be 1–256 characters
- Only alphanumeric, hyphens, and underscores are allowed in some API versions
- Remove spaces — use `my-agent` not `my agent`

---

## Run Failures

### Run Stuck in `in_progress`

| Cause | Fix |
|---|---|
| Token rate limit exceeded | Set `max_completion_tokens` on run creation (e.g., `4096`) |
| Agent in infinite tool-call loop | Add explicit stopping conditions to agent instructions |
| Code interpreter running long computation | Increase poll timeout; add a time limit in the instructions |
| Network timeout | Retry the run; check Azure service health at status.azure.com |

```python
# Set limits on run creation to prevent runaway costs
run = client.agents.create_run(
    thread_id=thread.id,
    assistant_id=agent_id,
    max_completion_tokens=4096,
    max_prompt_tokens=8192
)
```

### Run Failed with `server_error`

Transient Azure-side error. Retry after 10–30 seconds. If persistent, check [Azure Service Health](https://status.azure.com).

### `requires_action` Not Resolved

| Cause | Fix |
|---|---|
| Function call submitted with wrong `tool_call_id` | Match the `id` from `run.required_action.submit_tool_outputs.tool_calls[n].id` exactly |
| `submit_tool_outputs_to_run` called after run expired | Runs expire if action is not submitted within 10 minutes |
| Missing tool call in outputs | All tool calls in the `requires_action` list must be submitted in a single batch |

---

## Thread and Message Issues

### Empty Message List After Run Completes

- Verify `thread_id` used for `list_messages` matches the thread used for the run
- Messages are ordered newest-first by default; the assistant reply is `messages.data[0]`
- Check `messages.data[0].role == "assistant"` before reading content

### `file_not_found` in File Search Results

- The vector store must be attached to the agent via `tool_resources.file_search.vector_store_ids`
- Verify file upload completed with status `completed` (not `in_progress`)
- Check the file is in a supported format (`.pdf`, `.docx`, `.txt`, `.md`, etc.)

---

## MCP Server Issues

### MCP Server Fails to Start

```
Error: command 'uvx' not found
```

**Fix**: Install `uv`: `pip install uv` or `pipx install uv`. Verify with `uvx --version`.

```
Error: Package 'azure-ai-mcp' not found
```

**Fix**: Check the package name on PyPI; install manually with `pip install azure-ai-mcp`.

### MCP Tool Returns No Data

- Check that `PROJECT_CONNECTION_STRING` is set and correctly formatted
- Verify the SP credentials are valid (see Authentication section above)
- Run `uvx azure-ai-mcp --help` directly in a terminal to confirm the server starts without errors

---

## Rate Limits and Quotas

| Resource | Default Limit | How to Increase |
|---|---|---|
| Requests per minute (RPM) | Model-dependent | Azure Portal → AI Foundry → Deployments → Edit quota |
| Tokens per minute (TPM) | Model-dependent | Same as RPM |
| Max threads per project | 100,000 | Contact Azure support |
| Max files per vector store | 10,000 | Contact Azure support |
| Max file size | 512 MB | Not increaseable; split large files |

**Implement exponential backoff for rate limit errors:**
```python
import time

def run_with_backoff(client, thread_id, agent_id, max_retries=3):
    for attempt in range(max_retries):
        try:
            run = client.agents.create_and_process_run(
                thread_id=thread_id,
                assistant_id=agent_id
            )
            return run
        except Exception as e:
            if "rate_limit" in str(e).lower() and attempt < max_retries - 1:
                wait = 2 ** attempt * 5  # 5s, 10s, 20s
                print(f"Rate limited, retrying in {wait}s...")
                time.sleep(wait)
            else:
                raise
```
