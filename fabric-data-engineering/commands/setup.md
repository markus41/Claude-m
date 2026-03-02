---
name: setup
description: Set up the Fabric Data Engineering plugin — verify Fabric capacity, create workspace, configure lakehouse access
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

# Fabric Data Engineering Setup

Guide the user through setting up a Microsoft Fabric data engineering environment.

## Step 1: Check Prerequisites

Verify the following are available:

- **Azure subscription**: Required for Fabric capacity (F SKUs) or a Fabric trial.
- **Azure CLI**: For managing Fabric capacities and RBAC.
- **Python 3.10+**: Required for local PySpark development and testing.

```bash
az --version        # Must be >= 2.50.0
python --version    # Must be >= 3.10
pip --version
```

## Step 2: Verify Fabric Capacity

Check that a Fabric capacity exists in the Azure subscription:

```bash
az resource list --resource-type "Microsoft.Fabric/capacities" --output table
```

If no capacity exists, guide the user through one of these options:

**Option A: Create an F2 capacity (smallest paid SKU)**
```bash
az resource create --resource-group <rg-name> --name <capacity-name> \
  --resource-type "Microsoft.Fabric/capacities" \
  --properties '{"administration": {"members": ["user@domain.com"]}, "sku": {"name": "F2", "tier": "Fabric"}}' \
  --location <region>
```

**Option B: Start a Fabric trial**
Navigate to https://app.fabric.microsoft.com and click "Start trial" in the account manager. Trials provide 60 days of Fabric capacity.

**Option C: Use existing Power BI Premium capacity (P SKU)**
P1 and above support Fabric workloads. No additional capacity is needed.

## Step 3: Create a Fabric Workspace

```bash
# Via Fabric REST API
curl -X POST "https://api.fabric.microsoft.com/v1/workspaces" \
  -H "Authorization: Bearer $(az account get-access-token --resource https://api.fabric.microsoft.com --query accessToken -o tsv)" \
  -H "Content-Type: application/json" \
  -d '{"displayName": "<workspace-name>", "capacityId": "<capacity-id>"}'
```

Alternatively, create the workspace via the Fabric portal: https://app.fabric.microsoft.com > Workspaces > New workspace.

## Step 4: Install Local Development Tools

For local PySpark development and notebook authoring:

```bash
pip install pyspark delta-spark azure-identity azure-storage-file-datalake
pip install notebook jupyterlab  # Optional, for local notebook editing
```

## Step 5: Configure OneLake Access

Set up authentication for direct OneLake (ADLS Gen2) access:

```bash
# Authenticate via Azure CLI (interactive)
az login

# Or set service principal environment variables
export AZURE_TENANT_ID=<your-tenant-id>
export AZURE_CLIENT_ID=<your-client-id>
export AZURE_CLIENT_SECRET=<your-client-secret>
```

Test OneLake connectivity:
```bash
az storage fs list --account-name onelake --auth-mode login
```

## Step 6: Configure Key Vault for Secrets

Create or reference an Azure Key Vault for storing connection strings and credentials:

```bash
az keyvault create --name <kv-name> --resource-group <rg-name> --location <region>

# Store a secret
az keyvault secret set --vault-name <kv-name> --name "sql-connection-string" --value "<connection-string>"
```

In Fabric notebooks, retrieve secrets with:
```python
secret = mssparkutils.credentials.getSecret("https://<kv-name>.vault.azure.net/", "sql-connection-string")
```

## Step 7: Verify Access

Test by listing workspaces via the Fabric REST API:

```bash
curl -s "https://api.fabric.microsoft.com/v1/workspaces" \
  -H "Authorization: Bearer $(az account get-access-token --resource https://api.fabric.microsoft.com --query accessToken -o tsv)" | python -m json.tool
```

If `--minimal` is passed, stop after Step 4 (local development tools only).
