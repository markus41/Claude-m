---
name: container-app-deploy
description: "Deploy a new revision to a Container App and manage traffic splitting for blue-green deployments"
argument-hint: "--name <app-name> --image <image-uri> [--traffic <revision>=<percent>] [--rg <resource-group>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Deploy a Container App Revision

Deploy a new revision to an existing Container App with optional traffic splitting for blue-green or canary deployments.

## Instructions

### 1. Validate Inputs

- `--name` — Container App name. Ask if not provided.
- `--image` — New image URI (e.g., `myacr.azurecr.io/myapp:2.0.0`). Ask if not provided.
- `--traffic` — Traffic split (e.g., `new-rev=80,old-rev=20`). Optional; defaults to 100% to latest.
- `--rg` — Resource group. Read from `.env` `AZURE_RESOURCE_GROUP` if not provided.

### 2. Check Current State

```bash
# List current revisions
az containerapp revision list \
  --name <app-name> \
  --resource-group <rg-name> \
  --output table

# Show current traffic distribution
az containerapp ingress traffic show \
  --name <app-name> \
  --resource-group <rg-name>
```

### 3. Deploy New Revision

**Simple update (100% traffic to new revision)**:
```bash
az containerapp update \
  --name <app-name> \
  --resource-group <rg-name> \
  --image <image-uri>
```

**Blue-green deployment (deploy without traffic, then shift)**:

First, enable multiple revision mode if not already:
```bash
az containerapp revision set-mode \
  --name <app-name> \
  --resource-group <rg-name> \
  --mode multiple
```

Deploy a new revision with a label but no traffic:
```bash
az containerapp update \
  --name <app-name> \
  --resource-group <rg-name> \
  --image <image-uri> \
  --revision-suffix v2

# Assign a label for easy reference
az containerapp revision label add \
  --name <app-name> \
  --resource-group <rg-name> \
  --label staging \
  --revision <app-name>--v2

# Remove a label when no longer needed
az containerapp revision label remove \
  --name <app-name> \
  --resource-group <rg-name> \
  --label canary
```

Check current ingress configuration:
```bash
az containerapp ingress show --name <app-name> --resource-group <rg-name>
```

### 4. Traffic Splitting

**Canary rollout (gradual shift)**:
```bash
# Send 10% to the new revision
az containerapp ingress traffic set \
  --name <app-name> \
  --resource-group <rg-name> \
  --revision-weight <app-name>--v2=10 <app-name>--v1=90

# Increase to 50%
az containerapp ingress traffic set \
  --name <app-name> \
  --resource-group <rg-name> \
  --revision-weight <app-name>--v2=50 <app-name>--v1=50

# Full cutover
az containerapp ingress traffic set \
  --name <app-name> \
  --resource-group <rg-name> \
  --revision-weight <app-name>--v2=100
```

**Label-based traffic splitting**:
```bash
az containerapp ingress traffic set \
  --name <app-name> \
  --resource-group <rg-name> \
  --label-weight staging=10 production=90
```

### 5. Rollback (if needed)

```bash
# Activate a previous revision
az containerapp revision activate \
  --name <app-name> \
  --resource-group <rg-name> \
  --revision <previous-revision-name>

# Shift all traffic back
az containerapp ingress traffic set \
  --name <app-name> \
  --resource-group <rg-name> \
  --revision-weight <previous-revision-name>=100
```

### 6. Clean Up Old Revisions

```bash
# Deactivate old revisions to free resources
az containerapp revision deactivate \
  --name <app-name> \
  --resource-group <rg-name> \
  --revision <old-revision-name>
```

### 7. Display Summary

Show the user:
- New revision name and image
- Current traffic distribution
- App URL (FQDN)
- How to rollback if issues arise
- Suggest monitoring with `az containerapp logs show`
