---
name: Azure Containers
description: >
  Deep expertise in Azure container services — build and push images with Azure Container Registry (ACR),
  deploy and scale microservices with Azure Container Apps (with Dapr sidecar and KEDA autoscaling),
  run one-off tasks with Azure Container Instances (ACI), configure CI/CD pipelines with GitHub Actions,
  and manage networking, secrets, and monitoring across all container workloads.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - azure container
  - container apps
  - container instances
  - aci
  - acr
  - container registry
  - docker azure
  - dapr
  - container deploy
  - microservices azure
  - keda
  - revision
---

# Azure Containers

## 1. Container Services Overview

Azure provides three primary services for running containers, each targeting different workloads:

**Decision matrix**:
| Criteria | Container Apps | Container Instances (ACI) | Kubernetes Service (AKS) |
|----------|---------------|--------------------------|--------------------------|
| **Use case** | Microservices, APIs, background workers | One-off tasks, batch jobs, sidecar testing | Full Kubernetes control plane |
| **Scaling** | KEDA-based autoscale (0 to N) | Manual (1 container group) | Cluster autoscaler + HPA |
| **Dapr** | Built-in sidecar | Not supported | Manual Dapr installation |
| **Networking** | Managed ingress + VNet integration | VNet injection, public IP | Full CNI control |
| **Pricing** | Per vCPU-second + memory-second | Per vCPU-second + memory-second | Node VM cost + management fee |
| **Startup time** | Seconds (warm) | Seconds (cold) | Minutes (node provisioning) |
| **Complexity** | Low (serverless-like) | Lowest | Highest |
| **State** | Stateless (use external stores) | Ephemeral or Azure Files | Persistent volumes (Azure Disk/Files) |

**When to use each service**:
- **Container Apps**: HTTP APIs, microservices with service discovery, event-driven workers, apps that need scale-to-zero, Dapr-based distributed apps.
- **ACI**: Quick one-off jobs, CI/CD build agents, burst workloads from AKS (virtual nodes), dev/test containers, GPU workloads.
- **AKS**: Full Kubernetes API needed, existing Helm charts, complex networking (service mesh, custom CNI), stateful workloads with persistent volumes, multi-cluster federation.

**Pricing models**:
- **Container Apps (Consumption)**: $0.000024/vCPU-second + $0.000003/GiB-second. Free grants: 180,000 vCPU-seconds, 360,000 GiB-seconds per subscription per month.
- **Container Apps (Dedicated)**: Workload profile pricing based on reserved node SKUs.
- **ACI**: $0.0000135/vCPU-second + $0.0000015/GB-second (Linux). Windows containers cost ~2x. GPU instances priced per GPU-second.

## 2. Azure Container Registry

Azure Container Registry (ACR) is a managed Docker registry for storing and managing container images and OCI artifacts.

**SKU comparison**:
| Feature | Basic | Standard | Premium |
|---------|-------|----------|---------|
| Storage | 10 GB | 100 GB | 500 GB |
| Webhooks | 2 | 10 | 500 |
| Geo-replication | No | No | Yes |
| Private link | No | No | Yes |
| Content trust | No | No | Yes |
| Customer-managed keys | No | No | Yes |
| Availability zones | No | No | Yes |
| Price (approx.) | $0.167/day | $0.667/day | $1.667/day |

**Create a registry**:
```bash
az acr create \
  --resource-group myResourceGroup \
  --name myregistry \
  --sku Standard \
  --admin-enabled false
```

**Authenticate and push**:
```bash
# Login with Azure CLI credentials (recommended)
az acr login --name myregistry

# Build and push locally
docker build -t myregistry.azurecr.io/myapp:1.0.0 .
docker push myregistry.azurecr.io/myapp:1.0.0
```

**ACR Build (cloud-based — no local Docker needed)**:
```bash
az acr build \
  --registry myregistry \
  --image myapp:1.0.0 \
  .
```

**ACR Tasks for automated builds**:
```bash
# Build on every git commit
az acr task create \
  --registry myregistry \
  --name auto-build \
  --image myapp:{{.Run.ID}} \
  --context https://github.com/org/repo.git \
  --file Dockerfile \
  --git-access-token $PAT

# Build on base image update
az acr task create \
  --registry myregistry \
  --name base-update \
  --image myapp:{{.Run.ID}} \
  --context https://github.com/org/repo.git \
  --file Dockerfile \
  --base-image-trigger-enabled
```

**Geo-replication (Premium SKU)**:
```bash
az acr replication create --registry myregistry --location westeurope
az acr replication create --registry myregistry --location southeastasia
```

**Private endpoints (Premium SKU)**:
```bash
az acr update --name myregistry --public-network-enabled false
az network private-endpoint create \
  --name myacr-pe \
  --resource-group myResourceGroup \
  --vnet-name myVNet \
  --subnet mySubnet \
  --private-connection-resource-id $(az acr show --name myregistry --query id -o tsv) \
  --group-ids registry \
  --connection-name myConnection
```

**Image management**:
```bash
# List repositories
az acr repository list --name myregistry --output table

# List tags
az acr repository show-tags --name myregistry --repository myapp --orderby time_desc

# Delete old images (keep latest 5)
az acr run --cmd "acr purge --filter 'myapp:.*' --ago 30d --keep 5 --untagged" --registry myregistry /dev/null

# Import from Docker Hub or another registry
az acr import --name myregistry --source docker.io/library/nginx:alpine --image nginx:alpine

# Check ACR health (validates DNS, login, and pull)
az acr check-health --name myregistry --yes

# Delete a repository from the registry
az acr repository delete --name myregistry --repository myapp --yes

# Show manifest metadata for a repository
az acr manifest list-metadata --registry myregistry --name myapp --output table
```

