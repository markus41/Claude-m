---
name: azure-dotnet-webapp:add-webapi-operation
description: Add an ASP.NET Core endpoint or Blazor service call that wraps a Microsoft Graph operation — preset patterns for file inventory, duplicate detection, and metadata, or a custom operation. Wires GraphServiceClient and ResiliencePipeline DI if not already present.
argument-hint: "[--operation graph-files|graph-duplicates|graph-metadata|custom]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Add Web API Operation

Add a new API endpoint or Blazor service call backed by Microsoft Graph or a custom data source.
Bridges `azure-graph-dotnet` Graph service patterns into ASP.NET Core HTTP endpoints or Blazor
service calls.

## Operation Flow

### Step 1: Detect Project

Read the `.csproj` file and `Program.cs` to determine:
- Project type (Web API / Blazor / both)
- API style (Minimal API / Controllers)
- Installed packages (Microsoft.Graph, Microsoft.Identity.Web, EF Core)
- Existing service registrations

If `Microsoft.Graph` is not installed, offer to install it:
```bash
dotnet add package Microsoft.Graph
dotnet add package Azure.Identity
dotnet add package Microsoft.Identity.Web.GraphServiceClient
```

### Step 2: Select Operation

Ask if not provided via `--operation`:

1. **Graph — File Inventory** — wraps delta scan, returns file list from OneDrive/SharePoint
2. **Graph — Duplicate Detection** — wraps duplicate grouping service, returns duplicate groups
3. **Graph — Metadata Operations** — wraps PATCH operations to update SharePoint list item fields
4. **Custom** — define a new operation from scratch

### Step 3A: Graph — File Inventory

**Description**: Scans a drive via Microsoft Graph delta query and returns the file inventory.
**Borrows from**: `azure-graph-dotnet` `DeltaScanService` interface.

Generate `Features/GraphFiles/GraphFilesEndpoints.cs` (Minimal) or `GraphFilesController.cs`:

```csharp
// Minimal API group
public static class GraphFilesEndpoints
{
    public static IEndpointRouteBuilder MapGraphFiles(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/graph/files")
            .WithTags("Graph Files")
            .RequireAuthorization();

        // GET /api/graph/files/inventory?driveId={driveId}
        group.MapGet("/inventory", async (
            [FromQuery] string driveId,
            GraphServiceClient graphClient,
            ResiliencePipelineProvider<string> pipelineProvider,
            ILogger<Program> logger,
            CancellationToken ct) =>
        {
            var pipeline = pipelineProvider.GetPipeline("graph-pipeline");

            var firstPage = await pipeline.ExecuteAsync(async token =>
                await graphClient.Drives[driveId].Root.Delta
                    .GetAsync(config =>
                        config.QueryParameters.Select =
                            ["id", "name", "size", "file", "folder",
                             "parentReference", "createdDateTime", "lastModifiedDateTime",
                             "file/hashes"],
                        token),
                ct);

            var items = new List<DriveItemDto>();
            var pageIterator = PageIterator<DriveItem, DriveItemCollectionResponse>
                .CreatePageIterator(graphClient, firstPage!, item =>
                {
                    if (item.File is not null) // only files, skip folders
                        items.Add(DriveItemDto.FromDriveItem(item));
                    return true;
                });

            await pageIterator.IterateAsync();

            logger.LogInformation("Drive {DriveId} inventory: {Count} files", driveId, items.Count);
            return Results.Ok(new { DriveId = driveId, FileCount = items.Count, Files = items });
        })
        .WithName("GetGraphFileInventory")
        .Produces<object>()
        .ProducesProblem(StatusCodes.Status400BadRequest);

        return app;
    }
}

public record DriveItemDto(
    string Id,
    string Name,
    long? SizeBytes,
    string? WebUrl,
    string? Sha1Hash,
    DateTimeOffset? LastModified)
{
    public static DriveItemDto FromDriveItem(DriveItem item) => new(
        item.Id ?? "",
        item.Name ?? "",
        item.Size,
        item.WebUrl,
        item.File?.Hashes?.Sha1Hash,
        item.LastModifiedDateTime);
}
```

### Step 3B: Graph — Duplicate Detection

**Description**: Groups files by hash to identify duplicates across a drive.

Generate `Features/GraphDuplicates/GraphDuplicatesEndpoints.cs`:

