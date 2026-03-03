# Azure AI Foundry Authentication

## Service Principal via DefaultAzureCredential

Service Principal authentication via `DefaultAzureCredential` is the recommended approach for this plugin. The credential chain tries Managed Identity first, then Service Principal, then Azure CLI.

## Required Environment Variables

| Variable | Description | Example |
|---|---|---|
| `AZURE_AI_FOUNDRY_CONNECTION_STRING` | Project connection string | `eastus.api.azureml.ms;abc123;my-rg;my-project` |
| `AZURE_CLIENT_ID` | App Registration Application (client) ID | `11111111-2222-3333-4444-555555555555` |
| `AZURE_CLIENT_SECRET` | Client secret value | `your~secret~value` |
| `AZURE_TENANT_ID` | Entra ID tenant ID | `44444444-5555-6666-7777-888888888888` |

## Connection String Format

```
<region>.api.azureml.ms;<subscription-id>;<resource-group>;<project-name>
```

Find it in the Azure Portal: **AI Foundry** → Your Project → **Overview** → **"Project connection string"**

## Creating the Service Principal

```bash
# Create SP with Azure AI Developer role scoped to the project
az ad sp create-for-rbac \
  --name "agent-foundry-sp" \
  --role "Azure AI Developer" \
  --scopes "/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.MachineLearningServices/workspaces/<project>"
```

The output contains `appId` (→ `AZURE_CLIENT_ID`), `password` (→ `AZURE_CLIENT_SECRET`), and `tenant` (→ `AZURE_TENANT_ID`).

## Role Requirements

| Role | Permissions | When to Use |
|---|---|---|
| `Azure AI Developer` | Create, run, read, update, delete agents; access models and connections | Default for this plugin |
| `Azure AI User` | Run agents, read results; no create or delete | Read-only / restricted mode |
| `Cognitive Services OpenAI User` | Invoke Azure OpenAI endpoints directly | If calling OpenAI APIs separately |
| `Owner` or `Contributor` | Full resource management | Only needed for hub/project provisioning |

## Persisting Credentials

**Option A — Claude Code settings** (`~/.claude/settings.json`):
```json
{
  "env": {
    "AZURE_AI_FOUNDRY_CONNECTION_STRING": "eastus.api.azureml.ms;...",
    "AZURE_CLIENT_ID": "...",
    "AZURE_CLIENT_SECRET": "...",
    "AZURE_TENANT_ID": "..."
  }
}
```

**Option B — `.env` file** (add to `.gitignore`):
```
AZURE_AI_FOUNDRY_CONNECTION_STRING=...
AZURE_CLIENT_ID=...
AZURE_CLIENT_SECRET=...
AZURE_TENANT_ID=...
```

**Option C — Shell profile** (`~/.bashrc` / `~/.zshrc`):
```bash
export AZURE_AI_FOUNDRY_CONNECTION_STRING="..."
export AZURE_CLIENT_ID="..."
export AZURE_CLIENT_SECRET="..."
export AZURE_TENANT_ID="..."
```

## Verifying Authentication

```bash
# Confirm the SP can access the project
az account get-access-token \
  --resource https://management.azure.com/ \
  --tenant $AZURE_TENANT_ID

# Or via Python SDK
from azure.identity import ClientSecretCredential
credential = ClientSecretCredential(
    tenant_id=os.environ["AZURE_TENANT_ID"],
    client_id=os.environ["AZURE_CLIENT_ID"],
    client_secret=os.environ["AZURE_CLIENT_SECRET"]
)
token = credential.get_token("https://management.azure.com/.default")
print("Token acquired:", token.token[:20], "...")
```

## Secret Rotation

Client secrets expire. Default expiry is 1 year from creation.

```bash
# Create a new secret (keep old one active until rotation is complete)
az ad app credential reset --id <app-id> --append

# Update the AZURE_CLIENT_SECRET environment variable
# Then delete the old secret from the App Registration
az ad app credential delete --id <app-id> --key-id <old-key-id>
```
