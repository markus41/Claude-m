# Environment Auth Strategies

Patterns for managing authentication across local development, staging, and production environments.

## Strategy Overview

| Environment | Credential | Secrets | Setup |
|-------------|-----------|---------|-------|
| Local dev | `DefaultAzureCredential` → env vars | `.env` file (gitignored) | Set `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` |
| Azure Functions | System-assigned Managed Identity | None | Enable MI, assign roles |
| Azure App Service | System-assigned MI | None | Enable MI, assign roles |
| AKS (Azure) | Workload Identity | None | OIDC federation |
| Non-Azure K8s | `ClientSecretCredential` | K8s Secret / Vault | Mount secret from Vault/K8s |
| GitHub Actions | Client secret from secrets | GitHub encrypted secrets | `AZURE_*` in repo secrets |
| Azure DevOps | Service connection | Azure DevOps secret | Pipeline variable group |

## Local Development

### `.env` File Pattern

```
# .env (add to .gitignore!)
AZURE_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_SECRET=your-client-secret-value

# Service-specific config
DATAVERSE_ENV_URL=https://contoso-dev.crm.dynamics.com
```

Load with `dotenv`:

```typescript
import "dotenv/config";
import { DefaultAzureCredential } from "@azure/identity";

const credential = new DefaultAzureCredential();
// Automatically reads AZURE_* env vars from .env
```

### Azure CLI Fallback

For developers who prefer `az login`:

```bash
az login
az account set --subscription "your-subscription"
```

`DefaultAzureCredential` picks up the CLI token automatically. No env vars needed.

## Azure Managed Identity (Production)

Zero-secret authentication for Azure-hosted services.

### Setup Steps

1. **Enable Managed Identity** on your Azure resource:
   - Azure Functions → Identity → System assigned → On
   - App Service → Identity → System assigned → On
   - AKS → Enable OIDC and workload identity

2. **Assign Dataverse permissions:**
   - Go to Power Platform Admin Center → Environment → Settings → Application users
   - Add new application user with the MI's Object ID
   - Assign security role (e.g., System Administrator or custom)

3. **Assign Graph permissions:**
   - Use Azure CLI or PowerShell to assign app roles to the MI's service principal:

```bash
# Get the MI's service principal object ID
MI_OBJECT_ID=$(az identity show --name my-identity --resource-group my-rg --query principalId -o tsv)

# Get the Graph service principal
GRAPH_SP_ID=$(az ad sp list --display-name "Microsoft Graph" --query "[0].id" -o tsv)

# Get the app role ID (e.g., User.Read.All)
USER_READ_ALL_ID="df021288-bdef-4463-88db-98f22de89214"

# Assign the role
az rest --method POST \
  --uri "https://graph.microsoft.com/v1.0/servicePrincipals/${MI_OBJECT_ID}/appRoleAssignments" \
  --body "{\"principalId\":\"${MI_OBJECT_ID}\",\"resourceId\":\"${GRAPH_SP_ID}\",\"appRoleId\":\"${USER_READ_ALL_ID}\"}"
```

4. **Code — no changes needed:**

```typescript
import { DefaultAzureCredential } from "@azure/identity";

// On Azure, this automatically uses the managed identity
const credential = new DefaultAzureCredential();
```

### User-Assigned Managed Identity

For sharing one identity across multiple Azure resources:

```typescript
import { ManagedIdentityCredential } from "@azure/identity";

// Specify the client ID of the user-assigned MI
const credential = new ManagedIdentityCredential(process.env.MI_CLIENT_ID);
```

Or with `DefaultAzureCredential`:

```typescript
const credential = new DefaultAzureCredential({
  managedIdentityClientId: process.env.MI_CLIENT_ID
});
```

## Kubernetes (Non-Azure)

### Mounting Secrets

```yaml
# k8s-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: m365-credentials
type: Opaque
stringData:
  AZURE_TENANT_ID: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  AZURE_CLIENT_ID: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  AZURE_CLIENT_SECRET: "your-secret"
  DATAVERSE_ENV_URL: "https://contoso.crm.dynamics.com"
```

```yaml
# deployment.yaml
spec:
  containers:
    - name: app
      envFrom:
        - secretRef:
            name: m365-credentials
```

With Vault (HashiCorp):

