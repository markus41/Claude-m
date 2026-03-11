# Azure Static Web Apps — Deployment Configuration

## Overview

`staticwebapp.config.json` is the primary configuration file for Azure Static Web Apps. It controls URL routing, navigation fallback for SPAs, response header customization, authentication integration, and platform runtime settings. The file is placed in the app's root directory (same level as `index.html`) and is processed by the SWA hosting infrastructure — not by any server-side code.

---

## REST API Endpoints

Base URL: `https://management.azure.com`
API Version: `2023-12-01`

| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|----------------------|----------------|-------|
| PUT | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/staticSites/{name}` | Contributor | Body: SWA definition | Create or update SWA resource |
| GET | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/staticSites/{name}` | Reader | — | Get SWA resource details |
| GET | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/staticSites` | Reader | — | List SWA resources in resource group |
| DELETE | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/staticSites/{name}` | Contributor | — | Delete SWA resource |
| PUT | `/.../staticSites/{name}/config/appsettings` | Contributor | Body: settings map | Update application settings (env vars for API) |
| POST | `/.../staticSites/{name}/listAppSettings` | Contributor | — | Retrieve app settings values |
| POST | `/.../staticSites/{name}/listSecrets` | Contributor | — | Retrieve deployment token |
| GET | `/.../staticSites/{name}/builds` | Reader | — | List build/deployment history |
| GET | `/.../staticSites/{name}/builds/{buildId}` | Reader | — | Get specific deployment details |

---

## Complete staticwebapp.config.json Schema

```json
{
  "routes": [],
  "navigationFallback": {},
  "responseOverrides": {},
  "globalHeaders": {},
  "mimeTypes": {},
  "auth": {},
  "networking": {},
  "platform": {},
  "forwardingGateway": {},
  "trailingSlashBehavior": "Auto"
}
```

---

## Routes Configuration

Routes are evaluated in order — the first matching route wins.

```json
{
  "routes": [
    {
      "route": "/admin/*",
      "allowedRoles": ["admin"],
      "methods": ["GET", "POST", "PUT", "DELETE"]
    },
    {
      "route": "/api/*",
      "allowedRoles": ["authenticated"]
    },
    {
      "route": "/public/*",
      "allowedRoles": ["anonymous"]
    },
    {
      "route": "/login",
      "redirect": "/.auth/login/aad",
      "statusCode": 302
    },
    {
      "route": "/logout",
      "redirect": "/.auth/logout",
      "statusCode": 302
    },
    {
      "route": "/old-blog/:slug",
      "redirect": "/blog/:slug",
      "statusCode": 301
    },
    {
      "route": "/internal-tool",
      "rewrite": "/tools/internal/index.html"
    },
    {
      "route": "/health",
      "allowedRoles": ["anonymous"],
      "headers": {
        "Cache-Control": "no-store"
      }
    },
    {
      "route": "/.well-known/*",
      "allowedRoles": ["anonymous"],
      "headers": {
        "Cache-Control": "public, max-age=86400"
      }
    }
  ]
}
```

### Route Properties Reference

| Property | Type | Description |
|----------|------|-------------|
| `route` | string | URL pattern. Supports `*` for path suffix, `:paramName` for segments |
| `allowedRoles` | string[] | Required roles: `anonymous`, `authenticated`, or custom roles |
| `methods` | string[] | HTTP methods (default: all). E.g., `["GET", "POST"]` |
| `redirect` | string | Target URL for redirect. Supports `:paramName` references |
| `rewrite` | string | Internal rewrite target (URL shown to client unchanged) |
| `statusCode` | number | HTTP status for redirect: `301` (permanent) or `302` (temporary) |
| `headers` | object | Route-specific response headers (override global headers) |

**Wildcard patterns**:
| Pattern | Matches |
|---------|---------|
| `/admin/*` | Any path starting with `/admin/` |
| `/blog/:slug` | Single path segment (e.g., `/blog/my-post`) |
| `/files/*.{jpg,png}` | Files with specific extensions |
| `*` | All routes (use as fallback) |

---

## Navigation Fallback (SPA Mode)

Required for single-page applications to handle client-side routing.

```json
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": [
      "/images/*.{png,jpg,gif,svg,webp}",
      "/css/*",
      "/js/*",
      "/fonts/*",
      "/favicon.ico",
      "/robots.txt",
      "/sitemap.xml",
      "/api/*",
      "/*.json"
    ]
  }
}
```

