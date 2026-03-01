# Workspace Management Examples

Complete TypeScript examples for Power BI REST API workspace and dataset operations.

## Setup: API Client

```typescript
import { ConfidentialClientApplication } from "@azure/msal-node";

// ============================================
// Configuration
// ============================================
const config = {
  tenantId: process.env.AZURE_TENANT_ID!,
  clientId: process.env.AZURE_CLIENT_ID!,
  clientSecret: process.env.AZURE_CLIENT_SECRET!,
};

const PBI_BASE = "https://api.powerbi.com/v1.0/myorg";

// ============================================
// Token Acquisition
// ============================================
const msalClient = new ConfidentialClientApplication({
  auth: {
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    authority: `https://login.microsoftonline.com/${config.tenantId}`,
  },
});

async function getAccessToken(): Promise<string> {
  const result = await msalClient.acquireTokenByClientCredential({
    scopes: ["https://analysis.windows.net/powerbi/api/.default"],
  });
  if (!result?.accessToken) {
    throw new Error("Failed to acquire access token");
  }
  return result.accessToken;
}

// ============================================
// Generic API Request Helper
// ============================================
async function pbiRequest<T>(
  path: string,
  method: string = "GET",
  body?: unknown,
  rawResponse: boolean = false
): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(`${PBI_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Power BI API ${method} ${path} failed (${response.status}): ${errorText}`
    );
  }

  if (response.status === 204 || response.status === 202) {
    return null as T;
  }

  if (rawResponse) {
    return response as unknown as T;
  }

  return response.json() as Promise<T>;
}
```

## 1. Create Workspace and Assign Roles

```typescript
// ============================================
// Create a new workspace, assign capacity, and add users
// ============================================

interface Workspace {
  id: string;
  name: string;
  isOnDedicatedCapacity: boolean;
  capacityId?: string;
  type: string;
}

interface WorkspaceUser {
  emailAddress: string;
  groupUserAccessRight: "Admin" | "Member" | "Contributor" | "Viewer";
  displayName?: string;
  principalType: "User" | "Group" | "App";
}

async function createWorkspaceWithRoles(
  workspaceName: string,
  capacityId: string | null,
  users: WorkspaceUser[]
): Promise<Workspace> {
  console.log(`Creating workspace: ${workspaceName}`);

  // Step 1: Create the workspace
  const workspace = await pbiRequest<Workspace>("/groups", "POST", {
    name: workspaceName,
  });
  console.log(`Workspace created: ${workspace.id}`);

  // Step 2: Assign to Premium/Fabric capacity (if provided)
  if (capacityId) {
    await pbiRequest(
      `/groups/${workspace.id}/AssignToCapacity`,
      "POST",
      { capacityId }
    );
    console.log(`Assigned to capacity: ${capacityId}`);
  }

  // Step 3: Add users with specified roles
  for (const user of users) {
    try {
      await pbiRequest(`/groups/${workspace.id}/users`, "POST", user);
      console.log(`Added ${user.emailAddress} as ${user.groupUserAccessRight}`);
    } catch (error) {
      console.error(`Failed to add ${user.emailAddress}: ${error}`);
    }
  }

  return workspace;
}

// Usage
async function main() {
  const workspace = await createWorkspaceWithRoles(
    "Sales Analytics - Production",
    "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", // capacity ID, or null
    [
      {
        emailAddress: "admin@contoso.com",
        groupUserAccessRight: "Admin",
        principalType: "User",
      },
      {
        emailAddress: "analysts@contoso.com",
        groupUserAccessRight: "Member",
        principalType: "Group",
      },
      {
        emailAddress: "viewers@contoso.com",
        groupUserAccessRight: "Viewer",
        principalType: "Group",
      },
      {
        // Service principal for automation
        emailAddress: "sp-app-id@tenant-id",
        groupUserAccessRight: "Contributor",
        principalType: "App",
      },
    ]
  );

  console.log(`Workspace ready: ${workspace.name} (${workspace.id})`);
}
```

## 2. Upload .pbix and Trigger Refresh

```typescript
// ============================================
// Upload a .pbix file and trigger an initial refresh
// ============================================

import * as fs from "fs";
import FormData from "form-data";

interface ImportInfo {
  id: string;
  importState: "Publishing" | "Succeeded" | "Failed";
  createdDateTime: string;
  updatedDateTime: string;
  name: string;
  datasets?: Array<{ id: string; name: string }>;
  reports?: Array<{ id: string; name: string }>;
}

