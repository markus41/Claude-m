---
name: ado-environment-create
description: Create deployment environments with approval checks and gates
argument-hint: "<env-name> [--approvers <email,...>] [--gates business-hours|azure-monitor|rest-api] [--resource kubernetes|vm]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# Create Deployment Environment

Create deployment environments in Azure DevOps Pipelines with approval checks, gates, exclusive locks, and resource targets.

## Prerequisites

- Authenticated to Azure DevOps (run `/ado-setup` first)
- `Manage environments` permission

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `<env-name>` | Yes | Environment name (e.g., `production`, `staging`) |
| `--description` | No | Environment description |
| `--approvers` | No | Comma-separated approver emails or group names |
| `--approval-order` | No | `any` (default) or `sequential` |
| `--gates` | No | Gate types: `business-hours`, `azure-monitor`, `rest-api`, `invoke-function` |
| `--resource` | No | Resource type: `kubernetes` or `vm` |
| `--exclusive-lock` | No | Enable exclusive deployment lock |

## Instructions

1. **Create environment** — call `POST /_apis/distributedtask/environments?api-version=7.1` with:
   ```json
   { "name": "<env-name>", "description": "<description>" }
   ```

2. **Add approval check** — if `--approvers` is specified:
   - Resolve approver identities
   - Call `POST /_apis/pipelines/checks/configurations?api-version=7.1-preview.1`:
   ```json
   {
     "type": { "name": "Approval" },
     "settings": {
       "approvers": [{ "id": "{identity-id}" }],
       "executionOrder": "anyOrder",
       "minRequiredApprovers": 1,
       "instructions": "Please review the deployment."
     },
     "resource": { "type": "environment", "id": "{envId}" }
   }
   ```

3. **Add gates** — for each gate type:
   - **Business hours**: `{ "type": { "name": "Task Check" }, "settings": { "definitionRef": { "name": "InvokeRestAPI" }, "inputs": { "waitForCompletion": "true" } } }`
   - **Azure Monitor**: configure alert rule evaluation
   - **REST API**: invoke external endpoint and evaluate response
   - **Invoke Function**: call Azure Function for custom validation

4. **Exclusive lock** — if `--exclusive-lock` is specified, add an exclusive lock check:
   ```json
   { "type": { "name": "ExclusiveLock" }, "resource": { "type": "environment", "id": "{envId}" } }
   ```

5. **Add resource targets** — if `--resource` is specified:
   - **Kubernetes**: `POST /_apis/distributedtask/environments/{envId}/providers/kubernetes` with service connection and namespace.
   - **Virtual Machine**: `POST /_apis/distributedtask/environments/{envId}/providers/virtualmachines` with registration script.

6. **Display results** — show environment ID, name, checks configured, resources, and pipeline YAML reference:
   ```yaml
   stages:
     - stage: Deploy
       jobs:
         - deployment: deploy
           environment: '<env-name>'
   ```

## Examples

```bash
/ado-environment-create production --approvers "lead@contoso.com,mgr@contoso.com" --approval-order sequential --exclusive-lock
/ado-environment-create staging --gates business-hours
/ado-environment-create dev-k8s --resource kubernetes
```

## Error Handling

- **Environment already exists**: Offer to update existing environment or choose a different name.
- **Approver not found**: Identity search returned no results — verify email or group.
- **Service connection missing**: Kubernetes resource requires a service connection — run `/ado-service-connection` first.
