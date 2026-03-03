# Azure Container Apps and ACI Networking and Ingress — Deep Reference

## Overview

Azure Container Apps supports external (internet-facing) and internal (VNet-only) ingress via a built-in Envoy proxy. Container Apps Environments can be deployed in VNet-integrated mode for private networking. This reference covers ingress configuration, custom domains, traffic splitting, CORS, and private networking patterns.

## REST API Endpoints — Ingress

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|---|---|---|---|---|
| PATCH | `/providers/Microsoft.App/containerApps/{app}` with `ingress` | Contributor | `external`, `targetPort`, `transport`, `allowInsecure`, `customDomains`, `traffic` | Update ingress config |
| GET | `/containerApps/{app}` | Reader | — | Get FQDN and traffic config |
| PUT | `/managedEnvironments/{env}/certificates/{cert}` | Contributor | PFX base64, password | Upload custom TLS certificate |
| POST | `/managedEnvironments/{env}/managedCertificates/{cert}` | Contributor | `domainControlValidation`, `subjectName` | Create managed certificate for custom domain |
| GET | `/managedEnvironments/{env}/certificates` | Reader | — | List certificates |
| PUT | `/managedEnvironments/{env}/daprComponents/{comp}` | Contributor | Component YAML | Add Dapr component for inter-service calls |

Base: `https://management.azure.com/subscriptions/{sub}/resourceGroups/{rg}`

## Azure CLI Patterns — Ingress Configuration

```bash
# Enable external HTTPS ingress
az containerapp ingress enable \
  --name api-service \
  --resource-group rg-containers \
  --type external \
  --target-port 3000 \
  --transport http2

# Enable internal (VNet only) ingress
az containerapp ingress enable \
  --name internal-api \
  --resource-group rg-containers \
  --type internal \
  --target-port 8080 \
  --transport http

# Disable ingress (for background workers)
az containerapp ingress disable \
  --name worker-service \
  --resource-group rg-containers

# Configure traffic splitting (blue/green deployment)
az containerapp ingress traffic set \
  --name api-service \
  --resource-group rg-containers \
  --revision-weight \
    api-service--blue=90 \
    api-service--green=10

# Get FQDN
az containerapp show \
  --name api-service \
  --resource-group rg-containers \
  --query "properties.configuration.ingress.fqdn" \
  --output tsv
# Output: api-service.nicebeach-abc123.eastus.azurecontainerapps.io

# Add custom domain (managed certificate — automatic TLS)
az containerapp hostname add \
  --name api-service \
  --resource-group rg-containers \
  --hostname "api.contoso.com"

# Check domain validation status
az containerapp hostname list \
  --name api-service \
  --resource-group rg-containers \
  --output table

# Bind managed certificate to custom domain
az containerapp hostname bind \
  --name api-service \
  --resource-group rg-containers \
  --hostname "api.contoso.com" \
  --validation-method TXT \
  --environment cae-prod

# Upload custom TLS certificate (for own CA)
az containerapp env certificate upload \
  --name cae-prod \
  --resource-group rg-containers \
  --certificate-file /certs/api-contoso-com.pfx \
  --password "$CERT_PASSWORD"
```

## CORS Configuration via Ingress Rules

```bash
# Container Apps has no native CORS — configure at app level or use Azure API Management
# Option 1: Middleware in Node.js/Express
```

```typescript
import express from "express";
import cors from "cors";

const app = express();

// CORS middleware (before other routes)
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      "https://app.contoso.com",
      "https://admin.contoso.com",
      process.env.ALLOWED_ORIGIN, // from environment variable
    ].filter(Boolean);

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
  exposedHeaders: ["X-Request-ID", "X-RateLimit-Remaining"],
  credentials: true,
  maxAge: 86400, // 24 hours preflight cache
}));
```

## VNet Integration Architecture

```bash
# Create VNet with dedicated subnet for Container Apps
# Subnet minimum size: /23 for consumption profile, /27 for dedicated profile
az network vnet subnet create \
  --vnet-name vnet-prod-eastus \
  --resource-group rg-networking \
  --name subnet-aca-env \
  --address-prefix 10.10.20.0/23  # /23 minimum for consumption

# Delegate subnet to Container Apps
az network vnet subnet update \
  --vnet-name vnet-prod-eastus \
  --resource-group rg-networking \
  --name subnet-aca-env \
  --delegations Microsoft.App/environments

# Create environment with VNet integration (internal only)
az containerapp env create \
  --name cae-prod-internal \
  --resource-group rg-containers \
  --location eastus \
  --internal-only true \
  --infrastructure-subnet-resource-id \
    "/subscriptions/<sub>/resourceGroups/rg-networking/providers/Microsoft.Network/virtualNetworks/vnet-prod-eastus/subnets/subnet-aca-env" \
  --zone-redundant \
  --logs-workspace-id "$LAWS_CUSTOMER_ID" \
  --logs-workspace-key "$LAWS_WORKSPACE_KEY"

# Create private DNS zone for internal environment
# Get the static IP of the internal load balancer
IL_IP=$(az containerapp env show \
  --name cae-prod-internal \
  --resource-group rg-containers \
  --query "properties.staticIp" -o tsv)

az network private-dns zone create \
  --resource-group rg-networking \
  --name "cae-prod-internal.internal"

az network private-dns link vnet create \
  --resource-group rg-networking \
  --zone-name "cae-prod-internal.internal" \
  --name link-vnet-prod \
  --virtual-network vnet-prod-eastus \
  --registration-enabled false

# Add wildcard A record for the environment
az network private-dns record-set a add-record \
  --resource-group rg-networking \
  --zone-name "cae-prod-internal.internal" \
  --record-set-name "*" \
  --ipv4-address "$IL_IP"
```