async function uploadPbixAndRefresh(
  groupId: string,
  filePath: string,
  displayName: string
): Promise<{ datasetId: string; reportId: string }> {
  const token = await getAccessToken();

  // Step 1: Upload the .pbix file
  console.log(`Uploading ${filePath} as "${displayName}"...`);
  const form = new FormData();
  form.append("file", fs.createReadStream(filePath));

  const uploadUrl = `${PBI_BASE}/groups/${groupId}/imports?datasetDisplayName=${encodeURIComponent(displayName)}&nameConflict=CreateOrOverwrite`;

  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      ...form.getHeaders(),
    },
    body: form as unknown as BodyInit,
  });

  if (!uploadResponse.ok) {
    const err = await uploadResponse.text();
    throw new Error(`Upload failed (${uploadResponse.status}): ${err}`);
  }

  const importResult = (await uploadResponse.json()) as ImportInfo;
  console.log(`Import started: ${importResult.id}`);

  // Step 2: Poll for import completion
  let importStatus: ImportInfo;
  do {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    importStatus = await pbiRequest<ImportInfo>(
      `/groups/${groupId}/imports/${importResult.id}`
    );
    console.log(`Import status: ${importStatus.importState}`);
  } while (importStatus.importState === "Publishing");

  if (importStatus.importState !== "Succeeded") {
    throw new Error(`Import failed: ${importStatus.importState}`);
  }

  const datasetId = importStatus.datasets![0].id;
  const reportId = importStatus.reports![0].id;
  console.log(`Dataset: ${datasetId}, Report: ${reportId}`);

  // Step 3: Trigger dataset refresh
  console.log("Triggering dataset refresh...");
  await pbiRequest(
    `/groups/${groupId}/datasets/${datasetId}/refreshes`,
    "POST",
    {
      notifyOption: "MailOnFailure",
      type: "Full",
    }
  );
  console.log("Refresh triggered successfully");

  return { datasetId, reportId };
}

// Usage
async function main() {
  const result = await uploadPbixAndRefresh(
    "workspace-group-id",
    "./SalesReport.pbix",
    "Sales Report"
  );
  console.log(`Deployed: dataset=${result.datasetId}, report=${result.reportId}`);
}
```

## 3. Get Refresh History and Check Status

```typescript
// ============================================
// Get dataset refresh history and poll for current refresh status
// ============================================

interface RefreshEntry {
  requestId: string;
  id: number;
  refreshType: string;
  startTime: string;
  endTime?: string;
  status: "Unknown" | "Completed" | "Failed" | "Cancelled" | "Disabled";
  serviceExceptionJson?: string;
  refreshAttempts?: Array<{
    attemptId: number;
    startTime: string;
    endTime?: string;
    type: string;
    serviceExceptionJson?: string;
  }>;
}

async function getRefreshHistory(
  groupId: string,
  datasetId: string,
  top: number = 10
): Promise<RefreshEntry[]> {
  const result = await pbiRequest<{ value: RefreshEntry[] }>(
    `/groups/${groupId}/datasets/${datasetId}/refreshes?$top=${top}`
  );
  return result.value;
}

async function triggerAndWaitForRefresh(
  groupId: string,
  datasetId: string,
  timeoutMinutes: number = 30
): Promise<RefreshEntry> {
  // Trigger refresh
  console.log(`Triggering refresh for dataset ${datasetId}...`);
  await pbiRequest(
    `/groups/${groupId}/datasets/${datasetId}/refreshes`,
    "POST",
    {
      notifyOption: "NoNotification",
      type: "Full",
    }
  );

  // Get the request ID from refresh history
  await new Promise((resolve) => setTimeout(resolve, 2000));
  let history = await getRefreshHistory(groupId, datasetId, 1);
  const currentRefresh = history[0];
  const requestId = currentRefresh.requestId;
  console.log(`Refresh request: ${requestId}, status: ${currentRefresh.status}`);

  // Poll until complete or timeout
  const startTime = Date.now();
  const timeoutMs = timeoutMinutes * 60 * 1000;

  while (Date.now() - startTime < timeoutMs) {
    history = await getRefreshHistory(groupId, datasetId, 1);
    const latest = history[0];

    if (latest.requestId === requestId) {
      if (latest.status === "Completed") {
        console.log(`Refresh completed successfully at ${latest.endTime}`);
        return latest;
      }
      if (latest.status === "Failed") {
        console.error(`Refresh failed: ${latest.serviceExceptionJson}`);
        return latest;
      }
      if (latest.status === "Cancelled" || latest.status === "Disabled") {
        console.warn(`Refresh ${latest.status}`);
        return latest;
      }
    }

    const elapsedMin = ((Date.now() - startTime) / 60000).toFixed(1);
    console.log(`Refresh in progress... (${elapsedMin} min elapsed)`);
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }

  throw new Error(`Refresh timed out after ${timeoutMinutes} minutes`);
}

