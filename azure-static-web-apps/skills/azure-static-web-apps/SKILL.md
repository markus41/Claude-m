---
name: Azure Static Web Apps
description: >
  Deep expertise in Azure Static Web Apps — JAMstack/SPA hosting with built-in authentication,
  managed Functions API backends, PR preview environments, staticwebapp.config.json routing,
  custom domains, and SWA CLI for local development.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - static web app
  - swa
  - jamstack
  - spa hosting
  - azure static
  - staticwebapp.config
  - swa cli
  - static site
  - preview environment
  - azure serverless frontend
---

# Azure Static Web Apps

## Overview

Azure Static Web Apps (SWA) is a service that automatically builds and deploys full-stack web apps from a GitHub or Azure DevOps repository. It provides globally distributed hosting for static content (HTML, CSS, JavaScript, images), integrated serverless API backends via Azure Functions, built-in authentication/authorization, PR preview environments, and custom domain support with free SSL.

SWA is designed for modern web frameworks: React, Angular, Vue.js, Svelte, Next.js (hybrid), Nuxt, Gatsby, Blazor, and vanilla HTML/JS. The Free tier includes 100 GB bandwidth/month and 2 custom domains.

## ARM REST API Endpoints

Base URL: `https://management.azure.com`
API Version: `2023-12-01`

