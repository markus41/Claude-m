# Azure Static Web Apps — API & Functions Integration

## Overview

Azure Static Web Apps provides two API backend options: **Managed Functions** (Azure Functions bundled within the SWA resource, simpler but limited) and **Linked Backends** (bring your own Azure Functions App, Container App, or API Management instance). All API routes are proxied under `/api/` by default. Environment variables are injected into Function App instances via SWA app settings.

---

## REST API Endpoints

Base URL: `https://management.azure.com`
API Version: `2023-12-01`

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| PUT | `/.../staticSites/{name}/linkedBackends/{backendName}` | Contributor | Body: backend definition | Link existing Functions App or Container App |
| GET | `/.../staticSites/{name}/linkedBackends` | Reader | — | List linked backends |
| DELETE | `/.../staticSites/{name}/linkedBackends/{backendName}` | Contributor | — | Unlink backend |
| POST | `/.../staticSites/{name}/validateLinkedBackend` | Reader | Body: backend ID | Validate backend linkage before creating |
| PUT | `/.../staticSites/{name}/config/appsettings` | Contributor | Body: settings map | Update app settings (injected into managed API) |
| POST | `/.../staticSites/{name}/listAppSettings` | Contributor | — | List app settings (returns values) |
| GET | `/.../staticSites/{name}/builds/{buildId}/linkedBackends` | Reader | — | List backends for a specific build/environment |

---

## Managed Functions (Built-In API)

Managed Functions are Azure Functions co-deployed with the SWA resource. They are automatically provisioned and scaled by SWA — no separate Function App resource to manage.

### Directory Structure

```
project/
├── src/                           # Frontend app (React/Vue/Angular)
│   ├── index.html
│   └── ...
├── api/                           # Managed Functions API
│   ├── package.json               # API dependencies (separate from frontend)
│   ├── tsconfig.json
│   └── src/
│       ├── functions/
│       │   ├── getItems.ts        # v4 model function
│       │   ├── createItem.ts
│       │   └── getUserProfile.ts
│       └── index.ts               # Entry point (imports all functions)
└── staticwebapp.config.json
```

### v4 TypeScript Function (Managed)

```typescript
// api/src/functions/getItems.ts
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

interface Item {
  id: string;
  name: string;
  createdAt: string;
}

app.http("getItems", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "items",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    // Read client principal (set by SWA auth layer)
    const principalHeader = req.headers.get("x-ms-client-principal");
    const principal = principalHeader
      ? JSON.parse(Buffer.from(principalHeader, "base64").toString("utf-8"))
      : null;

    if (!principal) {
      return { status: 401, jsonBody: { error: "Authentication required" } };
    }

    // Access env vars from SWA app settings
    const apiKey = process.env.UPSTREAM_API_KEY;
    const baseUrl = process.env.API_BASE_URL;

    const items: Item[] = [
      { id: "1", name: "Item One", createdAt: new Date().toISOString() },
    ];

    return {
      status: 200,
      headers: { "Cache-Control": "no-store" },
      jsonBody: { items, user: principal.userDetails },
    };
  },
});
```

```typescript
// api/src/index.ts — import all functions to register them
import "./functions/getItems";
import "./functions/createItem";
import "./functions/getUserProfile";
```

### api/package.json

```json
{
  "name": "swa-api",
  "version": "1.0.0",
  "scripts": {
    "build": "tsc",
    "start": "func start"
  },
  "dependencies": {
    "@azure/functions": "^4.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "azure-functions-core-tools": "^4.0.0"
  },
  "main": "dist/index.js"
}
```

### api/host.json

```json
{
  "version": "2.0",
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true,
        "maxTelemetryItemsPerSecond": 20
      }
    }
  },
  "extensionBundle": {
    "id": "Microsoft.Azure.Functions.ExtensionBundle",
    "version": "[4.*, 5.0.0)"
  }
}
```

---

## API Routes

All managed API functions are automatically accessible at `/api/{functionName}` or the custom `route` specified in the function registration.

```json
{
  "routes": [
    {
      "route": "/api/admin/*",
      "allowedRoles": ["admin"]
    },
    {
      "route": "/api/authenticated/*",
      "allowedRoles": ["authenticated"]
    },
    {
      "route": "/api/public/*",
      "allowedRoles": ["anonymous"]
    }
  ]
}
```

**API authentication levels in Functions** — always use `authLevel: "anonymous"` for SWA managed functions. Route-level authorization is handled by `staticwebapp.config.json` `allowedRoles`, not by Function auth levels. Using `"function"` auth level on SWA-managed functions breaks the SWA routing layer.

---

## Linked Backends (Bring Your Own)

