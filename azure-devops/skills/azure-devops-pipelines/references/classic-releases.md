# Azure DevOps Classic Releases Reference

## Overview

Classic releases provide a GUI-based release management experience with stages, approvals, gates, and artifact-driven deployment workflows. While YAML pipelines are the recommended approach for new projects, many organizations still operate Classic release definitions and may need to maintain or migrate them. This reference covers the release definition structure, stage configuration, gates, artifact sources, the REST API, and migration guidance.

---

## REST API Endpoints

Classic releases use a separate host: `vsrm.dev.azure.com`.

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/_apis/release/definitions?api-version=7.1` | Release (Read) | `$top`, `searchText`, `path`, `isExactNameMatch` | List release definitions |
| GET | `/_apis/release/definitions/{definitionId}?api-version=7.1` | Release (Read) | `$expand=environments` | Full definition with stages |
| POST | `/_apis/release/definitions?api-version=7.1` | Release (Read & Write) | Body: full definition | Create a release definition |
| PUT | `/_apis/release/definitions/{definitionId}?api-version=7.1` | Release (Read & Write) | Body: full definition | Update entire definition (must include `revision`) |
| DELETE | `/_apis/release/definitions/{definitionId}?api-version=7.1` | Release (Read & Write) | `forceDelete` | Delete a release definition |
| GET | `/_apis/release/releases?api-version=7.1` | Release (Read) | `definitionId`, `$top`, `statusFilter` | List releases |
| GET | `/_apis/release/releases/{releaseId}?api-version=7.1` | Release (Read) | `$expand=environments` | Get release details |
| POST | `/_apis/release/releases?api-version=7.1` | Release (Read & Execute) | Body: `definitionId`, `artifacts` | Create (trigger) a new release |
| PATCH | `/_apis/release/releases/{releaseId}?api-version=7.1` | Release (Read & Write) | Body: fields to update | Update release (e.g., keep forever) |
| PATCH | `/_apis/release/releases/{releaseId}/environments/{envId}?api-version=7.1` | Release (Read & Write) | Body: `status`, `comment` | Deploy or cancel a stage |
| GET | `/_apis/release/releases/{releaseId}/environments/{envId}/deployPhases/{phaseId}/tasks?api-version=7.1` | Release (Read) | — | Get task execution details |

**Base URL**: `https://vsrm.dev.azure.com/{organization}/{project}/_apis/release`

---

## Release Definition Structure

```json
{
  "name": "My Application Release",
  "path": "\\Production",
  "releaseNameFormat": "Release-$(Rev:r)",
  "artifacts": [...],
  "environments": [...],
  "triggers": [...],
  "variables": {
    "appServiceName": { "value": "my-app-service" },
    "connectionString": { "value": "", "isSecret": true }
  },
  "variableGroups": [1, 2],
  "tags": ["production", "web-app"]
}
```

---

## Artifact Sources

| Source Type | Description | Configuration |
|------------|-------------|---------------|
| Build | Azure Pipelines build output | `definitionReference.definition.id`, `defaultVersionType` |
| Git | Git repository branch/tag | `definitionReference.definition.id`, `branches` |
| Container | Docker/ACR image | `connection`, `resourceGroup`, `registryName` |
| Package | Azure Artifacts feed | `feed`, `package`, `version` |
| External TFS Build | Build from another ADO org | `connection`, `definitionId` |
| GitHub | GitHub repository release | `connection`, `repository`, `defaultVersionType` |

### Build Artifact Configuration

```json
{
  "sourceId": "<project-guid>:<build-definition-id>",
  "type": "Build",
  "alias": "drop",
  "isPrimary": true,
  "isRetained": false,
  "definitionReference": {
    "definition": { "id": "42", "name": "CI Build" },
    "defaultVersionType": { "id": "latestType", "name": "Latest" },
    "project": { "id": "<project-guid>", "name": "MyProject" }
  }
}
```

### Default Version Types

| ID | Name | Description |
|----|------|-------------|
| `latestType` | Latest | Most recent successful build |
| `specificVersionType` | Specific version | Pinned build number |
| `latestFromBranchType` | Latest from branch | Latest from a specific branch |
| `selectDuringReleaseCreationType` | Specify at release | User selects at release time |

---

## Stage (Environment) Configuration

