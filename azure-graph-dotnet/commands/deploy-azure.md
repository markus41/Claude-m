---
name: azure-graph-dotnet:deploy-azure
description: Deploy a C# Azure Functions or Container Job project to Azure — provision infrastructure with Bicep, push image to ACR, assign Managed Identity Graph permissions, and generate or update GitHub Actions or Azure DevOps CI/CD pipelines.
argument-hint: "[--functions | --container-job] [--resource-group rg-name] [--location eastus]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - AskUserQuestion
---

# Deploy to Azure

End-to-end deployment of a C# Azure Functions or Container Job project to Azure.

## Deployment Flow

### Step 1: Discover Project Type

Read the project structure to determine what to deploy:
- Glob for `*.csproj` + `host.json` → Azure Functions
- Glob for `*.csproj` + `Dockerfile` → Container Job
- If both exist, ask the user which to deploy

### Step 2: Collect Deployment Parameters

Ask for any parameters not provided as arguments:

- **Resource group name** (default: `rg-graph-intelligence`)
- **Azure region** (default: `eastus`)
- **Function App name** or **Container App Job name**
- **Azure subscription** (show list from `az account list --output table`)
- **CI/CD system** — GitHub Actions / Azure DevOps / both / none (manual deploy only)

For Container Jobs additionally:
- **ACR name** (Azure Container Registry)
- **ACA Environment name** (Azure Container Apps environment)

### Step 3: Prerequisite Checks

```bash
az --version 2>/dev/null | head -1
az account show --query "{name:name, id:id, tenantId:tenantId}" -o json
func --version 2>/dev/null  # only for Functions
docker --version 2>/dev/null  # only for Container Jobs
```

If not logged in: print `az login` and pause.

### Step 4: Provision Infrastructure (Bicep)

Check if `infra/main.bicep` exists. If not, write it for the selected project type (see reference).

```bash
# Create resource group if needed
az group create --name {resource-group} --location {location}

# Deploy Bicep template
az deployment group create \
  --resource-group {resource-group} \
  --template-file infra/main.bicep \
  --parameters infra/main.bicepparam \
  --name "deploy-$(date +%Y%m%d-%H%M%S)"
```

Capture and display outputs (Function App name, principal ID, ACR login server, etc.).

### Step 5a: Deploy Azure Functions

```bash
# Build release
dotnet publish -c Release -o ./publish

# Deploy
func azure functionapp publish {function-app-name} --dotnet-isolated

# Verify — list functions
az functionapp function list \
  --name {function-app-name} \
  --resource-group {resource-group} \
  --query "[].{name:name, invokeUrl:invokeUrlTemplate}" -o table
```

### Step 5b: Deploy Container Job

```bash
# Build and push to ACR
az acr build \
  --registry {acr-name} \
  --image graph-scan-job:{git-sha} \
  --image graph-scan-job:latest \
  .

# Update Container App Job image
az containerapp job update \
  --name {job-name} \
  --resource-group {resource-group} \
  --image {acr-name}.azurecr.io/graph-scan-job:latest
```

### Step 6: Assign Managed Identity Graph Permissions

After infrastructure is provisioned, assign the required Graph app roles to the Managed Identity:

```bash
PRINCIPAL_ID=$(az deployment group show \
  --resource-group {resource-group} \
  --name "deploy-..." \
  --query properties.outputs.principalId.value -o tsv)

# Assign roles based on operations used
./infra/assign-graph-roles.sh "$PRINCIPAL_ID" \
  Sites.Read.All Files.Read.All User.Read.All
```

If `assign-graph-roles.sh` doesn't exist, write it inline.

Show the role assignments and confirm they applied:
```bash
az rest --method GET \
  --uri "https://graph.microsoft.com/v1.0/servicePrincipals/{principalId}/appRoleAssignments" \
  --query "value[].{role:appRoleId}" -o table
```

### Step 7: Generate or Update CI/CD Pipeline

Ask for CI/CD system if not provided:

**GitHub Actions:** write `.github/workflows/deploy.yml` (OIDC, no secrets):
- Set up OIDC federated credential:
  ```bash
  az ad app federated-credential create --id {client-id} \
    --parameters '{"name":"github-main","issuer":"https://token.actions.githubusercontent.com","subject":"repo:{owner}/{repo}:ref:refs/heads/main","audiences":["api://AzureADTokenExchange"]}'
  ```
- Print the three secrets to add to GitHub: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`

**Azure DevOps:** write `azure-pipelines.yml` with service connection name placeholder.

### Step 8: Verification

- Functions: `curl -X POST "https://{app}.azurewebsites.net/api/TriggerScan/site/{siteId}?code={key}"`
- Container Job: `az containerapp job start --name {job} --resource-group {rg}`

Check logs:
```bash
# Functions
az webapp log tail --name {function-app-name} --resource-group {resource-group}

# Container Job
az containerapp job execution list \
  --name {job-name} --resource-group {resource-group} \
  --query "[0].{name:name, status:properties.status}" -o table
```

### Step 9: Summary

```
## Deployment Complete

| Resource | Name | Status |
|---------|------|--------|
| Resource Group | {rg} | Created |
| Function App / ACA Job | {name} | Deployed |
| ACR (Container Job) | {name} | Image pushed |
| Managed Identity | {name} | Graph roles assigned |
| CI/CD Pipeline | GitHub Actions / ADO | Written |

Graph permissions assigned:
  ✓ Sites.Read.All
  ✓ Files.Read.All
  ✓ User.Read.All

### URLs
- Function app: https://{app}.azurewebsites.net
- Application Insights: https://portal.azure.com/#resource/...
```

## Arguments

- `--functions`: Deploy as Azure Functions (skip project type question)
- `--container-job`: Deploy as Azure Container Job
- `--resource-group <name>`: Target resource group
- `--location <region>`: Azure region (default: eastus)
- `--no-infra`: Skip Bicep provisioning (assume resources already exist)
- `--no-cicd`: Skip CI/CD pipeline generation
- `--dry-run`: Show all planned commands without executing
