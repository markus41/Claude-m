---
name: container-app-scale
description: "Configure KEDA-based scale rules for a Container App (HTTP, queue, custom)"
argument-hint: "--name <app-name> --type <http|queue|custom> [--rg <resource-group>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Configure Container App Scaling

Set up KEDA-powered autoscaling rules for an Azure Container App.

## Instructions

### 1. Validate Inputs

- `--name` — Container App name. Ask if not provided.
- `--type` — Scale rule type: `http`, `queue`, or `custom`. Ask if not provided.
- `--rg` — Resource group. Read from `.env` `AZURE_RESOURCE_GROUP` if not provided.

### 2. Check Current Scale Configuration

```bash
az containerapp show \
  --name <app-name> \
  --resource-group <rg-name> \
  --query "properties.template.scale" \
  --output json
```

### 3. Set Replica Bounds

```bash
az containerapp update \
  --name <app-name> \
  --resource-group <rg-name> \
  --min-replicas <min> \
  --max-replicas <max>
```

Guidelines:
| Workload type | Min replicas | Max replicas |
|---------------|-------------|-------------|
| Production API | 2+ | 10-50 |
| Background worker | 1 | 5-20 |
| Scale-to-zero (event-driven) | 0 | 10-30 |
| Batch/cron job | 0 | 1-5 |

### 4. HTTP Scaling Rule

For apps that receive HTTP traffic:

```bash
az containerapp update \
  --name <app-name> \
  --resource-group <rg-name> \
  --scale-rule-name http-scaling \
  --scale-rule-type http \
  --scale-rule-http-concurrency 100
```

This scales based on concurrent HTTP requests per replica. When concurrency exceeds 100, a new replica is created.

### 5. Queue Scaling Rule (Azure Storage Queue)

For apps that process messages from Azure Storage Queue:

```bash
az containerapp update \
  --name <app-name> \
  --resource-group <rg-name> \
  --scale-rule-name queue-scaling \
  --scale-rule-type azure-queue \
  --scale-rule-metadata "queueName=<queue-name>" "queueLength=20" "accountName=<storage-account>" \
  --scale-rule-auth "connection=queue-connection-string"
```

First, set the connection string as a secret:
```bash
az containerapp secret set \
  --name <app-name> \
  --resource-group <rg-name> \
  --secrets "queue-connection-string=<connection-string>"
```

### 6. Azure Service Bus Queue Rule

```bash
az containerapp update \
  --name <app-name> \
  --resource-group <rg-name> \
  --scale-rule-name servicebus-scaling \
  --scale-rule-type azure-servicebus \
  --scale-rule-metadata "queueName=<queue-name>" "messageCount=5" "namespace=<sb-namespace>" \
  --scale-rule-auth "connection=sb-connection-string"
```

### 7. Custom KEDA Scaler

For any KEDA-supported scaler (Kafka, PostgreSQL, Prometheus, Cron, etc.), use YAML configuration:

```yaml
# scale-rule.yaml
properties:
  template:
    scale:
      minReplicas: 1
      maxReplicas: 20
      rules:
        - name: kafka-scaling
          custom:
            type: kafka
            metadata:
              bootstrapServers: "<broker>:9092"
              consumerGroup: "<group>"
              topic: "<topic>"
              lagThreshold: "50"
            auth:
              - secretRef: kafka-password
                triggerParameter: password
```

Apply with:
```bash
az containerapp update \
  --name <app-name> \
  --resource-group <rg-name> \
  --yaml scale-rule.yaml
```

### 8. Verify Scaling

```bash
# Check current replica count
az containerapp replica list \
  --name <app-name> \
  --resource-group <rg-name> \
  --output table

# Watch scaling in real-time
az containerapp logs show \
  --name <app-name> \
  --resource-group <rg-name> \
  --type system \
  --follow
```

### 9. Display Summary

Show the user:
- Active scale rules and their thresholds
- Replica bounds (min/max)
- Current replica count
- Tips for tuning thresholds based on observed metrics
