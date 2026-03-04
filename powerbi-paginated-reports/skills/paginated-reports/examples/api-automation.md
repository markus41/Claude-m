# REST API Automation Examples

Complete TypeScript examples for automating paginated report lifecycle.

## 1. Upload and Deploy Report

```typescript
import axios, { AxiosInstance } from 'axios';
import { ConfidentialClientApplication } from '@azure/msal-node';
import * as fs from 'fs';
import FormData from 'form-data';

// --- Authentication ---

const msalConfig = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
    clientSecret: process.env.AZURE_CLIENT_SECRET!,
  },
};

const cca = new ConfidentialClientApplication(msalConfig);

async function getToken(): Promise<string> {
  const result = await cca.acquireTokenByClientCredential({
    scopes: ['https://analysis.windows.net/powerbi/api/.default'],
  });
  if (!result) throw new Error('Failed to acquire token');
  return result.accessToken;
}

function createClient(token: string): AxiosInstance {
  return axios.create({
    baseURL: 'https://api.powerbi.com/v1.0/myorg',
    headers: { Authorization: `Bearer ${token}` },
  });
}

// --- Upload RDL ---

async function uploadReport(
  client: AxiosInstance,
  workspaceId: string,
  reportName: string,
  rdlPath: string
): Promise<{ id: string; name: string; reportId: string }> {
  const form = new FormData();
  form.append('file', fs.createReadStream(rdlPath), {
    filename: `${reportName}.rdl`,
    contentType: 'application/octet-stream',
  });

  const res = await client.post(`/groups/${workspaceId}/imports`, form, {
    params: {
      datasetDisplayName: reportName,
      nameConflict: 'CreateOrOverwrite',
    },
    headers: form.getHeaders(),
  });

  const importId = res.data.id;

  // Poll until complete
  let importState = 'Publishing';
  let reportId = '';
  while (importState === 'Publishing') {
    await sleep(3000);
    const status = await client.get(`/groups/${workspaceId}/imports/${importId}`);
    importState = status.data.importState;
    if (status.data.reports?.length > 0) {
      reportId = status.data.reports[0].id;
    }
  }

  if (importState !== 'Succeeded') {
    throw new Error(`Import failed: ${importState}`);
  }

  return { id: importId, name: reportName, reportId };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

## 2. Export Report to PDF

```typescript
interface ExportParams {
  name: string;
  value: string;
}

async function exportToPdf(
  client: AxiosInstance,
  workspaceId: string,
  reportId: string,
  params: ExportParams[],
  outputPath: string
): Promise<void> {
  // Start export
  const exportRes = await client.post(
    `/groups/${workspaceId}/reports/${reportId}/ExportTo`,
    {
      format: 'PDF',
      paginatedReportConfiguration: {
        parameterValues: params,
        formatSettings: {
          PDF: { DpiX: 300, DpiY: 300 },
        },
      },
    }
  );

  const exportId = exportRes.data.id;

  // Poll for completion
  let status = 'NotStarted';
  let pollInterval = 5000;
  while (status !== 'Succeeded' && status !== 'Failed') {
    await sleep(pollInterval);
    const statusRes = await client.get(
      `/groups/${workspaceId}/reports/${reportId}/exports/${exportId}`
    );
    status = statusRes.data.status;
    const percent = statusRes.data.percentComplete || 0;
    console.log(`Export progress: ${percent}% (${status})`);

    // Increase poll interval after initial checks
    pollInterval = Math.min(pollInterval + 5000, 30000);
  }

  if (status === 'Failed') {
    throw new Error('Export failed');
  }

  // Download file
  const fileRes = await client.get(
    `/groups/${workspaceId}/reports/${reportId}/exports/${exportId}/file`,
    { responseType: 'arraybuffer' }
  );

  fs.writeFileSync(outputPath, Buffer.from(fileRes.data));
  console.log(`Exported to: ${outputPath}`);
}