Link an existing Azure Functions App, Container App, or API Management instance as the backend.

### Link Azure Functions App

```json
PUT /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/staticSites/{name}/linkedBackends/functions-backend?api-version=2023-12-01
{
  "properties": {
    "backendResourceId": "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/sites/my-functions-app",
    "region": "eastus"
  }
}
```

```bash
# Link Functions app via CLI
az staticwebapp backends link \
  --name my-swa \
  --resource-group rg-swa \
  --backend-resource-id /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/sites/my-functions-app \
  --backend-region eastus
```

### Azure CLI: Functions Linking

```bash
# Link Azure Functions backend
az staticwebapp functions link \
  --name my-swa \
  --resource-group rg-swa \
  --function-resource-id /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/sites/my-functions-app

# Show linked functions
az staticwebapp functions show \
  --name my-swa \
  --resource-group rg-swa

# Unlink functions
az staticwebapp functions unlink \
  --name my-swa \
  --resource-group rg-swa
```

### Link Azure Container App

```json
{
  "properties": {
    "backendResourceId": "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.App/containerApps/my-container-app",
    "region": "eastus"
  }
}
```

### Supported Backend Types

| Backend Type | Resource Provider | Notes |
|-------------|------------------|-------|
| Azure Functions | `Microsoft.Web/sites` with `kind: functionapp` | Standard or Flex Consumption plans |
| Azure Container Apps | `Microsoft.App/containerApps` | Standard tier SWA only |
| Azure API Management | `Microsoft.ApiManagement/service` | Standard tier SWA only; full Gateway features |
| App Service (Web App) | `Microsoft.Web/sites` | Standard tier SWA only |

---

## Environment Variables for API

```bash
# Set env vars for the API (managed Functions or linked backend)
az staticwebapp appsettings set \
  --name my-swa \
  --resource-group rg-swa \
  --setting-names \
    DATABASE_URL=https://my-cosmos.documents.azure.com \
    STORAGE_ACCOUNT_NAME=mystorageaccount \
    FEATURE_FLAG_NEW_UI=true \
    API_TIMEOUT_MS=5000
```

**ARM JSON**:
```json
PUT /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/staticSites/{name}/config/appsettings?api-version=2023-12-01
{
  "properties": {
    "DATABASE_URL": "https://my-cosmos.documents.azure.com",
    "STORAGE_ACCOUNT_NAME": "mystorageaccount",
    "FEATURE_FLAG_NEW_UI": "true",
    "API_TIMEOUT_MS": "5000"
  }
}
```

**Important**: These settings are injected into the API Functions as environment variables (`process.env.SETTING_NAME`). They are NOT exposed to the frontend JavaScript. For frontend configuration, use build-time environment variables or a `/api/config` endpoint that returns safe public configuration.

---

## Local Development with SWA CLI

The SWA CLI proxies both the frontend dev server and the API, providing a unified local development experience with mock authentication.

```bash
# Install SWA CLI globally
npm install -g @azure/static-web-apps-cli

# Start with Vite frontend and Azure Functions API
swa start http://localhost:5173 \
  --api-location ./api \
  --api-devserver-url http://localhost:7071

# Or start everything together (SWA manages both)
swa start ./src \
  --api-location ./api \
  --run "npm run dev"

# Local .env for API (create api/.env or use local.settings.json)
# api/local.settings.json
```

### api/local.settings.json

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "DATABASE_URL": "http://localhost:8081",
    "STORAGE_ACCOUNT_NAME": "devstoreaccount1"
  }
}
```

### Mock Authentication (SWA CLI)

The SWA CLI provides a mock auth endpoint at `http://localhost:4280/.auth/login/{provider}`. It returns configurable mock user data without real OAuth flows.

```bash
# Default mock login returns anonymous user
curl http://localhost:4280/.auth/me

# Configure mock user via env var or swa-cli.config.json
```

`swa-cli.config.json`:
```json
{
  "configurations": {
    "app": {
      "appLocation": "./src",
      "apiLocation": "./api",
      "outputLocation": "./build",
      "devserverTimeout": 60,
      "port": 4280,
      "apiPort": 7071,
      "host": "localhost",
      "open": false,
      "appDevserverUrl": "http://localhost:5173"
    }
  }
}
```

---

## CORS Configuration for Linked Backends

When using a linked backend (separate Functions app), configure CORS to allow SWA's origin.

```bash
# For linked Azure Functions App — allow SWA origin
az functionapp cors add \
  --name my-functions-app \
  --resource-group rg-backend \
  --allowed-origins "https://my-swa.azurestaticapps.net"

# Or update CORS settings via ARM
PATCH /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/sites/my-functions-app/config/web
{
  "properties": {
    "cors": {
      "allowedOrigins": [
        "https://my-swa.azurestaticapps.net",
        "https://www.example.com"
      ],
      "supportCredentials": true
    }
  }
}
```