### Static Sites

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/staticSites` | List SWA resources in resource group |
| PUT | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/staticSites/{name}` | Create or update a SWA |
| GET | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/staticSites/{name}` | Get SWA details |
| DELETE | `/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/staticSites/{name}` | Delete a SWA |

### Custom Domains

| Method | Endpoint | Purpose |
|--------|----------|---------|
| PUT | `/.../staticSites/{name}/customDomains/{domainName}` | Add custom domain |
| GET | `/.../staticSites/{name}/customDomains` | List custom domains |
| DELETE | `/.../staticSites/{name}/customDomains/{domainName}` | Remove custom domain |

### App Settings

| Method | Endpoint | Purpose |
|--------|----------|---------|
| PUT | `/.../staticSites/{name}/config/appsettings` | Update app settings |
| POST | `/.../staticSites/{name}/listAppSettings` | List app settings |

### Linked Backends

| Method | Endpoint | Purpose |
|--------|----------|---------|
| PUT | `/.../staticSites/{name}/linkedBackends/{backendName}` | Link an existing Functions app or Container App |
| GET | `/.../staticSites/{name}/linkedBackends` | List linked backends |

## JSON Request Bodies

### Create Static Web App (with GitHub)

```json
{
  "location": "eastus2",
  "sku": { "name": "Free" },
  "properties": {
    "repositoryUrl": "https://github.com/org/repo",
    "branch": "main",
    "repositoryToken": "<github-pat>",
    "buildProperties": {
      "appLocation": "/",
      "apiLocation": "api",
      "outputLocation": "build"
    }
  }
}
```

### Create Static Web App (standalone)

```json
{
  "location": "eastus2",
  "sku": { "name": "Standard" },
  "properties": {}
}
```

### Update App Settings

```json
{
  "properties": {
    "AAD_CLIENT_ID": "xxx-xxx",
    "AAD_CLIENT_SECRET": "xxx-xxx",
    "API_KEY": "my-secret-key"
  }
}
```

## staticwebapp.config.json

The `staticwebapp.config.json` file in the app root controls routing, authentication, headers, and platform settings. This is the most important configuration file for SWA.

### Routes

```json
{
  "routes": [
    {
      "route": "/admin/*",
      "allowedRoles": ["admin"],
      "methods": ["GET", "POST"]
    },
    {
      "route": "/api/public/*",
      "allowedRoles": ["anonymous"]
    },
    {
      "route": "/dashboard",
      "allowedRoles": ["authenticated"],
      "redirect": "/.auth/login/aad"
    },
    {
      "route": "/old-page",
      "redirect": "/new-page",
      "statusCode": 301
    },
    {
      "route": "/api/internal/*",
      "rewrite": "/api/handler"
    }
  ]
}
```

**Route properties**:
- `route`: URL pattern (supports `*` wildcard for path segments)
- `allowedRoles`: Array of roles (`anonymous`, `authenticated`, or custom roles)
- `methods`: HTTP methods allowed (default: all)
- `redirect`: URL to redirect to (302 by default, use `statusCode: 301` for permanent)
- `rewrite`: Internal rewrite target (URL stays the same in browser)
- `statusCode`: HTTP status for redirects (301 or 302)

### Navigation Fallback (SPA)

```json
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/images/*.{png,jpg,gif}", "/css/*", "/api/*"]
  }
}
```

Essential for single-page apps — ensures client-side routing works. The `exclude` array prevents static assets and API calls from being rewritten.

### Response Overrides

```json
{
  "responseOverrides": {
    "401": {
      "redirect": "/.auth/login/aad",
      "statusCode": 302
    },
    "404": {
      "rewrite": "/404.html"
    }
  }
}
```

### Global Headers

```json
{
  "globalHeaders": {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": "default-src 'self'; script-src 'self'",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
  }
}
```

### Networking

```json
{
  "networking": {
    "allowedIpRanges": ["203.0.113.0/24", "AzureFrontDoor.Backend"]
  }
}
```

### Platform Settings

```json
{
  "platform": {
    "apiRuntime": "node:20"
  }
}
```

## Authentication

SWA provides built-in authentication with zero configuration for several providers.

### Built-in Providers

| Provider | Login URL | Notes |
|----------|-----------|-------|
| Azure AD (Entra ID) | `/.auth/login/aad` | Requires custom config for tenant restriction |
| GitHub | `/.auth/login/github` | Works out of the box |
| Twitter | `/.auth/login/twitter` | Works out of the box |
| Google | `/.auth/login/google` | Requires custom OIDC config on Standard tier |
| Apple | `/.auth/login/apple` | Requires custom OIDC config on Standard tier |
| Custom OIDC | `/.auth/login/{provider-name}` | Any OIDC-compliant provider |

### Auth Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/.auth/login/{provider}` | Initiate login flow |
| `/.auth/logout` | Log out and clear session |
| `/.auth/me` | Get current user claims (JSON) |
| `/.auth/purge/{provider}` | Remove stored auth data |

### /.auth/me Response

```json
{
  "clientPrincipal": {
    "identityProvider": "aad",
    "userId": "abc123",
    "userDetails": "user@contoso.com",
    "userRoles": ["authenticated", "admin"],
    "claims": [
      { "typ": "name", "val": "John Doe" },
      { "typ": "email", "val": "user@contoso.com" }
    ]
  }
}
```

### Custom Azure AD Configuration

```json
{
  "auth": {
    "identityProviders": {
      "azureActiveDirectory": {
        "registration": {
          "openIdIssuer": "https://login.microsoftonline.com/<tenant-id>/v2.0",
          "clientIdSettingName": "AAD_CLIENT_ID",
          "clientSecretSettingName": "AAD_CLIENT_SECRET"
        }
      }
    }
  }
}
```

Store `AAD_CLIENT_ID` and `AAD_CLIENT_SECRET` in SWA app settings (not in the config file).

### Role Assignment via API

Custom roles are assigned via an invitations API or a custom role assignment function at `/api/roles`:

```json
{
  "roles": ["admin", "editor"]
}
```

The function receives the client principal in the `x-ms-client-principal` header (base64-encoded).

## Managed Functions API

SWA includes built-in serverless API support via Azure Functions.

### Directory Structure

```
project/
  src/                    # Frontend app
  api/                    # Managed Functions API
    hello/
      function.json
      index.js
    package.json
```

### function.json Example

```json
{
  "bindings": [
    {
      "authLevel": "anonymous",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["get", "post"]
    },
    {
      "type": "http",
      "direction": "out",
      "name": "res"
    }
  ]
}
```

### Handler Example (JavaScript)

```javascript
module.exports = async function (context, req) {
  // Access client principal from header
  const header = req.headers["x-ms-client-principal"];
  let user = null;
  if (header) {
    const encoded = Buffer.from(header, "base64");
    user = JSON.parse(encoded.toString("utf8"));
  }

  context.res = {
    body: { message: "Hello", user: user?.userDetails }
  };
};
```

### API Route Convention

All API functions are accessible at `/api/{function-name}`. The `api/` prefix is mandatory and automatically routed to the managed Functions backend.

## PR Preview Environments

SWA automatically creates preview environments for pull requests.

### How It Works

1. Developer opens a PR against the configured branch.
2. GitHub Actions builds and deploys the PR to a unique preview URL.
3. The preview URL is posted as a comment on the PR.
4. Each push to the PR branch redeploys the preview.
5. When the PR is merged or closed, the preview environment is automatically deleted.

### Preview URLs

Format: `https://<random-hash>-<pr-number>.<region>.azurestaticapps.net`

### Considerations

- Preview environments share the same app settings as production (be careful with API keys).
- Each SWA resource supports up to 10 preview environments on Standard tier (3 on Free).
- Preview environments have their own Functions API instances.

## SWA CLI

The Azure Static Web Apps CLI provides local development and deployment tools.

| Command | Purpose |
|---------|---------|
| `swa init` | Initialize a new SWA project with framework detection |
| `swa start` | Start local development server with API proxy |
| `swa build` | Build the app using detected framework |
| `swa deploy` | Deploy to Azure (requires deployment token or login) |
| `swa login` | Authenticate with Azure |
| `swa link` | Link local project to an Azure SWA resource |

### Local Development

```bash
# Start with both frontend and API
swa start --app-location ./src --api-location ./api

# Start with custom dev server (e.g., Vite)
swa start http://localhost:5173 --api-location ./api
```

The SWA CLI proxies authentication locally — `/.auth/login/{provider}` returns mock auth data for testing.

## Permissions / Scopes

| Scope / Requirement | Purpose |
|---------------------|---------|
| `https://management.azure.com/.default` | ARM REST API for creating/managing SWA resources |
| GitHub PAT (repo scope) | Required for linking SWA to a GitHub repository |
| SWA deployment token | Used by CI/CD to deploy without Azure credentials |
| Contributor RBAC role | Create and manage SWA resources in the resource group |

## Error Handling

### ARM API Errors

| Status | Meaning | Action |
|--------|---------|--------|
| 400 | Bad Request — invalid buildProperties or missing required field | Verify `appLocation`, `apiLocation`, `outputLocation` |
| 403 | Forbidden — insufficient RBAC permissions | Verify Contributor role on resource group |
| 404 | Not Found — SWA resource does not exist | Confirm resource name and subscription |
| 409 | Conflict — resource name taken or deployment in progress | SWA names are globally unique; wait for deployment |
| 429 | Too Many Requests | Retry after `Retry-After` header |

### Config Validation Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Invalid route pattern` | Route contains unsupported characters or syntax | Use `*` for wildcards, not regex |
| `Unknown role` | Role in route not defined in auth config | Add custom role to identity providers or use built-in roles |
| `Duplicate route` | Two routes with the same pattern | Remove duplicate; routes are evaluated in order |
| `Navigation fallback conflict` | Fallback rewrite conflicts with an explicit route | Move explicit routes above the fallback |

## Common Patterns

### React SPA with Azure AD Auth

Build a React SPA with Azure AD authentication:

1. Create a React app with `npx create-react-app my-app`.
2. Add `staticwebapp.config.json` with navigation fallback: `"rewrite": "/index.html"`.
3. Configure Azure AD provider in the auth section.
4. Protect `/dashboard/*` routes with `"allowedRoles": ["authenticated"]`.
5. Set response override for 401: redirect to `/.auth/login/aad`.
6. In React, fetch `/.auth/me` on app load to get the current user.
7. Use the `clientPrincipal.userRoles` array for conditional rendering.

### Next.js Hybrid with API Routes

Deploy a Next.js hybrid app (SSG + SSR + API):

1. Configure `next.config.js` with `output: "standalone"` for hybrid rendering.
2. Set `buildProperties.appLocation: "/"` and `outputLocation: ".next"`.
3. Use SWA's linked backends feature to connect a separate Azure Functions app for custom API routes.
4. For static pages, Next.js generates HTML at build time.
5. For dynamic pages, use client-side fetching from the managed Functions API.
6. Add `staticwebapp.config.json` with route rules for auth and API access.

### PR Preview Environments for Team Review

Set up a team review workflow with PR previews:

1. Create the SWA resource linked to the GitHub repository.
2. Enable the GitHub Actions workflow (auto-generated by SWA).
3. Team members open PRs — preview environments are auto-created.
4. Add a `statusCheck` to require PR review before merge.
5. Preview URLs are posted as PR comments for easy access.
6. On merge, preview is cleaned up and main branch is deployed to production.

## Best Practices

- **Navigation fallback**: Always configure for SPAs to prevent 404s on client-side routes.
- **Security headers**: Add `globalHeaders` for CSP, X-Frame-Options, and other security headers.
- **Role-based access**: Use custom roles for fine-grained authorization beyond `authenticated`.
- **App settings for secrets**: Never put secrets in `staticwebapp.config.json` — use app settings.
- **SWA CLI for local dev**: Use `swa start` for local development with auth mocking.
- **Exclude static assets**: In navigation fallback, exclude images, CSS, and API calls from rewriting.
- **Standard tier for production**: Free tier has rate limits and fewer features; use Standard for production.

## Reference Files

| Reference | Path | Content |
|-----------|------|---------|
| Config Schema | `references/config-schema.md` | Complete staticwebapp.config.json reference |
| Auth Providers | `references/auth-providers.md` | Built-in and custom OIDC provider setup |
| SWA CLI | `references/swa-cli.md` | CLI commands, local dev, and deployment |
| ARM API | `references/arm-api.md` | ARM REST API for Static Sites management |

## Example Files

| Example | Path | Content |
|---------|------|---------|
| React SPA + AAD | `examples/react-spa-aad.md` | React app with Azure AD auth and protected routes |
| Next.js Hybrid | `examples/nextjs-hybrid.md` | Next.js with SSG, API routes, and linked backend |
| PR Preview Setup | `examples/pr-preview.md` | Team workflow with GitHub Actions and preview environments |
| Full Config | `examples/full-config.md` | Complete staticwebapp.config.json for production |