// Usage
async function main() {
  const token = await getToken();
  const client = createClient(token);

  await exportToPdf(
    client,
    'workspace-guid',
    'report-guid',
    [
      { name: 'Region', value: 'North' },
      { name: 'StartDate', value: '2025-01-01' },
      { name: 'EndDate', value: '2025-03-31' },
    ],
    './output/sales-report-north-q1.pdf'
  );
}
```

## 3. Batch Export (Multiple Parameter Combinations)

```typescript
interface BatchExportConfig {
  workspaceId: string;
  reportId: string;
  paramSets: { params: ExportParams[]; outputFile: string }[];
  format: string;
  maxConcurrent: number;
}

async function batchExport(
  client: AxiosInstance,
  config: BatchExportConfig
): Promise<{ file: string; status: string; error?: string }[]> {
  const results: { file: string; status: string; error?: string }[] = [];

  // Process in batches to respect concurrency limits
  for (let i = 0; i < config.paramSets.length; i += config.maxConcurrent) {
    const batch = config.paramSets.slice(i, i + config.maxConcurrent);
    const promises = batch.map(async (paramSet) => {
      try {
        await exportToPdf(
          client,
          config.workspaceId,
          config.reportId,
          paramSet.params,
          paramSet.outputFile
        );
        return { file: paramSet.outputFile, status: 'Success' };
      } catch (err: any) {
        return {
          file: paramSet.outputFile,
          status: 'Failed',
          error: err.message,
        };
      }
    });

    const batchResults = await Promise.all(promises);
    results.push(...batchResults);
    console.log(`Completed batch ${Math.floor(i / config.maxConcurrent) + 1}`);
  }

  return results;
}

// Usage: Export for each region
async function exportAllRegions() {
  const token = await getToken();
  const client = createClient(token);

  const regions = ['North', 'South', 'East', 'West'];
  const results = await batchExport(client, {
    workspaceId: 'workspace-guid',
    reportId: 'report-guid',
    format: 'PDF',
    maxConcurrent: 3, // Respect API limits
    paramSets: regions.map(region => ({
      params: [
        { name: 'Region', value: region },
        { name: 'StartDate', value: '2025-01-01' },
        { name: 'EndDate', value: '2025-03-31' },
      ],
      outputFile: `./output/sales-${region.toLowerCase()}-q1.pdf`,
    })),
  });

  console.table(results);
}
```

## 4. Update Parameter Defaults

```typescript
async function updateParameterDefaults(
  client: AxiosInstance,
  workspaceId: string,
  reportId: string,
  updates: { name: string; newValue: string }[]
): Promise<void> {
  await client.post(
    `/groups/${workspaceId}/reports/${reportId}/Default.UpdateParameters`,
    { updateDetails: updates }
  );
  console.log(`Updated ${updates.length} parameter defaults`);
}

// Usage: Set fiscal year default to current year
await updateParameterDefaults(client, 'workspace-guid', 'report-guid', [
  { name: 'FiscalYear', newValue: new Date().getFullYear().toString() },
  { name: 'Region', newValue: 'All' },
]);
```

## 5. Create Email Subscription

```typescript
interface SubscriptionConfig {
  title: string;
  frequency: 'Daily' | 'Weekly' | 'Monthly';
  startDate: string; // ISO 8601
  endDate: string;
  format: string;
  recipients: string[];
  params: ExportParams[];
  daysOfWeek?: string[]; // For Weekly
  dayOfMonth?: number;    // For Monthly
  time: string;           // HH:mm format
}