**How it works**: Any request that doesn't match an existing static file or API route is rewritten to the specified file. The `exclude` array prevents static assets from being served as the fallback HTML — these paths return 404 if the file doesn't exist, rather than returning `index.html`.

**For Next.js/Nuxt/other SSG frameworks**, the fallback may differ:
```json
{
  "navigationFallback": {
    "rewrite": "/404.html",
    "exclude": ["/_next/*", "/static/*", "/api/*", "/*.{js,css,json,ico,png,jpg,svg}"]
  }
}
```

---

## Response Overrides

Customize behavior for specific HTTP status codes.

```json
{
  "responseOverrides": {
    "400": {
      "rewrite": "/errors/400.html",
      "statusCode": 400
    },
    "401": {
      "redirect": "/.auth/login/aad?post_login_redirect_uri=ORIGINAL_URL",
      "statusCode": 302
    },
    "403": {
      "rewrite": "/errors/403.html",
      "statusCode": 403
    },
    "404": {
      "rewrite": "/404.html",
      "statusCode": 404
    }
  }
}
```

**`ORIGINAL_URL` placeholder**: In redirect URLs within `responseOverrides`, `ORIGINAL_URL` is replaced with the URL the user tried to access. This enables post-login redirect to the originally requested page.

---

## Global Headers

Security headers applied to all responses. Route-specific headers override global headers for matching routes.

```json
{
  "globalHeaders": {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' https://az416426.vo.msecnd.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.applicationinsights.azure.com; font-src 'self'; frame-ancestors 'none'",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Cache-Control": "no-cache"
  }
}
```

**Security header recommendations**:
| Header | Recommended Value |
|--------|------------------|
| `X-Content-Type-Options` | `nosniff` — prevent MIME sniffing |
| `X-Frame-Options` | `DENY` (or `SAMEORIGIN` if you embed in iframes) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `Content-Security-Policy` | Restrict based on app's actual requirements |

---

## MIME Types

Override or add MIME type mappings for file extensions.

```json
{
  "mimeTypes": {
    ".json": "text/json",
    ".webmanifest": "application/manifest+json",
    ".wasm": "application/wasm",
    ".avif": "image/avif",
    ".br": "application/x-brotli"
  }
}
```

---

## Platform Settings

Configure the API runtime for managed Azure Functions.

```json
{
  "platform": {
    "apiRuntime": "node:20"
  }
}
```

**Supported `apiRuntime` values**:
| Value | Description |
|-------|-------------|
| `node:14` | Node.js 14 (deprecated) |
| `node:16` | Node.js 16 |
| `node:18` | Node.js 18 |
| `node:20` | Node.js 20 (recommended) |
| `python:3.8` | Python 3.8 |
| `python:3.9` | Python 3.9 |
| `python:3.10` | Python 3.10 |
| `dotnet:6` | .NET 6 |
| `dotnet:7` | .NET 7 |
| `dotnet:8` | .NET 8 (recommended) |

---

## Networking (IP Restrictions)

```json
{
  "networking": {
    "allowedIpRanges": [
      "203.0.113.0/24",
      "198.51.100.0/24",
      "AzureFrontDoor.Backend"
    ]
  }
}
```

**Service tags** can be used instead of IP ranges. `AzureFrontDoor.Backend` allows only Front Door origin traffic. `AzureCloud` allows all Azure services (less restrictive).

---

## Trailing Slash Behavior

```json
{
  "trailingSlashBehavior": "Auto"
}
```

| Value | Behavior |
|-------|---------|
| `Auto` | Redirects `/about/` → `/about` for files; keeps trailing slash for directories |
| `Always` | Ensures all URLs have trailing slash |
| `Never` | Removes trailing slash from all URLs |

---

## Bicep: Create SWA Resource

```bicep
@description('SWA name (globally unique subdomain)')
param swaName string

@description('Location — limited regions; use eastus2 or centralus')
param location string = 'eastus2'

@description('SKU tier')
@allowed(['Free', 'Standard'])
param skuName string = 'Standard'

@description('GitHub repository URL')
param repositoryUrl string = ''

@description('GitHub branch')
param branch string = 'main'

@description('GitHub personal access token (use Key Vault reference in production)')
@secure()
param repositoryToken string = ''

resource swa 'Microsoft.Web/staticSites@2023-12-01' = {
  name: swaName
  location: location
  sku: {
    name: skuName
    tier: skuName
  }
  properties: repositoryUrl != '' ? {
    repositoryUrl: repositoryUrl
    branch: branch
    repositoryToken: repositoryToken
    buildProperties: {
      appLocation: '/'
      apiLocation: 'api'
      outputLocation: 'build'
    }
  } : {}
}

// App settings for the API functions
resource appSettings 'Microsoft.Web/staticSites/config@2023-12-01' = {
  parent: swa
  name: 'appsettings'
  properties: {
    NODE_ENV: 'production'
    API_BASE_URL: 'https://api.example.com'
  }
}

output swaUrl string = 'https://${swa.properties.defaultHostname}'
output deploymentToken string = listSecrets(swa.id, swa.apiVersion).properties.apiKey
```

