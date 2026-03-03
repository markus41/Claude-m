---
name: planner-setup
description: Set up the Planner & To Do plugin — configure Azure auth and verify Graph API access to plans and task lists
argument-hint: "[--minimal]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Planner & To Do Setup

Guide the user through setting up Microsoft Planner and To Do API access via Microsoft Graph.

## Step 1: Check Prerequisites

Verify Node.js 18+ is installed.

## Step 2: Install Dependencies

```bash
npm init -y && npm install @azure/identity @azure/msal-node node-fetch
```

## Step 3: Configure Azure App Registration

Register an app in Microsoft Entra ID with these Graph API permissions:
- `Tasks.ReadWrite` (delegated) — read/write Planner tasks
- `Group.ReadWrite.All` (delegated) — create plans (plans require a group owner)
- `Tasks.ReadWrite` (delegated) — read/write To Do tasks

Collect: Tenant ID, Client ID, Client Secret.

## Step 4: Configure Environment

Create `.env`:
```
AZURE_TENANT_ID=<tenant-id>
AZURE_CLIENT_ID=<client-id>
AZURE_CLIENT_SECRET=<client-secret>
```

## Step 5: Verify Access

- Call `GET /me/planner/plans` to list Planner plans.
- Call `GET /me/todo/lists` to list To Do lists.
- Display results in a summary table.

If `--minimal` is passed, stop after Step 2.
