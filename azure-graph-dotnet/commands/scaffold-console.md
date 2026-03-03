---
name: azure-graph-dotnet:scaffold-console
description: Scaffold a .NET 8 console app / Azure Container Job for long-running batch Graph operations — generic host, BackgroundService worker, Dockerfile, ACA Job Bicep, and Managed Identity role assignment script.
argument-hint: "[--project-name MyJob] [--output-dir ./]"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# Scaffold Console App / Azure Container Job

Generate a production-ready .NET 8 console app suitable for deployment as an Azure Container
Apps Job (for long-running batch Graph operations that exceed Function timeout limits).

## Scaffold Flow

### Step 1: Collect Parameters

Ask if not provided via arguments:
- **Project name** (default: `GraphBatchJob`)
- **Namespace** (default: derived from project name, PascalCase)
- **Output directory** (default: current directory)
- **Primary Graph operation** (delta scan / duplicates / metadata / all)

### Step 2: Generate Project Files

Write all files using the Write tool. Every file must be fully compilable — no `// TODO` stubs.

**File list:**
- `{ProjectName}.csproj` — with all NuGet packages at correct versions
- `Program.cs` — generic host with DI, Key Vault config, resilience pipeline, service registrations
- `appsettings.json` — with all config keys (no values)
- `.gitignore` — including `appsettings.*.json`, `obj/`, `bin/`
- `Dockerfile` — multi-stage build, `mcr.microsoft.com/dotnet/runtime:8.0` base
- `.dockerignore`
- `Workers/ScanJobWorker.cs` — `BackgroundService` that runs, completes, and calls `StopApplication()`
- `Services/IDeltaScanService.cs` + `Services/DeltaScanService.cs`
- `Services/IDuplicateDetectionService.cs` + `Services/DuplicateDetectionService.cs`
- `Services/IDeltaStateStore.cs` + `Services/BlobDeltaStateStore.cs`
- `Models/FileInventoryRecord.cs`
- `Models/ScanResult.cs`
- `Models/DuplicateGroup.cs`

### Step 3: Generate Infrastructure Files

Write to `infra/`:
- `infra/main.bicep` — Azure Container Apps environment, ACA Job, ACR, Storage Account, Key Vault
- `infra/main.bicepparam` — parameter file template
- `infra/assign-graph-roles.sh` — post-deploy Managed Identity role assignment script

### Step 4: Generate CI/CD Pipeline

Ask which CI/CD system:
- **GitHub Actions** — write `.github/workflows/deploy-container-job.yml`
- **Azure DevOps** — write `azure-pipelines.yml`
- **Both**

### Step 5: Build Verification

```bash
cd {ProjectName}
dotnet restore && dotnet build
docker build -t {project-name}:local . 2>/dev/null || echo "Docker build skipped (Docker not available)"
```

Report results and fix any build errors.

### Step 6: Summary

```
## Scaffolded: {ProjectName}

Files created:
  {ProjectName}/
  ├── {ProjectName}.csproj
  ├── Program.cs
  ├── appsettings.json
  ├── Dockerfile
  ├── Workers/ScanJobWorker.cs
  ├── Services/ (4 files)
  ├── Models/ (3 files)
  └── infra/
      ├── main.bicep
      ├── main.bicepparam
      └── assign-graph-roles.sh

### Deploy to Azure:
1. Create infrastructure:
   az deployment group create --template-file infra/main.bicep --parameters infra/main.bicepparam

2. Build and push image:
   az acr build --registry <acr-name> --image graph-batch-job:latest .

3. Assign Graph permissions:
   ./infra/assign-graph-roles.sh <managed-identity-object-id> Sites.Read.All Files.Read.All

4. Run the job manually:
   az containerapp job start --name <job-name> --resource-group <rg>

5. Check logs:
   az containerapp job execution list --name <job-name> --resource-group <rg>
```

## Arguments

- `--project-name <name>`: Project name (default: `GraphBatchJob`)
- `--output-dir <path>`: Output directory (default: current directory)
- `--operations <list>`: Comma-separated operations to include (default: all)
