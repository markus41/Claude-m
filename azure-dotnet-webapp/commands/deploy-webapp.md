---
name: azure-dotnet-webapp:deploy-webapp
description: Provision Azure App Service (Plan + Web App + App Insights + Key Vault) with Bicep, deploy the ASP.NET Core app, configure Managed Identity and Key Vault access, set up staging slots, and generate a GitHub Actions or Azure DevOps CI/CD pipeline.
argument-hint: "[--resource-group <rg>] [--app-name <name>] [--sku B1|P1v3]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Deploy ASP.NET Core Web App to Azure App Service

Provisions Azure infrastructure with Bicep, deploys the app, configures Managed Identity + Key
Vault, and generates a CI/CD pipeline.

## Deployment Flow

### Step 1: Prerequisite Check

```bash
az --version          # Required: Azure CLI 2.50+
dotnet --version      # Required: 8.0+
bicep --version       # Optional (auto-installed by az)
git --version         # Required for CI/CD
```

If `az` is missing: `https://aka.ms/installazurecli`
If not logged in, run: `az login`

### Step 2: Collect Deployment Parameters

Ask for:
1. **Resource group name** (default: `rg-webapp`)
2. **Azure region** (default: `eastus`) — show common choices: eastus, westeurope, australiaeast
3. **App name** (globally unique — used for `{app}.azurewebsites.net`) — validate no spaces/special chars
4. **App Service Plan SKU**:
   - B1 — Basic, ~$13/month, dev/test
   - B2 — Basic, ~$27/month, light production
   - P1v3 — Premium v3, ~$80/month, production
   - P2v3 — Premium v3, ~$160/month, high traffic
5. **Staging slot?** (yes/no — adds a `staging` slot for blue/green deployment)
6. **CI/CD pipeline?**:
   - GitHub Actions
   - Azure DevOps
   - Both
   - None
7. **Entra Tenant ID** (for auth config in App Settings)
8. **Entra App Registration Client ID** (for auth config)

### Step 3: Generate Bicep Template

Write `infra/main.bicep` using the collected parameters. Use the template from
`skills/azure-dotnet-webapp/references/webapp-cicd.md`.

Parameters file `infra/main.bicepparam`:
```bicep
using './main.bicep'

param appName = '{app-name}'
param location = '{region}'
param sku = '{sku}'
param tenantId = '{tenant-id}'
param clientId = '{client-id}'
```

### Step 4: Create Resource Group

```bash
az group create \
  --name {resource-group} \
  --location {region}
```

### Step 5: Bicep What-If Preview

```bash
az deployment group what-if \
  --resource-group {resource-group} \
  --template-file infra/main.bicep \
  --parameters infra/main.bicepparam
```

Show the output to the user and ask: **Proceed with deployment?**
If no, stop here and show the Bicep files that were generated.

### Step 6: Deploy Infrastructure

```bash
az deployment group create \
  --resource-group {resource-group} \
  --template-file infra/main.bicep \
  --parameters infra/main.bicepparam \
  --query "properties.outputs"
```

Capture outputs: `webAppName`, `webAppUrl`, `stagingUrl`, `principalId`.

### Step 7: Grant Azure SQL Access (if EF Core detected)

If `AppDbContext` is found in the project, show instructions to grant MI access to Azure SQL:

```sql
-- Connect to your Azure SQL database as an admin and run:
CREATE USER [{app-name}] FROM EXTERNAL PROVIDER;
ALTER ROLE db_datareader ADD MEMBER [{app-name}];
ALTER ROLE db_datawriter ADD MEMBER [{app-name}];
```

```bash
# Verify MI can connect
az webapp auth show --name {app-name} --resource-group {resource-group}
```

### Step 8: Publish Application

#### Option A: Direct zip deploy

```bash
dotnet publish --configuration Release --output ./publish

az webapp deploy \
  --resource-group {resource-group} \
  --name {app-name} \
  --src-path ./publish \
  --type zip \
  --async true
```

If staging slot was created, deploy to staging first:

```bash
az webapp deploy \
  --resource-group {resource-group} \
  --name {app-name} \
  --slot staging \
  --src-path ./publish \
  --type zip
```

Then swap to production after smoke test:
```bash
az webapp deployment slot swap \
  --resource-group {resource-group} \
  --name {app-name} \
  --slot staging \
  --target-slot production
```

#### Option B: Publish profile (for GitHub Actions)

```bash
# Get publish profile for GitHub secret
az webapp deployment list-publishing-profiles \
  --name {app-name} \
  --resource-group {resource-group} \
  --xml > publish-profile.xml

echo "Add the contents of publish-profile.xml as GitHub secret: AZURE_WEBAPP_PUBLISH_PROFILE"
```

### Step 9: Generate CI/CD Pipeline

#### GitHub Actions

Write `.github/workflows/deploy.yml` using the template from
`skills/azure-dotnet-webapp/references/webapp-cicd.md`, substituting:
- `AZURE_WEBAPP_NAME`: the app name
- Slot names: `staging` and `production`
- Runtime: `ubuntu-latest`, .NET 8

#### Azure DevOps

Write `azure-pipelines.yml` using the ADO template, substituting:
- `webAppName`: the app name
- `resourceGroup`: the resource group name
- Service connection name: prompt user for their ADO service connection name

#### Federated Identity (OIDC — no publish profile needed)

If GitHub Actions + OIDC is selected, generate the Bicep role assignment for GitHub OIDC:

```bash
# Create federated credential for GitHub OIDC
az ad app federated-credential create \
  --id {service-principal-id} \
  --parameters '{
    "name": "github-{repo-slug}",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:{owner}/{repo}:ref:refs/heads/main",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

### Step 10: Verify Deployment

```bash
# Check app is running
az webapp show \
  --name {app-name} \
  --resource-group {resource-group} \
  --query "state"

# Check health endpoint
curl https://{app-name}.azurewebsites.net/health

# Stream live logs
az webapp log tail \
  --name {app-name} \
  --resource-group {resource-group}
```

### Step 11: Summary Report

```
## Deployment Complete — {app-name}

| Item | Value |
|------|-------|
| App URL | https://{app-name}.azurewebsites.net |
| Staging URL | https://{app-name}-staging.azurewebsites.net |
| Resource Group | {resource-group} |
| App Service Plan | {app-name}-plan ({sku}) |
| Application Insights | {app-name}-ai |
| Key Vault | {app-name}-kv |
| Managed Identity | Enabled (System Assigned) |
| Health Check | https://{app-name}.azurewebsites.net/health |

### CI/CD:
- GitHub Actions: .github/workflows/deploy.yml
  Secrets to add:
    AZURE_WEBAPP_PUBLISH_PROFILE — from publish-profile.xml

### Bicep files:
- infra/main.bicep
- infra/main.bicepparam

### Next deployment:
  git push origin main  →  GitHub Actions triggers automatically
```

## Arguments

- `--resource-group <rg>`: Resource group name — skips the question
- `--app-name <name>`: App Service name — skips the question
- `--sku B1|P1v3`: App Service Plan SKU — skips the question
