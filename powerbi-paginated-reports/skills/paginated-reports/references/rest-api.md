# Paginated Reports REST API Reference

## Authentication

All Power BI REST API calls require an Azure AD OAuth 2.0 bearer token.

### Scope

```
https://analysis.windows.net/powerbi/api/.default
```

### Service Principal Authentication (Automated)

```typescript
import { ConfidentialClientApplication } from '@azure/msal-node';

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
  return result!.accessToken;
}
```

### Delegated User Authentication (Interactive)

```typescript
import { PublicClientApplication } from '@azure/msal-node';

const pca = new PublicClientApplication({
  auth: {
    clientId: process.env.AZURE_CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
  },
});

async function getTokenInteractive(): Promise<string> {
  const result = await pca.acquireTokenByDeviceCode({
    scopes: ['https://analysis.windows.net/powerbi/api/Report.ReadWrite.All'],
    deviceCodeCallback: (response) => console.log(response.message),
  });
  return result!.accessToken;
}
```

### Required Permissions

| Scope | Use |
|-------|-----|
| `Report.Read.All` | Read reports and export |
| `Report.ReadWrite.All` | Read, write, delete reports |
| `Workspace.Read.All` | List workspaces |
| `Workspace.ReadWrite.All` | Create/manage workspaces |
| `Dataset.Read.All` | Read data sources, parameters |
| `Dataset.ReadWrite.All` | Update data sources, refresh |

For service principals: grant API permissions in Azure AD app registration and add the SP to the Fabric workspace as Member or Admin.

## Import (Upload) Paginated Report

### Upload .rdl File

```
POST https://api.powerbi.com/v1.0/myorg/groups/{workspaceId}/imports?datasetDisplayName={reportName}&nameConflict=CreateOrOverwrite
Content-Type: multipart/form-data
```

### TypeScript Example