```json
{
  "name": "Production",
  "rank": 2,
  "conditions": [
    {
      "conditionType": "environmentState",
      "name": "Staging",
      "value": "4"
    }
  ],
  "preDeployApprovals": {
    "approvals": [
      {
        "approver": { "id": "<user-or-group-id>" },
        "rank": 1,
        "isAutomated": false,
        "isNotificationOn": true
      }
    ],
    "executionOrder": "inSequence"
  },
  "postDeployApprovals": {
    "approvals": [
      {
        "approver": { "id": "<user-or-group-id>" },
        "rank": 1,
        "isAutomated": false
      }
    ]
  },
  "preDeploymentGates": {
    "gates": [...],
    "gatesOptions": {
      "isEnabled": true,
      "timeout": 1440,
      "samplingInterval": 5,
      "stabilizationTime": 10,
      "minimumSuccessDuration": 5
    }
  },
  "deployPhases": [
    {
      "deploymentInput": {
        "agentSpecification": { "identifier": "ubuntu-latest" }
      },
      "rank": 1,
      "phaseType": "agentBasedDeployment",
      "workflowTasks": [
        {
          "taskId": "<task-guid>",
          "version": "2.*",
          "name": "Deploy to App Service",
          "inputs": {
            "azureSubscription": "MyAzureConnection",
            "appName": "$(appServiceName)"
          }
        }
      ]
    }
  ]
}
```

### Condition Types

| Type | Value | Description |
|------|-------|-------------|
| `event` | — | Triggered by artifact source event |
| `environmentState` | `4` (succeeded), `8` (rejected) | Depends on another stage completing |
| `artifact` | — | Triggered by artifact filter |

---

## Gate Types

### Pre-Deployment Gates

| Gate Type | Description | Configuration |
|-----------|-------------|---------------|
| Azure Monitor | Query Azure Monitor alerts | Alert rule resource ID |
| REST API | Call any HTTP endpoint; evaluate JSON response | URL, headers, success criteria |
| Invoke Azure Function | Call an Azure Function and evaluate result | Function URL, key, body |
| Query Work Items | Check if work item query returns results | WIQL query, upper/lower threshold |

### Gate Options

| Option | Type | Description |
|--------|------|-------------|
| `timeout` | int (minutes) | Max time to wait for all gates to pass |
| `samplingInterval` | int (minutes) | How often to re-evaluate gates |
| `stabilizationTime` | int (minutes) | Time gates must pass consistently |
| `minimumSuccessDuration` | int (minutes) | Minimum passing time before advancing |

### REST API Gate Example

```json
{
  "gates": [
    {
      "tasks": [
        {
          "taskId": "9c3b29f6-04a8-40f7-96fa-58f5e4a5e03b",
          "name": "Invoke REST API",
          "inputs": {
            "connectedServiceName": "MyGenericConnection",
            "method": "GET",
            "urlSuffix": "/api/health",
            "headers": "Content-Type:application/json",
            "body": "",
            "waitForCompletion": "false",
            "successCriteria": "eq(root['status'], 'healthy')"
          }
        }
      ]
    }
  ]
}
```

---

## Triggering a Release

```typescript
import axios from "axios";

const ORG = "myorg";
const PROJECT = "myproject";
const PAT = process.env.ADO_PAT!;
const auth = Buffer.from(`:${PAT}`).toString("base64");

const BASE = `https://vsrm.dev.azure.com/${ORG}/${PROJECT}/_apis/release`;
const HEADERS = {
  Authorization: `Basic ${auth}`,
  "Content-Type": "application/json",
};

async function createRelease(definitionId: number, buildId?: number) {
  const body: Record<string, unknown> = {
    definitionId,
    description: "Triggered via automation",
    isDraft: false,
    reason: "manual",
    manualEnvironments: [],  // Empty = deploy to all auto-trigger stages
  };

  if (buildId) {
    body.artifacts = [
      {
        alias: "drop",
        instanceReference: {
          id: buildId.toString(),
          name: null,
        },
      },
    ];
  }

  const response = await axios.post(
    `${BASE}/releases?api-version=7.1`,
    body,
    { headers: HEADERS }
  );

  return response.data;
}

