# azure-dotnet-webapp

Scaffold and build **ASP.NET Core Web API** and **Blazor** applications on Azure App Service.

Covers the complete development lifecycle: interactive project setup, Minimal API and MVC
controller scaffolding, Microsoft.Identity.Web authentication, EF Core with Azure SQL and Managed
Identity, SignalR hubs, OpenAPI/Swagger, rate limiting, Blazor Server/WASM/Auto render modes,
Bicep-based App Service provisioning, and GitHub Actions / Azure DevOps CI/CD pipelines.

---

## Install

```bash
/plugin install azure-dotnet-webapp@claude-m-microsoft-marketplace
```

---

## Commands

| Command | What it does |
|---------|-------------|
| `/azure-dotnet-webapp:webapp-setup` | Interactive project setup — type, auth, DB, Graph integration |
| `/azure-dotnet-webapp:scaffold-api` | Scaffold Minimal API endpoint group or MVC controller with CRUD |
| `/azure-dotnet-webapp:scaffold-blazor` | Scaffold Blazor page, service, auth guard, and NavMenu entry |
| `/azure-dotnet-webapp:add-webapi-operation` | Add Graph-backed or custom endpoint to existing project |
| `/azure-dotnet-webapp:deploy-webapp` | Provision App Service with Bicep and deploy via zip or CI/CD |

---

## Quick Start

### 1. Scaffold a new Web API

```
/azure-dotnet-webapp:webapp-setup --type api --auth azure-ad --db sql
```

Sets up a new ASP.NET Core Web API project with:
- Microsoft.Identity.Web JWT bearer authentication
- EF Core connected to Azure SQL via Managed Identity
- Swagger UI, health checks, rate limiting
- Fully compilable stub with `appsettings.json`

### 2. Add an endpoint

```
/azure-dotnet-webapp:scaffold-api --style minimal --resource FileInventory --crud
```

Generates a complete endpoint group:
- `FileInventoryEndpoints.cs` — 5 CRUD endpoints with OpenAPI metadata
- `IFileInventoryService.cs` — service interface
- `FileInventoryService.cs` — stub implementation
- `FileInventoryDto.cs` — request/response records
- Auto-updates `Program.cs`

### 3. Add a Graph-backed operation

```
/azure-dotnet-webapp:add-webapi-operation --operation graph-files
```

Adds a `/api/graph/files/inventory` endpoint that calls Microsoft Graph delta query,
wires `GraphServiceClient` + Polly `ResiliencePipeline` into `Program.cs`.

### 4. Deploy to Azure

```
/azure-dotnet-webapp:deploy-webapp --resource-group rg-webapp --app-name mywebapi --sku P1v3
```

Generates Bicep (App Service Plan + Web App + App Insights + Key Vault), runs what-if,
deploys, grants Managed Identity access to Key Vault, and generates a GitHub Actions pipeline.

---

## Skill Triggers

The skill activates automatically when you describe ASP.NET Core or Blazor tasks:

- "scaffold an asp.net core web api that returns file inventory"
- "add Microsoft.Identity.Web to my .NET 8 project"
- "create a Blazor server page with auth guard"
- "set up EF Core with Azure SQL and Managed Identity"
- "add SignalR hub to my web app"
- "generate Bicep for App Service deployment"

---

## Agent: `aspnetcore-reviewer`

Triggers automatically when you ask for code review:

- "review my asp.net core code"
- "audit my middleware pipeline"
- "check my efcore queries for N+1"
- "validate my Blazor component auth"

Produces a structured report across 8 categories: Auth/Security, Middleware Order, DI Lifetimes,
EF Core, Performance, OpenAPI, Error Handling, Blazor.

---

## Composition with `azure-graph-dotnet`

This plugin composes cleanly with [`azure-graph-dotnet`](../azure-graph-dotnet/):

```
azure-graph-dotnet                  azure-dotnet-webapp
─────────────────                   ───────────────────
DeltaScanService         ─────────► FileInventoryController  (scaffold-api)
DuplicateDetectionService ────────► DuplicatesController     (scaffold-api)
MetadataService          ─────────► DuplicatesDashboard.razor (scaffold-blazor)
GraphServiceClient        shared    injected in both plugins
ResiliencePipeline        shared    injected in both plugins
```

Use `/azure-dotnet-webapp:add-webapi-operation --operation graph-files` to bridge the two:
it reads existing Graph service interfaces from `azure-graph-dotnet` and wraps them in
ASP.NET Core HTTP endpoints or Blazor service calls.

---

## Reference Files

| Topic | File |
|-------|------|
| Program.cs, middleware, DI, configuration | `skills/azure-dotnet-webapp/references/aspnetcore-patterns.md` |
| Microsoft.Identity.Web, JWT, OIDC, MSAL | `skills/azure-dotnet-webapp/references/auth-identity-web.md` |
| Blazor Server, WASM, Auto render modes | `skills/azure-dotnet-webapp/references/blazor-patterns.md` |
| EF Core + Azure SQL + Managed Identity | `skills/azure-dotnet-webapp/references/efcore-azure-sql.md` |
| OpenAPI, SignalR, health checks, rate limiting | `skills/azure-dotnet-webapp/references/openapi-signalr.md` |
| Bicep, GitHub Actions, Azure DevOps, slots | `skills/azure-dotnet-webapp/references/webapp-cicd.md` |

---

## Settings

Plugin settings are stored in `.claude/azure-dotnet-webapp.local.md` in your project:

```yaml
---
dotnet_version: net8.0
project_type: api
auth_mode: azure-ad
database: none
app_service_sku: B1
resource_group: rg-webapp
location: eastus
cicd: github-actions
graph_integration: false
---
```

Commands read these defaults so you don't have to repeat them each time.
