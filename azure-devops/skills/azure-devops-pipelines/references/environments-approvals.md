# Azure DevOps Environments and Approvals Reference

## Overview

Deployment environments are named targets that represent real deployment destinations (dev, staging, production). Environments support approval checks, gates, Kubernetes resources, virtual machine resources, and exclusive lock checks. Approvals and checks are configured on environments (not in YAML), providing a separation of concerns between pipeline authors and deployment governance.

---

## REST API Endpoints

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/_apis/distributedtask/environments?api-version=7.1` | Environment (Read) | `name`, `$top`, `continuationToken` | List environments |
| GET | `/_apis/distributedtask/environments/{environmentId}?api-version=7.1` | Environment (Read) | `$expand=resourceReferences` | Get environment with resources |
| POST | `/_apis/distributedtask/environments?api-version=7.1` | Project Admin | Body: `name`, `description` | Create environment |
| PATCH | `/_apis/distributedtask/environments/{environmentId}?api-version=7.1` | Environment (Manage) | Body: `name`, `description` | Update environment |
| DELETE | `/_apis/distributedtask/environments/{environmentId}?api-version=7.1` | Environment (Manage) | — | Delete environment |
| GET | `/_apis/pipelines/checks/configurations?api-version=7.1` | Environment (Read) | `resourceType=environment&resourceId={id}` | List checks on environment |
| POST | `/_apis/pipelines/checks/configurations?api-version=7.1` | Environment (Manage) | Body: check configuration | Add check to environment |
| PATCH | `/_apis/pipelines/checks/configurations/{checkId}?api-version=7.1` | Environment (Manage) | Body: updated settings | Update existing check |
| DELETE | `/_apis/pipelines/checks/configurations/{checkId}?api-version=7.1` | Environment (Manage) | — | Remove check |

---

## Creating Environments

```typescript
import axios from "axios";

const ORG = "myorg";
const PROJECT = "myproject";
const PAT = process.env.ADO_PAT!;
const auth = Buffer.from(`:${PAT}`).toString("base64");
const BASE = `https://dev.azure.com/${ORG}/${PROJECT}/_apis/distributedtask`;
const HEADERS = {
  Authorization: `Basic ${auth}`,
  "Content-Type": "application/json",
};

