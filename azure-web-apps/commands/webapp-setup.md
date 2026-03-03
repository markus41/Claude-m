---
name: webapp-setup
description: Set up the Azure Web Apps plugin — install Azure CLI, configure subscription, and verify App Service access
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

# Azure Web Apps Setup

Guide the user through setting up Azure App Service management tools.

## Step 1: Check Prerequisites

Verify Azure CLI is installed:

```bash
az --version
```

If not installed, direct the user to: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli

## Step 2: Authenticate

```bash
az login
```

## Step 3: Select Subscription

```bash
az account list --output table
az account set --subscription "<subscription-id>"
```

## Step 4: Verify App Service Access

```bash
az webapp list --output table
```

## Step 5: Output Summary

```markdown
# Azure Web Apps Plugin Setup Report

| Setting | Value |
|---|---|
| Azure CLI version | [version] |
| Subscription | [name / id] |
| Auth status | [logged in / not logged in] |
| Web apps found | [count] |
```

If `--minimal` is passed, stop after Step 1.
