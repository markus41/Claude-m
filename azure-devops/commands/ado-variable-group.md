---
name: ado-variable-group
description: Create and manage pipeline variable groups and secure files
argument-hint: "<group-name> --action create|update|list|delete [--variables key=val,...] [--keyvault <vault-name>]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# Manage Variable Groups

Create, update, list, and delete pipeline variable groups. Link to Azure Key Vault for secret management. Manage secure files for pipeline consumption.

## Prerequisites

- Authenticated to Azure DevOps (run `/ado-setup` first)
- `Administer build resource permissions` for variable groups
- Azure Key Vault access (if linking to Key Vault)

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `<group-name>` | Yes | Variable group name |
| `--action` | No | `create` (default), `update`, `list`, `delete` |
| `--variables` | No | Variables as `key=value` pairs (comma-separated) |
| `--secret-variables` | No | Secret variables as `key=value` pairs (stored encrypted) |
| `--keyvault` | No | Link to Azure Key Vault by name |
| `--keyvault-secrets` | No | Comma-separated secret names to map from Key Vault |
| `--service-connection` | No | Service connection for Key Vault access |
| `--authorize-pipelines` | No | Authorize all pipelines to use this group |
| `--secure-file` | No | Path to a secure file to upload |

## Instructions

1. **Create variable group** — call `POST /_apis/distributedtask/variablegroups?api-version=7.1`:
   ```json
   {
     "name": "<group-name>",
     "type": "Vsts",
     "variables": {
       "key1": { "value": "val1", "isSecret": false },
       "secretKey": { "value": "secretVal", "isSecret": true }
     }
   }
   ```
   CLI: `az pipelines variable-group create --name "<name>" --variables key1=val1 --authorize true`

2. **Link to Key Vault** — if `--keyvault` is specified:
   ```json
   {
     "name": "<group-name>",
     "type": "AzureKeyVault",
     "providerData": {
       "serviceEndpointId": "{service-connection-id}",
       "vault": "<vault-name>"
     },
     "variables": {
       "secret-name-1": { "enabled": true, "contentType": "" }
     }
   }
   ```

3. **Update variables** — if `--action update`:
   - Fetch existing group: `GET /_apis/distributedtask/variablegroups/{groupId}?api-version=7.1`
   - Merge new variables into existing set
   - Call `PUT /_apis/distributedtask/variablegroups/{groupId}?api-version=7.1`
   - CLI: `az pipelines variable-group variable update --group-id {id} --name key1 --value newVal`

4. **List groups** — if `--action list`:
   `GET /_apis/distributedtask/variablegroups?api-version=7.1`
   Display: Group ID, Name, Type, Variable count, Key Vault link.

5. **Delete group** — if `--action delete`:
   `DELETE /_apis/distributedtask/variablegroups/{groupId}?api-version=7.1`

6. **Authorize pipelines** — if `--authorize-pipelines`:
   `PATCH /_apis/build/authorizedresources?api-version=7.1` to authorize the group for all pipelines.

7. **Upload secure file** — if `--secure-file`:
   `POST /_apis/distributedtask/securefiles?api-version=7.1` with multipart form data.

8. **Display results** — show group ID, name, variable names (mask secret values), and pipeline YAML reference:
   ```yaml
   variables:
     - group: <group-name>
   ```

## Examples

```bash
/ado-variable-group app-config --variables env=prod,region=eastus --secret-variables dbPass=secret123
/ado-variable-group vault-secrets --keyvault my-keyvault --service-connection azure-sub --keyvault-secrets db-conn,api-key
/ado-variable-group app-config --action update --variables env=staging
/ado-variable-group --action list
```

## Error Handling

- **Key Vault not accessible**: Service connection lacks access — verify RBAC on the vault.
- **Duplicate group name**: Group already exists — use `--action update` or choose a different name.
- **Secret not found in Key Vault**: Secret name does not exist — list available secrets.
