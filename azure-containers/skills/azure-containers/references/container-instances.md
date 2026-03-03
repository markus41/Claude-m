# Azure Container Instances (ACI) — Deep Reference

## Overview

Azure Container Instances (ACI) is a serverless container service for running containers on-demand without managing infrastructure. It is ideal for short-lived batch jobs, CI/CD task runners, data processing pipelines, sidecar testing, and burst computing. ACI supports single containers and multi-container groups (sidecar and init container patterns). It does not support autoscaling — use Container Apps or AKS for horizontally-scaled workloads.

## REST API Endpoints

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|---|---|---|---|---|
| PUT | `/providers/Microsoft.ContainerInstance/containerGroups/{group}` | Contributor | Containers array, OS type, IP type | Create container group |
| GET | Same path | Reader | — | Get status, IP, events |
| DELETE | Same path | Contributor | — | Delete and stop group |
| POST | `/containerGroups/{group}/start` | Contributor | — | Start a stopped group |
| POST | `/containerGroups/{group}/stop` | Contributor | — | Stop without deleting |
| POST | `/containerGroups/{group}/restart` | Contributor | — | Restart the group |
| GET | `/containerGroups/{group}/containers/{container}/logs` | Contributor | `tail` | Fetch stdout/stderr logs |
| POST | `/containerGroups/{group}/containers/{container}/exec` | Contributor | `command`, `terminalSize` | Execute command in container |
| GET | `/containerGroups` | Reader | — | List all groups in resource group |

Base: `https://management.azure.com/subscriptions/{sub}/resourceGroups/{rg}`

## Azure CLI Patterns

```bash
# Simple container group (public IP)
az container create \
  --resource-group rg-containers \
  --name cg-data-processor \
  --image acrprodeastus.azurecr.io/data-processor:1.0.0 \
  --registry-login-server acrprodeastus.azurecr.io \
  --acr-identity \
    "/subscriptions/<sub>/resourceGroups/rg-prod/providers/Microsoft.ManagedIdentity/userAssignedIdentities/id-aci" \
  --assign-identity \
    "/subscriptions/<sub>/resourceGroups/rg-prod/providers/Microsoft.ManagedIdentity/userAssignedIdentities/id-aci" \
  --cpu 2 \
  --memory 4 \
  --os-type Linux \
  --restart-policy Never \
  --environment-variables \
    STORAGE_ACCOUNT=mystorageaccount \
    OUTPUT_CONTAINER=processed-output \
  --secure-environment-variables \
    CONNECTION_STRING="$DB_CONNECTION_STRING"

# VNet-integrated container group (private IP only)
az container create \
  --resource-group rg-containers \
  --name cg-internal-job \
  --image acrprodeastus.azurecr.io/internal-processor:latest \
  --acr-identity \
    "/subscriptions/<sub>/resourceGroups/rg-prod/providers/Microsoft.ManagedIdentity/userAssignedIdentities/id-aci" \
  --assign-identity \
    "/subscriptions/<sub>/resourceGroups/rg-prod/providers/Microsoft.ManagedIdentity/userAssignedIdentities/id-aci" \
  --vnet vnet-prod-eastus \
  --subnet subnet-aci \
  --resource-group rg-networking \
  --cpu 1 \
  --memory 2 \
  --restart-policy Never \
  --os-type Linux

# Multi-container group via YAML file
az container create \
  --resource-group rg-containers \
  --name cg-sidecar-test \
  --file container-group.yaml
```

## Multi-Container Group YAML

