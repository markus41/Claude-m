# Deployment Pipelines — Stage Management, Promotion API, Deployment Rules, and Rollback

This reference covers the Fabric Deployment Pipeline REST API, stage configuration, selective and full promotion, deployment rules for environment-specific configuration, and rollback patterns.

---

## Deployment Pipeline REST API

**Base URL**: `https://api.fabric.microsoft.com/v1`

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/pipelines` | Workspace Viewer | — | Lists all pipelines accessible to caller |
| GET | `/pipelines/{pId}` | Pipeline Viewer | — | Returns pipeline details and stages |
| POST | `/pipelines` | Fabric Admin | `displayName`, `description` | Creates pipeline |
| PATCH | `/pipelines/{pId}` | Pipeline Admin | `displayName`, `description` | Update pipeline metadata |
| DELETE | `/pipelines/{pId}` | Pipeline Admin | — | Delete pipeline (workspaces unaffected) |
| GET | `/pipelines/{pId}/stages` | Pipeline Viewer | — | Lists stages with assigned workspaces |
| POST | `/pipelines/{pId}/stages/{stId}/assignWorkspace` | Pipeline Admin | `workspaceId` | Assign workspace to stage |
| DELETE | `/pipelines/{pId}/stages/{stId}/assignWorkspace` | Pipeline Admin | — | Unassign workspace from stage |
| GET | `/pipelines/{pId}/stages/{stId}/items` | Pipeline Viewer | — | Lists items in a stage |
| POST | `/pipelines/{pId}/deployAll` | Pipeline Deployer | `sourceStageOrder`, `note` | Deploy all items forward |
| POST | `/pipelines/{pId}/deploy` | Pipeline Deployer | `sourceStageOrder`, `items`, `note` | Deploy selected items |
| GET | `/pipelines/{pId}/operations/{opId}` | Pipeline Viewer | — | Poll operation status |
| GET | `/pipelines/{pId}/stages/{stId}/deploymentRules` | Pipeline Viewer | — | List deployment rules |
| PUT | `/pipelines/{pId}/stages/{stId}/deploymentRules` | Pipeline Admin | `rules` array | Set deployment rules |

```bash
TOKEN=$(az account get-access-token --resource https://api.fabric.microsoft.com --query accessToken -o tsv)

# Create a deployment pipeline
curl -X POST "https://api.fabric.microsoft.com/v1/pipelines" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "Analytics Platform Pipeline",
    "description": "Dev → Test → Prod promotion pipeline for Analytics workspaces"
  }'

# List all pipelines
curl "https://api.fabric.microsoft.com/v1/pipelines" \
  -H "Authorization: Bearer ${TOKEN}"

# Get pipeline stages (returns 3 stages: Dev=0, Test=1, Prod=2)
curl "https://api.fabric.microsoft.com/v1/pipelines/${PIPELINE_ID}/stages" \
  -H "Authorization: Bearer ${TOKEN}"

# Assign Dev workspace to stage 0
curl -X POST \
  "https://api.fabric.microsoft.com/v1/pipelines/${PIPELINE_ID}/stages/0/assignWorkspace" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"workspaceId": "'${DEV_WORKSPACE_ID}'"}'

# Assign Test workspace to stage 1
curl -X POST \
  "https://api.fabric.microsoft.com/v1/pipelines/${PIPELINE_ID}/stages/1/assignWorkspace" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"workspaceId": "'${TEST_WORKSPACE_ID}'"}'

# Assign Prod workspace to stage 2
curl -X POST \
  "https://api.fabric.microsoft.com/v1/pipelines/${PIPELINE_ID}/stages/2/assignWorkspace" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"workspaceId": "'${PROD_WORKSPACE_ID}'"}'
```

---

## Deploy Operations

### Full Deployment (All Items)

```bash
# Deploy ALL items from Dev (stage 0) to Test (stage 1)
curl -X POST \
  "https://api.fabric.microsoft.com/v1/pipelines/${PIPELINE_ID}/deployAll" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceStageOrder": 0,
    "isBackwardDeployment": false,
    "note": "Release v2.3: Sales forecast model + refresh pipeline updates"
  }'

# Response: { "operationId": "op-guid" }

# Poll for completion
curl "https://api.fabric.microsoft.com/v1/pipelines/${PIPELINE_ID}/operations/${OPERATION_ID}" \
  -H "Authorization: Bearer ${TOKEN}"
