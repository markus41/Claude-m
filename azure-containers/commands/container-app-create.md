---
name: container-app-create
description: "Create a new Azure Container App with ingress and scaling configuration"
argument-hint: "--name <app-name> --image <image-uri> [--env <environment>] [--rg <resource-group>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Create a Container App

Create a new Azure Container App with ingress, scaling, and optional Dapr configuration.

## Instructions

### 1. Validate Inputs

- `--name` — Container App name (lowercase, alphanumeric, hyphens). Ask if not provided.
- `--image` — Full image URI (e.g., `myacr.azurecr.io/myapp:1.0.0`). Ask if not provided.
- `--env` — Container Apps environment name. Read from `.env` `CONTAINER_APP_ENV` if not provided.
- `--rg` — Resource group. Read from `.env` `AZURE_RESOURCE_GROUP` if not provided.

### 2. Configure ACR Access

Set up managed identity for ACR pull (recommended):

```bash
# Create the app with system-assigned identity and ACR access
az containerapp create \
  --name <app-name> \
  --resource-group <rg-name> \
  --environment <env-name> \
  --image <image-uri> \
  --registry-server <acr-name>.azurecr.io \
  --registry-identity system \
  --target-port 8080 \
  --ingress external \
  --cpu 0.5 \
  --memory 1.0Gi \
  --min-replicas 1 \
  --max-replicas 10
```

Alternatively, with ACR admin credentials (not recommended for production):
```bash
az containerapp create \
  --name <app-name> \
  --resource-group <rg-name> \
  --environment <env-name> \
  --image <image-uri> \
  --registry-server <acr-name>.azurecr.io \
  --registry-username <username> \
  --registry-password <password> \
  --target-port 8080 \
  --ingress external
```

### 3. Configure Ingress

Ask the user about ingress requirements:

| Option | Flag | Description |
|--------|------|-------------|
| External | `--ingress external` | Accessible from the internet |
| Internal | `--ingress internal` | Accessible only within the VNet |
| None | omit `--ingress` | No HTTP ingress (background worker) |

Set the target port to match the port the container listens on:
```bash
--target-port <port>
```

For HTTP/2 or gRPC:
```bash
--transport http2
```

### 4. Configure Scaling

Ask the user about expected traffic:

```bash
--min-replicas 1 \
--max-replicas 10 \
--scale-rule-name http-rule \
--scale-rule-type http \
--scale-rule-http-concurrency 100
```

For queue-based scaling, see `/container-app-scale`.

### 5. Set Environment Variables and Secrets

```bash
# Set secrets
az containerapp secret set \
  --name <app-name> \
  --resource-group <rg-name> \
  --secrets "db-conn=<connection-string>" "api-key=<key>"

# Set env vars (reference secrets with secretref:)
az containerapp update \
  --name <app-name> \
  --resource-group <rg-name> \
  --set-env-vars "DATABASE_URL=secretref:db-conn" "API_KEY=secretref:api-key" "NODE_ENV=production"
```

### 6. Enable Dapr (Optional)

```bash
az containerapp dapr enable \
  --name <app-name> \
  --resource-group <rg-name> \
  --dapr-app-id <app-id> \
  --dapr-app-port <port> \
  --dapr-app-protocol http
```

### 7. Verify Deployment

```bash
# Show app details
az containerapp show --name <app-name> --resource-group <rg-name> --output table

# Get the app URL
az containerapp show --name <app-name> --resource-group <rg-name> --query properties.configuration.ingress.fqdn --output tsv

# Check logs
az containerapp logs show --name <app-name> --resource-group <rg-name> --follow
```

### 8. Display Summary

Show the user:
- App URL (FQDN)
- Revision name
- Resource allocation (CPU/memory)
- Scale settings
- Next steps: `/container-app-deploy` for updates, `/container-app-scale` for tuning
