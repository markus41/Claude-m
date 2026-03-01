# CI/CD Flow Provisioning Examples

Patterns for deploying Power Automate flows via code in CI/CD pipelines, environment promotion, and template-based rollout.

## 1. TypeScript: Create and Enable a Flow

End-to-end example using the Dataverse Web API from a Node.js script.

```typescript
import { ClientSecretCredential } from "@azure/identity";

// Configuration — typically from environment variables or CI secrets
const config = {
  tenantId: process.env.AZURE_TENANT_ID!,
  clientId: process.env.AZURE_CLIENT_ID!,
  clientSecret: process.env.AZURE_CLIENT_SECRET!,
  orgUrl: process.env.DATAVERSE_ORG_URL! // e.g., https://contoso.crm.dynamics.com
};

const credential = new ClientSecretCredential(
  config.tenantId,
  config.clientId,
  config.clientSecret
);

async function getToken(): Promise<string> {
  const response = await credential.getToken(`${config.orgUrl}/.default`);
  return response.token;
}

async function createAndEnableFlow(
  name: string,
  description: string,
  clientdata: object
): Promise<string> {
  const token = await getToken();
  const headers = {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
    "OData-MaxVersion": "4.0",
    "OData-Version": "4.0",
    "Prefer": "return=representation"
  };

  // Step 1: Create flow (draft)
  console.log(`Creating flow: ${name}...`);
  const createResponse = await fetch(`${config.orgUrl}/api/data/v9.2/workflows`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      category: 5,
      type: 1,
      primaryentity: "none",
      name,
      description,
      clientdata: JSON.stringify(clientdata)
    })
  });

  if (!createResponse.ok) {
    const error = await createResponse.text();
    throw new Error(`Create failed (${createResponse.status}): ${error}`);
  }

  const workflow = await createResponse.json();
  const workflowId: string = workflow.workflowid;
  console.log(`Created flow: ${workflowId} (draft)`);

  // Step 2: Enable flow
  console.log(`Enabling flow...`);
  const enableResponse = await fetch(
    `${config.orgUrl}/api/data/v9.2/workflows(${workflowId})`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({ statecode: 1, statuscode: 2 })
    }
  );

  if (!enableResponse.ok) {
    const error = await enableResponse.text();
    throw new Error(`Enable failed (${enableResponse.status}): ${error}`);
  }

  console.log(`Flow enabled: ${workflowId}`);
  return workflowId;
}

// Usage
const flowDefinition = {
  properties: {
    definition: {
      "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
      contentVersion: "1.0.0.0",
      parameters: {
        "$connections": { defaultValue: {}, type: "Object" },
        "$authentication": { defaultValue: {}, type: "SecureObject" }
      },
      triggers: {
        Recurrence: {
          type: "Recurrence",
          recurrence: { frequency: "Day", interval: 1 }
        }
      },
      actions: {
        Run_script: {
          type: "OpenApiConnection",
          inputs: {
            host: {
              connectionName: "shared_excelonlinebusiness",
              operationId: "RunScript",
              apiId: "/providers/Microsoft.PowerApps/apis/shared_excelonlinebusiness"
            },
            parameters: {
              source: "me",
              drive: "{driveId}",
              file: "{fileId}",
              scriptId: "{scriptId}"
            },
            authentication: "@parameters('$authentication')"
          },
          runAfter: {}
        }
      },
      outputs: {}
    },
    connectionReferences: {
      shared_excelonlinebusiness: {
        connectionName: "shared-excelonlinebusi-{guid}",
        source: "Invoker",
        id: "/providers/Microsoft.PowerApps/apis/shared_excelonlinebusiness",
        tier: "NotSpecified"
      }
    }
  },
  schemaVersion: "1.0.0.0"
};

createAndEnableFlow(
  "Daily Report Generator",
  "Runs daily to generate sales report via Office Script",
  flowDefinition
).then(id => console.log(`Done: ${id}`))
  .catch(err => console.error(err));
```

## 2. REST: curl-Based Deployment Script

For CI/CD pipelines using bash/shell.

