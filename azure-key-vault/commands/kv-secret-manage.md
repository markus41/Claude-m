---
name: kv-secret-manage
description: "Create, read, update, list, and delete secrets in Azure Key Vault"
argument-hint: "<create|get|list|update|delete> --vault <vault-name> --name <secret-name> [--value <secret-value>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Manage Key Vault Secrets

Perform CRUD operations on secrets in an Azure Key Vault.

## Instructions

### 1. Validate Inputs

- `<action>` -- One of: `create`, `get`, `list`, `update`, `delete`. Ask if not provided.
- `--vault` -- Key Vault name. Ask if not provided.
- `--name` -- Secret name (required for all actions except `list`). Ask if not provided.
- `--value` -- Secret value (required for `create` and `update`). Ask if not provided.

### 2. Action: Create a Secret

```bash
az keyvault secret set \
  --vault-name <vault-name> \
  --name <secret-name> \
  --value "<secret-value>" \
  --content-type "text/plain" \
  --expires <YYYY-MM-DDT00:00:00Z> \
  --tags environment=<env> purpose=<description>
```

Ask the user for:
- **Content type** -- e.g., `text/plain`, `application/json`, `application/x-connection-string`. Default: `text/plain`.
- **Expiration date** -- recommended for all production secrets. Format: `YYYY-MM-DDT00:00:00Z`.
- **Tags** -- key-value pairs for organization (e.g., `environment`, `application`, `owner`).

**From a file** (for multi-line or binary secrets):
```bash
az keyvault secret set \
  --vault-name <vault-name> \
  --name <secret-name> \
  --file <path-to-file> \
  --encoding utf-8
```

### 3. Action: Get a Secret

```bash
# Get current version
az keyvault secret show \
  --vault-name <vault-name> \
  --name <secret-name> \
  --query value -o tsv

# Get specific version
az keyvault secret show \
  --vault-name <vault-name> \
  --name <secret-name> \
  --version <version-id> \
  --query value -o tsv

# Get metadata only (no value)
az keyvault secret show \
  --vault-name <vault-name> \
  --name <secret-name> \
  --query "{name:name, enabled:attributes.enabled, expires:attributes.expires, created:attributes.created, contentType:contentType}"
```

### 4. Action: List Secrets

```bash
# List all secrets (names and metadata, not values)
az keyvault secret list \
  --vault-name <vault-name> \
  --query "[].{name:name, enabled:attributes.enabled, expires:attributes.expires, contentType:contentType}" \
  -o table

# List versions of a specific secret
az keyvault secret list-versions \
  --vault-name <vault-name> \
  --name <secret-name> \
  --query "[].{version:id, created:attributes.created, enabled:attributes.enabled}" \
  -o table

# List deleted secrets (soft-deleted)
az keyvault secret list-deleted \
  --vault-name <vault-name> \
  -o table
```

### 5. Action: Update a Secret

Updating a secret creates a new version. The previous version remains accessible.

```bash
# Set a new value (creates new version)
az keyvault secret set \
  --vault-name <vault-name> \
  --name <secret-name> \
  --value "<new-value>"

# Update metadata only (without changing the value)
az keyvault secret set-attributes \
  --vault-name <vault-name> \
  --name <secret-name> \
  --content-type "application/json" \
  --expires <YYYY-MM-DDT00:00:00Z> \
  --tags environment=production

# Disable a secret version (without deleting)
az keyvault secret set-attributes \
  --vault-name <vault-name> \
  --name <secret-name> \
  --enabled false
```

### 6. Action: Delete a Secret

```bash
# Soft-delete a secret
az keyvault secret delete \
  --vault-name <vault-name> \
  --name <secret-name>

# Recover a soft-deleted secret
az keyvault secret recover \
  --vault-name <vault-name> \
  --name <secret-name>

# Permanently purge a soft-deleted secret (requires purge protection to be off, or wait for retention period)
az keyvault secret purge \
  --vault-name <vault-name> \
  --name <secret-name>
```

Warn the user:
- Soft-delete is reversible within the retention period (default 90 days).
- Purge is permanent and irreversible.
- If purge protection is enabled, the secret cannot be purged until the retention period expires.

### 7. Display Summary

Show the user:
- The action performed and its result
- The secret URI (`https://<vault-name>.vault.azure.net/secrets/<secret-name>/<version>`)
- Relevant next steps (e.g., configure rotation with `/kv-rotation-policy`, use in an app with `/kv-app-integration`)
