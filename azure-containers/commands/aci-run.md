---
name: aci-run
description: "Run a container in Azure Container Instances for quick one-off tasks or scheduled jobs"
argument-hint: "--image <image-uri> [--name <container-name>] [--rg <resource-group>] [--command <cmd>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Run a Container in ACI

Deploy and run a container in Azure Container Instances for one-off tasks, batch processing, or scheduled execution.

## Instructions

### 1. Validate Inputs

- `--image` — Container image URI (e.g., `myacr.azurecr.io/batch-job:1.0`). Ask if not provided.
- `--name` — Container group name (lowercase, alphanumeric, hyphens). Generate from image name if not provided.
- `--rg` — Resource group. Read from `.env` `AZURE_RESOURCE_GROUP` if not provided.
- `--command` — Override command to run in the container. Optional.

### 2. Simple One-Off Container

```bash
az container create \
  --resource-group <rg-name> \
  --name <container-name> \
  --image <image-uri> \
  --restart-policy Never \
  --cpu 1 \
  --memory 1.5 \
  --environment-variables "KEY1=value1" "KEY2=value2" \
  --secure-environment-variables "SECRET_KEY=<secret-value>"
```

Restart policies:
| Policy | Use case |
|--------|----------|
| `Always` | Long-running service (default) |
| `OnFailure` | Retry on crash (batch with retry) |
| `Never` | One-shot task (run once, then stop) |

### 3. Run with ACR Authentication

**Using managed identity** (recommended):
```bash
az container create \
  --resource-group <rg-name> \
  --name <container-name> \
  --image <acr-name>.azurecr.io/<image:tag> \
  --acr-identity [system] \
  --assign-identity \
  --restart-policy OnFailure
```

**Using ACR admin credentials**:
```bash
az container create \
  --resource-group <rg-name> \
  --name <container-name> \
  --image <acr-name>.azurecr.io/<image:tag> \
  --registry-login-server <acr-name>.azurecr.io \
  --registry-username <username> \
  --registry-password <password> \
  --restart-policy OnFailure
```

### 4. Container with Volume Mounts

**Azure Files share**:
```bash
az container create \
  --resource-group <rg-name> \
  --name <container-name> \
  --image <image-uri> \
  --azure-file-volume-share-name <share-name> \
  --azure-file-volume-account-name <storage-account> \
  --azure-file-volume-account-key <storage-key> \
  --azure-file-volume-mount-path /mnt/data \
  --restart-policy Never
```

### 5. Container Group with Multiple Containers (YAML)

For multi-container deployments, use a YAML file:

```yaml
# container-group.yaml
apiVersion: '2021-09-01'
location: eastus
name: multi-container-group
properties:
  containers:
    - name: main-app
      properties:
        image: myacr.azurecr.io/app:1.0
        resources:
          requests:
            cpu: 1.0
            memoryInGb: 1.5
        ports:
          - port: 80
        command: []
    - name: sidecar
      properties:
        image: myacr.azurecr.io/sidecar:1.0
        resources:
          requests:
            cpu: 0.5
            memoryInGb: 0.5
  osType: Linux
  restartPolicy: OnFailure
  ipAddress:
    type: Public
    ports:
      - protocol: tcp
        port: 80
type: Microsoft.ContainerInstance/containerGroups
```

Deploy with:
```bash
az container create \
  --resource-group <rg-name> \
  --file container-group.yaml
```

### 6. GPU-Enabled Container

```bash
az container create \
  --resource-group <rg-name> \
  --name <container-name> \
  --image <image-uri> \
  --gpu-count 1 \
  --gpu-sku K80 \
  --restart-policy Never
```

GPU SKUs: `K80`, `P100`, `V100` (availability varies by region).

### 7. Monitor Execution

```bash
# Watch container logs
az container logs --resource-group <rg-name> --name <container-name> --follow

# Check container state
az container show --resource-group <rg-name> --name <container-name> --query "containers[0].instanceView.currentState" --output json

# Attach to container (interactive)
az container attach --resource-group <rg-name> --name <container-name>

# Execute a command in a running container
az container exec --resource-group <rg-name> --name <container-name> --exec-command "/bin/sh"
```

### 8. Clean Up

```bash
# Delete the container group after completion
az container delete --resource-group <rg-name> --name <container-name> --yes
```

### 9. Display Summary

Show the user:
- Container group name and state
- Image and resource allocation
- Logs output (for completed one-off tasks)
- Next steps: check logs, delete when done