## 3. Azure Container Apps Environment

A Container Apps environment is the secure boundary around groups of container apps. All apps in an environment share the same virtual network, logging destination, and Dapr configuration.

**Create an environment**:
```bash
az containerapp env create \
  --name my-environment \
  --resource-group myResourceGroup \
  --location eastus
```

**VNet integration**:
```bash
# Create a VNet with a subnet for Container Apps
az network vnet create \
  --resource-group myResourceGroup \
  --name myVNet \
  --address-prefix 10.0.0.0/16 \
  --subnet-name container-apps-subnet \
  --subnet-prefix 10.0.0.0/23

# Create environment in VNet
az containerapp env create \
  --name my-environment \
  --resource-group myResourceGroup \
  --location eastus \
  --infrastructure-subnet-resource-id $(az network vnet subnet show \
    --resource-group myResourceGroup \
    --vnet-name myVNet \
    --name container-apps-subnet \
    --query id -o tsv)
```

The subnet must have a minimum size of `/23` (512 addresses) and must be delegated to `Microsoft.App/environments`.

**Environment management**:
```bash
# Show environment details
az containerapp env show --name my-environment --resource-group myResourceGroup

# List all environments in a resource group
az containerapp env list --resource-group myResourceGroup --output table

# Delete an environment
az containerapp env delete --name my-environment --resource-group myResourceGroup --yes
```

**Workload profiles**:
| Profile | Description | Use case |
|---------|-------------|----------|
| Consumption | Serverless, no reserved capacity | Variable workloads, scale-to-zero |
| Dedicated-D4 | 4 vCPU, 16 GB | Consistent workloads needing guaranteed resources |
| Dedicated-D8 | 8 vCPU, 32 GB | Memory-intensive apps |
| Dedicated-D16 | 16 vCPU, 64 GB | Compute-heavy workloads |
| Dedicated-D32 | 32 vCPU, 128 GB | Large-scale processing |
| GPU (NC) | GPU-enabled nodes | ML inference, AI workloads |

```bash
# Create environment with workload profiles
az containerapp env create \
  --name my-environment \
  --resource-group myResourceGroup \
  --location eastus \
  --enable-workload-profiles

# Add a dedicated profile
az containerapp env workload-profile add \
  --name my-environment \
  --resource-group myResourceGroup \
  --workload-profile-name "my-dedicated" \
  --workload-profile-type D4 \
  --min-nodes 1 \
  --max-nodes 3
```

**Log Analytics workspace**:

By default, an environment creates a Log Analytics workspace. To use an existing one:
```bash
az containerapp env create \
  --name my-environment \
  --resource-group myResourceGroup \
  --location eastus \
  --logs-workspace-id <workspace-id> \
  --logs-workspace-key <workspace-key>
```

## 4. Container App Configuration

A Container App defines the container image, resources, environment variables, secrets, ingress, scaling, and revision strategy.

**Bicep template** (full configuration):
```bicep
resource containerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: 'my-api'
  location: resourceGroup().location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: environment.id
    configuration: {
      activeRevisionsMode: 'Multiple'
      ingress: {
        external: true
        targetPort: 8080
        transport: 'auto'
        corsPolicy: {
          allowedOrigins: ['https://myapp.com']
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE']
          allowedHeaders: ['*']
          maxAge: 3600
        }
        traffic: [
          {
            revisionName: 'my-api--v1'
            weight: 80
          }
          {
            latestRevision: true
            weight: 20
          }
        ]
        stickySessions: {
          affinity: 'none'
        }
      }
      registries: [
        {
          server: 'myregistry.azurecr.io'
          identity: 'system'
        }
      ]
      secrets: [
        {
          name: 'db-connection'
          value: 'Server=tcp:mydb.database.windows.net;...'
        }
        {
          name: 'kv-secret'
          keyVaultUrl: 'https://myvault.vault.azure.net/secrets/my-secret'
          identity: 'system'
        }
      ]
    }
    template: {
      revisionSuffix: 'v2'
      containers: [
        {
          name: 'my-api'
          image: 'myregistry.azurecr.io/my-api:2.0.0'
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'DATABASE_URL'
              secretRef: 'db-connection'
            }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/healthz'
                port: 8080
              }
              initialDelaySeconds: 10
              periodSeconds: 30
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/ready'
                port: 8080
              }
              initialDelaySeconds: 5
              periodSeconds: 10
            }
            {
              type: 'Startup'
              httpGet: {
                path: '/healthz'
                port: 8080
              }
              initialDelaySeconds: 0
              periodSeconds: 5
              failureThreshold: 30
            }
          ]
        }
      ]
      scale: {
        minReplicas: 2
        maxReplicas: 20
        rules: [
          {
            name: 'http-scaling'
            http: {
              metadata: {
                concurrentRequests: '100'
              }
            }
          }
        ]
      }
    }
  }
}
```

**Container configuration**:
| Property | Description | Example |
|----------|-------------|---------|
| `image` | Full image URI with tag | `myacr.azurecr.io/app:1.0.0` |
| `resources.cpu` | CPU cores (0.25 to 4.0) | `0.5` |
| `resources.memory` | Memory (0.5Gi to 8Gi) | `1Gi` |
| `env` | Environment variables | `[{ name: 'KEY', value: 'val' }]` |
| `env` (secret ref) | Secret reference | `[{ name: 'KEY', secretRef: 'secret-name' }]` |
| `volumeMounts` | Volume mounts | `[{ volumeName: 'data', mountPath: '/data' }]` |
| `command` | Override entrypoint | `['/bin/sh', '-c', 'start.sh']` |
| `args` | Override CMD | `['--port', '8080']` |

