# Azure API Management API Reference

## Required Permissions

- `API Management Service Contributor`
- `Reader`

## Workflow Entry Points

- `apim-setup`
- `apim-api-inventory`
- `apim-policy-drift`
- `apim-secret-rotation`
- `apim-contract-diff`

## Azure CLI Command Reference

All commands require Azure CLI (`az`) with an active session (`az login`).

### Instance Lifecycle

| Command | Purpose |
|---|---|
| `az apim create` | Create a new APIM instance |
| `az apim show` | Show instance details |
| `az apim list` | List instances in a resource group |
| `az apim update` | Update instance properties (SKU, tags) |
| `az apim delete` | Delete an APIM instance |
| `az apim check-name-availability` | Check if a name is available |
| `az apim backup` | Backup instance to storage |
| `az apim restore` | Restore instance from backup |

### API Operations

| Command | Purpose |
|---|---|
| `az apim api create` | Create an API definition |
| `az apim api import` | Import API from OpenAPI/Swagger spec |
| `az apim api show` | Show API details |
| `az apim api list` | List all APIs |
| `az apim api update` | Update API metadata |
| `az apim api delete` | Delete an API |
| `az apim api revision create` | Create a new API revision |
| `az apim api revision list` | List API revisions |
| `az apim api operation list` | List operations in an API |
| `az apim api operation show` | Show operation details |

### Products

| Command | Purpose |
|---|---|
| `az apim product create` | Create a product |
| `az apim product show` | Show product details |
| `az apim product list` | List products |
| `az apim product update` | Update product properties |
| `az apim product delete` | Delete a product |
| `az apim product api add` | Add API to a product |
| `az apim product api list` | List APIs in a product |
| `az apim product api delete` | Remove API from a product |

### Subscriptions

| Command | Purpose |
|---|---|
| `az apim subscription create` | Create a subscription |
| `az apim subscription show` | Show subscription details |
| `az apim subscription list` | List subscriptions |
| `az apim subscription update` | Update subscription state |
| `az apim subscription regenerate-primary-key` | Regenerate primary key |
| `az apim subscription regenerate-secondary-key` | Regenerate secondary key |

### Named Values

| Command | Purpose |
|---|---|
| `az apim nv create` | Create a named value (optionally secret) |
| `az apim nv show` | Show named value details |
| `az apim nv list` | List named values |
| `az apim nv update` | Update named value |
| `az apim nv delete` | Delete named value |

### Diagnostics and Logging

| Command | Purpose |
|---|---|
| `az apim api diagnostic create` | Enable diagnostics on an API |
| `az apim logger create` | Create a logger (e.g., App Insights) |
| `az apim logger list` | List loggers |
| `az apim logger delete` | Delete a logger |

## Validation Checklist

1. Confirm integration context is complete before execution.
2. Confirm required scopes or roles are granted.
3. Confirm destructive actions include explicit approval.
4. Confirm all output is redacted.