```csharp
public static class GraphDuplicatesEndpoints
{
    public static IEndpointRouteBuilder MapGraphDuplicates(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/graph/duplicates")
            .WithTags("Graph Duplicates")
            .RequireAuthorization();

        // GET /api/graph/duplicates?driveId={driveId}
        group.MapGet("/", async (
            [FromQuery] string driveId,
            GraphServiceClient graphClient,
            CancellationToken ct) =>
        {
            // Scan all files in drive
            var allFiles = new List<DriveItemDto>();
            var page = await graphClient.Drives[driveId].Root.Delta
                .GetAsync(config =>
                    config.QueryParameters.Select = ["id", "name", "size", "file"],
                    ct);

            var iterator = PageIterator<DriveItem, DriveItemCollectionResponse>
                .CreatePageIterator(graphClient, page!, item =>
                {
                    if (item.File?.Hashes?.Sha1Hash is not null)
                        allFiles.Add(DriveItemDto.FromDriveItem(item));
                    return true;
                });
            await iterator.IterateAsync();

            // Group by hash to find duplicates
            var duplicates = allFiles
                .GroupBy(f => f.Sha1Hash)
                .Where(g => g.Count() > 1)
                .Select(g => new DuplicateGroupDto(
                    Hash: g.Key!,
                    Count: g.Count(),
                    WastedBytes: g.Skip(1).Sum(f => f.SizeBytes ?? 0),
                    Files: [.. g]))
                .OrderByDescending(d => d.WastedBytes)
                .ToList();

            return Results.Ok(new
            {
                DriveId = driveId,
                TotalDuplicateGroups = duplicates.Count,
                TotalWastedBytes = duplicates.Sum(d => d.WastedBytes),
                Groups = duplicates
            });
        })
        .WithName("GetGraphDuplicates")
        .Produces<object>();

        return app;
    }
}

public record DuplicateGroupDto(
    string Hash,
    int Count,
    long WastedBytes,
    IReadOnlyList<DriveItemDto> Files);
```

### Step 3C: Graph — Metadata Operations

**Description**: Updates SharePoint list item column values via Microsoft Graph PATCH.

Generate `Features/GraphMetadata/GraphMetadataEndpoints.cs`:

```csharp
public static class GraphMetadataEndpoints
{
    public static IEndpointRouteBuilder MapGraphMetadata(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/graph/metadata")
            .WithTags("Graph Metadata")
            .RequireAuthorization();

        // PATCH /api/graph/metadata/item
        group.MapPatch("/item", async (
            [FromBody] UpdateMetadataRequest req,
            GraphServiceClient graphClient,
            CancellationToken ct) =>
        {
            var fieldsUpdate = new FieldValueSet
            {
                AdditionalData = req.Fields.ToDictionary(
                    kvp => kvp.Key,
                    kvp => (object)kvp.Value)
            };

            await graphClient
                .Sites[req.SiteId]
                .Lists[req.ListId]
                .Items[req.ItemId]
                .Fields
                .PatchAsync(fieldsUpdate, cancellationToken: ct);

            return Results.NoContent();
        })
        .WithName("UpdateItemMetadata")
        .Accepts<UpdateMetadataRequest>("application/json")
        .Produces(StatusCodes.Status204NoContent)
        .ProducesProblem(StatusCodes.Status404NotFound);

        return app;
    }
}

public record UpdateMetadataRequest(
    [Required] string SiteId,
    [Required] string ListId,
    [Required] string ItemId,
    [Required] Dictionary<string, string> Fields);
```

### Step 3D: Custom Operation

Ask for:
- Operation name (e.g., `SendNotification`, `ExportReport`)
- HTTP method (GET / POST / PUT / DELETE)
- Route (e.g., `/api/custom/export`)
- Input parameters / request body fields
- Response shape

Generate a minimal stub endpoint + service interface based on the answers.

### Step 4: Wire Graph DI in Program.cs

Check if `GraphServiceClient` is already registered. If not, add:

```csharp
// Web API scenario (daemon / app permissions)
builder.Services.AddSingleton(_ =>
{
    var credential = new DefaultAzureCredential();
    return new GraphServiceClient(credential, ["https://graph.microsoft.com/.default"]);
});

// Web App scenario (OBO / user permissions) — use Microsoft.Identity.Web
builder.Services.AddAuthentication(OpenIdConnectDefaults.AuthenticationScheme)
    .AddMicrosoftIdentityWebApp(builder.Configuration.GetSection("AzureAd"))
    .EnableTokenAcquisitionToCallDownstreamApi(["Files.Read.All"])
    .AddMicrosoftGraph(builder.Configuration.GetSection("MicrosoftGraph"))
    .AddInMemoryTokenCaches();
```

Check if `ResiliencePipeline` is registered. If not, add:

```csharp
builder.Services.AddResiliencePipeline("graph-pipeline", pipeline =>
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
                    e.ResponseStatusCode is 429 or 503 or 504)
        })
        .AddTimeout(TimeSpan.FromMinutes(5)));
```

Add the endpoint mapping:
```csharp
app.MapGraphFiles();       // or MapGraphDuplicates() / MapGraphMetadata()
```

### Step 5: Build Verify

```bash
dotnet build
```

### Step 6: Summary

```
## Operation Added — {OperationName}

Files created:
- Features/{OperationName}/{OperationName}Endpoints.cs

Program.cs updated:
- GraphServiceClient registered (if new)
- ResiliencePipeline "graph-pipeline" registered (if new)
- Endpoint mapping added

Endpoint: {method} {route}
OpenAPI tag: {tag}

Test it:
curl -H "Authorization: Bearer <token>" \
  "https://localhost:5001/api/graph/files/inventory?driveId=<id>"
```

## Arguments

- `--operation graph-files`: Graph file inventory endpoint
- `--operation graph-duplicates`: Graph duplicate detection endpoint
- `--operation graph-metadata`: Graph metadata PATCH endpoint
- `--operation custom`: Custom operation (interactive)
