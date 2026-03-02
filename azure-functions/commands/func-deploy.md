---
name: func-deploy
description: "Deploy an Azure Functions project to Azure via CLI or generate a GitHub Actions CI/CD workflow"
argument-hint: "[--cli] [--github-actions] [--app-name <function-app-name>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Deploy Azure Functions

Deploy the current project to Azure or generate a CI/CD pipeline configuration.

## Instructions

### 1. Validate Inputs

- `--cli` — Deploy immediately using Azure CLI / Core Tools.
- `--github-actions` — Generate a GitHub Actions workflow file instead of deploying.
- `--app-name` — The Azure Function App name. Ask if not provided.

If neither `--cli` nor `--github-actions` is specified, ask the user which method they prefer.

### 2. Pre-Deployment Checks

Before deploying, verify:
- `host.json` exists and contains valid configuration.
- `package.json` has a `build` script (usually `tsc`).
- TypeScript compiles without errors: `npm run build`.
- `local.settings.json` is NOT included in deployment (check `.funcignore`).

### 3. Option A: Deploy via CLI

**Build the project**:
```bash
npm run build
```

**Deploy using Azure Functions Core Tools**:
```bash
func azure functionapp publish <app-name>
```

**Or deploy using Azure CLI**:
```bash
az functionapp deployment source config-zip \
  --resource-group <rg-name> \
  --name <app-name> \
  --src <zip-path>
```

**Configure app settings** (if needed):
```bash
az functionapp config appsettings set \
  --name <app-name> \
  --resource-group <rg-name> \
  --settings "SETTING_NAME=value"
```

### 4. Option B: Generate GitHub Actions Workflow

Create `.github/workflows/azure-functions-deploy.yml`:

```yaml
name: Deploy Azure Functions

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  AZURE_FUNCTIONAPP_NAME: '<app-name>'
  NODE_VERSION: '18.x'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Run tests
        run: npm test --if-present

      - name: Login to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Deploy to Azure Functions
        uses: azure/functions-action@v1
        with:
          app-name: ${{ env.AZURE_FUNCTIONAPP_NAME }}
          package: '.'
```

Instruct the user to:
1. Create an Azure service principal: `az ad sp create-for-rbac --name "github-deploy" --role contributor --scopes /subscriptions/<sub-id>/resourceGroups/<rg-name> --sdk-auth`
2. Add the JSON output as a GitHub secret named `AZURE_CREDENTIALS`.

### 5. Deployment Slots (Optional)

If the user wants staged deployments:

```bash
# Create a staging slot
az functionapp deployment slot create \
  --name <app-name> --resource-group <rg-name> --slot staging

# Deploy to staging
func azure functionapp publish <app-name> --slot staging

# Swap staging to production
az functionapp deployment slot swap \
  --name <app-name> --resource-group <rg-name> \
  --slot staging --target-slot production
```

### 6. Display Summary

Show the user:
- Deployment method used (CLI or GitHub Actions)
- Function App URL: `https://<app-name>.azurewebsites.net`
- How to verify: `curl https://<app-name>.azurewebsites.net/api/<function-name>`
- How to view logs: `func azure functionapp logstream <app-name>`
- Next steps (configure app settings, set up monitoring)
