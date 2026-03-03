---
name: azure-graph-dotnet
description: >
  Deep expertise in building Microsoft Graph API solutions in C# / .NET on Azure —
  Microsoft.Graph SDK v5, Azure Identity credential chain, Azure Functions isolated worker model,
  Polly v8 resilience pipelines, SharePoint and OneDrive file intelligence implementations,
  delta queries, batch requests, metadata operations, and CI/CD deployment patterns.
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
triggers:
  - azure functions csharp
  - dotnet graph api
  - c# sharepoint
  - c# onedrive
  - microsoft graph sdk csharp
  - azure identity dotnet
  - polly graph retry
  - graph sdk v5
  - dotnet azure scaffold
  - csharp graph client
  - azure functions graph
  - dotnet delta query
  - c# managed identity
  - graph batch csharp
  - azure container job dotnet
  - sharepoint csharp azure
  - net8 azure functions
  - defaultazurecredential
---

# Azure Graph .NET

This skill provides comprehensive patterns for building Microsoft Graph solutions in C# / .NET,
hosted on Azure Functions or as Azure Container Jobs. It covers the full development lifecycle:
project scaffolding, authentication, Graph SDK configuration, resilience, SharePoint file
intelligence operations, and production deployment.

## NuGet Package Versions (as of 2025)

| Package | Version | Purpose |
|---------|---------|---------|
| `Microsoft.Graph` | 5.x | Graph SDK v5 |
| `Azure.Identity` | 1.x | DefaultAzureCredential, ManagedIdentity |
| `Microsoft.Azure.Functions.Worker` | 1.x | .NET 8 isolated worker host |
| `Microsoft.Azure.Functions.Worker.Extensions.Timer` | 4.x | Timer triggers |
| `Microsoft.Azure.Functions.Worker.Extensions.Http` | 3.x | HTTP triggers |
| `Microsoft.Azure.Functions.Worker.ApplicationInsights` | 1.x | Telemetry |
| `Microsoft.Extensions.Azure` | 1.x | DI registration for Azure clients |
| `Polly` | 8.x | Resilience pipelines |
| `Microsoft.Extensions.Http.Resilience` | 8.x | Polly + HttpClient integration |
| `CsvHelper` | 33.x | CSV inventory output |
| `Microsoft.Extensions.Configuration.AzureKeyVault` | 3.x | Key Vault config provider |

---

## 1. Authentication — Azure Identity Chain

Use `DefaultAzureCredential` everywhere. It checks in order:
`EnvironmentCredential → WorkloadIdentity → ManagedIdentity → AzureCLI → VisualStudio`

```csharp
// Program.cs
using Azure.Identity;
using Microsoft.Extensions.Azure;

builder.Services.AddAzureClients(clients =>
{
    clients.AddClient<GraphServiceClient, GraphClientOptions>((_, _, provider) =>
    {
        var credential = new DefaultAzureCredential(new DefaultAzureCredentialOptions
        {
            ExcludeVisualStudioCodeCredential = false,
            ExcludeAzureCliCredential = false
        });

        var scopes = new[] { "https://graph.microsoft.com/.default" };
        return new GraphServiceClient(credential, scopes);
    });
});
```

### Local development fallback

Set environment variables for `EnvironmentCredential`:
```bash
AZURE_TENANT_ID=<tenant-id>
AZURE_CLIENT_ID=<client-id>
AZURE_CLIENT_SECRET=<client-secret>   # or AZURE_CLIENT_CERTIFICATE_PATH
```

In Azure, assign the Function App / Container's Managed Identity the required Graph app roles
(e.g. `Sites.Read.All`) via **Entra ID** → **Enterprise Applications** → **App role assignments**.

---

## 2. Microsoft.Graph SDK v5 — Key Patterns

### Fluent request builder

```csharp
// List drives in a site
var drives = await graphClient.Sites[siteId].Drives
    .GetAsync(config => config.QueryParameters.Select = ["id", "name", "driveType"]);

// Get driveItem with file hashes
var item = await graphClient.Drives[driveId].Items[itemId]
    .GetAsync(config => config.QueryParameters.Select = ["id", "name", "file", "size"]);
```

### Page iterator — enumerate all items

```csharp
using Microsoft.Graph.Models;

var firstPage = await graphClient.Drives[driveId].Root.Delta
    .GetAsync(config =>
    {
        config.QueryParameters.Select = ["id", "name", "size", "file", "folder",
            "parentReference", "createdDateTime", "lastModifiedDateTime",
            "createdBy", "lastModifiedBy", "deleted"];
    });

var items = new List<DriveItem>();
var pageIterator = PageIterator<DriveItem, DriveItemCollectionResponse>
    .CreatePageIterator(graphClient, firstPage!, item =>
    {
        items.Add(item);
        return true; // return false to stop early
    });

await pageIterator.IterateAsync();

// Save delta link for next incremental run
var deltaLink = pageIterator.Deltalink;
```

### Batch requests (up to 20 per batch)

