---
name: swa-create
description: Create a new Azure Static Web App resource
argument-hint: "<app-name> <resource-group>"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - AskUserQuestion
---

# Create Static Web App

Guide the user through creating a new Azure Static Web App.

## Step 1: Gather Requirements

Ask the user for:
1. App name
2. Resource group
3. Region (e.g., eastus2, westeurope, eastasia)
4. SKU (Free or Standard)
5. GitHub repository URL (optional — for auto CI/CD)
6. Framework preset (React, Angular, Vue, Next.js, Gatsby, Blazor, or custom)

## Step 2: Create Resource Group (if needed)

```bash
az group create --name <rg> --location <region>
```

## Step 3: Create Static Web App

**Without GitHub integration**:
```bash
az staticwebapp create --name <app-name> --resource-group <rg> --location <region> --sku Free
```

**With GitHub integration**:
```bash
az staticwebapp create --name <app-name> --resource-group <rg> --location <region> \
  --source <github-repo-url> --branch main \
  --app-location "/" --api-location "api" --output-location "build" \
  --login-with-github
```

## Step 4: Generate staticwebapp.config.json

Create a starter configuration file based on the chosen framework.

## Step 5: Output Summary

Display the app URL, deployment token, and next steps for local development.