async function createSubscription(
  client: AxiosInstance,
  workspaceId: string,
  reportId: string,
  config: SubscriptionConfig
): Promise<string> {
  const body: any = {
    title: config.title,
    frequency: config.frequency,
    startDate: config.startDate,
    endDate: config.endDate,
    subArtifact: {
      format: config.format,
      paginatedReportConfiguration: {
        parameterValues: config.params,
      },
    },
    users: config.recipients.map(email => ({ emailAddress: email })),
  };

  if (config.frequency === 'Weekly' && config.daysOfWeek) {
    body.daysOfWeek = config.daysOfWeek;
  }
  if (config.frequency === 'Monthly' && config.dayOfMonth) {
    body.dayOfMonth = config.dayOfMonth;
  }

  const res = await client.post(
    `/groups/${workspaceId}/reports/${reportId}/subscriptions`,
    body
  );

  console.log(`Subscription created: ${res.data.id}`);
  return res.data.id;
}

// Usage: Weekly PDF to managers
await createSubscription(client, 'workspace-guid', 'report-guid', {
  title: 'Weekly Sales Report - North Region',
  frequency: 'Weekly',
  startDate: '2025-03-17T08:00:00Z',
  endDate: '2026-03-17T08:00:00Z',
  format: 'PDF',
  time: '08:00',
  daysOfWeek: ['Monday'],
  recipients: [
    'manager@company.com',
    'director@company.com',
  ],
  params: [
    { name: 'Region', value: 'North' },
  ],
});
```

## 6. List and Manage Reports

```typescript
interface PaginatedReport {
  id: string;
  name: string;
  reportType: string;
  webUrl: string;
}

async function listPaginatedReports(
  client: AxiosInstance,
  workspaceId: string
): Promise<PaginatedReport[]> {
  const res = await client.get(`/groups/${workspaceId}/reports`);
  return res.data.value.filter(
    (r: any) => r.reportType === 'PaginatedReport'
  );
}

async function deleteReport(
  client: AxiosInstance,
  workspaceId: string,
  reportId: string
): Promise<void> {
  await client.delete(`/groups/${workspaceId}/reports/${reportId}`);
  console.log(`Deleted report: ${reportId}`);
}

async function getDataSources(
  client: AxiosInstance,
  workspaceId: string,
  reportId: string
): Promise<any[]> {
  const res = await client.get(
    `/groups/${workspaceId}/reports/${reportId}/datasources`
  );
  return res.data.value;
}

// Usage: Inventory all paginated reports with their data sources
async function inventoryReports(workspaceId: string) {
  const token = await getToken();
  const client = createClient(token);

  const reports = await listPaginatedReports(client, workspaceId);
  console.log(`Found ${reports.length} paginated reports:\n`);

  for (const report of reports) {
    const dataSources = await getDataSources(client, workspaceId, report.id);
    console.log(`${report.name}`);
    console.log(`  ID: ${report.id}`);
    console.log(`  URL: ${report.webUrl}`);
    console.log(`  Data Sources:`);
    for (const ds of dataSources) {
      console.log(`    - ${ds.datasourceType}: ${ds.connectionDetails?.server || 'N/A'}`);
    }
    console.log();
  }
}
```

## 7. Embed Token Generation

```typescript
async function getEmbedToken(
  client: AxiosInstance,
  workspaceId: string,
  reportId: string,
  datasetId: string,
  username?: string,
  roles?: string[]
): Promise<{ token: string; expiration: string }> {
  const body: any = {
    reports: [{ id: reportId, allowEdit: false }],
    datasets: [{ id: datasetId }],
    targetWorkspaces: [{ id: workspaceId }],
  };

  // Add RLS identity if needed
  if (username && roles) {
    body.identities = [
      {
        username,
        roles,
        datasets: [datasetId],
      },
    ];
  }

  const res = await client.post('/GenerateToken', body);
  return {
    token: res.data.token,
    expiration: res.data.expiration,
  };
}

// Usage
const embedInfo = await getEmbedToken(
  client,
  'workspace-guid',
  'report-guid',
  'dataset-guid',
  'user@company.com',
  ['Viewer']
);
console.log(`Embed token expires: ${embedInfo.expiration}`);
```