**Valid CPU/memory combinations**:
| CPU (cores) | Memory (Gi) |
|-------------|-------------|
| 0.25 | 0.5 |
| 0.5 | 1.0 |
| 0.75 | 1.5 |
| 1.0 | 2.0 |
| 1.25 | 2.5 |
| 1.5 | 3.0 |
| 1.75 | 3.5 |
| 2.0 | 4.0 |
| 4.0 | 8.0 |

**Revision modes**:
- **Single**: Only one active revision at a time. Deploying a new revision immediately deactivates the old one. Good for simple apps.
- **Multiple**: Multiple revisions can be active simultaneously. Enables traffic splitting for blue-green and canary deployments.

**Scale rules**:
| Rule type | Trigger | Key metadata |
|-----------|---------|--------------|
| HTTP | Concurrent requests | `concurrentRequests` |
| Azure Queue | Queue length | `queueName`, `queueLength`, `accountName` |
| Azure Service Bus | Message count | `queueName`, `messageCount`, `namespace` |
| Azure Event Hubs | Unprocessed events | `consumerGroup`, `unprocessedEventThreshold` |
| Kafka | Consumer lag | `bootstrapServers`, `consumerGroup`, `topic`, `lagThreshold` |
| Cron | Schedule | `timezone`, `start`, `end`, `desiredReplicas` |
| Custom | Any KEDA scaler | Scaler-specific metadata |

## 5. Dapr Integration

Container Apps has built-in Dapr (Distributed Application Runtime) support. Dapr runs as a sidecar alongside your container and provides building blocks for microservices.

**Enable Dapr on a Container App**:
```bash
az containerapp dapr enable \
  --name my-api \
  --resource-group myResourceGroup \
  --dapr-app-id my-api \
  --dapr-app-port 8080 \
  --dapr-app-protocol http
```

**Dapr building blocks supported in Container Apps**:
| Building block | Description | Invocation |
|----------------|-------------|------------|
| Service invocation | Call other Dapr services by app ID | `http://localhost:3500/v1.0/invoke/{app-id}/method/{method}` |
| State management | Key/value store | `http://localhost:3500/v1.0/state/{store-name}` |
| Pub/sub | Publish and subscribe to topics | `http://localhost:3500/v1.0/publish/{pubsub-name}/{topic}` |
| Bindings (input) | Trigger from external systems | Auto-invoked on `/binding-name` endpoint |
| Bindings (output) | Write to external systems | `http://localhost:3500/v1.0/bindings/{binding-name}` |
| Secrets | Retrieve secrets from stores | `http://localhost:3500/v1.0/secrets/{store-name}/{secret-name}` |
| Configuration | Dynamic configuration | `http://localhost:3500/v1.0/configuration/{store-name}` |

**Dapr component YAML** (state store example):
```yaml
componentType: state.azure.blobstorage
version: v1
metadata:
  - name: accountName
    value: mystorageaccount
  - name: accountKey
    secretRef: storage-account-key
  - name: containerName
    value: state
secrets:
  - name: storage-account-key
    value: "<key>"
scopes:
  - my-api
  - my-worker
```

Register the component:
```bash
az containerapp env dapr-component set \
  --name my-environment \
  --resource-group myResourceGroup \
  --dapr-component-name statestore \
  --yaml statestore.yaml
```

**Manage Dapr components**:
```bash
# List all Dapr components in an environment
az containerapp env dapr-component list --name my-environment --resource-group myResourceGroup --output table

# Show details of a specific Dapr component
az containerapp env dapr-component show --name my-environment --resource-group myResourceGroup --dapr-component-name statestore

# Remove a Dapr component
az containerapp env dapr-component remove --name my-environment --resource-group myResourceGroup --dapr-component-name statestore
```

**Disable Dapr on a Container App**:
```bash
az containerapp dapr disable --name my-api --resource-group myResourceGroup
```

**Dapr pub/sub component** (Azure Service Bus):
```yaml
componentType: pubsub.azure.servicebus.topics
version: v1
metadata:
  - name: connectionString
    secretRef: sb-connection
  - name: consumerID
    value: my-consumer-group
secrets:
  - name: sb-connection
    value: "Endpoint=sb://..."
scopes:
  - publisher-app
  - subscriber-app
```

**Service invocation pattern**:
```typescript
// Call another service via Dapr sidecar
const response = await fetch(
  'http://localhost:3500/v1.0/invoke/order-service/method/orders',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId: 123, quantity: 2 })
  }
);
```

**Pub/sub subscriber**:
```typescript
// Express endpoint for Dapr subscription
app.get('/dapr/subscribe', (req, res) => {
  res.json([
    {
      pubsubname: 'order-pubsub',
      topic: 'orders',
      route: '/orders'
    }
  ]);
});

app.post('/orders', (req, res) => {
  const order = req.body.data;
  console.log('Received order:', order);
  res.sendStatus(200);
});
```

**State management**:
```typescript
// Save state
await fetch('http://localhost:3500/v1.0/state/statestore', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify([{
    key: 'order-123',
    value: { status: 'processing', items: ['A', 'B'] }
  }])
});

// Get state
const state = await fetch('http://localhost:3500/v1.0/state/statestore/order-123');
const order = await state.json();
```

## 6. Container App Jobs

Container App Jobs run containers to completion for batch processing, scheduled tasks, or event-driven compute.

