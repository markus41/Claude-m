---
name: Azure API Management
description: >
  Deep expertise in Azure API Management operations with deterministic runbooks,
  fail-fast context validation, and redacted output requirements.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - apim
  - azure api management
  - api policy
  - api revision
  - api contract diff
---

# Azure API Management

## Integration Context Contract
- Canonical contract: [`docs/integration-context.md`](../../../docs/integration-context.md)

| Workflow | tenantId | subscriptionId | environmentCloud | principalType | scopesOrRoles |
|---|---|---|---|---|---|
| Azure API Management operations | required | required | `AzureCloud`* | service-principal or delegated-user | `API Management Service Contributor`, `Reader` |

* Use sovereign cloud values from the canonical contract when applicable.

Fail fast before API calls when required context is missing or malformed. Redact tenant, subscription, and object identifiers.

## Command Surface

| Command | Purpose |
|---|---|
| `apim-setup` | Deterministic workflow for apim setup. |
| `apim-api-inventory` | Deterministic workflow for apim api inventory. |
| `apim-policy-drift` | Deterministic workflow for apim policy drift. |
| `apim-secret-rotation` | Deterministic workflow for apim secret rotation. |
| `apim-contract-diff` | Deterministic workflow for apim contract diff. |

## Guardrails

1. Validate context schema and minimum grants before any API call.
2. Run read-only discovery first whenever possible.
3. Require explicit confirmation for destructive actions.
4. Re-query and verify post-action state.
5. Return structured, redacted output.

## Azure CLI Reference

All commands below require Azure CLI (`az`) with an authenticated session (`az login`).
Use `--output table` for human-readable output or `--output json` for automation.

### Instance Management

```bash
# Create APIM instance
az apim create --name <name> --resource-group <rg> --publisher-email <email> --publisher-name <org> --sku-name Developer --location <region>

# Show instance details
az apim show --name <name> --resource-group <rg>

# List instances in a resource group
az apim list --resource-group <rg> --output table

# Delete instance
az apim delete --name <name> --resource-group <rg> --yes

# Update instance (SKU, tags, etc.)
az apim update --name <name> --resource-group <rg> --set sku.name=Standard

# Check name availability
az apim check-name-availability --name <name>

# Backup to storage account
az apim backup --name <name> --resource-group <rg> --storage-account-name <sa> --storage-account-container <container> --backup-name <backup>

# Restore from backup
az apim restore --name <name> --resource-group <rg> --storage-account-name <sa> --storage-account-container <container> --backup-name <backup>
```

### API Management

```bash
# Import API from OpenAPI spec URL
az apim api import --resource-group <rg> --service-name <apim> --path <url-path> --specification-format OpenApi --specification-url <spec-url> --api-id <id> --display-name "<name>"

# Import API from local file
az apim api import --resource-group <rg> --service-name <apim> --path <url-path> --specification-format OpenApiJson --specification-path ./openapi.json --api-id <id>

# Create API manually
az apim api create --resource-group <rg> --service-name <apim> --api-id <id> --display-name "<name>" --path <path> --protocols https --service-url <backend-url>

# Show API details
az apim api show --resource-group <rg> --service-name <apim> --api-id <id>

# List all APIs
az apim api list --resource-group <rg> --service-name <apim> --output table

# Update API
az apim api update --resource-group <rg> --service-name <apim> --api-id <id> --set description="Updated description"

# Delete API
az apim api delete --resource-group <rg> --service-name <apim> --api-id <id> --yes

# Create API revision
az apim api revision create --resource-group <rg> --service-name <apim> --api-id <id> --api-revision <rev-num> --api-revision-description "Bug fix"

# List API revisions
az apim api revision list --resource-group <rg> --service-name <apim> --api-id <id>

# List API operations
az apim api operation list --resource-group <rg> --service-name <apim> --api-id <id> --output table

# Show API operation details
az apim api operation show --resource-group <rg> --service-name <apim> --api-id <id> --operation-id <op-id>
```

### Products

```bash
# Create product
az apim product create --resource-group <rg> --service-name <apim> --product-id <id> --title "<title>" --description "<desc>" --subscription-required true --approval-required false --state published

# Show product
az apim product show --resource-group <rg> --service-name <apim> --product-id <id>

# List products
az apim product list --resource-group <rg> --service-name <apim> --output table

# Update product
az apim product update --resource-group <rg> --service-name <apim> --product-id <id> --set description="Updated"

# Delete product
az apim product delete --resource-group <rg> --service-name <apim> --product-id <id> --yes

# Add API to product
az apim product api add --resource-group <rg> --service-name <apim> --product-id <prod-id> --api-id <api-id>

# List APIs in product
az apim product api list --resource-group <rg> --service-name <apim> --product-id <prod-id>

# Remove API from product
az apim product api delete --resource-group <rg> --service-name <apim> --product-id <prod-id> --api-id <api-id>
```

### Subscriptions

```bash
# Create subscription
az apim subscription create --resource-group <rg> --service-name <apim> --subscription-id <sub-id> --display-name "<name>" --scope "/products/<prod-id>"

# Show subscription
az apim subscription show --resource-group <rg> --service-name <apim> --subscription-id <sub-id>

# List subscriptions
az apim subscription list --resource-group <rg> --service-name <apim> --output table

# Update subscription
az apim subscription update --resource-group <rg> --service-name <apim> --subscription-id <sub-id> --set state=active

# Regenerate primary key
az apim subscription regenerate-primary-key --resource-group <rg> --service-name <apim> --subscription-id <sub-id>

# Regenerate secondary key
az apim subscription regenerate-secondary-key --resource-group <rg> --service-name <apim> --subscription-id <sub-id>
```

### Named Values (Secrets)

```bash
# Create named value (secret)
az apim nv create --resource-group <rg> --service-name <apim> --named-value-id <id> --display-name "<name>" --value "<value>" --secret true

# Show named value
az apim nv show --resource-group <rg> --service-name <apim> --named-value-id <id>

# List named values
az apim nv list --resource-group <rg> --service-name <apim> --output table

# Update named value
az apim nv update --resource-group <rg> --service-name <apim> --named-value-id <id> --set value="new-value"

# Delete named value
az apim nv delete --resource-group <rg> --service-name <apim> --named-value-id <id> --yes
```

### Diagnostics and Monitoring

```bash
# Enable Application Insights diagnostic on an API
az apim api diagnostic create --resource-group <rg> --service-name <apim> --api-id <id> --diagnostic-id applicationinsights --logger-id <logger-id>

# Create Application Insights logger
az apim logger create --resource-group <rg> --service-name <apim> --logger-id <id> --logger-type applicationInsights --credentials instrumentationKey=<key>

# List loggers
az apim logger list --resource-group <rg> --service-name <apim>

# Delete logger
az apim logger delete --resource-group <rg> --service-name <apim> --logger-id <id>
```

## Progressive Disclosure - Reference Files

| Topic | File |
|---|---|
| Endpoint and permission reference | [`references/api-reference.md`](./references/api-reference.md) |