## Service-to-Service Communication Patterns

```bash
# Pattern 1: Dapr service invocation (preferred for Dapr-enabled apps)
# App calls: http://localhost:3500/v1.0/invoke/{target-app-id}/method/{endpoint}

# Pattern 2: Direct container app FQDN
# Internal: https://{app-name}.{env-fqdn}
# Get internal FQDN for service discovery
az containerapp show \
  --name auth-service \
  --resource-group rg-containers \
  --query "properties.configuration.ingress.fqdn" \
  --output tsv
# auth-service.internal.cae-prod-internal.eastus.azurecontainerapps.io

# Pattern 3: Kubernetes-style DNS (for apps in same environment)
# Apps can reach each other via: https://{app-name}
# Environment's built-in DNS resolves container app names

# Pattern 4: Container Apps Custom DNS via environment variable injection
# Set target service URL as environment variable
az containerapp update \
  --name api-service \
  --resource-group rg-containers \
  --set-env-vars "AUTH_SERVICE_URL=https://auth-service"
```

## TypeScript SDK — Ingress Configuration

```typescript
import { ContainerAppsAPIClient } from "@azure/arm-appcontainers";
import { DefaultAzureCredential } from "@azure/identity";

const client = new ContainerAppsAPIClient(
  new DefaultAzureCredential(),
  subscriptionId
);

// Get current ingress config
const app = await client.containerApps.get(resourceGroup, "api-service");
const fqdn = app.configuration?.ingress?.fqdn;
const currentTraffic = app.configuration?.ingress?.traffic;

console.log("FQDN:", fqdn);
console.log("Traffic:", JSON.stringify(currentTraffic, null, 2));

// Update traffic weights (canary release)
const updatedApp = {
  ...app,
  configuration: {
    ...app.configuration,
    ingress: {
      ...app.configuration?.ingress,
      traffic: [
        { latestRevision: false, revisionName: "api-service--v1", weight: 70 },
        { latestRevision: true, weight: 30 }, // new revision
      ],
    },
  },
};

await client.containerApps.beginCreateOrUpdateAndWait(
  resourceGroup,
  "api-service",
  updatedApp
);
```

## Error Codes

| Code | Meaning | Remediation |
|---|---|---|
| CustomDomainValidationFailed (400) | DNS TXT record not found or wrong value | Wait for DNS propagation (up to 48h); verify TXT record |
| CertificateNotFound (404) | Certificate name mismatch | Verify certificate name in environment certificates list |
| IngressPortConflict (409) | Port already in use by another app in same environment | Use unique ports per app or different target ports |
| SubnetTooSmall (400) | ACA environment subnet smaller than /23 | Recreate subnet with /23 or larger for consumption workload profile |
| EnvironmentInternalOnly (400) | External ingress on internal-only environment | Use API Management or Azure Front Door as external gateway |
| RevisionNotFound (404) | Traffic rule references non-existent revision | List revisions and update traffic config |
| DnsLookupFailed | Service name resolution failed | Check private DNS zone configuration; verify wildcard A record |

## Throttling Limits

| Resource | Limit | Notes |
|---|---|---|
| Custom domains per Container App | 100 | Use wildcard certificate for subdomains |
| Certificates per environment | 200 | Use managed certificates to avoid manual renewal |
| Ingress ports per app | 1 port | Use a reverse proxy (Nginx/Envoy) if multiple ports needed |
| Request timeout | 240 seconds | Long-running jobs should use background processing with queues |
| Request size (max body) | 100 MB | Stream large payloads to Blob Storage |
| WebSocket connections | Supported (HTTP/1.1 and HTTP/2) | Ensure `transport: http` (not http2) for WebSocket apps |

## Production Gotchas

- **Custom domain validation requires TXT record first**: Before Azure can issue a managed certificate, you must add a DNS TXT record (`asuid.{subdomain}`) to prove ownership. The app stays in `Waiting` state until validation completes. This can take up to 48 hours for DNS propagation.
- **Internal environments need private DNS**: Apps in an `--internal-only` environment are not reachable from the internet or even from other VNets without a private DNS zone and a wildcard A record pointing to the environment's static IP. Set this up before deploying workloads.
- **Traffic splitting is per-revision, not per-instance**: Traffic weights route entire requests to a revision, not individual instances within a revision. All instances of a revision see the same traffic percentage.
- **Ingress is at the environment level, not the subscription level**: The built-in ingress load balancer is shared across all Container Apps in an environment. For strict isolation (separate load balancers, separate VNets), create separate environments.
- **HTTP/2 end-to-end**: Container Apps ingress supports HTTP/2 with gRPC (`--transport http2`). For REST APIs over HTTP/1.1, use `--transport http`. Setting the wrong transport causes connection failures.
- **Session affinity is not supported**: Container Apps does not support session-based stickiness (unlike Application Gateway). Design applications to be stateless or use distributed session storage (Redis Cache, Cosmos DB).