**Job trigger types**:
| Trigger | Description | Use case |
|---------|-------------|----------|
| Manual | Start on demand via API or CLI | Ad-hoc tasks, testing |
| Scheduled | CRON expression | Nightly reports, periodic cleanup |
| Event-driven | KEDA scaler | Process queue messages, respond to events |

**Create a manual job**:
```bash
az containerapp job create \
  --name my-batch-job \
  --resource-group myResourceGroup \
  --environment my-environment \
  --trigger-type Manual \
  --replica-timeout 1800 \
  --replica-retry-limit 3 \
  --replica-completion-count 1 \
  --parallelism 1 \
  --image myregistry.azurecr.io/batch:1.0 \
  --cpu 1.0 \
  --memory 2.0Gi \
  --registry-server myregistry.azurecr.io \
  --registry-identity system
```

Start a manual execution:
```bash
az containerapp job start \
  --name my-batch-job \
  --resource-group myResourceGroup
```

**Create a scheduled job (CRON)**:
```bash
az containerapp job create \
  --name nightly-report \
  --resource-group myResourceGroup \
  --environment my-environment \
  --trigger-type Schedule \
  --cron-expression "0 2 * * *" \
  --replica-timeout 3600 \
  --replica-retry-limit 2 \
  --replica-completion-count 1 \
  --parallelism 1 \
  --image myregistry.azurecr.io/report-gen:1.0 \
  --cpu 0.5 \
  --memory 1.0Gi
```

CRON expressions follow standard 5-field format: `minute hour day-of-month month day-of-week`.

**Create an event-driven job**:
```bash
az containerapp job create \
  --name queue-processor \
  --resource-group myResourceGroup \
  --environment my-environment \
  --trigger-type Event \
  --replica-timeout 600 \
  --replica-retry-limit 3 \
  --replica-completion-count 1 \
  --parallelism 5 \
  --min-executions 0 \
  --max-executions 10 \
  --polling-interval 30 \
  --scale-rule-name queue-trigger \
  --scale-rule-type azure-queue \
  --scale-rule-metadata "queueName=tasks" "queueLength=1" "accountName=mystorage" \
  --scale-rule-auth "connection=queue-conn" \
  --image myregistry.azurecr.io/worker:1.0 \
  --secrets "queue-conn=<connection-string>" \
  --cpu 0.5 \
  --memory 1.0Gi
```

**Job execution configuration**:
| Property | Description |
|----------|-------------|
| `replicaTimeout` | Max seconds a job execution can run (max 86400 = 24h) |
| `replicaRetryLimit` | Number of retries on failure |
| `replicaCompletionCount` | Number of replicas that must complete successfully |
| `parallelism` | Number of replicas that can run concurrently |

**Job management**:
```bash
# Show job details
az containerapp job show --name my-batch-job --resource-group myResourceGroup

# List all jobs in a resource group
az containerapp job list --resource-group myResourceGroup --output table

# Delete a job
az containerapp job delete --name my-batch-job --resource-group myResourceGroup --yes

# Stop a running job execution
az containerapp job stop --name my-batch-job --resource-group myResourceGroup --job-execution-name <execution-name>
```

**Monitor job executions**:
```bash
# List executions
az containerapp job execution list \
  --name my-batch-job \
  --resource-group myResourceGroup \
  --output table

# Show execution details
az containerapp job execution show \
  --name my-batch-job \
  --resource-group myResourceGroup \
  --job-execution-name <execution-name>
```

## 7. Azure Container Instances

ACI provides the fastest and simplest way to run a container in Azure — no VMs to manage, no orchestrator to configure.

**Single container deployment**:
```bash
az container create \
  --resource-group myResourceGroup \
  --name my-container \
  --image myregistry.azurecr.io/app:1.0 \
  --cpu 1 \
  --memory 1.5 \
  --ports 80 443 \
  --dns-name-label my-unique-dns \
  --restart-policy Always
```

**Container group with YAML**:
```yaml
apiVersion: '2021-09-01'
location: eastus
name: my-container-group
properties:
  containers:
    - name: web-app
      properties:
        image: myregistry.azurecr.io/web:1.0
        resources:
          requests:
            cpu: 1.0
            memoryInGb: 1.5
          limits:
            cpu: 2.0
            memoryInGb: 3.0
        ports:
          - port: 80
          - port: 443
        environmentVariables:
          - name: NODE_ENV
            value: production
          - name: DB_PASSWORD
            secureValue: '<password>'
        volumeMounts:
          - name: data-volume
            mountPath: /app/data
        livenessProbe:
          httpGet:
            path: /healthz
            port: 80
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /ready
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 10
    - name: log-sidecar
      properties:
        image: myregistry.azurecr.io/log-shipper:1.0
        resources:
          requests:
            cpu: 0.25
            memoryInGb: 0.5
        volumeMounts:
          - name: data-volume
            mountPath: /logs
  volumes:
    - name: data-volume
      azureFile:
        shareName: myshare
        storageAccountName: mystorageaccount
        storageAccountKey: '<key>'
  osType: Linux
  restartPolicy: Always
  ipAddress:
    type: Public
    dnsNameLabel: my-unique-dns
    ports:
      - protocol: tcp
        port: 80
      - protocol: tcp
        port: 443
  imageRegistryCredentials:
    - server: myregistry.azurecr.io
      identity: /subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.ManagedIdentity/userAssignedIdentities/<id>
type: Microsoft.ContainerInstance/containerGroups
```

Deploy with:
```bash
az container create --resource-group myResourceGroup --file container-group.yaml
```

