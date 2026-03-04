# Azure DevOps Service Connections Reference

## Overview

Service connections (service endpoints) provide authenticated access to external services from Azure Pipelines. They store credentials securely and enable pipelines to interact with Azure, Docker registries, Kubernetes clusters, and other services. This reference covers all major connection types, security configuration, Workload Identity Federation, and the REST API.

---

## REST API Endpoints

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/_apis/serviceendpoint/endpoints?api-version=7.1` | Service Endpoints (Read) | `type`, `authSchemes`, `endpointNames` | List service connections |
| GET | `/_apis/serviceendpoint/endpoints/{endpointId}?api-version=7.1` | Service Endpoints (Read) | — | Get connection details |
| POST | `/_apis/serviceendpoint/endpoints?api-version=7.1` | Service Endpoints (Read & Write) | Body: full endpoint definition | Create connection |
| PUT | `/_apis/serviceendpoint/endpoints/{endpointId}?api-version=7.1` | Service Endpoints (Read & Write) | Body: full endpoint definition | Update connection |
| DELETE | `/_apis/serviceendpoint/endpoints/{endpointId}?api-version=7.1` | Service Endpoints (Read & Write) | — | Delete connection |
| GET | `/_apis/serviceendpoint/types?api-version=7.1` | Service Endpoints (Read) | — | List available endpoint types |
| POST | `/_apis/serviceendpoint/endpoints/{endpointId}/executionhistory?api-version=7.1` | Service Endpoints (Read) | — | Get usage history |

---

## Connection Types

### Azure Resource Manager (ARM)

The most common connection type for deploying to Azure.

#### Workload Identity Federation (Recommended)

WIF eliminates secrets by using federated identity credentials. No client secret or certificate to rotate.

```json
POST /_apis/serviceendpoint/endpoints?api-version=7.1
{
  "name": "Azure Production (WIF)",
  "type": "AzureRM",
  "url": "https://management.azure.com/",
  "data": {
    "subscriptionId": "<subscription-id>",
    "subscriptionName": "Production",
    "environment": "AzureCloud",
    "scopeLevel": "Subscription",
    "creationMode": "Manual"
  },
  "authorization": {
    "scheme": "WorkloadIdentityFederation",
    "parameters": {
      "tenantId": "<tenant-id>",
      "servicePrincipalId": "<app-client-id>",
      "workloadIdentityFederationIssuer": "https://vstoken.dev.azure.com/<org-id>",
      "workloadIdentityFederationSubject": "sc://<org>/<project>/<connection-name>"
    }
  },
  "isShared": false,
  "serviceEndpointProjectReferences": [
    {
      "projectReference": { "id": "<project-guid>", "name": "myproject" },
      "name": "Azure Production (WIF)"
    }
  ]
}
```

**WIF Setup Steps:**

1. Create an Entra ID app registration.
2. Add a federated credential:
   - Issuer: `https://vstoken.dev.azure.com/<org-id>`
   - Subject: `sc://<org>/<project>/<connection-name>`
   - Audience: `api://AzureADTokenExchange`
3. Assign Azure RBAC to the app registration (e.g., Contributor on subscription).
4. Create the service connection in Azure DevOps with scheme `WorkloadIdentityFederation`.

#### Managed Identity

For self-hosted agents running on Azure VMs with a managed identity assigned.

```json
{
  "name": "Azure Production (MI)",
  "type": "AzureRM",
  "authorization": {
    "scheme": "ManagedServiceIdentity",
    "parameters": {
      "tenantId": "<tenant-id>"
    }
  },
  "data": {
    "subscriptionId": "<subscription-id>",
    "subscriptionName": "Production",
    "environment": "AzureCloud",
    "scopeLevel": "Subscription"
  }
}
```

#### Service Principal with Secret

```json
{
  "name": "Azure Production (Secret)",
  "type": "AzureRM",
  "authorization": {
    "scheme": "ServicePrincipal",
    "parameters": {
      "tenantId": "<tenant-id>",
      "servicePrincipalId": "<app-client-id>",
      "servicePrincipalKey": "<client-secret>",
      "authenticationType": "spnKey"
    }
  },
  "data": {
    "subscriptionId": "<subscription-id>",
    "subscriptionName": "Production",
    "environment": "AzureCloud",
    "scopeLevel": "Subscription"
  }
}
```

#### Service Principal with Certificate

