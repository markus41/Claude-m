---
name: azure-graph-dotnet:add-graph-operation
description: Add a specific Microsoft Graph operation to an existing C# project — generates a service class, interface, model records, and DI registration for delta scan, metadata PATCH, file moves, or custom Graph calls.
argument-hint: "<operation> [--project-path ./] [--namespace MyApp.Services]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Bash
  - AskUserQuestion
---

# Add Graph Operation

Add a fully implemented Graph API operation to an existing C# project.

## Flow

### Step 1: Discover Project

- Use Glob to find `*.csproj` files in the current directory tree
- Read `Program.cs` to understand DI registrations and namespace
- Check `Services/` for existing service files to avoid duplication

If no project found, ask the user to specify the project path or run `dotnet-setup` first.

### Step 2: Select Operation

If `<operation>` not provided, present options:
- **delta-scan** — `IDeltaScanService` / `DeltaScanService` + `FileInventoryRecord`, `ScanResult`
- **duplicate-detection** — `IDuplicateDetectionService` / `DuplicateDetectionService` + `DuplicateGroup`, `DuplicateReport`
- **apply-metadata** — `IMetadataService` / `MetadataService` + `CategoryRule`, `ApplyResult`
- **file-move** — `IFileMoveService` / `FileMoveService` + `MoveMapping`, `MoveResult`
- **site-discovery** — `ISiteDiscoveryService` — enumerate all sites and drives in tenant
- **custom** — describe the operation and generate appropriate C# code

### Step 3: Generate Files

For each operation, generate the following files (using exact C# from skill references):

**delta-scan:**
- `Services/IDeltaScanService.cs`
- `Services/DeltaScanService.cs` — full delta loop with paging, depth filter, hash capture
- `Services/IDeltaStateStore.cs`
- `Services/FileDeltaStateStore.cs` — file-based state (for local/console)
- `Services/BlobDeltaStateStore.cs` — Blob Storage state (for Azure)
- `Models/FileInventoryRecord.cs`
- `Models/ScanResult.cs`

**duplicate-detection:**
- `Services/IDuplicateDetectionService.cs`
- `Services/DuplicateDetectionService.cs` — exact (hash) + near-dup (name+size)
- `Models/DuplicateGroup.cs`
- `Models/DuplicateReport.cs`

**apply-metadata:**
- `Services/IMetadataService.cs`
- `Services/MetadataService.cs` — single PATCH + batch (20 per batch)
- `Services/CategorizationEngine.cs` — rule matching
- `Services/TermStoreService.cs` — term GUID lookup with caching
- `Models/CategoryRule.cs`
- `Models/ApplyResult.cs`

**file-move:**
- `Services/IFileMoveService.cs`
- `Services/FileMoveService.cs` — same-drive PATCH parentReference + cross-site copy+delete
- `Models/MoveMapping.cs`
- `Models/MoveResult.cs`

**site-discovery:**
- `Services/ISiteDiscoveryService.cs`
- `Services/SiteDiscoveryService.cs` — paginated `/sites?search=*` + drives per site

### Step 4: Update Program.cs

Read `Program.cs` and add the required service registrations if not already present.

For `delta-scan`:
```csharp
// Add after existing service registrations
services.AddScoped<IDeltaScanService, DeltaScanService>();
services.AddSingleton<IDeltaStateStore>(sp =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    var storageConn = config["AZURE_STORAGE_CONNECTION"];
    if (!string.IsNullOrEmpty(storageConn))
    {
        var container = new BlobContainerClient(storageConn, "sp-reports");
        container.CreateIfNotExists();
        return new BlobDeltaStateStore(container);
    }
    return new FileDeltaStateStore("./sp-reports/.delta-state.json");
});
```

Show the exact lines added.

### Step 5: Add NuGet Packages (if needed)

Check `.csproj` for missing packages and add them:
```bash
dotnet add package CsvHelper --version "33.*"
dotnet add package Azure.Storage.Blobs --version "12.*"
```

### Step 6: Build Check

```bash
dotnet build
```

Fix any compilation errors before completing.

### Step 7: Summary

List every file created or modified, with a one-line description of what was added. Include a
quick usage snippet showing how to inject and call the new service.

## Arguments

- `<operation>`: `delta-scan`, `duplicate-detection`, `apply-metadata`, `file-move`, `site-discovery`, or a natural-language description
- `--project-path <path>`: Root of the C# project (default: current directory)
- `--namespace <ns>`: C# namespace to use (default: inferred from `.csproj`)
- `--no-di-update`: Skip updating `Program.cs` with DI registrations
