---
name: docai-setup
description: Set up the Azure Document Intelligence plugin — validate RBAC roles, provision or discover a Document Intelligence resource, check connectivity, and configure environment variables
argument-hint: "[--resource-group <rg>] [--location <location>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Document Intelligence Plugin Setup

Interactive guided setup for the Azure AI Document Intelligence plugin. Validates Azure prerequisites, locates or creates a Document Intelligence resource, checks RBAC, tests data-plane connectivity with a sample analysis, and configures environment variables.

## Flags

- `--resource-group <rg>`: Scope discovery to a specific resource group
- `--location <location>`: Region for new resource creation (default: `eastus`)

## Integration Context Fail-Fast Check

Before any external API call, validate integration context from [`docs/integration-context.md`](../../docs/integration-context.md):

- `tenantId` (always required)
- `subscriptionId` (required)
- `environmentCloud`
- `principalType`
- `scopesOrRoles`

Stop immediately with a structured error if required context is missing.

## Step 1: Check Prerequisites

### Azure CLI

```bash
az --version
```

Required. If missing, instruct user to install: https://learn.microsoft.com/en-us/cli/azure/install-azure-cli

### Azure CLI Authentication

```bash
az account show --query "{subscription: id, tenant: tenantId, user: user.name}" -o json
```

Confirm the subscription and tenant are correct.

## Step 2: Discover Existing Document Intelligence Resources

List all Document Intelligence (Form Recognizer) resources in the subscription:

```bash
az cognitiveservices account list --query "[?kind=='FormRecognizer'].{Name:name, RG:resourceGroup, Location:location, SKU:sku.name, Endpoint:properties.endpoint, State:properties.provisioningState}" -o table
```

If `--resource-group` flag is set, add `--resource-group {rg}`.

- If resources are found: display them and ask the user which one to use.
- If none found: ask the user whether to create a new one.

### Create New Resource (if needed)

Use `AskUserQuestion` to collect:
1. Resource name
2. Resource group (create if needed)
3. Region (recommend `eastus` for broadest feature availability)
4. SKU (`S0` for production, `F0` for free tier / dev)

```bash
az cognitiveservices account create \
  --name {accountName} \
  --resource-group {rg} \
  --kind FormRecognizer \
  --sku S0 \
  --location {location} \
  --custom-domain {accountName} \
  --yes
```

## Step 3: Validate RBAC

```bash
az role assignment list --scope $(az cognitiveservices account show --name {accountName} --resource-group {rg} --query id -o tsv) --output table
```

Required roles:

| Operation | Required Role |
|---|---|
| Document analysis (data plane) | `Cognitive Services User` |
| Resource management | `Cognitive Services Contributor` |
| Custom model training | `Cognitive Services Contributor` |

Assign missing roles:

```bash
az role assignment create \
  --role "Cognitive Services User" \
  --assignee {principalId} \
  --scope {resourceId}
```

## Step 4: Get Endpoint and Keys

```bash
ENDPOINT=$(az cognitiveservices account show --name {accountName} --resource-group {rg} --query properties.endpoint -o tsv)
KEY=$(az cognitiveservices account keys list --name {accountName} --resource-group {rg} --query key1 -o tsv)
```

Display the endpoint (redact the key in output).

## Step 5: Test Data-Plane Connectivity

Run a minimal analysis using the `prebuilt-read` model against a sample document:

```bash
# Start analysis
OPERATION_URL=$(curl -s -i -X POST \
  "${ENDPOINT}documentintelligence/documentModels/prebuilt-read:analyze?api-version=2024-11-30" \
  -H "Ocp-Apim-Subscription-Key: ${KEY}" \
  -H "Content-Type: application/json" \
  -d '{"urlSource": "https://raw.githubusercontent.com/Azure-Samples/cognitive-services-REST-api-samples/master/curl/form-recognizer/sample-layout.pdf"}' \
  | grep -i "Operation-Location" | awk '{print $2}' | tr -d '\r')

# Poll for result
sleep 5
curl -s "$OPERATION_URL" -H "Ocp-Apim-Subscription-Key: ${KEY}" | python3 -c "import sys,json; r=json.load(sys.stdin); print(f'Status: {r[\"status\"]}')"
```

- If `succeeded`: connectivity confirmed.
- If 401: check key validity and RBAC.
- If 404: confirm endpoint is correct.
- If 429: free tier rate limit — wait and retry.

**Important:** Instruct user to use managed identity for production. API keys are for testing only.

## Step 6: List Available Models

```bash
curl -s "${ENDPOINT}documentintelligence/documentModels?api-version=2024-11-30" \
  -H "Ocp-Apim-Subscription-Key: ${KEY}" \
  | python3 -c "import sys,json; [print(m['modelId']) for m in json.load(sys.stdin)['value'][:20]]"
```

Display prebuilt models and any existing custom models.

## Step 7: Configure Environment Variables

Create or update `.env`:

```
AZURE_TENANT_ID=<tenant-id>
AZURE_SUBSCRIPTION_ID=<subscription-id>
DOCUMENT_INTELLIGENCE_ENDPOINT=https://<accountName>.cognitiveservices.azure.com/
DOCUMENT_INTELLIGENCE_KEY=<key1>
DOCUMENT_INTELLIGENCE_RESOURCE_GROUP=<rg>
DOCUMENT_INTELLIGENCE_ACCOUNT_NAME=<accountName>
```

Write the file with the `Write` tool. Verify `.gitignore` contains `.env`.

## Step 8: Output Setup Report

```markdown
# Document Intelligence Setup Report

| Component | Status | Details |
|---|---|---|
| Azure CLI | OK / MISSING | v2.x.x |
| Azure authentication | OK / NOT_SIGNED_IN | Sub: {subscriptionId} |
| Document Intelligence resource | FOUND / CREATED / NOT_FOUND | {accountName} in {location} ({sku}) |
| RBAC | SUFFICIENT / INSUFFICIENT | Roles: ... |
| Data-plane connectivity | OK / FAILED | prebuilt-read test |
| Custom models | {N} found | {modelIds} |
| .env file | CREATED / EXISTS / SKIPPED | — |

Setup completed at <timestamp>.
```

## Important Notes

- For production, assign `Cognitive Services User` role to a managed identity and disable API key access.
- Free tier (F0) is limited to 500 pages/month and 1 RPS. Use S0 for production.
- Reference: `skills/azure-document-intelligence/SKILL.md` for full API guidance.
