# Power Automate — Child Flows & Power Platform Pipelines

## Overview
Child flows allow one cloud flow to call another, enabling modular, reusable automation
building blocks. Power Platform Pipelines provide structured CI/CD deployment of flows
(and other Power Platform components) across environments without manual solution exports.

---

## Child Flows

### What Child Flows Enable
- **Reusability**: Common logic (send Teams notification, create Dataverse record) defined once, called from many parent flows
- **Modularity**: Large flows split into focused, testable units
- **Governance**: IT team maintains approved child flows; makers consume them without editing the underlying logic
- **Concurrency**: Parent flow can call multiple child flows in parallel using parallel branches

### Requirements
- Child flow must have a **manual (instant) trigger** with `PowerApps V2` or `HTTP` kind
- Both parent and child must be in the **same environment**
- Both must be in the **same solution** (for solution-aware deployment)
- Caller must have **co-owner or run-only permission** on the child flow

---

### Defining a Child Flow (HTTP Trigger)

```json
{
  "trigger": {
    "type": "Request",
    "kind": "Http",
    "inputs": {
      "schema": {
        "type": "object",
        "required": ["recordId", "actionType"],
        "properties": {
          "recordId":   { "type": "string",  "description": "Dataverse record GUID" },
          "actionType": { "type": "string",  "description": "Action to perform" },
          "metadata":   { "type": "object",  "description": "Optional additional context" }
        }
      }
    }
  },
  "actions": {
    "Process_action": { "..." : "..." },
    "Return_response": {
      "type": "Response",
      "inputs": {
        "statusCode": 200,
        "body": {
          "success": true,
          "resultId": "@{body('Create_record')?['recordid']}",
          "message": "Processed successfully"
        },
        "schema": {
          "type": "object",
          "properties": {
            "success":  { "type": "boolean" },
            "resultId": { "type": "string" },
            "message":  { "type": "string" }
          }
        }
      }
    }
  }
}
```

---

### Calling a Child Flow from Parent (HTTP action)

```json
{
  "Call_child_flow": {
    "type": "Http",
    "inputs": {
      "method": "POST",
      "uri": "@{parameters('childFlow_URL')}",
      "body": {
        "recordId": "@{triggerBody()?['recordId']}",
        "actionType": "approve",
        "metadata": {
          "approvedBy": "@{triggerBody()?['approverEmail']}",
          "timestamp": "@{utcNow()}"
        }
      },
      "authentication": {
        "type": "ManagedServiceIdentity",
        "audience": "https://service.flow.microsoft.com/"
      }
    },
    "retryPolicy": { "type": "exponential", "count": 3, "interval": "PT5S" }
  },
  "Check_child_result": {
    "type": "If",
    "expression": "@equals(body('Call_child_flow')?['success'], true)",
    "runAfter": { "Call_child_flow": ["Succeeded"] }
  }
}
```

**Store child flow URL as environment variable** (not hardcoded) so it can differ by environment.

---

### Child Flow via "Run a Child Flow" Action (Managed Connections)

```json
{
  "Run_a_child_flow": {
    "type": "OpenApiConnection",
    "inputs": {
      "host": {
        "connection": { "name": "@parameters('$connections')['shared_flowmanagement']['connectionId']" }
      },
      "method": "post",
      "path": "/invokeFlow",
      "body": {
        "flowId": "child-flow-id",
        "environmentId": "environment-id",
        "body": {
          "text": "@{triggerBody()?['Title']}",
          "number": "@{triggerBody()?['Amount']}"
        }
      }
    }
  }
}
```

This method uses the **Power Automate Management connector** and is simpler for solution-aware flows with typed input/output.

---

### Parallel Child Flow Pattern

```
Parent flow:
  Trigger: When item created
  │
  ├── [Parallel branch 1] Call_child_notify  → Teams notification
  ├── [Parallel branch 2] Call_child_audit   → Audit log entry
  └── [Parallel branch 3] Call_child_approve → Approval workflow
  │
  Wait for all branches
  │
  Compose final status
```

```json
{
  "runAfter": {},
  "type": "OpenApiConnection",
  "inputs": { "..." : "..." }
}
```
All three child flow calls have `"runAfter": {}` (empty = run immediately in parallel).

