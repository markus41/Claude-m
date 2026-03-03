---
name: af-agent-status
description: Show the status and run history of a deployed Azure AI Foundry agent -- displays agent configuration, recent runs, token usage, and health diagnostics
argument-hint: "<agent-id>"
allowed-tools:
  - Bash
  - AskUserQuestion
---

# Agent Status

Show the full status and health diagnostics for a deployed Azure AI Foundry agent.

## Step 1: Resolve Agent

If `<agent-id>` is provided, fetch the agent details directly.

If not provided, ask: "Which agent ID or name would you like to check? (Run af-list-agents to see all agents)"

## Step 2: Fetch Agent Details

Use the `azure-ai-foundry` MCP server to retrieve:

1. **Agent configuration**: name, model, instructions (truncated to 200 chars), tools, created/modified timestamps
2. **Recent runs**: last 10 runs across all threads — status, duration, token usage, error if any
3. **Run statistics**: total runs, success rate, average completion time, peak token usage

## Step 3: Display Status Report

```
─────────────────────────────────────────
Agent Status Report
─────────────────────────────────────────
ID:           asst_abc123
Name:         invoice-processor
Model:        gpt-4o
Created:      2025-01-15 10:30 UTC
Modified:     2025-01-22 08:00 UTC
Tools:        code_interpreter, file_search

Instructions (preview):
  "You are an expert invoice processing agent. You extract line items,
  totals, vendor names, and due dates from uploaded invoice documents..."

─────────────────────────────────────────
Run Statistics (last 30 days)
─────────────────────────────────────────
Total runs:        47
Completed:         44  (93.6%)
Failed:             2  (4.3%)
Cancelled:          1  (2.1%)
Avg duration:    8.3s
Avg tokens/run:  1,240

─────────────────────────────────────────
Recent Runs
─────────────────────────────────────────
| Run ID         | Thread ID      | Status    | Duration | Tokens | Created             |
|----------------|----------------|-----------|----------|--------|---------------------|
| run_xyz...     | thr_abc...     | completed | 6.2s     | 980    | 2025-01-22 09:15    |
| run_uvw...     | thr_def...     | failed    | 1.1s     | 120    | 2025-01-21 16:40    |
```

## Step 4: Diagnose Failures

If any runs have status `failed`, fetch and display the `last_error`:

```
Failed Run Diagnostics:
  Run: run_uvw...
  Error code:    rate_limit_exceeded
  Error message: Exceeded token rate limit for model gpt-4o. Retry after 30 seconds.
  Recommendation: Switch to gpt-4o-mini for high-volume agents or add retry logic.
```

## Step 5: Health Assessment

Based on the data, provide a health rating and recommendations:

- **Healthy** (>95% success rate): Agent is operating normally
- **Degraded** (80–95% success rate): Minor issues — investigate failed runs
- **Unhealthy** (<80% success rate): Action needed — review error patterns

If unhealthy, suggest:
- Common fixes based on the error codes found
- Whether to update agent instructions (`af-deploy-agent --update`)
- Whether to test with simpler inputs first (`af-test-agent`)
