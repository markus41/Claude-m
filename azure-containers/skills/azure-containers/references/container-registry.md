# Azure Container Registry — Deep Reference

## Overview

Azure Container Registry (ACR) is a managed OCI-compliant container registry for storing and distributing container images and Helm charts. It integrates with Azure Kubernetes Service (AKS), Container Apps, Container Instances, and CI/CD pipelines. ACR Tasks automate builds and patching triggered by code pushes or base image updates.

## REST API Endpoints

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|---|---|---|---|---|
| PUT | `/providers/Microsoft.ContainerRegistry/registries/{registry}` | Contributor | SKU (Basic/Standard/Premium), location | Create registry |
| GET | Same path | Reader | — | Get registry details |
| DELETE | Same path | Contributor | — | Delete registry |
| POST | `/registries/{reg}/listCredentials` | AcrImageSigner or Owner | — | Get admin username/password (if admin enabled) |
| POST | `/registries/{reg}/regenerateCredential` | Owner | `name: password\|password2` | Rotate admin password |
| PUT | `/registries/{reg}/replications/{location}` | Contributor | Location, tags | Create geo-replication to region |
| DELETE | `/registries/{reg}/replications/{location}` | Contributor | — | Remove geo-replication |
| PUT | `/registries/{reg}/webhooks/{name}` | Contributor | Service URI, actions | Create webhook |
| PUT | `/registries/{reg}/privateEndpointConnections/{conn}` | Contributor | privateLinkServiceConnectionState | Approve private endpoint |
| POST | `/registries/{reg}/scheduleRun` | Contributor | ACR Task run parameters | Trigger an ACR Task run |
| GET | `/registries/{reg}/listUsages` | Reader | — | Get storage and build usage |

Base: `https://management.azure.com/subscriptions/{sub}/resourceGroups/{rg}`

## RBAC Roles for ACR

| Role | Permissions | Use Case |
|---|---|---|
| AcrPull | Pull images and artifacts | AKS node pool, Container Apps runtime |
| AcrPush | Pull and push images | CI/CD pipeline service principal |
| AcrDelete | Pull, push, and delete images | Cleanup jobs, automated purge |
| AcrImageSigner | Sign images with content trust | Image signing pipeline |
| Owner/Contributor | Full management | Registry administrators |

## Azure CLI Patterns

```bash
# Create Premium registry (required for geo-replication, private endpoint)
az acr create \
  --name acrprodeastus \
  --resource-group rg-containers \
  --location eastus \
  --sku Premium \
  --admin-enabled false \
  --public-network-enabled false \
  --zone-redundancy Enabled

# Disable admin account (use managed identity instead)
az acr update \
  --name acrprodeastus \
  --resource-group rg-containers \
  --admin-enabled false

# Add geo-replication
az acr replication create \
  --registry acrprodeastus \
  --resource-group rg-containers \
  --location westus2 \
  --zone-redundancy Enabled

# Grant AKS cluster pull access (system-assigned identity)
AKS_KUBELET_IDENTITY=$(az aks show \
  --name aks-prod \
  --resource-group rg-aks \
  --query "identityProfile.kubeletidentity.objectId" -o tsv)

ACR_ID=$(az acr show \
  --name acrprodeastus \
  --resource-group rg-containers \
  --query id -o tsv)

az role assignment create \
  --assignee "$AKS_KUBELET_IDENTITY" \
  --role AcrPull \
  --scope "$ACR_ID"

# Grant Container Apps pull access
ACA_IDENTITY=$(az containerapp env show \
  --name cae-prod \
  --resource-group rg-containers \
  --query "identity.principalId" -o tsv)

az role assignment create \
  --assignee "$ACA_IDENTITY" \
  --role AcrPull \
  --scope "$ACR_ID"

# Build image using ACR Tasks (cloud build — no local Docker required)
az acr build \
  --registry acrprodeastus \
  --image myapp:$(git rev-parse --short HEAD) \
  --file Dockerfile \
  .

# Import image from Docker Hub (no local pull needed)
az acr import \
  --name acrprodeastus \
  --source docker.io/library/nginx:1.25 \
  --image nginx:1.25

# Import from another registry
az acr import \
  --name acrprodeastus \
  --source acrdev.azurecr.io/myapp:latest \
  --image myapp:latest

# Create auto-purge task (delete untagged manifests older than 7 days)
az acr task create \
  --registry acrprodeastus \
  --name purge-untagged \
  --cmd "acr purge --filter 'myapp:.*' --untagged --age 7d --keep 5" \
  --schedule "0 2 * * *" \
  --timeout 3600

# Create private endpoint
ACR_ID=$(az acr show --name acrprodeastus --resource-group rg-containers --query id -o tsv)

az network private-endpoint create \
  --name pe-acr-prod \
  --resource-group rg-networking \
  --vnet-name vnet-prod-eastus \
  --subnet subnet-private-endpoints \
  --private-connection-resource-id "$ACR_ID" \
  --group-id registry \
  --connection-name conn-acr-prod

# Configure private DNS zone for ACR
az network private-dns zone create \
  --resource-group rg-networking \
  --name privatelink.azurecr.io

az network private-dns link vnet create \
  --resource-group rg-networking \
  --zone-name privatelink.azurecr.io \
  --name link-vnet-prod \
  --virtual-network vnet-prod-eastus \
  --registration-enabled false
```