```typescript
import axios from 'axios';
import * as fs from 'fs';
import FormData from 'form-data';

async function uploadRdl(
  token: string,
  workspaceId: string,
  reportName: string,
  rdlFilePath: string
): Promise<string> {
  const form = new FormData();
  form.append('file', fs.createReadStream(rdlFilePath), {
    filename: `${reportName}.rdl`,
    contentType: 'application/octet-stream',
  });

  const response = await axios.post(
    `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/imports`,
    form,
    {
      params: {
        datasetDisplayName: reportName,
        nameConflict: 'CreateOrOverwrite',
      },
      headers: {
        Authorization: `Bearer ${token}`,
        ...form.getHeaders(),
      },
    }
  );

  // Poll import status
  const importId = response.data.id;
  let status = 'Publishing';

  while (status === 'Publishing') {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const statusRes = await axios.get(
      `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/imports/${importId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    status = statusRes.data.importState;
  }

  if (status !== 'Succeeded') {
    throw new Error(`Import failed with status: ${status}`);
  }

  return importId;
}
```

### nameConflict Values

| Value | Behavior |
|-------|----------|
| `Abort` | Fail if report with same name exists |
| `CreateOrOverwrite` | Replace existing report |
| `Ignore` | Skip if exists, no error |
| `GenerateUniqueName` | Auto-append number if duplicate |

## List Reports

### Get All Reports in Workspace

```
GET https://api.powerbi.com/v1.0/myorg/groups/{workspaceId}/reports
```

### Response

```json
{
  "value": [
    {
      "id": "report-guid",
      "reportType": "PaginatedReport",
      "name": "Monthly Sales Report",
      "webUrl": "https://app.powerbi.com/groups/{workspaceId}/rdlreports/{reportId}",
      "embedUrl": "https://app.powerbi.com/reportEmbed?reportId={reportId}&groupId={workspaceId}",
      "datasetId": "dataset-guid"
    }
  ]
}
```

Filter for paginated reports: check `reportType === "PaginatedReport"`.

## Get Report Details

```
GET https://api.powerbi.com/v1.0/myorg/groups/{workspaceId}/reports/{reportId}
```

## Delete Report

```
DELETE https://api.powerbi.com/v1.0/myorg/groups/{workspaceId}/reports/{reportId}
```

## Data Sources

### Get Data Sources

```
GET https://api.powerbi.com/v1.0/myorg/groups/{workspaceId}/reports/{reportId}/datasources
```

### Response

```json
{
  "value": [
    {
      "datasourceType": "Sql",
      "connectionDetails": {
        "server": "abc123.datawarehouse.fabric.microsoft.com",
        "database": "SalesWarehouse"
      },
      "datasourceId": "datasource-guid",
      "gatewayId": "gateway-guid"
    }
  ]
}
```

### Update Data Source Credentials

```
PATCH https://api.powerbi.com/v1.0/myorg/gateways/{gatewayId}/datasources/{datasourceId}
```

```json
{
  "credentialDetails": {
    "credentialType": "Basic",
    "credentials": "{\"credentialData\":[{\"name\":\"username\",\"value\":\"user\"},{\"name\":\"password\",\"value\":\"pass\"}]}",
    "encryptedConnection": "Encrypted",
    "encryptionAlgorithm": "None",
    "privacyLevel": "Organizational"
  }
}
```

### Bind to Gateway

```
POST https://api.powerbi.com/v1.0/myorg/groups/{workspaceId}/reports/{reportId}/Default.BindToGateway
```

```json
{
  "gatewayObjectId": "gateway-guid",
  "datasourceObjectIds": ["datasource-guid"]
}
```

## Parameters

### Get Parameters

```
GET https://api.powerbi.com/v1.0/myorg/groups/{workspaceId}/reports/{reportId}/parameters
```

### Response

```json
{
  "value": [
    {
      "name": "Region",
      "dataType": "String",
      "isRequired": true,
      "currentValue": "North",
      "allowBlank": false,
      "multiValue": false
    },
    {
      "name": "StartDate",
      "dataType": "DateTime",
      "isRequired": true,
      "currentValue": "2025-01-01T00:00:00"
    }
  ]
}
```

### Update Parameter Defaults

```
POST https://api.powerbi.com/v1.0/myorg/groups/{workspaceId}/reports/{reportId}/Default.UpdateParameters
```

```json
{
  "updateDetails": [
    { "name": "Region", "newValue": "South" },
    { "name": "StartDate", "newValue": "2025-06-01" }
  ]
}
```

## Export Report

### Start Export

```
POST https://api.powerbi.com/v1.0/myorg/groups/{workspaceId}/reports/{reportId}/ExportTo
```

```json
{
  "format": "PDF",
  "paginatedReportConfiguration": {
    "parameterValues": [
      { "name": "Region", "value": "North" },
      { "name": "StartDate", "value": "2025-01-01" }
    ],
    "formatSettings": {
      "PDF": {
        "DpiX": 300,
        "DpiY": 300
      }
    }
  }
}
```

### Poll Export Status

```
GET https://api.powerbi.com/v1.0/myorg/groups/{workspaceId}/reports/{reportId}/exports/{exportId}
```

### Response

```json
{
  "id": "export-guid",
  "status": "Succeeded",
  "percentComplete": 100,
  "reportId": "report-guid",
  "reportName": "Monthly Sales Report",
  "resourceLocation": "reports/{reportId}/exports/{exportId}/file",
  "resourceFileExtension": ".pdf",
  "expirationTime": "2025-03-15T14:00:00Z"
}
```

Status values: `NotStarted`, `Running`, `Succeeded`, `Failed`

### Download Export File

```
GET https://api.powerbi.com/v1.0/myorg/groups/{workspaceId}/reports/{reportId}/exports/{exportId}/file
```

Returns binary stream. Set `responseType: 'arraybuffer'` (Axios) or `response.blob()` (Fetch).

## Subscriptions

### Create Subscription

```
POST https://api.powerbi.com/v1.0/myorg/groups/{workspaceId}/reports/{reportId}/subscriptions
```

```json
{
  "title": "Weekly Sales Report",
  "frequency": "Weekly",
  "startDate": "2025-03-17T08:00:00Z",
  "endDate": "2026-03-17T08:00:00Z",
  "subArtifact": {
    "format": "PDF",
    "paginatedReportConfiguration": {
      "parameterValues": [
        { "name": "Region", "value": "North" }
      ]
    }
  },
  "users": [
    { "emailAddress": "user@company.com" },
    { "emailAddress": "manager@company.com" }
  ]
}
```

### Frequency Values

- `Daily`
- `Weekly` (with `daysOfWeek`: `["Monday", "Friday"]`)
- `Monthly` (with `dayOfMonth`: 1-28)

### Get Subscriptions

```
GET https://api.powerbi.com/v1.0/myorg/groups/{workspaceId}/reports/{reportId}/subscriptions
```

### Delete Subscription

```
DELETE https://api.powerbi.com/v1.0/myorg/groups/{workspaceId}/reports/{reportId}/subscriptions/{subscriptionId}
```

## Embedding Paginated Reports

### Get Embed Token

```
POST https://api.powerbi.com/v1.0/myorg/GenerateToken
```

```json
{
  "reports": [
    { "id": "report-guid", "allowEdit": false }
  ],
  "datasets": [
    { "id": "dataset-guid" }
  ],
  "targetWorkspaces": [
    { "id": "workspace-guid" }
  ],
  "identities": [
    {
      "username": "user@company.com",
      "roles": ["Viewer"],
      "datasets": ["dataset-guid"]
    }
  ]
}
```

### Embed URL Format

```
https://app.powerbi.com/reportEmbed?reportId={reportId}&groupId={workspaceId}
```

### Client-Side Integration

Use the Power BI JavaScript SDK (`powerbi-client`) to embed:

```html
<div id="reportContainer"></div>
<script src="https://cdn.jsdelivr.net/npm/powerbi-client/dist/powerbi.min.js"></script>
<script>
  const models = window['powerbi-client'].models;
  const config = {
    type: 'report',
    tokenType: models.TokenType.Embed,
    accessToken: embedToken,
    embedUrl: embedUrl,
    id: reportId,
    settings: {
      panes: { pageNavigation: { visible: false } }
    },
    parameterValues: [
      { name: 'Region', value: 'North' }
    ]
  };
  const report = powerbi.embed(document.getElementById('reportContainer'), config);
</script>
```

## Rate Limits and Quotas

| Operation | Limit |
|-----------|-------|
| Export requests | 50 per hour per user/service principal |
| Concurrent exports per workspace | 5 |
| Export file retention | 24 hours |
| Report rendering timeout | 10 minutes (default) |
| Maximum export size | 250 MB |
| Subscription email recipients | 50 per subscription |

### Handling Throttling

HTTP 429 response includes `Retry-After` header (seconds). Implement exponential backoff:

```typescript
async function callWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      if (error.response?.status === 429 && attempt < maxRetries) {
        const retryAfter = parseInt(error.response.headers['retry-after'] || '60');
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries exceeded');
}
```