```json
{
  "authorization": {
    "scheme": "ServicePrincipal",
    "parameters": {
      "tenantId": "<tenant-id>",
      "servicePrincipalId": "<app-client-id>",
      "servicePrincipalCertificate": "<base64-pfx-content>",
      "authenticationType": "spnCertificate"
    }
  }
}
```

#### Scope Levels

| Scope | `scopeLevel` | `data` Fields | Use Case |
|-------|-------------|--------------|----------|
| Subscription | `Subscription` | `subscriptionId`, `subscriptionName` | Deploy to any resource in subscription |
| Resource Group | `Subscription` | `subscriptionId` + `resourceGroupName` | Deploy only to specific RG |
| Management Group | `ManagementGroup` | `managementGroupId`, `managementGroupName` | Governance across subscriptions |

---

### Docker Registry

```json
{
  "name": "ACR Production",
  "type": "dockerregistry",
  "url": "https://myacr.azurecr.io",
  "authorization": {
    "scheme": "ServicePrincipal",
    "parameters": {
      "registry": "https://myacr.azurecr.io",
      "loginServer": "myacr.azurecr.io",
      "servicePrincipalId": "<sp-client-id>",
      "tenantId": "<tenant-id>"
    }
  },
  "data": {
    "registrytype": "ACR",
    "appObjectId": "<app-object-id>"
  }
}
```

### Docker Hub

```json
{
  "name": "Docker Hub",
  "type": "dockerregistry",
  "url": "https://index.docker.io/v1/",
  "authorization": {
    "scheme": "UsernamePassword",
    "parameters": {
      "registry": "https://index.docker.io/v1/",
      "username": "mydockerhubuser",
      "password": "<access-token>"
    }
  },
  "data": {
    "registrytype": "DockerHub"
  }
}
```

---

### Kubernetes

```json
{
  "name": "AKS Production",
  "type": "kubernetes",
  "url": "https://aks-cluster.hcp.eastus.azmk8s.io",
  "authorization": {
    "scheme": "AzureSubscription",
    "parameters": {
      "azureEnvironment": "AzureCloud",
      "azureTenantId": "<tenant-id>",
      "azureSubscriptionId": "<subscription-id>",
      "azureSubscriptionName": "Production",
      "clusterName": "aks-production",
      "namespace": "default"
    }
  }
}
```

### Kubernetes (kubeconfig)

```json
{
  "name": "K8s Cluster",
  "type": "kubernetes",
  "authorization": {
    "scheme": "Kubernetes",
    "parameters": {
      "kubeconfig": "<base64-kubeconfig>",
      "clusterContext": "production-context"
    }
  }
}
```

---

### Generic Service Connection

For any HTTP-based service that doesn't have a specific connection type.

```json
{
  "name": "External API",
  "type": "generic",
  "url": "https://api.external-service.com",
  "authorization": {
    "scheme": "UsernamePassword",
    "parameters": {
      "username": "api-user",
      "password": "<api-key>"
    }
  }
}
```

Or with a token:

```json
{
  "name": "External API (Token)",
  "type": "generic",
  "url": "https://api.external-service.com",
  "authorization": {
    "scheme": "Token",
    "parameters": {
      "apitoken": "<bearer-token>"
    }
  }
}
```

---

### Other Connection Types

| Type | `type` Value | Description |
|------|-------------|-------------|
| GitHub | `github` | PAT or OAuth for GitHub repos and releases |
| GitHub Enterprise | `githubenterprise` | Self-hosted GitHub instance |
| Bitbucket Cloud | `bitbucket` | Bitbucket repos |
| SSH | `ssh` | SSH host for deployment |
| NuGet | `externalnugetfeed` | External NuGet feed |
| npm | `externalnpmregistry` | External npm registry |
| Maven | `externalmavenrepository` | External Maven repo |
| Jira | `jira` | Jira integration |
| ServiceNow | `servicenow` | ServiceNow integration |
| Jenkins | `jenkins` | Jenkins server |

---

## Service Connection Security

### Per-Pipeline Authorization

By default, service connections require per-pipeline authorization (recommended).

```json
// Grant specific pipelines access
POST /_apis/pipelines/pipelinepermissions/endpoint/{endpointId}?api-version=7.1-preview
{
  "pipelines": [
    { "id": 42, "authorized": true },
    { "id": 43, "authorized": true }
  ]
}

// Open access to all pipelines (less secure)
PATCH /_apis/pipelines/pipelinepermissions/endpoint/{endpointId}?api-version=7.1-preview
{
  "allPipelines": {
    "authorized": true
  }
}
```

