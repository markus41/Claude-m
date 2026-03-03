---
name: af-test-agent
description: Test a deployed Azure AI Foundry agent by creating a thread, sending a message, and displaying the response -- supports interactive multi-turn conversations
argument-hint: "<agent-id> [--message \"<text>\"]"
allowed-tools:
  - Read
  - Bash
  - AskUserQuestion
---

# Test Agent

Test a deployed Azure AI Foundry agent by running a conversation through the Agent Service thread/run API.

## Step 1: Identify the Agent

If `<agent-id>` is provided, use it directly.

If not provided:
- Use `af-list-agents` output or ask the user to provide an agent ID or name
- If a name is given, resolve it to an ID using the MCP tool (list agents, match by name)

## Step 2: Get the Test Message

If `--message "<text>"` is provided, use that as the first user message.

If not provided, ask the user: "What message should I send to the agent?"

## Step 3: Create a Thread and Run

Use the `azure-ai-foundry` MCP server to:

1. Create a new thread
2. Add the user message to the thread
3. Start a run with the specified agent ID
4. Poll for run completion (check status: `queued` → `in_progress` → `completed` / `failed` / `requires_action`)

Display polling status to the user as it progresses.

## Step 4: Handle Run States

**completed**: Retrieve and display all assistant messages from the thread

**failed**: Display the `last_error` from the run object with code and message

**requires_action**: If the agent has function tools that require calling:
- Display the function name and arguments the agent wants to call
- Ask the user: "The agent is requesting a tool call. Provide the result or cancel?"
- Submit the tool output and resume the run

**cancelled / expired**: Notify the user and suggest restarting

## Step 5: Display Results

Show the agent's response in a formatted block:

```
Agent: <agent-name> (<agent-id>)
Thread: <thread-id>
Run: <run-id>
Status: completed

Response:
──────────────────────────────
<assistant message text>
──────────────────────────────
```

If the response contains file annotations or citations, list them below the response.

## Step 6: Continue or End

Ask the user: "Send another message to continue the conversation, or press Enter to end the test session."

If continuing, add the next message to the same thread and start a new run.

## Tips

- Use specific, realistic test inputs that match the agent's intended use case
- For agents with file search, upload a test file to the project first
- Run IDs and thread IDs are useful for `af-agent-status` diagnostics