async function printRefreshHistory(
  groupId: string,
  datasetId: string
): Promise<void> {
  const history = await getRefreshHistory(groupId, datasetId, 20);

  console.log("\n=== Refresh History ===");
  console.log(`${"Status".padEnd(12)} ${"Type".padEnd(12)} ${"Start".padEnd(24)} ${"End".padEnd(24)} Duration`);
  console.log("-".repeat(90));

  for (const entry of history) {
    const start = new Date(entry.startTime);
    const end = entry.endTime ? new Date(entry.endTime) : null;
    const durationMs = end ? end.getTime() - start.getTime() : 0;
    const durationMin = (durationMs / 60000).toFixed(1);

    console.log(
      `${entry.status.padEnd(12)} ` +
      `${entry.refreshType.padEnd(12)} ` +
      `${start.toISOString().padEnd(24)} ` +
      `${(end?.toISOString() ?? "In progress").padEnd(24)} ` +
      `${end ? durationMin + " min" : ""}`
    );
  }
}

// Usage
async function main() {
  const groupId = "workspace-id";
  const datasetId = "dataset-id";

  // Print history
  await printRefreshHistory(groupId, datasetId);

  // Trigger and wait
  const result = await triggerAndWaitForRefresh(groupId, datasetId, 15);
  console.log(`Final status: ${result.status}`);
}
```

## 4. Export Report to PDF

```typescript
// ============================================
// Export a Power BI report to PDF format
// ============================================

interface ExportRequest {
  id: string;
  createdDateTime: string;
  lastActionDateTime: string;
  status: "Undefined" | "NotStarted" | "Running" | "Succeeded" | "Failed";
  percentComplete: number;
  reportId: string;
  reportName: string;
  resourceLocation?: string;
  resourceFileExtension?: string;
  expirationTime?: string;
}

async function exportReportToPdf(
  groupId: string,
  reportId: string,
  outputPath: string,
  pageNames?: string[]
): Promise<string> {
  // Step 1: Initiate export
  console.log("Starting report export to PDF...");

  const exportBody: Record<string, unknown> = {
    format: "PDF",
  };

  if (pageNames && pageNames.length > 0) {
    exportBody.powerBIReportConfiguration = {
      pages: pageNames.map((name) => ({ pageName: name })),
    };
  }

  const exportInit = await pbiRequest<ExportRequest>(
    `/groups/${groupId}/reports/${reportId}/ExportTo`,
    "POST",
    exportBody
  );

  console.log(`Export initiated: ${exportInit.id}`);

  // Step 2: Poll for completion
  let exportStatus: ExportRequest;
  do {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    exportStatus = await pbiRequest<ExportRequest>(
      `/groups/${groupId}/reports/${reportId}/exports/${exportInit.id}`
    );
    console.log(
      `Export status: ${exportStatus.status} (${exportStatus.percentComplete}%)`
    );
  } while (
    exportStatus.status !== "Succeeded" &&
    exportStatus.status !== "Failed"
  );

  if (exportStatus.status === "Failed") {
    throw new Error("Report export failed");
  }

  // Step 3: Download the file
  const token = await getAccessToken();
  const fileUrl = `${PBI_BASE}/groups/${groupId}/reports/${reportId}/exports/${exportInit.id}/file`;

  const fileResponse = await fetch(fileUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!fileResponse.ok) {
    throw new Error(`File download failed: ${fileResponse.status}`);
  }

  const buffer = Buffer.from(await fileResponse.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);
  console.log(`PDF saved to: ${outputPath} (${buffer.length} bytes)`);

  return outputPath;
}

