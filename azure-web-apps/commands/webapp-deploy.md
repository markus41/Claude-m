---
name: webapp-deploy
description: Deploy code to an Azure Web App via ZIP deploy, GitHub Actions, or Docker
argument-hint: "<app-name> <method>"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - AskUserQuestion
---

# Deploy to Azure Web App

Guide the user through deploying code to an existing Azure Web App.

## Step 1: Select Deployment Method

Ask the user:
1. ZIP deploy (fastest for quick deployments)
2. GitHub Actions (CI/CD pipeline)
3. Docker container
4. Local Git

## ZIP Deploy

```bash
az webapp deploy --resource-group <rg> --name <app-name> --src-path <archive.zip> --type zip
```

## GitHub Actions

Generate a workflow file at `.github/workflows/azure-webapp.yml`:

```yaml
name: Deploy to Azure Web App
on:
  push:
    branches: [main]
permissions:
  id-token: write
  contents: read
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
      - uses: azure/webapps-deploy@v3
        with:
          app-name: '<app-name>'
```

## Docker Deploy

```bash
az webapp config container set --name <app-name> --resource-group <rg> \
  --container-image-name <registry>.azurecr.io/<image>:<tag> \
  --container-registry-url https://<registry>.azurecr.io
```

## Output Summary

Display deployment status, URL, and verification steps.