**Volume mount types**:
| Volume type | Description | Persistence |
|-------------|-------------|-------------|
| `azureFile` | Azure Files SMB share | Persistent across restarts |
| `emptyDir` | Temporary disk storage | Lost on container restart |
| `gitRepo` | Clone a git repo at startup | Populated at creation time |
| `secret` | Mount secrets as files | In-memory tmpfs |

**Restart policies**:
| Policy | Behavior | Use case |
|--------|----------|----------|
| `Always` | Restart on any termination | Long-running services |
| `OnFailure` | Restart on non-zero exit | Batch jobs with retry |
| `Never` | Do not restart | One-shot tasks |

**GPU support**:
```bash
az container create \
  --resource-group myResourceGroup \
  --name gpu-container \
  --image myregistry.azurecr.io/ml-inference:1.0 \
  --gpu-count 1 \
  --gpu-sku V100 \
  --cpu 4 \
  --memory 16 \
  --restart-policy Never
```

Available GPU SKUs: `K80` (6 GB), `P100` (16 GB), `V100` (16 GB). GPU availability is region-specific.

**VNet deployment**:
```bash
az container create \
  --resource-group myResourceGroup \
  --name private-container \
  --image myregistry.azurecr.io/internal-app:1.0 \
  --vnet myVNet \
  --subnet aci-subnet \
  --restart-policy Always
```

## 8. Networking

**Container Apps ingress**:
```bash
# External ingress (internet-facing)
az containerapp ingress enable \
  --name my-api \
  --resource-group myResourceGroup \
  --type external \
  --target-port 8080 \
  --transport auto

# Internal ingress (VNet only)
az containerapp ingress enable \
  --name my-internal-api \
  --resource-group myResourceGroup \
  --type internal \
  --target-port 8080
```

**Ingress management**:
```bash
# Show current ingress configuration
az containerapp ingress show --name my-api --resource-group myResourceGroup

# Disable ingress (for background workers)
az containerapp ingress disable --name my-api --resource-group myResourceGroup
```

**CORS management** (CLI):
```bash
# Enable CORS on a Container App
az containerapp ingress cors enable \
  --name my-api \
  --resource-group myResourceGroup \
  --allowed-origins "https://contoso.com" \
  --allowed-methods GET POST \
  --allow-credentials true

# Show current CORS configuration
az containerapp ingress cors show --name my-api --resource-group myResourceGroup
```

**IP access restrictions**:
```bash
# Set an IP access restriction rule
az containerapp ingress access-restriction set \
  --name my-api \
  --resource-group myResourceGroup \
  --rule-name "AllowOffice" \
  --ip-address 203.0.113.0/24 \
  --action Allow

# List all access restriction rules
az containerapp ingress access-restriction list --name my-api --resource-group myResourceGroup

# Remove an access restriction rule
az containerapp ingress access-restriction remove --name my-api --resource-group myResourceGroup --rule-name "AllowOffice"
```

Transport options:
| Transport | Description |
|-----------|-------------|
| `auto` | Auto-detect HTTP/1.1 or HTTP/2 |
| `http` | Force HTTP/1.1 |
| `http2` | Force HTTP/2 (required for gRPC) |
| `tcp` | Raw TCP (for non-HTTP workloads) |

**Custom domains and TLS**:
```bash
# Add a custom domain with managed certificate
az containerapp hostname add \
  --name my-api \
  --resource-group myResourceGroup \
  --hostname api.contoso.com

# Bind a managed certificate (auto-provisioned)
az containerapp hostname bind \
  --name my-api \
  --resource-group myResourceGroup \
  --hostname api.contoso.com \
  --environment my-environment \
  --validation-method CNAME

# Or bind your own certificate
az containerapp ssl upload \
  --name my-api \
  --resource-group myResourceGroup \
  --hostname api.contoso.com \
  --certificate-file ./cert.pfx \
  --certificate-password <password>
```

**CORS configuration** (via Bicep or YAML):
```bicep
ingress: {
  external: true
  targetPort: 8080
  corsPolicy: {
    allowedOrigins: ['https://myapp.com', 'https://staging.myapp.com']
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    allowedHeaders: ['Authorization', 'Content-Type']
    exposeHeaders: ['X-Custom-Header']
    maxAge: 3600
    allowCredentials: true
  }
}
```

**VNet integration**:

Container Apps environments can be deployed into a VNet for network isolation:
- Apps can reach VNet resources (databases, VMs, private endpoints).
- Internal-only apps have no public IP.
- Outbound traffic can be routed through a firewall or NAT gateway.
- DNS resolution within the VNet uses Azure DNS or custom DNS.

**Session affinity**:
```bash
az containerapp ingress sticky-sessions set \
  --name my-api \
  --resource-group myResourceGroup \
  --affinity sticky
```

Use sticky sessions only when the app stores in-memory session state. Prefer stateless design with external session stores (Redis, Cosmos DB).

## 9. CI/CD & Deployment

**GitHub Actions workflow** (ACR build + Container App deploy):
```yaml
name: Build and Deploy
on:
  push:
    branches: [main]

env:
  ACR_NAME: myregistry
  CONTAINER_APP_NAME: my-api
  RESOURCE_GROUP: myResourceGroup
  IMAGE_NAME: my-api

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Azure Login (OIDC)
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Build and push to ACR
        run: |
          az acr build \
            --registry ${{ env.ACR_NAME }} \
            --image ${{ env.IMAGE_NAME }}:${{ github.sha }} \
            --image ${{ env.IMAGE_NAME }}:latest \
            .

      - name: Deploy to Container App
        run: |
          az containerapp update \
            --name ${{ env.CONTAINER_APP_NAME }} \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --image ${{ env.ACR_NAME }}.azurecr.io/${{ env.IMAGE_NAME }}:${{ github.sha }}
```

