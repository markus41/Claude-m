---
name: apim-setup
description: Execute the apim setup workflow with deterministic validation and redacted output.
argument-hint: "[options]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# Apim Setup

Run the apim setup workflow for azure-api-management.

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
| Primary workflow query | GET | `/apim-setup` |
| Follow-up verification | GET | `/azure-api-management/verification` |

## Azure CLI Commands

### Instance Provisioning

```bash
# Create APIM instance (Developer SKU for non-production)
az apim create --name <name> --resource-group <rg> --publisher-email <email> --publisher-name <org> --sku-name Developer --location <region>

# Show instance details to verify provisioning
az apim show --name <name> --resource-group <rg>

# List all APIM instances in a resource group
az apim list --resource-group <rg> --output table

# Check name availability before creation
az apim check-name-availability --name <name>

# Update instance (e.g., change SKU tier)
az apim update --name <name> --resource-group <rg> --set sku.name=Standard
```

### Backup and Restore

```bash
# Backup instance to a storage account
az apim backup --name <name> --resource-group <rg> --storage-account-name <sa> --storage-account-container <container> --backup-name <backup>

# Restore instance from backup
az apim restore --name <name> --resource-group <rg> --storage-account-name <sa> --storage-account-container <container> --backup-name <backup>
```

### Diagnostics Setup

```bash
# Create Application Insights logger
az apim logger create --resource-group <rg> --service-name <apim> --logger-id <id> --logger-type applicationInsights --credentials instrumentationKey=<key>

# List configured loggers
az apim logger list --resource-group <rg> --service-name <apim>
```

### Delete Instance

```bash
# Delete APIM instance (requires confirmation)
az apim delete --name <name> --resource-group <rg> --yes
```

## Output

- Markdown summary with findings, actions, and unresolved risks.
- Redacted identifiers and no secret or token material.

