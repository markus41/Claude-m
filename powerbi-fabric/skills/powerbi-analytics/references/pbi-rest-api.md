# Power BI REST API Reference

Comprehensive reference for the Power BI REST API at `https://api.powerbi.com/v1.0/myorg/`. Covers authentication, workspace management, dataset operations, report management, imports, embedding, and admin APIs.

## Authentication

### Azure AD Token Acquisition

Power BI REST API uses Azure AD (Entra ID) OAuth 2.0 tokens. The required scope is `https://analysis.windows.net/powerbi/api/.default`.

**Service Principal (App-Only) Flow** -- recommended for automation:

```typescript
import { ConfidentialClientApplication } from "@azure/msal-node";

const msalConfig = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID!,
    clientSecret: process.env.AZURE_CLIENT_SECRET!,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
  },
};

const cca = new ConfidentialClientApplication(msalConfig);

async function getAccessToken(): Promise<string> {
  const result = await cca.acquireTokenByClientCredential({
    scopes: ["https://analysis.windows.net/powerbi/api/.default"],
  });
  if (!result?.accessToken) throw new Error("Failed to acquire token");
  return result.accessToken;
}
```

**Delegated (User) Flow** -- for interactive scenarios:

```typescript
const result = await cca.acquireTokenByUsernamePassword({
  scopes: ["https://analysis.windows.net/powerbi/api/.default"],
  username: "user@tenant.com",
  password: "password",
});
```

**Prerequisites**:
- Register an Azure AD app with Power BI Service permissions
- For service principal: Add the app to a security group and enable "Allow service principals to use Power BI APIs" in Admin Portal > Tenant settings
- Grant admin consent for `Dataset.ReadWrite.All`, `Workspace.ReadWrite.All`, `Report.ReadWrite.All`, etc.

### API Helper

```typescript
const PBI_BASE = "https://api.powerbi.com/v1.0/myorg";

async function pbiRequest(
  path: string,
  method: string = "GET",
  body?: unknown
): Promise<unknown> {
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
    const error = await response.text();
    throw new Error(`PBI API ${method} ${path} failed (${response.status}): ${error}`);
  }

  if (response.status === 204) return null;
  return response.json();
}
```

## Workspaces (Groups)

Workspaces are organizational containers for Power BI content. In the API they are called "groups."

### List Workspaces

```
GET /groups
GET /groups?$filter=contains(name,'Sales')&$top=10
```

```typescript
interface Workspace {
  id: string;
  name: string;
  isOnDedicatedCapacity: boolean;
  capacityId: string;
  type: string;
}

const workspaces = await pbiRequest("/groups") as { value: Workspace[] };
```

### Create Workspace

```
POST /groups
```

```typescript
const newWorkspace = await pbiRequest("/groups", "POST", {
  name: "Sales Analytics - Production",
}) as Workspace;
```

### Add User to Workspace

```
POST /groups/{groupId}/users
```

Role values: `Admin`, `Member`, `Contributor`, `Viewer`

```typescript
await pbiRequest(`/groups/${groupId}/users`, "POST", {
  emailAddress: "user@contoso.com",
  groupUserAccessRight: "Contributor",
  principalType: "User",       // "User", "Group", "App"
});
```

### Assign Workspace to Capacity

```
POST /groups/{groupId}/AssignToCapacity
```

```typescript
await pbiRequest(`/groups/${groupId}/AssignToCapacity`, "POST", {
  capacityId: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
});
```

### Delete Workspace

```
DELETE /groups/{groupId}
```

## Datasets

### List Datasets in Workspace

```
GET /groups/{groupId}/datasets
```

```typescript
interface Dataset {
  id: string;
  name: string;
  configuredBy: string;
  isRefreshable: boolean;
  isOnPremGatewayRequired: boolean;
  targetStorageMode: string;
}

const datasets = await pbiRequest(`/groups/${groupId}/datasets`) as { value: Dataset[] };
```

### Trigger Dataset Refresh

```
POST /groups/{groupId}/datasets/{datasetId}/refreshes
```

```typescript
await pbiRequest(`/groups/${groupId}/datasets/${datasetId}/refreshes`, "POST", {
  notifyOption: "MailOnFailure",  // "NoNotification", "MailOnFailure", "MailOnComplete"
  retryCount: 3,
  type: "Full",                    // "Full" or "Automatic"
});
```

### Get Refresh History

```
GET /groups/{groupId}/datasets/{datasetId}/refreshes?$top=10
```

```typescript
interface Refresh {
  requestId: string;
  id: number;
  refreshType: string;
  startTime: string;
  endTime: string;
  status: "Unknown" | "Completed" | "Failed" | "Cancelled" | "Disabled";
  serviceExceptionJson?: string;
}

const refreshes = await pbiRequest(
  `/groups/${groupId}/datasets/${datasetId}/refreshes?$top=10`
) as { value: Refresh[] };
```

