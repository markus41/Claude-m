---
name: azure-dotnet-webapp:webapp-setup
description: Interactive setup wizard for ASP.NET Core Web API or Blazor projects on Azure — selects project type, auth, database, and Graph integration; scaffolds the full project structure with compilable stubs; and verifies the build.
argument-hint: "[--type api|blazor|both] [--auth none|azure-ad] [--db none|sql]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - AskUserQuestion
---

# ASP.NET Core Web App Setup

Interactive setup for building ASP.NET Core Web API or Blazor applications on Azure.

## Setup Flow

### Step 1: Prerequisite Check

Run and report version + status for each tool:

```bash
dotnet --version          # Required: 8.0+
az --version              # Recommended: Azure CLI
git --version             # Required
node --version            # Optional: for front-end tooling
```

Print a status table. Stop if `dotnet` < 8.0 and show the install link:
`https://dotnet.microsoft.com/download/dotnet/8.0`

### Step 2: Project Configuration

Ask the following questions in sequence:

1. **Project type**
   - Web API (Minimal API — lightweight, endpoint groups)
   - Web API (MVC Controllers — structured, action filters)
   - Blazor Web App (Server, WASM, and Auto render modes)
   - Both Web API + Blazor (full-stack .NET)

2. **Authentication**
   - None (open API or custom auth)
   - Azure AD / Entra ID (Microsoft.Identity.Web — JWT bearer for API, OIDC for Blazor)

3. **Database**
   - None
   - Azure SQL via EF Core (DefaultAzureCredential — no passwords in config)

4. **Integrate with azure-graph-dotnet project?**
   - Yes — wire GraphServiceClient DI, add Graph service interfaces
   - No

5. **Project name** (default: `MyWebApp`)
6. **Output directory** (default: current directory)

### Step 3: Scaffold Project Structure

**Web API project (Minimal API):**
```
{ProjectName}/
├── {ProjectName}.csproj
├── Program.cs
├── appsettings.json
├── appsettings.Development.json
├── .gitignore
├── Features/
│   └── FileInventory/
│       ├── FileInventoryEndpoints.cs
│       ├── FileInventoryService.cs
│       └── FileInventoryDto.cs
├── Models/
│   └── FileInventoryItem.cs       (if db selected)
├── Data/
│   └── AppDbContext.cs             (if db selected)
└── Infrastructure/
    └── GlobalExceptionHandler.cs
```

**Web API project (Controllers):**
```
{ProjectName}/
├── {ProjectName}.csproj
├── Program.cs
├── appsettings.json
├── appsettings.Development.json
├── .gitignore
├── Controllers/
│   └── FilesController.cs
├── Services/
│   ├── IFileInventoryService.cs
│   └── FileInventoryService.cs
├── Models/
│   ├── FileInventoryItem.cs
│   └── FileInventoryDto.cs
├── Data/
│   └── AppDbContext.cs             (if db selected)
└── Infrastructure/
    └── GlobalExceptionHandler.cs
```

**Blazor Web App:**
```
{ProjectName}/
├── {ProjectName}.csproj
├── Program.cs
├── appsettings.json
├── .gitignore
├── Components/
│   ├── App.razor
│   ├── Routes.razor
│   ├── _Imports.razor
│   ├── Layout/
│   │   ├── MainLayout.razor
│   │   └── NavMenu.razor
│   └── Pages/
│       ├── Home.razor
│       └── FileInventory.razor
└── Services/
    └── IFileInventoryService.cs

{ProjectName}.Client/               (for WASM/Auto pages)
├── {ProjectName}.Client.csproj
├── Program.cs
└── _Imports.razor
```

Write all files using the Write tool. All files must be fully compilable stubs — not placeholder comments.

### Step 4: Wire appsettings.json

Generate `appsettings.json` with stubs for selected features:

```json
{
  "AzureAd": {            // if auth = azure-ad
    "Instance": "https://login.microsoftonline.com/",
    "TenantId": "",
    "ClientId": "",
    "Audience": "api://<client-id>"
  },
  "ConnectionStrings": {  // if db = sql
    "AzureSQL": "Server=tcp:<server>.database.windows.net,1433;Initial Catalog=<db>;Authentication=Active Directory Default;"
  },
  "MicrosoftGraph": {     // if graph integration = yes
    "BaseUrl": "https://graph.microsoft.com/v1.0",
    "Scopes": "Files.Read.All"
  },
  "AllowedHosts": "*"
}
```

Add `.gitignore` entries:
```
appsettings.*.json
!appsettings.Development.json
*.user
.vs/
bin/
obj/
```

### Step 5: NuGet Package Installation

Install packages based on selections:

```bash
cd {ProjectName}

# Always
dotnet add package Microsoft.AspNetCore.OpenApi
dotnet add package Swashbuckle.AspNetCore

# If auth = azure-ad (Web API)
dotnet add package Microsoft.Identity.Web

# If auth = azure-ad (Blazor or + Graph)
dotnet add package Microsoft.Identity.Web.GraphServiceClient
dotnet add package Microsoft.Identity.Web.UI

# If db = sql
dotnet add package Microsoft.EntityFrameworkCore.SqlServer
dotnet add package Microsoft.EntityFrameworkCore.Tools

# If graph integration = yes
dotnet add package Microsoft.Graph
dotnet add package Azure.Identity
```

### Step 6: Build Verification

```bash
dotnet restore
dotnet build --configuration Release
```

Report all output. For common errors:
- `CS0234` — missing using directive; add to the generated file
- NuGet SSL errors — `dotnet nuget add source https://api.nuget.org/v3/index.json`
- Version conflicts — suggest `--version` flag with the latest stable version

### Step 7: Summary Report

```
## Setup Complete — {ProjectName}

| Item | Status |
|------|--------|
| .NET 8 | OK — v8.0.x |
| Project type | Web API (Minimal API) |
| Authentication | Azure AD (Microsoft.Identity.Web) |
| Database | Azure SQL (EF Core) |
| Graph integration | Yes |
| Build | OK — 0 errors |

### Next steps:
1. Fill in AzureAd__TenantId and AzureAd__ClientId in appsettings.json
2. Set ConnectionStrings__AzureSQL with your Azure SQL server name
3. Run: dotnet ef migrations add InitialCreate (if using EF Core)
4. Scaffold an API endpoint: /azure-dotnet-webapp:scaffold-api
5. Scaffold a Blazor page:   /azure-dotnet-webapp:scaffold-blazor
6. Deploy to App Service:    /azure-dotnet-webapp:deploy-webapp
```

## Arguments

- `--type api`: Skip project type question, scaffold Minimal API
- `--type blazor`: Skip project type question, scaffold Blazor Web App
- `--type both`: Skip project type question, scaffold full-stack
- `--auth none`: Skip auth question, no authentication
- `--auth azure-ad`: Skip auth question, use Microsoft.Identity.Web
- `--db none`: Skip database question, no database
- `--db sql`: Skip database question, add EF Core + Azure SQL
