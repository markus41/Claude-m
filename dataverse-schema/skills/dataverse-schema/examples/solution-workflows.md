# Solution Workflows — Complete Examples

## Prerequisites

All examples use the shared types and helpers from `table-operations.md`.

---

## Example 1: Create Solution with Publisher

Create a new publisher and solution from scratch.

```typescript
interface Publisher {
  publisherid: string;
  uniquename: string;
  friendlyname: string;
  customizationprefix: string;
  customizationoptionvalueprefix: number;
}

interface Solution {
  solutionid: string;
  uniquename: string;
  friendlyname: string;
  version: string;
}

async function createPublisherAndSolution(config: DataverseConfig): Promise<{
  publisherId: string;
  solutionId: string;
}> {
  // Step 1: Check if publisher already exists
  const existingPublishers = await apiRequest<{ value: Publisher[] }>(
    config,
    "GET",
    `publishers?$filter=uniquename eq 'contosoltd'&$select=publisherid,uniquename`
  );

  let publisherId: string;

  if (existingPublishers.value.length > 0) {
    publisherId = existingPublishers.value[0].publisherid;
    console.log(`Publisher already exists: ${publisherId}`);
  } else {
    // Create publisher
    const publisherResponse = await fetch(
      `${config.envUrl}/api/data/v9.2/publishers`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.token}`,
          "OData-MaxVersion": "4.0",
          "OData-Version": "4.0",
        },
        body: JSON.stringify({
          uniquename: "contosoltd",
          friendlyname: "Contoso Ltd",
          description: "Contoso Ltd publisher for all project management solutions",
          customizationprefix: config.prefix,
          customizationoptionvalueprefix: 10000,
        }),
      }
    );

    if (!publisherResponse.ok) {
      const error = await publisherResponse.json();
      throw new Error(`Failed to create publisher: ${JSON.stringify(error)}`);
    }

    const entityId = publisherResponse.headers.get("OData-EntityId");
    publisherId = entityId?.match(/\(([^)]+)\)/)?.[1] ?? "";
    console.log(`Publisher created: ${publisherId}`);
  }

  // Step 2: Create the solution
  const solutionResponse = await fetch(
    `${config.envUrl}/api/data/v9.2/solutions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.token}`,
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
      },
      body: JSON.stringify({
        uniquename: "ContosoProjectManagement",
        friendlyname: "Contoso Project Management",
        description: "Tables, relationships, and configuration for Contoso project management",
        version: "1.0.0.0",
        "publisherid@odata.bind": `/publishers(${publisherId})`,
      }),
    }
  );

  if (!solutionResponse.ok) {
    const error = await solutionResponse.json();
    throw new Error(`Failed to create solution: ${JSON.stringify(error)}`);
  }

  const solutionEntityId = solutionResponse.headers.get("OData-EntityId");
  const solutionId = solutionEntityId?.match(/\(([^)]+)\)/)?.[1] ?? "";
  console.log(`Solution created: ${solutionId}`);

  return { publisherId, solutionId };
}
```

---

## Example 2: Add Multiple Components to a Solution

Add existing tables, option sets, and other components to a solution.

```typescript
// Component type constants
const COMPONENT_TYPES = {
  Entity: 1,
  Attribute: 2,
  Relationship: 3,
  OptionSet: 9,
  EntityRelationship: 10,
  SecurityRole: 20,
  Form: 24,
  View: 26,
  Workflow: 29,
  WebResource: 61,
  SiteMap: 62,
  PluginAssembly: 65,
  CanvasApp: 300,
} as const;

interface SolutionComponentInfo {
  componentId: string;
  componentType: number;
  componentName: string;
}