```bash
#!/bin/bash
set -euo pipefail

# Configuration (from CI environment variables)
TENANT_ID="${AZURE_TENANT_ID}"
CLIENT_ID="${AZURE_CLIENT_ID}"
CLIENT_SECRET="${AZURE_CLIENT_SECRET}"
ORG_URL="${DATAVERSE_ORG_URL}"  # e.g., https://contoso.crm.dynamics.com

# Step 1: Get access token
echo "Authenticating..."
TOKEN_RESPONSE=$(curl -s -X POST \
  "https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&scope=${ORG_URL}/.default&grant_type=client_credentials")

ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token')
if [ "$ACCESS_TOKEN" = "null" ] || [ -z "$ACCESS_TOKEN" ]; then
  echo "Authentication failed"
  echo "$TOKEN_RESPONSE" | jq .
  exit 1
fi

# Step 2: Read flow definition from file
CLIENTDATA=$(cat flow-definition.json | jq -c .)

# Step 3: Create the flow
echo "Creating flow..."
CREATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "${ORG_URL}/api/data/v9.2/workflows" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -H "Prefer: return=representation" \
  -d "{
    \"category\": 5,
    \"type\": 1,
    \"primaryentity\": \"none\",
    \"name\": \"${FLOW_NAME:-Deployed Flow}\",
    \"description\": \"Deployed via CI/CD pipeline\",
    \"clientdata\": $(echo "$CLIENTDATA" | jq -Rs .)
  }")

HTTP_CODE=$(echo "$CREATE_RESPONSE" | tail -1)
BODY=$(echo "$CREATE_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "201" ]; then
  echo "Create failed: HTTP ${HTTP_CODE}"
  echo "$BODY" | jq .
  exit 1
fi

WORKFLOW_ID=$(echo "$BODY" | jq -r '.workflowid')
echo "Created: ${WORKFLOW_ID}"

# Step 4: Enable the flow
echo "Enabling flow..."
ENABLE_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH \
  "${ORG_URL}/api/data/v9.2/workflows(${WORKFLOW_ID})" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -d '{"statecode": 1, "statuscode": 2}')

if [ "$ENABLE_CODE" != "204" ]; then
  echo "Enable failed: HTTP ${ENABLE_CODE}"
  exit 1
fi

echo "Flow deployed and enabled: ${WORKFLOW_ID}"
```

## 3. Environment Promotion Pattern

Deploy the same flow definition across dev → staging → prod, with environment-specific connection names.

### Environment Config Files

```json
// environments/dev.json
{
  "orgUrl": "https://contoso-dev.crm.dynamics.com",
  "connections": {
    "shared_excelonlinebusiness": "shared-excelonlinebusi-dev-{guid}",
    "shared_office365": "shared-office365-dev-{guid}"
  },
  "parameters": {
    "driveId": "{dev-drive-id}",
    "fileId": "{dev-file-id}",
    "scriptId": "{dev-script-id}"
  }
}

// environments/prod.json
{
  "orgUrl": "https://contoso.crm.dynamics.com",
  "connections": {
    "shared_excelonlinebusiness": "shared-excelonlinebusi-prod-{guid}",
    "shared_office365": "shared-office365-prod-{guid}"
  },
  "parameters": {
    "driveId": "{prod-drive-id}",
    "fileId": "{prod-file-id}",
    "scriptId": "{prod-script-id}"
  }
}
```

### Template with Placeholders

```json
// templates/daily-report.json
{
  "properties": {
    "definition": {
      "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
      "contentVersion": "1.0.0.0",
      "parameters": {
        "$connections": { "defaultValue": {}, "type": "Object" },
        "$authentication": { "defaultValue": {}, "type": "SecureObject" }
      },
      "triggers": {
        "Recurrence": {
          "type": "Recurrence",
          "recurrence": { "frequency": "Day", "interval": 1 }
        }
      },
      "actions": {
        "Run_script": {
          "type": "OpenApiConnection",
          "inputs": {
            "host": {
              "connectionName": "shared_excelonlinebusiness",
              "operationId": "RunScript",
              "apiId": "/providers/Microsoft.PowerApps/apis/shared_excelonlinebusiness"
            },
            "parameters": {
              "source": "me",
              "drive": "{{driveId}}",
              "file": "{{fileId}}",
              "scriptId": "{{scriptId}}"
            },
            "authentication": "@parameters('$authentication')"
          },
          "runAfter": {}
        }
      },
      "outputs": {}
    },
    "connectionReferences": {
      "shared_excelonlinebusiness": {
        "connectionName": "{{connections.shared_excelonlinebusiness}}",
        "source": "Invoker",
        "id": "/providers/Microsoft.PowerApps/apis/shared_excelonlinebusiness",
        "tier": "NotSpecified"
      }
    }
  },
  "schemaVersion": "1.0.0.0"
}
```

### TypeScript Deployer with Template Resolution

