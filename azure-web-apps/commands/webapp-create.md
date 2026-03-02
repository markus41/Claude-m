---
name: webapp-create
description: Create an Azure Web App with an App Service Plan
argument-hint: "<app-name> <resource-group> [--sku B1]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - AskUserQuestion
---

# Create Azure Web App

Guide the user through creating an Azure Web App.

## Step 1: Gather Requirements

Ask the user for:
1. App name (must be globally unique — becomes `<name>.azurewebsites.net`)
2. Resource group (existing or create new)
3. Region (e.g., eastus, westeurope)
4. Runtime stack (dotnet, node, python, java, php)
5. SKU/tier (F1=Free, B1=Basic, S1=Standard, P1v3=Premium)

## Step 2: Create Resource Group (if needed)

```bash
az group create --name <rg> --location <region>
```

## Step 3: Create App Service Plan

```bash
az appservice plan create --name <plan-name> --resource-group <rg> --sku <sku> --location <region>
```

## Step 4: Create Web App

```bash
az webapp create --name <app-name> --resource-group <rg> --plan <plan-name> --runtime "<runtime>"
```

## Step 5: Enable Managed Identity

```bash
az webapp identity assign --name <app-name> --resource-group <rg>
```

## Step 6: Output Summary

Display the app URL, resource IDs, managed identity principal ID, and next steps.