```csharp
using Microsoft.Graph.Models.ODataErrors;

var batchRequestContent = new BatchRequestContentCollection(graphClient);

var getRequest1 = graphClient.Sites[siteId1].ToGetRequestInformation();
var getRequest2 = graphClient.Sites[siteId2].ToGetRequestInformation();

var id1 = await batchRequestContent.AddBatchRequestStepAsync(getRequest1);
var id2 = await batchRequestContent.AddBatchRequestStepAsync(getRequest2);

var batchResponse = await graphClient.Batch.PostAsync(batchRequestContent);

var site1 = await batchResponse.GetResponseByIdAsync<Site>(id1);
var site2 = await batchResponse.GetResponseByIdAsync<Site>(id2);
```

### PATCH list item fields (metadata update)

```csharp
var fieldsUpdate = new FieldValueSet
{
    AdditionalData = new Dictionary<string, object>
    {
        { "Department", "Finance" },
        { "RetentionLabel", "7-Year Financial Records" }
    }
};

await graphClient.Sites[siteId].Lists[listId].Items[itemId].Fields
    .PatchAsync(fieldsUpdate);
```

### Move a file (same drive)

```csharp
var update = new DriveItem
{
    ParentReference = new ItemReference { Id = targetFolderId },
    Name = newFileName // optional rename
};

await graphClient.Drives[driveId].Items[itemId].PatchAsync(update);
```

---

## 3. Polly v8 Resilience Pipeline

### Throttling + retry for Graph calls

```csharp
using Polly;
using Polly.Retry;

// In Program.cs / DI setup
builder.Services.AddResiliencePipeline("graph-pipeline", pipeline =>
{
    pipeline
        .AddRetry(new RetryStrategyOptions
        {
            MaxRetryAttempts = 6,
            BackoffType = DelayBackoffType.Exponential,
            UseJitter = true,
            Delay = TimeSpan.FromSeconds(2),
            MaxDelay = TimeSpan.FromSeconds(60),
            ShouldHandle = new PredicateBuilder()
                .Handle<ODataError>(e =>
                    e.ResponseStatusCode == 429 ||
                    e.ResponseStatusCode == 503 ||
                    e.ResponseStatusCode == 504),
            OnRetry = args =>
            {
                logger.LogWarning("Graph throttled ({status}), attempt {attempt}, waiting {delay}",
                    args.Outcome.Exception?.Message, args.AttemptNumber, args.RetryDelay);
                return ValueTask.CompletedTask;
            }
        })
        .AddTimeout(TimeSpan.FromMinutes(5));
});

// Usage
var pipeline = resiliencePipelineProvider.GetPipeline("graph-pipeline");
var drives = await pipeline.ExecuteAsync(async ct =>
    await graphClient.Sites[siteId].Drives.GetAsync(cancellationToken: ct), ct);
```

### Retry-After header respect

Graph returns `Retry-After` seconds in the 429 response header. With `Microsoft.Graph` SDK v5,
the `GraphClientFactory` handles this automatically when configured with `GraphHttpMessageHandler`.
For custom handlers:

```csharp
// Custom delegating handler for Retry-After
public class RetryAfterHandler : DelegatingHandler
{
    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken ct)
    {
        var response = await base.SendAsync(request, ct);
        if (response.StatusCode == HttpStatusCode.TooManyRequests)
        {
            var retryAfter = response.Headers.RetryAfter?.Delta ?? TimeSpan.FromSeconds(10);
            await Task.Delay(retryAfter, ct);
            return await base.SendAsync(request, ct);
        }
        return response;
    }
}
```

---

## 4. Azure Functions — .NET 8 Isolated Worker

See deep-dive: [`references/azure-functions-dotnet.md`](./references/azure-functions-dotnet.md)

### Program.cs entry point

```csharp
using Microsoft.Extensions.Hosting;

var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults()
    .ConfigureServices((context, services) =>
    {
        services.AddApplicationInsightsTelemetryWorkerService();
        services.ConfigureFunctionsApplicationInsights();

        // Graph client via DefaultAzureCredential
        services.AddSingleton(_ =>
        {
            var credential = new DefaultAzureCredential();
            return new GraphServiceClient(credential,
                ["https://graph.microsoft.com/.default"]);
        });

        // Resilience pipelines
        services.AddResiliencePipeline("graph-pipeline", /* ... */);

        // Register services
        services.AddScoped<IDeltaScanService, DeltaScanService>();
        services.AddScoped<IDuplicateDetectionService, DuplicateDetectionService>();
    })
    .Build();

await host.RunAsync();
```

### Timer-triggered scan function

```csharp
public class InventoryScanFunction(
    IDeltaScanService scanService,
    ILogger<InventoryScanFunction> logger)
{
    [Function("InventoryScan")]
    public async Task Run(
        [TimerTrigger("0 0 2 * * *")] TimerInfo timerInfo,  // daily at 02:00 UTC
        CancellationToken ct)
    {
        logger.LogInformation("Starting inventory scan at {time}", DateTime.UtcNow);

        var result = await scanService.ScanAllDrivesAsync(ct);

        logger.LogInformation(
            "Scan complete: {files} files, {size} GB across {drives} drives",
            result.TotalFiles, result.TotalSizeGb, result.DrivesScanned);
    }
}
```

