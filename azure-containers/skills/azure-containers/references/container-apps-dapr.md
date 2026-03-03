# Azure Container Apps and Dapr — Deep Reference

## Overview

Azure Container Apps (ACA) is a serverless container runtime built on top of Kubernetes, supporting KEDA-based autoscaling (including scale-to-zero), Dapr sidecar integration, and built-in HTTP ingress. It is the recommended platform for microservices, APIs, and event-driven workloads that do not require full Kubernetes control. Dapr (Distributed Application Runtime) provides service invocation, pub/sub, state management, and secret APIs as a sidecar.

## REST API Endpoints

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|---|---|---|---|---|
| PUT | `/providers/Microsoft.App/managedEnvironments/{env}` | Contributor | Log Analytics workspace, VNet | Create Container Apps Environment |
| GET | Same path | Reader | — | Get environment details |
| PUT | `/managedEnvironments/{env}/daprComponents/{component}` | Contributor | Component type, metadata, scopes | Add Dapr component |
| PUT | `/providers/Microsoft.App/containerApps/{app}` | Contributor | Image, environment, ingress, scaling | Create or update Container App |
| GET | Same path | Reader | — | Get app configuration and latest revision |
| POST | `/containerApps/{app}/revisions/{rev}/activate` | Contributor | — | Activate a revision |
| POST | `/containerApps/{app}/revisions/{rev}/deactivate` | Contributor | — | Deactivate a revision |
| POST | `/containerApps/{app}/revisions/{rev}/restart` | Contributor | — | Restart a revision |
| GET | `/containerApps/{app}/revisions` | Reader | — | List all revisions |
| POST | `/containerApps/{app}/listSecrets` | Contributor | — | List all secrets (values redacted) |

Base: `https://management.azure.com/subscriptions/{sub}/resourceGroups/{rg}`

## Azure CLI Patterns — Environment and App Deployment

```bash
# Create Container Apps Environment with VNet integration
az containerapp env create \
  --name cae-prod \
  --resource-group rg-containers \
  --location eastus \
  --infrastructure-subnet-resource-id \
    "/subscriptions/<sub>/resourceGroups/rg-networking/providers/Microsoft.Network/virtualNetworks/vnet-prod/subnets/subnet-aca" \
  --internal-only true \
  --logs-workspace-id "$LAWS_CUSTOMER_ID" \
  --logs-workspace-key "$LAWS_WORKSPACE_KEY" \
  --zone-redundant

# Add a Dapr component (Redis state store)
az containerapp env dapr-component set \
  --name cae-prod \
  --resource-group rg-containers \
  --dapr-component-name statestore \
  --yaml - <<'EOF'
componentType: state.redis
version: v1
metadata:
  - name: redisHost
    value: redis-prod.cache.windows.net:6380
  - name: redisPassword
    secretRef: redis-password
  - name: enableTLS
    value: "true"
secrets:
  - name: redis-password
    value: "<redis-primary-key>"
scopes:
  - order-service
  - payment-service
EOF

# Add Service Bus pub/sub Dapr component
az containerapp env dapr-component set \
  --name cae-prod \
  --resource-group rg-containers \
  --dapr-component-name pubsub \
  --yaml - <<'EOF'
componentType: pubsub.azure.servicebus.queues
version: v1
metadata:
  - name: connectionString
    secretRef: servicebus-connection
secrets:
  - name: servicebus-connection
    value: "<servicebus-connection-string>"
EOF

# Deploy a Container App with Dapr enabled
az containerapp create \
  --name api-service \
  --resource-group rg-containers \
  --environment cae-prod \
  --image acrprodeastus.azurecr.io/api-service:1.0.0 \
  --registry-server acrprodeastus.azurecr.io \
  --target-port 3000 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 20 \
  --cpu 0.5 \
  --memory 1.0Gi \
  --enable-dapr true \
  --dapr-app-id api-service \
  --dapr-app-port 3000 \
  --dapr-app-protocol http \
  --env-vars \
    NODE_ENV=production \
    PORT=3000 \
  --secrets \
    db-password=secretref:kv-db-password

# Update image (create new revision)
az containerapp update \
  --name api-service \
  --resource-group rg-containers \
  --image acrprodeastus.azurecr.io/api-service:1.1.0

# Canary deployment: split traffic 90/10
az containerapp ingress traffic set \
  --name api-service \
  --resource-group rg-containers \
  --revision-weight \
    api-service--1=90 \
    api-service--2=10

# Scale based on custom KEDA rule (Azure Service Bus queue depth)
az containerapp update \
  --name worker-service \
  --resource-group rg-containers \
  --min-replicas 0 \
  --max-replicas 50 \
  --scale-rule-name "servicebus-scaler" \
  --scale-rule-type "azure-servicebus" \
  --scale-rule-auth "connection=servicebus-connection" \
  --scale-rule-metadata \
    queueName=work-items \
    messageCount=5 \
    namespace=sb-prod

# Set Key Vault reference for secrets
az containerapp secret set \
  --name api-service \
  --resource-group rg-containers \
  --secrets "db-password=keyvaultref:https://mykeyvault.vault.azure.net/secrets/db-password,identityref:/subscriptions/<sub>/resourceGroups/rg-prod/providers/Microsoft.ManagedIdentity/userAssignedIdentities/id-api-service"
```

## Dapr Service Invocation — TypeScript