### Update Datasource Credentials

```
PATCH /groups/{groupId}/datasets/{datasetId}/Default.UpdateDatasources
```

### Take Over Dataset

```
POST /groups/{groupId}/datasets/{datasetId}/Default.TakeOver
```

Transfers ownership of the dataset to the calling user/service principal. Required before modifying datasource credentials.

### Bind to Gateway

```
POST /groups/{groupId}/datasets/{datasetId}/Default.BindToGateway
```

```typescript
await pbiRequest(
  `/groups/${groupId}/datasets/${datasetId}/Default.BindToGateway`,
  "POST",
  {
    gatewayObjectId: "gateway-id",
    datasourceObjectIds: ["datasource-id"],
  }
);
```

### Get Dataset Parameters

```
GET /groups/{groupId}/datasets/{datasetId}/parameters
```

### Update Dataset Parameters

```
POST /groups/{groupId}/datasets/{datasetId}/Default.UpdateParameters
```

```typescript
await pbiRequest(
  `/groups/${groupId}/datasets/${datasetId}/Default.UpdateParameters`,
  "POST",
  {
    updateDetails: [
      { name: "ServerName", newValue: "newserver.database.windows.net" },
      { name: "DatabaseName", newValue: "NewDB" },
    ],
  }
);
```

## Reports

### List Reports in Workspace

```
GET /groups/{groupId}/reports
```

```typescript
interface Report {
  id: string;
  name: string;
  datasetId: string;
  webUrl: string;
  embedUrl: string;
}

const reports = await pbiRequest(`/groups/${groupId}/reports`) as { value: Report[] };
```

### Clone Report

```
POST /groups/{groupId}/reports/{reportId}/Clone
```

```typescript
const cloned = await pbiRequest(
  `/groups/${groupId}/reports/${reportId}/Clone`,
  "POST",
  {
    name: "Sales Report - Copy",
    targetWorkspaceId: targetGroupId,   // optional: clone to different workspace
    targetModelId: targetDatasetId,      // optional: rebind to different dataset
  }
) as Report;
```

### Rebind Report to Different Dataset

```
POST /groups/{groupId}/reports/{reportId}/Rebind
```

```typescript
await pbiRequest(
  `/groups/${groupId}/reports/${reportId}/Rebind`,
  "POST",
  { datasetId: newDatasetId }
);
```

### Export Report to File

```
POST /groups/{groupId}/reports/{reportId}/ExportTo
GET /groups/{groupId}/reports/{reportId}/exports/{exportId}
GET /groups/{groupId}/reports/{reportId}/exports/{exportId}/file
```

Export format options: `PDF`, `PNG`, `PPTX`, `XLSX`, `DOCX`, `CSV`, `XML`, `MHTML`, `IMAGE`

```typescript
// Start export
const exportRequest = await pbiRequest(
  `/groups/${groupId}/reports/${reportId}/ExportTo`,
  "POST",
  {
    format: "PDF",
    powerBIReportConfiguration: {
      pages: [{ pageName: "ReportSection1" }],   // optional: specific pages
    },
  }
) as { id: string; status: string };

// Poll for completion
let status = exportRequest;
while (status.status !== "Succeeded" && status.status !== "Failed") {
  await new Promise((r) => setTimeout(r, 5000));
  status = (await pbiRequest(
    `/groups/${groupId}/reports/${reportId}/exports/${exportRequest.id}`
  )) as { id: string; status: string; percentComplete: number; resourceLocation: string };
}

// Download file
if (status.status === "Succeeded") {
  const fileResponse = await fetch(
    `${PBI_BASE}/groups/${groupId}/reports/${reportId}/exports/${exportRequest.id}/file`,
    { headers: { Authorization: `Bearer ${await getAccessToken()}` } }
  );
  const buffer = await fileResponse.arrayBuffer();
  // Save buffer to file
}
```

## Imports

### Upload .pbix File

```
POST /groups/{groupId}/imports?datasetDisplayName={name}&nameConflict=CreateOrOverwrite
```

The `.pbix` file is sent as multipart form data.

```typescript
import * as fs from "fs";
import FormData from "form-data";

async function uploadPbix(
  groupId: string,
  filePath: string,
  displayName: string
): Promise<{ id: string }> {
  const token = await getAccessToken();
  const form = new FormData();
  form.append("file", fs.createReadStream(filePath));

  const response = await fetch(
    `${PBI_BASE}/groups/${groupId}/imports?datasetDisplayName=${encodeURIComponent(displayName)}&nameConflict=CreateOrOverwrite`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        ...form.getHeaders(),
      },
      body: form,
    }
  );

  if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
  return response.json() as Promise<{ id: string }>;
}
```

### Check Import Status

```
GET /groups/{groupId}/imports/{importId}
```