async function createEnvironment(name: string, description: string) {
  const response = await axios.post(
    `${BASE}/environments?api-version=7.1`,
    { name, description },
    { headers: HEADERS }
  );
  return response.data; // { id, name, description, createdBy, ... }
}
```

---

## Check Types

| Check Type | Type ID | Description |
|------------|---------|-------------|
| Approvals | `8c6f20a7-a545-4486-9777-f762fafe0d4d` | Human approval from users or groups |
| Exclusive Lock | `2e5f1e39-0c3d-4d8e-b5f7-3c5b03e35d5d` | Only one pipeline can use the environment at a time |
| Business Hours | `fe1de3ee-a436-41b4-bb20-f6eb4cb879a7` | Only deploy during specified hours |
| Azure Monitor | `5d1b3d3c-0c5a-4e3b-9f45-3e5c6b9f8d3a` | Query Azure Monitor for active alerts |
| REST API | `9c3b29f6-04a8-40f7-96fa-58f5e4a5e03b` | Call HTTP endpoint and evaluate response |
| Invoke Azure Function | `537fdb7a-a601-4537-aa70-92645a2b5ce4` | Call Azure Function and evaluate result |
| Manual Validation | (pipeline task, not environment check) | Inline in YAML; pauses for human input |

---

## Approval Checks

### Configure Approval on Environment

```json
POST /_apis/pipelines/checks/configurations?api-version=7.1
{
  "type": {
    "id": "8c6f20a7-a545-4486-9777-f762fafe0d4d",
    "name": "Approval"
  },
  "settings": {
    "approvers": [
      { "id": "<user-guid>" },
      { "id": "<group-guid>" }
    ],
    "executionOrder": "anyOrder",
    "minRequiredApprovers": 1,
    "requiredApproverCount": 1,
    "instructions": "Verify staging smoke tests passed before approving production deployment.",
    "blockedApprovers": []
  },
  "resource": {
    "type": "environment",
    "id": "<environment-id>"
  },
  "timeout": 43200
}
```

### Approval Settings

| Setting | Type | Description |
|---------|------|-------------|
| `approvers` | array | List of users/groups who can approve |
| `executionOrder` | string | `anyOrder` or `inSequence` |
| `minRequiredApprovers` | int | Minimum number of approvals needed |
| `instructions` | string | Shown to approvers in the approval UI |
| `blockedApprovers` | array | Users who cannot approve (e.g., the person who triggered the run) |
| `timeout` | int | Minutes before approval times out (default: 43200 = 30 days) |

### Sequential Approvals

```json
{
  "settings": {
    "approvers": [
      { "id": "<tech-lead-guid>" },
      { "id": "<release-manager-guid>" }
    ],
    "executionOrder": "inSequence",
    "minRequiredApprovers": 2,
    "instructions": "1. Tech lead verifies code quality. 2. Release manager authorizes deployment."
  }
}
```

---

## Exclusive Lock Check

Prevents multiple pipeline runs from deploying to the same environment simultaneously.

```json
POST /_apis/pipelines/checks/configurations?api-version=7.1
{
  "type": {
    "id": "2e5f1e39-0c3d-4d8e-b5f7-3c5b03e35d5d",
    "name": "ExclusiveLock"
  },
  "settings": {
    "lockBehavior": "sequential"
  },
  "resource": {
    "type": "environment",
    "id": "<environment-id>"
  }
}
```

| Lock Behavior | Description |
|--------------|-------------|
| `sequential` | Queue runs; deploy one at a time in order |
| `runLatest` | Cancel queued runs; only deploy the latest |

---

## Business Hours Check

```json
{
  "type": {
    "id": "fe1de3ee-a436-41b4-bb20-f6eb4cb879a7",
    "name": "BusinessHours"
  },
  "settings": {
    "businessDays": "Monday,Tuesday,Wednesday,Thursday,Friday",
    "timeZone": "Eastern Standard Time",
    "startTime": "09:00",
    "endTime": "17:00"
  },
  "resource": {
    "type": "environment",
    "id": "<environment-id>"
  }
}
```

---

## Azure Monitor Gate

```json
{
  "type": {
    "id": "5d1b3d3c-0c5a-4e3b-9f45-3e5c6b9f8d3a",
    "name": "AzureMonitor"
  },
  "settings": {
    "connectedServiceName": "<azure-service-connection-id>",
    "resourceGroupName": "my-rg",
    "alertRuleResourceId": "/subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.Insights/metricAlerts/<alert-name>",
    "evaluationMode": "noActiveAlerts"
  },
  "resource": {
    "type": "environment",
    "id": "<environment-id>"
  }
}
```

---

## REST API Gate

```json
{
  "type": {
    "id": "9c3b29f6-04a8-40f7-96fa-58f5e4a5e03b",
    "name": "InvokeRestAPI"
  },
  "settings": {
    "connectedServiceName": "<generic-service-connection-id>",
    "method": "GET",
    "urlSuffix": "/api/ready",
    "headers": "Content-Type:application/json",
    "body": "",
    "waitForCompletion": "false",
    "successCriteria": "eq(root['status'], 'ready')"
  },
  "resource": {
    "type": "environment",
    "id": "<environment-id>"
  },
  "timeout": 60
}
```

---

## Invoke Azure Function Gate

```json
{
  "type": {
    "id": "537fdb7a-a601-4537-aa70-92645a2b5ce4",
    "name": "AzureFunction"
  },
  "settings": {
    "function": "https://my-func.azurewebsites.net/api/deploy-gate",
    "key": "$(azureFunctionKey)",
    "method": "POST",
    "headers": "Content-Type:application/json",
    "body": "{\"environment\": \"production\", \"buildId\": \"$(Build.BuildId)\"}",
    "waitForCompletion": "true",
    "successCriteria": "eq(root['result'], 'approved')"
  },
  "resource": {
    "type": "environment",
    "id": "<environment-id>"
  },
  "timeout": 120
}
```

---

## Manual Validation Task (In-YAML)

Unlike environment checks, `ManualValidation` is a pipeline task that pauses within a job.

```yaml
jobs:
  - job: WaitForValidation
    pool: server   # Required: runs on Azure DevOps server, not an agent
    steps:
      - task: ManualValidation@1
        inputs:
          notifyUsers: 'user@company.com,release-managers@company.com'
          instructions: |
            Please verify the following before approving:
            1. Staging environment smoke tests passed
            2. No critical alerts in Azure Monitor
            3. Change ticket SNOW-12345 is approved
          onTimeout: reject   # reject | resume
        timeoutInMinutes: 1440   # 24 hours