For managed functions, CORS is handled automatically — no configuration needed.

---

## TypeScript: API Function with Cosmos DB

```typescript
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { CosmosClient } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";

const cosmosClient = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT!,
  aadCredentials: new DefaultAzureCredential(),
});

const db = cosmosClient.database("appdb");
const container = db.container("items");

app.http("getItem", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "items/{id}",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const id = req.params.id;
    const principalHeader = req.headers.get("x-ms-client-principal");
    const principal = principalHeader
      ? JSON.parse(Buffer.from(principalHeader, "base64").toString("utf-8"))
      : null;

    if (!principal) {
      return { status: 401, jsonBody: { error: "Authentication required" } };
    }

    try {
      const { resource } = await container.item(id, id).read();
      if (!resource) {
        return { status: 404, jsonBody: { error: "Item not found" } };
      }
      return { status: 200, jsonBody: resource };
    } catch (err) {
      ctx.error("Cosmos DB read failed", err);
      return { status: 500, jsonBody: { error: "Internal server error" } };
    }
  },
});
```

---

## Error Codes Table

| Code | Meaning | Remediation |
|------|---------|-------------|
| `404 on /api/*` | Function not found or not registered | Check function name matches route; verify `index.ts` imports the function file |
| `500 from managed function` | Unhandled exception in function | Check SWA function logs in Azure portal; add try/catch |
| `429 from managed function` | Function scale limit reached | Managed functions have lower limits than dedicated Functions Apps; switch to linked backend |
| `CORS error on linked backend` | Origin not allowed | Add SWA hostname to Functions App CORS allowed origins |
| `LinkedBackendNotFound` | Backend resource ID incorrect | Verify subscription, resource group, and resource name |
| `BackendValidationFailed` | Backend type not supported or wrong tier | Check backend type; Container Apps and APIM require Standard tier |
| `api/ directory missing` | No API functions deployed | Create `api/` directory with at least one function; `apiLocation` must match build config |
| `app settings not visible in function` | Settings not set on SWA | Use `az staticwebapp appsettings set`; settings in Functions App (for linked) are separate |

---

## Throttling Limits Table

| Resource | Limit | Retry Strategy |
|----------|-------|---------------|
| Managed Functions concurrent instances | Lower than dedicated Functions Apps | Use linked backend (dedicated Functions App) for high-throughput APIs |
| Managed Functions timeout | 230 seconds (HTTP trigger on SWA) | For long-running operations, use Durable Functions or async patterns |
| App settings per SWA | 10,000 settings | Use Azure App Configuration for large setting sets |
| Linked backends per SWA | 1 backend per environment (preview) | Use API Management as single gateway routing to multiple backends |
| API route prefix | `/api/` only (fixed) | Cannot change prefix; all functions accessible at `/api/{name}` |
| SWA CLI local API timeout | Governed by local Functions Core Tools | Increase `requestTimeout` in `host.json` for local debugging |

---

## Common Patterns and Gotchas

**1. `authLevel: "anonymous"` on all managed functions**
Always set `authLevel: "anonymous"` on SWA-managed functions. The SWA routing layer handles authorization via `allowedRoles` in `staticwebapp.config.json`. Setting `authLevel: "function"` generates a `?code=` URL requirement that conflicts with SWA's proxy routing.

**2. Frontend cannot see app settings**
A common mistake: setting app settings via `az staticwebapp appsettings set` and trying to access them in React/Vue frontend code. App settings are only injected as environment variables into the API (Functions) runtime. Use a `/api/config` endpoint that returns safe, non-secret configuration to the frontend.

**3. API function names and routing**
The default route is `/api/{functionName}`. If you set `route: "items/{id}"` in the function definition, the URL becomes `/api/items/{id}`. The `/api/` prefix is always added by SWA — you cannot remove it for managed functions.

**4. Managed functions runtime version**
Set `platform.apiRuntime` in `staticwebapp.config.json` to match your function's target runtime. Mismatches cause runtime errors. For Node.js 20 functions, use `"node:20"`.

**5. Local development vs production auth**
The SWA CLI mock auth at `/.auth/login/mock` provides a mock principal for testing. The `x-ms-client-principal` header in local dev is a mock value. Do not hardcode mock principal structures in production logic — always parse from the header.

**6. Linked backend auth propagation**
SWA does NOT forward the `x-ms-client-principal` header to linked backends by default. Configure API Management or your own auth middleware to read and validate the header if needed in linked backends. For managed functions, the header is always present.