---

## Power Platform Pipelines

### Pipeline Architecture

```
Source Environment (Dev)
  └── Pipeline Definition
        ├── Stage 1: Test/UAT  → auto-deploy on commit
        └── Stage 2: Production → requires manual approval
```

Pipelines are managed in the **Host environment** (a dedicated Dataverse environment that stores pipeline definitions and run history).

---

### Pipeline Setup via Admin Center

```powershell
# Install Power Platform Admin module
Install-Module -Name Microsoft.PowerApps.Administration.PowerShell

Add-PowerAppsAccount -TenantID "your-tenant-id"

# List environments to find IDs
Get-AdminPowerAppEnvironment | Select-Object DisplayName, EnvironmentName | Format-Table

# Assign pipeline admin role (in Host environment)
Add-AdminPowerAppEnvironmentUser `
  -EnvironmentName "host-environment-id" `
  -RoleName "EnvironmentAdmin" `
  -PrincipalType "User" `
  -PrincipalObjectId "pipeline-admin-user-id"
```

---

### REST API — Pipeline Operations

| Method | Endpoint | Permissions | Purpose |
|---|---|---|---|
| GET | `/api/data/v9.2/deploymentpaths` | Pipeline Admin | List pipeline definitions |
| POST | `/api/data/v9.2/deploymentpaths` | Pipeline Admin | Create pipeline |
| GET | `/api/data/v9.2/deploymentstages?$filter=_deploymentpathid_value eq {id}` | Pipeline Admin | List stages |
| POST | `/api/data/v9.2/deploymentstages({stageId})/Microsoft.Dynamics.CRM.TriggerDeployment` | Pipeline Admin | Deploy to stage |
| GET | `/api/data/v9.2/deploymentapplications` | Pipeline Admin | List deployment history |

---

### PowerShell — Trigger Pipeline Deployment

```powershell
$hostEnv = "https://host-environment.crm.dynamics.com"
$token = (Get-AzAccessToken -ResourceUrl $hostEnv).Token
$headers = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }

# Get pipeline stages
$pipelineId = "your-pipeline-id"
$stages = Invoke-RestMethod "$hostEnv/api/data/v9.2/deploymentstages?`$filter=_deploymentpathid_value eq $pipelineId&`$select=name,rank&`$orderby=rank asc" -Headers $headers
$stages.value | Format-Table name, rank

# Deploy solution to Test stage
$testStageId = $stages.value[0].deploymentstageid
$solutionName = "YourSolutionUniqueName"

$deployBody = @{
  SolutionUniqueName = $solutionName
  PreDeploymentStepRunId = [guid]::NewGuid().ToString()
} | ConvertTo-Json

Invoke-RestMethod "$hostEnv/api/data/v9.2/deploymentstages($testStageId)/Microsoft.Dynamics.CRM.TriggerDeployment" `
  -Method Post -Headers $headers -Body $deployBody

# Poll deployment status
do {
  Start-Sleep -Seconds 15
  $deployments = Invoke-RestMethod "$hostEnv/api/data/v9.2/deploymentapplications?`$filter=_deploymentstage_value eq $testStageId&`$orderby=createdon desc&`$top=1" -Headers $headers
  $status = $deployments.value[0].deploymentapplicationstatus
  Write-Host "Deployment status: $status"
} while ($status -eq "InProgress" -or $status -eq "Pending")

if ($status -eq "Completed") {
  Write-Host "Deployment to Test succeeded!"
} else {
  Write-Error "Deployment failed with status: $status"
}
```

---

### GitHub Actions — Pipeline CI/CD

```yaml
name: Deploy Power Platform Solution

on:
  push:
    branches: [main]

