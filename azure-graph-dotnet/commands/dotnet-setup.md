---
name: azure-graph-dotnet:dotnet-setup
description: Interactive setup wizard for C# / .NET Azure Graph projects — checks prerequisites, selects hosting model, configures Azure Identity, validates toolchain, and writes appsettings / local.settings files.
argument-hint: "[--functions | --container-job] [--minimal]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - AskUserQuestion
---

# .NET Azure Graph Setup

Interactive setup for building Microsoft Graph solutions in C# / .NET on Azure.

## Setup Flow

### Step 1: Prerequisite Check

Run the following checks and report version + status for each:

```bash
dotnet --version          # Required: 8.0+
az --version              # Recommended: Azure CLI
func --version            # Required for Functions: Azure Functions Core Tools v4
docker --version          # Required for Container Jobs
pwsh --version            # Optional: PowerShell 7
git --version             # Required
```

Print a status table. Stop if `dotnet` < 8.0. For missing optional tools, print install instructions:
- Azure CLI: `https://aka.ms/installazurecli`
- Functions Core Tools: `npm i -g azure-functions-core-tools@4 --unsafe-perm true`
- Docker: `https://docs.docker.com/get-docker/`

### Step 2: Select Hosting Model

Ask:
- **Azure Functions (.NET 8 isolated worker)** — Timer/HTTP/Durable triggers, serverless
- **Azure Container Job** — Long-running batch (30+ min), containerised, scheduled via ACA Jobs
- **Both** — Scaffold shared library + two project heads

Also ask:
- **Project name** (default: `GraphFileIntelligence`)
- **Output directory** (default: current directory)
- **Target namespace** (default: derived from project name)

### Step 3: Scaffold Project Structure

**Functions project:**
```
{ProjectName}/
├── {ProjectName}.csproj
├── Program.cs
├── host.json
├── local.settings.json      (gitignored)
├── .gitignore
├── Functions/
│   ├── InventoryScanFunction.cs
│   └── TriggerScanFunction.cs
├── Services/
│   ├── IDeltaScanService.cs
│   ├── DeltaScanService.cs
│   ├── IDuplicateDetectionService.cs
│   └── DuplicateDetectionService.cs
└── Models/
    ├── FileInventoryRecord.cs
    ├── ScanResult.cs
    └── DuplicateGroup.cs
```

**Container Job project:**
```
{ProjectName}/
├── {ProjectName}.csproj
├── Program.cs
├── appsettings.json
├── Dockerfile
├── .dockerignore
├── .gitignore
├── Workers/
│   └── ScanJobWorker.cs
├── Services/
│   └── (same as above)
└── Models/
    └── (same as above)
```

Write all files using the Write tool. Content should be fully compilable stubs — not placeholders.

### Step 4: Configure Azure Credentials

Ask how they will authenticate locally:
- **Azure CLI** (`az login`) — uses `AzureCliCredential` in `DefaultAzureCredential` chain
- **Environment variables** — set `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`
- **Visual Studio / VS Code** — uses `VisualStudioCredential` / `VisualStudioCodeCredential`

For environment variable path, ask for:
- Tenant ID
- Client ID
- Client Secret

Write `local.settings.json` (Functions) or update `appsettings.json` (Container Job) with values.
Ensure `.gitignore` includes `local.settings.json` and `appsettings.*.json`.

### Step 5: Install NuGet Packages

```bash
cd {ProjectName}
dotnet restore
dotnet build
```

Report success or errors. For common restore errors:
- Certificate / SSL errors: `dotnet nuget add source https://api.nuget.org/v3/index.json`
- Version conflicts: suggest updating the package version in `.csproj`

### Step 6: Verify Build

```bash
dotnet build --configuration Release
```

Print build output. If there are errors, show them and suggest fixes.

### Step 7: Summary Report

```
## Setup Complete — {ProjectName}

| Item | Status |
|------|--------|
| .NET 8 | OK — v8.0.x |
| Azure CLI | OK — v2.x |
| Functions Core Tools | OK — v4.x |
| Project scaffolded | OK — {path} |
| Credentials configured | OK — Azure CLI |
| Build | OK — 0 errors |

### Next steps:
1. Add your site URL: set GRAPH_SITE_URL in local.settings.json
2. Run locally: func start (Functions) or dotnet run (Container Job)
3. Scaffold a specific operation: /azure-graph-dotnet:scaffold-function
4. Add a Graph operation: /azure-graph-dotnet:add-graph-operation
```

## Arguments

- `--functions`: Skip hosting model question, scaffold Functions project
- `--container-job`: Skip hosting model question, scaffold Container Job
- `--minimal`: Scaffold project structure only; skip credentials and build verification
