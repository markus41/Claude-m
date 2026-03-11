---
name: apim-contract-diff
description: Execute the apim contract diff workflow with deterministic validation and redacted output.
argument-hint: "[options]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Apim Contract Diff

Run the apim contract diff workflow for azure-api-management.

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
| Primary workflow query | GET | `/apim-contract-diff` |
| Follow-up verification | GET | `/azure-api-management/verification` |

## Azure CLI Commands

### API Revisions (Compare Contract Versions)

```bash
# List API revisions to identify versions for diff
az apim api revision list --resource-group <rg> --service-name <apim> --api-id <id>

# Create a new API revision
az apim api revision create --resource-group <rg> --service-name <apim> --api-id <id> --api-revision <rev-num> --api-revision-description "Bug fix"

# Show API details for a specific revision (append ;rev=N to api-id)
az apim api show --resource-group <rg> --service-name <apim> --api-id "<id>;rev=<rev-num>"
```

### API Operations (Diff Operation Surface)

```bash
# List operations for current revision
az apim api operation list --resource-group <rg> --service-name <apim> --api-id <id> --output table

# Show specific operation details
az apim api operation show --resource-group <rg> --service-name <apim> --api-id <id> --operation-id <op-id>

# List operations for a specific revision (append ;rev=N)
az apim api operation list --resource-group <rg> --service-name <apim> --api-id "<id>;rev=<rev-num>" --output table
```

### Import Updated Contract

```bash
# Re-import API from updated OpenAPI spec URL
az apim api import --resource-group <rg> --service-name <apim> --path <url-path> --specification-format OpenApi --specification-url <spec-url> --api-id <id> --display-name "<name>"

# Re-import from updated local file
az apim api import --resource-group <rg> --service-name <apim> --path <url-path> --specification-format OpenApiJson --specification-path ./openapi.json --api-id <id>
```

### Product Impact Check

```bash
# List products to assess contract change impact
az apim product list --resource-group <rg> --service-name <apim> --output table

# List APIs in a product (check if changed API is in a product)
az apim product api list --resource-group <rg> --service-name <apim> --product-id <prod-id>
```

## Output

- Markdown summary with findings, actions, and unresolved risks.
- Redacted identifiers and no secret or token material.

