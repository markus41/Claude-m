---
name: Azure Web Apps
description: >
  Deep expertise in Azure App Service — create, deploy, and manage web apps, APIs, and
  mobile backends via ARM REST API, deployment slots, custom domains, managed identity,
  Key Vault integration, Application Insights, and CI/CD pipelines.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - azure web app
  - app service
  - web app
  - deployment slot
  - azure deploy
  - app service plan
  - custom domain
  - tls certificate
  - managed identity
  - key vault reference
  - zip deploy
  - blue-green deployment
  - azure paas
---

# Azure Web Apps

## Overview

Azure App Service is the Platform-as-a-Service (PaaS) offering for hosting web applications, REST APIs, and mobile backends on Azure. It provides managed compute, built-in load balancing, automatic patching, and integrated CI/CD. App Service supports multiple runtime stacks (.NET, Node.js, Python, Java, PHP, Ruby) and containerized workloads.

Key benefits: zero-downtime deployments via deployment slots, horizontal auto-scaling, managed SSL certificates, VNet integration for private networking, and managed identity for passwordless authentication to Azure resources.

## ARM REST API Endpoints

Base URL: `https://management.azure.com`
API Version: `2023-12-01`

All endpoints require the header `Authorization: Bearer <token>` with scope `https://management.azure.com/.default`.

### App Service Plans

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/serverfarms` | List plans in resource group |
| POST | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/serverfarms/{planName}` | Create or update a plan |
| GET | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/serverfarms/{planName}` | Get plan details |
| DELETE | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/serverfarms/{planName}` | Delete a plan |

**Create App Service Plan body**:
```json
{
  "location": "eastus",
  "sku": {
    "name": "S1",
    "tier": "Standard",
    "capacity": 1
  },
  "kind": "linux",
  "properties": {
    "reserved": true
  }
}
```

Set `kind: "linux"` and `reserved: true` for Linux plans. Omit both for Windows plans.

### Web Apps

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/sites` | List web apps in resource group |
| PUT | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/sites/{appName}` | Create or update a web app |
| GET | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/sites/{appName}` | Get web app details |
| DELETE | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/sites/{appName}` | Delete a web app |
| POST | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/sites/{appName}/restart` | Restart the app |
| POST | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/sites/{appName}/stop` | Stop the app |
| POST | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/sites/{appName}/start` | Start the app |

**Create Web App body**:
```json
{
  "location": "eastus",
  "properties": {
    "serverFarmId": "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/serverfarms/{planName}",
    "siteConfig": {
      "linuxFxVersion": "NODE|20-lts",
      "appSettings": [
        { "name": "WEBSITE_NODE_DEFAULT_VERSION", "value": "~20" }
      ],
      "alwaysOn": true,
      "http20Enabled": true,
      "minTlsVersion": "1.2"
    },
    "httpsOnly": true
  },
  "identity": {
    "type": "SystemAssigned"
  }
}
```

Windows runtime versions: `DOTNET|v8.0`, `NODE|20`, `PYTHON|3.12`, `JAVA|17-java17`.
Linux runtime versions: `DOTNETCORE|8.0`, `NODE|20-lts`, `PYTHON|3.12`, `JAVA|17-java17`.

### Deployment Slots

| Method | Endpoint | Purpose |
|--------|----------|---------|
| PUT | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/sites/{appName}/slots/{slotName}` | Create a deployment slot |
| POST | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/sites/{appName}/slotsswap` | Swap slots |
| GET | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/sites/{appName}/slots` | List all slots |

**Swap slots body**:
```json
{
  "targetSlot": "production",
  "preserveVnet": true
}
```

### App Settings

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/.../sites/{appName}/config/appsettings/list` | List app settings |
| PUT | `/.../sites/{appName}/config/appsettings` | Update app settings |

**Update app settings body**:
```json
{
  "properties": {
    "DB_CONNECTION": "@Microsoft.KeyVault(VaultName=myvault;SecretName=db-conn)",
    "APPINSIGHTS_INSTRUMENTATIONKEY": "xxx-xxx",
    "WEBSITE_RUN_FROM_PACKAGE": "1"
  }
}
```

### Custom Domains

| Method | Endpoint | Purpose |
|--------|----------|---------|
| PUT | `/.../sites/{appName}/hostNameBindings/{hostname}` | Bind custom domain |
| GET | `/.../sites/{appName}/hostNameBindings` | List domain bindings |
| DELETE | `/.../sites/{appName}/hostNameBindings/{hostname}` | Remove domain binding |

**Bind custom domain body**:
```json
{
  "properties": {
    "hostNameType": "Verified",
    "sslState": "SniEnabled",
    "thumbprint": "<certificate-thumbprint>"
  }
}
```

### TLS Certificates

| Method | Endpoint | Purpose |
|--------|----------|---------|
| PUT | `/.../certificates/{certName}` | Upload or import a certificate |
| POST | `/.../sites/{appName}/config/web` | Configure TLS settings |

## Deployment Methods

### GitHub Actions (OIDC Federated Credential)

The recommended CI/CD approach uses OIDC federated credentials — no secrets stored in GitHub.

1. Create an Azure AD app registration with federated credential for GitHub Actions.
2. Assign the app the `Website Contributor` role on the App Service.
3. Configure GitHub secrets: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`.
4. Use `azure/login@v2` with `client-id`, `tenant-id`, `subscription-id`.
5. Use `azure/webapps-deploy@v3` to deploy.