async function addComponentsToSolution(
  config: DataverseConfig,
  components: SolutionComponentInfo[]
): Promise<void> {
  const results: Array<{ name: string; success: boolean; error?: string }> = [];

  for (const component of components) {
    try {
      await apiRequest(config, "POST", "AddSolutionComponent", {
        ComponentId: component.componentId,
        ComponentType: component.componentType,
        SolutionUniqueName: config.solutionName,
        AddRequiredComponents: false,
        DoNotIncludeSubcomponents: false,
      });
      results.push({ name: component.componentName, success: true });
    } catch (error) {
      results.push({
        name: component.componentName,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.log("\nComponent addition results:");
  for (const result of results) {
    const status = result.success ? "OK" : `FAILED: ${result.error}`;
    console.log(`  ${result.name}: ${status}`);
  }
}

// Helper: Get table MetadataId by logical name
async function getTableMetadataId(
  config: DataverseConfig,
  logicalName: string
): Promise<string> {
  const result = await apiRequest<{ MetadataId: string }>(
    config,
    "GET",
    `EntityDefinitions(LogicalName='${logicalName}')?$select=MetadataId`
  );
  return result.MetadataId;
}

// Usage example
async function addProjectComponentsToSolution(config: DataverseConfig): Promise<void> {
  // Gather component IDs
  const projectTableId = await getTableMetadataId(config, `${config.prefix}_project`);
  const taskTableId = await getTableMetadataId(config, `${config.prefix}_projecttask`);
  const resourceTableId = await getTableMetadataId(config, `${config.prefix}_resource`);

  const components: SolutionComponentInfo[] = [
    { componentId: projectTableId, componentType: COMPONENT_TYPES.Entity, componentName: "Project table" },
    { componentId: taskTableId, componentType: COMPONENT_TYPES.Entity, componentName: "ProjectTask table" },
    { componentId: resourceTableId, componentType: COMPONENT_TYPES.Entity, componentName: "Resource table" },
  ];

  await addComponentsToSolution(config, components);
}
```

---

## Example 3: Export Managed Solution

Export a solution as managed (for deployment to other environments).

### TypeScript

```typescript
import * as fs from "fs";
import * as path from "path";

interface ExportSolutionResponse {
  ExportSolutionFile: string; // base64
}

async function exportSolution(
  config: DataverseConfig,
  managed: boolean,
  outputDir: string
): Promise<string> {
  // Step 1: Get current solution version
  const solutions = await apiRequest<{ value: Solution[] }>(
    config,
    "GET",
    `solutions?$filter=uniquename eq '${config.solutionName}'&$select=version,friendlyname`
  );

  if (solutions.value.length === 0) {
    throw new Error(`Solution '${config.solutionName}' not found.`);
  }

  const solution = solutions.value[0];
  console.log(`Exporting ${solution.friendlyname} v${solution.version} (${managed ? "managed" : "unmanaged"})...`);

  // Step 2: Publish all customizations before export
  console.log("Publishing all customizations...");
  await apiRequest(config, "POST", "PublishAllXml");

  // Step 3: Export
  const exportResponse = await fetch(
    `${config.envUrl}/api/data/v9.2/ExportSolution`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.token}`,
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
      },
      body: JSON.stringify({
        SolutionName: config.solutionName,
        Managed: managed,
        ExportAutoNumberingSettings: false,
        ExportCalendarSettings: false,
        ExportCustomizationSettings: false,
        ExportEmailTrackingSettings: false,
        ExportGeneralSettings: false,
        ExportIsvConfig: false,
        ExportMarketingSettings: false,
        ExportOutlookSynchronizationSettings: false,
        ExportRelationshipRoles: false,
        ExportSales: false,
      }),
    }
  );

  if (!exportResponse.ok) {
    const error = await exportResponse.json();
    throw new Error(`Export failed: ${JSON.stringify(error)}`);
  }

  const result: ExportSolutionResponse = await exportResponse.json();

  // Step 4: Write to file
  const suffix = managed ? "_managed" : "";
  const versionSlug = solution.version.replace(/\./g, "_");
  const fileName = `${config.solutionName}${suffix}_${versionSlug}.zip`;
  const filePath = path.join(outputDir, fileName);

  const buffer = Buffer.from(result.ExportSolutionFile, "base64");
  fs.writeFileSync(filePath, buffer);

  console.log(`Solution exported to: ${filePath} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
  return filePath;
}
```

### Bash/Curl Equivalent

```bash
#!/usr/bin/env bash
set -euo pipefail

ENV_URL="https://org12345.crm.dynamics.com"
SOLUTION_NAME="ContosoProjectManagement"
TOKEN="<your-bearer-token>"
OUTPUT_DIR="./solutions"

mkdir -p "$OUTPUT_DIR"

# Publish all customizations
echo "Publishing customizations..."
curl -s -X POST "${ENV_URL}/api/data/v9.2/PublishAllXml" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0"

# Export managed solution
echo "Exporting managed solution..."
RESPONSE=$(curl -s -X POST "${ENV_URL}/api/data/v9.2/ExportSolution" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -d '{
    "SolutionName": "'"${SOLUTION_NAME}"'",
    "Managed": true
  }')

# Extract base64 and decode to zip
echo "$RESPONSE" | jq -r '.ExportSolutionFile' | base64 -d > "${OUTPUT_DIR}/${SOLUTION_NAME}_managed.zip"
echo "Exported to ${OUTPUT_DIR}/${SOLUTION_NAME}_managed.zip"

# Export unmanaged solution
echo "Exporting unmanaged solution..."
RESPONSE=$(curl -s -X POST "${ENV_URL}/api/data/v9.2/ExportSolution" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -d '{
    "SolutionName": "'"${SOLUTION_NAME}"'",
    "Managed": false
  }')

echo "$RESPONSE" | jq -r '.ExportSolutionFile' | base64 -d > "${OUTPUT_DIR}/${SOLUTION_NAME}_unmanaged.zip"
echo "Exported to ${OUTPUT_DIR}/${SOLUTION_NAME}_unmanaged.zip"
```

---

## Example 4: Import Solution with Async Status Polling

Import a solution into a target environment with progress monitoring.

```typescript
import * as fs from "fs";

interface AsyncOperation {
  asyncoperationid: string;
  statuscode: number;
  message: string;
  friendlymessage: string;
  completedon: string | null;
}

const ASYNC_STATUS: Record<number, string> = {
  0: "Waiting for Resources",
  10: "Waiting",
  20: "In Progress",
  21: "Pausing",
  22: "Canceling",
  30: "Succeeded",
  31: "Failed",
  32: "Canceled",
};

async function importSolution(
  targetConfig: DataverseConfig,
  solutionZipPath: string,
  overwriteCustomizations = true
): Promise<void> {
  // Step 1: Read and encode the solution file
  const fileBuffer = fs.readFileSync(solutionZipPath);
  const base64Content = fileBuffer.toString("base64");
  console.log(`Read solution file: ${solutionZipPath} (${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB)`);

  // Step 2: Submit async import
  console.log("Submitting async import...");
  const importResponse = await fetch(
    `${targetConfig.envUrl}/api/data/v9.2/ImportSolutionAsync`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${targetConfig.token}`,
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
      },
      body: JSON.stringify({
        CustomizationFile: base64Content,
        OverwriteUnmanagedCustomizations: overwriteCustomizations,
        PublishWorkflows: true,
        ConvertToManaged: false,
        SkipProductUpdateDependencies: false,
        HoldingSolution: false,
      }),
    }
  );

  if (!importResponse.ok) {
    const error = await importResponse.json();
    throw new Error(`Import request failed: ${JSON.stringify(error)}`);
  }

  const importResult = await importResponse.json();
  const asyncOpId: string = importResult.AsyncOperationId;
  console.log(`Import started. Async Operation ID: ${asyncOpId}`);

  // Step 3: Poll for status
  let status: AsyncOperation | null = null;
  let lastStatusCode = -1;

  while (true) {
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Poll every 5 seconds

    const statusResponse = await fetch(
      `${targetConfig.envUrl}/api/data/v9.2/asyncoperations(${asyncOpId})?$select=statuscode,message,friendlymessage,completedon`,
      {
        headers: {
          Authorization: `Bearer ${targetConfig.token}`,
          "OData-MaxVersion": "4.0",
          "OData-Version": "4.0",
        },
      }
    );

    status = await statusResponse.json() as AsyncOperation;
    const statusName = ASYNC_STATUS[status.statuscode] ?? `Unknown (${status.statuscode})`;

    if (status.statuscode !== lastStatusCode) {
      console.log(`  Status: ${statusName}`);
      lastStatusCode = status.statuscode;
    }

    // Terminal states
    if (status.statuscode >= 30) {
      break;
    }
  }

  // Step 4: Report result
  if (status?.statuscode === 30) {
    console.log(`\nImport SUCCEEDED at ${status.completedon}`);
  } else if (status?.statuscode === 31) {
    console.error(`\nImport FAILED: ${status.message || status.friendlymessage}`);
    throw new Error(`Solution import failed: ${status.message}`);
  } else {
    console.warn(`\nImport ended with status: ${ASYNC_STATUS[status?.statuscode ?? -1]}`);
  }
}
```

---

## Example 5: Promote Solution — Dev to Test to Prod Pipeline

Full pipeline: export from dev, import to test, then promote to prod.

```typescript
interface EnvironmentConfig {
  name: string;
  envUrl: string;
  token: string;
}

interface PipelineConfig {
  solutionName: string;
  prefix: string;
  environments: {
    dev: EnvironmentConfig;
    test: EnvironmentConfig;
    prod: EnvironmentConfig;
  };
  outputDir: string;
}

async function promoteSolution(pipeline: PipelineConfig): Promise<void> {
  const { solutionName, environments, outputDir } = pipeline;

  // Step 1: Bump version in dev
  console.log("=== Step 1: Bump solution version in DEV ===");
  const devConfig: DataverseConfig = {
    envUrl: environments.dev.envUrl,
    token: environments.dev.token,
    solutionName,
    prefix: pipeline.prefix,
  };

  const solutions = await apiRequest<{ value: Array<{ solutionid: string; version: string }> }>(
    devConfig,
    "GET",
    `solutions?$filter=uniquename eq '${solutionName}'&$select=solutionid,version`
  );

  if (solutions.value.length === 0) {
    throw new Error(`Solution '${solutionName}' not found in DEV`);
  }

  const currentVersion = solutions.value[0].version;
  const versionParts = currentVersion.split(".").map(Number);
  versionParts[2] += 1; // Increment build number
  const newVersion = versionParts.join(".");

  await apiRequest(
    devConfig,
    "PATCH",
    `solutions(${solutions.value[0].solutionid})`,
    { version: newVersion }
  );
  console.log(`  Version bumped: ${currentVersion} -> ${newVersion}`);

  // Step 2: Export unmanaged from dev (for backup)
  console.log("\n=== Step 2: Export unmanaged from DEV (backup) ===");
  await exportSolution(devConfig, false, outputDir);

  // Step 3: Export managed from dev (for deployment)
  console.log("\n=== Step 3: Export managed from DEV (for deployment) ===");
  const managedZipPath = await exportSolution(devConfig, true, outputDir);

  // Step 4: Import managed to test
  console.log("\n=== Step 4: Import managed solution to TEST ===");
  const testConfig: DataverseConfig = {
    envUrl: environments.test.envUrl,
    token: environments.test.token,
    solutionName,
    prefix: pipeline.prefix,
  };
  await importSolution(testConfig, managedZipPath, true);

  // Step 5: Validation gate (placeholder)
  console.log("\n=== Step 5: Validation ===");
  console.log("  Run test suite against TEST environment...");
  console.log("  (Insert your test framework execution here)");

  // Step 6: Import managed to prod
  console.log("\n=== Step 6: Import managed solution to PROD ===");
  const prodConfig: DataverseConfig = {
    envUrl: environments.prod.envUrl,
    token: environments.prod.token,
    solutionName,
    prefix: pipeline.prefix,
  };
  await importSolution(prodConfig, managedZipPath, true);

  console.log("\n=== Pipeline Complete ===");
  console.log(`  Solution: ${solutionName}`);
  console.log(`  Version: ${newVersion}`);
  console.log(`  Deployed to: TEST, PROD`);
}

// Usage
async function runPipeline(): Promise<void> {
  const pipeline: PipelineConfig = {
    solutionName: "ContosoProjectManagement",
    prefix: "cr123",
    environments: {
      dev: {
        name: "Development",
        envUrl: "https://org-dev.crm.dynamics.com",
        token: process.env.DEV_TOKEN ?? "",
      },
      test: {
        name: "Test",
        envUrl: "https://org-test.crm.dynamics.com",
        token: process.env.TEST_TOKEN ?? "",
      },
      prod: {
        name: "Production",
        envUrl: "https://org-prod.crm.dynamics.com",
        token: process.env.PROD_TOKEN ?? "",
      },
    },
    outputDir: "./solution-artifacts",
  };

  await promoteSolution(pipeline);
}
```

### Bash Script for CI/CD

```bash
#!/usr/bin/env bash
set -euo pipefail

# --- Configuration ---
SOLUTION_NAME="ContosoProjectManagement"
DEV_URL="https://org-dev.crm.dynamics.com"
TEST_URL="https://org-test.crm.dynamics.com"
PROD_URL="https://org-prod.crm.dynamics.com"
OUTPUT_DIR="./artifacts"
mkdir -p "$OUTPUT_DIR"

# --- Authentication (using client credentials) ---
get_token() {
  local tenant_id="$1"
  local client_id="$2"
  local client_secret="$3"
  local resource="$4"

  curl -s -X POST "https://login.microsoftonline.com/${tenant_id}/oauth2/v2.0/token" \
    -d "grant_type=client_credentials" \
    -d "client_id=${client_id}" \
    -d "client_secret=${client_secret}" \
    -d "scope=${resource}/.default" \
    | jq -r '.access_token'
}

DEV_TOKEN=$(get_token "$TENANT_ID" "$CLIENT_ID" "$CLIENT_SECRET" "$DEV_URL")
TEST_TOKEN=$(get_token "$TENANT_ID" "$CLIENT_ID" "$CLIENT_SECRET" "$TEST_URL")

# --- Export from DEV ---
echo "Exporting managed solution from DEV..."
EXPORT_RESPONSE=$(curl -s -X POST "${DEV_URL}/api/data/v9.2/ExportSolution" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${DEV_TOKEN}" \
  -H "OData-MaxVersion: 4.0" \
  -d '{"SolutionName":"'"${SOLUTION_NAME}"'","Managed":true}')

echo "$EXPORT_RESPONSE" | jq -r '.ExportSolutionFile' | base64 -d > "${OUTPUT_DIR}/${SOLUTION_NAME}_managed.zip"
echo "Exported: ${OUTPUT_DIR}/${SOLUTION_NAME}_managed.zip"

# --- Import to TEST ---
echo "Importing to TEST..."
SOLUTION_BASE64=$(base64 -w 0 "${OUTPUT_DIR}/${SOLUTION_NAME}_managed.zip")

IMPORT_RESPONSE=$(curl -s -X POST "${TEST_URL}/api/data/v9.2/ImportSolutionAsync" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TEST_TOKEN}" \
  -H "OData-MaxVersion: 4.0" \
  -d '{"CustomizationFile":"'"${SOLUTION_BASE64}"'","OverwriteUnmanagedCustomizations":true,"PublishWorkflows":true}')

ASYNC_OP_ID=$(echo "$IMPORT_RESPONSE" | jq -r '.AsyncOperationId')
echo "Async Operation: ${ASYNC_OP_ID}"

# --- Poll for completion ---
while true; do
  sleep 10
  STATUS=$(curl -s "${TEST_URL}/api/data/v9.2/asyncoperations(${ASYNC_OP_ID})?\$select=statuscode,message" \
    -H "Authorization: Bearer ${TEST_TOKEN}" \
    -H "OData-MaxVersion: 4.0" \
    | jq -r '.statuscode')

  echo "  Status: ${STATUS}"

  if [ "$STATUS" -eq 30 ]; then
    echo "Import SUCCEEDED."
    break
  elif [ "$STATUS" -eq 31 ]; then
    echo "Import FAILED."
    exit 1
  elif [ "$STATUS" -eq 32 ]; then
    echo "Import CANCELED."
    exit 1
  fi
done
```