**Blue-green deployment via CLI**:
```bash
# 1. Ensure multiple revision mode
az containerapp revision set-mode \
  --name my-api \
  --resource-group myResourceGroup \
  --mode multiple

# 2. Deploy new revision with suffix
az containerapp update \
  --name my-api \
  --resource-group myResourceGroup \
  --image myregistry.azurecr.io/my-api:2.0.0 \
  --revision-suffix v2

# 3. Test the new revision (direct URL)
# https://my-api--v2.<env-domain>

# 4. Shift traffic gradually
az containerapp ingress traffic set \
  --name my-api \
  --resource-group myResourceGroup \
  --revision-weight my-api--v2=20 my-api--v1=80

# 5. Full cutover
az containerapp ingress traffic set \
  --name my-api \
  --resource-group myResourceGroup \
  --revision-weight my-api--v2=100

# 6. Deactivate old revision
az containerapp revision deactivate \
  --revision my-api--v1 \
  --resource-group myResourceGroup
```

**Revision labels**:
```bash
# Add a label to a revision (for traffic routing by label)
az containerapp revision label add \
  --name my-api \
  --resource-group myResourceGroup \
  --label stable \
  --revision my-api--v1

# Remove a label from a revision
az containerapp revision label remove \
  --name my-api \
  --resource-group myResourceGroup \
  --label canary
```

**Revision management**:
```bash
# List all revisions
az containerapp revision list \
  --name my-api \
  --resource-group myResourceGroup \
  --output table

# Show revision details
az containerapp revision show \
  --name my-api \
  --resource-group myResourceGroup \
  --revision my-api--v2

# Activate a deactivated revision (for rollback)
az containerapp revision activate \
  --revision my-api--v1 \
  --resource-group myResourceGroup

# Restart a revision
az containerapp revision restart \
  --name my-api \
  --resource-group myResourceGroup \
  --revision my-api--v2
```

## 10. Managed Identity & Secrets

**System-assigned managed identity**:
```bash
# Enable system-assigned identity
az containerapp identity assign \
  --name my-api \
  --resource-group myResourceGroup \
  --system-assigned

# Grant ACR pull permission
az role assignment create \
  --assignee $(az containerapp identity show --name my-api --resource-group myResourceGroup --query principalId -o tsv) \
  --role AcrPull \
  --scope $(az acr show --name myregistry --query id -o tsv)
```

**User-assigned managed identity**:
```bash
# Create identity
az identity create \
  --name my-container-identity \
  --resource-group myResourceGroup

# Assign to Container App
az containerapp identity assign \
  --name my-api \
  --resource-group myResourceGroup \
  --user-assigned $(az identity show --name my-container-identity --resource-group myResourceGroup --query id -o tsv)
```

**Remove managed identity**:
```bash
# Remove system-assigned identity
az containerapp identity remove --name my-api --resource-group myResourceGroup --system-assigned

# Remove user-assigned identity
az containerapp identity remove --name my-api --resource-group myResourceGroup --user-assigned <identity-resource-id>
```

**Secrets management**:
```bash
# Set secrets directly
az containerapp secret set \
  --name my-api \
  --resource-group myResourceGroup \
  --secrets "db-conn=Server=tcp:mydb..." "api-key=abc123"

# Reference in environment variables
az containerapp update \
  --name my-api \
  --resource-group myResourceGroup \
  --set-env-vars "DATABASE_URL=secretref:db-conn"
```

**Key Vault secret references** (Bicep):
```bicep
secrets: [
  {
    name: 'db-connection'
    keyVaultUrl: 'https://myvault.vault.azure.net/secrets/db-connection-string'
    identity: 'system'
  }
]
```

The managed identity must have `Key Vault Secrets User` role on the Key Vault:
```bash
az role assignment create \
  --assignee <principal-id> \
  --role "Key Vault Secrets User" \
  --scope $(az keyvault show --name myvault --query id -o tsv)
```

**ACR pull with managed identity**:
```bicep
configuration: {
  registries: [
    {
      server: 'myregistry.azurecr.io'
      identity: 'system'  // or user-assigned identity resource ID
    }
  ]
}
```

## 11. Monitoring

**Log Analytics queries** (KQL):
```kusto
// Container App console logs (last hour)
ContainerAppConsoleLogs_CL
| where ContainerAppName_s == "my-api"
| where TimeGenerated > ago(1h)
| project TimeGenerated, Log_s, RevisionName_s
| order by TimeGenerated desc

// Error logs
ContainerAppConsoleLogs_CL
| where ContainerAppName_s == "my-api"
| where Log_s contains "error" or Log_s contains "Error"
| project TimeGenerated, Log_s
| order by TimeGenerated desc

// Request count by status code
ContainerAppSystemLogs_CL
| where ContainerAppName_s == "my-api"
| where TimeGenerated > ago(24h)
| summarize count() by ResponseCode_d, bin(TimeGenerated, 1h)
| render timechart

// Replica scaling events
ContainerAppSystemLogs_CL
| where Type_s == "Microsoft.App/containerApps/revisions/replicas"
| where Reason_s == "ScalingUp" or Reason_s == "ScalingDown"
| project TimeGenerated, ContainerAppName_s, Reason_s, Log_s
| order by TimeGenerated desc
```