```typescript
interface ImportInfo {
  id: string;
  importState: "Publishing" | "Succeeded" | "Failed";
  datasets: Array<{ id: string; name: string }>;
  reports: Array<{ id: string; name: string }>;
}

const importInfo = await pbiRequest(
  `/groups/${groupId}/imports/${importId}`
) as ImportInfo;
```

## Row-Level Security

RLS is defined in the model with DAX filter expressions on tables. The API tests and manages RLS at runtime.

### Model Definition (in DAX / TMDL)

```
role "Regional Manager" {
    table Sales {
        filter = [Region] = USERNAME()
    }
}
```

### Dynamic RLS Functions

- `USERNAME()` — Returns the effective username (usually email in Power BI Service)
- `USERPRINCIPALNAME()` — Returns the UPN of the current user
- `CUSTOMDATA()` — Returns custom data string passed in the embed token

### Generate Token with RLS

```
POST /groups/{groupId}/reports/{reportId}/GenerateToken
```

```typescript
const embedToken = await pbiRequest(
  `/groups/${groupId}/reports/${reportId}/GenerateToken`,
  "POST",
  {
    accessLevel: "View",
    identities: [
      {
        username: "user@contoso.com",
        roles: ["Regional Manager"],
        datasets: [datasetId],
      },
    ],
  }
) as { token: string; tokenId: string; expiration: string };
```

## Admin API

Admin endpoints provide tenant-wide visibility. Requires Power BI Service Admin role or specific admin API permissions.

### List All Workspaces (Admin)

```
GET /admin/groups?$top=5000&$expand=datasets,reports,users
```

### Get Activity Events (Audit Log)

```
GET /admin/activityevents?startDateTime='2024-01-01T00:00:00'&endDateTime='2024-01-02T00:00:00'
```

Returns activities like ViewReport, CreateDashboard, DeleteDataset, ExportReport, ShareReport.

```typescript
interface ActivityEvent {
  Id: string;
  RecordType: number;
  CreationTime: string;
  Operation: string;
  UserId: string;
  Activity: string;
  ItemName: string;
  WorkspaceName: string;
  DatasetName: string;
  ReportName: string;
}

async function getActivityEvents(startDate: string, endDate: string): Promise<ActivityEvent[]> {
  let allEvents: ActivityEvent[] = [];
  let continuationUri: string | null = null;

  do {
    const url = continuationUri
      ? continuationUri.replace(PBI_BASE, "")
      : `/admin/activityevents?startDateTime='${startDate}'&endDateTime='${endDate}'`;

    const result = (await pbiRequest(url)) as {
      activityEventEntities: ActivityEvent[];
      continuationUri: string | null;
      continuationToken: string | null;
    };

    allEvents = allEvents.concat(result.activityEventEntities);
    continuationUri = result.continuationUri;
  } while (continuationUri);

  return allEvents;
}
```

### Get Datasets as Admin

```
GET /admin/datasets?$top=1000
```

### Scan Workspaces (Enhanced Metadata)

```
POST /admin/workspaces/getInfo?lineage=true&datasourceDetails=true
```

```typescript
// Step 1: Initiate scan
const scan = await pbiRequest(
  "/admin/workspaces/getInfo?lineage=true&datasourceDetails=true&datasetExpressions=true",
  "POST",
  { workspaces: [groupId1, groupId2] }
) as { id: string };

// Step 2: Poll for scan completion
let scanStatus: { status: string };
do {
  await new Promise((r) => setTimeout(r, 3000));
  scanStatus = (await pbiRequest(`/admin/workspaces/scanStatus/${scan.id}`)) as { status: string };
} while (scanStatus.status !== "Succeeded");

// Step 3: Get scan result
const scanResult = await pbiRequest(`/admin/workspaces/scanResult/${scan.id}`);
```

## Embedding

### Generate Embed Token (V2 - Multi-Resource)

```
POST /GenerateToken
```

```typescript
const embedToken = await pbiRequest("/GenerateToken", "POST", {
  datasets: [{ id: datasetId }],
  reports: [{ id: reportId, allowEdit: false }],
  targetWorkspaces: [{ id: groupId }],
  lifetimeInMinutes: 60,
  identities: [
    {
      username: "user@contoso.com",
      roles: ["SalesRole"],
      datasets: [datasetId],
    },
  ],
}) as { token: string; tokenId: string; expiration: string };
```

## Error Handling Best Practices

1. Always check response status codes: 200 (OK), 201 (Created), 202 (Accepted/Async), 204 (No Content)
2. Handle 429 (Too Many Requests) with exponential backoff -- respect the `Retry-After` header
3. Handle 401 (Unauthorized) by refreshing the access token
4. For long-running operations (export, refresh), poll with reasonable intervals (5-10 seconds)
5. Parse error responses: `{ "error": { "code": "...", "message": "..." } }`
6. The API has rate limits: approximately 200 requests per hour for refresh operations
7. For bulk operations, use batch endpoints where available or implement throttling