### Project-Scoped vs. Shared

| Scope | Description | When to Use |
|-------|-------------|-------------|
| Project-scoped | Available only within the project | Default; most common |
| Shared (`isShared: true`) | Available across multiple projects | Org-wide service connections |

### Security Recommendations

- **Prefer WIF over secrets**: No credential rotation needed.
- **Scope to minimum RBAC**: Use Resource Group scope instead of Subscription when possible.
- **Per-pipeline authorization**: Keep connections locked to specific pipelines.
- **Separate connections per environment**: Use different connections for dev/staging/prod.
- **Audit usage**: Review service connection execution history regularly.

---

## Using Service Connections in YAML

```yaml
# Azure CLI with ARM connection
- task: AzureCLI@2
  inputs:
    azureSubscription: 'Azure Production (WIF)'
    scriptType: bash
    scriptLocation: inlineScript
    inlineScript: |
      az group list --output table
      az webapp deploy --resource-group my-rg --name my-app --src-path app.zip

# Docker with registry connection
- task: Docker@2
  inputs:
    containerRegistry: 'ACR Production'
    repository: myapp
    command: buildAndPush
    Dockerfile: Dockerfile
    tags: |
      $(Build.BuildId)
      latest

# Kubernetes with K8s connection
- task: KubernetesManifest@1
  inputs:
    kubernetesServiceConnection: 'AKS Production'
    action: deploy
    namespace: production
    manifests: |
      manifests/deployment.yaml
      manifests/service.yaml

# Generic connection in a script
- task: InvokeRestAPI@1
  inputs:
    connectionType: connectedServiceName
    serviceConnection: 'External API'
    method: POST
    urlSuffix: /api/deploy
    body: '{"version": "$(Build.BuildId)"}'
```

---

## CLI Commands

```bash
# List service connections
az devops service-endpoint list --output table

# Show connection details
az devops service-endpoint show --id <endpoint-id>

# Create ARM connection (auto-detect subscription)
az devops service-endpoint azurerm create \
  --name "Azure Dev" \
  --azure-rm-service-principal-id <sp-id> \
  --azure-rm-subscription-id <sub-id> \
  --azure-rm-subscription-name "Dev Subscription" \
  --azure-rm-tenant-id <tenant-id>

# Delete a connection
az devops service-endpoint delete --id <endpoint-id> --yes
```

---

## Error Codes

| Error | Meaning | Remediation |
|-------|---------|-------------|
| `TF400856` | Pipeline not authorized for service connection | Grant pipeline access in connection settings |
| `EndpointNotFound` | Connection ID does not exist | Verify endpoint ID and project scope |
| `AzureAuthenticationFailed` | SP secret/cert expired or RBAC removed | Rotate credential; verify Azure RBAC |
| `FederatedTokenExchangeFailed` | WIF configuration mismatch | Verify issuer, subject, and audience in federated credential |
| `KubeConfigInvalid` | Malformed kubeconfig | Re-export kubeconfig; check cluster context |
| `DockerRegistryUnauthorized` | Registry credentials invalid | Update registry password/token |
| `SSLCertificateError` | Certificate chain validation failed | Add CA certificate to trusted store or set `acceptUntrustedCerts` |

---

## Common Patterns and Gotchas

**1. WIF is the recommended approach for all new Azure connections**
It eliminates secret rotation and reduces the risk of credential leaks. Existing SP+secret connections should be migrated.

**2. Service connection names must be unique per project**
Two connections in the same project cannot have the same name. Use naming conventions like `Azure-<env>-<subscription>`.

**3. Managed Identity connections only work on self-hosted agents**
Microsoft-hosted agents do not have managed identities. Use WIF or SP+secret for hosted agents.

**4. Per-pipeline authorization pauses the first run**
When a pipeline first references a new service connection, the run pauses until an administrator authorizes it. This is expected behavior, not an error.

**5. Service connection credentials are never exposed in logs**
Secrets in service connections are masked in all pipeline outputs. However, a malicious pipeline script could exfiltrate them via network calls — restrict access to trusted pipelines.

**6. Shared connections require org admin to create**
Setting `isShared: true` requires Organization Administrator permissions. Project-level admins cannot create shared connections.

**7. ARM scope affects what the pipeline can do**
A subscription-scoped connection can deploy to any resource group. A resource-group-scoped connection is limited to that single RG. Use the narrowest scope possible.