**Container console logs** (CLI):
```bash
# Stream live logs
az containerapp logs show \
  --name my-api \
  --resource-group myResourceGroup \
  --follow

# System logs (scaling, deployment events)
az containerapp logs show \
  --name my-api \
  --resource-group myResourceGroup \
  --type system

# Logs for a specific revision
az containerapp logs show \
  --name my-api \
  --resource-group myResourceGroup \
  --revision my-api--v2
```

**Health probes** (Bicep):
```bicep
probes: [
  {
    type: 'Liveness'
    httpGet: {
      path: '/healthz'
      port: 8080
    }
    initialDelaySeconds: 10
    periodSeconds: 30
    failureThreshold: 3
    successThreshold: 1
    timeoutSeconds: 5
  }
  {
    type: 'Readiness'
    httpGet: {
      path: '/ready'
      port: 8080
    }
    initialDelaySeconds: 5
    periodSeconds: 10
    failureThreshold: 3
    successThreshold: 1
    timeoutSeconds: 3
  }
  {
    type: 'Startup'
    httpGet: {
      path: '/healthz'
      port: 8080
    }
    initialDelaySeconds: 0
    periodSeconds: 5
    failureThreshold: 30
    successThreshold: 1
    timeoutSeconds: 3
  }
]
```

Probe types:
| Probe | Purpose | What happens on failure |
|-------|---------|------------------------|
| **Startup** | Wait for app to start | Container is restarted after `failureThreshold` |
| **Liveness** | Detect deadlocks/hangs | Container is restarted |
| **Readiness** | Check if ready for traffic | Removed from load balancer (not restarted) |

Probe methods:
| Method | Description |
|--------|-------------|
| `httpGet` | HTTP GET request (success = 200-399 response) |
| `tcpSocket` | TCP connection (success = port open) |

**Diagnostic settings and alerts** (CLI):
```bash
# Create diagnostic settings to send logs to a Log Analytics workspace
az monitor diagnostic-settings create \
  --resource <containerapp-resource-id> \
  --name "ca-diag" \
  --workspace <workspace-id> \
  --logs '[{"categoryGroup":"allLogs","enabled":true}]'

# Create a metric alert for high CPU usage
az monitor metrics alert create \
  --resource-group myResourceGroup \
  --name "container-cpu-alert" \
  --scopes <containerapp-resource-id> \
  --condition "avg CpuPercentage > 80" \
  --window-size PT5M \
  --evaluation-frequency PT1M \
  --severity 2 \
  --action <action-group-id>
```

**Metrics** (Azure Monitor):

Key metrics for Container Apps:
| Metric | Description |
|--------|-------------|
| `Requests` | Total HTTP requests per revision |
| `ReplicaCount` | Current number of active replicas |
| `CpuUsage` | CPU usage percentage per replica |
| `MemoryUsage` | Memory usage in bytes per replica |
| `RestartCount` | Number of container restarts |
| `NetworkIn` / `NetworkOut` | Network bytes in/out |

## 12. Common Patterns

### Pattern 1: Web API with Auto-Scaling

A REST API that scales based on HTTP traffic, with managed identity for ACR and Key Vault.

```bicep
param location string = resourceGroup().location
param acrName string
param environmentId string

resource api 'Microsoft.App/containerApps@2023-05-01' = {
  name: 'product-api'
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: environmentId
    configuration: {
      activeRevisionsMode: 'Multiple'
      ingress: {
        external: true
        targetPort: 3000
        transport: 'auto'
        corsPolicy: {
          allowedOrigins: ['https://myapp.com']
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE']
        }
      }
      registries: [
        { server: '${acrName}.azurecr.io', identity: 'system' }
      ]
      secrets: [
        {
          name: 'db-url'
          keyVaultUrl: 'https://myvault.vault.azure.net/secrets/db-url'
          identity: 'system'
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'product-api'
          image: '${acrName}.azurecr.io/product-api:latest'
          resources: { cpu: json('0.5'), memory: '1Gi' }
          env: [
            { name: 'DATABASE_URL', secretRef: 'db-url' }
            { name: 'NODE_ENV', value: 'production' }
          ]
          probes: [
            {
              type: 'Readiness'
              httpGet: { path: '/health', port: 3000 }
              periodSeconds: 10
            }
            {
              type: 'Liveness'
              httpGet: { path: '/health', port: 3000 }
              periodSeconds: 30
            }
          ]
        }
      ]
      scale: {
        minReplicas: 2
        maxReplicas: 20
        rules: [
          {
            name: 'http-scaling'
            http: { metadata: { concurrentRequests: '50' } }
          }
        ]
      }
    }
  }
}
```

### Pattern 2: Background Worker with Queue Trigger

A worker that processes messages from Azure Storage Queue, scaling to zero when idle.

```bicep
resource worker 'Microsoft.App/containerApps@2023-05-01' = {
  name: 'order-processor'
  location: location
  identity: { type: 'SystemAssigned' }
  properties: {
    managedEnvironmentId: environmentId
    configuration: {
      activeRevisionsMode: 'Single'
      secrets: [
        { name: 'queue-conn', value: storageConnectionString }
      ]
    }
    template: {
      containers: [
        {
          name: 'order-processor'
          image: '${acrName}.azurecr.io/order-processor:latest'
          resources: { cpu: json('0.25'), memory: '0.5Gi' }
          env: [
            { name: 'QUEUE_CONNECTION', secretRef: 'queue-conn' }
            { name: 'QUEUE_NAME', value: 'orders' }
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 10
        rules: [
          {
            name: 'queue-scaling'
            azureQueue: {
              queueName: 'orders'
              queueLength: 20
              auth: [
                { secretRef: 'queue-conn', triggerParameter: 'connection' }
              ]
            }
          }
        ]
      }
    }
  }
}
```

