# Duplicate Detection — C# Implementation

---

## DuplicateDetectionService

```csharp
public class DuplicateDetectionService : IDuplicateDetectionService
{
    public DuplicateReport Analyze(
        IReadOnlyList<FileInventoryRecord> inventory,
        DuplicateStrategy strategy = DuplicateStrategy.Both)
    {
        var exactGroups = strategy is DuplicateStrategy.Exact or DuplicateStrategy.Both
            ? FindExactDuplicates(inventory)
            : [];

        var nearGroups = strategy is DuplicateStrategy.Near or DuplicateStrategy.Both
            ? FindNearDuplicates(inventory, excludeExact: exactGroups)
            : [];

        return new DuplicateReport(exactGroups, nearGroups);
    }

    // ── Exact duplicates (SHA-1 / QuickXorHash) ─────────────────────────────

    private static IReadOnlyList<DuplicateGroup> FindExactDuplicates(
        IEnumerable<FileInventoryRecord> inventory)
    {
        return inventory
            .Where(f => !string.IsNullOrEmpty(f.Sha1Hash ?? f.QuickXorHash))
            .GroupBy(f => (f.Sha1Hash ?? f.QuickXorHash)!)
            .Where(g => g.Count() > 1)
            .Select(g =>
            {
                var ordered = g.OrderBy(f => f.CreatedDateTime).ToList();
                return new DuplicateGroup(
                    Key: g.Key,
                    Strategy: DuplicateStrategy.Exact,
                    Items: ordered,
                    KeepCandidate: ordered[0],
                    WastedBytes: ordered.Skip(1).Sum(f => f.SizeBytes));
            })
            .OrderByDescending(g => g.WastedBytes)
            .ToList();
    }

    // ── Near-duplicates (name + size bucket) ────────────────────────────────

    private static IReadOnlyList<DuplicateGroup> FindNearDuplicates(
        IEnumerable<FileInventoryRecord> inventory,
        IReadOnlyList<DuplicateGroup> excludeExact)
    {
        // Collect item IDs already identified as exact duplicates
        var exactIds = excludeExact
            .SelectMany(g => g.Items.Skip(1).Select(i => i.Id))
            .ToHashSet();

        static string NearDupKey(FileInventoryRecord f) =>
            $"{NormalizeName(f.Name)}|{f.SizeBytes / 1024L}";

        return inventory
            .Where(f => !exactIds.Contains(f.Id))
            .GroupBy(NearDupKey)
            .Where(g => g.Count() > 1)
            .Select(g =>
            {
                var ordered = g.OrderBy(f => f.CreatedDateTime).ToList();
                return new DuplicateGroup(
                    Key: g.Key,
                    Strategy: DuplicateStrategy.Near,
                    Items: ordered,
                    KeepCandidate: ordered[0],
                    WastedBytes: ordered.Skip(1).Sum(f => f.SizeBytes));
            })
            .OrderByDescending(g => g.WastedBytes)
            .ToList();
    }

    // ── Name normalization ───────────────────────────────────────────────────

    private static readonly Regex VersionSuffix = new(
        @"[\s_-]*(v\d+|\(\d+\)|-\s*copy|copy\s*\(\d+\))(?=\.[^.]+$)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static string NormalizeName(string name)
    {
        var lower = name.ToLowerInvariant().Trim();
        return VersionSuffix.Replace(lower, "");
    }
}
```

---

## Models

```csharp
public record DuplicateGroup(
    string Key,
    DuplicateStrategy Strategy,
    IReadOnlyList<FileInventoryRecord> Items,
    FileInventoryRecord KeepCandidate,
    long WastedBytes)
{
    public double WastedMb => Math.Round(WastedBytes / 1_048_576.0, 1);
    public double WastedGb => Math.Round(WastedBytes / 1_073_741_824.0, 2);
}

public record DuplicateReport(
    IReadOnlyList<DuplicateGroup> ExactDuplicates,
    IReadOnlyList<DuplicateGroup> NearDuplicates)
{
    public long TotalWastedBytes =>
        ExactDuplicates.Sum(g => g.WastedBytes) +
        NearDuplicates.Sum(g => g.WastedBytes);

    public double TotalWastedGb => Math.Round(TotalWastedBytes / 1_073_741_824.0, 2);

    public int TotalDuplicateFiles =>
        ExactDuplicates.Sum(g => g.Items.Count - 1) +
        NearDuplicates.Sum(g => g.Items.Count - 1);
}

public enum DuplicateStrategy { Exact, Near, Both }
```

