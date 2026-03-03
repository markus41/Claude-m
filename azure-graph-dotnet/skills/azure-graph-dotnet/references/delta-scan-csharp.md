# Delta Scan — C# Implementation

Full implementation of the Microsoft Graph delta query loop for SharePoint/OneDrive file enumeration.

---

## DeltaScanService

```csharp
using Microsoft.Graph;
using Microsoft.Graph.Models;
using Microsoft.Graph.Drives.Item.Root.Delta;
using CsvHelper;
using System.Globalization;

public class DeltaScanService(
    GraphServiceClient graphClient,
    ResiliencePipeline<object> pipeline,
    IDeltaStateStore stateStore,
    ILogger<DeltaScanService> logger) : IDeltaScanService
{
    public async Task<ScanResult> ScanDriveAsync(
        string driveId,
        string driveName = "",
        string driveType = "",
        string siteId = "",
        int maxDepth = 10,
        CancellationToken ct = default)
    {
        logger.LogInformation("Starting delta scan for drive {driveId} ({name})", driveId, driveName);

        // Load saved delta link for incremental scan
        var deltaLink = await stateStore.GetDeltaLinkAsync(driveId, ct);
        var isIncremental = deltaLink is not null;

        var items = new List<FileInventoryRecord>();
        var folderCount = 0;
        var deletedCount = 0;

        // First page — use delta link if available, else full scan
        DriveItemCollectionResponse? firstPage;
        if (isIncremental && deltaLink is not null)
        {
            logger.LogInformation("Incremental scan using saved delta link");
            firstPage = await pipeline.ExecuteAsync(async ct2 =>
                await graphClient.Drives[driveId].Root.Delta
                    .WithUrl(deltaLink)
                    .GetAsync(cancellationToken: ct2), ct);
        }
        else
        {
            firstPage = await pipeline.ExecuteAsync(async ct2 =>
                await graphClient.Drives[driveId].Root.Delta
                    .GetAsync(cfg =>
                    {
                        cfg.QueryParameters.Select = [
                            "id", "name", "size", "file", "folder",
                            "parentReference", "createdDateTime",
                            "lastModifiedDateTime", "createdBy",
                            "lastModifiedBy", "webUrl", "deleted"
                        ];
                    }, ct2), ct);
        }

        string? savedDeltaLink = null;

        var pageIterator = PageIterator<DriveItem, DriveItemCollectionResponse>
            .CreatePageIterator(graphClient, firstPage!, item =>
            {
                // Skip deleted items (in incremental mode they appear with deleted facet)
                if (item.Deleted is not null)
                {
                    deletedCount++;
                    return true;
                }

                if (item.Folder is not null)
                {
                    folderCount++;
                    return true;
                }

                if (item.File is null) return true;

                var depth = ComputeDepth(item.ParentReference?.Path);
                if (maxDepth > 0 && depth > maxDepth) return true;

                items.Add(new FileInventoryRecord
                {
                    Id = item.Id ?? "",
                    Name = item.Name ?? "",
                    SizeBytes = item.Size ?? 0,
                    ParentPath = DecodeParentPath(item.ParentReference?.Path),
                    WebUrl = item.WebUrl ?? "",
                    CreatedDateTime = item.CreatedDateTime ?? DateTimeOffset.MinValue,
                    CreatedBy = item.CreatedBy?.User?.DisplayName ?? "",
                    LastModifiedDateTime = item.LastModifiedDateTime ?? DateTimeOffset.MinValue,
                    LastModifiedBy = item.LastModifiedBy?.User?.DisplayName ?? "",
                    Sha1Hash = item.File?.Hashes?.Sha1Hash,
                    QuickXorHash = item.File?.Hashes?.QuickXorHash,
                    MimeType = item.File?.MimeType ?? "",
                    DriveId = driveId,
                    DriveName = driveName,
                    DriveType = driveType,
                    SiteId = siteId,
                    Depth = depth
                });

                return true;
            });

        await pageIterator.IterateAsync(ct);
        savedDeltaLink = pageIterator.Deltalink;

        // Persist delta link for next run
        if (savedDeltaLink is not null)
            await stateStore.SaveDeltaLinkAsync(driveId, savedDeltaLink, ct);

        logger.LogInformation(
            "Drive {driveId}: {files} files, {folders} folders, {deleted} deleted items",
            driveId, items.Count, folderCount, deletedCount);

        return new ScanResult(
            TotalFiles: items.Count,
            TotalFolders: folderCount,
            TotalSizeBytes: items.Sum(i => i.SizeBytes),
            DrivesScanned: 1,
            OutputPath: "",
            ScannedAt: DateTimeOffset.UtcNow)
        { Items = items };
    }

    public async Task<ScanResult> ScanSiteAsync(
        string siteId, bool allDrives = true, CancellationToken ct = default)
    {
        var drives = await graphClient.Sites[siteId].Drives
            .GetAsync(cfg => cfg.QueryParameters.Select = ["id", "name", "driveType"], ct);

        var allItems = new List<FileInventoryRecord>();
        var totalFolders = 0;

        foreach (var drive in drives?.Value ?? [])
        {
            if (drive.Id is null) continue;

            var result = await ScanDriveAsync(
                drive.Id, drive.Name ?? "", drive.DriveType ?? "", siteId, ct: ct);
            allItems.AddRange(result.Items);
            totalFolders += result.TotalFolders;
        }

        return new ScanResult(
            TotalFiles: allItems.Count,
            TotalFolders: totalFolders,
            TotalSizeBytes: allItems.Sum(i => i.SizeBytes),
            DrivesScanned: drives?.Value?.Count ?? 0,
            OutputPath: "",
            ScannedAt: DateTimeOffset.UtcNow)
        { Items = allItems };
    }

    // --- Helpers ---

    private static int ComputeDepth(string? path)
    {
        if (string.IsNullOrEmpty(path)) return 0;
        // path format: "/drives/{id}/root:/Folder/Subfolder"
        var colonIdx = path.IndexOf(':');
        if (colonIdx < 0) return 0;
        var afterRoot = path[(colonIdx + 1)..];
        return afterRoot.Count(c => c == '/');
    }

    private static string DecodeParentPath(string? path)
    {
        if (string.IsNullOrEmpty(path)) return "";
        var colonIdx = path.IndexOf(':');
        return colonIdx >= 0
            ? Uri.UnescapeDataString(path[(colonIdx + 1)..])
            : path;
    }
}
```