```

**Operation status values**:
| Status | Description |
|--------|-------------|
| `NotStarted` | Queued, not yet running |
| `Running` | Actively deploying |
| `Succeeded` | Completed successfully |
| `Failed` | Deployment failed (check `executionPlan` for details) |

### Selective Deployment (Specific Items)

```bash
# Get item IDs from source stage
curl "https://api.fabric.microsoft.com/v1/pipelines/${PIPELINE_ID}/stages/0/items" \
  -H "Authorization: Bearer ${TOKEN}"

# Deploy only selected items
curl -X POST \
  "https://api.fabric.microsoft.com/v1/pipelines/${PIPELINE_ID}/deploy" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceStageOrder": 0,
    "isBackwardDeployment": false,
    "items": [
      {"sourceItemId": "<notebook-guid>", "itemType": "Notebook"},
      {"sourceItemId": "<pipeline-guid>", "itemType": "DataPipeline"},
      {"sourceItemId": "<semantic-model-guid>", "itemType": "SemanticModel"}
    ],
    "note": "Hotfix: updated notebook connection to new Gold Lakehouse"
  }'
```

### Backward Deployment (Rollback)

```bash
# Roll back Prod to match Test (backward deploy from stage 2 source = Test → Prod)
# Note: sourceStageOrder is the CURRENT state to copy FROM, isBackwardDeployment=true
curl -X POST \
  "https://api.fabric.microsoft.com/v1/pipelines/${PIPELINE_ID}/deployAll" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceStageOrder": 1,
    "isBackwardDeployment": true,
    "note": "ROLLBACK: reverting Prod to Test state due to P1 incident INC-12345"
  }'
```

---

## Deployment Rules

Deployment rules configure environment-specific values that differ between stages. They are applied at promotion time so the same artifact definitions can target different connections in each environment.

### Rule Types

| Rule Type | Description | Common Use |
|-----------|-------------|-----------|
| `ConnectionRule` | Override a named connection (data source) | Point to prod database instead of dev database |
| `ParameterRule` | Override a parameter value | Environment-specific configuration values |
| `WorkspaceRule` | Repoint OneLake references to the target workspace | Lakehouse/warehouse in different workspace per stage |

### Configure Deployment Rules

```bash
# Get existing deployment rules for a stage
curl "https://api.fabric.microsoft.com/v1/pipelines/${PIPELINE_ID}/stages/2/deploymentRules" \
  -H "Authorization: Bearer ${TOKEN}"

# Set deployment rules for Production stage (stage 2)
curl -X PUT \
  "https://api.fabric.microsoft.com/v1/pipelines/${PIPELINE_ID}/stages/2/deploymentRules" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "rules": [
      {
        "ruleType": "ConnectionRule",
        "itemId": "<semantic-model-guid>",
        "ruleName": "Dev-SQLServer",
        "value": {
          "type": "ConnectionId",
          "connectionId": "<prod-sql-connection-guid>"
        }
      },
      {
        "ruleType": "ParameterRule",
        "itemId": "<dataflow-guid>",
        "ruleName": "EnvironmentName",
        "value": {
          "type": "Direct",
          "directValue": "Production"
        }
      }
    ]
  }'
```

### WorkspaceRule for OneLake Connections

When a notebook or pipeline references a Lakehouse by workspace ID, the WorkspaceRule updates it to the target stage workspace:

```bash
curl -X PUT \
  "https://api.fabric.microsoft.com/v1/pipelines/${PIPELINE_ID}/stages/2/deploymentRules" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "rules": [
      {
        "ruleType": "WorkspaceRule",
        "itemId": "<notebook-guid>",
        "ruleName": "SalesLakehouse_WorkspaceId",
        "value": {
          "type": "WorkspaceId",
          "workspaceId": "'${PROD_WORKSPACE_ID}'"
        }
      }
    ]
  }'
```

---

## Poll and Wait Pattern (Python)

```python
import requests
import time
import sys