## Pagination

List endpoints support OData query parameters:

```
?$top=100          -- Number of items to return
&$skip=0           -- Number of items to skip
&$filter=...       -- OData filter expression
&$orderby=...      -- Sort order
&$expand=...       -- Expand related entities
```

Some endpoints use continuation tokens instead of $skip. Check the response for a `continuationUri` or `@odata.nextLink`.

## Deployment Pipelines API

Deployment pipelines automate the promotion of content across development, test, and production workspaces.

### List Deployment Pipelines

```
GET /pipelines
```

```typescript
interface Pipeline {
  id: string;
  displayName: string;
  description: string;
  stages: Array<{
    order: number;
    workspaceId: string;
    workspaceName: string;
  }>;
}

const pipelines = await pbiRequest<{ value: Pipeline[] }>("/pipelines");
```

### Deploy Content Between Stages

```
POST /pipelines/{pipelineId}/stages/{stageOrder}/deploy
```

```typescript
await pbiRequest(
  `/pipelines/${pipelineId}/stages/0/deploy`,  // 0 = first stage (dev -> test)
  "POST",
  {
    datasets: [{ sourceId: datasetId }],
    reports: [{ sourceId: reportId }],
    options: {
      allowCreateArtifact: true,
      allowOverwriteArtifact: true,
      allowOverwriteTargetArtifactLabel: true,
      allowPurgeData: false,
      allowSkipTilesWithMissingPrerequisites: true,
    },
    updateAppSettings: {
      updateAppInTargetWorkspace: true,
    },
  }
);
```

### Get Pipeline Operations

```
GET /pipelines/{pipelineId}/operations
```

## Gateways

On-premises data gateways enable Power BI Service to connect to data sources that are not directly accessible from the cloud.

### List Gateways

```
GET /gateways
```

### List Gateway Datasources

```
GET /gateways/{gatewayId}/datasources
```

```typescript
interface GatewayDatasource {
  id: string;
  gatewayId: string;
  datasourceType: string;
  connectionDetails: string;
  credentialType: string;
  datasourceName: string;
}

const datasources = await pbiRequest<{ value: GatewayDatasource[] }>(
  `/gateways/${gatewayId}/datasources`
);
```

### Create Gateway Datasource

```
POST /gateways/{gatewayId}/datasources
```

```typescript
await pbiRequest(`/gateways/${gatewayId}/datasources`, "POST", {
  datasourceType: "Sql",
  connectionDetails: JSON.stringify({
    server: "myserver.database.windows.net",
    database: "mydb",
  }),
  datasourceName: "Sales DB",
  credentialDetails: {
    credentialType: "Basic",
    credentials: JSON.stringify({
      credentialData: [
        { name: "username", value: "sqladmin" },
        { name: "password", value: "password" },
      ],
    }),
    encryptedConnection: "Encrypted",
    encryptionAlgorithm: "None",
    privacyLevel: "Organizational",
  },
});
```

## Dataflows

### List Dataflows in Workspace

```
GET /groups/{groupId}/dataflows
```

### Trigger Dataflow Refresh

```
POST /groups/{groupId}/dataflows/{dataflowId}/refreshes
```

```typescript
await pbiRequest(
  `/groups/${groupId}/dataflows/${dataflowId}/refreshes`,
  "POST",
  { notifyOption: "MailOnFailure" }
);
```

## Capacities

### List Available Capacities

```
GET /capacities
```

```typescript
interface Capacity {
  id: string;
  displayName: string;
  sku: string;
  state: string;
  region: string;
  capacityUserAccessRight: string;
}

const capacities = await pbiRequest<{ value: Capacity[] }>("/capacities");
```

## Common API Patterns

### Retry with Exponential Backoff

```typescript
async function pbiRequestWithRetry<T>(
  path: string,
  method: string = "GET",
  body?: unknown,
  maxRetries: number = 3
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await pbiRequest<T>(path, method, body);
    } catch (error: any) {
      const statusMatch = error.message?.match(/\((\d+)\)/);
      const status = statusMatch ? parseInt(statusMatch[1]) : 0;

      if (status === 429 && attempt < maxRetries) {
        const retryAfter = 30 * Math.pow(2, attempt); // 30s, 60s, 120s
        console.warn(`Rate limited. Retrying in ${retryAfter}s...`);
        await new Promise((r) => setTimeout(r, retryAfter * 1000));
        continue;
      }

      if (status === 401 && attempt < maxRetries) {
        console.warn("Token expired. Refreshing...");
        // Token cache will be refreshed on next getAccessToken() call
        continue;
      }

      throw error;
    }
  }
  throw new Error("Max retries exceeded");
}
```
