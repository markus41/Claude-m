---
name: apim-api-inventory
description: Execute the apim api inventory workflow with deterministic validation and redacted output.
argument-hint: "[options]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Apim Api Inventory

Run the apim api inventory workflow for azure-api-management.

## Preconditions

- Validate integration context using [`docs/integration-context.md`](../../docs/integration-context.md).
- Confirm required scopes or roles are granted.
- Define safety gates before any mutating API call.

## Steps

1. Validate required context fields and fail fast on missing values.
2. Collect read-only baseline data for targets.
3. Execute the requested workflow with explicit safety checks.
4. Verify final state with post-action read operations.
5. Produce a redacted summary and next actions.

## Key Endpoints

| Operation | Method | Endpoint |
|---|---|---|
| Primary workflow query | GET | `/apim-api-inventory` |
| Follow-up verification | GET | `/azure-api-management/verification` |

## Azure CLI Commands

### List and Inspect APIs

```bash
# List all APIs in the APIM instance
az apim api list --resource-group <rg> --service-name <apim> --output table

# Show details for a specific API
az apim api show --resource-group <rg> --service-name <apim> --api-id <id>

# List operations for an API
az apim api operation list --resource-group <rg> --service-name <apim> --api-id <id> --output table

# Show specific operation details
az apim api operation show --resource-group <rg> --service-name <apim> --api-id <id> --operation-id <op-id>

# List API revisions
az apim api revision list --resource-group <rg> --service-name <apim> --api-id <id>
```

### Import and Create APIs

```bash
# Import API from OpenAPI spec URL
az apim api import --resource-group <rg> --service-name <apim> --path <url-path> --specification-format OpenApi --specification-url <spec-url> --api-id <id> --display-name "<name>"

# Import API from local OpenAPI JSON file
az apim api import --resource-group <rg> --service-name <apim> --path <url-path> --specification-format OpenApiJson --specification-path ./openapi.json --api-id <id>

# Create API manually
az apim api create --resource-group <rg> --service-name <apim> --api-id <id> --display-name "<name>" --path <path> --protocols https --service-url <backend-url>
```

### Update and Delete APIs

```bash
# Update API metadata
az apim api update --resource-group <rg> --service-name <apim> --api-id <id> --set description="Updated description"

# Delete API
az apim api delete --resource-group <rg> --service-name <apim> --api-id <id> --yes
```

### Products and API Associations

```bash
# List products
az apim product list --resource-group <rg> --service-name <apim> --output table

# List APIs within a product
az apim product api list --resource-group <rg> --service-name <apim> --product-id <prod-id>

# Add API to product
az apim product api add --resource-group <rg> --service-name <apim> --product-id <prod-id> --api-id <api-id>
```

### Subscriptions

```bash
# List subscriptions
az apim subscription list --resource-group <rg> --service-name <apim> --output table

# Show subscription details
az apim subscription show --resource-group <rg> --service-name <apim> --subscription-id <sub-id>
```

## Output

- Markdown summary with findings, actions, and unresolved risks.
- Redacted identifiers and no secret or token material.