### ZIP Deploy

```bash
az webapp deploy --resource-group <rg> --name <app-name> --src-path ./app.zip --type zip
```

Or via REST API:
```
POST https://<app-name>.scm.azurewebsites.net/api/zipdeploy
Content-Type: application/zip
Authorization: Basic <deployment-credentials>
Body: <zip-file-binary>
```

### Docker Container

```json
{
  "properties": {
    "siteConfig": {
      "linuxFxVersion": "DOCKER|myregistry.azurecr.io/myimage:latest",
      "acrUseManagedIdentityCreds": true
    }
  }
}
```

### Local Git

Enable local Git deployment and push to the App Service Git remote:
```bash
az webapp deployment source config-local-git --name <app-name> --resource-group <rg>
git remote add azure <git-url-from-output>
git push azure main
```

## Managed Identity & Key Vault

### System-Assigned Managed Identity

Enable via ARM: `"identity": { "type": "SystemAssigned" }`. The response includes `principalId` and `tenantId`.

### Key Vault References in App Settings

Instead of storing secrets directly in app settings, reference Azure Key Vault:

```
@Microsoft.KeyVault(VaultName=myvault;SecretName=db-connection-string)
@Microsoft.KeyVault(SecretUri=https://myvault.vault.azure.net/secrets/db-connection-string/abc123)
```

Prerequisites:
1. Enable managed identity on the App Service.
2. Grant the identity `Key Vault Secrets User` role on the Key Vault.
3. Use the `@Microsoft.KeyVault(...)` syntax in app settings.

## Application Insights

### Auto-Instrumentation

For supported runtimes (.NET, Node.js, Java, Python), enable auto-instrumentation via app settings:

```json
{
  "APPLICATIONINSIGHTS_CONNECTION_STRING": "InstrumentationKey=xxx;IngestionEndpoint=https://xxx.applicationinsights.azure.com/",
  "ApplicationInsightsAgent_EXTENSION_VERSION": "~3"
}
```

### Availability Tests

Configure URL ping tests to monitor uptime from multiple Azure regions.

## Networking

### VNet Integration

Connect the App Service to an Azure Virtual Network for access to private resources:

```json
{
  "properties": {
    "virtualNetworkSubnetId": "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Network/virtualNetworks/{vnet}/subnets/{subnet}"
  }
}
```

Requires a dedicated subnet with at least /26 address space.

### Private Endpoints

Make the app accessible only via private IP within a VNet:

```json
{
  "properties": {
    "privateLinkResourceId": "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/sites/{appName}",
    "groupIds": ["sites"]
  }
}
```

### Access Restrictions

Allow traffic only from specific IPs or VNet subnets:

```json
{
  "properties": {
    "ipSecurityRestrictions": [
      {
        "ipAddress": "203.0.113.0/24",
        "action": "Allow",
        "priority": 100,
        "name": "Office IP"
      }
    ]
  }
}
```

## App Service Plan Tiers

| Tier | SKU | Scaling | Custom Domain | Slots | VNet Integration |
|------|-----|---------|---------------|-------|-----------------|
| Free | F1 | 1 instance, shared | No | 0 | No |
| Shared | D1 | 1 instance, shared | Yes | 0 | No |
| Basic | B1-B3 | Up to 3 instances | Yes | 0 | No |
| Standard | S1-S3 | Up to 10 instances, auto-scale | Yes | 5 | Yes |
| Premium v3 | P1v3-P3v3 | Up to 30 instances, auto-scale | Yes | 20 | Yes |
| Isolated v2 | I1v2-I6v2 | Up to 100 instances, dedicated | Yes | 20 | Yes (ASE) |

## Permissions / Scopes

| Scope / Role | Purpose |
|--------------|---------|
| `https://management.azure.com/.default` | ARM REST API access |
| Website Contributor | Manage web apps (not App Service Plans) |
| Web Plan Contributor | Manage App Service Plans |
| Contributor | Full management of resources in the resource group |

## Error Handling