---

## Delta State Store

Persists delta links between runs. Two implementations:

### File-based (for local/console runs)

```csharp
public class FileDeltaStateStore(string stateFilePath) : IDeltaStateStore
{
    private Dictionary<string, string>? _state;

    private async Task<Dictionary<string, string>> LoadAsync(CancellationToken ct)
    {
        if (_state is not null) return _state;
        if (!File.Exists(stateFilePath))
            return _state = [];

        var json = await File.ReadAllTextAsync(stateFilePath, ct);
        return _state = JsonSerializer.Deserialize<Dictionary<string, string>>(json) ?? [];
    }

    public async Task<string?> GetDeltaLinkAsync(string driveId, CancellationToken ct)
    {
        var state = await LoadAsync(ct);
        return state.GetValueOrDefault(driveId);
    }

    public async Task SaveDeltaLinkAsync(string driveId, string deltaLink, CancellationToken ct)
    {
        var state = await LoadAsync(ct);
        state[driveId] = deltaLink;
        Directory.CreateDirectory(Path.GetDirectoryName(stateFilePath)!);
        await File.WriteAllTextAsync(stateFilePath,
            JsonSerializer.Serialize(state, new JsonSerializerOptions { WriteIndented = true }), ct);
    }
}
```

### Azure Blob Storage (for Functions / production)

```csharp
public class BlobDeltaStateStore(BlobContainerClient container) : IDeltaStateStore
{
    private const string BlobName = "delta-state.json";

    public async Task<string?> GetDeltaLinkAsync(string driveId, CancellationToken ct)
    {
        var blob = container.GetBlobClient(BlobName);
        if (!await blob.ExistsAsync(ct)) return null;

        var content = await blob.DownloadContentAsync(ct);
        var state = content.Value.Content.ToObjectFromJson<Dictionary<string, string>>();
        return state?.GetValueOrDefault(driveId);
    }

    public async Task SaveDeltaLinkAsync(string driveId, string deltaLink, CancellationToken ct)
    {
        var blob = container.GetBlobClient(BlobName);
        Dictionary<string, string> state = [];

        if (await blob.ExistsAsync(ct))
        {
            var content = await blob.DownloadContentAsync(ct);
            state = content.Value.Content.ToObjectFromJson<Dictionary<string, string>>() ?? [];
        }

        state[driveId] = deltaLink;
        await blob.UploadAsync(
            BinaryData.FromObjectAsJson(state),
            overwrite: true,
            cancellationToken: ct);
    }
}
```

---

## CSV Output with CsvHelper

```csharp
public static class InventoryCsvWriter
{
    public static async Task WriteAsync(
        IEnumerable<FileInventoryRecord> items,
        string outputPath,
        CancellationToken ct = default)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(outputPath)!);
        await using var writer = new StreamWriter(outputPath);
        await using var csv = new CsvWriter(writer, CultureInfo.InvariantCulture);
        await csv.WriteRecordsAsync(items, ct);
    }
}
```

---

## ScanResult with Items

```csharp
public record ScanResult(
    int TotalFiles,
    int TotalFolders,
    long TotalSizeBytes,
    int DrivesScanned,
    string OutputPath,
    DateTimeOffset ScannedAt)
{
    public double TotalSizeGb => Math.Round(TotalSizeBytes / 1_073_741_824.0, 2);
    public IReadOnlyList<FileInventoryRecord> Items { get; init; } = [];
}
```
