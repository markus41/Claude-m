---
name: apim-secret-rotation
description: Execute the apim secret rotation workflow with deterministic validation and redacted output.
argument-hint: "[options]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Apim Secret Rotation

Run the apim secret rotation workflow for azure-api-management.

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
| Primary workflow query | GET | `/apim-secret-rotation` |
| Follow-up verification | GET | `/azure-api-management/verification` |

## Azure CLI Commands

### Named Values (Secrets)

```bash
# List all named values (identify secrets requiring rotation)
az apim nv list --resource-group <rg> --service-name <apim> --output table

# Show named value details
az apim nv show --resource-group <rg> --service-name <apim> --named-value-id <id>

# Create new named value (secret)
az apim nv create --resource-group <rg> --service-name <apim> --named-value-id <id> --display-name "<name>" --value "<value>" --secret true

# Update named value (rotate secret)
az apim nv update --resource-group <rg> --service-name <apim> --named-value-id <id> --set value="new-value"

# Delete named value
az apim nv delete --resource-group <rg> --service-name <apim> --named-value-id <id> --yes
```

### Subscription Key Rotation

```bash
# List subscriptions to identify keys requiring rotation
az apim subscription list --resource-group <rg> --service-name <apim> --output table

# Show subscription details
az apim subscription show --resource-group <rg> --service-name <apim> --subscription-id <sub-id>

# Regenerate primary key
az apim subscription regenerate-primary-key --resource-group <rg> --service-name <apim> --subscription-id <sub-id>

# Regenerate secondary key
az apim subscription regenerate-secondary-key --resource-group <rg> --service-name <apim> --subscription-id <sub-id>

# Update subscription state after rotation
az apim subscription update --resource-group <rg> --service-name <apim> --subscription-id <sub-id> --set state=active
```

### Verify Logger Credentials

```bash
# List loggers (check for stale instrumentation keys)
az apim logger list --resource-group <rg> --service-name <apim>

# Delete and recreate logger with updated credentials
az apim logger delete --resource-group <rg> --service-name <apim> --logger-id <id>
az apim logger create --resource-group <rg> --service-name <apim> --logger-id <id> --logger-type applicationInsights --credentials instrumentationKey=<new-key>
```

## Output

- Markdown summary with findings, actions, and unresolved risks.
- Redacted identifiers and no secret or token material.

