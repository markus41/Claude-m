---
name: ado-service-connection
description: Create and manage service connections for pipelines
argument-hint: "--type arm|docker|kubernetes|generic --name <name> [--subscription <id>] [--auth wif|sp-secret|sp-cert|managed-identity]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# Manage Service Connections

Create, list, and configure service connections for Azure DevOps pipelines. Supports ARM, Docker Registry, Kubernetes, and generic connections.

## Prerequisites

- Authenticated to Azure DevOps (run `/ado-setup` first)
- `Administer service connections` permission
- Appropriate credentials for the target service

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `--type` | Yes | Connection type: `arm`, `docker`, `kubernetes`, `generic` |
| `--name` | Yes | Display name for the connection |
| `--auth` | No | Auth method: `wif` (recommended), `sp-secret`, `sp-cert`, `managed-identity` |
| `--subscription` | No | Azure subscription ID (for ARM connections) |
| `--resource-group` | No | Scope to a specific resource group (ARM) |
| `--registry` | No | Docker registry URL (for Docker connections) |
| `--cluster` | No | Kubernetes cluster name (for K8s connections) |
| `--url` | No | Target URL (for generic connections) |
| `--authorize-pipelines` | No | Allow all pipelines to use this connection |
| `--action` | No | `create` (default), `list`, `delete` |

## Instructions

1. **ARM connection with WIF (recommended)**:
   ```json
   POST /_apis/serviceendpoint/endpoints?api-version=7.1
   {
     "name": "<name>",
     "type": "AzureRM",
     "url": "https://management.azure.com/",
     "data": {
       "subscriptionId": "<sub-id>",
       "subscriptionName": "<sub-name>",
       "creationMode": "Manual"
     },
     "authorization": {
       "scheme": "WorkloadIdentityFederation",
       "parameters": {
         "tenantid": "<tenant-id>",
         "serviceprincipalid": "<client-id>"
       }
     }
   }
   ```
   CLI: `az devops service-endpoint azurerm create --name "<name>" --azure-rm-tenant-id ... --azure-rm-service-principal-id ... --azure-rm-subscription-id ...`

2. **ARM connection with service principal + secret**:
   Same as above but `"scheme": "ServicePrincipal"` with `"serviceprincipalkey": "<secret>"`.

3. **Docker Registry connection**:
   ```json
   {
     "type": "dockerregistry",
     "url": "https://<registry>.azurecr.io",
     "authorization": {
       "scheme": "ServicePrincipal",
       "parameters": { "loginServer": "<registry>.azurecr.io", "username": "<sp-id>", "password": "<sp-secret>" }
     }
   }
   ```

4. **Kubernetes connection**:
   ```json
   {
     "type": "kubernetes",
     "url": "https://<cluster-url>",
     "authorization": {
       "scheme": "Kubernetes",
       "parameters": { "kubeconfig": "<base64-kubeconfig>" }
     }
   }
   ```

5. **Generic connection** (webhook, REST API):
   ```json
   {
     "type": "generic",
     "url": "<target-url>",
     "authorization": {
       "scheme": "UsernamePassword",
       "parameters": { "username": "<user>", "password": "<token>" }
     }
   }
   ```

6. **Authorize pipelines** — `PATCH /_apis/pipelines/pipelinepermissions/endpoint/{endpointId}?api-version=7.1-preview.1` with `{ "allPipelines": { "authorized": true } }`.

7. **List connections** — `GET /_apis/serviceendpoint/endpoints?api-version=7.1`. Display: ID, Name, Type, Auth scheme, Status.

8. **Delete connection** — `DELETE /_apis/serviceendpoint/endpoints/{endpointId}?api-version=7.1`.

## Examples

```bash
/ado-service-connection --type arm --name azure-prod --auth wif --subscription abc-123
/ado-service-connection --type docker --name acr-prod --registry myregistry.azurecr.io
/ado-service-connection --type kubernetes --name aks-cluster --cluster my-aks
/ado-service-connection --action list
```

## Error Handling

- **401/403 on Azure**: Service principal lacks RBAC on the subscription — assign Contributor role.
- **WIF not supported**: ADO organization may need to enable WIF — check org settings.
- **Connection test fails**: Verify credentials, network access, and firewall rules.