```yaml
# container-group.yaml
apiVersion: 2021-10-01
name: cg-web-with-sidecar
type: Microsoft.ContainerInstance/containerGroups
location: eastus
properties:
  sku: Standard
  osType: Linux
  restartPolicy: OnFailure
  ipAddress:
    type: Public
    ports:
      - protocol: TCP
        port: 8080
  imageRegistryCredentials:
    - server: acrprodeastus.azurecr.io
      identity: /subscriptions/<sub>/resourceGroups/rg-prod/providers/Microsoft.ManagedIdentity/userAssignedIdentities/id-aci
  initContainers:
    - name: init-db-migration
      properties:
        image: acrprodeastus.azurecr.io/db-migrator:1.0.0
        command: ["dotnet", "migrate.dll"]
        environmentVariables:
          - name: DB_CONNECTION
            secureValue: "Server=sql-prod.database.windows.net;..."
  containers:
    - name: web-app
      properties:
        image: acrprodeastus.azurecr.io/web-app:2.0.0
        ports:
          - port: 8080
            protocol: TCP
        resources:
          requests:
            cpu: 1
            memoryInGB: 2
        environmentVariables:
          - name: PORT
            value: "8080"
          - name: NODE_ENV
            value: production
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
            scheme: HTTP
          initialDelaySeconds: 30
          periodSeconds: 10
          failureThreshold: 3
    - name: log-forwarder
      properties:
        image: fluent/fluent-bit:latest
        resources:
          requests:
            cpu: 0.25
            memoryInGB: 0.25
        volumeMounts:
          - name: logs
            mountPath: /var/log/app
        environmentVariables:
          - name: FLUENT_ELASTICSEARCH_HOST
            value: logs.contoso.com
  volumes:
    - name: logs
      emptyDir: {}
  identity:
    type: UserAssigned
    userAssignedIdentities:
      "/subscriptions/<sub>/resourceGroups/rg-prod/providers/Microsoft.ManagedIdentity/userAssignedIdentities/id-aci": {}
```

## TypeScript SDK Patterns

```typescript
import { ContainerInstanceManagementClient } from "@azure/arm-containerinstance";
import { DefaultAzureCredential } from "@azure/identity";

const client = new ContainerInstanceManagementClient(
  new DefaultAzureCredential(),
  subscriptionId
);

// Create a container group programmatically
const group = await client.containerGroups.beginCreateOrUpdateAndWait(
  resourceGroup,
  "cg-etl-job",
  {
    location: "eastus",
    osType: "Linux",
    restartPolicy: "Never",
    containers: [
      {
        name: "etl-processor",
        image: "acrprodeastus.azurecr.io/etl-processor:1.0.0",
        resources: { requests: { cpu: 2, memoryInGB: 4 } },
        environmentVariables: [
          { name: "JOB_ID", value: jobId },
          { name: "DB_CONNECTION", secureValue: dbConnection },
        ],
      },
    ],
    identity: {
      type: "UserAssigned",
      userAssignedIdentities: {
        [managedIdentityId]: {},
      },
    },
    imageRegistryCredentials: [
      {
        server: "acrprodeastus.azurecr.io",
        identity: managedIdentityId,
      },
    ],
  }
);

console.log("Container group state:", group.instanceView?.state);

// Wait for container to finish (polling pattern)
async function waitForCompletion(rg: string, name: string, timeoutMs = 600_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const cg = await client.containerGroups.get(rg, name);
    const containerState = cg.containers?.[0]?.instanceView?.currentState?.state;
    console.log(`State: ${containerState}`);

    if (containerState === "Terminated") {
      const exitCode = cg.containers?.[0]?.instanceView?.currentState?.exitCode;
      return { success: exitCode === 0, exitCode };
    }

    await new Promise(r => setTimeout(r, 10_000)); // poll every 10 seconds
  }
  throw new Error("Timeout waiting for container group");
}

const { success, exitCode } = await waitForCompletion(resourceGroup, "cg-etl-job");
if (!success) {
  // Fetch logs for debugging
  const logs = await client.containers.listLogs(resourceGroup, "cg-etl-job", "etl-processor");
  console.error("Container failed with exit code:", exitCode);
  console.error("Logs:", logs.content);
}

// Clean up after completion
await client.containerGroups.beginDeleteAndWait(resourceGroup, "cg-etl-job");
```

## ACI Trigger via Logic Apps / Azure Functions