| Status | Meaning | Action |
|--------|---------|--------|
| 400 | Bad Request — invalid JSON, missing required property | Check ARM template schema and required properties |
| 403 | Forbidden — insufficient RBAC permissions | Verify role assignments on the resource group or subscription |
| 404 | Not Found — app, plan, or resource group does not exist | Confirm resource names and subscription context |
| 409 | Conflict — resource name already taken or slot swap in progress | Web app names are globally unique; wait for swap to complete |
| 429 | Too Many Requests — ARM API throttled | Retry after `Retry-After` header; ARM has per-subscription limits |

ARM error response structure:
```json
{
  "error": {
    "code": "ResourceNotFound",
    "message": "The Resource 'Microsoft.Web/sites/myapp' under resource group 'myrg' was not found."
  }
}
```

### Deployment-Specific Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `GatewayTimeout` during swap | Health check endpoint not responding | Add health check path and increase warm-up time |
| `ConflictError` on slot swap | Previous swap still in progress | Wait for active swap to complete |
| ZIP deploy returns 400 | Package too large or corrupt | Check package size limit (2GB); verify ZIP integrity |
| `KuduApiError` | SCM site unreachable | Check SCM access restrictions; verify deployment credentials |

## Common Patterns

### Blue-Green Deployment with Slots

Zero-downtime deployment using staging slot:

1. Create a staging slot: `PUT .../sites/{app}/slots/staging`.
2. Deploy new version to staging: ZIP deploy or GitHub Actions targeting the staging slot.
3. Run smoke tests against `https://{app}-staging.azurewebsites.net`.
4. Swap staging → production: `POST .../sites/{app}/slotsswap` with `targetSlot: "production"`.
5. If issues detected, swap again to rollback instantly.
6. Mark slot-specific settings (e.g., `SLOT_NAME`) as sticky so they don't swap.

### Containerized Web App with ACR

Deploy a Docker container from Azure Container Registry:

1. Create an ACR: `az acr create --name myregistry --resource-group myrg --sku Basic`.
2. Build and push image: `az acr build --registry myregistry --image myapp:v1 .`.
3. Create web app with container: set `linuxFxVersion: "DOCKER|myregistry.azurecr.io/myapp:v1"`.
4. Enable managed identity and grant `AcrPull` role on the registry.
5. Set `acrUseManagedIdentityCreds: true` in site config (no admin credentials needed).
6. Enable continuous deployment: ACR webhook triggers redeployment on image push.

### Managed Identity + Key Vault + SQL

Secure database access without passwords:

1. Enable system-assigned managed identity on the App Service.
2. Create a Key Vault and store the SQL connection string as a secret.
3. Grant the App Service identity `Key Vault Secrets User` on the vault.
4. Set app setting: `DB_CONNECTION=@Microsoft.KeyVault(VaultName=myvault;SecretName=sql-conn)`.
5. Alternatively, use Azure AD authentication for SQL: grant the managed identity `db_datareader` and `db_datawriter` roles directly in SQL Database.

### GitHub Actions CI/CD with OIDC

Passwordless deployment from GitHub:

1. Create an Azure AD app registration.
2. Add a federated credential: issuer `https://token.actions.githubusercontent.com`, subject `repo:org/repo:ref:refs/heads/main`.
3. Assign `Website Contributor` role on the App Service.
4. In GitHub, set secrets: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`.
5. Use the `azure/login@v2` action with `client-id`, `tenant-id`, `subscription-id` (no secret needed).
6. Deploy with `azure/webapps-deploy@v3`.

## Best Practices

- **Always enable HTTPS**: Set `httpsOnly: true` on every web app.
- **Use deployment slots for production**: Never deploy directly to the production slot.
- **Key Vault for secrets**: Use `@Microsoft.KeyVault(...)` references instead of storing secrets in app settings.
- **Managed identity**: Use system-assigned identity for single-resource scenarios, user-assigned for shared identity across resources.
- **Health check**: Configure `/health` endpoint and set it in App Service health check settings for automatic instance replacement.
- **Application Insights**: Always enable for production workloads — the telemetry is invaluable for debugging.
- **Auto-scale**: Configure auto-scale rules on Standard tier or above for production workloads.

## Reference Files

| Reference | Path | Content |
|-----------|------|---------|
| ARM API | `references/arm-api.md` | Complete ARM REST API reference for App Service |
| Deployment Methods | `references/deployment-methods.md` | ZIP, GitHub Actions, Docker, Local Git |
| Networking | `references/networking.md` | VNet, private endpoints, access restrictions |
| Key Vault Integration | `references/keyvault-integration.md` | Managed identity + Key Vault reference patterns |

## Example Files

| Example | Path | Content |
|---------|------|---------|
| Blue-Green Deploy | `examples/blue-green-deploy.md` | Complete slot-based deployment workflow |
| Container Deploy | `examples/container-deploy.md` | ACR + managed identity + continuous deployment |
| GitHub Actions OIDC | `examples/github-actions-oidc.md` | Passwordless CI/CD pipeline |
| Full ARM Template | `examples/arm-template.md` | Complete ARM template for App Service + Plan + Identity |
