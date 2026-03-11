---
name: apim-policy-drift
description: Execute the apim policy drift workflow with deterministic validation and redacted output.
argument-hint: "[options]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
---

# Apim Policy Drift

Run the apim policy drift workflow for azure-api-management.

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
| Primary workflow query | GET | `/apim-policy-drift` |
| Follow-up verification | GET | `/azure-api-management/verification` |

## Azure CLI Commands

### Inspect APIs and Operations for Policy Drift

```bash
# List all APIs to identify drift candidates
az apim api list --resource-group <rg> --service-name <apim> --output table

# Show API details (inspect policy-relevant config)
az apim api show --resource-group <rg> --service-name <apim> --api-id <id>

# List operations to compare per-operation policies
az apim api operation list --resource-group <rg> --service-name <apim> --api-id <id> --output table

# List API revisions (compare policies across revisions)
az apim api revision list --resource-group <rg> --service-name <apim> --api-id <id>
```

### Named Values Used in Policies

```bash
# List named values (policy expressions may reference these)
az apim nv list --resource-group <rg> --service-name <apim> --output table

# Show specific named value
az apim nv show --resource-group <rg> --service-name <apim> --named-value-id <id>
```

### Products (Product-Level Policies)

```bash
# List products to check product-level policy consistency
az apim product list --resource-group <rg> --service-name <apim> --output table

# Show product details
az apim product show --resource-group <rg> --service-name <apim> --product-id <id>
```

### Diagnostics (Logging Policy Validation)

```bash
# List loggers to verify logging policies reference valid targets
az apim logger list --resource-group <rg> --service-name <apim>
```

## Output

- Markdown summary with findings, actions, and unresolved risks.
- Redacted identifiers and no secret or token material.