```typescript
import { app, Timer, InvocationContext } from "@azure/functions";
import { ContainerInstanceManagementClient } from "@azure/arm-containerinstance";
import { DefaultAzureCredential } from "@azure/identity";

app.timer("nightly-etl", {
  schedule: "0 0 2 * * *", // 2 AM UTC every day
  handler: async (timer: Timer, context: InvocationContext) => {
    const client = new ContainerInstanceManagementClient(
      new DefaultAzureCredential(),
      process.env.SUBSCRIPTION_ID!
    );

    const runId = new Date().toISOString().replace(/[:.]/g, "-");

    // Start the container group
    await client.containerGroups.beginCreateOrUpdateAndWait(
      "rg-containers",
      `cg-nightly-etl-${runId}`,
      {
        location: "eastus",
        osType: "Linux",
        restartPolicy: "Never",
        containers: [{
          name: "etl",
          image: "acrprodeastus.azurecr.io/nightly-etl:latest",
          resources: { requests: { cpu: 4, memoryInGB: 8 } },
          environmentVariables: [
            { name: "RUN_DATE", value: new Date().toISOString().split("T")[0] },
          ],
        }],
        identity: { type: "SystemAssigned" },
      }
    );

    context.log(`Started nightly ETL container: cg-nightly-etl-${runId}`);
  },
});
```

## Error Codes

| Code | Meaning | Remediation |
|---|---|---|
| InaccessibleImage (400) | Cannot pull image from registry | Check managed identity AcrPull role; verify registry server name |
| InvalidContainerGroupName (400) | Name contains invalid characters | Use only lowercase alphanumeric and hyphens |
| ResourceRequestsExceedMaxAllowed (400) | CPU/memory exceeds ACI limits | Max 4 vCPU and 16 GB per container in a group |
| RegionNotAvailable (400) | ACI not available in region | Check ACI availability; use alternative region |
| ContainerGroupInTransition (409) | Group is currently starting/stopping | Wait for stable state before issuing new operations |
| SubnetDelegationRequired (400) | Subnet not delegated to ACI | Delegate subnet to `Microsoft.ContainerInstance/containerGroups` |
| OsTypeMismatch (400) | Windows container on Linux group | Set `osType: Windows` for Windows containers |

## Throttling Limits

| Resource | Limit | Notes |
|---|---|---|
| Container groups per subscription | 100 (default, soft limit) | Request increase via support for batch workloads |
| CPU per container group | 4 vCPU | Dedicated GPU containers available in select regions |
| Memory per container group | 16 GB | For memory-intensive jobs, use Standard_D VM or AKS |
| Containers per group | 60 | Use init containers + sidecars sparingly |
| VNet-integrated deployments | Subject to subnet IP availability | Size subnet based on max concurrent jobs |
| Start time (public IP) | 15–30 seconds cold start | Pre-pull images to ACR in the deployment region |
| Start time (VNet) | 30–60 seconds (network provisioning) | Factor into SLO calculations for job-based workflows |

## Production Gotchas

- **No autoscaling**: ACI cannot scale horizontally. Each container group is a single unit. For batch parallelism, launch multiple independent container groups from your orchestrator (Azure Functions, Logic Apps, Batch).
- **Restart policy semantics**: `Never` = container group is stopped when any container exits. `OnFailure` = restart containers that exit non-zero. `Always` = restart all containers regardless of exit code. Use `Never` for batch jobs to avoid accidental restart loops.
- **Init containers block start**: If an init container fails (non-zero exit), the container group stops entirely and the main containers never start. Ensure init containers have proper error handling and idempotency.
- **Secure environment variables**: Variables marked as `secureValue` are not returned by ARM APIs or visible in the portal. Use `secureValue` for connection strings, API keys, and passwords. Use Key Vault references for production secrets.
- **VNet subnet delegation is exclusive**: A subnet delegated to `Microsoft.ContainerInstance/containerGroups` cannot host other resource types. Create a dedicated ACI subnet.
- **Container group restarts vs creation**: `az container start` restarts an existing stopped group (reuses the same definition). To change the image or config, delete and recreate the group. There is no in-place update without replacing the resource.
- **Log retrieval window**: ACI retains container logs only while the container group exists. After deleting the group, logs are gone. Stream logs to Azure Monitor during execution using a Fluent Bit sidecar or by writing to stdout (ACI integrates stdout with Azure Monitor if configured).
