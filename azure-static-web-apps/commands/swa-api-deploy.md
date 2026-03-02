---
name: swa-api-deploy
description: Create and deploy a managed Functions API for the Static Web App
argument-hint: "<function-name>"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - AskUserQuestion
---

# Deploy API Function

Create and deploy a managed Azure Functions API for the Static Web App.

## Step 1: Gather Requirements

Ask the user for:
1. Function name
2. HTTP method (GET, POST, PUT, DELETE)
3. Language (JavaScript/TypeScript, C#, Python)

## Step 2: Create API Directory

```bash
mkdir -p api/<function-name>
```

## Step 3: Generate Function Files

Create `function.json` and the handler file based on the chosen language.

## Step 4: Local Testing

```bash
swa start --api-location api
```

## Step 5: Output Summary

Display the API endpoint URL (`/api/<function-name>`) and test instructions.
