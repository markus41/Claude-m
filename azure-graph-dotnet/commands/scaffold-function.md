---
name: azure-graph-dotnet:scaffold-function
description: Scaffold a new Azure Function class for a specific Graph operation — timer, HTTP, or Durable trigger — with DI wiring, resilience pipeline, logging, and cancellation token support.
argument-hint: "<operation> [--trigger timer|http|durable] [--function-name MyFunction]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

# Scaffold Azure Function

Generate a fully wired Azure Function class for a specific Microsoft Graph operation.

## Scaffold Flow

### Step 1: Identify Target

Read the existing project to understand the structure:
- Use Glob to find `*.csproj` files
- Read `Program.cs` to understand registered services and DI configuration
- List existing function files in `Functions/`

If no project is found, suggest running `dotnet-setup` first.

### Step 2: Select Operation

If `<operation>` argument is not provided, ask:
- **Delta scan** — enumerate all files in a site/drive using delta query
- **Find duplicates** — analyze an existing inventory for exact and near-duplicates
- **Apply metadata** — batch PATCH metadata columns on matched files
- **Move / consolidate** — move files to target folders per a mapping
- **Custom** — I'll describe the Graph operations needed

### Step 3: Select Trigger

If `--trigger` not provided, ask:
- **Timer** — scheduled (CRON expression); best for inventory scans
- **HTTP** — on-demand via REST call; best for triggered operations
- **Durable orchestration** — fan-out across multiple sites/drives; best for tenant-wide scans

### Step 4: Generate Function Class

Scaffold a compilable, fully-typed function class. Examples:

**Timer — delta scan:**
```csharp
// Functions/DeltaScanFunction.cs
public class DeltaScanFunction(
    IDeltaScanService scanService,
    ILogger<DeltaScanFunction> logger)
{
    [Function("DeltaScan")]
    public async Task Run(
        [TimerTrigger("%SCAN_CRON_SCHEDULE%")] TimerInfo timerInfo,
        CancellationToken ct)
    {
        if (timerInfo.IsPastDue)
            logger.LogWarning("Timer is running late — previous execution may have overlapped");

        logger.LogInformation("Delta scan starting at {time}", DateTimeOffset.UtcNow);
        var result = await scanService.ScanAllDrivesAsync(ct);
        logger.LogInformation(
            "Scan complete: {files} files, {gb} GB across {drives} drives",
            result.TotalFiles, result.TotalSizeGb, result.DrivesScanned);
    }
}
```

**HTTP — on-demand with site ID parameter:**
```csharp
// Functions/TriggerScanFunction.cs
public class TriggerScanFunction(
    IDeltaScanService scanService,
    ILogger<TriggerScanFunction> logger)
{
    [Function("TriggerScan")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Function, "post", Route = "scan/{siteId}")] HttpRequestData req,
        string siteId,
        CancellationToken ct)
    {
        logger.LogInformation("Manual scan triggered for site {siteId}", siteId);

        var result = await scanService.ScanSiteAsync(siteId, allDrives: true, ct);

        var response = req.CreateResponse(HttpStatusCode.OK);
        await response.WriteAsJsonAsync(new {
            result.TotalFiles,
            result.TotalSizeGb,
            result.DrivesScanned,
            result.ScannedAt
        }, ct);
        return response;
    }
}
```

**Durable — fan-out across sites:**
```csharp
// Functions/TenantScanOrchestrator.cs
public class TenantScanOrchestrator(ILogger<TenantScanOrchestrator> logger)
{
    [Function("TenantScanOrchestrator")]
    public async Task<List<ScanResult>> RunOrchestrator(
        [OrchestrationTrigger] TaskOrchestrationContext context)
    {
        var sites = await context.CallActivityAsync<List<string>>("GetAllSites");
        logger.LogInformation("Orchestrating scan across {count} sites", sites.Count);

        var tasks = sites.Select(id =>
            context.CallActivityAsync<ScanResult>("ScanSite", id));
        return [.. await Task.WhenAll(tasks)];
    }

    [Function("GetAllSites")]
    public async Task<List<string>> GetAllSites(
        [ActivityTrigger] string _, FunctionContext ctx)
        => await siteDiscovery.GetAllSiteIdsAsync();

    [Function("ScanSite")]
    public async Task<ScanResult> ScanSite(
        [ActivityTrigger] string siteId, FunctionContext ctx)
        => await scanService.ScanSiteAsync(siteId);
}
```

### Step 5: Wire DI in Program.cs

Read `Program.cs` and add the required service registrations if not already present:
- Add `IDeltaScanService` / `DeltaScanService` registration
- Add `ResiliencePipeline` for Graph throttling
- Add Blob Storage client for delta state (if using BlobDeltaStateStore)
- Add App Settings bindings for CRON schedule / site URL

Show the diff of what was added.

### Step 6: Confirm Build

```bash
dotnet build
```

Report any compilation errors and fix them.

## Arguments

- `<operation>`: `delta-scan`, `find-duplicates`, `apply-metadata`, `consolidate-files`, or description
- `--trigger timer|http|durable`: Trigger type (default: prompted)
- `--function-name <name>`: Class and function name override
- `--output-dir <path>`: Where to write the function file (default: `./Functions/`)