// Usage
async function main() {
  await exportReportToPdf(
    "workspace-id",
    "report-id",
    "./output/SalesReport.pdf"
    // Optionally specify page names: ["ReportSection1", "ReportSection2"]
  );
}
```

## 5. List All Datasets with Refresh Schedules

```typescript
// ============================================
// Enumerate all datasets across workspaces with refresh schedule info
// ============================================

interface Dataset {
  id: string;
  name: string;
  configuredBy: string;
  isRefreshable: boolean;
  isOnPremGatewayRequired: boolean;
  targetStorageMode: string;
  createdDate: string;
  webUrl: string;
}

interface RefreshSchedule {
  days: string[];
  times: string[];
  enabled: boolean;
  localTimeZoneId: string;
  notifyOption: string;
}

interface DatasetSummary {
  workspaceName: string;
  workspaceId: string;
  datasetName: string;
  datasetId: string;
  configuredBy: string;
  isRefreshable: boolean;
  storageMode: string;
  refreshEnabled: boolean;
  refreshDays: string;
  refreshTimes: string;
  lastRefreshStatus: string;
  lastRefreshTime: string;
}

async function listAllDatasetsWithSchedules(): Promise<DatasetSummary[]> {
  // Get all workspaces
  const workspacesResult = await pbiRequest<{ value: Workspace[] }>("/groups");
  const summaries: DatasetSummary[] = [];

  for (const ws of workspacesResult.value) {
    console.log(`Scanning workspace: ${ws.name}`);

    // Get datasets in workspace
    let datasets: Dataset[];
    try {
      const dsResult = await pbiRequest<{ value: Dataset[] }>(
        `/groups/${ws.id}/datasets`
      );
      datasets = dsResult.value;
    } catch {
      console.warn(`  Skipping workspace ${ws.name}: access denied`);
      continue;
    }

    for (const ds of datasets) {
      let refreshSchedule: RefreshSchedule | null = null;
      let lastRefresh: RefreshEntry | null = null;

      // Get refresh schedule (only for refreshable datasets)
      if (ds.isRefreshable) {
        try {
          refreshSchedule = await pbiRequest<RefreshSchedule>(
            `/groups/${ws.id}/datasets/${ds.id}/refreshSchedule`
          );
        } catch {
          // Schedule may not exist
        }

        // Get last refresh
        try {
          const history = await pbiRequest<{ value: RefreshEntry[] }>(
            `/groups/${ws.id}/datasets/${ds.id}/refreshes?$top=1`
          );
          lastRefresh = history.value[0] ?? null;
        } catch {
          // May not have permission
        }
      }

      summaries.push({
        workspaceName: ws.name,
        workspaceId: ws.id,
        datasetName: ds.name,
        datasetId: ds.id,
        configuredBy: ds.configuredBy,
        isRefreshable: ds.isRefreshable,
        storageMode: ds.targetStorageMode,
        refreshEnabled: refreshSchedule?.enabled ?? false,
        refreshDays: refreshSchedule?.days?.join(", ") ?? "N/A",
        refreshTimes: refreshSchedule?.times?.join(", ") ?? "N/A",
        lastRefreshStatus: lastRefresh?.status ?? "N/A",
        lastRefreshTime: lastRefresh?.endTime ?? lastRefresh?.startTime ?? "N/A",
      });
    }
  }

  return summaries;
}

// Usage
async function main() {
  const datasets = await listAllDatasetsWithSchedules();

  console.log("\n=== Dataset Refresh Summary ===\n");
  console.log(
    `${"Workspace".padEnd(30)} ${"Dataset".padEnd(25)} ${"Enabled".padEnd(9)} ${"Days".padEnd(25)} ${"Last Status".padEnd(12)} Last Time`
  );
  console.log("-".repeat(130));

  for (const ds of datasets) {
    if (!ds.isRefreshable) continue;
    console.log(
      `${ds.workspaceName.substring(0, 29).padEnd(30)} ` +
      `${ds.datasetName.substring(0, 24).padEnd(25)} ` +
      `${String(ds.refreshEnabled).padEnd(9)} ` +
      `${ds.refreshDays.substring(0, 24).padEnd(25)} ` +
      `${ds.lastRefreshStatus.padEnd(12)} ` +
      `${ds.lastRefreshTime}`
    );
  }

  console.log(`\nTotal datasets: ${datasets.length}`);
  console.log(`Refreshable: ${datasets.filter((d) => d.isRefreshable).length}`);
  console.log(`Refresh enabled: ${datasets.filter((d) => d.refreshEnabled).length}`);
}
```