```typescript
import * as fs from "fs";

interface EnvironmentConfig {
  orgUrl: string;
  connections: Record<string, string>;
  parameters: Record<string, string>;
}

function resolveTemplate(template: string, envConfig: EnvironmentConfig): string {
  let resolved = template;

  // Replace connection references
  for (const [key, value] of Object.entries(envConfig.connections)) {
    resolved = resolved.replace(
      new RegExp(`\\{\\{connections\\.${key}\\}\\}`, "g"),
      value
    );
  }

  // Replace parameters
  for (const [key, value] of Object.entries(envConfig.parameters)) {
    resolved = resolved.replace(
      new RegExp(`\\{\\{${key}\\}\\}`, "g"),
      value
    );
  }

  return resolved;
}

async function deployToEnvironment(
  templatePath: string,
  envConfigPath: string,
  flowName: string
): Promise<string> {
  const template = fs.readFileSync(templatePath, "utf-8");
  const envConfig: EnvironmentConfig = JSON.parse(
    fs.readFileSync(envConfigPath, "utf-8")
  );

  const resolvedJson = resolveTemplate(template, envConfig);
  const clientdata = JSON.parse(resolvedJson);

  // Use the createAndEnableFlow function from Example 1
  const workflowId = await createAndEnableFlow(
    flowName,
    `Deployed to ${envConfigPath}`,
    clientdata
  );

  return workflowId;
}

// Deploy to all environments
async function promoteFlow(templatePath: string, flowName: string): Promise<void> {
  const environments = ["dev", "staging", "prod"];

  for (const env of environments) {
    console.log(`\n=== Deploying to ${env} ===`);
    try {
      const id = await deployToEnvironment(
        templatePath,
        `environments/${env}.json`,
        `${flowName} (${env})`
      );
      console.log(`${env}: ${id}`);
    } catch (error) {
      console.error(`${env} deployment failed:`, error);
      if (env === "prod") throw error; // Fail pipeline on prod failure
    }
  }
}
```

## 4. Idempotent Deploy (Update or Create)

Check if the flow exists before creating; update if it does.

```typescript
async function deployFlowIdempotent(
  orgUrl: string,
  token: string,
  flowName: string,
  clientdata: object
): Promise<{ workflowId: string; action: "created" | "updated" }> {
  const headers = {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
    "OData-MaxVersion": "4.0",
    "OData-Version": "4.0"
  };

  // Check if flow exists
  const filter = encodeURIComponent(`category eq 5 and name eq '${flowName}'`);
  const listResponse = await fetch(
    `${orgUrl}/api/data/v9.2/workflows?$filter=${filter}&$select=workflowid,statecode`,
    { headers }
  );
  const listData = await listResponse.json();

  if (listData.value && listData.value.length > 0) {
    // Flow exists — update it
    const workflowId = listData.value[0].workflowid;
    const wasEnabled = listData.value[0].statecode === 1;

    // Disable if needed
    if (wasEnabled) {
      await fetch(`${orgUrl}/api/data/v9.2/workflows(${workflowId})`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ statecode: 0, statuscode: 1 })
      });
    }

    // Update definition
    await fetch(`${orgUrl}/api/data/v9.2/workflows(${workflowId})`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ clientdata: JSON.stringify(clientdata) })
    });

    // Re-enable
    await fetch(`${orgUrl}/api/data/v9.2/workflows(${workflowId})`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ statecode: 1, statuscode: 2 })
    });

    return { workflowId, action: "updated" };
  } else {
    // Flow does not exist — create it
    const createResponse = await fetch(`${orgUrl}/api/data/v9.2/workflows`, {
      method: "POST",
      headers: { ...headers, "Prefer": "return=representation" },
      body: JSON.stringify({
        category: 5,
        type: 1,
        primaryentity: "none",
        name: flowName,
        clientdata: JSON.stringify(clientdata)
      })
    });

    const workflow = await createResponse.json();
    const workflowId = workflow.workflowid;

    // Enable
    await fetch(`${orgUrl}/api/data/v9.2/workflows(${workflowId})`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ statecode: 1, statuscode: 2 })
    });

    return { workflowId, action: "created" };
  }
}
```

## 5. GitHub Actions Workflow

```yaml
name: Deploy Power Automate Flow
on:
  push:
    branches: [main]
    paths:
      - 'flows/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: [dev, staging, prod]
    environment: ${{ matrix.environment }}
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Deploy flow
        env:
          AZURE_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
          AZURE_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
          AZURE_CLIENT_SECRET: ${{ secrets.AZURE_CLIENT_SECRET }}
          DATAVERSE_ORG_URL: ${{ vars.DATAVERSE_ORG_URL }}
        run: |
          npx tsx scripts/deploy-flow.ts \
            --template flows/daily-report.json \
            --env environments/${{ matrix.environment }}.json \
            --name "Daily Report (${{ matrix.environment }})"
```
