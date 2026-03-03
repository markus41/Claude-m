# Graph API Patterns for Large-Scale File Operations

Reference for Microsoft Graph API patterns used in SharePoint/OneDrive file management at scale.

---

## Authentication

### App-only (daemon / background job)

```bash
curl -X POST "https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token" \
  -d "grant_type=client_credentials" \
  -d "client_id={clientId}" \
  -d "client_secret={clientSecret}" \
  -d "scope=https://graph.microsoft.com/.default"
```

### Delegated (interactive / on-behalf-of user)

Use MSAL device code flow for CLI tooling:

```javascript
const { PublicClientApplication } = require('@azure/msal-node');

const pca = new PublicClientApplication({ auth: { clientId, authority: `https://login.microsoftonline.com/${tenantId}` } });

const result = await pca.acquireTokenByDeviceCode({
  scopes: ['Sites.ReadWrite.All', 'Files.ReadWrite.All'],
  deviceCodeCallback: info => console.log(info.message)
});
const accessToken = result.accessToken;
```

---

## Pagination — `@odata.nextLink`

All list endpoints return at most `$top` items (default 100, max 999 for most endpoints).
**Always follow `@odata.nextLink`** until it is absent.

```javascript
async function getAllPages(client, initialUrl) {
  const results = [];
  let url = initialUrl;
  while (url) {
    const page = await client.api(url).get();
    results.push(...page.value);
    url = page['@odata.nextLink'] ?? null;
  }
  return results;
}
```

---

## Delta Query — Incremental File Enumeration

Delta is the recommended approach for large libraries. It returns all items on first run and only
changed items on subsequent runs.

### First run

```
GET /drives/{driveId}/root/delta?$select=id,name,size,file,folder,parentReference,createdDateTime,lastModifiedDateTime,createdBy,lastModifiedBy,deleted
```

Page through `@odata.nextLink` until you receive `@odata.deltaLink`. Store the delta link.

### Subsequent runs (incremental)

```
GET {storedDeltaLink}
```

Returns only items added, modified, or deleted since the last delta call. Deleted items have:
```json
{ "id": "...", "deleted": { "state": "deleted" } }
```

### Delta state file pattern

```javascript
const STATE_FILE = './sp-reports/.delta-state.json';

async function runDelta(driveId) {
  let state = {};
  if (fs.existsSync(STATE_FILE)) state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));

  const startUrl = state[driveId]?.deltaLink
    ?? `/drives/${driveId}/root/delta?$select=id,name,size,file,folder,parentReference,createdDateTime,lastModifiedDateTime,deleted`;

  let url = startUrl;
  const items = [];
  let deltaLink = null;

  while (url) {
    const res = await callWithRetry(() => client.api(url).get());
    items.push(...res.value);
    deltaLink = res['@odata.deltaLink'] ?? deltaLink;
    url = res['@odata.nextLink'] ?? null;
  }

  state[driveId] = { deltaLink, lastRun: new Date().toISOString() };
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  return items;
}
```

---

## Batch Requests

Use `$batch` to send up to **20 requests in a single HTTP call**, reducing round-trips and
helping with throttling budgets.

### Batch GET (read multiple drives at once)

```http
POST https://graph.microsoft.com/v1.0/$batch
Content-Type: application/json

{
  "requests": [
    { "id": "1", "method": "GET", "url": "/drives/{driveId1}/root/delta" },
    { "id": "2", "method": "GET", "url": "/drives/{driveId2}/root/delta" },
    { "id": "3", "method": "GET", "url": "/sites/{siteId}/drives" }
  ]
}
```

### Batch PATCH (update multiple file metadata fields)

```http
POST https://graph.microsoft.com/v1.0/$batch
Content-Type: application/json

{
  "requests": [
    {
      "id": "1",
      "method": "PATCH",
      "url": "/sites/{siteId}/lists/{listId}/items/{itemId1}/fields",
      "headers": { "Content-Type": "application/json" },
      "body": { "Department": "Finance", "Year": "2025" }
    },
    {
      "id": "2",
      "method": "PATCH",
      "url": "/sites/{siteId}/lists/{listId}/items/{itemId2}/fields",
      "headers": { "Content-Type": "application/json" },
      "body": { "Department": "Legal", "Year": "2024" }
    }
  ]
}
```

### Parsing batch responses

```javascript
const batchRes = await client.api('/$batch').post(batchBody);
for (const r of batchRes.responses) {
  if (r.status >= 200 && r.status < 300) {
    console.log(`Request ${r.id}: OK`);
  } else {
    console.error(`Request ${r.id}: ${r.status} — ${JSON.stringify(r.body)}`);
  }
}
```

### Chunk helper (20 per batch)

```javascript
function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

for (const batchChunk of chunk(patchRequests, 20)) {
  await client.api('/$batch').post({ requests: batchChunk });
}
```

---

## Throttling — Retry-After Pattern

```javascript
async function callWithRetry(fn, maxRetries = 6) {
  let delay = 2000; // 2 s initial back-off
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (err.statusCode === 429 || err.statusCode === 503) {
        const retryAfter = parseInt(err.headers?.['retry-after'] ?? '0', 10);
        const waitMs = retryAfter > 0 ? retryAfter * 1000 : delay;
        console.warn(`Throttled (${err.statusCode}), waiting ${waitMs}ms…`);
        await new Promise(r => setTimeout(r, waitMs));
        delay = Math.min(delay * 2, 60_000); // cap at 60 s
      } else {
        throw err;
      }
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

## Key Endpoints Reference

| Endpoint | Description |
|----------|-------------|
| `GET /sites?search=*` | Enumerate all sites (paged) |
| `GET /sites/{siteId}/drives` | List drives in a site |
| `GET /drives/{driveId}/root/delta` | Full / incremental file enumeration |
| `GET /drives/{driveId}/items/{id}` | Get file/folder details |
| `GET /drives/{driveId}/items/{id}?$select=file` | Get file hashes |
| `PATCH /drives/{driveId}/items/{id}` | Move / rename item |
| `DELETE /drives/{driveId}/items/{id}` | Move to recycle bin |
| `GET /sites/{siteId}/lists/{listId}/items?$expand=fields` | Get list items with columns |
| `PATCH /sites/{siteId}/lists/{listId}/items/{id}/fields` | Update metadata columns |
| `POST /$batch` | Execute up to 20 requests atomically |

---

## OData Query Patterns

```
# Filter files only (exclude folders)
$filter=file ne null

# Filter by extension
$filter=endswith(name,'.pdf')

# Sort by size descending
$orderby=size desc

# Large file threshold
$filter=size gt 104857600   # > 100 MB

# Items modified in last 30 days
$filter=lastModifiedDateTime gt 2025-02-01T00:00:00Z

# Items not modified in 180 days (stale)
$filter=lastModifiedDateTime lt 2025-09-01T00:00:00Z
```

---

## Graph API SDK — JavaScript Quick Start

```bash
npm install @microsoft/microsoft-graph-client isomorphic-fetch
```

```javascript
const { Client } = require('@microsoft/microsoft-graph-client');
require('isomorphic-fetch');

const client = Client.init({
  authProvider: done => done(null, process.env.MICROSOFT_ACCESS_TOKEN)
});

// List all drives in a site
const drives = await client.api(`/sites/${siteId}/drives`).get();
```

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `MICROSOFT_ACCESS_TOKEN` | Bearer token (delegated or app-only) |
| `MICROSOFT_TENANT_ID` | Azure AD tenant ID |
| `MICROSOFT_CLIENT_ID` | App registration client ID |
| `MICROSOFT_CLIENT_SECRET` | App secret (app-only flows) |
