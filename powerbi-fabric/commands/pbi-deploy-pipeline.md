---
name: pbi-deploy-pipeline
description: >
  Generate TypeScript for Azure DevOps / Power BI deployment pipeline automation —
  list pipeline stages and artifacts, deploy datasets and reports from Dev→Test or
  Test→Prod, and poll the operation until complete.
argument-hint: "<pipeline-id> [--from-stage 0|1] [--datasets <id,...>] [--reports <id,...>] [--allow-create]"
allowed-tools:
  - Read
  - Write
  - Edit
---

# Power BI Deployment Pipeline Automation

Generate complete TypeScript code for automating Power BI deployment pipeline operations.

## Parsing Arguments

Parse from `$ARGUMENTS`:
- `pipeline-id` (required): The Power BI deployment pipeline GUID
- `--from-stage`: Source stage number -- `0` = Dev, `1` = Test (default: `0`, meaning deploy Dev to Test)
- `--datasets <id,...>`: Optional comma-separated dataset GUIDs to deploy selectively
- `--reports <id,...>`: Optional comma-separated report GUIDs to deploy selectively
- `--allow-create`: If present, allow new artifacts to be created in the target stage

## Output 1: Environment Variables

```
AZURE_TENANT_ID=<your-tenant-id>
AZURE_CLIENT_ID=<your-client-id>
AZURE_CLIENT_SECRET=<your-client-secret>
PBI_PIPELINE_ID=<pipeline-id-from-argument>
```

## Output 2: TypeScript Deployment Script

Generate a complete TypeScript file `pbi-deploy-pipeline.ts`:

### Step 1: Authentication
- Use MSAL `ConfidentialClientApplication` to acquire token for `https://analysis.windows.net/powerbi/api/.default`

### Step 2: List Artifacts (if no artifact IDs provided)
If neither `--datasets` nor `--reports` is provided, generate code to:
- Call `GET https://api.powerbi.com/v1.0/myorg/pipelines/{pipelineId}/stages/{stageOrder}/artifacts`
- Extract dataset IDs from `artifacts.datasets[].artifactId`
- Extract report IDs from `artifacts.reports[].artifactId`
- Include all in the deployment call

### Step 3: Deploy

Generate the deployment request:

**If specific artifact IDs provided (selective deploy)**:
```
POST https://api.powerbi.com/v1.0/myorg/pipelines/{pipelineId}/stages/{sourceStage}/deploy
Body:
{
  "sourceStageOrder": <fromStage>,
  "datasets": [{ "sourceId": "<datasetId>" }],
  "reports": [{ "sourceId": "<reportId>" }],
  "options": {
    "allowOverwriteArtifact": true,
    "allowCreateArtifact": <--allow-create flag value>,
    "allowPurgeData": false
  }
}
```

**If no artifact IDs (deploy all)**:
```
POST https://api.powerbi.com/v1.0/myorg/pipelines/{pipelineId}/deployAll
Body:
{
  "sourceStageOrder": <fromStage>,
  "options": {
    "allowOverwriteArtifact": true,
    "allowCreateArtifact": <--allow-create flag value>,
    "allowPurgeData": false
  }
}
```

**IMPORTANT**: Add a comment warning about `allowPurgeData`:
```typescript
// WARNING: allowPurgeData: true would delete data in the target dataset before deploying.
// This is a DESTRUCTIVE operation. Keep this false unless you explicitly need it.
// Set to true only when deploying schema-breaking changes and you accept data loss in target stage.
```

### Step 4: Poll Operation Until Complete

The deploy endpoints return 202 with an `operationId`. Generate polling code:
```typescript
async function pollOperation(pipelineId: string, operationId: string, token: string): Promise<void> {
  const maxAttempts = 60; // 10 minutes at 10-second intervals
  let attempt = 0;

  while (attempt < maxAttempts) {
    const response = await fetch(
      `https://api.powerbi.com/v1.0/myorg/pipelines/${pipelineId}/operations/${operationId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const operation = await response.json();

    if (operation.status === 'Succeeded') {
      console.log('Deployment succeeded');
      return;
    }

    if (operation.status === 'Failed') {
      throw new Error(`Deployment failed: ${JSON.stringify(operation.error)}`);
    }

    console.log(`Status: ${operation.status}. Waiting 10 seconds...`);
    await new Promise(r => setTimeout(r, 10000));
    attempt++;
  }

  throw new Error('Deployment timed out after 10 minutes');
}
```

### Step 5: Full Pipeline Script Assembly

Assemble a complete runnable script with:
1. MSAL authentication
2. Optional: list artifacts if no IDs provided
3. Deploy call (selective or deployAll)
4. Poll loop
5. Final success/failure log with deployment stage info (e.g., "Dev -> Test deployment complete")

## Reference

Read `skills/powerbi-analytics/references/pbi-rest-api.md` Deployment Pipelines section for endpoint details.

Note: If pbi-rest-api.md does not yet have a Deployment Pipelines section, add a comment in the generated code pointing to the official docs:
```typescript
// Docs: https://learn.microsoft.com/en-us/rest/api/power-bi/pipelines
```
