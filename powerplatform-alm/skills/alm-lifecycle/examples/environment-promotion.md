# Environment Promotion Examples

## Example 1: TypeScript Promotion Script

Complete TypeScript script that exports from dev, validates with solution checker, imports to test, waits for approval, then imports to production.

```typescript
import { ConfidentialClientApplication } from "@azure/msal-node";
import * as fs from "fs";
import * as path from "path";

// ─── Configuration ───────────────────────────────────────────

interface EnvironmentConfig {
  name: string;
  url: string;
  deploymentSettingsPath: string;
}

interface PromotionConfig {
  solutionName: string;
  tenantId: string;
  clientId: string;
  clientSecret: string;
  version: string;
  outputDirectory: string;
  dev: EnvironmentConfig;
  test: EnvironmentConfig;
  prod: EnvironmentConfig;
}

const config: PromotionConfig = {
  solutionName: "ContosoOrders",
  tenantId: process.env.TENANT_ID!,
  clientId: process.env.CLIENT_ID!,
  clientSecret: process.env.CLIENT_SECRET!,
  version: process.env.BUILD_VERSION || "1.0.0.0",
  outputDirectory: "./promotion-output",
  dev: {
    name: "Development",
    url: "https://contoso-dev.crm.dynamics.com",
    deploymentSettingsPath: "",
  },
  test: {
    name: "Test",
    url: "https://contoso-test.crm.dynamics.com",
    deploymentSettingsPath: "./deployment-settings/test.json",
  },
  prod: {
    name: "Production",
    url: "https://contoso.crm.dynamics.com",
    deploymentSettingsPath: "./deployment-settings/prod.json",
  },
};

// ─── Authentication ──────────────────────────────────────────

async function getAccessToken(orgUrl: string): Promise<string> {
  const msalConfig = {
    auth: {
      clientId: config.clientId,
      authority: `https://login.microsoftonline.com/${config.tenantId}`,
      clientSecret: config.clientSecret,
    },
  };

  const cca = new ConfidentialClientApplication(msalConfig);
  const result = await cca.acquireTokenByClientCredential({
    scopes: [`${orgUrl}/.default`],
  });

  if (!result?.accessToken) {
    throw new Error(`Failed to acquire token for ${orgUrl}`);
  }

  return result.accessToken;
}

// ─── Solution Export ─────────────────────────────────────────