// Deploy a specific stage
async function deployStage(releaseId: number, environmentId: number) {
  const body = {
    status: "inProgress",
    comment: "Deploying to production",
  };

  const response = await axios.patch(
    `${BASE}/releases/${releaseId}/environments/${environmentId}?api-version=7.1`,
    body,
    { headers: HEADERS }
  );

  return response.data;
}
```

---

## Release Triggers

| Trigger Type | Description | Configuration |
|-------------|-------------|---------------|
| Continuous deployment | Auto-create release on new artifact | `triggerType: "artifactSource"`, branch filters |
| Scheduled | Create release on a cron schedule | `triggerType: "schedule"`, schedule definition |
| Pull request | Create release when PR completes | `triggerType: "pullRequest"`, branch filters |

```json
{
  "triggers": [
    {
      "triggerType": "artifactSource",
      "artifactAlias": "drop",
      "triggerConditions": [
        {
          "sourceBranch": "refs/heads/main",
          "tags": [],
          "useBuildDefinitionBranch": false
        }
      ]
    }
  ]
}
```

---

## Migration Path: Classic to YAML

### Mapping Classic Concepts to YAML

| Classic Concept | YAML Equivalent |
|----------------|-----------------|
| Release definition | `azure-pipelines.yml` with stages |
| Environment (stage) | `stage:` with `deployment:` job |
| Pre-deploy approval | Environment check (approval) |
| Pre-deploy gate | Environment check (Azure Function, REST API) |
| Post-deploy approval | Post-deployment gate (manual validation task) |
| Artifact source | `resources: pipelines:` or `resources: repositories:` |
| Agent phase | `pool:` with agent specification |
| Task group | Template file (`.yml`) |
| Variable group | Same — `variables: - group:` |
| Continuous deployment trigger | `resources: pipelines: trigger:` |

### Step-by-Step Migration

1. **Inventory**: List all stages, tasks, variables, and approvals in the Classic definition.
2. **Create environments**: Create YAML environments matching Classic stage names. Configure approvals on environments.
3. **Convert tasks**: Map each Classic task to its YAML equivalent. Most tasks have the same ID and inputs.
4. **Convert variables**: Move variable groups to YAML `variables:` section. Move secrets to Key Vault-linked groups.
5. **Convert triggers**: Replace CD trigger with `resources: pipelines: trigger:` in YAML.
6. **Test in parallel**: Run both Classic and YAML pipelines side by side against a staging environment.
7. **Cut over**: Disable Classic CD trigger; enable YAML trigger for production.

### Example: Classic Stage to YAML

```yaml
# Classic stage "Production" with pre-deploy approval and App Service deploy
stages:
  - stage: Production
    dependsOn: Staging
    condition: succeeded()
    jobs:
      - deployment: DeployProduction
        environment: production    # Approval configured on this environment
        strategy:
          runOnce:
            deploy:
              steps:
                - task: DownloadPipelineArtifact@2
                  inputs:
                    artifact: drop
                    path: $(Pipeline.Workspace)/drop
                - task: AzureWebApp@1
                  inputs:
                    azureSubscription: MyAzureConnection
                    appName: $(appServiceName)
                    package: $(Pipeline.Workspace)/drop/**/*.zip
```

---

## Error Codes

| Code / Error | Meaning | Remediation |
|---|---|---|
| `ReleaseDefinitionNotFound` | Definition ID does not exist | Verify definitionId and project scope |
| `InvalidArtifactSource` | Build or artifact not found | Check build completed and artifact alias matches |
| `ApprovalPending` | Stage waiting for manual approval | Approve or reject via UI or REST API |
| `GateEvaluationFailed` | Gate did not pass within timeout | Check gate health endpoint; increase timeout |
| `AgentNotAvailable` | No agent in the deployment pool | Verify pool has online agents |
| `TF400813` | Insufficient release permissions | Add Release (Read, Write & Execute) to PAT |
| `ReleaseAlreadyAbandoned` | Cannot modify an abandoned release | Create a new release |

---

## Limits

| Resource | Limit | Notes |
|---|---|---|
| Release definitions per project | 500 | Contact support for increase |
| Stages per release definition | 50 | UI degrades beyond 20 stages |
| Releases per definition | 1,000 retained | Retention policies apply |
| Approvers per stage | 20 | Includes all pre and post approvals |
| Gates per stage | 10 | Performance degrades with many gates |
| Concurrent deployments | Bounded by agent pool | Self-hosted agents: unlimited registrations |
| Retention: minimum | 30 days | Configurable per definition |