---

## Report Output

```csharp
public static class DuplicateReportWriter
{
    public static async Task WriteMarkdownAsync(
        DuplicateReport report,
        string outputPath,
        CancellationToken ct = default)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"# Duplicate Files Report — {DateTimeOffset.UtcNow:yyyy-MM-dd}");
        sb.AppendLine();
        sb.AppendLine("## Summary");
        sb.AppendLine($"| Type | Groups | Duplicate Files | Wasted Space |");
        sb.AppendLine($"|------|--------|-----------------|--------------|");
        sb.AppendLine($"| Exact (hash match) | {report.ExactDuplicates.Count} | {report.ExactDuplicates.Sum(g => g.Items.Count - 1)} | {report.ExactDuplicates.Sum(g => g.WastedGb):F2} GB |");
        sb.AppendLine($"| Near-dup (name+size) | {report.NearDuplicates.Count} | {report.NearDuplicates.Sum(g => g.Items.Count - 1)} | {report.NearDuplicates.Sum(g => g.WastedGb):F2} GB |");
        sb.AppendLine($"| **Total** | **{report.ExactDuplicates.Count + report.NearDuplicates.Count}** | **{report.TotalDuplicateFiles}** | **{report.TotalWastedGb:F2} GB** |");
        sb.AppendLine();

        AppendGroupTable(sb, "## Exact Duplicates (Top 20)", report.ExactDuplicates.Take(20));
        AppendGroupTable(sb, "## Near-Duplicates (Top 20)", report.NearDuplicates.Take(20));

        Directory.CreateDirectory(Path.GetDirectoryName(outputPath)!);
        await File.WriteAllTextAsync(outputPath, sb.ToString(), ct);
    }

    private static void AppendGroupTable(
        StringBuilder sb,
        string heading,
        IEnumerable<DuplicateGroup> groups)
    {
        sb.AppendLine(heading);
        sb.AppendLine("| # | Files | Wasted | Keep Candidate | Duplicate Paths |");
        sb.AppendLine("|---|-------|--------|----------------|-----------------|");

        var i = 1;
        foreach (var group in groups)
        {
            var dups = string.Join(", ", group.Items.Skip(1).Select(f => f.FullPath));
            sb.AppendLine($"| {i++} | {group.Items.Count} | {group.WastedMb} MB | {group.KeepCandidate.FullPath} | {dups} |");
        }

        sb.AppendLine();
    }
}
```

---

## Executing Deletions (to Recycle Bin)

```csharp
public class DuplicateCleanupService(
    GraphServiceClient graphClient,
    ResiliencePipeline<object> pipeline,
    ILogger<DuplicateCleanupService> logger)
{
    public async Task<CleanupResult> DeleteDuplicatesAsync(
        IReadOnlyList<DuplicateGroup> groups,
        bool dryRun = true,
        CancellationToken ct = default)
    {
        var deleted = 0;
        var failed = 0;
        var skipped = 0;

        foreach (var group in groups)
        {
            foreach (var duplicate in group.Items.Skip(1)) // skip KeepCandidate
            {
                if (dryRun)
                {
                    logger.LogInformation("[DRY RUN] Would delete: {path}", duplicate.FullPath);
                    skipped++;
                    continue;
                }

                try
                {
                    await pipeline.ExecuteAsync(async ct2 =>
                    {
                        await graphClient.Drives[duplicate.DriveId].Items[duplicate.Id]
                            .DeleteAsync(cancellationToken: ct2);
                        return 0;
                    }, ct);

                    logger.LogInformation("Deleted duplicate: {path}", duplicate.FullPath);
                    deleted++;
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Failed to delete {path}", duplicate.FullPath);
                    failed++;
                }
            }
        }

        return new CleanupResult(deleted, failed, skipped, dryRun);
    }
}

public record CleanupResult(int Deleted, int Failed, int Skipped, bool WasDryRun);
```