async function exportSolution(
  orgUrl: string,
  accessToken: string,
  solutionName: string,
  managed: boolean
): Promise<Buffer> {
  console.log(`  Exporting ${solutionName} (managed: ${managed}) from ${orgUrl}...`);

  const response = await fetch(`${orgUrl}/api/data/v9.2/ExportSolution`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
    },
    body: JSON.stringify({
      SolutionName: solutionName,
      Managed: managed,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Export failed (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  const buffer = Buffer.from(result.ExportSolutionFile, "base64");
  console.log(`  Exported: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
  return buffer;
}

// ─── Solution Import ─────────────────────────────────────────

async function importSolutionAsync(
  orgUrl: string,
  accessToken: string,
  solutionZip: Buffer,
  holdingSolution: boolean = false
): Promise<string> {
  console.log(`  Importing solution to ${orgUrl} (holding: ${holdingSolution})...`);

  const response = await fetch(
    `${orgUrl}/api/data/v9.2/ImportSolutionAsync`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
      },
      body: JSON.stringify({
        OverwriteUnmanagedCustomizations: true,
        PublishWorkflows: true,
        CustomizationFile: solutionZip.toString("base64"),
        HoldingSolution: holdingSolution,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Import request failed (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  return result.AsyncOperationId;
}

// ─── Poll Async Operation ────────────────────────────────────

interface AsyncOperationResult {
  statuscode: number;
  statecode: number;
  message: string;
  friendlymessage: string;
}

async function pollAsyncOperation(
  orgUrl: string,
  accessToken: string,
  asyncOpId: string,
  pollIntervalMs: number = 15000,
  maxWaitMs: number = 900000
): Promise<AsyncOperationResult> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const response = await fetch(
      `${orgUrl}/api/data/v9.2/asyncoperations(${asyncOpId})?$select=statuscode,statecode,message,friendlymessage`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "OData-MaxVersion": "4.0",
          "OData-Version": "4.0",
        },
      }
    );

    const operation: AsyncOperationResult = await response.json();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    console.log(`  [${elapsed}s] Status code: ${operation.statuscode}`);

    if (operation.statuscode === 30) {
      console.log("  Import succeeded.");
      return operation;
    }

    if (operation.statuscode === 31) {
      throw new Error(
        `Import failed: ${operation.message || operation.friendlymessage}`
      );
    }

    if (operation.statuscode === 32) {
      throw new Error("Import was canceled.");
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Import timed out after ${maxWaitMs / 1000} seconds`);
}

// ─── Publish Customizations ──────────────────────────────────

async function publishCustomizations(
  orgUrl: string,
  accessToken: string
): Promise<void> {
  console.log(`  Publishing customizations in ${orgUrl}...`);

  await fetch(`${orgUrl}/api/data/v9.2/PublishAllXml`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  console.log("  Published.");
}

// ─── Apply Solution Upgrade ──────────────────────────────────

async function applySolutionUpgrade(
  orgUrl: string,
  accessToken: string,
  solutionName: string
): Promise<void> {
  console.log(`  Applying upgrade for ${solutionName}...`);

  const response = await fetch(
    `${orgUrl}/api/data/v9.2/DeleteAndPromote`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        UniqueName: solutionName,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upgrade failed (${response.status}): ${errorText}`);
  }

  console.log("  Upgrade applied.");
}

// ─── Promotion Report ────────────────────────────────────────

interface PromotionStep {
  step: string;
  environment: string;
  status: "success" | "failed" | "skipped";
  duration: number;
  details: string;
}

function generateReport(
  steps: PromotionStep[],
  config: PromotionConfig
): string {
  const now = new Date().toISOString();
  let report = `# Promotion Report\n\n`;
  report += `| Property | Value |\n|----------|-------|\n`;
  report += `| Solution | ${config.solutionName} |\n`;
  report += `| Version | ${config.version} |\n`;
  report += `| Timestamp | ${now} |\n\n`;
  report += `## Steps\n\n`;
  report += `| # | Step | Environment | Status | Duration |\n`;
  report += `|---|------|-------------|--------|----------|\n`;

  steps.forEach((s, i) => {
    const statusIcon = s.status === "success" ? "PASS" : s.status === "failed" ? "FAIL" : "SKIP";
    report += `| ${i + 1} | ${s.step} | ${s.environment} | ${statusIcon} | ${s.duration}s |\n`;
  });

  report += `\n## Details\n\n`;
  steps.forEach((s, i) => {
    report += `### Step ${i + 1}: ${s.step}\n${s.details}\n\n`;
  });

  return report;
}

// ─── Main Promotion Pipeline ─────────────────────────────────

async function promote(): Promise<void> {
  const steps: PromotionStep[] = [];
  fs.mkdirSync(config.outputDirectory, { recursive: true });

  console.log("========================================");
  console.log(`Promoting ${config.solutionName} v${config.version}`);
  console.log("========================================\n");

  // Step 1: Export from Dev
  let start = Date.now();
  try {
    console.log("[Step 1] Export from Development");
    const devToken = await getAccessToken(config.dev.url);
    const solutionZip = await exportSolution(
      config.dev.url,
      devToken,
      config.solutionName,
      true
    );

    const exportPath = path.join(
      config.outputDirectory,
      `${config.solutionName}_${config.version}_managed.zip`
    );
    fs.writeFileSync(exportPath, solutionZip);
    console.log(`  Saved to: ${exportPath}\n`);

    steps.push({
      step: "Export Solution",
      environment: config.dev.name,
      status: "success",
      duration: Math.round((Date.now() - start) / 1000),
      details: `Exported managed solution (${(solutionZip.length / 1024 / 1024).toFixed(2)} MB)`,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    steps.push({
      step: "Export Solution",
      environment: config.dev.name,
      status: "failed",
      duration: Math.round((Date.now() - start) / 1000),
      details: errMsg,
    });
    throw new Error(`Export failed: ${errMsg}`);
  }

  // Step 2: Import to Test
  start = Date.now();
  try {
    console.log("[Step 2] Import to Test");
    const testToken = await getAccessToken(config.test.url);
    const solutionZip = fs.readFileSync(
      path.join(
        config.outputDirectory,
        `${config.solutionName}_${config.version}_managed.zip`
      )
    );

    const asyncOpId = await importSolutionAsync(
      config.test.url,
      testToken,
      solutionZip,
      false
    );
    await pollAsyncOperation(config.test.url, testToken, asyncOpId);
    await publishCustomizations(config.test.url, testToken);
    console.log("");

    steps.push({
      step: "Import to Test",
      environment: config.test.name,
      status: "success",
      duration: Math.round((Date.now() - start) / 1000),
      details: "Solution imported and published successfully",
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    steps.push({
      step: "Import to Test",
      environment: config.test.name,
      status: "failed",
      duration: Math.round((Date.now() - start) / 1000),
      details: errMsg,
    });
    throw new Error(`Test import failed: ${errMsg}`);
  }

  // Step 3: Import to Production (Holding + Upgrade)
  start = Date.now();
  try {
    console.log("[Step 3] Import to Production");
    const prodToken = await getAccessToken(config.prod.url);
    const solutionZip = fs.readFileSync(
      path.join(
        config.outputDirectory,
        `${config.solutionName}_${config.version}_managed.zip`
      )
    );

    const asyncOpId = await importSolutionAsync(
      config.prod.url,
      prodToken,
      solutionZip,
      true // holding solution
    );
    await pollAsyncOperation(config.prod.url, prodToken, asyncOpId);
    await applySolutionUpgrade(config.prod.url, prodToken, config.solutionName);
    await publishCustomizations(config.prod.url, prodToken);
    console.log("");

    steps.push({
      step: "Import to Production",
      environment: config.prod.name,
      status: "success",
      duration: Math.round((Date.now() - start) / 1000),
      details: "Solution imported as holding, upgrade applied, customizations published",
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    steps.push({
      step: "Import to Production",
      environment: config.prod.name,
      status: "failed",
      duration: Math.round((Date.now() - start) / 1000),
      details: errMsg,
    });
    throw new Error(`Production import failed: ${errMsg}`);
  }

  // Generate report
  const report = generateReport(steps, config);
  const reportPath = path.join(config.outputDirectory, "promotion-report.md");
  fs.writeFileSync(reportPath, report);
  console.log(`Report saved to: ${reportPath}`);
  console.log("\n========================================");
  console.log("Promotion complete.");
  console.log("========================================");
}

// Run
promote().catch((error) => {
  console.error("Promotion failed:", error);
  process.exit(1);
});
```

## Example 2: Bash Script with PAC CLI

Complete promotion pipeline using PAC CLI commands.

```bash
#!/bin/bash
set -euo pipefail

# ─── Configuration ────────────────────────────────────────────
SOLUTION_NAME="${SOLUTION_NAME:-ContosoOrders}"
VERSION="${BUILD_VERSION:-1.0.0.0}"
TENANT_ID="${TENANT_ID}"
CLIENT_ID="${CLIENT_ID}"
CLIENT_SECRET="${CLIENT_SECRET}"
DEV_URL="${DEV_URL:-https://contoso-dev.crm.dynamics.com}"
TEST_URL="${TEST_URL:-https://contoso-test.crm.dynamics.com}"
PROD_URL="${PROD_URL:-https://contoso.crm.dynamics.com}"
OUTPUT_DIR="./promotion-output"
REPORT_FILE="${OUTPUT_DIR}/promotion-report.md"

mkdir -p "$OUTPUT_DIR"

# ─── Helper Functions ─────────────────────────────────────────

log_step() {
  echo ""
  echo "========================================"
  echo "[$(date '+%H:%M:%S')] $1"
  echo "========================================"
}

log_info() {
  echo "  [INFO] $1"
}

log_error() {
  echo "  [ERROR] $1" >&2
}

# Initialize report
init_report() {
  cat > "$REPORT_FILE" << HEADER
# Promotion Report

| Property | Value |
|----------|-------|
| Solution | ${SOLUTION_NAME} |
| Version | ${VERSION} |
| Timestamp | $(date -u '+%Y-%m-%dT%H:%M:%SZ') |

## Steps

| # | Step | Environment | Status | Duration |
|---|------|-------------|--------|----------|
HEADER
}

add_report_step() {
  local step_num="$1"
  local step_name="$2"
  local environment="$3"
  local status="$4"
  local duration="$5"
  echo "| ${step_num} | ${step_name} | ${environment} | ${status} | ${duration}s |" >> "$REPORT_FILE"
}

# ─── Pipeline ─────────────────────────────────────────────────

init_report

# Step 1: Authenticate to Dev
log_step "Step 1: Authenticate to Dev"
START_TIME=$SECONDS
pac auth create --name Dev \
  --environment "$DEV_URL" \
  --applicationId "$CLIENT_ID" \
  --clientSecret "$CLIENT_SECRET" \
  --tenant "$TENANT_ID"
pac auth select --name Dev
log_info "Authenticated to Dev"
DURATION=$((SECONDS - START_TIME))
add_report_step 1 "Auth to Dev" "Development" "PASS" "$DURATION"

# Step 2: Set Solution Version
log_step "Step 2: Set Solution Version to ${VERSION}"
START_TIME=$SECONDS
pac solution version --buildversion "$VERSION" --solution-name "$SOLUTION_NAME"
log_info "Version set to ${VERSION}"
DURATION=$((SECONDS - START_TIME))
add_report_step 2 "Set Version" "Development" "PASS" "$DURATION"

# Step 3: Export Managed Solution
log_step "Step 3: Export Managed Solution"
START_TIME=$SECONDS
EXPORT_PATH="${OUTPUT_DIR}/${SOLUTION_NAME}_${VERSION}_managed.zip"
pac solution export \
  --name "$SOLUTION_NAME" \
  --path "$EXPORT_PATH" \
  --managed
log_info "Exported to: ${EXPORT_PATH}"
EXPORT_SIZE=$(du -h "$EXPORT_PATH" | cut -f1)
log_info "Size: ${EXPORT_SIZE}"
DURATION=$((SECONDS - START_TIME))
add_report_step 3 "Export Solution" "Development" "PASS" "$DURATION"

# Step 4: Run Solution Checker
log_step "Step 4: Run Solution Checker"
START_TIME=$SECONDS
pac solution check \
  --path "$EXPORT_PATH" \
  --geo UnitedStates \
  --outputDirectory "${OUTPUT_DIR}/checker-results" || {
    log_error "Solution checker found critical issues. Review ${OUTPUT_DIR}/checker-results/"
    DURATION=$((SECONDS - START_TIME))
    add_report_step 4 "Solution Checker" "N/A" "FAIL" "$DURATION"
    exit 1
  }
log_info "Solution checker passed"
DURATION=$((SECONDS - START_TIME))
add_report_step 4 "Solution Checker" "N/A" "PASS" "$DURATION"

# Step 5: Import to Test
log_step "Step 5: Import to Test"
START_TIME=$SECONDS
pac auth create --name Test \
  --environment "$TEST_URL" \
  --applicationId "$CLIENT_ID" \
  --clientSecret "$CLIENT_SECRET" \
  --tenant "$TENANT_ID"
pac auth select --name Test

pac solution import \
  --path "$EXPORT_PATH" \
  --settings-file "./deployment-settings/test.json" \
  --activate-plugins \
  --force-overwrite \
  --publish-changes
log_info "Imported to Test successfully"
DURATION=$((SECONDS - START_TIME))
add_report_step 5 "Import to Test" "Test" "PASS" "$DURATION"

# Step 6: Import to Production (Holding + Upgrade)
log_step "Step 6: Import to Production"
START_TIME=$SECONDS
pac auth create --name Prod \
  --environment "$PROD_URL" \
  --applicationId "$CLIENT_ID" \
  --clientSecret "$CLIENT_SECRET" \
  --tenant "$TENANT_ID"
pac auth select --name Prod

pac solution import \
  --path "$EXPORT_PATH" \
  --settings-file "./deployment-settings/prod.json" \
  --activate-plugins \
  --force-overwrite \
  --import-as-holding

pac solution upgrade --solution-name "$SOLUTION_NAME" --async

log_info "Imported and upgraded in Production"
DURATION=$((SECONDS - START_TIME))
add_report_step 6 "Import to Prod" "Production" "PASS" "$DURATION"

# Done
log_step "Promotion Complete"
echo ""
echo "Report: ${REPORT_FILE}"
cat "$REPORT_FILE"
```

## Example 3: Deployment Settings Files

### test.json

```json
{
  "EnvironmentVariables": [
    {
      "SchemaName": "cr_ApiBaseUrl",
      "Value": "https://api.test.contoso.com"
    },
    {
      "SchemaName": "cr_MaxRetryCount",
      "Value": "5"
    },
    {
      "SchemaName": "cr_FeatureFlags",
      "Value": "{\"newCheckout\": true, \"betaDashboard\": true, \"darkMode\": false}"
    },
    {
      "SchemaName": "cr_NotificationEmail",
      "Value": "test-alerts@contoso.com"
    }
  ],
  "ConnectionReferences": [
    {
      "LogicalName": "cr_sharedcommondataserviceforapps_orders",
      "ConnectionId": "11111111-1111-1111-1111-111111111111",
      "ConnectorId": "/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps"
    },
    {
      "LogicalName": "cr_sharedsharepointonline_docs",
      "ConnectionId": "22222222-2222-2222-2222-222222222222",
      "ConnectorId": "/providers/Microsoft.PowerApps/apis/shared_sharepointonline"
    },
    {
      "LogicalName": "cr_sharedoffice365_mail",
      "ConnectionId": "33333333-3333-3333-3333-333333333333",
      "ConnectorId": "/providers/Microsoft.PowerApps/apis/shared_office365"
    }
  ]
}
```

### prod.json

```json
{
  "EnvironmentVariables": [
    {
      "SchemaName": "cr_ApiBaseUrl",
      "Value": "https://api.contoso.com"
    },
    {
      "SchemaName": "cr_MaxRetryCount",
      "Value": "3"
    },
    {
      "SchemaName": "cr_FeatureFlags",
      "Value": "{\"newCheckout\": true, \"betaDashboard\": false, \"darkMode\": false}"
    },
    {
      "SchemaName": "cr_NotificationEmail",
      "Value": "prod-alerts@contoso.com"
    }
  ],
  "ConnectionReferences": [
    {
      "LogicalName": "cr_sharedcommondataserviceforapps_orders",
      "ConnectionId": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      "ConnectorId": "/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps"
    },
    {
      "LogicalName": "cr_sharedsharepointonline_docs",
      "ConnectionId": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      "ConnectorId": "/providers/Microsoft.PowerApps/apis/shared_sharepointonline"
    },
    {
      "LogicalName": "cr_sharedoffice365_mail",
      "ConnectionId": "cccccccc-cccc-cccc-cccc-cccccccccccc",
      "ConnectorId": "/providers/Microsoft.PowerApps/apis/shared_office365"
    }
  ]
}
```

## Example 4: Promotion Report Template

The generated promotion report follows this format:

```markdown
# Promotion Report

| Property | Value |
|----------|-------|
| Solution | ContosoOrders |
| Version | 1.2.0.456 |
| Timestamp | 2026-03-01T14:30:00Z |

## Steps

| # | Step | Environment | Status | Duration |
|---|------|-------------|--------|----------|
| 1 | Auth to Dev | Development | PASS | 3s |
| 2 | Set Version | Development | PASS | 1s |
| 3 | Export Solution | Development | PASS | 45s |
| 4 | Solution Checker | N/A | PASS | 120s |
| 5 | Import to Test | Test | PASS | 180s |
| 6 | Import to Prod | Production | PASS | 210s |

## Summary

- Total duration: 559 seconds (9m 19s)
- All steps completed successfully
- Solution version 1.2.0.456 is now live in Production
```