def deploy_and_wait(
    pipeline_id: str,
    source_stage: int,
    token: str,
    items: list = None,
    backward: bool = False,
    note: str = "",
    timeout_seconds: int = 3600
) -> dict:
    """Execute a deployment and poll until completion."""
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    base = f"https://api.fabric.microsoft.com/v1/pipelines/{pipeline_id}"

    # Build request body
    body = {
        "sourceStageOrder": source_stage,
        "isBackwardDeployment": backward,
        "note": note or f"Automated {'rollback' if backward else 'promotion'} from stage {source_stage}"
    }

    # Choose endpoint
    if items:
        body["items"] = items
        endpoint = f"{base}/deploy"
    else:
        endpoint = f"{base}/deployAll"

    # Start deployment
    resp = requests.post(endpoint, headers=headers, json=body)
    resp.raise_for_status()
    operation_id = resp.json()["operationId"]

    print(f"Deployment operation started: {operation_id}")

    # Poll for completion
    start = time.time()
    while time.time() - start < timeout_seconds:
        time.sleep(15)
        op_resp = requests.get(f"{base}/operations/{operation_id}", headers=headers)
        op_data = op_resp.json()
        status = op_data.get("status")

        print(f"  Status: {status} [{int(time.time() - start)}s elapsed]")

        if status == "Succeeded":
            return {"success": True, "operationId": operation_id, "details": op_data}
        elif status == "Failed":
            return {"success": False, "operationId": operation_id, "details": op_data}

    return {"success": False, "error": "Timeout", "operationId": operation_id}

# Example usage
result = deploy_and_wait(
    pipeline_id=PIPELINE_ID,
    source_stage=0,  # Dev
    token=TOKEN,
    note="Release 2025-03-15: Q1 analytics refresh"
)
if not result["success"]:
    print(f"DEPLOYMENT FAILED: {result}")
    sys.exit(1)
print("Deployment completed successfully")
```

---

## Pre-Deployment Checklist Script

```python
def pre_deployment_checks(
    pipeline_id: str,
    source_stage: int,
    token: str
) -> tuple[bool, list]:
    """Run pre-deployment validation checks before promoting."""
    headers = {"Authorization": f"Bearer {token}"}
    base = f"https://api.fabric.microsoft.com/v1/pipelines/{pipeline_id}"
    issues = []

    # Check 1: Source stage has items
    items_resp = requests.get(f"{base}/stages/{source_stage}/items", headers=headers)
    items = items_resp.json().get("value", [])
    if not items:
        issues.append(f"ERROR: Source stage {source_stage} has no items")

    # Check 2: Target stage has a workspace assigned
    stages_resp = requests.get(f"{base}/stages", headers=headers)
    stages = stages_resp.json().get("value", [])
    target_stage = source_stage + 1
    if target_stage < len(stages):
        if not stages[target_stage].get("workspaceId"):
            issues.append(f"ERROR: Target stage {target_stage} has no workspace assigned")

    # Check 3: No concurrent operation in progress
    # (check by attempting to list operations - if any are Running, block)

    print(f"Pre-deployment checks: {'PASSED' if not issues else 'FAILED'}")
    for issue in issues:
        print(f"  {issue}")

    return (len(issues) == 0, issues)

passed, issues = pre_deployment_checks(PIPELINE_ID, 0, TOKEN)
if not passed:
    sys.exit(1)
```

---

## Error Codes and Remediation

| Error | Meaning | Fix |
|-------|---------|-----|
| `403 Forbidden` on deploy | Caller not assigned Pipeline Deployer role | In Fabric portal > Pipeline > Manage access > Add as Deployer |
| `Stage workspace not assigned` | Target stage has no workspace | Assign workspace to stage via assignWorkspace API |
| `Deployment conflict: item is being edited` | Target stage has unsaved edits to an item being overwritten | Commit or discard target workspace changes before promoting |
| `Deployment rule not applied` | Rule item ID incorrect or connection does not exist in target | Re-create rule with correct item ID from target stage |
| `Operation stuck in Running` | Large semantic model refresh or Fabric service slowness | Poll for up to 2 hours; check Capacity Metrics for throttling |
| `Pipeline does not exist` | Pipeline ID invalid or caller lacks access | Verify pipeline ID; check pipeline access permissions |
| `Cannot deploy to same workspace` | Source and target stage have the same workspace assigned | Each stage must have a distinct workspace |

---

## Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Stages per pipeline | 3 | Development, Test, Production |
| Items per stage | 250 | |
| Pipelines per tenant | No hard limit (practical: 1 per product team) | |
| Concurrent deployment operations per pipeline | 1 | Operations queue; no parallel deployments |
| Deployment operation timeout | 2 hours | |
| Deployment rule entries per stage | 100 | |
| Rollback availability | Any time | Backward deploy requires source stage to have items |