---

## Azure CLI: SWA Deployment

```bash
# Create SWA resource (standalone, no GitHub)
az staticwebapp create \
  --name my-swa \
  --resource-group rg-swa \
  --location eastus2 \
  --sku Standard

# Get deployment token
DEPLOYMENT_TOKEN=$(az staticwebapp secrets list \
  --name my-swa \
  --resource-group rg-swa \
  --query "properties.apiKey" -o tsv)

# Deploy using SWA CLI
swa deploy ./build \
  --api-location ./api \
  --deployment-token $DEPLOYMENT_TOKEN \
  --env production

# Update app settings
az staticwebapp appsettings set \
  --name my-swa \
  --resource-group rg-swa \
  --setting-names API_KEY=mysecret NODE_ENV=production

# List app settings
az staticwebapp appsettings list \
  --name my-swa \
  --resource-group rg-swa

# Configure custom domain
az staticwebapp hostname set \
  --name my-swa \
  --resource-group rg-swa \
  --hostname www.example.com
```

---

## Azure CLI: Resource Management

```bash
# Show SWA details
az staticwebapp show --name my-swa --resource-group rg-swa
az staticwebapp show --name my-swa --resource-group rg-swa \
  --query "{DefaultHostname:defaultHostname, SKU:sku.name, Branch:repositoryUrl}"

# List SWA apps in a resource group
az staticwebapp list --resource-group rg-swa --output table

# List all SWA apps in subscription
az staticwebapp list --output table

# Delete SWA
az staticwebapp delete --name my-swa --resource-group rg-swa --yes
```

---

## Azure CLI: Custom Domain Management

```bash
# Add custom domain (CNAME validation — for subdomains like www)
az staticwebapp custom-domain create \
  --name my-swa \
  --resource-group rg-swa \
  --hostname www.contoso.com

# Add custom domain (DNS TXT token validation — for apex/root domains)
az staticwebapp custom-domain create \
  --name my-swa \
  --resource-group rg-swa \
  --hostname contoso.com \
  --validation-method dns-txt-token

# Show custom domain (check validation status)
az staticwebapp custom-domain show \
  --name my-swa \
  --resource-group rg-swa \
  --hostname www.contoso.com

# List custom domains
az staticwebapp custom-domain list \
  --name my-swa \
  --resource-group rg-swa \
  --output table

# Delete custom domain
az staticwebapp custom-domain delete \
  --name my-swa \
  --resource-group rg-swa \
  --hostname www.contoso.com \
  --yes
```

---

## Azure CLI: App Settings (Delete)

```bash
# Delete specific app settings
az staticwebapp appsettings delete \
  --name my-swa \
  --resource-group rg-swa \
  --setting-names KEY1 KEY2
```

---

## Azure CLI: Deployment Tokens

```bash
# Get deployment token (returns token and other secrets)
az staticwebapp secrets list \
  --name my-swa \
  --resource-group rg-swa

# Reset deployment token (invalidates the old token)
az staticwebapp secrets reset-api-key \
  --name my-swa \
  --resource-group rg-swa
```

---

## SWA CLI: Additional Commands

```bash
# Link local project to Azure resource
swa link --resource-group rg-swa --app-name my-swa

# Build with explicit locations
swa build --app-location ./src --api-location ./api --output-location ./dist
```

---

## GitHub Actions Workflow

SWA auto-generates this workflow when linked to a GitHub repository. The deployment token is automatically stored as a repository secret.