```yaml
# Using Vault Agent Injector
spec:
  template:
    metadata:
      annotations:
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: "m365-app"
        vault.hashicorp.com/agent-inject-secret-azure: "secret/data/m365/azure"
        vault.hashicorp.com/agent-inject-template-azure: |
          {{- with secret "secret/data/m365/azure" -}}
          export AZURE_TENANT_ID={{ .Data.data.tenant_id }}
          export AZURE_CLIENT_ID={{ .Data.data.client_id }}
          export AZURE_CLIENT_SECRET={{ .Data.data.client_secret }}
          {{- end }}
```

## CI/CD Pipelines

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run provisioning
        env:
          AZURE_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
          AZURE_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
          AZURE_CLIENT_SECRET: ${{ secrets.AZURE_CLIENT_SECRET }}
          DATAVERSE_ENV_URL: ${{ vars.DATAVERSE_ENV_URL }}
        run: npx tsx scripts/provision.ts
```

### Azure DevOps

```yaml
# azure-pipelines.yml
variables:
  - group: m365-credentials  # Variable group with secrets

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '20.x'

  - script: npx tsx scripts/provision.ts
    env:
      AZURE_TENANT_ID: $(AZURE_TENANT_ID)
      AZURE_CLIENT_ID: $(AZURE_CLIENT_ID)
      AZURE_CLIENT_SECRET: $(AZURE_CLIENT_SECRET)
      DATAVERSE_ENV_URL: $(DATAVERSE_ENV_URL)
```

## Multi-Environment Config

### Config File Pattern

```typescript
// config/environments.ts

interface EnvironmentConfig {
  name: string;
  dataverseUrl: string;
  graphScopes: string[];
  // Environment-specific IDs
  teamId?: string;
  siteId?: string;
  driveId?: string;
}

const environments: Record<string, EnvironmentConfig> = {
  dev: {
    name: "Development",
    dataverseUrl: "https://contoso-dev.crm.dynamics.com",
    graphScopes: ["https://graph.microsoft.com/.default"],
    teamId: "dev-team-id",
    siteId: "dev-site-id",
    driveId: "dev-drive-id"
  },
  staging: {
    name: "Staging",
    dataverseUrl: "https://contoso-staging.crm.dynamics.com",
    graphScopes: ["https://graph.microsoft.com/.default"],
    teamId: "staging-team-id",
    siteId: "staging-site-id",
    driveId: "staging-drive-id"
  },
  prod: {
    name: "Production",
    dataverseUrl: "https://contoso.crm.dynamics.com",
    graphScopes: ["https://graph.microsoft.com/.default"],
    teamId: "prod-team-id",
    siteId: "prod-site-id",
    driveId: "prod-drive-id"
  }
};

export function getConfig(): EnvironmentConfig {
  const env = process.env.ENVIRONMENT ?? "dev";
  const config = environments[env];
  if (!config) throw new Error(`Unknown environment: ${env}`);
  return config;
}
```

### Factory Pattern

```typescript
import { DefaultAzureCredential } from "@azure/identity";
import { DataverseClient } from "./clients/dataverseClient";
import { GraphService } from "./clients/graphClient";
import { getConfig } from "./config/environments";

export function createClients() {
  const config = getConfig();
  const credential = new DefaultAzureCredential();

  return {
    config,
    dataverse: new DataverseClient({ environmentUrl: config.dataverseUrl }, credential),
    graph: new GraphService(credential)
  };
}

// Usage
const { config, dataverse, graph } = createClients();
```

## Secret Rotation

### Best Practices

1. **Use short-lived secrets** (6 months max for client secrets)
2. **Set up rotation alerts** in Azure AD (Entra)
3. **Prefer certificates** over secrets (longer validity, no string to leak)
4. **Prefer Managed Identity** in production (no secrets to rotate)
5. **Use Azure Key Vault** for centralized secret management

### Certificate-Based Auth

```typescript
import { ClientCertificateCredential } from "@azure/identity";

const credential = new ClientCertificateCredential(
  process.env.AZURE_TENANT_ID!,
  process.env.AZURE_CLIENT_ID!,
  process.env.AZURE_CLIENT_CERTIFICATE_PATH! // Path to .pem file
);
```

Or with inline certificate:

```typescript
const credential = new ClientCertificateCredential(
  tenantId,
  clientId,
  {
    certificate: process.env.AZURE_CLIENT_CERTIFICATE!, // PEM string
    certificatePassword: process.env.AZURE_CLIENT_CERTIFICATE_PASSWORD
  }
);
```