```typescript
import fetch from "node-fetch";

// Dapr sidecar runs on localhost:3500 by default
const DAPR_HTTP_PORT = process.env.DAPR_HTTP_PORT || "3500";

// Invoke another service via Dapr (bypasses direct service discovery)
async function invokeService(appId: string, method: string, data?: object) {
  const response = await fetch(
    `http://localhost:${DAPR_HTTP_PORT}/v1.0/invoke/${appId}/method/${method}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: data ? JSON.stringify(data) : undefined,
    }
  );

  if (!response.ok) {
    throw new Error(`Dapr invocation failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

// Usage: invoke the payment-service
const result = await invokeService("payment-service", "process", {
  orderId: "order-123",
  amount: 99.99,
});
```

## Dapr State Management — TypeScript

```typescript
const DAPR_HTTP_PORT = process.env.DAPR_HTTP_PORT || "3500";
const STATE_STORE_NAME = "statestore";

// Save state
async function saveState(key: string, value: unknown) {
  const response = await fetch(
    `http://localhost:${DAPR_HTTP_PORT}/v1.0/state/${STATE_STORE_NAME}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ key, value }]),
    }
  );
  if (!response.ok) throw new Error(`Save state failed: ${response.status}`);
}

// Get state
async function getState<T>(key: string): Promise<T | null> {
  const response = await fetch(
    `http://localhost:${DAPR_HTTP_PORT}/v1.0/state/${STATE_STORE_NAME}/${key}`
  );
  if (response.status === 204) return null; // key not found
  return response.json() as Promise<T>;
}

// Publish to topic
async function publishEvent(topicName: string, data: unknown) {
  const response = await fetch(
    `http://localhost:${DAPR_HTTP_PORT}/v1.0/publish/pubsub/${topicName}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );
  if (!response.ok) throw new Error(`Publish failed: ${response.status}`);
}

// Express.js endpoint to subscribe to events
import express from "express";
const app = express();
app.use(express.json());

// Dapr calls GET /dapr/subscribe to discover subscriptions
app.get("/dapr/subscribe", (req, res) => {
  res.json([
    {
      pubsubname: "pubsub",
      topic: "orders",
      route: "/orders/process",
    },
  ]);
});

// Handle incoming events
app.post("/orders/process", async (req, res) => {
  const event = req.body;
  console.log("Received order event:", event.data);
  // Process the event...
  res.status(200).send("SUCCESS");
  // Return non-200 to trigger Dapr retry (max retries configurable per component)
});
```

## Error Codes

| Code | Meaning | Remediation |
|---|---|---|
| ContainerAppProvisioning (400) | Invalid app configuration | Check CPU/memory ratios (must match predefined sizes) |
| EnvironmentNotReady (409) | Environment still provisioning | Wait for `provisioningState: Succeeded` |
| RevisionUpdateFailed (500) | New revision failed to start | Check revision logs with `az containerapp logs show` |
| DaprComponentNotFound (404) | Dapr component name typo or wrong scope | Verify component name; check `scopes` in component definition |
| IngressNotEnabled (400) | App has no ingress configured | Set `--ingress external\|internal` on create/update |
| QuotaExceeded (429) | ACA resource quota exceeded | Request quota increase; check per-region vCPU limits |
| ImagePullFailed | ACR authentication failure | Verify AcrPull role assignment; check registry server name |

## Throttling Limits

| Resource | Limit | Notes |
|---|---|---|
| Replicas per app | 300 | Use multiple apps for higher scale |
| Container apps per environment | 200 | Split into multiple environments for very large microservice meshes |
| Revisions per app | 100 (active) | Deactivate old revisions; only most recent N kept active |
| CPU per replica | 4 vCPU max | Use Jobs for burst compute needing more CPU |
| Memory per replica | 8 Gi max | Match memory to CPU (see allowed combinations) |
| Dapr components per environment | No hard limit | Large component counts may increase sidecar startup time |

## Production Gotchas

- **CPU/Memory ratios are fixed**: Container Apps only supports specific CPU/memory combinations. Valid pairs include: 0.25 vCPU / 0.5 Gi, 0.5 / 1 Gi, 0.75 / 1.5 Gi, 1 / 2 Gi, 2 / 4 Gi, etc. Requesting an unsupported combination returns `ContainerAppProvisioning` error.
- **Scale to zero and cold starts**: When `minReplicas=0`, the app scales to zero during inactivity. The first request triggers a cold start (20–60 seconds). For latency-sensitive apps, set `minReplicas=1` or use warmup endpoints with KEDA's scheduled scale-to-max rules.
- **Dapr sidecar is not optional after enablement**: Once Dapr is enabled on an app, it runs a sidecar container that consumes CPU and memory. The sidecar counts toward the per-replica resource limits. Account for sidecar overhead (typically 0.25 vCPU / 0.5 Gi) when sizing replicas.
- **Revision labels and traffic splitting**: After updating an image, a new revision is created. Without explicit traffic splitting, 100% of traffic routes to the latest revision. Use `az containerapp ingress traffic set` to implement canary or blue/green deployments.
- **Secrets vs environment variables**: Use Container App secrets for sensitive values (database passwords, API keys) and reference them in environment variables as `secretref:`. Plaintext environment variables are visible in the portal and deployment logs — never put secrets there.
- **Dapr state store ETag concurrency**: Dapr state operations support ETags for optimistic concurrency. Always use ETag-based updates for shared state to prevent data races in concurrent Dapr invocations.