```yaml
name: Azure Static Web Apps CI/CD

on:
  push:
    branches:
      - main
  pull_request:
    types: [opened, synchronize, reopened, closed]
    branches:
      - main

jobs:
  build_and_deploy:
    if: github.event_name == 'push' || (github.event_name == 'pull_request' && github.event.action != 'closed')
    runs-on: ubuntu-latest
    name: Build and Deploy
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: true
          lfs: false

      - name: Build And Deploy
        id: builddeploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: upload
          app_location: "/"
          api_location: "api"
          output_location: "build"
          app_build_command: "npm run build"
          api_build_command: "npm run build:api"

  close_pull_request:
    if: github.event_name == 'pull_request' && github.event.action == 'closed'
    runs-on: ubuntu-latest
    name: Close Pull Request
    steps:
      - name: Close Pull Request
        id: closepullrequest
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          action: close
```

---

## Error Codes Table

| Code | Meaning | Remediation |
|------|---------|-------------|
| `InvalidRoutePattern` | Route contains unsupported characters or syntax | Use `*` for wildcards, `:param` for segments; no regex |
| `DuplicateRoute` | Two routes match the same URL pattern | Remove duplicate; routes evaluated in order, only first matches |
| `UnknownRole` | `allowedRoles` references undefined custom role | Define custom roles via identity provider configuration or role assignment function |
| `InvalidMimeType` | MIME type format incorrect | Use `type/subtype` format (e.g., `application/json`) |
| `NavigationFallbackConflict` | Fallback path conflicts with explicit route | Place explicit routes before fallback catch-all in routes array |
| `ApiRuntimeNotSupported` | `platform.apiRuntime` value not recognized | Check supported values list; `node:20` or `dotnet:8` recommended |
| `ConfigFileTooLarge` | `staticwebapp.config.json` exceeds size limit | Split large route lists; simplify CSP headers |
| `DeploymentFailed: build error` | Framework build command failed | Check `app_build_command` and build output directory |

---

## Throttling Limits Table

| Resource | Limit | Retry Strategy |
|----------|-------|---------------|
| Routes per config file | 1,000 routes | Consolidate with wildcards; avoid per-page routes |
| Global headers count | No published limit (practical: ~50) | Combine related policies; use CDN for additional header control |
| App settings | 10,000 per SWA | Use Key Vault references for secrets; consolidate settings |
| Bandwidth (Free tier) | 100 GB/month | Upgrade to Standard for production; compress assets |
| Bandwidth (Standard tier) | Metered billing | Enable compression (`*.br`, `*.gz`); use CDN caching |
| Preview environments (Free) | 3 per SWA | Close stale PR environments; use Standard for more PRs |
| Preview environments (Standard) | 10 per SWA | Manage long-lived PRs; clean up merged branches |
| Custom domains (Free) | 2 per SWA | Use Standard for more custom domains |
| Custom domains (Standard) | Unlimited | Manage DNS; use wildcard DNS for subdomains |

---

## Common Patterns and Gotchas

**1. Route evaluation order**
Routes are evaluated in order — the first match wins. Place specific routes before wildcard routes. A common mistake is placing `"route": "/*"` at the top, which matches everything and prevents any subsequent routes from being evaluated.

**2. `exclude` in navigationFallback is critical**
Without proper exclusions, SWA returns your `index.html` for requests to missing images, CSS files, and API calls. Always exclude `/api/*`, static asset directories, and file extensions. Missing exclusions cause very confusing debugging.

**3. CSP header and `'unsafe-inline'`**
Application Insights, many UI libraries, and React/Vue dev modes require `'unsafe-inline'` in the script CSP directive. For production, prefer nonce-based or hash-based CSP, but this requires server-side header generation (not possible in static SWA — use `'unsafe-inline'` or hash-based policy).

**4. App settings are only available to API functions**
App settings set via the portal or ARM API (`/config/appsettings`) are only injected into API (Azure Functions) environment variables. They are NOT embedded in the frontend JavaScript. Never put secrets in frontend code; use the API as a proxy for secret-requiring operations.

**5. `staticwebapp.config.json` deployment location**
The config file must be in the `outputLocation` directory (e.g., `build/` or `dist/`) for the build output, OR in the `appLocation` root. SWA looks in the output directory first, then falls back to the app root. If your build copies the file, place it in the source root and verify the build copies it to output.

**6. Trailing slash handling**
SPAs often have issues with `/about` vs `/about/`. Set `trailingSlashBehavior: "Never"` to normalize all URLs without trailing slashes, then configure your SPA router to match without trailing slashes. Inconsistent trailing slash handling causes 404s or double renders.

**7. Rewrite vs redirect**
`rewrite` changes the served content but keeps the URL in the browser unchanged. `redirect` tells the browser to navigate to a new URL. Use `rewrite` for SPA fallback and internal API routing; use `redirect` for canonical URL normalization and login flows.
