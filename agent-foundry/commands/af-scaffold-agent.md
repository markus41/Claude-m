---
name: af-scaffold-agent
description: Scaffold a new AI agent from a natural language description -- invokes the Agent Generator to produce both a Claude Code .md file and an Azure AI Foundry agent JSON payload
argument-hint: "<description-of-agent>"
allowed-tools:
  - Read
  - Write
  - AskUserQuestion
  - Agent
---

# Scaffold Agent

Scaffold a new AI agent definition from a natural language description.

## Behavior

1. If `<description-of-agent>` is provided as an argument, pass it directly to the Agent Generator agent.
2. If no argument is provided, ask the user: "Describe the agent you want to build — what should it do, when should it activate, and what inputs/outputs does it work with?"
3. Invoke the **Agent Generator** agent with the description and any additional context from the conversation.
4. The Agent Generator will:
   - Clarify any missing details via `AskUserQuestion`
   - Produce a Claude Code agent `.md` file
   - Produce an Azure AI Foundry agent JSON payload
   - Ask whether to save the `.md` file and deploy to Foundry

## After Generation

Once the Agent Generator completes:

- Confirm the saved `.md` file path to the user
- Remind the user that the **Agent Evaluator** will automatically validate the file
- Suggest next steps:
  - `af-deploy-agent` to deploy the JSON to Azure AI Foundry
  - `af-test-agent` to test the deployed agent

## Tips

- Be specific in your description: "An agent that reviews Azure Policy definitions for compliance gaps and outputs a markdown report sorted by severity" produces much better results than "a policy agent"
- Mention the expected output format upfront
- If you want the agent to call Azure AI Foundry tools (code interpreter, file search, Azure AI Search), mention them in the description