### Pattern 3: Multi-Container Microservices with Dapr

Three microservices communicating via Dapr service invocation and pub/sub.

```bash
# Create Container Apps environment with Dapr
az containerapp env create \
  --name microservices-env \
  --resource-group myResourceGroup \
  --location eastus

# Register Dapr pub/sub component (Service Bus)
cat <<'YAML' > pubsub.yaml
componentType: pubsub.azure.servicebus.topics
version: v1
metadata:
  - name: connectionString
    secretRef: sb-conn
secrets:
  - name: sb-conn
    value: "Endpoint=sb://mybus.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=..."
scopes:
  - api-gateway
  - order-service
  - notification-service
YAML

az containerapp env dapr-component set \
  --name microservices-env \
  --resource-group myResourceGroup \
  --dapr-component-name pubsub \
  --yaml pubsub.yaml

# Deploy API Gateway (external ingress, publishes events)
az containerapp create \
  --name api-gateway \
  --resource-group myResourceGroup \
  --environment microservices-env \
  --image myregistry.azurecr.io/api-gateway:1.0 \
  --target-port 3000 \
  --ingress external \
  --min-replicas 2 \
  --max-replicas 10 \
  --registry-server myregistry.azurecr.io \
  --registry-identity system \
  --dapr-app-id api-gateway \
  --dapr-app-port 3000 \
  --enable-dapr

# Deploy Order Service (internal, subscribes to events)
az containerapp create \
  --name order-service \
  --resource-group myResourceGroup \
  --environment microservices-env \
  --image myregistry.azurecr.io/order-service:1.0 \
  --target-port 3001 \
  --ingress internal \
  --min-replicas 1 \
  --max-replicas 5 \
  --registry-server myregistry.azurecr.io \
  --registry-identity system \
  --dapr-app-id order-service \
  --dapr-app-port 3001 \
  --enable-dapr

# Deploy Notification Service (internal, subscribes to events)
az containerapp create \
  --name notification-service \
  --resource-group myResourceGroup \
  --environment microservices-env \
  --image myregistry.azurecr.io/notification-service:1.0 \
  --target-port 3002 \
  --ingress internal \
  --min-replicas 0 \
  --max-replicas 5 \
  --registry-server myregistry.azurecr.io \
  --registry-identity system \
  --dapr-app-id notification-service \
  --dapr-app-port 3002 \
  --enable-dapr
```

### Pattern 4: Scheduled Batch Job with ACI

A daily data export job that runs in ACI, reads from a database, writes to Azure Blob Storage, and cleans up after itself.

```yaml
# batch-job.yaml — ACI container group for daily export
apiVersion: '2021-09-01'
location: eastus
name: daily-export
properties:
  containers:
    - name: exporter
      properties:
        image: myregistry.azurecr.io/data-exporter:1.0
        resources:
          requests:
            cpu: 2.0
            memoryInGb: 4.0
        environmentVariables:
          - name: DB_HOST
            value: mydb.database.windows.net
          - name: DB_PASSWORD
            secureValue: '<password>'
          - name: STORAGE_ACCOUNT
            value: myexportstorage
          - name: STORAGE_CONTAINER
            value: exports
          - name: STORAGE_KEY
            secureValue: '<storage-key>'
          - name: EXPORT_DATE
            value: '2024-01-15'
        volumeMounts:
          - name: temp-storage
            mountPath: /tmp/export
  volumes:
    - name: temp-storage
      emptyDir: {}
  osType: Linux
  restartPolicy: Never
  imageRegistryCredentials:
    - server: myregistry.azurecr.io
      identity: /subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.ManagedIdentity/userAssignedIdentities/batch-identity
type: Microsoft.ContainerInstance/containerGroups
```

Deploy and monitor:
```bash
# Deploy the batch job
az container create --resource-group myResourceGroup --file batch-job.yaml

# Wait for completion and stream logs
az container attach --resource-group myResourceGroup --name daily-export

# Check exit code
az container show \
  --resource-group myResourceGroup \
  --name daily-export \
  --query "containers[0].instanceView.currentState" \
  --output json

# Clean up after successful run
az container delete --resource-group myResourceGroup --name daily-export --yes
```

For scheduling, use Azure Logic Apps or a Container App Job with a CRON trigger:
```bash
az containerapp job create \
  --name daily-export-job \
  --resource-group myResourceGroup \
  --environment my-environment \
  --trigger-type Schedule \
  --cron-expression "0 1 * * *" \
  --image myregistry.azurecr.io/data-exporter:1.0 \
  --cpu 2.0 \
  --memory 4.0Gi \
  --replica-timeout 7200 \
  --replica-retry-limit 2 \
  --env-vars "DB_HOST=mydb.database.windows.net" \
  --secrets "db-pass=<password>" "storage-key=<key>" \
  --registry-server myregistry.azurecr.io \
  --registry-identity system
```

## Progressive Disclosure — Reference Files

| Topic | File |
|---|---|
| Azure Container Registry, ACR Tasks, geo-replication, image signing | [`references/container-registry.md`](./references/container-registry.md) |
| Container Apps, Dapr service invocation, pub/sub, state management | [`references/container-apps-dapr.md`](./references/container-apps-dapr.md) |
| Container Instances, multi-container groups, batch job patterns | [`references/container-instances.md`](./references/container-instances.md) |
| Container Apps networking, ingress, custom domains, VNet integration | [`references/networking-ingress.md`](./references/networking-ingress.md) |
| CI/CD pipelines, GitHub Actions, blue/green deployments, rollback | [`references/cicd-deployment.md`](./references/cicd-deployment.md) |