jobs:
  deploy-test:
    runs-on: ubuntu-latest
    environment: test
    steps:
      - uses: actions/checkout@v4

      - name: Install PAC CLI
        run: npm install -g @microsoft/powerplatform-cli

      - name: Authenticate to Dev environment
        run: |
          pac auth create \
            --url ${{ secrets.DEV_ENV_URL }} \
            --applicationId ${{ secrets.APP_ID }} \
            --clientSecret ${{ secrets.CLIENT_SECRET }} \
            --tenant ${{ secrets.TENANT_ID }}

      - name: Export solution from Dev
        run: |
          pac solution export \
            --name YourSolutionName \
            --path ./solution \
            --managed false \
            --async

      - name: Unpack solution
        run: |
          pac solution unpack \
            --zipfile ./solution/YourSolutionName.zip \
            --folder ./src/solution \
            --processCanvasApps true

      - name: Commit solution source
        uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: "Solution export: ${{ github.run_number }}"
          file_pattern: "src/solution/**"

  deploy-production:
    runs-on: ubuntu-latest
    environment: production  # Requires manual approval in GitHub Environments settings
    needs: deploy-test
    steps:
      - uses: actions/checkout@v4

      - name: Install PAC CLI
        run: npm install -g @microsoft/powerplatform-cli

      - name: Authenticate to Production
        run: |
          pac auth create \
            --url ${{ secrets.PROD_ENV_URL }} \
            --applicationId ${{ secrets.APP_ID }} \
            --clientSecret ${{ secrets.CLIENT_SECRET }} \
            --tenant ${{ secrets.TENANT_ID }}

      - name: Import to Production (managed)
        run: |
          pac solution import \
            --path ./solution/YourSolutionName_managed.zip \
            --async \
            --force-overwrite \
            --publish-changes

      - name: Remap connection references
        run: |
          pac connection reference update \
            --connection-reference-id ${{ secrets.SHAREPOINT_CONN_REF_ID }} \
            --connection-id ${{ secrets.PROD_SHAREPOINT_CONN_ID }}
          pac connection reference update \
            --connection-reference-id ${{ secrets.OUTLOOK_CONN_REF_ID }} \
            --connection-id ${{ secrets.PROD_OUTLOOK_CONN_ID }}
```

---

## Error Codes

| Error | Cause | Remediation |
|---|---|---|
| `ChildFlowNotFound` | Child flow ID invalid or wrong environment | Verify flow ID and environment; use environment variable |
| `ChildFlowPermissionDenied` | Caller not co-owner/run-only of child flow | Share child flow with calling flow's connection |
| `ChildFlowTriggerInvalid` | Child flow trigger not HTTP or PowerAppsV2 | Change trigger type; republish child flow |
| `PipelineStageNotFound` | Stage ID not found in host environment | Verify pipeline setup in host environment |
| `SolutionImportFailed` | Missing dependencies on target environment | Check solution dependency order; deploy dependencies first |
| `ConnectionReferenceNotMapped` | Connection not assigned after import | Run `pac connection reference update` |
| `DeploymentApprovalRequired` | Stage requires manual approval | Approve in Power Platform Pipelines UI |

---

## Limits

| Resource | Limit | Notes |
|---|---|---|
| Child flow nesting depth | 5 levels | Parent → child → grandchild (up to 5) |
| Child flow timeout | 30 days | Same as parent flow run limit |
| Child flow calls per flow run | 1,000 | Per parent run |
| Pipeline stages per pipeline | 10 | Per deployment path |
| Solution size for pipeline | 128 MB | Compressed zip |
| Concurrent pipeline deployments | 1 per stage | Sequential deployment only per stage |

---

## Production Gotchas

- **Child flow URL changes on re-import** — if you re-import a solution to a new environment,
  the HTTP trigger URL changes; always store the URL as an environment variable and update after import.
- **Child flow connection references** — child flows have their own connection references that
  must be mapped independently from the parent flow; they're not inherited.
- **Pipeline approval gates block the run** — if production approval is required and the approver
  doesn't respond, the pipeline run stays pending indefinitely; set a calendar reminder.
- **Solution layers with child flows** — if a child flow is modified in both managed and
  unmanaged layers, the unmanaged changes win; track customizations carefully to avoid
  accidental overrides during pipeline promotion.
- **`Run a child flow` action vs HTTP** — the managed `Run a child flow` action is easier to
  configure but only supports flows in the same solution; HTTP trigger is more flexible but
  requires manual URL management and authentication setup.