```

---

## Environment Resource Types

### Kubernetes Resource

```yaml
# YAML reference
- deployment: DeployToK8s
  environment:
    name: production
    resourceType: Kubernetes
    resourceName: my-k8s-namespace
  strategy:
    runOnce:
      deploy:
        steps:
          - task: KubernetesManifest@1
            inputs:
              action: deploy
              manifests: manifests/*.yaml
```

Register a Kubernetes resource on an environment via REST:
```json
POST /_apis/distributedtask/environments/{envId}/providers/kubernetes?api-version=7.1
{
  "name": "my-k8s-namespace",
  "namespace": "production",
  "clusterName": "aks-cluster",
  "serviceEndpointId": "<k8s-service-connection-id>"
}
```

### Virtual Machine Resource

```yaml
# YAML reference — rolling deployment to VMs
- deployment: DeployToVMs
  environment:
    name: production
    resourceType: VirtualMachine
    tags: role:web
  strategy:
    rolling:
      maxParallel: 2
      deploy:
        steps:
          - script: ./deploy.sh
```

Register VM resources by running the registration script on each target machine. VMs are tagged for targeting subsets.

---

## Referencing Environments in YAML

```yaml
# Basic deployment job
- deployment: DeployStaging
  environment: staging
  strategy:
    runOnce:
      deploy:
        steps:
          - script: echo "Deploying..."

# With resource type
- deployment: DeployProd
  environment:
    name: production
    resourceType: Kubernetes
    resourceName: prod-namespace
```

---

## Error Codes

| Error | Meaning | Remediation |
|-------|---------|-------------|
| `EnvironmentNotFound` | Environment ID or name does not exist | Create the environment first; verify name in YAML matches |
| `ApprovalTimedOut` | Approval expired before anyone approved | Increase timeout; re-run the pipeline |
| `ExclusiveLockTimedOut` | Could not acquire lock within timeout | Wait for prior deployment to complete |
| `CheckEvaluationFailed` | Gate returned failure status | Check the gate endpoint health; fix the underlying condition |
| `InsufficientPermissions` | User cannot manage environment checks | Grant Environment (Manage) permission |
| `ManualValidationRejected` | Manual validation task was rejected | Fix the issue and re-run the pipeline |

---

## Common Patterns and Gotchas

**1. Checks are on environments, not in YAML**
Pipeline YAML references an environment by name. All checks (approvals, gates) are configured on the environment itself. Changing a check does not require a YAML change.

**2. `pool: server` is required for ManualValidation**
The ManualValidation task runs on the Azure DevOps server, not an agent. If you specify an agent pool, the task will fail.

**3. Approval timeout defaults are very long**
The default timeout for approvals is 30 days (43200 minutes). Set a shorter timeout for production environments to avoid stale deployments.

**4. Exclusive lock with `runLatest` can skip intermediate deployments**
If three pipeline runs queue for the same environment with `runLatest`, only the last one deploys. The middle run is canceled. Use `sequential` if every run must deploy.

**5. Environment history provides audit trail**
Every deployment to an environment is recorded with the pipeline name, build number, and approvers. Use this for compliance and audit purposes.

**6. Environments are project-scoped**
An environment named "production" in Project A is separate from "production" in Project B. Cross-project environment sharing is not supported.

**7. Re-running a failed deployment re-triggers approvals**
If a deployment fails and you re-run the stage, approval checks must be completed again. Previously granted approvals do not carry over.