## ACR Tasks — Build Pipelines

```bash
# Create ACR Task triggered by Git commit (requires GitHub PAT or ADO token)
az acr task create \
  --registry acrprodeastus \
  --name build-myapp \
  --image "myapp:{{.Run.ID}}" \
  --context "https://github.com/contoso/myapp.git#main" \
  --file Dockerfile \
  --git-access-token "$GITHUB_PAT" \
  --set REGISTRY=acrprodeastus.azurecr.io

# Create multi-step ACR Task (build → test → push)
az acr task create \
  --registry acrprodeastus \
  --name multi-step-build \
  --file acr-task.yaml \
  --context "https://github.com/contoso/myapp.git#main" \
  --git-access-token "$GITHUB_PAT"
```

```yaml
# acr-task.yaml
version: v1.1.0
steps:
  # Build the image
  - build: -t $Registry/myapp:$ID -f Dockerfile .

  # Run unit tests
  - cmd: $Registry/myapp:$ID /app/run-tests.sh
    env:
      - RUN_INTEGRATION_TESTS=false

  # Push only if tests pass
  - push:
      - $Registry/myapp:$ID
      - $Registry/myapp:latest
```

## Dockerfile Best Practices for ACR

```dockerfile
# Multi-stage build: reduces final image size
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Final stage: minimal runtime image
FROM node:20-alpine AS runtime
WORKDIR /app

# Run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
```

## TypeScript SDK Patterns

```typescript
import { ContainerRegistryClient } from "@azure/container-registry";
import { DefaultAzureCredential } from "@azure/identity";

const client = new ContainerRegistryClient(
  "https://acrprodeastus.azurecr.io",
  new DefaultAzureCredential()
);

// List all repositories
for await (const repo of client.listRepositoryNames()) {
  console.log("Repository:", repo);
}

// Get all tags for an image
const repoCLient = client.getRepository("myapp");
for await (const manifest of repoCLient.listManifestProperties()) {
  console.log("Digest:", manifest.digest);
  console.log("Tags:", manifest.tags);
  console.log("Created:", manifest.createdOn);
  console.log("Size:", manifest.sizeInBytes, "bytes");
}

// Delete untagged manifests (cleanup)
const repo = client.getRepository("myapp");
for await (const manifest of repo.listManifestProperties()) {
  if (!manifest.tags || manifest.tags.length === 0) {
    console.log("Deleting untagged manifest:", manifest.digest);
    await repo.getArtifact(manifest.digest).delete();
  }
}
```

## Error Codes

| Code | Meaning | Remediation |
|---|---|---|
| UNAUTHORIZED (401) | Missing ACR token | Authenticate with `az acr login` or use managed identity |
| MANIFEST_UNKNOWN (404) | Image or tag does not exist | Verify image name and tag; check geo-replication sync |
| DENIED (403) | Missing AcrPull or AcrPush role | Assign correct RBAC role to the identity |
| NetworkRuleViolation (403) | Client IP blocked by ACR network rules | Add IP to allowlist or use private endpoint |
| TOOMANYREQUESTS (429) | Rate limit exceeded | Use `--platform` caching; retry with backoff |
| SKU_NOT_SUPPORTED (400) | Feature requires Premium SKU | Upgrade registry SKU |
| NAME_UNKNOWN (400) | Registry hostname incorrect | Use `{name}.azurecr.io` format |

## Throttling Limits

| Resource | Limit | Retry Strategy |
|---|---|---|
| Pull throughput | 10 Gbps (Premium) | Use geo-replication for pull-intensive workloads |
| Push throughput | 10 Gbps (Premium) | Parallelize layer uploads; use layer caching |
| ACR Task concurrency | 20 simultaneous runs | Queue builds; use `--no-wait` and poll status |
| Webhooks per registry | 500 | Consolidate notifications via Event Grid |
| Storage (Standard) | 100 GB included | Configure auto-purge; enable content addressability |
| Geo-replication regions | No hard limit | Replicate to regions where clusters are deployed |

## Production Gotchas

- **Disable admin account**: The admin account uses static credentials that cannot be rotated easily. Disable it and use managed identity (AcrPull role) for all automated access. The admin account is only needed for legacy scenarios.
- **Private endpoint and public access**: When using a private endpoint with ACR, set `--public-network-enabled false` to prevent public pull access. Without this, clients from the internet can still pull images using the public endpoint.
- **Geo-replication and pull latency**: ACR automatically routes pulls to the nearest replicated region based on the client's IP. Ensure geo-replication is configured for every region where your containers run, or pulls will cross regions and incur latency.
- **Untagged manifests accumulate**: Every `docker push` creates a new manifest. Old manifests remain unless explicitly deleted. Without auto-purge, storage usage grows unboundedly. Use `az acr task create` with the `acr purge` command on a schedule.
- **Layer caching in ACR Tasks**: ACR Tasks support a `--cache-enabled` flag that caches Docker layers across builds. This significantly reduces build time for images with large dependency layers (e.g., large `npm install` or `pip install` steps).
- **Content trust and signed images**: For production environments requiring supply chain security, enable ACR content trust and sign images using Notation (OCI Notation spec) or Notary v1. Only signed images can be deployed when content trust is enforced.