---

## 5. SharePoint File Intelligence in C# #

See deep-dives:
- [`references/delta-scan-csharp.md`](./references/delta-scan-csharp.md)
- [`references/duplicate-detection-csharp.md`](./references/duplicate-detection-csharp.md)
- [`references/metadata-operations-csharp.md`](./references/metadata-operations-csharp.md)

### Delta scan service interface

```csharp
public interface IDeltaScanService
{
    Task<ScanResult> ScanDriveAsync(string driveId, CancellationToken ct = default);
    Task<ScanResult> ScanAllDrivesAsync(CancellationToken ct = default);
    Task<ScanResult> ScanIncrementalAsync(string driveId, CancellationToken ct = default);
}

public record ScanResult(
    int TotalFiles,
    int TotalFolders,
    long TotalSizeBytes,
    int DrivesScanned,
    string OutputPath,
    DateTimeOffset ScannedAt)
{
    public double TotalSizeGb => TotalSizeBytes / 1_073_741_824.0;
}
```

### Inventory record

```csharp
public record FileInventoryRecord
{
    public string Id { get; init; } = "";
    public string Name { get; init; } = "";
    public string Extension => Path.GetExtension(Name).ToLowerInvariant();
    public long SizeBytes { get; init; }
    public double SizeMb => SizeBytes / 1_048_576.0;
    public string ParentPath { get; init; } = "";
    public string FullPath => $"{ParentPath}/{Name}";
    public string WebUrl { get; init; } = "";
    public DateTimeOffset CreatedDateTime { get; init; }
    public string CreatedBy { get; init; } = "";
    public DateTimeOffset LastModifiedDateTime { get; init; }
    public string LastModifiedBy { get; init; } = "";
    public string? Sha1Hash { get; init; }
    public string? QuickXorHash { get; init; }
    public string MimeType { get; init; } = "";
    public string DriveId { get; init; } = "";
    public string DriveName { get; init; } = "";
    public string DriveType { get; init; } = "";
    public string SiteId { get; init; } = "";
    public int Depth { get; init; }
}
```

### Duplicate detection

```csharp
public class DuplicateDetectionService
{
    public IReadOnlyList<DuplicateGroup> FindExactDuplicates(
        IEnumerable<FileInventoryRecord> inventory)
    {
        return inventory
            .Where(f => f.Sha1Hash is not null || f.QuickXorHash is not null)
            .GroupBy(f => f.Sha1Hash ?? f.QuickXorHash!)
            .Where(g => g.Count() > 1)
            .Select(g => new DuplicateGroup(
                Hash: g.Key,
                Strategy: DuplicateStrategy.ExactHash,
                Items: [.. g.OrderBy(f => f.CreatedDateTime)],
                KeepCandidate: g.OrderBy(f => f.CreatedDateTime).First(),
                WastedBytes: g.Skip(1).Sum(f => f.SizeBytes)))
            .OrderByDescending(g => g.WastedBytes)
            .ToList();
    }

    public IReadOnlyList<DuplicateGroup> FindNearDuplicates(
        IEnumerable<FileInventoryRecord> inventory)
    {
        static string NearDupKey(FileInventoryRecord f) =>
            $"{f.Name.ToLowerInvariant()}|{f.SizeBytes / 1024}";

        return inventory
            .GroupBy(NearDupKey)
            .Where(g => g.Count() > 1)
            .Select(g => new DuplicateGroup(
                Hash: g.Key,
                Strategy: DuplicateStrategy.NearDup,
                Items: [.. g],
                KeepCandidate: g.OrderBy(f => f.CreatedDateTime).First(),
                WastedBytes: g.Skip(1).Sum(f => f.SizeBytes)))
            .OrderByDescending(g => g.WastedBytes)
            .ToList();
    }
}

public record DuplicateGroup(
    string Hash,
    DuplicateStrategy Strategy,
    IReadOnlyList<FileInventoryRecord> Items,
    FileInventoryRecord KeepCandidate,
    long WastedBytes);

public enum DuplicateStrategy { ExactHash, NearDup }
```

---

## 6. Progressive Disclosure — Reference Files

| Topic | File |
|-------|------|
| Azure Functions isolated worker, triggers, DI | [`references/azure-functions-dotnet.md`](./references/azure-functions-dotnet.md) |
| Delta scan C# implementation | [`references/delta-scan-csharp.md`](./references/delta-scan-csharp.md) |
| Duplicate detection C# implementation | [`references/duplicate-detection-csharp.md`](./references/duplicate-detection-csharp.md) |
| Metadata and content-type PATCH in C# | [`references/metadata-operations-csharp.md`](./references/metadata-operations-csharp.md) |
| Azure Container Jobs (.NET) | [`references/container-jobs-dotnet.md`](./references/container-jobs-dotnet.md) |
| CI/CD — GitHub Actions + Azure DevOps | [`references/cicd-deployment.md`](./references/cicd-deployment.md) |
